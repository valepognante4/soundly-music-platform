package com.streaming.soundly.external.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExternalCancionDTO {
    @JsonProperty("id")
    private Long id;

    @JsonProperty("title")
    private String title;

    /**
     * BUG FIX #1: El endpoint /track/{id} devuelve cover_medium directamente en la raíz.
     * El endpoint /search NO lo hace — la imagen viene dentro del objeto "album".
     * Usamos cover_medium del álbum como fallback en getCoverUrl().
     */
    @JsonProperty("cover_medium")
    private String coverUrlDirect;

    @JsonProperty("artist")
    private ExternalArtistaDTO artist;

    @JsonProperty("album")
    private ExternalAlbumDTO album;

    @JsonProperty("duration")
    private int duration;

    @JsonProperty("preview")
    private String previewUrl;

    /**
     * Resuelve la URL de la imagen de forma inteligente:
     * 1. Intenta el campo cover_medium del root (válido para /track/{id})
     * 2. Si es null, usa album.cover_medium (válido para /search)
     */
    public String getCoverUrl() {
        if (coverUrlDirect != null && !coverUrlDirect.isBlank()) {
            return coverUrlDirect;
        }
        if (album != null && album.getCoverUrl() != null) {
            return album.getCoverUrl();
        }
        return null;
    }
}