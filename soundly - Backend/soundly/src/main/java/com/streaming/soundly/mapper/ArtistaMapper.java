package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.external.dto.ExternalArtistaDTO;
import com.streaming.soundly.model.Artista;

public class ArtistaMapper {
    public static ArtistaDTO toDTO(Artista a) {
        if (a == null) return null;

        ArtistaDTO dto = new ArtistaDTO();
        dto.setId(a.getId());
        dto.setNombre(a.getNombre());
        dto.setFotoUrl(a.getFotoUrl());
        dto.setGenero(a.getGenero() != null ? a.getGenero().getNombre() : null);

        if (a.getCanciones() != null) {
            dto.setTitulosCanciones(
                a.getCanciones().stream()
                 .map(com.streaming.soundly.model.Cancion::getTitulo)
                 .toList()
            );
        } else {
            dto.setTitulosCanciones(new java.util.ArrayList<>());
        }

        return dto;
    }
    public static Artista toEntity(ExternalArtistaDTO externalDto) {
        if (externalDto == null) return null;

        Artista artista = new Artista();

        artista.setExternalId(externalDto.getId());
        // Asignamos los campos que vienen de la API
        artista.setNombre(externalDto.getName());
        artista.setFotoUrl(externalDto.getPictureUrl());
        // Si tu entidad Artista tiene un campo para guardar el ID de Deezer:
        // artista.setIdDeezer(externalDto.getId());

        return artista;
    }
}
