/**
 * modelo.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CAPA DE MODELO (MVC)
 *
 * Responsabilidades:
 *   - Comunicación HTTP con el backend Spring Boot
 *   - Adaptación de DTOs del backend a objetos internos consistentes
 *   - Gestión de usuarios, canciones, artistas y playlists
 *
 * Campos internos normalizados (independiente del backend):
 *   cancion.id        ← CancionDTO.id
 *   cancion.titulo    ← CancionDTO.titulo
 *   cancion.artista   ← CancionDTO.nombreArtista
 *   cancion.img       ← CancionDTO.imagenUrl
 *   cancion.src       ← CancionDTO.archivoUrl
 *   cancion.duracion  ← CancionDTO.duracion
 *   cancion.genero    ← (si el backend lo agrega)
 *
 *   artista.id        ← ArtistaDTO.id
 *   artista.nombre    ← ArtistaDTO.nombre
 *   artista.foto      ← ArtistaDTO.fotoUrl
 *   artista.bio       ← ArtistaDTO.biografia
 *   artista.genero    ← ArtistaDTO.genero
 *   artista.canciones ← ArtistaDTO.titulosCanciones
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── UTILIDADES BASE ─────────────────────────────────────────────────────────

const API = window.SoundlyConfig.API_BASE_URL;

/**
 * Wrapper genérico para fetch con manejo de errores centralizado.
 * @param {string} endpoint  - Ruta relativa (e.g. '/canciones')
 * @param {object} opciones  - Opciones de fetch (method, body, headers...)
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, opciones = {}) {
    const url = `${API}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...opciones,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }
    
    console.log(`[API Fetch] Enviando petición a: ${url}`, config);
    
    try {
        const response = await fetch(url, config);
        console.log(`[API Fetch] Respuesta de ${url}: Status ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => `HTTP ${response.status}`);
            console.error(`[API Fetch] Error ${response.status} en ${url}:`, errorText);
            throw new Error(`[API] ${response.status} ${response.statusText} — ${errorText}`);
        }
        // 204 No Content: no hay body que parsear
        if (response.status === 204) return null;
        
        // Si la respuesta es JSON, la parsea. Si es texto plano (como los endpoints de auth), devuelve texto.
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const jsonData = await response.json();
            console.log(`[API Fetch] JSON recibido de ${url}:`, jsonData);
            return jsonData;
        } else {
            const textData = await response.text();
            console.log(`[API Fetch] Texto recibido de ${url}:`, textData);
            return textData;
        }
    } catch (error) {
        console.error(`[API Fetch] Petición fallida a ${url}:`, error);
        throw error;
    }
}

// ─── ADAPTADORES ─────────────────────────────────────────────────────────────

/**
 * Convierte un CancionDTO del backend al objeto interno cancion.
 * Cualquier controlador usa c.img, c.src, c.artista — nunca .imagenUrl directamente.
 */
function adaptarCancion(dto) {
    if (!dto) return null;
    return {
        id:       dto.id,
        titulo:   dto.titulo              || 'Sin título',
        artista:  dto.nombreArtista       || dto.artista || 'Artista desconocido',
        genero:   dto.genero              || '',
        duracion: dto.duracion            || 0,
        img:      dto.imagenUrl           || dto.img || 'https://placehold.co/300x300/1a1a2e/a78bfa?text=♪',
        src:      dto.archivoUrl          || dto.src || '',
        reproducciones: dto.contadorReproducciones || 0,
    };
}

/**
 * Convierte un ArtistaDTO del backend al objeto interno artista.
 */
function adaptarArtista(dto) {
    if (!dto) return null;
    return {
        id:       dto.id,
        nombre:   dto.nombre    || 'Artista desconocido',
        foto:     dto.fotoUrl   || dto.foto || 'https://placehold.co/300x300/1a1a2e/a78bfa?text=🎤',
        bio:      dto.biografia || '',
        genero:   dto.genero    || '',
        canciones: dto.titulosCanciones || [],
    };
}

/**
 * Convierte un PlaylistDTO del backend al objeto interno playlist.
 */
function adaptarPlaylist(dto) {
    if (!dto) return null;
    return {
        id:          dto.id,
        nombre:      dto.nombre         || 'Mi Playlist',
        descripcion: dto.descripcion    || '',
        creador:     dto.nombreCreador  || '',
        canciones:   (dto.canciones     || []).map(adaptarCancion),
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// GestorUsuarios — Autenticación y sesión
// ═════════════════════════════════════════════════════════════════════════════
const GestorUsuarios = {
    async registrar(usuario) {
        try {
            await apiFetch('/auth/registrar', {
                method: 'POST',
                body: {
                    nombreUsuario:   usuario.apodo,
                    email:           usuario.correo,
                    password:        usuario.clave,
                    fechaNacimiento: usuario.nacimiento,
                },
            });
            return { exito: true };
        } catch (error) {
            if (error.message.includes('409') || error.message.includes('CONFLICT')) {
                const match = error.message.match(/— (.+)$/);
                const detalle = match ? match[1] : null;
                let mensajeError = 'El correo ya está registrado.';
                try {
                    const parsed = JSON.parse(detalle);
                    if (parsed?.mensaje) mensajeError = parsed.mensaje;
                } catch { }
                return { exito: false, motivo: 'duplicado', mensaje: mensajeError };
            }
            return { exito: false, motivo: 'servidor', mensaje: 'Error al conectar con el servidor.' };
        }
    },

    /**
     * Valida las credenciales y guarda el usuario en localStorage. POST /api/auth/login
     * @returns {{ exito: boolean, motivo?: string }}
     */
    async validarLogin(correo, clave) {
        try {
            const usuario = await apiFetch('/auth/login', {
                method: 'POST',
                body: { email: correo, password: clave },
            });
            localStorage.setItem('usuario_activo', JSON.stringify(usuario));
            return { exito: true };
        } catch (error) {
            if (error.message.includes('401')) return { exito: false, motivo: 'credenciales' };
            if (error.message.includes('Failed to fetch')) return { exito: false, motivo: 'red' };
            return { exito: false, motivo: 'servidor' };
        }
    },

    /** Obtiene el usuario del localStorage. Devuelve null si no hay sesión. */
    obtenerActivo() {
        try {
            return JSON.parse(localStorage.getItem('usuario_activo')) || null;
        } catch {
            return null;
        }
    },

    /** Cierra sesión limpiando localStorage. */
    cerrarSesion() {
        localStorage.removeItem('usuario_activo');
        sessionStorage.removeItem('soundly_player_state');
        window.location.href = 'login.html';
    },

    // ─── RECUPERACIÓN DE CONTRASEÑA ───────────────────────────────────────────

    /**
     * Paso 1: Solicita el envío del correo de recuperación.
     * POST /api/auth/recuperar-password
     *
     * El backend SIEMPRE responde 200 (no revela si el email existe),
     * así que solo manejamos errores de red/servidor.
     *
     * @param {string} email
     * @returns {Promise<{ exito: boolean, mensaje: string, motivo?: string }>}
     */
    async solicitarRecuperacion(email) {
        try {
            const mensaje = await apiFetch('/auth/recuperar-password', {
                method: 'POST',
                body: { email },
            });
            return { exito: true, mensaje: typeof mensaje === 'string' ? mensaje : 'Revisá tu bandeja de entrada.' };
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                return { exito: false, motivo: 'red', mensaje: 'No se pudo conectar con el servidor.' };
            }
            return { exito: false, motivo: 'servidor', mensaje: 'Ocurrió un error. Intentá de nuevo.' };
        }
    },

    /**
     * Paso 2: Confirma el cambio de contraseña enviando el token y la nueva clave.
     * POST /api/auth/reset-password
     *
     * @param {string} token         — Extraído del parámetro ?token= de la URL.
     * @param {string} nuevaPassword — Nueva contraseña ingresada por el usuario.
     * @returns {Promise<{ exito: boolean, mensaje: string, motivo?: string }>}
     */
    async resetearPassword(token, nuevaPassword) {
        try {
            const mensaje = await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: { token, nuevaPassword },
            });
            return { exito: true, mensaje: typeof mensaje === 'string' ? mensaje : 'Contraseña actualizada correctamente.' };
        } catch (error) {
            if (error.message.includes('TOKEN_INVALIDO') || error.message.includes('400')) {
                // Extraer el mensaje del backend si está en el JSON
                const match = error.message.match(/— (.+)$/);
                const detalle = match ? match[1] : null;
                let mensajeError = 'El enlace es inválido o ya expiró.';
                try {
                    const parsed = JSON.parse(detalle);
                    if (parsed?.mensaje) mensajeError = parsed.mensaje;
                } catch { /* el detalle no es JSON, usamos el mensaje por defecto */ }
                return { exito: false, motivo: 'token', mensaje: mensajeError };
            }
            if (error.message.includes('Failed to fetch')) {
                return { exito: false, motivo: 'red', mensaje: 'No se pudo conectar con el servidor.' };
            }
            return { exito: false, motivo: 'servidor', mensaje: 'Error inesperado. Intentá de nuevo.' };
        }
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// GestorCanciones — Canciones, favoritos y búsqueda
// ═════════════════════════════════════════════════════════════════════════════
const GestorCanciones = {
    /** Obtiene todas las canciones. GET /api/canciones */
    async obtenerTodas() {
        const data = await apiFetch('/canciones').catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarCancion);
    },

    /** Obtiene una canción por su ID. GET /api/canciones/{id} */
    async obtenerPorId(id) {
        console.log("[GestorCanciones.obtenerPorId] ID solicitado:", id);
        const data = await apiFetch(`/canciones/${id}`).catch(() => null);
        return data ? adaptarCancion(data) : null;
    },

    /** Obtiene canciones recomendadas/destacadas. GET /api/canciones/recomendados */
    async obtenerRecomendadas() {
        const data = await apiFetch('/canciones/recomendados').catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarCancion);
    },

    /**
     * Busca canciones por título, artista o género con debounce natural del llamador.
     * GET /api/canciones/buscar?titulo=X&artista=Y&genero=Z
     * @param {{ titulo?: string, artista?: string, genero?: string }} filtros
     */
    async buscar(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.titulo)  params.set('titulo',  filtros.titulo);
        if (filtros.artista) params.set('artista', filtros.artista);
        if (filtros.genero)  params.set('genero',  filtros.genero);
        const query = params.toString() ? `?${params}` : '';
        const data = await apiFetch(`/canciones/buscar${query}`).catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarCancion);
    },

    /**
     * Obtiene los favoritos de un usuario.
     * BUG FIX: La URL anterior apuntaba a /usuarios/{userId}/favoritos (no existía en el backend).
     * El endpoint correcto en el backend es GET /api/canciones/favoritos/usuario/{userId}
     */
    async obtenerFavoritos(userId) {
        const data = await apiFetch(`/canciones/favoritos/usuario/${userId}`).catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarCancion);
    },

    /**
     * Alterna favorito (un solo endpoint que agrega o quita según el estado del backend).
     * POST /api/canciones/{id}/favorito/usuario/{usuarioId}
     * @returns {Promise<string>} Mensaje del backend ("Canción añadida" / "Canción eliminada")
     */
    async toggleFavorito(cancionId, userId) {
        return apiFetch(`/canciones/${cancionId}/favorito/usuario/${userId}`, { method: 'POST' });
    },

    /**
     * CU-GENERO: Filtra canciones por género musical.
     * Acepta nombre parcial o ID exacto del género.
     * GET /api/canciones/por-genero?nombre=Rock  (búsqueda parcial)
     * GET /api/canciones/por-genero?id=3          (búsqueda exacta)
     *
     * @param {{ nombre?: string, id?: number }} filtro
     * @returns {Promise<Array>} lista de canciones adaptadas
     */
    async buscarPorGenero(filtro = {}) {
        const params = new URLSearchParams();
        if (filtro.id)     params.set('id',     filtro.id);
        if (filtro.nombre) params.set('nombre', filtro.nombre);
        const query = params.toString() ? `?${params}` : '';
        const data = await apiFetch(`/canciones/por-genero${query}`).catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarCancion);
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// GestorArtistas — Artistas
// ═════════════════════════════════════════════════════════════════════════════
const GestorArtistas = {
    /** Obtiene todos los artistas. GET /api/artistas */
    async obtenerTodos() {
        const data = await apiFetch('/artistas').catch(() => []);
        return (Array.isArray(data) ? data : []).map(adaptarArtista);
    },

    /** Obtiene un artista por ID. GET /api/artistas/{id} */
    async obtenerPorId(id) {
        const data = await apiFetch(`/artistas/${id}`).catch(() => null);
        return adaptarArtista(data);
    },

    /** Obtiene el detalle de un artista con sus álbumes y canciones. GET /api/artistas/{id} */
    async obtenerDetalle(id) {
        return await apiFetch(`/artistas/${id}`).catch(() => null);
    },

    /**
     * Busca artistas por nombre.
     * GET /api/artistas/buscar?nombre=X
     * Retorna un array vacío si el backend no responde (fail-safe).
     * @param {string} nombre - Texto a buscar
     * @returns {Promise<Array>}
     */
    async buscar(nombre) {
        if (!nombre || !nombre.trim()) return [];
        try {
            const params = new URLSearchParams({ nombre: nombre.trim() });
            const data = await apiFetch(`/artistas/buscar?${params}`);
            return (Array.isArray(data) ? data : []).map(adaptarArtista);
        } catch (error) {
            console.warn('[GestorArtistas.buscar] Error al buscar artistas (no bloqueante):', error);
            return [];
        }
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// GestorGeneros — Géneros musicales
// ═════════════════════════════════════════════════════════════════════════════
const GestorGeneros = {
    /**
     * Obtiene todos los géneros disponibles en la BD.
     * GET /api/generos
     * Consumido por el selector de géneros de busqueda.html.
     * @returns {Promise<Array<{id: number, nombre: string}>>}
     */
    async obtenerTodos() {
        const data = await apiFetch('/generos').catch(() => []);
        return Array.isArray(data) ? data : [];
    },
};

// ═════════════════════════════════════════════════════════════════════════════
// GestorPlaylists — Crear, modificar, eliminar y listar playlists
// ═════════════════════════════════════════════════════════════════════════════
const GestorPlaylists = {
    /**
     * Crea una nueva playlist. POST /api/playlists
     * El body debe incluir nombre y, si el backend lo requiere, el creadorId.
     */
    async crear(nombre, descripcion, usuarioId) {
        const usuarioActivo = GestorUsuarios.obtenerActivo();
        const uid = usuarioId || usuarioActivo?.id;
        
        const data = await apiFetch('/playlists', {
            method: 'POST',
            body: {
                nombre: nombre,
                descripcion: descripcion,
                usuarioId: uid
            },
        });
        return adaptarPlaylist(data);
    },

    /** Obtiene el detalle de una playlist. GET /api/playlists/{id} */
    async obtenerDetalle(id) {
        const data = await apiFetch(`/playlists/${id}`).catch(() => null);
        return adaptarPlaylist(data);
    },

    /** Lista las playlists de un usuario. GET /api/playlists/usuario/{usuarioId} */
    async listarPorUsuario(usuarioId) {
        try {
            let data = await apiFetch(`/playlists/usuario/${usuarioId}`);
            console.log("[listarPorUsuario] Data original recibida:", data);
            
            // Si la data viene en formato de paginación o envuelta en un objeto
            if (data && !Array.isArray(data)) {
                if (Array.isArray(data.content)) data = data.content;
                else if (Array.isArray(data.data)) data = data.data;
                else if (Array.isArray(data.playlists)) data = data.playlists;
            }
            
            const playlists = (Array.isArray(data) ? data : []).map(adaptarPlaylist);
            console.log("[listarPorUsuario] Playlists adaptadas:", playlists);
            return playlists;
        } catch (error) {
            console.error("[listarPorUsuario] Error al obtener playlists:", error);
            return [];
        }
    },

    /**
     * Actualiza el nombre y/o descripción de una playlist. PUT /api/playlists/{id}
     */
    async actualizar(id, cambios = {}) {
        const data = await apiFetch(`/playlists/${id}`, {
            method: 'PUT',
            body: cambios,
        });
        return adaptarPlaylist(data);
    },

    /** Elimina una playlist. DELETE /api/playlists/{id} */
    async eliminar(id) {
        return apiFetch(`/playlists/${id}`, { method: 'DELETE' });
    },

    /**
     * Agrega una canción a una playlist. POST /api/playlists/{id}/canciones/{cancionId}
     */
    async agregarCancion(playlistId, cancionId) {
        const data = await apiFetch(`/playlists/${playlistId}/canciones/${cancionId}`, { method: 'POST' });
        return adaptarPlaylist(data);
    },

    /**
     * Quita una canción de una playlist. DELETE /api/playlists/{id}/canciones/{cancionId}
     */
    async quitarCancion(playlistId, cancionId) {
        const data = await apiFetch(`/playlists/${playlistId}/canciones/${cancionId}`, { method: 'DELETE' });
        return adaptarPlaylist(data);
    },
};

// ─── COMPATIBILIDAD CON CÓDIGO LEGADO ────────────────────────────────────────
// Los controladores anteriores usaban CancionesModelo y PlaylistModelo.
// Los aliasamos para no tener que reescribir todo de golpe.
const CancionesModelo = {
    obtenerTodas:    () => GestorCanciones.obtenerTodas(),
    obtenerFavoritos: (uid) => GestorCanciones.obtenerFavoritos(uid),
    toggleFavorito:  (uid, cid) => GestorCanciones.toggleFavorito(cid, uid),
    buscar:          (q) => GestorCanciones.buscar({ titulo: q }),
};

const PlaylistModelo = {
    crear:           (uid, nombre) => GestorPlaylists.crear(nombre, uid),
    obtenerDetalle:  (id) => GestorPlaylists.obtenerDetalle(id),
    actualizarNombre:(id, nombre) => GestorPlaylists.actualizar(id, { nombre }),
    agregarCancion:  (pid, cid) => GestorPlaylists.agregarCancion(pid, cid),
    quitarCancion:   (pid, cid) => GestorPlaylists.quitarCancion(pid, cid),
    listarPorUsuario:(uid) => GestorPlaylists.listarPorUsuario(uid),
};
