package com.streaming.soundly.controller;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.dto.ArtistaDetalleDTO;
import com.streaming.soundly.service.IArtistaService;
import org.springframework.http.HttpStatus;
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

    /**
     * Busca artistas por nombre (búsqueda parcial, insensible a mayúsculas).
     * GET /api/artistas/buscar?nombre=coldplay
     *
     * Consumido por el frontend mediante GestorArtistas.buscar(nombre)
     * en búsquedas multivariable con Promise.allSettled.
     *
     * @param nombre Texto a buscar (requerido, no vacío)
     * @return 200 con lista de ArtistaDTO, 400 si el parámetro está vacío,
     *         500 si ocurre un error interno
     */
    @GetMapping("/buscar")
    public ResponseEntity<?> buscarArtistas(@RequestParam String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("El parámetro 'nombre' es obligatorio y no puede estar vacío.");
        }
        try {
            List<ArtistaDTO> resultados = artistaService.buscarPorNombre(nombre);
            return ResponseEntity.ok(resultados);
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al buscar artistas: " + e.getMessage());
        }
    }
}
