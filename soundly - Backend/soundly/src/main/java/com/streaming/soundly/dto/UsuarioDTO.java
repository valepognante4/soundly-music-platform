package com.streaming.soundly.dto;

import com.streaming.soundly.model.Rol;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioDTO {

    private Long id;
    private String nombreUsuario;
    private String email;
    private LocalDate fechaNacimiento;
    private Rol rol; // USER o ADMIN
}
