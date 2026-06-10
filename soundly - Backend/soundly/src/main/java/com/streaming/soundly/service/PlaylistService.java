package com.streaming.soundly.service;

import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.mapper.PlaylistMapper;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.model.Playlist;
import com.streaming.soundly.repository.CancionRepository;
import com.streaming.soundly.repository.PlaylistRepository;
import com.streaming.soundly.service.IPlaylistService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class PlaylistService implements IPlaylistService {

    private final PlaylistRepository playlistRepository;
    private final CancionRepository cancionRepository;

    public PlaylistService(PlaylistRepository playlistRepository, CancionRepository cancionRepository) {
        this.playlistRepository = playlistRepository;
        this.cancionRepository = cancionRepository;
    }

    @Override
    @Transactional
    public PlaylistDTO crear(PlaylistDTO playlistDTO) {
        Playlist playlist = new Playlist();
        playlist.setNombre(playlistDTO.getNombre());
        playlist.setDescripcion(playlistDTO.getDescripcion());
        playlistRepository.save(playlist);
        return playlistDTO;
    }

    @Override
    @Transactional
    public PlaylistDTO modificar(Long id, PlaylistDTO playlistDTO) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Playlist no encontrada"));
        playlist.setNombre(playlistDTO.getNombre());
        playlist.setDescripcion(playlistDTO.getDescripcion());
        playlistRepository.save(playlist);
        return playlistDTO;
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        if (!playlistRepository.existsById(id)) {
            throw new EntityNotFoundException("Playlist no encontrada");
        }
        playlistRepository.deleteById(id);
    }

    @Override
    @Transactional
    public PlaylistDTO agregarCancion(Long playlistId, Long cancionId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist no encontrada"));
        Cancion cancion = cancionRepository.findById(cancionId)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        if (!playlist.getCanciones().contains(cancion)) {
            playlist.getCanciones().add(cancion);
            playlistRepository.save(playlist);
        }

        // SOLUCIÓN: Mapeamos la entidad 'playlist' a DTO antes de retornarla
        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional
    public PlaylistDTO quitarCancion(Long playlistId, Long cancionId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist no encontrada"));
        Cancion cancion = cancionRepository.findById(cancionId)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        playlist.getCanciones().remove(cancion);
        playlistRepository.save(playlist);

        // SOLUCIÓN: Lo mismo acá, convertimos y retornamos
        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaylistDTO> buscarPorUsuario(Long usuarioId) {
        // Devuelve las playlists pertenecientes al usuario para pintar en el menú de la izquierda
        return new ArrayList<>();
    }
}
