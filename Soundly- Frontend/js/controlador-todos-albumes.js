/**
 * controlador-todos-albumes.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * Controlador para la vista que muestra todos los álbumes sin límite.
 * ─────────────────────────────────────────────────────────────────────────────
 */

let _todosAlbumesAbortController = null;

window.initTodosLosAlbumes = async function initTodosLosAlbumes() {
    if (_todosAlbumesAbortController) _todosAlbumesAbortController.abort();
    _todosAlbumesAbortController = new AbortController();
    const { signal } = _todosAlbumesAbortController;

    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');
    document.getElementById('btn-logout')?.addEventListener('click', () => GestorUsuarios.cerrarSesion(), { signal });

    const contenedor = document.getElementById('cards-todos-albumes');
    if (!contenedor) return;

    try {
        const albums = await window.fetchAlbums();
        
        if (!albums || albums.length === 0) {
            contenedor.innerHTML = '<p style="color:var(--muted)">No hay álbumes disponibles</p>';
            return;
        }

        contenedor.innerHTML = '';
        
        albums.forEach((album) => {
            const card = document.createElement('div');
            card.className = 'song-card fade-in';
            card.style.cursor = 'pointer';
            
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${album.portada || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'}" 
                         alt="Portada de ${album.nombre}" 
                         class="card-image"
                         onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'">
                    <div class="play-overlay">
                        <button class="play-btn-circle" aria-label="Ver álbum">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${album.nombre}</h3>
                    <p class="card-artist">${album.artista || 'Varios Artistas'}</p>
                </div>
            `;
            
            card.addEventListener('click', () => {
                if (typeof window.navegarA === 'function') {
                    window.navegarA('album.html?id=' + album.id);
                } else {
                    window.location.href = 'album.html?id=' + album.id;
                }
            });
            
            contenedor.appendChild(card);
        });

    } catch (e) {
        console.error('[TodosLosAlbumes] Error al cargar álbumes:', e);
        contenedor.innerHTML = '<p style="color:var(--muted)">Error al cargar álbumes</p>';
    }
};

// AUTO-INIT
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('content')) return;
    if (window.location.pathname.includes('todos-los-albumes.html')) {
        window.initTodosLosAlbumes();
    }
});
