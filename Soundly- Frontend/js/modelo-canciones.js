/**
 * modelo-canciones.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper de compatibilidad.
 * El modelo real está en modelo.js (GestorCanciones, GestorPlaylists, etc.)
 * Este archivo solo re-exporta los objetos con los nombres que usan los
 * controladores legados, para que no sea necesario cambiarlos de golpe.
 */

// CancionesModelo y PlaylistModelo ya están definidos en modelo.js.
// Este archivo existe solo para mantener la referencia de carga en los HTML.

/**
 * Función para obtener los álbumes desde el backend.
 * Retorna un array de objetos álbum con la siguiente estructura:
 * { id, nombre, portada, artista, canciones: [{ id, titulo, duracion }] }
 */
window.fetchAlbums = async function() {
    try {
        const response = await fetch(`${window.SoundlyConfig.API_BASE_URL}/albums`);
        if (!response.ok) throw new Error('Network response was not ok');
        const albums = await response.json();
        return albums;
    } catch (error) {
        console.error('[fetchAlbums] Error al obtener álbumes desde el backend:', error);
        return [];
    }
};