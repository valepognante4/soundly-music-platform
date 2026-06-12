package com.streaming.soundly.exception;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
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

    // 401 — Credenciales incorrectas (email no registrado, contraseña inválida)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> gestionarIllegalArgument(IllegalArgumentException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", "UNAUTHORIZED");
        error.put("mensaje", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    // 400 — Token de recuperación inválido, expirado o ya usado
    @ExceptionHandler(TokenInvalidoException.class)
    public ResponseEntity<Map<String, String>> gestionarTokenInvalido(TokenInvalidoException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", "TOKEN_INVALIDO");
        error.put("mensaje", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // 404 — Recurso no encontrado en la base de datos
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> gestionarEntityNotFound(EntityNotFoundException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", "NOT_FOUND");
        error.put("mensaje", ex.getMessage());
        error.put("timestamp", LocalDateTime.now().toString());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

}
