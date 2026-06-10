package com.streaming.soundly.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArtistaDTO {

    private Long id;
    private String nombre;
    private String biografia;
    private String fotoUrl;
    private String genero;
    private List<String> titulosCanciones; // Mandamos solo los nombres de sus temas para evitar el bucle infinito
}
