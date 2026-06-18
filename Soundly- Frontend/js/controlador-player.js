/**
 * controlador-player.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DE LA PÁGINA PLAYER / FAVORITOS / PLAYLIST (MVC)
 *
 * Comunicación con el reproductor vía Event Bus (window.SoundlyEvents).
 * Expone window.initPlayer() e window.initFavoritos() para el shell SPA.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const $ = id => document.getElementById(id);

let _playerAbortController = null;

// ── INICIALIZACIÓN SPA ────────────────────────────────────────────────────────

// Renombrados para evitar conflictos con otros controladores
window.initPlayerLegacy = async function initPlayerLegacy() {
    await _initVista('player');
};

window.initFavoritosLegacy = async function initFavoritosLegacy() {
    await _initVista('favoritos');
};

async function _initVista(tipoVista) {
    if (_playerAbortController) _playerAbortController.abort();
    _playerAbortController = new AbortController();
    const { signal } = _playerAbortController;

    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');
    $('btn-logout')?.addEventListener('click', () => GestorUsuarios.cerrarSesion(), { signal });

    if (tipoVista === 'favoritos') {
        await cargarVistaFavoritos(usuario);
    } else if (tipoVista === 'playlist') {
        const idPlaylist = new URLSearchParams(window.location.search).get('id');
        await cargarVistaPlaylist(idPlaylist, usuario);
    } else {
        await cargarVistaPlayer();
    }

    sincronizarEstadisticas();
    inicializarModalCrearPlaylistPlayer(usuario, signal);

    window.addEventListener('soundly:cancion-cambio', () => {
        resaltarCancionActivaPorId();
    }, { signal });

    window.addEventListener('soundly:estado-cambio', () => {
        resaltarCancionActivaPorId();
    }, { signal });

    const btnLike = document.querySelector('.btn-like');
    if (btnLike) btnLike.addEventListener('click', toggleLike, { signal });

    // Call the function initially to highlight any active track
    resaltarCancionActivaPorId();
}

function resaltarCancionActivaPorId() {
    const activeId = window.SoundlyPlayer?.getCancionActualId?.();
    const allItems = document.querySelectorAll('.playlist-item');
    
    allItems.forEach(item => {
        const itemId = item.dataset.id;
        
        if (activeId && itemId == activeId) {
            item.classList.add('active-track');
        } else {
            item.classList.remove('active-track');
        }
    });
}

// ── AUTO-INIT: acceso directo a player.html / favoritos.html ──────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const ruta = window.location.pathname;
    if (document.getElementById('content')) return;

    if (ruta.includes('favoritos.html')) {
        await _initVista('favoritos');
    } else if (ruta.includes('player.html')) {
        await _initVista('player');
    }
});

// ── LÓGICA DE FAVORITOS ────────────────────────────────────────────────────────

async function toggleLike(event) {
    const btn = event.currentTarget;
    const cancionId = btn.getAttribute('data-id');
    const usuario = GestorUsuarios.obtenerActivo() || (typeof currentUser !== 'undefined' ? currentUser : null);

    if (!cancionId) { console.warn('No hay ninguna canción seleccionada.'); return; }
    if (!usuario || !usuario.id) { console.warn('Debes iniciar sesión para agregar a favoritos.'); return; }

    try {
        const response = await fetch(`${window.SoundlyConfig.API_BASE_URL}/canciones/${cancionId}/favorito/usuario/${usuario.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            const icon = btn.querySelector('i');
            if (icon) {
                const isFas = icon.classList.contains('fas');
                icon.className = isFas ? 'far fa-heart' : 'fas fa-heart';
                icon.style.color = isFas ? '' : '#1DB954';
            }
        } else {
            console.warn('No se pudo actualizar el estado de favorito.');
        }
    } catch (error) {
        console.error('[Player] Error de red al dar Me Gusta:', error);
    }
}

// ─── CARGA DE VISTAS ──────────────────────────────────────────────────────────

async function cargarVistaPlayer() {
    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    const canciones = await GestorCanciones.obtenerTodas();
    const idxActual = window.SoundlyPlayer?.getEstado?.()?.idx ?? -1;

    Vista.renderizarListaCanciones(
        canciones,
        'playlist-list',
        idxActual,
        (cancion, idx) => window.SoundlyEvents.reproducirLista(canciones, idx)
    );

    calcularEstadisticasPlaylist(canciones);
    
    // Cargar metadata si hay parametro id en URL
    const urlParams = new URLSearchParams(window.location.search);
    const cancionIdUrl = urlParams.get('id');
    
    if (cancionIdUrl) {
        let cancionObj = window.cancionActual;
        if (!cancionObj || String(cancionObj.id) !== String(cancionIdUrl)) {
            cancionObj = canciones.find(c => String(c.id) === String(cancionIdUrl));
        }
        
        if (cancionObj) {
            window.cancionActual = cancionObj;
            const npArt = $('album-cover');
            const npTitle = $('song-title');
            const npArtist = $('artist-name');
            const genreBadge = $('genre-badge');
            
            if (npArt) npArt.src = cancionObj.img;
            if (npTitle) npTitle.textContent = cancionObj.titulo;
            if (npArtist) npArtist.textContent = cancionObj.artista;
            if (genreBadge) genreBadge.textContent = cancionObj.genero || 'S/G';
            
            const btnLike = $('btn-like');
            if (btnLike) btnLike.setAttribute('data-id', cancionObj.id);
            
            const usuario = GestorUsuarios.obtenerActivo();
            if (usuario) {
                try {
                    const favs = await GestorCanciones.obtenerFavoritos(usuario.id);
                    const esFav = favs.some(f => String(f.id) === String(cancionObj.id));
                    const icon = $('heart-icon');
                    if (icon) {
                        icon.className = esFav ? 'fas fa-heart' : 'far fa-heart';
                        icon.style.color = esFav ? '#1DB954' : '';
                    }
                } catch(e) {}
            }
        }
    }
}

async function cargarVistaFavoritos(usuario) {
    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    try {
        const favoritos = await GestorCanciones.obtenerFavoritos(usuario.id);
        if ($('playlist-name')) $('playlist-name').textContent = 'Canciones Favoritas';

        Vista.renderizarTarjetasFavoritas(
            favoritos,
            'playlist-list',
            (cancion, idx) => {
                window.SoundlyPlayer.reproducirLista(favoritos, idx);
            },
            async (e) => {
                const cancionId = e.currentTarget.getAttribute('data-id');
                if (!cancionId || !usuario) return;
                await GestorCanciones.toggleFavorito(cancionId, usuario.id);
                await cargarVistaFavoritos(usuario);
            }
        );

        calcularEstadisticasPlaylist(favoritos);
    } catch (error) {
        console.error('[Player] Error al cargar favoritos:', error);
        if (contenedor) contenedor.innerHTML = '<div class="empty-state"><p>Error al cargar favoritos.</p></div>';
    }
}

async function cargarVistaPlaylist(idPlaylist, usuario) {
    if (!idPlaylist) {
        await cargarListaPlaylists(usuario);
        return;
    }

    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    try {
        const playlist = await GestorPlaylists.obtenerDetalle(idPlaylist);
        if (!playlist) throw new Error('Playlist no encontrada');

        const nombreEl = $('playlist-name');
        if (nombreEl) {
            nombreEl.textContent = playlist.nombre;
            nombreEl.contentEditable = 'true';
            nombreEl.addEventListener('blur', async () => {
                const nuevoNombre = nombreEl.textContent.trim();
                if (nuevoNombre && nuevoNombre !== playlist.nombre) {
                    await GestorPlaylists.actualizar(idPlaylist, { nombre: nuevoNombre });
                }
            });
        }

        Vista.renderizarListaCanciones(
            playlist.canciones,
            'playlist-list',
            -1,
            (cancion, idx) => window.SoundlyEvents.reproducirLista(playlist.canciones, idx)
        );

        calcularEstadisticasPlaylist(playlist.canciones);

        document.querySelector('.btn-add-circle')?.addEventListener('click', () => {
            mostrarModalAgregarCancion(idPlaylist, playlist.canciones);
        });

    } catch (error) {
        console.error('[Player] Error al cargar playlist:', error);
        if (contenedor) contenedor.innerHTML = '<div class="empty-state"><p>Error al cargar la playlist.</p></div>';
    }
}

async function cargarListaPlaylists(usuario) {
    try {
        const playlists = await GestorPlaylists.listarPorUsuario(usuario.id);
        Vista.renderizarPlaylists(playlists, 'playlist-list', (p) => {
            if (typeof window.navegarA === 'function') {
                window.navegarA(`playlist.html?id=${p.id}`);
            } else {
                window.location.href = `playlist.html?id=${p.id}`;
            }
        });
    } catch (e) {
        console.error('[Player] Error al cargar playlists:', e);
    }
}

// ─── FUNCIONES AUXILIARES ─────────────────────────────────────────────────────

function resaltarCancionActiva(idxActivo) {
    document.querySelectorAll('.playlist-item').forEach((el, j) => {
        el.classList.toggle('active', j === idxActivo);
    });
}

function calcularEstadisticasPlaylist(canciones) {
    const totalSeg = canciones.reduce((acc, c) => acc + (c.duracion || 0), 0);
    const totalMin = Math.floor(totalSeg / 60);
    const elCantidad = $('stat-canciones') || $('playlist-song-count');
    const elDuracion = $('stat-duracion')  || $('playlist-duration');
    if (elCantidad) elCantidad.textContent = `${canciones.length} canciones`;
    if (elDuracion) elDuracion.textContent = `${totalMin} min`;
}

function sincronizarEstadisticas() {
    const cancionActual = window.SoundlyPlayer?.getCancionActual?.();
    if (!cancionActual) return;
    const genreBadge = $('genre-badge');
    if (genreBadge) genreBadge.textContent = cancionActual.genero || '';
}

async function mostrarModalAgregarCancion(playlistId) {
    const todasLasCanciones = await GestorCanciones.obtenerTodas();
    const nombre = prompt(
        `¿Qué canción querés agregar?\n\n${todasLasCanciones.slice(0, 10).map((c, i) => `${i+1}. ${c.titulo} — ${c.artista}`).join('\n')}\n\nEscribí el número:`
    );
    const num = parseInt(nombre, 10);
    if (!isNaN(num) && todasLasCanciones[num - 1]) {
        const cancion = todasLasCanciones[num - 1];
        try {
            await GestorPlaylists.agregarCancion(playlistId, cancion.id);
            alert(`✓ "${cancion.titulo}" agregada a la playlist.`);
            await cargarVistaPlaylist(playlistId, GestorUsuarios.obtenerActivo());
        } catch (e) {
            alert('No se pudo agregar la canción. Intentá de nuevo.');
        }
    }
}

function inicializarModalCrearPlaylistPlayer(usuario, signal) {
    const modal       = $('modal-crear-playlist');
    const btnCrear    = document.querySelector('.btn-sidebar-create');
    const btnGuardar  = $('btn-guardar');
    const btnCancelar = $('btn-cancelar');
    if (!modal) return;

    const cerrarModal = () => {
        modal.style.display = 'none';
        const input = $('input-nombre-playlist');
        if (input) input.value = '';
    };

    btnCrear   ?.addEventListener('click', () => { modal.style.display = 'flex'; }, { signal });
    btnCancelar?.addEventListener('click', cerrarModal, { signal });
    modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); }, { signal });

    btnGuardar?.addEventListener('click', async () => {
        const nombre = $('input-nombre-playlist')?.value.trim();
        const errorDiv = $('modal-error-message');
        if (!nombre) {
            if (errorDiv) { errorDiv.textContent = 'Por favor, escribí un nombre.'; errorDiv.style.display = 'block'; }
            return;
        }
        if (errorDiv) errorDiv.style.display = 'none';
        try {
            const nueva = await GestorPlaylists.crear(nombre, usuario.id);
            cerrarModal();
            if (nueva?.id) {
                const url = `playlist.html?id=${nueva.id}`;
                if (typeof window.navegarA === 'function') window.navegarA(url);
                else window.location.href = url;
            }
        } catch (e) {
            if (errorDiv) { errorDiv.textContent = 'No se pudo crear. Intentá de nuevo.'; errorDiv.style.display = 'block'; }
        }
    }, { signal });
}

// ── COMPATIBILIDAD: funciones globales del HTML inline ────────────────────────
function togglePlay()  { window.SoundlyEvents?.togglePlay(); }
function nextSong()    { window.SoundlyEvents?.siguiente(); }
function prevSong()    { window.SoundlyEvents?.anterior(); }
function seekTo(e)     { window.dispatchEvent(new CustomEvent('soundly:seek', { detail: { event: e } })); }
function toggleMute()  {
    const audio = window.SoundlyPlayer?.getAudio();
    if (!audio) return;
    audio.muted = !audio.muted;
    const volBtn = $('vol-btn');
    if (volBtn) volBtn.textContent = audio.muted ? '🔇' : '🔊';
}
function setVol(v) { window.SoundlyEvents?.setVolumen(v); }


