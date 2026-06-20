/**
 * navegacion.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * SPA navigation — carga vistas sin recargar la página completa.
 *
 * GARANTÍA DE AUDIO: el footer #global-player-bar vive en index.html (shell),
 * FUERA del contenedor #content. El objeto Audio singleton en
 * reproductor-global.js persiste durante toda la sesión.
 *
 * Flujo:
 *   1. Clic en link interno → preventDefault → navegarA(url)
 *   2. cargarVista(nombre) → fetch vista.html (cache:no-store) → inyectar en #content
 *   3. ejecutarControlador() → llama window.initXxx() del controlador
 *
 * ── DEBUGGER SPA ──────────────────────────────────────────────────────────────
 * Activa logs detallados con:  localStorage.setItem('soundly_debug', '1')
 * Desactiva con:               localStorage.removeItem('soundly_debug')
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── DEBUGGER SPA ─────────────────────────────────────────────────────────────
const _NAV_DEBUG = localStorage.getItem('soundly_debug') === '1';
function _navLog(...args) {
    if (!_NAV_DEBUG) return;
    const ts = new Date().toISOString().slice(11, 23);
    console.groupCollapsed(`%c[Navegacion ${ts}]`, 'color:#a78bfa;font-weight:bold', ...args);
    console.log('📍 URL actual:       ', window.location.href);
    console.log('📄 Archivo HTML real:', document.location.pathname);
    console.log('🧠 Vista activa:     ', _vistaActual ?? '(ninguna)');
    console.log('🎵 Audio singleton:  ', window.__soundlyAudioInstance ?? '(no inicializado)');
    console.log('🔗 History state:    ', history.state);
    console.groupEnd();
}

const ARCHIVO_VISTA = {
    home:      'home.html',
    busqueda:  'busqueda.html',
    favoritos: 'favoritos.html',
    playlist:  'playlist.html',
    player:    'player.html',
    album:     'album.html',
    artista:   'artista.html',
    'todos-los-albumes': 'todos-los-albumes.html',
    'ver-todos': 'ver-todos.html',
};

/** IDs que ya existen en el shell y no deben duplicarse desde las vistas. */
const IDS_SHELL = new Set([
    'content',
    'global-player-bar',
    'full-screen-player',
    'modal-crear-playlist',
    'view-modals',
]);

let _vistaActual = null;

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. MARCAR EL SPA COMO ACTIVO ─────────────────────────────────────────
    // Los archivos de ruta (playlist.html, favoritos.html, etc.) leen este flag
    // para saber si están siendo cargados dentro del SPA (via fetch/DOMParser)
    // o directamente por el navegador (F5, link externo, bookmark).
    // DOMParser NO ejecuta scripts, así que el flag solo existe cuando index.html
    // fue el punto de entrada real.
    try { sessionStorage.setItem('soundly_spa_active', '1'); } catch (e) {}

    // ── 2. DELEGACIÓN DE CLICS ────────────────────────────────────────────────
    document.body.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href');
        if (!href) return;

        if (href.startsWith('http') || href.startsWith('#') || a.target === '_blank') return;

        const paginasExternas = ['landing.html', 'login.html', 'register.html', 'reset-password.html'];
        if (paginasExternas.some(p => href.includes(p))) return;

        if (!document.getElementById('content')) return;

        e.preventDefault();

        const url = new URL(a.href, window.location.origin);
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        navegarA(a.href);
    });

    // ── 3. BOTÓN ATRÁS / ADELANTE ─────────────────────────────────────────────
    window.addEventListener('popstate', () => {
        const vista = vistaDesdeUrl(window.location.href);
        if (vista) cargarVista(vista);
    });

    if (document.getElementById('content')) {

        // ── 4. RECUPERACIÓN DE F5 EN RUTAS SPA ───────────────────────────────
        // Si el usuario presionó F5 en playlist.html?id=123, busqueda.html, etc.,
        // el "redirect guard" de ese archivo guardó la URL en soundly_redirect
        // y redirigió aquí. Recuperamos esa URL y navegamos a la vista correcta.
        const redirectUrl = sessionStorage.getItem('soundly_redirect');
        if (redirectUrl) {
            sessionStorage.removeItem('soundly_redirect');
            _navLog('🔄 Recuperando vista desde redirect:', redirectUrl);

            const vista = vistaDesdeUrl(redirectUrl);
            const params = (() => {
                try { return new URL(redirectUrl, window.location.origin).search; } catch (e) { return ''; }
            })();

            if (vista) {
                const archivo = archivoDesdeVista(vista);
                // Restaurar URL con query params (ej: playlist.html?id=123)
                history.replaceState(null, '', archivo + params);
                cargarVista(vista);
                return; // ← salir: no ejecutar la carga normal abajo
            }
        }

        // ── 5. CARGA INICIAL NORMAL ────────────────────────────────────────────
        const vistaInicial = vistaDesdeUrl(window.location.href) || 'home';
        _navLog('🏠 Vista inicial:', vistaInicial);
        cargarVista(vistaInicial);
    }
});

// ─── RESOLVER VISTA DESDE URL ─────────────────────────────────────────────────

function vistaDesdeUrl(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname;

        for (const [nombre, archivo] of Object.entries(ARCHIVO_VISTA)) {
            if (pathname.endsWith(archivo)) return nombre;
        }

        if (pathname.endsWith('index.html') || pathname.endsWith('app.html') ||
            pathname.endsWith('/') || pathname === '') {
            return 'home';
        }
    } catch (e) {
        console.warn('[Navegacion] vistaDesdeUrl error:', e);
    }
    return null;
}

function archivoDesdeVista(nombreVista) {
    if (ARCHIVO_VISTA[nombreVista]) return ARCHIVO_VISTA[nombreVista];
    if (nombreVista.endsWith('.html')) return nombreVista;
    return `${nombreVista}.html`;
}

// ─── NAVEGAR A UNA URL ────────────────────────────────────────────────────────

async function navegarA(url) {
    history.pushState(null, '', url);
    const vista = vistaDesdeUrl(url);
    if (vista) {
        await cargarVista(vista);
        actualizarSidebarActivo(url);
        actualizarBottomNavActivo(url);
    }
}

// ─── CARGAR VISTA (API PRINCIPAL) ─────────────────────────────────────────────

async function cargarVista(nombreVista) {
    const contentEl = document.getElementById('content');
    if (!contentEl) {
        console.error('[Navegacion] No se encontró #content');
        window.location.href = archivoDesdeVista(nombreVista);
        return;
    }

    const archivo = archivoDesdeVista(nombreVista);

    contentEl.style.opacity = '0.4';
    contentEl.style.transition = 'opacity 0.15s ease';

    _navLog(`cargarVista('${nombreVista}') → archivo: '${archivo}'`);

    try {
        // cache: 'no-store' evita que la HTTP Cache de fetch devuelva versiones
        // obsoletas (el problema de "Ghost File"). El timestamp es una capa extra.
        const cacheBust = `?v=${Date.now()}`;
        const response = await fetch(archivo + cacheBust, { cache: 'no-store' });
        _navLog(`fetch OK → status ${response.status}, url: ${response.url}`);
        if (!response.ok) throw new Error(`HTTP ${response.status} al cargar ${archivo}`);

        const html = await response.text();
        const doc  = new DOMParser().parseFromString(html, 'text/html');

        aplicarClaseBody(doc);

        const contenido = extraerContenidoVista(doc, nombreVista);
        if (!contenido) throw new Error(`No se encontró contenido en ${archivo}`);

        contentEl.innerHTML = contenido;

        inyectarModalesVista(doc);

        requestAnimationFrame(() => {
            contentEl.style.opacity = '1';
        });

        if (doc.title) document.title = doc.title;

        _vistaActual = nombreVista;

        const urlRef = Object.entries(ARCHIVO_VISTA).find(([, f]) => f === archivo);
        const urlParaSidebar = urlRef ? archivo : archivo;
        actualizarSidebarActivo(
            new URL(urlParaSidebar, window.location.origin).href
        );
        actualizarBottomNavActivo(
            new URL(urlParaSidebar, window.location.origin).href
        );

        ejecutarControlador(archivo);

        // Reload playlists in sidebar to ensure they're fresh
        if (typeof GestorUsuarios !== 'undefined') {
            const usuario = GestorUsuarios.obtenerActivo();
            if (usuario && typeof window.cargarPlaylistsSidebar === 'function') {
                window.cargarPlaylistsSidebar(usuario.id);
            }
        }

        window.dispatchEvent(new CustomEvent('soundly:vista-cambiada', {
            detail: { vista: nombreVista, url: archivo },
        }));

    } catch (error) {
        console.error('[Navegacion] ❌ Error al cargar vista:', error);

        // ⚠️  NO usar window.location.href aquí: destruiría el reproductor de audio.
        // En su lugar mostramos un mensaje de error inline dentro de #content.
        const contentEl = document.getElementById('content');
        if (contentEl) {
            contentEl.style.opacity = '1';
            contentEl.innerHTML = `
                <div style="
                    display:flex;flex-direction:column;align-items:center;
                    justify-content:center;height:60vh;gap:16px;
                    color:var(--color-text-muted,#9ca3af);font-family:inherit;
                ">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                         width="56" height="56" style="opacity:.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <p style="margin:0;font-size:1.1rem">No se pudo cargar la vista</p>
                    <code style="font-size:.8rem;opacity:.6">${error.message}</code>
                    <button onclick="window.navegarA('home.html')" style="
                        margin-top:8px;padding:10px 24px;border-radius:999px;
                        background:var(--color-primary,#7c3aed);color:#fff;
                        border:none;cursor:pointer;font-size:.95rem;
                    ">← Volver al inicio</button>
                </div>`;
        }
    }
}

// ─── EXTRAER CONTENIDO DE LA VISTA ───────────────────────────────────────────

function extraerContenidoVista(doc, nombreVista) {
    if (nombreVista === 'player') {
        const panel = doc.querySelector('.main-panel');
        if (panel) return panel.innerHTML;
    }

    const main = doc.querySelector('main.main-content') || doc.querySelector('main');
    if (main) return main.innerHTML;

    return null;
}

// Clases de layout que pertenecen al shell y nunca deben eliminarse
const CLASES_SHELL = new Set(['home-layout']);

function aplicarClaseBody(doc) {
    const clasesVista = doc.body.className.trim();
    const clases = new Set(clasesVista.split(/\s+/).filter(Boolean));

    // Siempre preservar clases del shell (sidebar visible, layout base)
    CLASES_SHELL.forEach(c => clases.add(c));

    // Remover clases de layout de la vista anterior para no acumularlas
    const clasesLayout = ['playlist-layout', 'busqueda-layout', 'favoritos-layout',
                          'album-layout', 'artista-layout', 'player-layout',
                          'todos-albumes-layout', 'ver-todos-layout'];
    clasesLayout.forEach(c => {
        if (!clases.has(c)) document.body.classList.remove(c);
    });

    document.body.className = [...clases].join(' ');
    _navLog('aplicarClaseBody →', document.body.className);
}

function inyectarModalesVista(doc) {
    const contenedor = document.getElementById('view-modals');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    doc.body.querySelectorAll('.modal-overlay').forEach(modal => {
        if (!modal.id || IDS_SHELL.has(modal.id)) return;
        contenedor.appendChild(modal.cloneNode(true));
    });
}

// ─── CARGAR SECCIÓN (alias retrocompatible) ──────────────────────────────────

async function cargarSeccion(url) {
    const vista = vistaDesdeUrl(url);
    if (vista) {
        await cargarVista(vista);
    } else {
        window.location.href = url;
    }
}

// ─── ACTUALIZAR LINK ACTIVO EN SIDEBAR ───────────────────────────────────────

function actualizarSidebarActivo(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname;
        const esHome = pathname.endsWith('index.html') || pathname.endsWith('app.html') ||
                       pathname.endsWith('/') || pathname === '';

        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
            const linkHref = link.getAttribute('href');
            if (!linkHref) return;

            if (esHome && linkHref.endsWith('home.html')) {
                link.classList.add('active');
            } else if (linkHref && pathname.endsWith(linkHref.split('?')[0])) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.warn('[Navegacion] actualizarSidebarActivo error:', e);
    }
}

// ─── ACTUALIZAR BOTTOM NAV ACTIVO (MÓVIL) ─────────────────────────────────────

/**
 * Sincroniza la clase 'active' del bottom nav móvil con la vista actual.
 *
 * Mapeo data-view → vistas SPA:
 *   home      → 'home'
 *   busqueda  → 'busqueda'
 *   favoritos → 'favoritos'
 *   playlist  → 'playlist'
 *
 * Vistas sin ítem propio (album, artista, todos-los-albumes, ver-todos, player)
 * dejan todos los ítems sin 'active' para no confundir al usuario.
 *
 * @param {string} url - URL absoluta o relativa de la vista que se cargó.
 */
function actualizarBottomNavActivo(url) {
    try {
        const nav = document.getElementById('mobile-bottom-nav');
        if (!nav) return;

        // Resolver qué vista está activa usando el mapeador ya existente
        const vista = vistaDesdeUrl(url);

        // Vistas que tienen ítem directo en el bottom nav
        const VISTAS_CON_ITEM = new Set(['home', 'busqueda', 'favoritos', 'playlist']);

        const items = nav.querySelectorAll('.mbn-item');
        items.forEach(item => {
            item.classList.remove('active');

            if (!vista || !VISTAS_CON_ITEM.has(vista)) return;

            const dataView = item.getAttribute('data-view');
            if (dataView === vista) {
                item.classList.add('active');
            }
        });

        _navLog('actualizarBottomNavActivo →', vista ?? '(sin ítem en bottom nav)');
    } catch (e) {
        console.warn('[Navegacion] actualizarBottomNavActivo error:', e);
    }
}

// ─── DESPACHAR CONTROLADOR DE LA SECCIÓN ─────────────────────────────────────

function ejecutarControlador(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname;

        if (pathname.endsWith('home.html')) {
            if (typeof window.initHome === 'function') window.initHome();
            else console.warn('[Navegacion] window.initHome no está definido.');

        } else if (pathname.endsWith('busqueda.html')) {
            if (typeof window.initBusqueda === 'function') window.initBusqueda();
            else console.warn('[Navegacion] window.initBusqueda no está definido.');

        } else if (pathname.endsWith('favoritos.html')) {
            if (typeof window.initFavoritos === 'function') window.initFavoritos();
            else console.warn('[Navegacion] window.initFavoritos no está definido.');

        } else if (pathname.endsWith('playlist.html')) {
            if (typeof window.initPlaylist === 'function') window.initPlaylist();
            else console.warn('[Navegacion] window.initPlaylist no está definido.');

        } else if (pathname.endsWith('album.html')) {
            if (typeof window.initAlbum === 'function') window.initAlbum();
            else console.warn('[Navegacion] window.initAlbum no está definido.');

        } else if (pathname.endsWith('artista.html')) {
            if (typeof window.initArtista === 'function') window.initArtista();
            else console.warn('[Navegacion] window.initArtista no está definido.');

        } else if (pathname.endsWith('todos-los-albumes.html')) {
            if (typeof window.initTodosLosAlbumes === 'function') window.initTodosLosAlbumes();
            else console.warn('[Navegacion] window.initTodosLosAlbumes no está definido.');

        } else if (pathname.endsWith('ver-todos.html')) {
            if (typeof window.initVerTodos === 'function') window.initVerTodos();
            else console.warn('[Navegacion] window.initVerTodos no está definido.');

        } else if (pathname.endsWith('player.html')) {
            if (typeof window.initPlayer === 'function') window.initPlayer();
            else console.warn('[Navegacion] window.initPlayer no está definido.');
        }
    } catch (e) {
        console.error('[Navegacion] ejecutarControlador error:', e);
    }
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

window.cargarVista            = cargarVista;
window.cargarSeccion          = cargarSeccion;
window.navegarA               = navegarA;
window.actualizarSidebarActivo  = actualizarSidebarActivo;
window.actualizarBottomNavActivo = actualizarBottomNavActivo;
window.vistaDesdeUrl          = vistaDesdeUrl;

// ─── DELEGACIÓN DE EVENTOS GLOBAL: TUS ME GUSTA (PLAY PRIMERA CANCIÓN ─────────────
let _listenerMeGustaInicializado = false;

async function reproducirPrimeraFavorita() {
    try {
        const usuario = GestorUsuarios.obtenerActivo();
        if (!usuario) {
            console.warn('[Me Gusta] No hay usuario logueado');
            return;
        }
        
        const favoritos = await GestorCanciones.obtenerFavoritos(usuario.id);
        
        if (!favoritos || favoritos.length === 0) {
            console.log('[Me Gusta] No hay canciones favoritas para reproducir');
            return;
        }
        
        const primeraCancion = favoritos[0];
        console.log('[Me Gusta] Reproduciendo primera canción favorita:', primeraCancion.titulo);
        
        // Reproducir usando el reproductor global
        if (window.SoundlyPlayer && window.SoundlyPlayer.reproducirLista) {
            window.SoundlyPlayer.reproducirLista(favoritos, 0);
        } else if (window.SoundlyEvents) {
            window.SoundlyEvents.reproducirLista(favoritos, 0);
        } else {
            window.dispatchEvent(new CustomEvent('soundly:reproducir-lista', {
                detail: { lista: favoritos, indice: 0 }
            }));
        }
        
    } catch (error) {
        console.error('[Me Gusta] Error al reproducir primera favorita:', error);
    }
}

function inicializarListenerMeGusta() {
    if (_listenerMeGustaInicializado) return;
    _listenerMeGustaInicializado = true;
    
    document.body.addEventListener('click', async (e) => {
        const botonMeGusta = e.target.closest('a[href="favoritos.html"]');
        if (!botonMeGusta) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[Me Gusta] Click en botón Tus Me Gusta');
        
        // Navegar primero a la vista de favoritos
        await navegarA('favoritos.html');
        
        // Y reproducir la primera canción
        await reproducirPrimeraFavorita();
    });
}

// Inicializar el listener inmediatamente
inicializarListenerMeGusta();

// ─── DELEGACIÓN DE EVENTOS GLOBAL: ELIMINAR PLAYLIST ─────────────────────────
let _listenerEliminarPlaylistInicializado = false;
let _playlistAEliminar = null;
let _cardPlaylistAEliminar = null;

function abrirModalConfirmarEliminar(playlistId, cardElement) {
    _playlistAEliminar = playlistId;
    _cardPlaylistAEliminar = cardElement;
    
    const modal = document.getElementById('modal-confirmar-eliminar');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function cerrarModalConfirmarEliminar() {
    const modal = document.getElementById('modal-confirmar-eliminar');
    if (modal) {
        modal.style.display = 'none';
    }
    _playlistAEliminar = null;
    _cardPlaylistAEliminar = null;
}

async function confirmarEliminarPlaylist() {
    if (!_playlistAEliminar) return;
    
    try {
        await GestorPlaylists.eliminar(_playlistAEliminar);
        
        // Eliminar el nodo del DOM sin recargar la página
        if (_cardPlaylistAEliminar && _cardPlaylistAEliminar.parentNode) {
            _cardPlaylistAEliminar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            _cardPlaylistAEliminar.style.opacity = '0';
            _cardPlaylistAEliminar.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                _cardPlaylistAEliminar.remove();
                
                // Si la vista es playlist.html, actualizar la lista de playlists en el sidebar
                const usuario = GestorUsuarios.obtenerActivo();
                if (usuario && typeof window.cargarPlaylistsSidebar === 'function') {
                    window.cargarPlaylistsSidebar(usuario.id);
                }
            }, 300);
        }
        
        console.log(`[Eliminar Playlist] Playlist ${_playlistAEliminar} eliminada exitosamente`);
    } catch (error) {
        console.error('[Eliminar Playlist] Error al eliminar:', error);
        alert('Ocurrió un error al eliminar la playlist.');
    } finally {
        cerrarModalConfirmarEliminar();
    }
}

function inicializarListenerEliminarPlaylist() {
    if (_listenerEliminarPlaylistInicializado) return;
    _listenerEliminarPlaylistInicializado = true;
    
    document.body.addEventListener('click', async (e) => {
        const botonEliminar = e.target.closest('.btn-delete-playlist');
        if (!botonEliminar) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        const playlistId = botonEliminar.getAttribute('data-id');
        if (!playlistId) {
            console.warn('[Eliminar Playlist] No se encontró el data-id del botón');
            return;
        }
        
        // Encontrar la tarjeta de playlist para eliminarla visualmente
        const cardPlaylist = botonEliminar.closest('.playlist-card');
        
        abrirModalConfirmarEliminar(playlistId, cardPlaylist);
    });
    
    // Listener para el botón de cancelar del modal
    const btnCancelar = document.getElementById('btn-modal-cancelar-eliminar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cerrarModalConfirmarEliminar);
    }
    
    // Listener para el botón de confirmar del modal
    const btnConfirmar = document.getElementById('btn-modal-confirmar-eliminar');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', confirmarEliminarPlaylist);
    }
    
    // Cerrar modal al hacer click en el overlay
    const modalOverlay = document.getElementById('modal-confirmar-eliminar');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                cerrarModalConfirmarEliminar();
            }
        });
    }
    
    // Cerrar modal al presionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModalConfirmarEliminar();
        }
    });
}

// Inicializar el listener inmediatamente
inicializarListenerEliminarPlaylist();
