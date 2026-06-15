/**
 * navegacion.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * SPA navigation — carga secciones sin recargar la página completa.
 *
 * GARANTÍA DE AUDIO: el footer #global-player-bar vive en app.html, FUERA
 * del contenedor #app. Nunca se toca en ningún fetch/inject. El objeto Audio
 * del reproductor global persiste durante toda la sesión sin interrupciones.
 *
 * Flujo:
 *   1. Clic en link interno → preventDefault → navegarA(url)
 *   2. fetch(url) → extraer .main-content → inyectar en #app
 *   3. ejecutarControlador(url) → llama window.initXxx() del controlador
 * ─────────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── Interceptar clics en links internos ────────────────────────────────
    document.body.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href');
        if (!href) return;

        // Pasar links externos, anclajes, target="_blank"
        if (href.startsWith('http') || href.startsWith('#') || a.target === '_blank') return;

        // Páginas que deben navegar fuera del shell SPA (auth)
        const paginasExternas = ['landing.html', 'login.html', 'register.html', 'reset-password.html'];
        if (paginasExternas.some(p => href.includes(p))) return;

        // Páginas que deben recargar completo (tienen su propio layout diferente)
        // playlist.html con ?id= forzar recarga completa para evitar conflictos de estado
        if (href.includes('playlist.html') && href.includes('?id=')) {
            return; // navegación nativa para el detalle de playlist
        }

        e.preventDefault();

        // Evitar recargar la misma sección
        const url = new URL(a.href, window.location.origin);
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        navegarA(a.href);
    });

    // ── Botón atrás/adelante del navegador ────────────────────────────────
    window.addEventListener('popstate', () => {
        cargarSeccion(window.location.href);
    });

    // ── Marcar link activo en sidebar ─────────────────────────────────────
    actualizarSidebarActivo(window.location.href);
});

// ─── NAVEGAR A UNA URL ────────────────────────────────────────────────────────
async function navegarA(url) {
    history.pushState(null, '', url);
    await cargarSeccion(url);
}

// ─── CARGAR SECCIÓN SIN RECARGAR PÁGINA ──────────────────────────────────────
async function cargarSeccion(url) {
    const appContainer = document.querySelector('#app');
    if (!appContainer) {
        console.error('[Navegacion] No se encontró #app');
        window.location.href = url;
        return;
    }

    // Indicador visual de transición (no afecta al reproductor)
    appContainer.style.opacity = '0.4';
    appContainer.style.transition = 'opacity 0.15s ease';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const doc  = new DOMParser().parseFromString(html, 'text/html');

        const nuevoContenido = doc.querySelector('.main-content');
        if (!nuevoContenido) throw new Error('No se encontró .main-content');

        // Inyectar solo el contenido interno (el footer #global-player-bar queda intacto)
        appContainer.innerHTML = nuevoContenido.innerHTML;

        // Restaurar opacidad con fade-in suave
        requestAnimationFrame(() => {
            appContainer.style.opacity = '1';
        });

        // Actualizar título de la pestaña
        if (doc.title) document.title = doc.title;

        // Marcar link activo en sidebar
        actualizarSidebarActivo(url);

        // Inicializar el controlador JS correspondiente
        ejecutarControlador(url);

    } catch (error) {
        console.error('[Navegacion] Error al cargar sección:', error);
        // Fallback: recarga dura si algo falla (el reproductor guardó estado en beforeunload)
        window.location.href = url;
    }
}

// ─── ACTUALIZAR LINK ACTIVO EN SIDEBAR ───────────────────────────────────────
function actualizarSidebarActivo(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname;
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
            const linkHref = link.getAttribute('href');
            if (linkHref && pathname.endsWith(linkHref)) {
                link.classList.add('active');
            }
        });
    } catch (e) {
        console.warn('[Navegacion] actualizarSidebarActivo error:', e);
    }
}

// ─── DESPACHAR CONTROLADOR DE LA SECCIÓN ─────────────────────────────────────
// Llama a la función window.initXxx() expuesta por cada controlador.
// Estas funciones son idempotentes — se pueden llamar múltiples veces de forma segura.
function ejecutarControlador(url) {
    try {
        const pathname = new URL(url, window.location.origin).pathname;

        if (pathname.endsWith('home.html') || pathname.endsWith('app.html') || pathname.endsWith('/')) {
            if (typeof window.initHome === 'function') window.initHome();
            else console.warn('[Navegacion] window.initHome no está definido aún.');

        } else if (pathname.endsWith('busqueda.html')) {
            if (typeof window.initBusqueda === 'function') window.initBusqueda();
            else console.warn('[Navegacion] window.initBusqueda no está definido aún.');

        } else if (pathname.endsWith('favoritos.html')) {
            if (typeof window.initFavoritos === 'function') window.initFavoritos();
            else console.warn('[Navegacion] window.initFavoritos no está definido aún.');

        } else if (pathname.endsWith('playlist.html')) {
            if (typeof window.initPlaylist === 'function') window.initPlaylist();
            else console.warn('[Navegacion] window.initPlaylist no está definido aún.');

        } else if (pathname.endsWith('player.html')) {
            if (typeof window.initPlayer === 'function') window.initPlayer();
            else console.warn('[Navegacion] window.initPlayer no está definido aún.');
        }
    } catch (e) {
        console.error('[Navegacion] ejecutarControlador error:', e);
    }
}

// ─── EXPONER API PÚBLICA ──────────────────────────────────────────────────────
window.cargarSeccion         = cargarSeccion;
window.navegarA              = navegarA;
window.actualizarSidebarActivo = actualizarSidebarActivo;
