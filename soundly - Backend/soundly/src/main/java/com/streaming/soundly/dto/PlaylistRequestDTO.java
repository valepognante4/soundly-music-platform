package com.streaming.soundly.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlaylistRequestDTO {

    @NotBlank(message = "El nombre de la playlist es obligatorio")
    private String nombre;

    private String descripcion;

    // usuarioId solo es obligatorio al CREAR (POST /api/playlists).
    // En el PUT solo se usa el nombre, así que es opcional aquí.
    private Long usuarioId;
}
