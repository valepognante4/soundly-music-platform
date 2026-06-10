package com.streaming.soundly.service;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.UsuarioDTO;
import com.streaming.soundly.mapper.UsuarioMapper;
import com.streaming.soundly.model.Rol;
import com.streaming.soundly.model.Usuario;
import com.streaming.soundly.repository.UsuarioRepository;
import com.streaming.soundly.service.IUsuarioService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UsuarioService implements IUsuarioService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public UsuarioDTO registrar(RegistroDTO registroDTO) {
        // CU-05: Validación estricta de datos duplicados en Base de Datos
        if (usuarioRepository.existsByEmail(registroDTO.getEmail())) {
            throw new IllegalArgumentException("El email ya se encuentra registrado en Soundly");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(registroDTO.getNombreUsuario());
        usuario.setEmail(registroDTO.getEmail());

        // SEGURIDAD: Aquí deberías encriptar el password antes de guardar:
        // usuario.setPassword(passwordEncoder.encode(registroDTO.getPassword()));
        usuario.setPassword(registroDTO.getPassword());
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
        // CU-02: Inicio de Sesión seguro
        Usuario usuario = usuarioRepository.findByEmail(loginDTO.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales incorrectas: Email no registrado"));

        // Validación de contraseña (en producción usarías passwordEncoder.matches())
        if (!usuario.getPassword().equals(loginDTO.getPassword())) {
            throw new IllegalArgumentException("Credenciales incorrectas: Contraseña inválida");
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
}
