package com.streaming.soundly.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO para solicitar el inicio del flujo de recuperación de contraseña.
 * Solo requiere el email del usuario registrado.
 */
public class RecuperarPasswordRequestDTO {

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El formato del email no es válido")
    private String email;

    public RecuperarPasswordRequestDTO() {}

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
