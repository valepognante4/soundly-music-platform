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
            card.className = 'card';
            card.onclick = () => {
                if(window.navegarA) window.navegarA(`artista.html?id=${artista.id}`);
                else window.location.href = `artista.html?id=${artista.id}`;
            };

            card.innerHTML = `
                <div class="card-thumb artist-thumb" style="border-radius:50%; overflow:hidden;">
                    <img src="${artista.fotoUrl || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'}" 
                         alt="${artista.nombre}" style="width:100%; height:100%; object-fit:cover;"
                         onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Artista'">
                    <button class="card-play-btn"><i class="fas fa-play"></i></button>
                </div>
                <div class="card-title">${artista.nombre}</div>
                <div class="card-subtitle">Artista</div>
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
            card.className = 'card';
            card.onclick = () => {
                if(window.navegarA) window.navegarA(`album.html?id=${album.id}`);
                else window.location.href = `album.html?id=${album.id}`;
            };

            const artistaNombre = album.artistaNombre || album.artista || 'Artista Desconocido';
            card.innerHTML = `
                <div class="card-thumb" style="border-radius:8px; overflow:hidden;">
                    <img src="${album.portada || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'}" 
                         alt="${album.nombre}" style="width:100%; height:100%; object-fit:cover;"
                         onerror="this.src='https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'">
                    <button class="card-play-btn" onclick="event.stopPropagation(); if(window.SoundlyEvents && album.canciones) window.SoundlyEvents.reproducirLista(album.canciones, 0);"><i class="fas fa-play"></i></button>
                </div>
                <div class="card-title">${album.nombre}</div>
                <div class="card-subtitle">${artistaNombre}</div>
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
