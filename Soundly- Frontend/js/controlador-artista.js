(function () {
    'use strict';

    let abortController = null;

    async function initArtista() {
        if (abortController) {
            abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        const usuario = GestorUsuarios.obtenerActivo();
        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }
        Vista.actualizarNombreUsuario(usuario.apodo || usuario.nombreUsuario || 'Usuario');

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

        // Función local para formatear duración en m:ss
        function _fmt(seg) {
            if (!seg || isNaN(seg)) return '--:--';
            const m = Math.floor(seg / 60);
            const s = String(Math.floor(seg % 60)).padStart(2, '0');
            return `${m}:${s}`;
        }

        // 1. Mostrar todas las canciones en una sola tabla vertical
        const songsSection = document.createElement('div');
        songsSection.className = 'album-section';
        songsSection.innerHTML = `
            <div class="song-table-header">
                <span>#</span>
                <span>Título / Artista</span>
                <span class="col-genre">Género</span>
                <span class="col-duration"><i class="far fa-clock"></i></span>
                <span class="col-actions"></span>
            </div>
        `;
        
        todasLasCanciones.forEach((cancion, idx) => {
            const divRow = document.createElement('div');
            divRow.className = 'song-row';
            divRow.dataset.id = cancion.id;

            divRow.innerHTML = `
                <div class="row-num">${idx + 1}</div>
                <div class="row-info">
                    <div class="row-title">${cancion.titulo}</div>
                    <div class="row-artist">${cancion.artista}</div>
                </div>
                <div class="row-genre">${cancion.genero || 'Desconocido'}</div>
                <div class="row-duration">${_fmt(cancion.duracion)}</div>
                <div class="row-actions">
                    <button class="row-like-btn" aria-label="Me gusta" title="Me gusta" data-song-id="${cancion.id || ''}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            `;

            divRow.addEventListener('click', (e) => {
                if (e.target.closest('.row-actions')) return;
                if (window.SoundlyEvents && window.SoundlyEvents.reproducirLista) {
                    window.SoundlyEvents.reproducirLista(todasLasCanciones, idx);
                }
            });

            songsSection.appendChild(divRow);
        });

        container.appendChild(songsSection);

        // 2. Mostrar la fila de álbumes abajo
        const albumsSection = document.createElement('div');
        albumsSection.innerHTML = '<h2 class="artista-albumes-titulo">Álbumes</h2>';
        
        const row = document.createElement('div');
        row.className = 'artista-albumes-row';
        
        artista.albumes.forEach(album => {
            const albumCard = document.createElement('div');
            albumCard.className = 'artista-album-card';

            albumCard.onmouseover = () => albumCard.classList.add('artista-album-card--hover');
            albumCard.onmouseout  = () => albumCard.classList.remove('artista-album-card--hover');

            albumCard.onclick = () => {
                if(window.navegarA) window.navegarA(`album.html?id=${album.id}`); 
                else window.location.href = `album.html?id=${album.id}`;
            };

            albumCard.innerHTML = `
                <img class="artista-album-cover"
                     src="${album.portada || 'https://placehold.co/130x130/1a1a2e/a78bfa?text=Album'}" 
                     alt="${album.nombre}" 
                     onerror="this.src='https://placehold.co/130x130/1a1a2e/a78bfa?text=Album'">
                <div class="artista-album-nombre">${album.nombre}</div>
                <div class="artista-album-tipo">Álbum</div>
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
