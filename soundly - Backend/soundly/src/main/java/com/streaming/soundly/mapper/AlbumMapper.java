package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.AlbumDTO;
import com.streaming.soundly.model.Album;
import java.util.stream.Collectors;

public class AlbumMapper {

    public static AlbumDTO toDTO(Album album) {
        if (album == null) return null;

        String portada = album.getImagenUrl();

        if ((portada == null || portada.isBlank()) && album.getCanciones() != null) {
            if (!album.getCanciones().isEmpty()) {
                portada = album.getCanciones().iterator().next().getImagenUrl();
            }
        }

        Long artistaId = null;
        String artistaNombre = "Artista Desconocido";
        if (album.getArtista() != null) {
            artistaId    = album.getArtista().getId();
            artistaNombre = album.getArtista().getNombre();
        }

        return AlbumDTO.builder()
                .id(album.getId())
                .nombre(album.getTitulo())
                .portada(portada)
                .artistaId(artistaId)
                .artistaNombre(artistaNombre)
                .canciones(album.getCanciones() != null
                        ? album.getCanciones().stream()
                                .map(CancionMapper::toDTO)
                                .collect(Collectors.toList())
                        : java.util.Collections.emptyList())
                .build();
    }
}
