package com.streaming.soundly.service;

import com.streaming.soundly.dto.CancionDTO;
import java.util.List;

public interface ICancionService {
    List<CancionDTO> buscarConFiltros(String titulo, String artista, String genero);

    /**
     * CU-GENERO: Filtra canciones por nombre o ID de género.
     * @param nombreGenero nombre parcial del género (puede ser null si se usa ID)
     * @param generoId     ID exacto del género (puede ser null si se usa nombre)
     * @return lista de CancionDTO cuyo artista pertenece al género indicado
     */
    List<CancionDTO> buscarPorGenero(String nombreGenero, Long generoId);
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
