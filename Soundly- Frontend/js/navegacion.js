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
 *   2. cargarVista(nombre) → fetch vista.html → inyectar en #content
 *   3. ejecutarControlador() → llama window.initXxx() del controlador
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

    window.addEventListener('popstate', () => {
        const vista = vistaDesdeUrl(window.location.href);
        if (vista) cargarVista(vista);
    });

    if (document.getElementById('content')) {
        const vistaInicial = vistaDesdeUrl(window.location.href) || 'home';
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

    try {
        const response = await fetch(archivo);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

        ejecutarControlador(archivo);

        window.dispatchEvent(new CustomEvent('soundly:vista-cambiada', {
            detail: { vista: nombreVista, url: archivo },
        }));

    } catch (error) {
        console.error('[Navegacion] Error al cargar vista:', error);
        window.location.href = archivo;
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

function aplicarClaseBody(doc) {
    const clasesVista = doc.body.className.trim();
    const clases = new Set(clasesVista.split(/\s+/).filter(Boolean));
    clases.add('home-layout');
    document.body.className = [...clases].join(' ');
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
window.actualizarSidebarActivo = actualizarSidebarActivo;
window.vistaDesdeUrl          = vistaDesdeUrl;
