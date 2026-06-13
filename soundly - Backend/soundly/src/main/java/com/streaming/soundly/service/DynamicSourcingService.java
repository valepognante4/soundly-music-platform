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

    private DynamicSourcingService self;

    public DynamicSourcingService(CancionRepository cancionRepository,
                                  AlbumRepository albumRepository,
                                  IArtistaService artistaService,
                                  MusicApiClient musicApiClient,
                                  jakarta.persistence.EntityManager entityManager) {
        this.cancionRepository = cancionRepository;
        this.albumRepository = albumRepository;
        this.artistaService = artistaService;
        this.musicApiClient = musicApiClient;
        this.entityManager = entityManager;
    }

    private final jakarta.persistence.EntityManager entityManager;

    @Autowired
    public void setSelf(DynamicSourcingService self) {
        this.self = self;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
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
                            self.persistirJerarquia(extTrack);
                        } catch (Exception e) {
                            log.error("[Sourcing] Error aisaldo persistiendo la canción externa {}: {}", extTrack.getId(), e.getMessage());
                        }
                    }
                }
                
                // Limpiamos la caché L1 para forzar la relectura desde la BD
                entityManager.clear();
                locales = cancionRepository.findByTituloContainingIgnoreCase(query);
            }
        }

        return locales.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistirJerarquia(ExternalCancionDTO extTrack) {
        String nombreArtista = (extTrack.getArtist() != null) ? extTrack.getArtist().getName() : "Artista Desconocido";
        Artista artista = artistaService.obtenerOCrearArtista(nombreArtista, extTrack.getArtist());

        if (artista == null || artista.getId() == null) {
            throw new IllegalStateException("[Sourcing] No se pudo persistir el artista: " + nombreArtista);
        }

        Album albumPersistido = null;
        if (extTrack.getAlbum() != null && extTrack.getAlbum().getId() != null && extTrack.getAlbum().getTitle() != null) {
            Long albumExternalId = extTrack.getAlbum().getId();
            Optional<Album> albumExistente = albumRepository.findByExternalId(albumExternalId);

            if (albumExistente.isPresent()) {
                // Usamos la entidad real ya recuperada, no un proxy.
                albumPersistido = albumExistente.get();
            } else {
                Album nuevoAlbum = new Album();
                nuevoAlbum.setExternalId(albumExternalId);
                nuevoAlbum.setTitulo(extTrack.getAlbum().getTitle());
                nuevoAlbum.setImagenUrl(extTrack.getAlbum().getCoverUrl());
                nuevoAlbum.setArtista(artista);

                // saveAndFlush asegura que el INSERT se envíe a la BD de inmediato y se genere el ID
                albumPersistido = albumRepository.saveAndFlush(nuevoAlbum);

                if (albumPersistido.getId() == null) {
                    throw new IllegalStateException("[Sourcing] Falló la persistencia del álbum y la generación de ID.");
                }
            }
        }

        Cancion cancion = CancionMapper.toEntity(extTrack);
        cancion.setTitulo(extTrack.getTitle());
        cancion.setImagenUrl(extTrack.getCoverUrl());
        cancion.setArtista(artista);

        if (albumPersistido != null) {
            // Asignamos la entidad gestionada y sincronizada
            cancion.setAlbum(albumPersistido);
        }

        cancionRepository.saveAndFlush(cancion);
        log.info("[Sourcing] Nueva canción guardada exitosamente: {} - {}", artista.getNombre(), cancion.getTitulo());
    }
}
