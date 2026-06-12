package com.streaming.soundly.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Excepción lanzada cuando se intenta registrar un usuario con un email
 * que ya se encuentra almacenado en la base de datos.
 *
 * Mapeada automáticamente o manejada por el global exception handler
 * para retornar HTTP 409 (Conflict).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class EmailYaRegistradoException extends RuntimeException {

    public EmailYaRegistradoException(String mensaje) {
        super(mensaje);
    }
}
