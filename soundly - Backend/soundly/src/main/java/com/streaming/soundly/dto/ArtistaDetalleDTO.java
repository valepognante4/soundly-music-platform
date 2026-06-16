package com.streaming.soundly.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArtistaDetalleDTO {
    private Long id;
    private String nombre;
    private String fotoUrl;
    private String genero;
    private String biografia;
    private List<AlbumDTO> albumes;
}
