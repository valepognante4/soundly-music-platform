package com.streaming.soundly.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlaylistRequestDTO {
    
    @NotBlank(message = "El nombre de la playlist es obligatorio")
    private String nombre;
    
    private String descripcion;
    
    @NotNull(message = "El ID del usuario es obligatorio")
    private Long usuarioId;
}
