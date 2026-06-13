package com.streaming.soundly.service;

import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.dto.PlaylistRequestDTO;
import com.streaming.soundly.mapper.PlaylistMapper;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.model.Playlist;
import com.streaming.soundly.model.Usuario;
import com.streaming.soundly.repository.CancionRepository;
import com.streaming.soundly.repository.PlaylistRepository;
import com.streaming.soundly.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class PlaylistService implements IPlaylistService {

    private final PlaylistRepository playlistRepository;
    private final CancionRepository cancionRepository;
    private final UsuarioRepository usuarioRepository;

    public PlaylistService(PlaylistRepository playlistRepository, 
                           CancionRepository cancionRepository, 
                           UsuarioRepository usuarioRepository) {
        this.playlistRepository = playlistRepository;
        this.cancionRepository = cancionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public PlaylistDTO crearPlaylist(PlaylistRequestDTO dto) {
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));

        Playlist playlist = new Playlist();
        playlist.setNombre(dto.getNombre());
        playlist.setDescripcion(dto.getDescripcion());
        playlist.setUsuario(usuario); // Asociar el usuario a la playlist (obligatorio)
        playlist.setCanciones(new ArrayList<>()); // Inicializar lista vacía para evitar nulos

        playlist = playlistRepository.save(playlist);
        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional
    public PlaylistDTO modificarNombre(Long id, String nuevoNombre) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Playlist no encontrada"));
        
        playlist.setNombre(nuevoNombre);
        // Si quisieras cambiar descripción también podrías pasarlo, pero por ahora modificamos el nombre
        playlist = playlistRepository.save(playlist);
        
        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional
    public void eliminarPlaylist(Long id) {
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
            playlist = playlistRepository.save(playlist);
        }

        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional
    public PlaylistDTO eliminarCancion(Long playlistId, Long cancionId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist no encontrada"));
        Cancion cancion = cancionRepository.findById(cancionId)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        if (playlist.getCanciones().contains(cancion)) {
            playlist.getCanciones().remove(cancion);
            playlist = playlistRepository.save(playlist);
        }

        return PlaylistMapper.toDTO(playlist);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlaylistDTO> buscarPorUsuario(Long usuarioId) {
        // Devuelve las playlists pertenecientes al usuario mapeadas a DTO
        return playlistRepository.findByUsuarioId(usuarioId).stream()
                .map(PlaylistMapper::toDTO)
                .collect(java.util.stream.Collectors.toList());
    }
}
