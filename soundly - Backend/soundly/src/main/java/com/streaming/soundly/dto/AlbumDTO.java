package com.streaming.soundly.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlbumDTO {
    private Long id;
    private String nombre;
    private String portada;

    // ── Artista embebido (id + nombre) para evitar referencias circulares ──
    private Long artistaId;
    private String artistaNombre;

    private List<CancionDTO> canciones;
}
