package com.streaming.soundly.service;

import com.streaming.soundly.dto.LoginDTO;
import com.streaming.soundly.dto.RegistroDTO;
import com.streaming.soundly.dto.UsuarioDTO;

public interface IUsuarioService {
    UsuarioDTO registrar(RegistroDTO registroDTO);
    UsuarioDTO login(LoginDTO loginDTO);
    void logout();
    UsuarioDTO actualizar(Long id, UsuarioDTO usuarioDTO);
}
