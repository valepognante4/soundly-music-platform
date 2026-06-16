/**
 * controlador-album.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DEDICADO DE LA PÁGINA ÁLBUM
 *
 * Gestiona la vista de un álbum individual:
 *   - Lee el ID del álbum de la URL  (?id=...)
 *   - Obtiene los álbumes con fetchAlbums()  →  /api/albums
 *   - Renderiza: portada, título, artistaNombre, lista de canciones
 *   - Botón "Reproducir todo" vinculado al reproductor global
 *
 * Campos del AlbumDTO esperados desde el backend:
 *   { id, nombre, portada, artistaId, artistaNombre, canciones[] }
 *
 * IMPORTANTE: window.initAlbum se registra FUERA del IIFE para que
 * navegacion.js y el auto-init de DOMContentLoaded puedan encontrarla
 * independientemente del orden de carga.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── Utilidad ─────────────────────────────────────────────────────────────
    const $_al = (id) => document.getElementById(id);
    let _albumAbortController = null;

    // ── Constantes ───────────────────────────────────────────────────────────
    const FALLBACK_COVER = 'https://placehold.co/500x500/0f0f1a/a78bfa?text=♫';
    const FALLBACK_THUMB = 'https://placehold.co/48x48/0f0f1a/a78bfa?text=♪';

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Formatea segundos enteros → "m:ss" */
    function _formatDuracion(seg) {
        if (!seg || isNaN(seg)) return '--:--';
        const m = Math.floor(seg / 60);
        const s = String(Math.floor(seg % 60)).padStart(2, '0');
        return `${m}:${s}`;
    }

    // ── Render: banner del álbum ──────────────────────────────────────────────
    function _renderBanner(album) {
        const nameEl = $_al('album-name');
        if (nameEl) nameEl.textContent = album.nombre ?? 'Sin título';

        // artistaNombre viene del nuevo DTO; artista es el campo legado
        const artistEl = $_al('album-artist');
        if (artistEl) artistEl.textContent = album.artistaNombre ?? album.artista ?? '—';

        const coverImg = $_al('album-cover-img');
        if (coverImg) {
            coverImg.src     = album.portada || FALLBACK_COVER;
            coverImg.onerror = () => { coverImg.src = FALLBACK_COVER; };
            coverImg.alt     = `Portada de ${album.nombre}`;
        }

        _renderPlayAllButton(album.canciones ?? []);
    }

    // ── Render: botón "Reproducir todo" ──────────────────────────────────────
    function _renderPlayAllButton(canciones) {
        // Limpiar instancia previa (navegación SPA)
        const existing = document.getElementById('btn-play-all');
        if (existing) existing.remove();

        if (!canciones.length) return;

        const btn = document.createElement('button');
        btn.id        = 'btn-play-all';
        btn.className = 'album-play-all-btn';
        btn.setAttribute('aria-label', 'Reproducir álbum completo');
        btn.innerHTML = `
            <span class="play-all-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <polygon points="5,3 19,12 5,21"/>
                </svg>
            </span>
            <span class="play-all-label">Reproducir todo</span>
        `;
        btn.addEventListener('click', () => {
            window.SoundlyEvents?.reproducirLista(canciones, 0);
        });

        const banner = document.querySelector('.hero-banner');
        if (banner) banner.insertAdjacentElement('afterend', btn);
    }

    // ── Render: fila de canción ───────────────────────────────────────────────
    function _crearFilaCancion(cancion, index, album, allCanciones) {
        const row = document.createElement('div');
        row.className = 'playlist-row';
        row.setAttribute('data-index', index);
        row.setAttribute('role', 'row');

        const artistName = cancion.nombreArtista
            || album.artistaNombre
            || album.artista
            || '—';

        const thumb = cancion.imagenUrl || album.portada || FALLBACK_THUMB;

        row.innerHTML = `
            <div class="row-index" role="cell">
                <span class="number">${index + 1}</span>
                <i class="fas fa-play play-icon" aria-hidden="true"></i>
            </div>
            <div class="row-thumb" role="cell">
                <img
                    src="${thumb}"
                    alt="${cancion.titulo ?? 'Canción'}"
                    loading="lazy"
                    onerror="this.src='${FALLBACK_THUMB}'"
                >
            </div>
            <div class="row-title" role="cell">
                <span class="song-name">${cancion.titulo ?? 'Sin título'}</span>
                <span class="song-artist">${artistName}</span>
            </div>
            <div class="row-genre" role="cell">—</div>
            <div class="row-duration" role="cell">${_formatDuracion(cancion.duracion)}</div>
            <div class="row-actions" role="cell"></div>
        `;

        row.querySelector('.row-index').addEventListener('click', () =>
            window.SoundlyEvents?.reproducirLista(allCanciones, index)
        );
        row.addEventListener('dblclick', () =>
            window.SoundlyEvents?.reproducirLista(allCanciones, index)
        );

        return row;
    }

    // ── Render: lista de canciones ────────────────────────────────────────────
    function _renderCanciones(album) {
        const listaEl = $_al('album-list');
        if (!listaEl) return;

        const canciones = album.canciones ?? [];
        listaEl.innerHTML = '';

        if (!canciones.length) {
            listaEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music" style="font-size:2rem;color:#a78bfa;margin-bottom:.5rem;"></i>
                    <p>Este álbum no tiene canciones aún.</p>
                </div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        canciones.forEach((c, i) =>
            fragment.appendChild(_crearFilaCancion(c, i, album, canciones))
        );
        listaEl.appendChild(fragment);
    }

    // ── Estados UI ────────────────────────────────────────────────────────────
    function _setLoadingState() {
        const n = $_al('album-name');
        const a = $_al('album-artist');
        if (n) n.textContent = 'Cargando...';
        if (a) a.textContent = '—';
    }

    function _setErrorState(msg) {
        const n = $_al('album-name');
        const a = $_al('album-artist');
        if (n) n.textContent = msg;
        if (a) a.textContent = '—';

        const listaEl = $_al('album-list');
        if (listaEl) {
            listaEl.innerHTML = `
                <div class="empty-state" style="color:#f87171;">
                    <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:.5rem;"></i>
                    <p>${msg}</p>
                </div>`;
        }
    }

    // ── Inicializador principal ───────────────────────────────────────────────
    async function initAlbum() {
        // Abortar llamada previa si la hay (SPA con navegación rápida)
        if (_albumAbortController) _albumAbortController.abort();
        _albumAbortController = new AbortController();
        const { signal } = _albumAbortController;

        // ── Guardia de sesión ────────────────────────────────────────────────
        const usuario = (typeof GestorUsuarios !== 'undefined')
            ? GestorUsuarios.obtenerActivo()
            : null;

        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        if (typeof Vista !== 'undefined' && typeof Vista.actualizarNombreUsuario === 'function') {
            Vista.actualizarNombreUsuario(
                usuario.apodo || usuario.nombreUsuario || 'Usuario'
            );
        }

        $_al('btn-logout')?.addEventListener(
            'click',
            () => GestorUsuarios.cerrarSesion(),
            { signal }
        );

        // ── Leer ?id= de la URL ──────────────────────────────────────────────
        const idAlbum = new URLSearchParams(window.location.search).get('id');
        if (!idAlbum) {
            window.location.href = 'home.html';
            return;
        }

        _setLoadingState();

        try {
            // window.fetchAlbums() está definido en modelo-canciones.js
            if (typeof window.fetchAlbums !== 'function') {
                throw new Error('fetchAlbums no está disponible. Verificá el orden de carga de scripts.');
            }

            const albums = await window.fetchAlbums();

            if (signal.aborted) return;

            const album = albums.find((a) => String(a.id) === String(idAlbum));

            if (!album) {
                _setErrorState('Álbum no encontrado');
                return;
            }

            console.log('[Album] ✅ Datos del backend:', album);

            _renderBanner(album);
            _renderCanciones(album);

        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[Album] ❌ Error inesperado:', err);
            _setErrorState('No se pudo conectar con el servidor');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REGISTRO GLOBAL
    // Se expone DENTRO del IIFE pero asignando a window,
    // así navegacion.js y el DOMContentLoaded la encuentran en cualquier orden.
    // ══════════════════════════════════════════════════════════════════════════
    window.initAlbum = initAlbum;

    // ── Auto-init: acceso directo a album.html (sin SPA) ─────────────────────
    // Espera a que el DOM esté listo Y a que todos los scripts anteriores
    // (modelo.js, modelo-canciones.js, reproductor-global.js, vista.js)
    // ya se hayan ejecutado, lo cual ocurre porque los <script> son síncronos
    // y este es el último archivo en cargarse.
    document.addEventListener('DOMContentLoaded', () => {
        // Si el SPA está activo (#content existe), la navegación dispara initAlbum
        // a través de navegacion.js → ejecutarControlador(). No lo hacemos aquí.
        if (document.getElementById('content')) return;

        // Acceso directo: la URL apunta a album.html
        if (window.location.pathname.endsWith('album.html')
            || window.location.href.includes('album.html')) {
            window.initAlbum();
        }
    });

}());
