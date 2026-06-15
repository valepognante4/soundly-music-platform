package com.streaming.soundly.controller;

import com.streaming.soundly.dto.PlaylistDTO;
import com.streaming.soundly.dto.PlaylistRequestDTO;
import com.streaming.soundly.service.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
// CORS configurado globalmente en CorsConfig.java — no se necesita @CrossOrigin aquí
public class PlaylistController {

    private final PlaylistService playlistService;

    // Inyección por constructor
    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-11: Crear Playlist
    // ────────────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<PlaylistDTO> crearPlaylist(@Valid @RequestBody PlaylistRequestDTO requestDTO) {
        PlaylistDTO nuevaPlaylist = playlistService.crearPlaylist(requestDTO);
        return new ResponseEntity<>(nuevaPlaylist, HttpStatus.CREATED); // 201 Created
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-N: Obtener detalle de una playlist (con sus canciones)
    // Nuevo endpoint requerido por el frontend para cargar playlist.html?id=X
    // ────────────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<PlaylistDTO> obtenerPlaylist(@PathVariable Long id) {
        PlaylistDTO playlist = playlistService.obtenerDetalle(id);
        return ResponseEntity.ok(playlist); // 200 OK
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-12: Modificar Playlist (Cambiar Nombre)
    // ────────────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<PlaylistDTO> modificarPlaylist(
            @PathVariable Long id,
            @RequestBody PlaylistRequestDTO requestDTO) {
        // Nota: @Valid removido intencionalmente — en el PUT el usuarioId es opcional
        // Solo el nombre es lo que el frontend manda para renombrar
        PlaylistDTO playlistModificada = playlistService.modificarNombre(id, requestDTO.getNombre());
        return ResponseEntity.ok(playlistModificada); // 200 OK
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-13: Eliminar Playlist
    // ────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPlaylist(@PathVariable Long id) {
        playlistService.eliminarPlaylist(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-14: Agregar Canción a Playlist
    // ────────────────────────────────────────────────────────────────────────
    @PostMapping("/{id}/canciones/{cancionId}")
    public ResponseEntity<PlaylistDTO> agregarCancionAPlaylist(
            @PathVariable Long id,
            @PathVariable Long cancionId) {
        PlaylistDTO playlistActualizada = playlistService.agregarCancion(id, cancionId);
        return ResponseEntity.ok(playlistActualizada);
    }

    // ────────────────────────────────────────────────────────────────────────
    // CU-15: Quitar Canción de Playlist
    // ────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}/canciones/{cancionId}")
    public ResponseEntity<PlaylistDTO> quitarCancionDePlaylist(
            @PathVariable Long id,
            @PathVariable Long cancionId) {
        PlaylistDTO playlistActualizada = playlistService.eliminarCancion(id, cancionId);
        return ResponseEntity.ok(playlistActualizada);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Listar playlists de un usuario
    // ────────────────────────────────────────────────────────────────────────
    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<PlaylistDTO>> listarPlaylistsPorUsuario(@PathVariable Long usuarioId) {
        List<PlaylistDTO> playlists = playlistService.buscarPorUsuario(usuarioId);
        return ResponseEntity.ok(playlists);
    }
}
