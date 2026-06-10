package com.streaming.soundly.controller;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.UsuarioDTO;
import com.streaming.soundly.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
// CORS configurado globalmente en CorsConfig.java — no se necesita @CrossOrigin aquí
public class AuthController {

    private final UsuarioService usuarioService;

    // Inyección del servicio corregido en español
    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/registrar")
    public ResponseEntity<UsuarioDTO> registrarUsuario(@Valid @RequestBody RegistroDTO registroDTO) {
        UsuarioDTO nuevoUsuario = usuarioService.registrar(registroDTO);
        return new ResponseEntity<>(nuevoUsuario, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<UsuarioDTO> iniciarSesion(@Valid @RequestBody LoginDTO loginDTO) {
        UsuarioDTO usuarioLogueado = usuarioService.login(loginDTO);
        return ResponseEntity.ok(usuarioLogueado);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> cerrarSesion() {
        usuarioService.logout();
        return ResponseEntity.ok("Sesión cerrada correctamente");
    }

    @PutMapping("/perfil/{id}")
    public ResponseEntity<UsuarioDTO> actualizarPerfil(@PathVariable Long id, @Valid @RequestBody UsuarioDTO usuarioDTO) {
        UsuarioDTO perfilActualizado = usuarioService.actualizar(id, usuarioDTO);
        return ResponseEntity.ok(perfilActualizado);
    }
}
