package com.streaming.soundly.service;

import com.streaming.soundly.dto.CancionDTO;
import java.util.List;

public interface ICancionService {
    List<CancionDTO> buscarConFiltros(String titulo, String artista, String genero);
    void incrementarReproduccion(Long id);
    boolean alternarFavorito(Long cancionId, Long usuarioId);
    List<CancionDTO> obtenerCancionesDestacadas();
    // BUG FIX #5: Método faltante para obtener las canciones favoritas de un usuario
    List<CancionDTO> obtenerFavoritos(Long usuarioId);
    CancionDTO guardar(CancionDTO cancionDTO);
    CancionDTO actualizarMetadata(Long id, CancionDTO cancionDTO);
    void eliminarDelCatalogo(Long id);
    CancionDTO agregarDesdeApi(String idDeezer);
    CancionDTO obtenerPorId(Long id);
}
