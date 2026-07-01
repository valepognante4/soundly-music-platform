package com.streaming.soundly.dto;

import lombok.*;

import java.util.List;

/**
 * GeneroResultadoDTO — Soundly
 * ──────────────────────────────────────────────────────────────
 * CU-GENERO: Respuesta compuesta del endpoint GET /api/canciones/por-genero
 *
 * Contiene tanto la lista de canciones como la lista de artistas únicos
 * asociados al género seleccionado, permitiendo al frontend renderizar
 * ambas secciones (artistas arriba, canciones abajo) en una sola llamada.
 * ──────────────────────────────────────────────────────────────
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneroResultadoDTO {

    /** Lista de canciones pertenecientes al género. */
    private List<CancionDTO> canciones;

    /** Lista de artistas únicos cuyas canciones pertenecen al género. */
    private List<ArtistaDTO> artistas;
}
