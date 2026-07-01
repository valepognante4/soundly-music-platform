package com.streaming.soundly.service;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.external.client.MusicApiClient;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.external.dto.ExternalTrackListDTO;
import com.streaming.soundly.mapper.CancionMapper;
import com.streaming.soundly.model.Album;
import com.streaming.soundly.model.Artista;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.model.Usuario;
import com.streaming.soundly.repository.AlbumRepository;
import com.streaming.soundly.repository.CancionRepository;
import com.streaming.soundly.repository.GeneroRepository;
import com.streaming.soundly.repository.UsuarioRepository;
import com.streaming.soundly.service.ICancionService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CancionService implements ICancionService {

    private final CancionRepository cancionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlbumRepository albumRepository;
    private final MusicApiClient musicApiClient;
    private final IArtistaService artistaService;
    private final GeneroRepository generoRepository;

    public CancionService(CancionRepository cancionRepository,
                          UsuarioRepository usuarioRepository,
                          AlbumRepository albumRepository,
                          MusicApiClient musicApiClient,
                          IArtistaService artistaService,
                          GeneroRepository generoRepository) {
        this.cancionRepository = cancionRepository;
        this.usuarioRepository = usuarioRepository;
        this.albumRepository = albumRepository;
        this.musicApiClient = musicApiClient;
        this.artistaService = artistaService;
        this.generoRepository = generoRepository;
    }

    @Override
    @Transactional
    public CancionDTO agregarDesdeApi(String idDeezer) {
        ExternalCancionDTO externalDto = musicApiClient.getCancionExterna(idDeezer);

        if (externalDto == null) {
            throw new EntityNotFoundException("No se encontró la canción en la API externa con ID: " + idDeezer);
        }

        Optional<Cancion> cancionExistente = cancionRepository.findByExternalId(externalDto.getId());
        if (cancionExistente.isPresent()) {
            return CancionMapper.toDTO(cancionExistente.get());
        }

        // --- Lógica única y limpia ---

        // 1. Obtener/Crear Artista (Seguro)
        String nombreArtista = (externalDto.getArtist() != null) ? externalDto.getArtist().getName() : "Artista Desconocido";
        Artista artista = artistaService.obtenerOCrearArtista(nombreArtista, externalDto.getArtist());

        // 2. Obtener/Crear Álbum si la API trae datos de álbum
        Album album = null;
        if (externalDto.getAlbum() != null && externalDto.getAlbum().getId() != null && externalDto.getAlbum().getTitle() != null) {
            Long albumExternalId = externalDto.getAlbum().getId();
            album = albumRepository.findByExternalId(albumExternalId)
                    .orElseGet(() -> {
                        Album nuevoAlbum = new Album();
                        nuevoAlbum.setExternalId(albumExternalId);
                        nuevoAlbum.setTitulo(externalDto.getAlbum().getTitle());
                        nuevoAlbum.setImagenUrl(externalDto.getAlbum().getCoverUrl());
                        nuevoAlbum.setArtista(artista);
                        // saveAndFlush garantiza que el PK del álbum exista en BD antes del INSERT de canción
                        return albumRepository.saveAndFlush(nuevoAlbum);
                    });
        }

        // 3. Mapear canción
        Cancion nuevaCancion = CancionMapper.toEntity(externalDto);

        // 4. Asegurar campos (usando los datos validados)
        nuevaCancion.setTitulo(externalDto.getTitle());
        nuevaCancion.setImagenUrl(externalDto.getCoverUrl());
        nuevaCancion.setArtista(artista);

        // Solo vinculamos el álbum si se persistió con un ID válido
        if (album != null && album.getId() != null) {
            nuevaCancion.setAlbum(album);
        }

        // 5. Guardar canción
        Cancion guardada = cancionRepository.save(nuevaCancion);

        return CancionMapper.toDTO(guardada);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> buscarConFiltros(String titulo, String artista, String genero) {

        // Parsear el género: puede llegar como ID numérico o como nombre de texto
        Long generoId = null;
        String generoNombre = null;
        if (genero != null && !genero.isBlank()) {
            try {
                generoId = Long.parseLong(genero.trim());
            } catch (NumberFormatException e) {
                generoNombre = genero.trim();
            }
        }

        boolean hayTexto  = (titulo  != null && !titulo.trim().isEmpty());
        boolean hayArtista = (artista != null && !artista.trim().isEmpty());
        boolean hayGenero = (generoId != null || (generoNombre != null && !generoNombre.isBlank()));

        List<Cancion> canciones;

        // ── CASO 1: hay texto (título) + género ───────────────────────────────
        if (hayTexto && hayGenero) {
            if (generoId != null) {
                canciones = cancionRepository.findByTituloContainingAndGeneroId(titulo.trim(), generoId);
            } else {
                // Fallback: filtrar por género nombre y luego por título en memoria
                canciones = cancionRepository.findByGeneroNombreContainingIgnoreCase(generoNombre)
                        .stream()
                        .filter(c -> c.getTitulo().toLowerCase().contains(titulo.trim().toLowerCase()))
                        .collect(Collectors.toList());
            }
            return canciones.stream().map(CancionMapper::toDTO).collect(Collectors.toList());
        }

        // ── CASO 2: solo género (sin texto) ──────────────────────────────────
        if (hayGenero) {
            return buscarPorGenero(generoNombre, generoId);
        }

        // ── CASO 3: solo texto (comportamiento original intacto) ──────────────
        if (hayTexto) {
            canciones = cancionRepository.findByTituloContainingIgnoreCase(titulo.trim());
        } else {
            canciones = cancionRepository.findAllWithArtista();
        }

        // Fall-through: si la BD local devuelve resultados, los retornamos directamente
        if (canciones != null && !canciones.isEmpty()) {
            return canciones.stream()
                    .map(CancionMapper::toDTO)
                    .collect(Collectors.toList());
        }

        // La BD local está vacía → llamamos a Deezer con el query
        String query = hayTexto ? titulo.trim() : (hayArtista ? artista.trim() : null);
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        ExternalTrackListDTO externalResult = musicApiClient.searchCanciones(query);

        if (externalResult == null || externalResult.getData() == null || externalResult.getData().isEmpty()) {
            return List.of();
        }

        // Mapear ExternalCancionDTO → CancionDTO para no romper el frontend
        return externalResult.getData().stream()
                .map(ext -> {
                    String nombreArtista = (ext.getArtist() != null) ? ext.getArtist().getName() : "Artista Desconocido";
                    return CancionDTO.builder()
                            .id(ext.getId())
                            .titulo(ext.getTitle())
                            .duracion(ext.getDuration())
                            .imagenUrl(ext.getCoverUrl())
                            .archivoUrl(ext.getPreviewUrl())
                            .contadorReproducciones(0)
                            .nombreArtista(nombreArtista)
                            .build();
                })
                .collect(Collectors.toList());
    }


    /**
     * CU-GENERO: Filtra canciones por género.
     * Prioridad: generoId > nombreGenero.
     * Delega al query con JOIN FETCH para evitar LazyInitializationException.
     */
    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> buscarPorGenero(String nombreGenero, Long generoId) {
        List<Cancion> canciones;

        if (generoId != null) {
            // Búsqueda exacta por ID (la más eficiente)
            canciones = cancionRepository.findByGeneroId(generoId);
        } else if (nombreGenero != null && !nombreGenero.isBlank()) {
            // Búsqueda parcial case-insensitive por nombre
            canciones = cancionRepository.findByGeneroNombreContainingIgnoreCase(nombreGenero.trim());
        } else {
            return List.of();
        }

        return canciones.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void incrementarReproduccion(Long id) {
        Cancion cancion = cancionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        cancion.setContadorReproducciones(cancion.getContadorReproducciones() + 1);
        cancionRepository.save(cancion);
    }

    @Override
    @Transactional
    public boolean alternarFavorito(Long cancionId, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));
        Cancion cancion = cancionRepository.findById(cancionId)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        boolean esFavorito;
        if (usuario.getCancionesFavoritas().contains(cancion)) {
            usuario.getCancionesFavoritas().remove(cancion);
            esFavorito = false;
        } else {
            usuario.getCancionesFavoritas().add(cancion);
            esFavorito = true;
        }
        usuarioRepository.save(usuario);
        return esFavorito;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> obtenerCancionesDestacadas() {
        // Usamos el nuevo método con JOIN FETCH
        List<Cancion> destacadas = cancionRepository.findAllWithArtista();

        return destacadas.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    // BUG FIX #4 y #5: Método que faltaba para obtener los favoritos de un usuario.
    // El frontend lo llama desde favoritos.html pero no existía en el servicio.
    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> obtenerFavoritos(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con id: " + usuarioId));

        return usuario.getCancionesFavoritas().stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CancionDTO guardar(CancionDTO cancionDTO) {
        Cancion cancion = new Cancion();
        cancion.setTitulo(cancionDTO.getTitulo());
        cancion.setDuracion(cancionDTO.getDuracion());
        cancion.setImagenUrl(cancionDTO.getImagenUrl());
        cancion.setArchivoUrl(cancionDTO.getArchivoUrl());
        cancion.setContadorReproducciones(0); // Inicializa en cero seguro

        Cancion guardada = cancionRepository.save(cancion);

        // Retornamos el DTO real e idéntico de la BD con su ID
        return CancionMapper.toDTO(guardada);
    }

    @Override
    @Transactional
    public CancionDTO actualizarMetadata(Long id, CancionDTO cancionDTO) {
        Cancion cancion = cancionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        cancion.setTitulo(cancionDTO.getTitulo());
        cancion.setDuracion(cancionDTO.getDuracion());
        cancion.setImagenUrl(cancionDTO.getImagenUrl());
        cancion.setArchivoUrl(cancionDTO.getArchivoUrl());

        Cancion actualizada = cancionRepository.save(cancion);

        // Retornamos los datos frescos actualizados
        return CancionMapper.toDTO(actualizada);
    }

    @Override
    @Transactional
    public void eliminarDelCatalogo(Long id) {
        if (!cancionRepository.existsById(id)) {
            throw new EntityNotFoundException("Canción no encontrada");
        }
        cancionRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public CancionDTO obtenerPorId(Long id) {
        Cancion cancion = cancionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada con id: " + id));
        return CancionMapper.toDTO(cancion);
    }
}
