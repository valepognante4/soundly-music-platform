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

    @JsonProperty("cover_medium") // Ajustado al nombre real en el JSON de Deezer
    private String coverUrl;

    @JsonProperty("artist")
    private ExternalArtistaDTO artist;

    @JsonProperty("duration") // Deezer devuelve la duración en segundos
    private int duration;

    @JsonProperty("preview")
    private String previewUrl;
}