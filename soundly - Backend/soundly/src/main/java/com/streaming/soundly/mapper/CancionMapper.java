package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.model.Cancion;

public class CancionMapper {
    public static CancionDTO toDTO(Cancion cancion) {
        CancionDTO dto = new CancionDTO();

        // Mapeo de campos básicos de la canción
        dto.setId(cancion.getId());
        dto.setTitulo(cancion.getTitulo());
        dto.setDuracion(cancion.getDuracion());
        dto.setArchivoUrl(cancion.getArchivoUrl());
        dto.setContadorReproducciones(cancion.getContadorReproducciones());

        // Lógica para el Artista y la Imagen
        if (cancion.getArtista() != null) {
            dto.setNombreArtista(cancion.getArtista().getNombre());
            
            if (cancion.getArtista().getGenero() != null) {
                dto.setGenero(cancion.getArtista().getGenero().getNombre());
            }

            // Prioridad:
            // 1. Usar la imagen de la canción si existe.
            // 2. Si no, usar la foto del artista (la que importamos desde Deezer).
            if (cancion.getImagenUrl() != null && !cancion.getImagenUrl().isBlank()) {
                dto.setImagenUrl(cancion.getImagenUrl());
            } else {
                dto.setImagenUrl(cancion.getArtista().getFotoUrl());
            }
        } else {
            // Fallback si por algún motivo la canción no tiene artista asignado
            dto.setNombreArtista("Artista Desconocido");
            dto.setImagenUrl(cancion.getImagenUrl());
        }

        return dto;
    }
    public static Cancion toEntity(ExternalCancionDTO externalDto) {
        if (externalDto == null) return null;

        Cancion cancion = new Cancion();
        cancion.setExternalId(externalDto.getId());
        cancion.setTitulo(externalDto.getTitle());

        // AQUÍ ESTÁ EL CAMBIO:
        cancion.setDuracion(externalDto.getDuration()); // Mapea la duración
        cancion.setArchivoUrl(externalDto.getPreviewUrl());// Mapea el audio
        cancion.setImagenUrl(externalDto.getCoverUrl()); // Mapea la imagen

        cancion.setContadorReproducciones(0);
        return cancion;
    }
}
