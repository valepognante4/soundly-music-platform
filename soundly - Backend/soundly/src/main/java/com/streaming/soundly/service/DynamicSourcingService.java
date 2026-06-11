package com.streaming.soundly.service;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.external.client.MusicApiClient;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.external.dto.ExternalTrackListDTO;
import com.streaming.soundly.mapper.CancionMapper;
import com.streaming.soundly.model.Album;
import com.streaming.soundly.model.Artista;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.repository.AlbumRepository;
import com.streaming.soundly.repository.CancionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DynamicSourcingService {

    private static final Logger log = LoggerFactory.getLogger(DynamicSourcingService.class);

    private final CancionRepository cancionRepository;
    private final AlbumRepository albumRepository;
    private final IArtistaService artistaService;
    private final MusicApiClient musicApiClient;

    // Self-injection para habilitar el proxy AOP en llamadas internas
    private DynamicSourcingService self;

    public DynamicSourcingService(CancionRepository cancionRepository,
                                  AlbumRepository albumRepository,
                                  IArtistaService artistaService,
                                  MusicApiClient musicApiClient) {
        this.cancionRepository = cancionRepository;
        this.albumRepository = albumRepository;
        this.artistaService = artistaService;
        this.musicApiClient = musicApiClient;
    }

    @Autowired
    public void setSelf(DynamicSourcingService self) {
        this.self = self;
    }

    /**
     * Sourcing Dinámico:
     * Al NO tener @Transactional aquí arriba, el ciclo for puede continuar libremente.
     * Cada iteración abre su propia transacción independiente a través de self.persistirJerarquia.
     */
    public List<CancionDTO> buscarYSourcerDinamico(String query) {
        List<Cancion> locales = cancionRepository.findByTituloContainingIgnoreCase(query);

        if (locales.size() < 5) {
            log.info("[Sourcing] Resultados locales insuficientes para '{}'. Buscando en Deezer...", query);
            ExternalTrackListDTO externalTracks = musicApiClient.searchCanciones(query);

            if (externalTracks != null && externalTracks.getData() != null) {
                for (ExternalCancionDTO extTrack : externalTracks.getData()) {
                    Optional<Cancion> cancionExistente = cancionRepository.findByExternalId(extTrack.getId());
                    if (cancionExistente.isEmpty()) {
                        try {
                            // Llamamos a través del proxy self para que REQUIRES_NEW tenga efecto
                            self.persistirJerarquia(extTrack);
                        } catch (Exception e) {
                            log.error("[Sourcing] Error aisaldo persistiendo la canción externa {}: {}", extTrack.getId(), e.getMessage());
                            // El bucle sigue con la próxima canción, sin romper el EntityManager de las demás
                        }
                    }
                }
                locales = cancionRepository.findByTituloContainingIgnoreCase(query);
            }
        }

        return locales.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * REQUIRES_NEW crea una nueva transacción aislada. Si esto falla, SOLO se hace rollback
     * de esta canción, manteniendo intacto el resto de las iteraciones.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistirJerarquia(ExternalCancionDTO extTrack) {
        // 1. Obtener/Crear Artista
        String nombreArtista = (extTrack.getArtist() != null) ? extTrack.getArtist().getName() : "Artista Desconocido";
        Artista artista = artistaService.obtenerOCrearArtista(nombreArtista, extTrack.getArtist());
        
        // 2. Obtener/Crear Álbum con Save-First y Flusheo inmediato
        Album album = null;
        if (extTrack.getAlbum() != null && extTrack.getAlbum().getId() != null && extTrack.getAlbum().getTitle() != null) {
            try {
                album = albumRepository.findByExternalId(extTrack.getAlbum().getId())
                        .orElseGet(() -> {
                            Album nuevoAlbum = new Album();
                            nuevoAlbum.setExternalId(extTrack.getAlbum().getId());
                            nuevoAlbum.setTitulo(extTrack.getAlbum().getTitle());
                            nuevoAlbum.setImagenUrl(extTrack.getAlbum().getCoverUrl());
                            nuevoAlbum.setArtista(artista);
                            
                            // Persistimos EXPLÍCITAMENTE antes de continuar
                            return albumRepository.saveAndFlush(nuevoAlbum);
                        });
            } catch (Exception e) {
                log.warn("[Sourcing] Estrategia defensiva: Falló la creación del álbum {} por {}. Se insertará la canción con album_id = NULL", 
                        extTrack.getAlbum().getId(), e.getMessage());
                album = null; // Evitamos romper la transacción de la canción
            }
        }

        // 3. Persistir Canción
        Cancion cancion = CancionMapper.toEntity(extTrack);
        cancion.setTitulo(extTrack.getTitle());
        cancion.setImagenUrl(extTrack.getCoverUrl());
        cancion.setArtista(artista);
        
        if (album != null) {
            cancion.setAlbum(album);
        }

        // El saveAndFlush final garantiza que el Foreign Key constraint se ejecute y evalúe aquí mismo
        cancionRepository.saveAndFlush(cancion);
        log.info("[Sourcing] Nueva canción guardada exitosamente: {} - {}", artista.getNombre(), cancion.getTitulo());
    }
}
