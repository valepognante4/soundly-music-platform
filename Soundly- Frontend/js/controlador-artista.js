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

        // We will collect all songs from all albums here, 
        // to pass the list to SoundlyEvents.reproducirLista so the user can play any song and skip to the next
        const todasLasCanciones = [];
        let indexGlobal = 0;

        artista.albumes.forEach(album => {
            if (!album.canciones || album.canciones.length === 0) return;

            // Header for the Album
            const section = document.createElement('div');
            section.className = 'album-section';
            
            const htmlHeader = `
                <div class="album-section-header" style="cursor:pointer;" onclick="if(window.navegarA) window.navegarA('album.html?id=${album.id}'); else window.location.href='album.html?id=${album.id}';">
                    <img src="${album.portada || 'https://placehold.co/150x150/1a1a2e/a78bfa?text=Album'}" alt="${album.nombre}" class="album-section-cover" onerror="this.src='https://placehold.co/64x64/1a1a2e/a78bfa?text=Album'">
                    <div>
                        <h2 class="album-section-title">${album.nombre}</h2>
                        <span class="album-section-year">Álbum</span>
                    </div>
                </div>
                <div class="playlist-header-row">
                    <span>#</span>
                    <span></span>
                    <span>Título</span>
                    <span>Género</span>
                    <span><i class="far fa-clock"></i></span>
                    <span></span>
                </div>
            `;
            
            section.innerHTML = htmlHeader;
            
            // Songs inside the Album
            album.canciones.forEach((cDto, indexInAlbum) => {
                // Adapt song properties for reproductor
                const cancionAdaptada = {
                    id: cDto.id,
                    titulo: cDto.titulo,
                    artista: artista.nombre, // use main artist's name
                    duracion: cDto.duracion,
                    img: album.portada || cDto.imagenUrl || artista.fotoUrl,
                    src: cDto.audioUrl || '',
                    genero: cDto.genero || artista.genero || 'Desconocido',
                    addedAt: cDto.addedAt
                };
                
                todasLasCanciones.push(cancionAdaptada);
                const i = indexGlobal++; // captured index for reproducing list

                const divRow = document.createElement('div');
                divRow.className = 'playlist-item';
                divRow.dataset.id = cancionAdaptada.id;

                divRow.innerHTML = `
                    <div class="pl-num">${indexInAlbum + 1}</div>
                    <div class="pl-thumb-container" style="position:relative;">
                        <img src="${cancionAdaptada.img}" alt="${cancionAdaptada.titulo}" class="pl-thumb" onerror="this.src='https://placehold.co/48x48/1a1a2e/a78bfa?text=♪'">
                    </div>
                    <div class="pl-info">
                        <span class="pl-title">${cancionAdaptada.titulo}</span>
                        <span class="pl-artist">${cancionAdaptada.artista}</span>
                    </div>
                    <div class="pl-genre">${cancionAdaptada.genero}</div>
                    <div class="pl-dur">${cancionAdaptada.duracion}</div>
                    <div class="pl-actions" style="display:flex;align-items:center;gap:4px;">
                        <button class="pl-play-btn" aria-label="Reproducir" title="Reproducir">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
                        </button>
                        <button class="pl-remove-btn" title="Me gusta"><i class="far fa-heart"></i></button>
                    </div>
                `;

                // Play event
                divRow.addEventListener('click', (e) => {
                    if (e.target.closest('.pl-actions')) return; // Ignore if clicking actions
                    if (window.SoundlyEvents && window.SoundlyEvents.reproducirLista) {
                        window.SoundlyEvents.reproducirLista(todasLasCanciones, i);
                    }
                });

                section.appendChild(divRow);
            });

            container.appendChild(section);
        });
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
