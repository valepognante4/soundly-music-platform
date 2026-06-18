(function () {
    'use strict';

    let _favAbortController = null;

    window.initFavoritos = async function initFavoritos() {
        if (_favAbortController) _favAbortController.abort();
        _favAbortController = new AbortController();
        const { signal } = _favAbortController;

        const usuario = GestorUsuarios.obtenerActivo();
        if (!usuario) {
            window.location.href = 'login.html';
            return;
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

        const metaInfoEl = document.getElementById('fav-meta-info');
        if (metaInfoEl) {
            metaInfoEl.textContent = `${favoritos.length} canción${favoritos.length !== 1 ? 'es' : ''}`;
        }

        const containerEl = document.getElementById('playlist-list');
        if (containerEl) {
            containerEl.innerHTML = '';
            if (!favoritos.length) {
                containerEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🎵</div>
                        <p>No tienes canciones en tus favoritos.</p>
                    </div>
                `;
            } else {
                const fragment = document.createDocumentFragment();
                favoritos.forEach((cancion, idx) => {
                    const row = document.createElement('div');
                    row.className = 'song-row';
                    row.dataset.id = cancion.id;
                    row.dataset.idx = idx;

                    row.innerHTML = `
                        <div class="row-num">${idx + 1}</div>
                        <div class="row-info">
                            <div class="row-title">${cancion.titulo || 'Sin título'}</div>
                            <div class="row-artist">${cancion.artista || 'Desconocido'}</div>
                        </div>
                        <div class="row-genre">${cancion.genero || 'Desconocido'}</div>
                        <div class="row-duration">${Vista.fmt ? Vista.fmt(cancion.duracion) : ''}</div>
                    `;

                    row.addEventListener('click', () => {
                        window.SoundlyEvents?.reproducirLista(favoritos, idx);
                    });

                    fragment.appendChild(row);
                });
                containerEl.appendChild(fragment);
            }
        }

        const playAllBtn = document.getElementById('btn-play-all');
        if (playAllBtn && favoritos.length) {
            playAllBtn.addEventListener('click', () => {
                window.SoundlyEvents?.reproducirLista(favoritos, 0);
            }, { signal });
        }

        // Reload sidebar playlists
        if (typeof window.cargarPlaylistsSidebar === 'function') {
            window.cargarPlaylistsSidebar(usuario.id);
        }
    };

    // Auto-init when accessing directly to favoritos.html
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('content')) return;
        if (window.location.pathname.endsWith('favoritos.html') || window.location.href.includes('favoritos.html')) {
            window.initFavoritos();
        }
    });
})();
