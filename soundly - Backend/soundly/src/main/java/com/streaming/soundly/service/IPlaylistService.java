package com.streaming.soundly.service;

import com.streaming.soundly.dto.PlaylistDTO;
import java.util.List;

public interface IPlaylistService {
    PlaylistDTO crear(PlaylistDTO playlistDTO);
    PlaylistDTO modificar(Long id, PlaylistDTO playlistDTO);
    void eliminar(Long id);
    PlaylistDTO agregarCancion(Long playlistId, Long cancionId);
    PlaylistDTO quitarCancion(Long playlistId, Long cancionId);
    List<PlaylistDTO> buscarPorUsuario(Long usuarioId);
}
