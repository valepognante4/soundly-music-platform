package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.model.Playlist;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class PlaylistMapper {

    /**
     * Convierte una entidad Playlist a su DTO de respuesta.
     * Incluye el nombre del creador y la lista de canciones mapeadas.
     */
    public static PlaylistDTO toDTO(Playlist p) {
        if (p == null) return null;

        PlaylistDTO dto = new PlaylistDTO();
        dto.setId(p.getId());
        dto.setNombre(p.getNombre());
        dto.setDescripcion(p.getDescripcion());

        // Mapear el nombre del creador desde el objeto Usuario asociado
        // El campo en la entidad Usuario se llama 'nombre'
        if (p.getUsuario() != null) {
            dto.setNombreCreador(p.getUsuario().getNombre());
        }

        // Mapear la lista de canciones usando CancionMapper
        List<CancionDTO> cancionesDTO = (p.getCanciones() != null)
                ? p.getCanciones().stream()
                    .map(CancionMapper::toDTO)
                    .collect(Collectors.toList())
                : Collections.emptyList();

        dto.setCanciones(cancionesDTO);

        return dto;
    }

    public static Playlist toEntity(PlaylistDTO dto) {
        if (dto == null) return null;

        Playlist p = new Playlist();
        p.setId(dto.getId());
        p.setNombre(dto.getNombre());
        p.setDescripcion(dto.getDescripcion());

        return p;
    }
}
