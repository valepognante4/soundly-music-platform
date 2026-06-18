(function () {
    'use strict';

    let _favAbortController = null;

    // ── Formatea segundos → "m:ss" ─────────────────────────────────────────
    function _formatDuracion(seg) {
        if (!seg || isNaN(seg)) return '—';
        const m = Math.floor(seg / 60);
        const s = String(Math.floor(seg % 60)).padStart(2, '0');
        return `${m}:${s}`;
    }

    const FALLBACK_IMG = 'https://placehold.co/40x40/1a1a2e/a78bfa?text=♪';

    window.initFavoritos = async function initFavoritos() {
        if (_favAbortController) _favAbortController.abort();
        _favAbortController = new AbortController();
        const { signal } = _favAbortController;

        const usuario = GestorUsuarios.obtenerActivo();
        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        // Función para toggle de favorito
        async function toggleFavorito(cancion) {
            if (!usuario) return;
            try {
                const mensaje = await GestorCanciones.toggleFavorito(cancion.id, usuario.id);
                console.log('[Favoritos]', mensaje);
                // Recargar la lista de favoritos después de quitar
                window.initFavoritos();
            } catch (e) {
                console.error('[Favoritos] Error al actualizar favorito:', e);
            }
        }

        Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');
        document.getElementById('btn-logout')?.addEventListener('click', () => GestorUsuarios.cerrarSesion(), { signal });

        let favoritos = [];
        try {
            favoritos = await GestorCanciones.obtenerFavoritos(usuario.id);
        } catch (e) {
            console.error('[Favoritos] Error al cargar favoritos:', e);
            favoritos = [];
        }

        // ── Contador de canciones ──────────────────────────────────────────
        const metaInfoEl = document.getElementById('fav-meta-info');
        if (metaInfoEl) {
            metaInfoEl.textContent = `${favoritos.length} canción${favoritos.length !== 1 ? 'es' : ''}`;
        }

        // ── Botón "Reproducir todo" ────────────────────────────────────────
        // Se usa onclick (no addEventListener) para evitar listeners zombie en SPA.
        const playAllBtn = document.getElementById('btn-play-all');
        if (playAllBtn) {
            if (favoritos.length) {
                playAllBtn.disabled = false;
                playAllBtn.onclick = () => {
                    console.log('Reproduciendo lista...', favoritos);
                    window.SoundlyPlayer.reproducirLista(favoritos);
                };
            } else {
                playAllBtn.disabled = true;
                playAllBtn.onclick = null;
            }
        }

        // ── Renderizar filas ───────────────────────────────────────────────
        const containerEl = document.getElementById('playlist-list');
        if (!containerEl) return;

        containerEl.innerHTML = '';

        if (!favoritos.length) {
            containerEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <p>No tienes canciones en tus favoritos.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        favoritos.forEach((cancion, idx) => {
            const row = document.createElement('div');
            row.className = 'song-row';
            row.dataset.id  = cancion.id;
            row.dataset.idx = idx;

            const thumb   = cancion.img || cancion.imagenUrl || FALLBACK_IMG;
            const titulo  = cancion.titulo   || 'Sin título';
            const artista = cancion.artista || 'Desconocido';
            const genero  = cancion.genero   || '—';
            const dur     = _formatDuracion(cancion.duracion);
            const songId  = cancion.id || '';

            row.innerHTML = `
                <div class="row-num">${idx + 1}</div>
                <div class="row-info">
                    <img class="row-thumb" src="${thumb}" alt="${titulo}"
                         onerror="this.src='${FALLBACK_IMG}'">
                    <div class="row-text">
                        <div class="row-title">${titulo}</div>
                        <div class="row-artist">${artista}</div>
                    </div>
                </div>
                <div class="row-genre">${genero}</div>
                <div class="row-duration">${dur}</div>
                <div class="row-actions">
                    <button class="row-like-btn row-like-btn--active"
                            aria-label="Quitar de Mis Me Gusta"
                            title="En tus Me Gusta"
                            data-song-id="${songId}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            `;

            // Clic en el corazón → stopPropagation para no disparar reproducción
            row.querySelector('.row-like-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorito(cancion);
            });

            // Clic en la fila → reproducir canción
            row.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.SoundlyPlayer.reproducir(cancion);
            });

            fragment.appendChild(row);
        });

        containerEl.appendChild(fragment);

        // ── Recargar playlists del sidebar ─────────────────────────────────
        if (typeof window.cargarPlaylistsSidebar === 'function') {
            window.cargarPlaylistsSidebar(usuario.id);
        }
    };

    // Auto-init cuando se accede directo a favoritos.html (sin SPA)
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('content')) return;
        if (window.location.pathname.endsWith('favoritos.html') || window.location.href.includes('favoritos.html')) {
            window.initFavoritos();
        }
    });
})();
