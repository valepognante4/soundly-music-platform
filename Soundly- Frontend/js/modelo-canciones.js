/**
 * modelo-canciones.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper de compatibilidad.
 * El modelo real está en modelo.js (GestorCanciones, GestorPlaylists, etc.)
 * Este archivo solo re-exporta los objetos con los nombres que usan los
 * controladores legados, para que no sea necesario cambiarlos de golpe.
 *
 * ⚠️ No agregues lógica aquí. Toda la lógica de negocio va en modelo.js.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Controladores que dependen de este archivo:
 *   - controlador-player.js  → usa CancionesModelo y PlaylistModelo
 *   - controlador-home.js    → usa CancionesModelo
 *   - controlador-busqueda.js → usa CancionesModelo.buscar()
 *
 * Los objetos reales son definidos en modelo.js al final del archivo.
 */

// CancionesModelo y PlaylistModelo ya están definidos en modelo.js.
// Este archivo existe solo para mantener la referencia de carga en los HTML.
// No es necesario redefinirlos aquí; modelo.js los expone como variables globales.