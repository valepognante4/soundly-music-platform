/**
 * controlador-busqueda.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTROLADOR DE BÚSQUEDA (MVC)
 *
 * Utiliza GestorCanciones.buscar() del modelo con debounce de 350ms.
 * Los resultados se delegan completamente a Vista.renderizarResultadosBusqueda().
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ControladorBusqueda = {
    state: {
        query:         '',
        debounceTimer: null,
        initialized:   false,  // guarda contra doble init
        generoActivo:  null,   // { id: number|null, nombre: string|null }
    },

    init() {
        // Evitar registrar múltiples listeners si la sección es visitada más de una vez
        if (this.state.initialized) {
            // Solo re-enfocar el input, no re-bind de eventos
            const input = document.getElementById('search-input');
            if (input) input.focus();
            return;
        }
        this.state.initialized = true;

        const input      = document.getElementById('search-input');
        const clearBtn   = document.getElementById('search-clear-btn');
        const categorias = document.getElementById('categories-section');
        const resultados = document.getElementById('search-results');

        if (!input) return;

        input.addEventListener('input', (e) => {
            const valor = e.target.value.trim();
            ControladorBusqueda.state.query = valor;

            clearTimeout(ControladorBusqueda.state.debounceTimer);

            // Mostrar / ocultar botón limpiar
            if (clearBtn) clearBtn.style.display = valor ? 'block' : 'none';

            if (!valor) {
                // Sin texto: si hay género activo, mostrar resultados de género
                if (ControladorBusqueda.state.generoActivo?.id) {
                    if (resultados) resultados.hidden = false;
                    if (categorias) categorias.hidden = true;
                } else {
                    // Sin texto ni género → volvemos a mostrar categorías
                    if (resultados) { resultados.innerHTML = ''; resultados.hidden = true; }
                    if (categorias) categorias.hidden = false;
                }
                return;
            }

            // Hay texto → ocultamos categorías y mostramos contenedor de resultados
            if (categorias) categorias.hidden = true;
            if (resultados) resultados.hidden = false;

            ControladorBusqueda.state.debounceTimer = setTimeout(() => {
                ControladorBusqueda.realizarBusqueda(valor);
            }, 350);
        });

        // Botón limpiar
        clearBtn?.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            ControladorBusqueda.state.query = '';
            // Si hay género activo, mantener sus resultados; si no, mostrar categorías
            if (ControladorBusqueda.state.generoActivo?.id) {
                ControladorBusqueda.filtrarPorGenero(
                    ControladorBusqueda.state.generoActivo.id,
                    ControladorBusqueda.state.generoActivo.nombre
                );
            } else {
                if (resultados) { resultados.innerHTML = ''; resultados.hidden = true; }
                if (categorias) categorias.hidden = false;
            }
            input.focus();
        });

        // Búsqueda al presionar Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(ControladorBusqueda.state.debounceTimer);
                ControladorBusqueda.realizarBusqueda(e.target.value.trim());
            }
        });

        // CU-GENERO: Cargar géneros en el selector al inicializar
        ControladorBusqueda.cargarFiltroGeneros();
    },

    /**
     * CU-GENERO: Carga los géneros del backend y puebla el <select id="genre-filter">.
     * Se llama una sola vez al init() y usa Vista.renderizarFiltroGenero().
     */
    async cargarFiltroGeneros() {
        try {
            const generos = await GestorGeneros.obtenerTodos();
            Vista.renderizarFiltroGenero(generos, 'genre-filter', (generoId, nombreGenero) => {
                ControladorBusqueda.state.generoActivo = { id: generoId, nombre: nombreGenero };
                if (generoId) {
                    // Hay género seleccionado: filtrar y mostrar resultados
                    ControladorBusqueda.filtrarPorGenero(generoId, nombreGenero);
                } else {
                    // "Todos los géneros": limpiar resultados de género
                    const resultados = document.getElementById('search-results');
                    const categorias = document.getElementById('categories-section');
                    // Si tampoco hay texto en el input, volver a las categorías
                    if (!ControladorBusqueda.state.query) {
                        if (resultados) { resultados.innerHTML = ''; resultados.hidden = true; }
                        if (categorias) categorias.hidden = false;
                    } else {
                        // Hay texto: relanzar la búsqueda por texto
                        ControladorBusqueda.realizarBusqueda(ControladorBusqueda.state.query);
                    }
                }
            });
        } catch (err) {
            console.warn('[Busqueda] No se pudieron cargar los géneros:', err);
        }
    },

    /**
     * CU-GENERO: Busca y renderiza canciones por género seleccionado.
     * @param {number} generoId    - ID del género
     * @param {string} nombreGenero - Nombre del género (para el encabezado)
     */
    async filtrarPorGenero(generoId, nombreGenero) {
        const contenedor = document.getElementById('search-results');
        const categorias = document.getElementById('categories-section');

        if (categorias) categorias.hidden = true;
        if (contenedor) {
            contenedor.hidden = false;
            contenedor.innerHTML = `
                <div class="search-loading-state">
                    <div class="search-spinner"></div>
                    <p>Cargando canciones de <strong>${nombreGenero || 'este género'}</strong>…</p>
                </div>`;
        }

        try {
            const canciones = await GestorCanciones.buscarPorGenero({ id: generoId });

            if (!canciones || canciones.length === 0) {
                if (contenedor) {
                    contenedor.innerHTML = `
                        <div class="search-empty-state">
                            <div class="search-empty-icon">🎵</div>
                            <p class="empty-title">Sin canciones en este género</p>
                            <p class="empty-sub">Todavía no hay canciones de <strong>${nombreGenero}</strong> en el catálogo.</p>
                        </div>`;
                }
                return;
            }

            // Reutilizar Vista.renderizarResultadosMixtos con canciones solamente
            Vista.renderizarResultadosMixtos({ canciones, artistas: [] }, 'search-results');

            // Personalizar el encabezado para reflejar el género filtrado
            const header = contenedor?.querySelector('.search-results-header h2');
            if (header) {
                header.innerHTML = `Género: <span class="results-count">${nombreGenero} · ${canciones.length} canción${canciones.length !== 1 ? 'es' : ''}</span>`;
            }

        } catch (error) {
            console.error('[Busqueda] Error al filtrar por género:', error);
            if (contenedor) {
                contenedor.innerHTML = `
                    <div class="search-empty-state">
                        <div class="empty-icon">⚠️</div>
                        <p class="empty-title">No se pudo cargar</p>
                        <p class="empty-sub">Revisá tu conexión o intentá de nuevo.</p>
                    </div>`;
            }
        }
    },

    async realizarBusqueda(query) {
        if (!query) return;
        console.log(`[Soundly] Buscando: "${query}"`);

        const contenedor = document.getElementById('search-results');

        // Estado de carga con spinner animado
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="search-loading-state">
                    <div class="search-spinner"></div>
                    <p>Buscando en Soundly</p>
                </div>`;
        }

        try {
            // ── BÚSQUEDA PARALELA: canciones + artistas ───────────────────────
            // Promise.allSettled garantiza que si uno falla, el otro sigue.
            // Canciones: el mismo query se envía en 'titulo' Y 'artista' para
            // que el backend haga OR entre ambos campos automáticamente.
            const [resCanciones, resArtistas] = await Promise.allSettled([
                GestorCanciones.buscar({ titulo: query, artista: query }),
                GestorArtistas.buscar(query),
            ]);

            const canciones = resCanciones.status === 'fulfilled' ? resCanciones.value : [];
            const artistas  = resArtistas.status  === 'fulfilled' ? resArtistas.value  : [];

            if (resCanciones.status === 'rejected') {
                console.error('[Busqueda] Error en búsqueda de canciones:', resCanciones.reason);
            }
            if (resArtistas.status === 'rejected') {
                console.warn('[Busqueda] Error en búsqueda de artistas (no bloqueante):', resArtistas.reason);
            }

            // Delegar el renderizado mixto a Vista
            Vista.renderizarResultadosMixtos({ canciones, artistas }, 'search-results');

        } catch (error) {
            console.error('[Busqueda] Error inesperado:', error);
            if (contenedor) {
                contenedor.innerHTML = `
                    <div class="search-empty-state">
                        <div class="empty-icon">⚠️</div>
                        <p class="empty-title">No se pudo conectar</p>
                        <p class="empty-sub">Revisá tu conexión o intentá de nuevo.</p>
                    </div>`;
            }
        }
    },
};

// ─── EXPONER PARA SPA (navegacion.js) ───────────────────────────────────────
let _busquedaAbortController = null;

window.initBusqueda = function initBusqueda() {
    // Verificar sesión y actualizar nombre de usuario en header
    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }
    Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');

    // Resetear el flag de inicialización para que init() vuelva a bindear
    // los listeners en el nuevo DOM inyectado por el SPA
    ControladorBusqueda.state.initialized = false;
    ControladorBusqueda.init();

    // Modal compartido
    inicializarModalCrearPlaylistGlobal();
};

// ─── AUTO-INIT: Solo acceso directo a busqueda.html ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('busqueda.html')) {
        ControladorBusqueda.init();
        inicializarModalCrearPlaylistGlobal();
    }
});

/**
 * Modal global de crear playlist — disponible en todas las páginas
 * que incluyan el elemento #modal-crear-playlist en el HTML.
 */
function inicializarModalCrearPlaylistGlobal() {
    const modal       = document.getElementById('modal-crear-playlist');
    const btnCrear    = document.querySelector('.btn-sidebar-create');
    const btnGuardar  = document.getElementById('btn-guardar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const usuario     = GestorUsuarios.obtenerActivo();

    if (!modal) return;

    const cerrarModal = () => {
        modal.style.display = 'none';
        const inputNombre = document.getElementById('input-nombre-playlist');
        const inputDesc = document.getElementById('input-desc-playlist');
        if (inputNombre) inputNombre.value = '';
        if (inputDesc) inputDesc.value = '';
    };

    btnCrear?.addEventListener('click', () => { modal.style.display = 'flex'; });
    btnCancelar?.addEventListener('click', cerrarModal);
    modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

    btnGuardar?.addEventListener('click', async () => {
        const inputNombre  = document.getElementById('input-nombre-playlist');
        const inputDesc    = document.getElementById('input-desc-playlist');
        
        const nombre      = inputNombre?.value.trim();
        const descripcion = inputDesc?.value.trim() || '';
        const error       = document.getElementById('modal-error-message');

        if (!nombre) {
            if (error) { error.textContent = 'Por favor, escribí un nombre.'; error.style.display = 'block'; }
            return;
        }
        if (error) error.style.display = 'none';

        try {
            const nueva = await GestorPlaylists.crear(nombre, descripcion, usuario?.id);
            cerrarModal();
            // Refrescar el sidebar dinámicamente sin recargar la página
            refrescarSidebarPlaylists();
            
            // Opcional: Notificar al usuario que se creó correctamente
            // alert('Playlist creada correctamente');
        } catch (e) {
            console.error('[Modal] Error al crear playlist:', e);
            if (error) { error.textContent = 'No se pudo crear. Intentá de nuevo.'; error.style.display = 'block'; }
        }
    });
    
    // Cargar las playlists inicialmente si el contenedor existe
    if (document.getElementById('sidebar-playlists')) {
        refrescarSidebarPlaylists();
    }
}

/**
 * Función para renderizar el listado de playlists en la barra lateral sin recargar
 */
async function refrescarSidebarPlaylists() {
    const usuario = GestorUsuarios.obtenerActivo();
    if (!usuario) return;
    
    const sidebarContainer = document.getElementById('sidebar-playlists');
    if (!sidebarContainer) return;
    
    try {
        const playlists = await GestorPlaylists.listarPorUsuario(usuario.id);
        
        // Usamos la vista para renderizar (reutiliza o crea items en el aside)
        // Redirigir a playlist.html cuando hagan click
        Vista.renderizarPlaylists(playlists, 'sidebar-playlists', (playlist) => {
            const url = `playlist.html?id=${playlist.id}`;
            if (typeof window.navegarA === 'function') window.navegarA(url);
            else window.location.href = url;
        });
    } catch (e) {
        console.error('[Sidebar] Error al cargar playlists:', e);
    }
}
