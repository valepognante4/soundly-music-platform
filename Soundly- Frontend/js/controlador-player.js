/**
 * controlador-player.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DE LA PÁGINA PLAYER / FAVORITOS / PLAYLIST (MVC)
 *
 * Centraliza la lógica para las vistas que muestran listas de canciones:
 *   - player.html     → lista completa
 *   - favoritos.html  → canciones favoritas del usuario
 *   - playlist.html   → canciones de una playlist específica
 *
 * Toda reproducción se delega a window.SoundlyPlayer (reproductor-global.js).
 * El renderizado se delega a Vista (vista.js).
 * Los datos se obtienen desde GestorCanciones / GestorPlaylists (modelo.js).
 *
 * Dependencias (en el HTML, antes de este script):
 *   config.js → modelo.js → modelo-canciones.js → reproductor-global.js → vista.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── HELPER ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Verificar sesión
    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');
    $('btn-logout')?.addEventListener('click', () => GestorUsuarios.cerrarSesion());

    // 2. Decidir qué vista cargar según la URL
    const ruta = window.location.pathname;

    if (ruta.includes('favoritos.html')) {
        await cargarVistaFavoritos(usuario);
    } else if (ruta.includes('playlist.html')) {
        const idPlaylist = new URLSearchParams(window.location.search).get('id');
        await cargarVistaPlaylist(idPlaylist, usuario);
    } else {
        // player.html: todas las canciones
        await cargarVistaPlayer();
    }

    // 3. Actualizar estadísticas si existen en el HTML
    sincronizarEstadisticas();

    // 4. Inicializar modal de crear playlist
    inicializarModalCrearPlaylistPlayer(usuario);

    // 5. Escuchar cambios de canción para actualizar el resaltado en la lista
    window.addEventListener('soundly:cancion-cambio', ({ detail }) => {
        resaltarCancionActiva(detail.idx);
    });
});

// ─── CARGA DE VISTAS ──────────────────────────────────────────────────────────

async function cargarVistaPlayer() {
    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    const canciones = await GestorCanciones.obtenerTodas();
    const idxActual = window.SoundlyPlayer.getEstado().idx;

    Vista.renderizarListaCanciones(
        canciones,
        'playlist-list',
        idxActual,
        (cancion, idx) => window.SoundlyPlayer.reproducirLista(canciones, idx)
    );

    calcularEstadisticasPlaylist(canciones);

    // Si no hay nada reproduciendo, cargar la primera canción sin autoplay
    if (canciones.length > 0 && !window.SoundlyPlayer.getEstado().playing) {
        // No llamamos .play(), solo dejamos que el usuario inicie
    }
}

async function cargarVistaFavoritos(usuario) {
    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    try {
        const favoritos = await GestorCanciones.obtenerFavoritos(usuario.id);

        if ($('playlist-name')) $('playlist-name').textContent = 'Canciones Favoritas';

        Vista.renderizarListaCanciones(
            favoritos,
            'playlist-list',
            -1,
            (cancion, idx) => window.SoundlyPlayer.reproducirLista(favoritos, idx)
        );

        calcularEstadisticasPlaylist(favoritos);
    } catch (error) {
        console.error('[Player] Error al cargar favoritos:', error);
        if (contenedor) contenedor.innerHTML = '<div class="empty-state"><p>Error al cargar favoritos.</p></div>';
    }
}

async function cargarVistaPlaylist(idPlaylist, usuario) {
    if (!idPlaylist) {
        // Sin ID: mostrar todas las playlists del usuario
        await cargarListaPlaylists(usuario);
        return;
    }

    const contenedor = $('playlist-list');
    if (contenedor) contenedor.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';

    try {
        const playlist = await GestorPlaylists.obtenerDetalle(idPlaylist);
        if (!playlist) throw new Error('Playlist no encontrada');

        // Nombre editable
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
            (cancion, idx) => window.SoundlyPlayer.reproducirLista(playlist.canciones, idx)
        );

        calcularEstadisticasPlaylist(playlist.canciones);

        // Botón agregar canción
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
            window.location.href = `playlist.html?id=${p.id}`;
        });
    } catch (e) {
        console.error('[Player] Error al cargar playlists:', e);
    }
}

// ─── FUNCIONES AUXILIARES ─────────────────────────────────────────────────────

/**
 * Resalta la fila de la canción actualmente en reproducción.
 */
function resaltarCancionActiva(idxActivo) {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((el, j) => el.classList.toggle('active', j === idxActivo));
}

/**
 * Calcula y muestra estadísticas de la lista (total tiempo, cantidad).
 */
function calcularEstadisticasPlaylist(canciones) {
    const totalSeg = canciones.reduce((acc, c) => acc + (c.duracion || 0), 0);
    const totalMin = Math.floor(totalSeg / 60);

    const elCantidad = $('stat-canciones') || $('playlist-song-count');
    const elDuracion = $('stat-duracion')  || $('playlist-duration');

    if (elCantidad) elCantidad.textContent = `${canciones.length} canciones`;
    if (elDuracion) elDuracion.textContent = `${totalMin} min`;
}

/**
 * Sincroniza los elementos de estadísticas con el estado del reproductor.
 */
function sincronizarEstadisticas() {
    const cancionActual = window.SoundlyPlayer.getCancionActual();
    if (!cancionActual) return;

    // Si la página de player tiene info de "ahora reproduciendo" extra, actualizarla aquí
    const genreBadge = $('genre-badge');
    if (genreBadge) genreBadge.textContent = cancionActual.genero || '';
}

/**
 * Modal para agregar canciones a una playlist existente.
 */
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
            console.error('[Player] Error al agregar canción:', e);
            alert('No se pudo agregar la canción. Intentá de nuevo.');
        }
    }
}

/**
 * Modal de crear playlist (reutilizable en esta página también).
 */
function inicializarModalCrearPlaylistPlayer(usuario) {
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

    btnCrear   ?.addEventListener('click', () => { modal.style.display = 'flex'; });
    btnCancelar?.addEventListener('click', cerrarModal);
    modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

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
            if (nueva?.id) window.location.href = `playlist.html?id=${nueva.id}`;
        } catch (e) {
            console.error('[Player] Error al crear playlist:', e);
            if (errorDiv) { errorDiv.textContent = 'No se pudo crear. Intentá de nuevo.'; errorDiv.style.display = 'block'; }
        }
    });
}

// ── COMPATIBILIDAD: funciones globales que usa el HTML inline ─────────────────
function togglePlay()  { window.SoundlyPlayer?.togglePlay(); }
function nextSong()    { window.SoundlyPlayer?.siguiente(); }
function prevSong()    { window.SoundlyPlayer?.anterior(); }
function seekTo(e)     { window.SoundlyPlayer?.seekTo(e); }
function toggleMute()  {
    const audio = window.SoundlyPlayer?.getAudio();
    if (!audio) return;
    audio.muted = !audio.muted;
    $('vol-btn').textContent = audio.muted ? '🔇' : '🔊';
}
function setVol(v) { window.SoundlyPlayer?.setVolumen(v); }
