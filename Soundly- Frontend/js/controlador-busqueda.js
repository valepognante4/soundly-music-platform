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
    },

    init() {
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
                // Sin texto → volvemos a mostrar categorías
                if (resultados) { resultados.innerHTML = ''; resultados.hidden = true; }
                if (categorias) categorias.hidden = false;
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
            if (resultados) { resultados.innerHTML = ''; resultados.hidden = true; }
            if (categorias) categorias.hidden = false;
            input.focus();
        });

        // Búsqueda al presionar Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(ControladorBusqueda.state.debounceTimer);
                ControladorBusqueda.realizarBusqueda(e.target.value.trim());
            }
        });
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
                    <p>Buscando en Soundly y Deezer…</p>
                </div>`;
        }

        try {
            // GestorCanciones.buscar() → GET /api/canciones/buscar?titulo=query
            // El DynamicSourcingService del backend enriquece automáticamente con Deezer
            const resultados = await GestorCanciones.buscar({ titulo: query });
            Vista.renderizarResultadosBusqueda(resultados, 'search-results');
        } catch (error) {
            console.error('[Busqueda] Error:', error);
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

// ─── INICIALIZAR ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ControladorBusqueda.init();

    // Modal de crear playlist (compartido con home)
    inicializarModalCrearPlaylistGlobal();
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
        const input = document.getElementById('input-nombre-playlist');
        if (input) input.value = '';
    };

    btnCrear   ?.addEventListener('click', () => { modal.style.display = 'flex'; });
    btnCancelar?.addEventListener('click', cerrarModal);
    modal      .addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

    btnGuardar?.addEventListener('click', async () => {
        const input  = document.getElementById('input-nombre-playlist');
        const nombre = input?.value.trim();
        const error  = document.getElementById('modal-error-message');

        if (!nombre) {
            if (error) { error.textContent = 'Por favor, escribí un nombre.'; error.style.display = 'block'; }
            return;
        }
        if (error) error.style.display = 'none';

        try {
            const nueva = await GestorPlaylists.crear(nombre, usuario?.id);
            cerrarModal();
            if (nueva?.id) window.location.href = `playlist.html?id=${nueva.id}`;
        } catch (e) {
            console.error('[Modal] Error al crear playlist:', e);
            if (error) { error.textContent = 'No se pudo crear. Intentá de nuevo.'; error.style.display = 'block'; }
        }
    });
}
