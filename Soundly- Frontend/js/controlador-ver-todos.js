(function () {
    'use strict';

    function initVerTodos() {
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get('tipo') || 'mas';
        
        const titleEl = document.getElementById('ver-todos-title');
        const gridEl = document.getElementById('ver-todos-grid');
        
        let tituloStr = 'Ver todos';
        if (tipo === 'recomendados') tituloStr = 'Recomendados para vos';
        else if (tipo === 'artistas') tituloStr = 'Artistas recomendados';
        else if (tipo === 'albumes') tituloStr = 'Todos los álbumes';
        else if (tipo === 'mas') tituloStr = 'Más de lo que te gusta';
        
        if (titleEl) titleEl.textContent = tituloStr;
        if (gridEl) gridEl.innerHTML = '<div class="loading-placeholder">Cargando...</div>';

        cargarDatos(tipo, gridEl);
    }

    async function cargarDatos(tipo, gridEl) {
        try {
            let data = [];
            if (tipo === 'artistas') {
                data = await GestorArtistas.obtenerTodos();
                renderizarArtistas(data, gridEl);
            } else if (tipo === 'albumes') {
                if (typeof window.fetchAlbums === 'function') {
                    data = await window.fetchAlbums();
                }
                renderizarAlbumes(data, gridEl);
            } else {
                // Para "recomendados" y "mas" usamos álbumes por defecto (o un mix si estuviera disponible)
                if (typeof window.fetchAlbums === 'function') {
                    data = await window.fetchAlbums();
                }
                // Mezclamos un poco para que se vea diferente
                const shuffled = data.sort(() => 0.5 - Math.random());
                renderizarAlbumes(shuffled, gridEl);
            }
        } catch (e) {
            console.error('[Ver Todos] Error:', e);
            if (gridEl) gridEl.innerHTML = '<div class="loading-placeholder" style="color:#f87171;">Error al cargar los datos.</div>';
        }
    }

    function renderizarArtistas(artistas, container) {
        container.innerHTML = '';
        if (!artistas || artistas.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No hay artistas disponibles.</div>';
            return;
        }

        artistas.forEach(artista => {
            const card = document.createElement('div');
            card.className = 'song-card fade-in';
            card.style.cursor = 'pointer';
            card.onclick = () => {
                if(window.navegarA) window.navegarA(`artista.html?id=${artista.id}`);
                else window.location.href = `artista.html?id=${artista.id}`;
            };

            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${artista.fotoUrl || artista.foto || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'}" 
                         alt="${artista.nombre}" class="card-image"
                         onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'">
                    <div class="play-overlay">
                        <button class="play-btn-circle" aria-label="Ver artista">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${artista.nombre}</h3>
                    <p class="card-artist">Artista</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function renderizarAlbumes(albumes, container) {
        container.innerHTML = '';
        if (!albumes || albumes.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No hay álbumes disponibles.</div>';
            return;
        }

        albumes.forEach(album => {
            const card = document.createElement('div');
            card.className = 'song-card fade-in';
            card.style.cursor = 'pointer';
            card.onclick = () => {
                if(window.navegarA) window.navegarA(`album.html?id=${album.id}`);
                else window.location.href = `album.html?id=${album.id}`;
            };

            const artistaNombre = album.artistaNombre || album.artista || 'Artista Desconocido';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${album.portada || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'}" 
                         alt="${album.nombre}" class="card-image"
                         onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'">
                    <div class="play-overlay">
                        <button class="play-btn-circle" aria-label="Ver álbum">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-info">
                    <h3 class="card-title">${album.nombre}</h3>
                    <p class="card-artist">${artistaNombre}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.initVerTodos = initVerTodos;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname.endsWith('ver-todos.html') || window.location.href.includes('ver-todos.html')) {
                initVerTodos();
            }
        });
    } else {
        if (window.location.pathname.endsWith('ver-todos.html') || window.location.href.includes('ver-todos.html')) {
            initVerTodos();
        }
    }

})();
