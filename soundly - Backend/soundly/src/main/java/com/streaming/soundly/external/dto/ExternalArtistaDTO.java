package com.streaming.soundly.external.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExternalArtistaDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("picture_medium")
    private String pictureUrl;

    @JsonProperty("genres")
    private GenreWrapper genres;

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GenreWrapper {
        @JsonProperty("data")
        private List<Genre> data;
    }

    @Getter // <--- ESTO ES LO QUE FALTABA
    @Setter // <--- ESTO ES LO QUE FALTABA
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Genre {
        @JsonProperty("name")
        private String name;
    }
}
