/**
 * vista.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * CAPA DE VISTA (MVC)
 *
 * Renderiza listas de canciones, artistas, búsqueda y playlists.
 * Cada función recibe datos ya ADAPTADOS (campo interno c.img, c.src, etc.)
 * y un callback de acción — nunca llama al modelo directamente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Vista = {

    // ── HELPER INTERNO ────────────────────────────────────────────────────
    _getContainer(id) {
        const el = document.getElementById(id);
        if (!el) console.warn(`[Vista] Contenedor #${id} no encontrado en el DOM.`);
        return el;
    },

    // ── FORMATEAR TIEMPO ──────────────────────────────────────────────────
    fmt(s) {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarListaCanciones
    // Renderiza una lista de canciones con botón Play individual.
    // Cada canción actualiza el reproductor global al hacer clic.
    //
    // @param {Array}    canciones     - Lista de objetos canción (ya adaptados)
    // @param {string}   contenedorId  - ID del elemento DOM contenedor
    // @param {number}   idxActivo     - Índice de la canción actualmente en reproducción
    // @param {Function} onPlay        - Callback(cancion, idx): qué hacer al presionar Play
    // ─────────────────────────────────────────────────────────────────────
    renderizarListaCanciones(canciones, contenedorId, idxActivo = -1, onPlay = null) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!canciones || canciones.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <p>No hay canciones disponibles.</p>
                </div>`;
            return;
        }

        contenedor.innerHTML = '';
        const fragment = document.createDocumentFragment();

        canciones.forEach((c, i) => {
            const item = document.createElement('div');
            item.className = 'playlist-item' + (i === idxActivo ? ' active' : '');
            item.dataset.id = c.id;
            item.innerHTML = `
                <div class="pl-num">${i === idxActivo
                    ? '<span class="playing-anim"><span></span><span></span><span></span></span>'
                    : i + 1
                }</div>
                <img class="pl-thumb" 
                     src="${c.img}" 
                     alt="${c.titulo}"
                     onerror="this.src='https://placehold.co/48x48/1a1a2e/a78bfa?text=♪'">
                <div class="pl-info">
                    <span class="pl-title">${c.titulo}</span>
                    <span class="pl-artist">${c.artista}</span>
                </div>
                <span class="pl-genre">${c.genero || ''}</span>
                <span class="pl-dur">${this.fmt(c.duracion)}</span>
                <button class="pl-play-btn" 
                        id="play-btn-${c.id}"
                        aria-label="Reproducir ${c.titulo}"
                        title="Reproducir">
                    ${i === idxActivo
                        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                        : '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>'
                    }
                </button>
            `;

            // Clic en la fila o en el botón → reproduce con lista completa
            const accionPlay = () => {
                if (typeof onPlay === 'function') {
                    onPlay(c, i);
                } else {
                    // Comportamiento por defecto: usar el reproductor global
                    window.SoundlyEvents?.reproducirLista(canciones, i);
                }
            };

            item.querySelector('.pl-play-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                accionPlay();
            });
            item.addEventListener('click', accionPlay);

            fragment.appendChild(item);
        });

        contenedor.appendChild(fragment);
    },

    // Alias de compatibilidad con el código anterior
    renderizarPlaylist(lista, contenedorId, idxActivo, callbackClick) {
        this.renderizarListaCanciones(lista, contenedorId, idxActivo, callbackClick
            ? (c, i) => callbackClick(i)
            : null
        );
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarTarjetasCanciones
    // Tarjetas grandes de música (grilla home). Cada tarjeta tiene imagen,
    // título, artista y botón Play flotante.
    //
    // @param {Array}    canciones    - Lista adaptada
    // @param {string}   contenedorId - ID del contenedor
    // @param {Function} onPlay       - Callback(cancion, idx)
    // ─────────────────────────────────────────────────────────────────────
    renderizarTarjetasCanciones(canciones, contenedorId, onPlay = null) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!canciones || canciones.length === 0) {
            contenedor.innerHTML = '<p class="empty-state">No hay contenido disponible.</p>';
            return;
        }

        contenedor.innerHTML = '';
        canciones.forEach((c, i) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.id = `card-cancion-${c.id}`;
            card.innerHTML = `
                <img class="card-art" 
                     src="${c.img}" 
                     alt="${c.titulo}"
                     onerror="this.src='https://placehold.co/300x300/1a1a2e/a78bfa?text=♪'">
                <div class="card-play-btn" aria-label="Reproducir ${c.titulo}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                </div>
                <div class="card-title">${c.titulo}</div>
                <div class="card-sub">${c.artista}</div>
            `;

            card.addEventListener('click', () => {
                if (typeof onPlay === 'function') onPlay(c, i);
                else window.SoundlyEvents?.reproducirLista(canciones, i);
            });

            contenedor.appendChild(card);
        });
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarTarjetasFavoritas
    // Tarjetas de canciones para la sección Favoritos, incluye botón Me Gusta.
    // ─────────────────────────────────────────────────────────────────────
    renderizarTarjetasFavoritas(canciones, contenedorId, onPlay = null, onLike = null) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!canciones || canciones.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <p>No tienes canciones en tus favoritos.</p>
                </div>`;
            return;
        }

        contenedor.innerHTML = '';
        canciones.forEach((c, i) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.id = `card-fav-${c.id}`;
            card.innerHTML = `
                <img class="card-art" 
                     src="${c.img}" 
                     alt="${c.titulo}"
                     onerror="this.src='https://placehold.co/300x300/1a1a2e/a78bfa?text=♪'">
                <div class="card-play-btn" aria-label="Reproducir ${c.titulo}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                </div>
                <div class="card-title">${c.titulo}</div>
                <div class="card-sub">${c.artista}</div>
                <button class="btn-like fav-card-like" data-id="${c.id}" aria-label="Me gusta" style="position: absolute; top: 10px; right: 10px; z-index: 2; padding: 5px; background: rgba(0,0,0,0.5); border-radius: 50%;">
                    <i class="fas fa-heart"></i>
                </button>
            `;

            // Play callback
            card.addEventListener('click', (e) => {
                // Evitar que el clic en el botón de Me gusta dispare el play de la tarjeta
                if (e.target.closest('.fav-card-like')) return;
                
                if (typeof onPlay === 'function') onPlay(c, i);
                else window.SoundlyEvents?.reproducirLista(canciones, i);
            });

            // Like callback
            const btnLike = card.querySelector('.fav-card-like');
            btnLike.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof onLike === 'function') onLike(e);
            });

            contenedor.appendChild(card);
        });
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarArtistas
    // Tarjetas de artistas con foto circular y nombre.
    // ─────────────────────────────────────────────────────────────────────
    renderizarArtistas(artistas, contenedorId, onClickArtista = null) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!artistas || artistas.length === 0) {
            contenedor.innerHTML = '<p class="empty-state">No hay artistas disponibles.</p>';
            return;
        }

        contenedor.innerHTML = '';
        artistas.forEach((a) => {
            const card = document.createElement('div');
            card.className = 'artist-card';
            card.id = `card-artista-${a.id}`;
            card.innerHTML = `
                <img class="artist-photo" 
                     src="${a.foto}" 
                     alt="${a.nombre}"
                     onerror="this.src='https://placehold.co/200x200/1a1a2e/a78bfa?text=🎤'">
                <div class="artist-name">${a.nombre}</div>
                <div class="artist-genre">${a.genero}</div>
            `;
            if (typeof onClickArtista === 'function') {
                card.addEventListener('click', () => onClickArtista(a));
            }
            contenedor.appendChild(card);
        });
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarResultadosBusqueda
    // Resultados de búsqueda glassmorphism: portada, título, artista, duración, play.
    // ─────────────────────────────────────────────────────────────────────
    renderizarResultadosBusqueda(resultados, contenedorId) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!resultados || resultados.length === 0) {
            contenedor.innerHTML = `
                <div class="search-empty-state">
                    <div class="search-empty-icon">🔍</div>
                    <p class="empty-title">Sin resultados</p>
                    <p class="empty-sub">Probá con otro nombre de canción o artista.</p>
                </div>`;
            return;
        }

        // Cabecera con contador de resultados
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.innerHTML = `<h2>Resultados <span class="results-count">${resultados.length} encontradas</span></h2>`;

        const grid = document.createElement('div');
        grid.className = 'search-results-grid';

        resultados.forEach((c, i) => {
            const card = document.createElement('div');
            card.className = 'search-card';
            card.id = `resultado-${c.id}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Reproducir ${c.titulo} de ${c.artista}`);

            card.innerHTML = `
                <div class="search-card-art-wrap">
                    <img class="search-card-art"
                         src="${c.img}"
                         alt="Portada de ${c.titulo}"
                         onerror="this.src='https://placehold.co/64x64/0d0d1a/a78bfa?text=♪'">
                    <button class="search-card-play-btn"
                            id="search-play-${c.id}"
                            aria-label="Reproducir ${c.titulo}">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                    </button>
                </div>
                <div class="search-card-info">
                    <span class="search-card-title">${c.titulo}</span>
                    <span class="search-card-artist">${c.artista}</span>
                </div>
                <span class="search-card-dur">${this.fmt(c.duracion)}</span>
            `;

            const accionPlay = (e) => {
                e?.stopPropagation();
                window.SoundlyEvents?.reproducirLista(resultados, i);
            };

            card.querySelector('.search-card-play-btn').addEventListener('click', accionPlay);
            card.addEventListener('click', accionPlay);
            card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') accionPlay(); });

            grid.appendChild(card);
        });

        contenedor.innerHTML = '';
        contenedor.appendChild(header);
        contenedor.appendChild(grid);
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarPlaylists
    // Lista de playlists del usuario con nombre, creador y cantidad de canciones.
    // ─────────────────────────────────────────────────────────────────────
    renderizarPlaylists(playlists, contenedorId, onClickPlaylist = null) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;

        if (!playlists || playlists.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Todavía no tenés playlists. ¡Creá una!</p>
                </div>`;
            return;
        }

        contenedor.innerHTML = '';
        playlists.forEach((p) => {
            const item = document.createElement('div');
            item.className = 'playlist-card';
            item.id = `card-playlist-${p.id}`;
            // Protección contra nulos
            const nombre = p.nombre || 'Playlist sin nombre';
            const creador = p.creador || 'Desconocido';
            const cantidadCanciones = p.canciones ? p.canciones.length : 0;
            const portada = p.canciones?.[0]?.img 
                || 'https://placehold.co/60x60/1a1a2e/a78bfa?text=🎵';
                
            item.innerHTML = `
                <img class="playlist-thumb" 
                     src="${portada}" 
                     alt="${nombre}"
                     onerror="this.src='https://placehold.co/60x60/1a1a2e/a78bfa?text=🎵'">
                <div class="playlist-info">
                    <span class="playlist-name">${nombre}</span>
                    <span class="playlist-meta">
                        ${cantidadCanciones} canciones · ${creador}
                    </span>
                </div>
            `;
            if (typeof onClickPlaylist === 'function') {
                item.addEventListener('click', () => onClickPlaylist(p));
            }
            contenedor.appendChild(item);
        });
    },

    // ─────────────────────────────────────────────────────────────────────
    // actualizarNombreUsuario
    // ─────────────────────────────────────────────────────────────────────
    actualizarNombreUsuario(nombre) {
        const el = document.getElementById('nombre-usuario-display')
            || document.getElementById('user-name');
        if (el) el.textContent = nombre;
        const avatar = document.getElementById('user-avatar');
        if (avatar && nombre) avatar.textContent = nombre[0].toUpperCase();
    },

    // ─────────────────────────────────────────────────────────────────────
    // mostrarError / mostrarExito
    // ─────────────────────────────────────────────────────────────────────
    mostrarError(elementoId, mensaje) {
        const el = document.getElementById(elementoId);
        if (!el) return;
        el.textContent = mensaje;
        el.style.display = 'block';
        el.className = el.className.replace('hidden', '') + ' error-msg';
    },

    ocultarError(elementoId) {
        const el = document.getElementById(elementoId);
        if (el) el.style.display = 'none';
    },

    // ─────────────────────────────────────────────────────────────────────
    // renderizarCategorias (compatibilidad legado)
    // ─────────────────────────────────────────────────────────────────────
    renderizarCategorias(categorias, contenedorId) {
        const contenedor = this._getContainer(contenedorId);
        if (!contenedor) return;
        contenedor.innerHTML = '';
        categorias.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'category-card';
            div.textContent = cat.label || cat.nombre || cat;
            contenedor.appendChild(div);
        });
    },
};