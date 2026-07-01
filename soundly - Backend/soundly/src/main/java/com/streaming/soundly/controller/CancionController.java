package com.streaming.soundly.controller;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.service.CancionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/canciones")
// CORS configurado globalmente en CorsConfig.java — no se necesita @CrossOrigin aquí
public class CancionController {

    private final CancionService cancionService;
    private final com.streaming.soundly.service.DynamicSourcingService dynamicSourcingService;

    // Inyección por constructor limpia y profesional
    public CancionController(CancionService cancionService, 
                             com.streaming.soundly.service.DynamicSourcingService dynamicSourcingService) {
        this.cancionService = cancionService;
        this.dynamicSourcingService = dynamicSourcingService;
    }

    /**
     * CU-LISTADO: Devuelve el catálogo completo de canciones disponibles.
     * GET /api/canciones
     *
     * Este endpoint es consumido por:
     *   - GestorCanciones.obtenerTodas() en modelo.js
     *   - El modal de "Agregar Canción" en playlist.html (buscador inicial)
     *
     * Reutiliza obtenerCancionesDestacadas() que internamente ejecuta
     * findAllWithArtista() con JOIN FETCH para evitar el problema N+1.
     */
    @GetMapping
    public ResponseEntity<List<CancionDTO>> listarTodas() {
        List<CancionDTO> canciones = cancionService.obtenerCancionesDestacadas();
        return ResponseEntity.ok(canciones);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CancionDTO> obtenerPorId(@PathVariable Long id) {
        CancionDTO cancion = cancionService.obtenerPorId(id);
        return ResponseEntity.ok(cancion);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<CancionDTO>> buscarCanciones(
            @RequestParam(required = false) String titulo,
            @RequestParam(required = false) String artista,
            @RequestParam(required = false) String genero) {
        
        // Si hay título, aplicamos el Sourcing Dinámico
        if (titulo != null && !titulo.trim().isEmpty()) {
            List<CancionDTO> resultados = dynamicSourcingService.buscarYSourcerDinamico(titulo);
            return ResponseEntity.ok(resultados);
        }

        // Búsqueda local por defecto
        List<CancionDTO> resultados = cancionService.buscarConFiltros(titulo, artista, genero);
        return ResponseEntity.ok(resultados);
    }

    @PostMapping("/{id}/reproducir")
    public ResponseEntity<Void> reproducirCancion(@PathVariable Long id) {
        // CU-07 y CU-08: Al reproducir, el sistema incrementa de forma automática el contador de reproducciones en la BD
        cancionService.incrementarReproduccion(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/favorito/usuario/{usuarioId}")
    public ResponseEntity<String> gestionarFavorito(@PathVariable Long id, @PathVariable Long usuarioId) {
        // CU-10: Dar / Quitar 'Me Gusta' (Agrega o remueve de la lista según corresponda en el Service)
        boolean esFavorito = cancionService.alternarFavorito(id, usuarioId);
        String mensaje = esFavorito ? "Canción añadida a favoritos" : "Canción eliminada de favoritos";
        return ResponseEntity.ok(mensaje);
    }

    // BUG FIX #4: Endpoint faltante que el frontend (favoritos.html) necesita para listar favoritos
    @GetMapping("/favoritos/usuario/{usuarioId}")
    public ResponseEntity<List<CancionDTO>> obtenerFavoritos(@PathVariable Long usuarioId) {
        List<CancionDTO> favoritos = cancionService.obtenerFavoritos(usuarioId);
        return ResponseEntity.ok(favoritos);
    }

    @GetMapping("/recomendados")
    public ResponseEntity<List<CancionDTO>> obtenerRecomendados() {
        // Extra indispensable para llenar la sección "Recomendados para vos" de la pantalla principal que armó Santiago
        List<CancionDTO> recomendados = cancionService.obtenerCancionesDestacadas();
        return ResponseEntity.ok(recomendados);
    }

    @PostMapping("/agregar-lista")
    public ResponseEntity<List<CancionDTO>> agregarListaDesdeApi(@RequestBody List<String> idsDeezer) {
        List<CancionDTO> cancionesAgregadas = idsDeezer.stream()
                .map(cancionService::agregarDesdeApi) // Reutiliza tu lógica actual
                .collect(Collectors.toList());
        return ResponseEntity.ok(cancionesAgregadas);
    }

    /**
     * CU-GENERO: Filtra el catálogo de canciones por género musical.
     * Acepta el nombre del género (búsqueda parcial) o su ID exacto.
     *
     * Uso desde el frontend:
     *   GET /api/canciones/por-genero?nombre=Rock
     *   GET /api/canciones/por-genero?id=3
     *
     * Retorna la misma estructura CancionDTO que el resto de endpoints.
     */
    @GetMapping("/por-genero")
    public ResponseEntity<List<CancionDTO>> obtenerPorGenero(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) Long id) {

        List<CancionDTO> canciones = cancionService.buscarPorGenero(nombre, id);
        return ResponseEntity.ok(canciones);
    }
}

