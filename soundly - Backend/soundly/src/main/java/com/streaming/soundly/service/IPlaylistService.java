package com.streaming.soundly.service;

import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.dto.PlaylistRequestDTO;
import java.util.List;

public interface IPlaylistService {
    PlaylistDTO crearPlaylist(PlaylistRequestDTO dto);
    PlaylistDTO modificarNombre(Long id, String nuevoNombre);
    void eliminarPlaylist(Long id);
    PlaylistDTO agregarCancion(Long playlistId, Long cancionId);
    PlaylistDTO eliminarCancion(Long playlistId, Long cancionId);
    List<PlaylistDTO> buscarPorUsuario(Long usuarioId);
}
