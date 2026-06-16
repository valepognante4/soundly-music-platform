package com.streaming.soundly.controller;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.dto.ArtistaDetalleDTO;
import com.streaming.soundly.service.IArtistaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/artistas")
public class ArtistaController {

    private final IArtistaService artistaService;

    public ArtistaController(IArtistaService artistaService) {
        this.artistaService = artistaService;
    }

    @GetMapping
    public ResponseEntity<List<ArtistaDTO>> listarArtistas() {
        return ResponseEntity.ok(artistaService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArtistaDetalleDTO> obtenerDetalleArtista(@PathVariable Long id) {
        return ResponseEntity.ok(artistaService.obtenerDetalle(id));
    }
}
