(function () {
    'use strict';

    let abortController = null;

    async function initArtista() {
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        if (typeof GestorUsuarios !== 'undefined') {
            const user = GestorUsuarios.obtenerActivo();
            if (!user && document.getElementById('btn-logout')) {
                // Not authenticated but viewing inside SPA, handle accordingly (maybe redirect or show a banner)
            }
        }

        const params = new URLSearchParams(window.location.search);
        const idStr = params.get('id');
        
        if (!idStr) {
            document.getElementById('artista-name').textContent = 'Artista no encontrado';
            document.getElementById('artista-albums-container').innerHTML = '';
            return;
        }

        const id = parseInt(idStr, 10);

        try {
            const artista = await GestorArtistas.obtenerDetalle(id);
            if (!artista) {
                document.getElementById('artista-name').textContent = 'Artista no encontrado';
                document.getElementById('artista-albums-container').innerHTML = '';
                return;
            }

            renderizarCabecera(artista);
            renderizarAlbumes(artista);

        } catch (error) {
            console.error('[Artista] Error:', error);
            document.getElementById('artista-name').textContent = 'Error al cargar';
            document.getElementById('artista-albums-container').innerHTML = '';
        }
    }

    function renderizarCabecera(artista) {
        document.title = `Soundly | ${artista.nombre}`;
        
        const nameEl = document.getElementById('artista-name');
        if (nameEl) nameEl.textContent = artista.nombre;

        const imgEl = document.getElementById('artista-cover-img');
        if (imgEl && artista.fotoUrl) {
            imgEl.src = artista.fotoUrl;
        }
    }

    function renderizarAlbumes(artista) {
        const container = document.getElementById('artista-albums-container');
        if (!container) return;
        container.innerHTML = '';

        if (!artista.albumes || artista.albumes.length === 0) {
            container.innerHTML = '<p style="padding: 32px; color: var(--muted);">Este artista no tiene álbumes aún.</p>';
            return;
        }

        const todasLasCanciones = [];
        
        artista.albumes.forEach(album => {
            if (!album.canciones) return;
            album.canciones.forEach(cDto => {
                const cancionAdaptada = {
                    id: cDto.id,
                    titulo: cDto.titulo,
                    artista: artista.nombre,
                    duracion: cDto.duracion,
                    img: album.portada || cDto.imagenUrl || artista.fotoUrl || 'https://placehold.co/48x48/1a1a2e/a78bfa?text=♪',
                    src: cDto.archivoUrl || cDto.audioUrl || '',
                    genero: cDto.genero || artista.genero || 'Desconocido',
                    addedAt: cDto.addedAt
                };
                todasLasCanciones.push(cancionAdaptada);
            });
        });

        // 1. Mostrar todas las canciones en una sola tabla vertical
        const songsSection = document.createElement('div');
        songsSection.className = 'album-section';
        songsSection.innerHTML = `
            <div class="playlist-header-row">
                <span>#</span>
                <span></span>
                <span>Título</span>
                <span>Género</span>
                <span><i class="far fa-clock"></i></span>
                <span></span>
            </div>
        `;
        
        todasLasCanciones.forEach((cancion, idx) => {
            const divRow = document.createElement('div');
            divRow.className = 'playlist-item';
            divRow.dataset.id = cancion.id;

            divRow.innerHTML = `
                <div class="pl-num">${idx + 1}</div>
                <div class="pl-thumb-container" style="position:relative;">
                    <img src="${cancion.img}" alt="${cancion.titulo}" class="pl-thumb" onerror="this.src='https://placehold.co/48x48/1a1a2e/a78bfa?text=♪'">
                </div>
                <div class="pl-info">
                    <span class="pl-title">${cancion.titulo}</span>
                    <span class="pl-artist">${cancion.artista}</span>
                </div>
                <div class="pl-genre">${cancion.genero}</div>
                <div class="pl-dur">${cancion.duracion}</div>
                <div class="pl-actions" style="display:flex;align-items:center;gap:4px;">
                    <button class="pl-play-btn" aria-label="Reproducir" title="Reproducir">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
                    </button>
                    <button class="pl-remove-btn" title="Me gusta"><i class="far fa-heart"></i></button>
                </div>
            `;

            divRow.addEventListener('click', (e) => {
                if (e.target.closest('.pl-actions')) return;
                if (window.SoundlyEvents && window.SoundlyEvents.reproducirLista) {
                    window.SoundlyEvents.reproducirLista(todasLasCanciones, idx);
                }
            });

            songsSection.appendChild(divRow);
        });

        container.appendChild(songsSection);

        // 2. Mostrar la fila de álbumes abajo
        const albumsSection = document.createElement('div');
        albumsSection.innerHTML = '<h2 style="margin-top: 32px; margin-bottom: 16px; padding: 0 32px; font-size: 1.5rem; font-weight: 700;">Álbumes</h2>';
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '20px';
        row.style.padding = '0 32px 48px 32px';
        row.style.overflowX = 'auto';
        row.style.scrollbarWidth = 'none'; // Firefox
        
        artista.albumes.forEach(album => {
            const albumCard = document.createElement('div');
            albumCard.style.minWidth = '130px';
            albumCard.style.width = '130px';
            albumCard.style.cursor = 'pointer';
            albumCard.style.textAlign = 'center';
            albumCard.style.transition = 'transform 0.2s';
            
            albumCard.onmouseover = () => albumCard.style.transform = 'scale(1.05)';
            albumCard.onmouseout = () => albumCard.style.transform = 'scale(1)';
            
            albumCard.onclick = () => {
                if(window.navegarA) window.navegarA(`album.html?id=${album.id}`); 
                else window.location.href = `album.html?id=${album.id}`;
            };
            
            albumCard.innerHTML = `
                <img src="${album.portada || 'https://placehold.co/130x130/1a1a2e/a78bfa?text=Album'}" 
                     alt="${album.nombre}" 
                     style="width: 130px; height: 130px; border-radius: 8px; object-fit: cover; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" 
                     onerror="this.src='https://placehold.co/130x130/1a1a2e/a78bfa?text=Album'">
                <div style="font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${album.nombre}</div>
                <div style="color: var(--muted); font-size: 0.85rem;">Álbum</div>
            `;
            row.appendChild(albumCard);
        });
        
        albumsSection.appendChild(row);
        container.appendChild(albumsSection);
    }

    // Expose explicitly to window
    window.initArtista = initArtista;

    // Direct execution protection
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname.endsWith('artista.html') || window.location.href.includes('artista.html')) {
                initArtista();
            }
        });
    } else {
        if (window.location.pathname.endsWith('artista.html') || window.location.href.includes('artista.html')) {
            initArtista();
        }
    }

}());
