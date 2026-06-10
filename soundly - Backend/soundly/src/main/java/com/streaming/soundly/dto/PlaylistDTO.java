package com.streaming.soundly.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaylistDTO {

    private Long id;
    private String nombre;
    private String descripcion;
    private String nombreCreador; // Solo el nombre de usuario de quien la armó
    private List<CancionDTO> canciones; // La lista de canciones ya procesadas de forma segura
}
