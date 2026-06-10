package com.streaming.soundly.mapper;

import com.streaming.soundly.dto.UsuarioDTO;
import com.streaming.soundly.model.Usuario;

public class UsuarioMapper {

    // Método estático para transformar la entidad en DTO
    public static UsuarioDTO toDTO(Usuario u) {
        if (u == null) return null;

        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(u.getId());
        dto.setNombreUsuario(u.getNombre()); // Pasa 'nombre' de tu base de datos a 'nombreUsuario' del Front
        dto.setEmail(u.getEmail());
        dto.setFechaNacimiento(u.getFechaNacimiento());
        dto.setRol(u.getRol());

        return dto;
    }
}
