package com.streaming.soundly.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Excepción lanzada cuando un token de recuperación de contraseña
 * no existe, ya fue utilizado o se encuentra expirado.
 *
 * Mapeada a 400 Bad Request porque el problema está en los datos
 * que envió el cliente (token inválido), no en sus credenciales (401).
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class TokenInvalidoException extends RuntimeException {

    public TokenInvalidoException(String mensaje) {
        super(mensaje);
    }
}
