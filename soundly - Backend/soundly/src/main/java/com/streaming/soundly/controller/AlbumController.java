package com.streaming.soundly.controller;

import com.streaming.soundly.dto.AlbumDTO;
import com.streaming.soundly.service.AlbumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AlbumController
 * ───────────────────────────────────────────────────────────────────────────
 * GET /api/albums         → lista todos los álbumes (artista + canciones incluidos)
 * GET /api/albums/{id}    → devuelve un álbum específico por su ID interno
 */
@RestController
@RequestMapping("/api/albums")
public class AlbumController {

    private final AlbumService albumService;

    public AlbumController(AlbumService albumService) {
        this.albumService = albumService;
    }

    /** Lista todos los álbumes con artista y canciones embebidos. */
    @GetMapping
    public ResponseEntity<List<AlbumDTO>> listarAlbumes() {
        return ResponseEntity.ok(albumService.obtenerTodosLosAlbumes());
    }

    /** Obtiene un álbum concreto. Devuelve 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<AlbumDTO> obtenerAlbum(@PathVariable Long id) {
        return albumService.obtenerTodosLosAlbumes()
                .stream()
                .filter(a -> a.getId().equals(id))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
