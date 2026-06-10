package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.model.Playlist;

public class PlaylistMapper {
    // Mapeo manual y estático al estilo de tu curso
    public static PlaylistDTO toDTO(Playlist p) {
        if (p == null) return null;

        PlaylistDTO dto = new PlaylistDTO();
        dto.setId(p.getId());
        dto.setNombre(p.getNombre());
        dto.setDescripcion(p.getDescripcion());
        // Si tu PlaylistDTO tiene canciones adentro, las podés mapear acá también

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
