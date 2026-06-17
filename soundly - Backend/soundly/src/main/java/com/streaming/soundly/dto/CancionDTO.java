package com.streaming.soundly.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancionDTO {

    private Long id;
    private String titulo;
    private int duracion;
    private String imagenUrl;
    private String archivoUrl;
    private int contadorReproducciones;
    private String nombreArtista; // En lugar de mandar todo el objeto Artista, solo mandamos su nombre
    private String genero;
}
