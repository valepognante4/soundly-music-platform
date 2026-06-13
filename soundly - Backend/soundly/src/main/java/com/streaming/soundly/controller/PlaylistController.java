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

    @PostMapping
    public ResponseEntity<PlaylistDTO> crearPlaylist(@Valid @RequestBody PlaylistRequestDTO requestDTO) {
        // CU-11: Crear Playlist
        PlaylistDTO nuevaPlaylist = playlistService.crearPlaylist(requestDTO);
        return new ResponseEntity<>(nuevaPlaylist, HttpStatus.CREATED); // Devuelve 201 Created
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlaylistDTO> modificarPlaylist(@PathVariable Long id, @Valid @RequestBody PlaylistRequestDTO requestDTO) {
        // CU-12: Modificar Playlist (Cambiar Nombre)
        // Usamos modificarNombre asumiendo que el DTO trae el nuevo nombre
        PlaylistDTO playlistModificada = playlistService.modificarNombre(id, requestDTO.getNombre());
        return ResponseEntity.ok(playlistModificada); // Devuelve 200 OK
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPlaylist(@PathVariable Long id) {
        // CU-13: Eliminar Playlist
        playlistService.eliminarPlaylist(id);
        return ResponseEntity.noContent().build(); // Devuelve 204 No Content (estándar para DELETE exitosos)
    }

    @PostMapping("/{id}/canciones/{cancionId}")
    public ResponseEntity<PlaylistDTO> agregarCancionAPlaylist(@PathVariable Long id, @PathVariable Long cancionId) {
        // CU-14: Agregar Canción a Playlist
        PlaylistDTO playlistActualizada = playlistService.agregarCancion(id, cancionId);
        return ResponseEntity.ok(playlistActualizada);
    }

    @DeleteMapping("/{id}/canciones/{cancionId}")
    public ResponseEntity<PlaylistDTO> quitarCancionDePlaylist(@PathVariable Long id, @PathVariable Long cancionId) {
        // CU-15: Quitar Canción de Playlist
        PlaylistDTO playlistActualizada = playlistService.eliminarCancion(id, cancionId);
        return ResponseEntity.ok(playlistActualizada);
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<PlaylistDTO>> listarPlaylistsPorUsuario(@PathVariable Long usuarioId) {
        // Endpoint extra fundamental para que el Front pueda traer las listas del usuario logueado
        List<PlaylistDTO> playlists = playlistService.buscarPorUsuario(usuarioId);
        return ResponseEntity.ok(playlists);
    }
}
