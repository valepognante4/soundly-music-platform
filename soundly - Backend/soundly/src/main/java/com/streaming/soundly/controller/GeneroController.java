package com.streaming.soundly.controller;

import com.streaming.soundly.model.Genero;
import com.streaming.soundly.repository.GeneroRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GeneroController — Soundly
 * ──────────────────────────────────────────────────────────────
 * CU-GENERO: Expone el catálogo de géneros musicales para que el
 * frontend pueda poblar dinámicamente el selector de filtro.
 *
 * Endpoints:
 *   GET /api/generos         → lista todos los géneros
 *   GET /api/generos/{id}    → obtiene un género por ID
 * ──────────────────────────────────────────────────────────────
 */
@RestController
@RequestMapping("/api/generos")
// CORS configurado globalmente en CorsConfig.java — no se necesita @CrossOrigin aquí
public class GeneroController {

    private final GeneroRepository generoRepository;

    public GeneroController(GeneroRepository generoRepository) {
        this.generoRepository = generoRepository;
    }

    /**
     * Devuelve la lista completa de géneros disponibles en la BD.
     * El frontend la consume para construir el selector de filtro.
     * GET /api/generos
     */
    @GetMapping
    public ResponseEntity<List<Genero>> listarTodos() {
        List<Genero> generos = generoRepository.findAll();
        return ResponseEntity.ok(generos);
    }

    /**
     * Obtiene un género específico por su ID.
     * GET /api/generos/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Genero> obtenerPorId(@PathVariable Long id) {
        return generoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
