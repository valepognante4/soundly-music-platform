package com.streaming.soundly.service;

import com.streaming.soundly.dto.ArtistaDTO;
import com.streaming.soundly.external.dto.ExternalArtistaDTO;
import com.streaming.soundly.model.Artista;

import java.util.List;

public interface IArtistaService {
    ArtistaDTO crear(ArtistaDTO artistaDTO);
    ArtistaDTO actualizar(Long id, ArtistaDTO artistaDTO);
    void eliminar(Long id);
    Artista obtenerOCrearArtista(String nombre, ExternalArtistaDTO externalArtistaDto);
    void importarArtistaYCanciones(Long idDeezer);
    List<ArtistaDTO> listarTodos();
    int actualizarGenerosNulos();
    com.streaming.soundly.dto.ArtistaDetalleDTO obtenerDetalle(Long id);

    /**
     * Busca artistas cuyo nombre contenga el texto indicado (case-insensitive).
     * Usado por GET /api/artistas/buscar?nombre=X
     */
    List<ArtistaDTO> buscarPorNombre(String nombre);
}
