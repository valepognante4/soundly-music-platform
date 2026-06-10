package com.streaming.soundly.controller;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.service.ArtistaService;
import com.streaming.soundly.service.CancionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
// CORS configurado globalmente en CorsConfig.java — no se necesita @CrossOrigin aquí
public class AdminController {

    private final CancionService cancionService;
    private final ArtistaService artistaService;

    // Inyección múltiple por constructor de manera limpia y profesional
    public AdminController(CancionService cancionService, ArtistaService artistaService) {
        this.cancionService = cancionService;
        this.artistaService = artistaService;
    }

    // ==========================================
    // MANTENIMIENTO DE CANCIONES
    // ==========================================

    @PostMapping("/canciones")
    public ResponseEntity<CancionDTO> cargarNuevaCancion(@Valid @RequestBody CancionDTO cancionDTO) {
        // CU-16: Cargar Nueva Canción al catálogo general
        CancionDTO nuevaCancion = cancionService.guardar(cancionDTO);
        return new ResponseEntity<>(nuevaCancion, HttpStatus.CREATED); // 201 Created
    }

    @PutMapping("/canciones/{id}")
    public ResponseEntity<CancionDTO> modificarMetadataCancion(@PathVariable Long id, @Valid @RequestBody CancionDTO cancionDTO) {
        // CU-17: Modificar Metadata de Canción (título, género, año, etc.)
        CancionDTO cancionModificada = cancionService.actualizarMetadata(id, cancionDTO);
        return ResponseEntity.ok(cancionModificada); // 200 OK
    }

    @DeleteMapping("/canciones/{id}")
    public ResponseEntity<Void> eliminarCancionDelCatalogo(@PathVariable Long id) {
        // CU-18: Eliminar Canción del Catálogo
        cancionService.eliminarDelCatalogo(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    // ==========================================
    // MANTENIMIENTO DE ARTISTAS
    // ==========================================

    @GetMapping("/artistas")
    public ResponseEntity<List<ArtistaDTO>> listarArtistas() {
        List<ArtistaDTO> artistas = artistaService.listarTodos(); // Asegúrate de tener este método en tu Service
        return ResponseEntity.ok(artistas);
    }

    @PostMapping("/artistas")
    public ResponseEntity<ArtistaDTO> registrarArtista(@Valid @RequestBody ArtistaDTO artistaDTO) {
        // CU-19: Gestionar Artistas (Alta de perfil de artista)
        ArtistaDTO nuevoArtista = artistaService.crear(artistaDTO);
        return new ResponseEntity<>(nuevoArtista, HttpStatus.CREATED); // 201 Created
    }

    @PutMapping("/artistas/{id}")
    public ResponseEntity<ArtistaDTO> modificarArtista(@PathVariable Long id, @Valid @RequestBody ArtistaDTO artistaDTO) {
        // CU-19: Gestionar Artistas (Modificación de datos del perfil del artista)
        ArtistaDTO artistaModificado = artistaService.actualizar(id, artistaDTO);
        return ResponseEntity.ok(artistaModificado); // 200 OK
    }

    @DeleteMapping("/artistas/{id}")
    public ResponseEntity<Void> eliminarArtista(@PathVariable Long id) {
        // CU-19: Gestionar Artistas (Baja/Eliminación de un perfil de artista)
        artistaService.eliminar(id);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    @PostMapping("/artistas/importar/{idDeezer}")
    public ResponseEntity<String> importarArtistaCompleto(@PathVariable Long idDeezer) {
        try {
            artistaService.importarArtistaYCanciones(idDeezer);
            return ResponseEntity.ok("Importación exitosa del artista y sus canciones.");
        } catch (Exception e) {
            e.printStackTrace(); // <-- Imprime el error exacto en consola
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error durante la importación: " + e.getMessage());
        }
    }

    @PostMapping("/artistas/importar-lista")
    public ResponseEntity<String> importarLista(@RequestBody List<Long> listaIds) {
        int contadorExitosos = 0;
        int contadorFallidos = 0;
        for (Long id : listaIds) {
            try {
                artistaService.importarArtistaYCanciones(id);
                contadorExitosos++;
            } catch (Exception e) {
                contadorFallidos++;
                System.err.println("[AdminController] Error crítico al importar el artista con ID " + id + ". Motivo: " + e.getMessage());
                // Imprimir la traza completa para saber exactamente en qué línea y capa ocurrió el fallo
                e.printStackTrace();
            }
        }
        return ResponseEntity.ok("Proceso terminado. Se importaron correctamente " + contadorExitosos + " artistas. Fallaron " + contadorFallidos + ".");
    }

    @PostMapping("/artistas/actualizar-generos")
    public ResponseEntity<String> actualizarGeneros() {
        try {
            int cantidadProcesados = artistaService.actualizarGenerosNulos();
            return ResponseEntity.ok("Proceso completado con éxito. Se procesaron " + cantidadProcesados + " artistas que tenían su género en nulo.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al procesar los géneros nulos: " + e.getMessage());
        }
    }
}
