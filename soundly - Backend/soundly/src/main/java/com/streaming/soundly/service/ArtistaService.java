package com.streaming.soundly.service;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.external.client.MusicApiClient;
import com.streaming.soundly.external.dto.ExternalArtistaDTO;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.external.dto.ExternalTrackListDTO;
import com.streaming.soundly.mapper.ArtistaMapper;
import com.streaming.soundly.mapper.CancionMapper;
import com.streaming.soundly.model.Artista;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.model.Genero;
import com.streaming.soundly.repository.ArtistaRepository;
import com.streaming.soundly.repository.CancionRepository;
import com.streaming.soundly.repository.GeneroRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ArtistaService implements IArtistaService {

    private static final Logger log = LoggerFactory.getLogger(ArtistaService.class);

    /** Tamaño del lote para batch insert. Debe coincidir con hibernate.jdbc.batch_size */
    private static final int BATCH_SIZE = 50;

    private final ArtistaRepository artistaRepository;
    private final CancionRepository cancionRepository;
    private final MusicApiClient musicApiClient;
    private final GeneroRepository generoRepository;
    private final TransactionTemplate transactionTemplate;
    private final EntityManager entityManager;

    public ArtistaService(ArtistaRepository artistaRepository,
                          CancionRepository cancionRepository,
                          MusicApiClient musicApiClient,
                          GeneroRepository generoRepository,
                          TransactionTemplate transactionTemplate,
                          EntityManager entityManager) {
        this.artistaRepository = artistaRepository;
        this.cancionRepository = cancionRepository;
        this.musicApiClient = musicApiClient;
        this.generoRepository = generoRepository;
        this.transactionTemplate = transactionTemplate;
        this.entityManager = entityManager;
    }

    // =========================================================================
    // IMPORTACIÓN DE ALTO RENDIMIENTO (Batch Insert + N+1 eliminado)
    // =========================================================================

    /**
     * Importa un artista y sus canciones desde Deezer.
     *
     * Arquitectura:
     *  FASE 1 (sin transacción): Consultas HTTP a la API de Deezer.
     *  FASE 2 (transacción programática): Persistencia batch en MySQL.
     *
     * Garantías:
     *  - Idempotente: Si se ejecuta dos veces para el mismo artista, no duplica datos.
     *  - Escalable: Usa batch insert (saveAll) y carga previa de IDs (Set en memoria).
     *  - Seguro: El UNIQUE constraint en external_id actúa como última barrera.
     *  - Eficiente: Limpia la caché L1 cada BATCH_SIZE entidades para evitar OOM.
     */
    @Override
    public void importarArtistaYCanciones(Long idDeezer) {
        try {
            log.info("============== INICIO DE IMPORTACION ==============");
            log.info("[Importación] Artista Deezer ID: {}", idDeezer);

            // =================================================================
            // FASE 1: CONSULTAS A DEEZER (FUERA DE TRANSACCIÓN DE BD)
            // =================================================================

            // 1.1 Obtener datos del artista
            ExternalArtistaDTO externalArtista = musicApiClient.getArtistaExterno(idDeezer);
            if (externalArtista == null) {
                log.error("[Importación] La API devolvió NULL para el artista con Deezer ID: {}", idDeezer);
                throw new EntityNotFoundException("No se encontró el artista en Deezer con ID: " + idDeezer);
            }
            log.info("[Importación] API devolvió Artista: nombre='{}', picture='{}'",
                    externalArtista.getName(), externalArtista.getPictureUrl());

            // 1.2 Obtener lista de canciones
            ExternalTrackListDTO trackList = musicApiClient.getTopCancionesArtista(idDeezer);
            if (trackList == null || trackList.getData() == null) {
                throw new IllegalStateException("La API de Deezer falló o retornó NULL al pedir las canciones.");
            }
            if (trackList.getData().isEmpty()) {
                throw new IllegalStateException("El artista '" + externalArtista.getName() + "' no tiene canciones en Deezer. Se aborta.");
            }

            log.info("[Importación] API devolvió {} canciones para procesar.", trackList.getData().size());

            // 1.3 Extraer los externalIds que vienen de la API para la consulta bulk
            List<Long> externalIdsFromApi = trackList.getData().stream()
                    .map(ExternalCancionDTO::getId)
                    .collect(Collectors.toList());

            // =================================================================
            // FASE 2: PERSISTENCIA EN BD (TRANSACCIÓN PROGRAMÁTICA ESTRICTA)
            // =================================================================

            transactionTemplate.execute(status -> {
                try {
                    // 2.1 Obtener o crear el artista en BD
                    Artista artista = obtenerOCrearArtista(externalArtista.getName(), externalArtista);
                    if (artista == null || artista.getId() == null) {
                        throw new IllegalStateException("ERROR FATAL: El artista no se pudo persistir.");
                    }
                    log.info("[Importación] Artista listo en BD: id={}, nombre='{}'", artista.getId(), artista.getNombre());

                    // 2.2 CARGA PREVIA DE IDs EXISTENTES (elimina N+1 selects)
                    // Una sola query SELECT que trae todos los externalIds ya guardados
                    Set<Long> idsExistentes = new HashSet<>(
                            cancionRepository.findExternalIdsByExternalIdIn(externalIdsFromApi)
                    );
                    log.info("[Importación] {} canciones ya existen en BD. Se saltarán.", idsExistentes.size());

                    // 2.3 BATCH INSERT: Acumular canciones nuevas en un lote
                    List<Cancion> lote = new ArrayList<>(BATCH_SIZE);
                    int guardadas = 0;
                    int saltadas = 0;

                    for (ExternalCancionDTO trackApi : trackList.getData()) {
                        // Verificar duplicados contra el Set en memoria (O(1), sin SQL)
                        if (idsExistentes.contains(trackApi.getId())) {
                            saltadas++;
                            continue;
                        }

                        // Crear la entidad y establecer relaciones
                        Cancion nuevaCancion = CancionMapper.toEntity(trackApi);
                        nuevaCancion.setArtista(artista);
                        artista.addCancion(nuevaCancion);

                        if (artista.getFotoUrl() != null && !artista.getFotoUrl().isBlank()) {
                            nuevaCancion.setImagenUrl(artista.getFotoUrl());
                        }

                        lote.add(nuevaCancion);
                        guardadas++;

                        // Cuando el lote alcanza BATCH_SIZE, persistir y limpiar memoria
                        if (lote.size() >= BATCH_SIZE) {
                            cancionRepository.saveAll(lote);
                            entityManager.flush();
                            entityManager.clear();
                            // Después del clear, re-vincular el artista al contexto de persistencia
                            artista = entityManager.merge(artista);
                            lote.clear();
                            log.info("[Importación] Lote de {} canciones persistido y memoria liberada.", BATCH_SIZE);
                        }
                    }

                    // 2.4 Persistir el lote residual (las canciones que quedaron fuera del último batch completo)
                    if (!lote.isEmpty()) {
                        cancionRepository.saveAll(lote);
                        entityManager.flush();
                        entityManager.clear();
                        log.info("[Importación] Lote residual de {} canciones persistido.", lote.size());
                    }

                    log.info("[Importación] Completada: {} nuevas, {} saltadas para '{}'.",
                            guardadas, saltadas, artista.getNombre());
                    return null;

                } catch (Exception e) {
                    status.setRollbackOnly();
                    log.error("[Importación] Error crítico durante la persistencia. Rollback forzado. Motivo: {}. Causa: {}",
                            e.getMessage(), e.getCause());
                    throw new IllegalStateException("Fallo en la persistencia transaccional", e);
                }
            });

            log.info("============== FIN DE IMPORTACION ==============");

        } catch (Exception e) {
            log.error("[Importación] ERROR EXCEPCIONAL DURANTE LA IMPORTACIÓN: ", e);
            throw e;
        }
    }

    // =========================================================================
    // OBTENER O CREAR ARTISTA (reutilizado por la importación)
    // =========================================================================

    /**
     * Devuelve el artista existente en BD, o lo crea consultando el endpoint completo
     * de Deezer (/artist/{id}) para obtener foto y género reales.
     *
     * Flujo:
     *  1. Si el artista ya existe por nombre -> retornarlo directamente.
     *  2. Si NO existe: consultar /artist/{id} en Deezer para enriquecer los datos.
     *  3. Guardar atómicamente dentro de la misma transacción.
     */
    @Override
    @Transactional
    public Artista obtenerOCrearArtista(String nombre, ExternalArtistaDTO externalArtistaDto) {
        // 1. Buscar por nombre en BD
        return artistaRepository.findByNombre(nombre)
                .map(artistaExistente -> {
                    // Si el artista ya existe, pero no tiene foto y tenemos el ID de Deezer, lo enriquecemos.
                    if ((artistaExistente.getFotoUrl() == null || artistaExistente.getFotoUrl().isBlank())
                            && externalArtistaDto != null && externalArtistaDto.getId() != null) {

                        // Enriquecer el artista existente y guardar los cambios
                        enriquecerArtistaDesdeApi(artistaExistente, externalArtistaDto.getId());
                        return artistaRepository.save(artistaExistente);
                    }
                    return artistaExistente;
                })
                .orElseGet(() -> crearNuevoArtista(nombre, externalArtistaDto));
    }

    /**
     * Crea y persiste un artista nuevo enriqueciendo sus datos desde la API de Deezer.
     * Nunca lanza NullPointerException: cada campo se verifica antes de asignarse.
     */
    private Artista crearNuevoArtista(String nombre, ExternalArtistaDTO dtoDesdeTrack) {
        Artista nuevoArtista = new Artista();
        nuevoArtista.setNombre(nombre);

        // El DTO que llega desde /track solo trae id y name del artista.
        // Necesitamos llamar a /artist/{id} para obtener picture_medium y genres.
        Long externalArtistId = (dtoDesdeTrack != null) ? dtoDesdeTrack.getId() : null;
        nuevoArtista.setExternalId(externalArtistId);

        // Llamada enriquecedora al endpoint /artist/{id}
        // Llamamos a un método auxiliar para asignar la foto y género
        if (externalArtistId != null) {
            enriquecerArtistaDesdeApi(nuevoArtista, externalArtistId);
        } else {
            log.warn("[Artista] No se pudo enriquecer el artista '{}' desde Deezer porque el ID es nulo.", nombre);
        }

        // Se persiste el artista con todos sus datos asigandos
        return artistaRepository.save(nuevoArtista);
    }

    /**
     * Consulta el endpoint completo de Deezer (/artist/{id}) y asigna los datos al objeto Entidad.
     */
    private Artista enriquecerArtistaDesdeApi(Artista artista, Long externalArtistId) {
        ExternalArtistaDTO dtoCompleto = musicApiClient.getArtistaExterno(externalArtistId);

        if (dtoCompleto != null) {
            // Asignación de fotoUrl (picture_medium)
            String foto = dtoCompleto.getPictureUrl();
            if (foto != null && !foto.isBlank()) {
                artista.setFotoUrl(foto);
                log.info("[Artista] Foto asignada para '{}': {}", artista.getNombre(), foto);
            } else {
                log.warn("[Artista] picture_medium vacío en la API para '{}' (id={})", artista.getNombre(), externalArtistId);
            }

            String nombreGenero = null;

            if (dtoCompleto.getGenres() != null
                    && dtoCompleto.getGenres().getData() != null
                    && !dtoCompleto.getGenres().getData().isEmpty()) {
                nombreGenero = dtoCompleto.getGenres().getData().get(0).getName();
            } else {
                log.info("[Artista] El artista no trae géneros, buscando en sus álbumes...");
                com.streaming.soundly.external.dto.ExternalAlbumListDTO albumes = musicApiClient.getAlbumesArtista(externalArtistId);
                
                if (albumes != null && albumes.getData() != null && !albumes.getData().isEmpty()) {
                    for (com.streaming.soundly.external.dto.ExternalAlbumDTO albumBasico : albumes.getData()) {
                        com.streaming.soundly.external.dto.ExternalAlbumDTO albumDetalle = musicApiClient.getAlbumExterno(albumBasico.getId());
                        
                        if (albumDetalle != null && albumDetalle.getGenres() != null 
                            && albumDetalle.getGenres().getData() != null && !albumDetalle.getGenres().getData().isEmpty()) {
                            
                            nombreGenero = albumDetalle.getGenres().getData().get(0).getName();
                            log.info("[Artista] Género '{}' encontrado en el álbum '{}'", nombreGenero, albumDetalle.getTitle());
                            break; 
                        }
                    }
                }
            }

            if (nombreGenero != null) {
                String finalNombreGenero = nombreGenero;
                Genero generoObj = generoRepository.findByNombreIgnoreCase(finalNombreGenero)
                        .orElseGet(() -> {
                            Genero nuevoGenero = new Genero();
                            nuevoGenero.setNombre(finalNombreGenero);
                            return generoRepository.save(nuevoGenero);
                        });
                artista.setGenero(generoObj);
                log.info("[Artista] Género asignado para '{}': {}", artista.getNombre(), finalNombreGenero);
            } else {
                log.warn("[Artista] No se pudo encontrar ningún género para '{}' (id={})", artista.getNombre(), externalArtistId);
            }
        } else {
            log.warn("[Artista] No se pudo enriquecer el artista '{}' desde Deezer.", artista.getNombre());
        }

        return artistaRepository.save(artista);
    }

    // -------------------------------------------------------------------------
    // CRUD manual (operaciones de administración)
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public ArtistaDTO crear(ArtistaDTO artistaDTO) {
        if (artistaRepository.existsByNombre(artistaDTO.getNombre())) {
            throw new IllegalArgumentException("Ya existe un artista registrado con ese nombre");
        }

        Artista artista = new Artista();
        artista.setNombre(artistaDTO.getNombre());
        if (artistaDTO.getGenero() != null && !artistaDTO.getGenero().isBlank()) {
            Genero genero = generoRepository.findByNombreIgnoreCase(artistaDTO.getGenero())
                    .orElseGet(() -> {
                        Genero g = new Genero();
                        g.setNombre(artistaDTO.getGenero());
                        return generoRepository.save(g);
                    });
            artista.setGenero(genero);
        }
        artista.setFotoUrl(artistaDTO.getFotoUrl());

        Artista guardado = artistaRepository.save(artista);
        return ArtistaMapper.toDTO(guardado);
    }

    @Override
    @Transactional
    public ArtistaDTO actualizar(Long id, ArtistaDTO artistaDTO) {
        Artista artistaExistente = artistaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Artista no encontrado con el ID: " + id));

        artistaExistente.setNombre(artistaDTO.getNombre());
        if (artistaDTO.getGenero() != null && !artistaDTO.getGenero().isBlank()) {
            Genero genero = generoRepository.findByNombreIgnoreCase(artistaDTO.getGenero())
                    .orElseGet(() -> {
                        Genero g = new Genero();
                        g.setNombre(artistaDTO.getGenero());
                        return generoRepository.save(g);
                    });
            artistaExistente.setGenero(genero);
        }
        artistaExistente.setFotoUrl(artistaDTO.getFotoUrl());

        Artista actualizado = artistaRepository.save(artistaExistente);
        return ArtistaMapper.toDTO(actualizado);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        if (!artistaRepository.existsById(id)) {
            throw new EntityNotFoundException("No se puede eliminar. Artista no encontrado con ID: " + id);
        }
        artistaRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ArtistaDTO> listarTodos() {
        return artistaRepository.findAll().stream()
                .map(ArtistaMapper::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public int actualizarGenerosNulos() {
        List<Artista> artistas = artistaRepository.findByGeneroIsNull();
        int procesados = 0;
        for (Artista artista : artistas) {
            if (artista.getExternalId() != null) {
                enriquecerArtistaDesdeApi(artista, artista.getExternalId());
                procesados++;
            }
        }
        return procesados;
    }
}
