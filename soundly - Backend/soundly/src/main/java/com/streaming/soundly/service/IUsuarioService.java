package com.streaming.soundly.service;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.ResetPasswordRequestDTO;
import com.streaming.soundly.dto.UsuarioDTO;

public interface IUsuarioService {
    UsuarioDTO registrar(RegistroDTO registroDTO);
    UsuarioDTO login(LoginDTO loginDTO);
    void logout();
    UsuarioDTO actualizar(Long id, UsuarioDTO usuarioDTO);

    /**
     * Paso 1 del flujo: valida el email, genera el token y dispara el envío del correo.
     * Siempre responde con un mensaje genérico para no revelar si el email existe.
     */
    void solicitarRecuperacionPassword(String email);

    /**
     * Paso 2 del flujo: valida el token, verifica que no esté expirado/usado
     * y actualiza la contraseña del usuario.
     */
    void resetearPassword(ResetPasswordRequestDTO dto);
}
