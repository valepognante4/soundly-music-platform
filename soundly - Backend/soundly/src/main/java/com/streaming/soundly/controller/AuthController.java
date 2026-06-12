package com.streaming.soundly.controller;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RecuperarPasswordRequestDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.ResetPasswordRequestDTO;
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

    /**
     * Paso 1 — Solicitar recuperación: recibe el email y envía el correo con el token.
     * Siempre responde 200 OK con un mensaje genérico (no revela si el email existe).
     */
    @PostMapping("/recuperar-password")
    public ResponseEntity<String> recuperarPassword(
            @Valid @RequestBody RecuperarPasswordRequestDTO request) {
        usuarioService.solicitarRecuperacionPassword(request.getEmail());
        return ResponseEntity.ok(
                "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.");
    }

    /**
     * Paso 2 — Confirmar reset: recibe el token y la nueva contraseña.
     * Valida que el token sea válido, no esté expirado ni usado.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetearPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        usuarioService.resetearPassword(request);
        return ResponseEntity.ok("Contraseña restablecida correctamente.");
    }
}
