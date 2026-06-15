/**
 * controlador-playlist.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DEDICADO DE LA PÁGINA PLAYLIST (MVC)
 *
 * Gestiona toda la interacción de playlist.html:
 *   - Carga y renderiza el detalle de una playlist (canciones, info)
 *   - Carga la lista de todas las playlists del usuario (sin ?id)
 *   - Modal glassmorphism para editar el nombre
 *   - Modal glassmorphism para agregar canciones
 *   - Botón de quitar canción individual
 *   - Botón reproducir toda la playlist
 *   - Modal de crear nueva playlist
 *
 * Dependencias (cargadas antes en playlist.html):
 *   config.js → modelo.js → modelo-canciones.js → reproductor-global.js → vista.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── HELPER ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// Estado local de la vista
let _playlistActual = null;  // objeto playlist adaptado actualmente visible
let _todasLasCanciones = []; // caché de todas las canciones (para el modal)

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Verificar sesión activa
    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Mostrar nombre en sidebar
    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');

    // 3. Botón cerrar sesión
    $('btn-logout')?.addEventListener('click', () => GestorUsuarios.cerrarSesion());

    // 4. Obtener el ID de la playlist desde ?id=X
    const idPlaylist = new URLSearchParams(window.location.search).get('id');

    if (idPlaylist) {
        await cargarDetallePlaylst(idPlaylist, usuario);
    } else {
        await cargarListaPlaylists(usuario);
    }

    // 5. Inicializar modal de "Crear Playlist"
    inicializarModalCrearPlaylist(usuario);

    // 6. Escuchar cambio de canción activa para resaltar fila
    window.addEventListener('soundly:cancion-cambio', ({ detail }) => {
        resaltarCancionActiva(detail.idx);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// VISTA: DETALLE DE UNA PLAYLIST
// ═════════════════════════════════════════════════════════════════════════════

async function cargarDetallePlaylst(idPlaylist, usuario) {
    mostrarCargando();

    try {
        const playlist = await GestorPlaylists.obtenerDetalle(idPlaylist);
        if (!playlist) throw new Error('Playlist no encontrada');

        _playlistActual = playlist;

        // Actualizar header del banner
        actualizarBanner(playlist, usuario);

        // Renderizar canciones
        renderizarCancionesDeLaPlaylist(playlist.canciones, idPlaylist);

        // Actualizar estadísticas
        actualizarEstadisticas(playlist.canciones);

        // Botón Play All
        $('btn-play-all')?.addEventListener('click', () => {
            if (playlist.canciones?.length > 0) {
                window.SoundlyPlayer?.reproducirLista(playlist.canciones, 0);
            }
        });

        // Botón lápiz → modal editar nombre
        $('btn-edit-name')?.addEventListener('click', () => {
            abrirModalEditarNombre(idPlaylist, playlist.nombre);
        });

        // Botón + → modal agregar canción
        $('btn-add-circle')?.addEventListener('click', async () => {
            await abrirModalAgregarCancion(idPlaylist, playlist.canciones);
        });

    } catch (error) {
        console.error('[Playlist] Error al cargar playlist:', error);
        mostrarErrorCarga('No se pudo cargar la playlist. Verificá que exista o intentá de nuevo.');
    }
}

function actualizarBanner(playlist, usuario) {
    const nombreEl = $('playlist-name');
    if (nombreEl) nombreEl.textContent = playlist.nombre || 'Mi Playlist';

    const creadorEl = $('nombre-usuario-display');
    if (creadorEl) {
        creadorEl.textContent = playlist.creador || usuario?.apodo || usuario?.nombreUsuario || 'Tú';
    }
}

/**
 * Renderiza la lista de canciones en #playlist-list.
 * Agrega botón de quitar canción individual en hover.
 */
function renderizarCancionesDeLaPlaylist(canciones, playlistId) {
    const contenedor = $('playlist-list');
    if (!contenedor) return;

    if (!canciones || canciones.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <p>Esta playlist está vacía</p>
                <span class="empty-sub">Usá el botón <strong>+</strong> para agregar tus primeras canciones</span>
                <button class="btn-empty-add" id="btn-empty-add">
                    <i class="fas fa-plus"></i> Agregar canciones
                </button>
            </div>`;
        // Conectar botón del empty state
        $('btn-empty-add')?.addEventListener('click', async () => {
            await abrirModalAgregarCancion(playlistId, []);
        });
        return;
    }

    contenedor.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const idxActivo = window.SoundlyPlayer?.getEstado?.()?.idx ?? -1;

    canciones.forEach((c, i) => {
        const item = document.createElement('div');
        item.className = 'playlist-item' + (i === idxActivo ? ' active' : '');
        item.dataset.id = c.id;
        item.dataset.idx = i;

        const estaActivo = i === idxActivo;
        const numHTML = estaActivo
            ? `<span class="playing-anim"><span></span><span></span><span></span></span>`
            : (i + 1);

        const playIconHTML = estaActivo
            ? `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>`;

        item.innerHTML = `
            <div class="pl-num">${numHTML}</div>
            <img class="pl-thumb"
                 src="${c.img}"
                 alt="${escaparHtml(c.titulo)}"
                 onerror="this.src='https://placehold.co/48x48/1a1a2e/a78bfa?text=♪'">
            <div class="pl-info">
                <span class="pl-title">${escaparHtml(c.titulo)}</span>
                <span class="pl-artist">${escaparHtml(c.artista)}</span>
            </div>
            <span class="pl-genre">${escaparHtml(c.genero || '')}</span>
            <span class="pl-dur">${Vista.fmt(c.duracion)}</span>
            <div style="display:flex;align-items:center;gap:4px;">
                <button class="pl-play-btn"
                        id="play-btn-${c.id}"
                        aria-label="Reproducir ${escaparHtml(c.titulo)}"
                        title="Reproducir">
                    ${playIconHTML}
                </button>
                <button class="pl-remove-btn"
                        id="remove-btn-${c.id}"
                        aria-label="Quitar ${escaparHtml(c.titulo)} de la playlist"
                        title="Quitar de la playlist">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;

        // Play al clic en la fila o botón play
        const accionPlay = (e) => {
            if (e.target.closest('.pl-remove-btn')) return; // no propagar
            window.SoundlyPlayer?.reproducirLista(canciones, i);
        };
        item.addEventListener('click', accionPlay);
        item.querySelector('.pl-play-btn').addEventListener('click', e => {
            e.stopPropagation();
            window.SoundlyPlayer?.reproducirLista(canciones, i);
        });

        // Quitar canción
        item.querySelector('.pl-remove-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await quitarCancionDePlaylist(playlistId, c.id, c.titulo);
        });

        fragment.appendChild(item);
    });

    contenedor.appendChild(fragment);
}

/**
 * Actualiza contadores de canciones y duración total.
 */
function actualizarEstadisticas(canciones) {
    const lista = canciones || [];
    const totalSeg = lista.reduce((acc, c) => acc + (c.duracion || 0), 0);
    const totalMin = Math.floor(totalSeg / 60);

    const elCantidad = $('stat-canciones');
    const elDuracion = $('stat-duracion');

    if (elCantidad) elCantidad.textContent = `${lista.length} canción${lista.length !== 1 ? 'es' : ''}`;
    if (elDuracion) elDuracion.textContent = `${totalMin} min`;
}

/**
 * Resalta la fila activa según el índice del reproductor global.
 */
function resaltarCancionActiva(idxActivo) {
    document.querySelectorAll('.playlist-item').forEach((el, j) => {
        el.classList.toggle('active', j === idxActivo);
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// VISTA: LISTA DE TODAS LAS PLAYLISTS
// ═════════════════════════════════════════════════════════════════════════════

async function cargarListaPlaylists(usuario) {
    // Ocultar controles de detalle (solo relevantes cuando hay ?id)
    const actionBar = document.querySelector('.action-buttons');
    if (actionBar) actionBar.style.display = 'none';

    const header = document.querySelector('.playlist-header-row');
    if (header) header.style.display = 'none';

    const bannerTitleContainer = document.querySelector('.playlist-title-container');
    if (bannerTitleContainer) bannerTitleContainer.innerHTML = '<h1 id="playlist-name">Tus Playlists</h1>';

    const creadorEl = $('nombre-usuario-display');
    if (creadorEl) creadorEl.textContent = usuario?.apodo || usuario?.nombreUsuario || '';

    mostrarCargando();

    try {
        const playlists = await GestorPlaylists.listarPorUsuario(usuario.id);
        const contenedor = $('playlist-list');
        if (!contenedor) return;

        if (!playlists || playlists.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Todavía no tenés playlists</p>
                    <span class="empty-sub">Creá tu primera playlist con el botón de la barra lateral</span>
                </div>`;
            return;
        }

        Vista.renderizarPlaylists(playlists, 'playlist-list', (p) => {
            window.location.href = `playlist.html?id=${p.id}`;
        });

    } catch (error) {
        console.error('[Playlist] Error al cargar lista de playlists:', error);
        mostrarErrorCarga('Error al cargar tus playlists.');
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACCIÓN: QUITAR CANCIÓN DE PLAYLIST
// ═════════════════════════════════════════════════════════════════════════════

async function quitarCancionDePlaylist(playlistId, cancionId, titulo) {
    try {
        const playlistActualizada = await GestorPlaylists.quitarCancion(playlistId, cancionId);
        _playlistActual = playlistActualizada;

        // Re-render de la lista sin recargar página
        renderizarCancionesDeLaPlaylist(playlistActualizada.canciones, playlistId);
        actualizarEstadisticas(playlistActualizada.canciones);

        mostrarToast(`"${titulo}" eliminada de la playlist`, 'success');
    } catch (error) {
        console.error('[Playlist] Error al quitar canción:', error);
        mostrarToast('No se pudo quitar la canción. Intentá de nuevo.', 'error');
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR NOMBRE
// ═════════════════════════════════════════════════════════════════════════════

function abrirModalEditarNombre(playlistId, nombreActual) {
    const modal = $('modal-editar-nombre');
    const input = $('input-editar-nombre');
    const btnGuardar = $('btn-guardar-nombre');
    const btnCancelar = $('btn-cancelar-nombre');
    const errorDiv = $('editar-nombre-error');

    if (!modal || !input) return;

    input.value = nombreActual || '';
    if (errorDiv) errorDiv.style.display = 'none';

    modal.classList.add('visible');
    setTimeout(() => input.focus(), 100);

    const cerrar = () => {
        modal.classList.remove('visible');
        if (errorDiv) errorDiv.style.display = 'none';
    };

    const guardar = async () => {
        const nuevoNombre = input.value.trim();
        if (!nuevoNombre) {
            if (errorDiv) { errorDiv.textContent = 'El nombre no puede estar vacío.'; errorDiv.style.display = 'block'; }
            return;
        }
        if (nuevoNombre === nombreActual) { cerrar(); return; }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando…';

        try {
            const playlistActualizada = await GestorPlaylists.actualizar(playlistId, { nombre: nuevoNombre });
            // Actualizar el título en el banner
            const nombreEl = $('playlist-name');
            if (nombreEl) nombreEl.textContent = nuevoNombre;
            _playlistActual = playlistActualizada;
            mostrarToast('Nombre actualizado', 'success');
            cerrar();
        } catch (e) {
            console.error('[Playlist] Error al editar nombre:', e);
            if (errorDiv) { errorDiv.textContent = 'No se pudo guardar. Intentá de nuevo.'; errorDiv.style.display = 'block'; }
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    };

    // Limpiar listeners antiguos (clonar)
    const btnGuardarNuevo = btnGuardar.cloneNode(true);
    btnGuardar.parentNode.replaceChild(btnGuardarNuevo, btnGuardar);
    const btnCancelarNuevo = btnCancelar.cloneNode(true);
    btnCancelar.parentNode.replaceChild(btnCancelarNuevo, btnCancelar);

    $('btn-guardar-nombre').addEventListener('click', guardar);
    $('btn-cancelar-nombre').addEventListener('click', cerrar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cerrar(); });
    modal.addEventListener('click', e => { if (e.target === modal) cerrar(); }, { once: true });
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: AGREGAR CANCIÓN
// ═════════════════════════════════════════════════════════════════════════════

async function abrirModalAgregarCancion(playlistId, cancionesEnPlaylist) {
    const modal = $('modal-agregar-cancion');
    const listEl = $('modal-canciones-list');
    const searchInput = $('modal-buscar-cancion');
    const btnCerrar = $('btn-cerrar-modal-agregar');

    if (!modal || !listEl) return;

    modal.classList.add('visible');

    // Mostrar spinner mientras carga
    listEl.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    // Cargar todas las canciones (con caché)
    if (_todasLasCanciones.length === 0) {
        _todasLasCanciones = await GestorCanciones.obtenerTodas().catch(() => []);
    }

    const idsEnPlaylist = new Set((cancionesEnPlaylist || []).map(c => c.id));

    const renderLista = (filtro = '') => {
        const query = filtro.toLowerCase().trim();
        const filtradas = _todasLasCanciones.filter(c =>
            !filtro ||
            c.titulo.toLowerCase().includes(query) ||
            c.artista.toLowerCase().includes(query)
        );

        listEl.innerHTML = '';

        if (filtradas.length === 0) {
            listEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:0.9rem;">Sin resultados para "${filtro}"</div>`;
            return;
        }

        filtradas.forEach(c => {
            const yaEnPlaylist = idsEnPlaylist.has(c.id);
            const item = document.createElement('div');
            item.className = 'modal-cancion-item' + (yaEnPlaylist ? ' ya-en-playlist' : '');
            item.dataset.id = c.id;
            item.innerHTML = `
                <img src="${c.img}"
                     alt="${escaparHtml(c.titulo)}"
                     onerror="this.src='https://placehold.co/40x40/1a1a2e/a78bfa?text=♪'">
                <div class="modal-cancion-info">
                    <div class="modal-cancion-titulo">${escaparHtml(c.titulo)}</div>
                    <div class="modal-cancion-artista">${escaparHtml(c.artista)}</div>
                </div>
                <span class="modal-cancion-dur">${Vista.fmt(c.duracion)}</span>
                ${yaEnPlaylist ? '<span class="modal-badge-added">Ya agregada</span>' : ''}
            `;

            if (!yaEnPlaylist) {
                item.addEventListener('click', async () => {
                    await agregarCancionDesdModal(playlistId, c, idsEnPlaylist, item);
                });
            }

            listEl.appendChild(item);
        });
    };

    renderLista();

    // Búsqueda en tiempo real
    if (searchInput) {
        searchInput.value = '';
        const nuevoSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(nuevoSearch, searchInput);
        $('modal-buscar-cancion').addEventListener('input', e => renderLista(e.target.value));
        setTimeout(() => $('modal-buscar-cancion')?.focus(), 100);
    }

    const cerrar = () => {
        modal.classList.remove('visible');
    };

    if (btnCerrar) {
        const nuevoBtn = btnCerrar.cloneNode(true);
        btnCerrar.parentNode.replaceChild(nuevoBtn, btnCerrar);
        $('btn-cerrar-modal-agregar').addEventListener('click', cerrar);
    }
    modal.addEventListener('click', e => { if (e.target === modal) cerrar(); }, { once: true });
}

async function agregarCancionDesdModal(playlistId, cancion, idsEnPlaylist, itemEl) {
    itemEl.style.pointerEvents = 'none';
    itemEl.style.opacity = '0.6';

    try {
        const playlistActualizada = await GestorPlaylists.agregarCancion(playlistId, cancion.id);
        _playlistActual = playlistActualizada;

        // Marcar como agregada en el modal
        idsEnPlaylist.add(cancion.id);
        itemEl.classList.add('ya-en-playlist');
        const badgeExistente = itemEl.querySelector('.modal-badge-added');
        if (!badgeExistente) {
            const badge = document.createElement('span');
            badge.className = 'modal-badge-added';
            badge.textContent = 'Ya agregada';
            itemEl.appendChild(badge);
        }

        // Re-render de la lista principal sin cerrar el modal
        renderizarCancionesDeLaPlaylist(playlistActualizada.canciones, playlistId);
        actualizarEstadisticas(playlistActualizada.canciones);

        mostrarToast(`"${cancion.titulo}" agregada`, 'success');
    } catch (error) {
        console.error('[Playlist] Error al agregar canción:', error);
        mostrarToast('No se pudo agregar la canción.', 'error');
        itemEl.style.pointerEvents = '';
        itemEl.style.opacity = '';
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR NUEVA PLAYLIST
// ═════════════════════════════════════════════════════════════════════════════

function inicializarModalCrearPlaylist(usuario) {
    const modal       = $('modal-crear-playlist');
    const btnCrear    = document.querySelector('.btn-sidebar-create');
    const btnGuardar  = $('btn-guardar');
    const btnCancelar = $('btn-cancelar');

    if (!modal) return;

    const cerrar = () => {
        modal.classList.remove('visible');
        const input = $('input-nombre-playlist');
        if (input) input.value = '';
        const errDiv = $('modal-error-message');
        if (errDiv) errDiv.style.display = 'none';
    };

    btnCrear    ?.addEventListener('click', () => modal.classList.add('visible'));
    btnCancelar ?.addEventListener('click', cerrar);
    modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });

    btnGuardar?.addEventListener('click', async () => {
        const nombre = $('input-nombre-playlist')?.value.trim();
        const errorDiv = $('modal-error-message');

        if (!nombre) {
            if (errorDiv) { errorDiv.textContent = 'Por favor, escribí un nombre.'; errorDiv.style.display = 'block'; }
            return;
        }
        if (errorDiv) errorDiv.style.display = 'none';

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Creando…';

        try {
            const nueva = await GestorPlaylists.crear(nombre, '', usuario.id);
            cerrar();
            if (nueva?.id) window.location.href = `playlist.html?id=${nueva.id}`;
        } catch (e) {
            console.error('[Playlist] Error al crear playlist:', e);
            if (errorDiv) { errorDiv.textContent = 'No se pudo crear. Intentá de nuevo.'; errorDiv.style.display = 'block'; }
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar';
        }
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═════════════════════════════════════════════════════════════════════════════

function mostrarCargando() {
    const contenedor = $('playlist-list');
    if (contenedor) {
        contenedor.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    }
}

function mostrarErrorCarga(mensaje) {
    const contenedor = $('playlist-list');
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>${escaparHtml(mensaje)}</p>
            </div>`;
    }
}

/** Toast notification temporal */
let _toastTimer = null;
function mostrarToast(mensaje, tipo = 'success') {
    let toast = document.getElementById('soundly-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'soundly-toast';
        toast.style.cssText = `
            position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
            background: rgba(24,24,40,0.95); border: 1px solid rgba(255,255,255,0.12);
            backdrop-filter: blur(16px); color: #fff; padding: 12px 24px;
            border-radius: 50px; font-size: 0.9rem; font-weight: 600;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 9999;
            transition: opacity 0.3s ease, transform 0.3s ease;
            display: flex; align-items: center; gap: 10px;
            font-family: 'DM Sans', sans-serif;
        `;
        document.body.appendChild(toast);
    }

    const icon = tipo === 'success' ? '✓' : '⚠';
    const color = tipo === 'success' ? '#1db954' : '#ff6b6b';
    toast.innerHTML = `<span style="color:${color};font-size:1.1rem;">${icon}</span> ${escaparHtml(mensaje)}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(8px)';
    }, 3000);
}

/** Escapa caracteres HTML para prevenir XSS */
function escaparHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── COMPATIBILIDAD: funciones globales del reproductor ────────────────────────
function togglePlay()  { window.SoundlyPlayer?.togglePlay(); }
function nextSong()    { window.SoundlyPlayer?.siguiente(); }
function prevSong()    { window.SoundlyPlayer?.anterior(); }
function seekTo(e)     { window.SoundlyPlayer?.seekTo(e); }
function setVol(v)     { window.SoundlyPlayer?.setVolumen(v); }
