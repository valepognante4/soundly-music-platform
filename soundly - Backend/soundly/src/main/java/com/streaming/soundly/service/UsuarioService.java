package com.streaming.soundly.service;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.ResetPasswordRequestDTO;
import com.streaming.soundly.dto.UsuarioDTO;
import com.streaming.soundly.exception.EmailYaRegistradoException;
import com.streaming.soundly.exception.TokenInvalidoException;
import com.streaming.soundly.mapper.UsuarioMapper;
import com.streaming.soundly.model.PasswordResetToken;
import com.streaming.soundly.model.Rol;
import com.streaming.soundly.model.Usuario;
import com.streaming.soundly.repository.PasswordResetTokenRepository;
import com.streaming.soundly.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UsuarioService implements IUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          PasswordResetTokenRepository tokenRepository,
                          EmailService emailService,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public UsuarioDTO registrar(RegistroDTO registroDTO) {
        // CU-05: Validación estricta de datos duplicados en Base de Datos
        if (usuarioRepository.existsByEmail(registroDTO.getEmail())) {
            throw new EmailYaRegistradoException("El email ya se encuentra registrado en Soundly");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(registroDTO.getNombreUsuario());
        usuario.setEmail(registroDTO.getEmail());
        usuario.setPassword(passwordEncoder.encode(registroDTO.getPassword()));
        usuario.setFechaNacimiento(registroDTO.getFechaNacimiento());

        // BLINDADO: Asignación por defecto segura del Enum que creamos
        if (registroDTO.getRol() != null) {
            usuario.setRol(registroDTO.getRol());
        } else {
            usuario.setRol(Rol.USER); // Si no se especifica, por defecto es un usuario común seguro
        }

        Usuario guardado = usuarioRepository.save(usuario);

        // Mapeamos manualmente al DTO de salida
        UsuarioDTO salida = new UsuarioDTO();
        salida.setId(guardado.getId());
        salida.setNombreUsuario(guardado.getNombre());
        salida.setEmail(guardado.getEmail());
        salida.setFechaNacimiento(guardado.getFechaNacimiento());
        salida.setRol(guardado.getRol());

        return salida;
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioDTO login(LoginDTO loginDTO) {
        // CU-02: Inicio de Sesión seguro con BCrypt
        Usuario usuario = usuarioRepository.findByEmail(loginDTO.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales incorrectas"));

        if (!passwordEncoder.matches(loginDTO.getPassword(), usuario.getPassword())) {
            throw new IllegalArgumentException("Credenciales incorrectas");
        }

        UsuarioDTO salida = new UsuarioDTO();
        salida.setId(usuario.getId());
        salida.setNombreUsuario(usuario.getNombre());
        salida.setEmail(usuario.getEmail());
        salida.setFechaNacimiento(usuario.getFechaNacimiento());
        salida.setRol(usuario.getRol()); // Devuelve el Rol para que el Front sepa si habilitar la consola de administración

        return salida;
    }

    @Override
    public void logout() {
        // CU-03: Cierre de sesión formalizado para auditoría si lo requiriera el sistema
    }

    @Override
    @Transactional
    public UsuarioDTO actualizar(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con ID: " + id));

        usuario.setNombre(usuarioDTO.getNombreUsuario());
        usuario.setEmail(usuarioDTO.getEmail());
        usuario.setFechaNacimiento(usuarioDTO.getFechaNacimiento());

        if (usuarioDTO.getRol() != null) {
            usuario.setRol(usuarioDTO.getRol());
        }

        Usuario actualizado = usuarioRepository.save(usuario);

        // Usamos el mapper para devolver los datos reales persistidos
        return UsuarioMapper.toDTO(actualizado);
    }

    // =========================================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // =========================================================================

    /**
     * Paso 1: Genera un token seguro, lo persiste con 1 hora de vigencia
     * y envía el correo de forma asíncrona.
     * Se responde siempre igual para no revelar si el email existe (anti-enumeración).
     */
    @Override
    @Transactional
    public void solicitarRecuperacionPassword(String email) {
        usuarioRepository.findByEmail(email).ifPresent(usuario -> {
            // Invalidar tokens previos del mismo usuario
            tokenRepository.invalidarTokensAnteriores(usuario.getId());

            // Generar token UUID criptográficamente seguro
            String token = UUID.randomUUID().toString();
            LocalDateTime expiracion = LocalDateTime.now().plusHours(1);

            PasswordResetToken resetToken = new PasswordResetToken(token, usuario, expiracion);
            tokenRepository.save(resetToken);

            // Envío asíncrono: no bloquea el hilo HTTP
            emailService.enviarEmailRecuperacion(email, token);
        });
    }

    /**
     * Paso 2: Valida el token, hashea la nueva contraseña con BCrypt
     * y elimina el token de la base de datos para que no pueda reutilizarse.
     *
     * @throws TokenInvalidoException si el token no existe, ya fue usado o está expirado.
     */
    @Override
    @Transactional
    public void resetearPassword(ResetPasswordRequestDTO dto) {
        // 1. Buscar token — 400 si no existe
        PasswordResetToken resetToken = tokenRepository.findByToken(dto.getToken())
                .orElseThrow(() -> new TokenInvalidoException(
                        "El enlace de recuperación es inválido. Solicitá uno nuevo."));

        // 2. Verificar que no esté expirado ni haya sido usado — 400 con mensaje diferenciado
        if (resetToken.getExpiracion().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(resetToken); // limpiar token expirado
            throw new TokenInvalidoException(
                    "El enlace de recuperación expiró (validez: 1 hora). Solicitá uno nuevo.");
        }

        if (resetToken.isUtilizado()) {
            throw new TokenInvalidoException(
                    "Este enlace de recuperación ya fue utilizado. Solicitá uno nuevo.");
        }

        // 3. Hashear la nueva contraseña con BCrypt y persistirla
        Usuario usuario = resetToken.getUsuario();
        usuario.setPassword(passwordEncoder.encode(dto.getNuevaPassword()));
        usuarioRepository.save(usuario);

        // 4. Eliminar físicamente el token para que no pueda reutilizarse
        tokenRepository.delete(resetToken);
    }
}
