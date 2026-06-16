/**
 * controlador-home.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DE LA PÁGINA HOME (MVC)
 *
 * Responsabilidades:
 *   - Verificar sesión activa
 *   - Cargar canciones y recomendaciones desde el Modelo
 *   - Delegar el renderizado a la Vista
 *   - Conectar eventos de UI al Reproductor Global
 *   - Modal de Crear Playlist
 *
 * Expone window.initHome() para que el sistema SPA (navegacion.js / index.html) pueda
 * reinicializar la sección al navegar sin recargar la página.
 *
 * Dependencias (deben cargarse antes en el HTML, en este orden):
 *   1. config.js
 *   2. modelo.js            (GestorUsuarios, GestorCanciones, GestorPlaylists)
 *   3. modelo-canciones.js  (alias de compatibilidad)
 *   4. reproductor-global.js (window.SoundlyPlayer)
 *   5. vista.js             (Vista)
 *   6. controlador-home.js  ← este archivo
 * ─────────────────────────────────────────────────────────────────────────────
 */

// AbortController para limpiar event listeners al re-inicializar la sección
let _homeAbortController = null;

// ── FUNCIÓN DE INICIALIZACIÓN PRINCIPAL ──────────────────────────────────────
// Expuesta como window.initHome para que navegacion.js la llame en cada
// navegación a home. Puede ejecutarse múltiples veces de forma segura.
window.initHome = async function initHome() {

    // Cancelar listeners de la inicialización anterior (evita duplicados)
    if (_homeAbortController) {
        _homeAbortController.abort();
    }
    _homeAbortController = new AbortController();
    const { signal } = _homeAbortController;

    // ── 1. VERIFICAR SESIÓN ───────────────────────────────────────────────
    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // ── 2. ACTUALIZAR UI CON DATOS DEL USUARIO ────────────────────────────
    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');

    const greetingEl = document.getElementById('greeting');
    if (greetingEl) greetingEl.textContent = obtenerSaludo();

    // Botón logout (solo conectar si no fue conectado ya — usa signal)
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        GestorUsuarios.cerrarSesion();
    }, { signal });

    // ── 3. CARGAR CANCIONES DESDE EL BACKEND ─────────────────────────────
    let todasLasCanciones = [];
    let recomendadas      = [];

    try {
        [todasLasCanciones, recomendadas] = await Promise.all([
            GestorCanciones.obtenerTodas(),
            GestorCanciones.obtenerRecomendadas(),
        ]);
    } catch (error) {
        console.error('[Home] Error al cargar canciones:', error);
        todasLasCanciones = [];
        recomendadas      = [];
    }

    // Si recomendadas está vacío, usamos las primeras 8 canciones
    if (recomendadas.length === 0 && todasLasCanciones.length > 0) {
        recomendadas = todasLasCanciones.slice(0, 8);
    }

    // ── 4. RENDERIZAR SECCIONES ───────────────────────────────────────────

    if (document.getElementById('cards-recomendados')) {
        Vista.renderizarTarjetasCanciones(
            recomendadas.slice(0, 4),
            'cards-recomendados',
            (cancion, idx) => window.SoundlyEvents.reproducirLista(recomendadas, idx)
        );
    }

    if (document.getElementById('cards-mas')) {
        Vista.renderizarTarjetasCanciones(
            recomendadas.slice(4, 8),
            'cards-mas',
            (cancion, idx) => window.SoundlyEvents.reproducirLista(recomendadas, idx + 4)
        );
    }

    if (document.getElementById('cards-artistas')) {
        try {
            const artistas = await GestorArtistas.obtenerTodos();
            renderizarArtistas(artistas, 5);
        } catch(e) {
            console.error(e);
        }
    }

    if (document.getElementById('cards-albumes')) {
        try {
            const albums = await window.fetchAlbums();
            renderizarAlbums(albums, 5); // Limitar a 5 álbumes en Home
        } catch (e) {
            console.error('[Home] Error al cargar álbumes:', e);
            document.getElementById('cards-albumes').innerHTML = '<p style="color:var(--muted)">No hay álbumes disponibles</p>';
        }
    }

    renderizarQuickGrid(todasLasCanciones.slice(0, 5));
    cargarPlaylistsSidebar(usuario.id);

    // ── 5. SINCRONIZAR ESTADO DEL REPRODUCTOR ────────────────────────────
    const cancionActual = window.SoundlyPlayer.getCancionActual();
    if (cancionActual && usuario) {
        actualizarBotonLike(cancionActual.id, usuario.id);
    }

    // ── 6. EVENTO: LIKE EN EL FOOTER ──────────────────────────────────────
    document.getElementById('np-like')?.addEventListener('click', async () => {
        const c = window.SoundlyPlayer.getCancionActual();
        if (!c || !usuario) return;
        try {
            const mensaje = await GestorCanciones.toggleFavorito(c.id, usuario.id);
            const btn = document.getElementById('np-like');
            const esFavorito = btn.classList.toggle('liked');
            btn.textContent = esFavorito ? '♥' : '♡';
            console.log('[Home]', mensaje);
        } catch (e) {
            console.error('[Home] Error al actualizar favorito:', e);
        }
    }, { signal });

    // Actualizar botón like cuando cambia la canción
    window.addEventListener('soundly:cancion-cambio', async (e) => {
        const { cancion } = e.detail;
        if (cancion && usuario) actualizarBotonLike(cancion.id, usuario.id);
    }, { signal });

    // ── 7. MODAL CREAR PLAYLIST ───────────────────────────────────────────
    inicializarModalCrearPlaylist(usuario, signal);
};

// ─── AUTO-INIT: Solo cuando se accede directamente a home.html (no via SPA) ──
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('content')) return;
    if (window.location.pathname.includes('home.html')) {
        window.initHome();
    }
});

// ─── FUNCIONES AUXILIARES ─────────────────────────────────────────────────────

function obtenerSaludo() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

function renderizarArtistas(artistas, limit = null) {
    const contenedor = document.getElementById('cards-artistas');
    if (!contenedor) return;

    if (!artistas || artistas.length === 0) {
        contenedor.innerHTML = '<p style="color:var(--muted)">No hay artistas disponibles</p>';
        return;
    }

    contenedor.innerHTML = '';
    const artistasAMostrar = limit ? artistas.slice(0, limit) : artistas;

    artistasAMostrar.forEach((artista) => {
        const card = document.createElement('div');
        card.className = 'song-card artist-card fade-in';
        card.style.cursor = 'pointer';

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${artista.foto || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'}" 
                     alt="${artista.nombre}" 
                     class="card-image"
                     onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'">
                <div class="play-overlay">
                    <button class="play-btn-circle" aria-label="Ver artista">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <polygon points="5,3 19,12 5,21"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-info" style="text-align: center;">
                <h3 class="card-title">${artista.nombre}</h3>
                <p class="card-artist">Artista</p>
            </div>
        `;

        card.addEventListener('click', () => {
            if (typeof window.navegarA === 'function') {
                window.navegarA('artista.html?id=' + artista.id);
            } else {
                window.location.href = 'artista.html?id=' + artista.id;
            }
        });

        contenedor.appendChild(card);
    });
}

function renderizarAlbums(albums, limit = null) {
    const contenedor = document.getElementById('cards-albumes');
    if (!contenedor) return;

    if (!albums || albums.length === 0) {
        contenedor.innerHTML = '<p style="color:var(--muted)">No hay álbumes disponibles</p>';
        return;
    }

    contenedor.innerHTML = '';
    
    // Si se pasa un límite, cortamos el array
    const albumsAMostrar = limit ? albums.slice(0, limit) : albums;
    
    albumsAMostrar.forEach((album) => {
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
}

function renderizarQuickGrid(canciones) {
    const grid = document.getElementById('quick-grid-dinamico');
    if (!grid || canciones.length === 0) return;

    grid.innerHTML = '';
    canciones.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'quick-card';
        div.id = `quick-${c.id}`;
        div.innerHTML = `
            <img class="quick-thumb"
                 src="${c.img}"
                 alt="${c.titulo}"
                 onerror="this.src='https://placehold.co/48x48/1a1a2e/a78bfa?text=♪'">
            <span class="quick-label">${c.titulo}</span>
        `;
        div.addEventListener('click', () => {
            window.SoundlyEvents.reproducirLista(canciones, i);
        });
        grid.appendChild(div);
    });
}

async function cargarPlaylistsSidebar(usuarioId) {
    if (!usuarioId) return;
    try {
        const playlists = await GestorPlaylists.listarPorUsuario(usuarioId);
        const sidebar = document.getElementById('sidebar-playlists');
        if (!sidebar) return;

        sidebar.innerHTML = '';
        playlists.forEach(p => {
            const a = document.createElement('a');
            a.href = `playlist.html?id=${p.id}`;
            a.className = 'nav-link sidebar-playlist-link';
            a.id = `sidebar-pl-${p.id}`;
            a.addEventListener('click', (e) => {
                if (typeof window.navegarA === 'function') {
                    e.preventDefault();
                    window.navegarA(`playlist.html?id=${p.id}`);
                }
            });
            a.innerHTML = `
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                </svg>
                <span>${p.nombre}</span>
            `;
            sidebar.appendChild(a);
        });
    } catch (e) {
        console.warn('[Home] No se pudieron cargar las playlists del sidebar:', e);
    }
}

async function actualizarBotonLike(cancionId, usuarioId) {
    const btn = document.getElementById('np-like');
    if (btn) btn.textContent = '♡';
}

function inicializarModalCrearPlaylist(usuario, signal) {
    const modal       = document.getElementById('modal-crear-playlist');
    const btnCrear    = document.querySelector('.btn-sidebar-create');
    const btnGuardar  = document.getElementById('btn-guardar');
    const btnCancelar = document.getElementById('btn-cancelar');

    if (!modal) return;

    const cerrarModal = () => {
        modal.style.display = 'none';
        const input = document.getElementById('input-nombre-playlist');
        if (input) input.value = '';
        Vista.ocultarError?.('modal-error-message');
    };

    btnCrear   ?.addEventListener('click', () => { modal.style.display = 'flex'; }, { signal });
    btnCancelar?.addEventListener('click', cerrarModal, { signal });
    modal      .addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); }, { signal });

    btnGuardar?.addEventListener('click', async () => {
        const input    = document.getElementById('input-nombre-playlist');
        const nombre   = input?.value.trim();

        if (!nombre) {
            Vista.mostrarError?.('modal-error-message', 'Por favor, escribí un nombre.');
            return;
        }

        try {
            const nuevaPlaylist = await GestorPlaylists.crear(nombre, usuario.id);
            cerrarModal();
            if (nuevaPlaylist?.id) {
                const url = `playlist.html?id=${nuevaPlaylist.id}`;
                if (typeof window.navegarA === 'function') window.navegarA(url);
                else window.location.href = url;
            }
        } catch (error) {
            console.error('[Home] Error al crear playlist:', error);
            Vista.mostrarError?.('modal-error-message', 'No se pudo crear la playlist. Intentá de nuevo.');
        }
    }, { signal });
}

// ── COMPATIBILIDAD: funciones globales del reproductor ────────────────────────
function selectSong(idx) {
    const canciones = window._soundlyCancionesCache || [];
    if (canciones[idx]) window.SoundlyEvents?.reproducirLista(canciones, idx);
}
function togglePlay() { window.SoundlyEvents?.togglePlay(); }
function nextSong()   { window.SoundlyEvents?.siguiente(); }
function prevSong()   { window.SoundlyEvents?.anterior(); }
function seekTo(e)    { window.dispatchEvent(new CustomEvent('soundly:seek', { detail: { event: e } })); }
function toggleMute() {
    const audio = window.SoundlyPlayer?.getAudio();
    if (!audio) return;
    audio.muted = !audio.muted;
    document.getElementById('vol-btn').textContent = audio.muted ? '🔇' : '🔊';
}
function setVol(v) { window.SoundlyEvents?.setVolumen(v); }
