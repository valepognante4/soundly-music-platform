package com.streaming.soundly.service;

import com.streaming.soundly.dto.AlbumDTO;
import com.streaming.soundly.mapper.AlbumMapper;
import com.streaming.soundly.repository.AlbumRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AlbumService {

    private final AlbumRepository albumRepository;

    public AlbumService(AlbumRepository albumRepository) {
        this.albumRepository = albumRepository;
    }

    /**
     * Devuelve todos los álbumes incluyendo artista y canciones
     * mediante un único FETCH JOIN (sin N+1).
     */
    @Transactional(readOnly = true)
    public List<AlbumDTO> obtenerTodosLosAlbumes() {
        return albumRepository.findAllWithArtistaAndCanciones()
                .stream()
                .map(AlbumMapper::toDTO)
                .collect(Collectors.toList());
    }
}
