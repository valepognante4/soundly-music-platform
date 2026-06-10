package com.streaming.soundly.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GestionExcepciones {

    // Se activa cuando un DTO falla en las validaciones (@NotBlank, @Email, @Size).
    // Devuelve 400 Bad Request con el detalle de qué campo falló.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> gestionarValidaciones(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errores.put(fieldName, errorMessage);
        });
        return new ResponseEntity<>(errores, HttpStatus.BAD_REQUEST);
    }

    // Se activa cuando el Service lanza IllegalArgumentException
    // (credenciales incorrectas, email duplicado, etc.).
    // Devuelve 401 Unauthorized en lugar del 500 genérico de Spring,
    // permitiendo que el frontend distinga "credenciales malas" de "servidor caído".
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> gestionarIllegalArgument(IllegalArgumentException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("mensaje", ex.getMessage());
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED); // 401
    }

}
