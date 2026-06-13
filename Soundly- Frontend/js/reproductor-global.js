/**
 * reproductor-global.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * REPRODUCTOR GLOBAL PERSISTENTE
 *
 * Estrategia anti-corte de música entre páginas:
 *   1. Un único objeto `Audio` vive en window.SoundlyPlayer (no se destruye).
 *   2. Al navegar, sessionStorage guarda el índice, tiempo y estado de pausa.
 *   3. La nueva página restaura ese estado al cargar.
 *   4. El footer player-bar se actualiza en cualquier página que lo incluya.
 *
 * MAPEO DE CAMPOS (Backend → Interno):
 *   CancionDTO.imagenUrl   → cancion.img
 *   CancionDTO.archivoUrl  → cancion.src
 *   CancionDTO.nombreArtista → cancion.artista
 *   CancionDTO.titulo      → cancion.titulo
 *   CancionDTO.id          → cancion.id
 *   CancionDTO.duracion    → cancion.duracion
 *
 * CÓMO USAR desde cualquier controlador:
 *   SoundlyPlayer.reproducir(cancion);          // reproduce una canción puntual
 *   SoundlyPlayer.reproducirLista(lista, idx);  // carga lista y reproduce en idx
 *   SoundlyPlayer.togglePlay();
 *   SoundlyPlayer.siguiente();
 *   SoundlyPlayer.anterior();
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── 1. ADAPTADOR DE DATOS ──────────────────────────────────────────────
    // Normaliza cualquier objeto que venga del backend a campos internos
    // consistentes. Así el resto del código nunca toca .imagenUrl directamente.
    function adaptarCancion(dto) {
        if (!dto) return null;
        return {
            id:       dto.id,
            titulo:   dto.titulo   || 'Sin título',
            artista:  dto.nombreArtista || dto.artista || 'Artista desconocido',
            genero:   dto.genero   || '',
            duracion: dto.duracion || 0,
            img:      dto.imagenUrl || dto.img || 'https://placehold.co/96x96/1a1a2e/a78bfa?text=♪',
            src:      dto.archivoUrl || dto.src || '',
        };
    }

    // ── 2. ESTADO INTERNO ─────────────────────────────────────────────────
    const STORAGE_KEY = 'soundly_player_state';

    const estado = {
        lista:    [],   // Array de canciones adaptadas
        idx:      0,    // Índice actual
        playing:  false,
        shuffle:  false,
        repeat:   false,
        volumen:  0.8,
    };

    // Carga el estado guardado de sessionStorage (entre navegaciones)
    function cargarEstadoGuardado() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            estado.lista   = saved.lista   || [];
            estado.idx     = saved.idx     || 0;
            estado.shuffle = saved.shuffle || false;
            estado.repeat  = saved.repeat  || false;
            estado.volumen = saved.volumen !== undefined ? saved.volumen : 0.8;
        } catch (e) {
            console.warn('[SoundlyPlayer] No se pudo restaurar el estado:', e);
        }
    }

    function guardarEstado() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                lista:   estado.lista,
                idx:     estado.idx,
                shuffle: estado.shuffle,
                repeat:  estado.repeat,
                volumen: estado.volumen,
            }));
        } catch (e) { /* quota exceeded — ignorar */ }
    }

    // ── 3. ELEMENTO AUDIO NATIVO ──────────────────────────────────────────
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume  = estado.volumen;

    // ── 3b. PROXY DE AUDIO (anti-CORS para CDNs externos) ──────────────────
    // Redirige URLs de CDNs externos (Deezer, etc.) por el endpoint
    // /api/audio/proxy de nuestro backend Spring Boot.
    // El browser carga desde su propio origen → sin bloqueo CORS.
    function construirProxyUrl(src, idLocal) {
        if (!src) return src;
        const apiBase = window.SoundlyConfig?.API_BASE_URL || 'http://localhost:8080/api';
        
        // Solo proxear URLs HTTP externas (no localhost ni rutas relativas)
        const esUrlExterna = /^https?:\/\//.test(src) &&
                             !src.includes('localhost') &&
                             !src.includes('127.0.0.1');
        
        // Novedad: si es externa y tenemos el ID local, le pedimos al backend 
        // que genere una URL fresca para evitar el error 403 (URL caducada)
        if (esUrlExterna && idLocal) {
            return `${apiBase}/audio/proxy/track/${idLocal}`;
        }

        // Fallback clásico (aunque no debería llegar acá si todo va bien)
        if (!esUrlExterna) return src;
        return `${apiBase}/audio/proxy?url=${encodeURIComponent(src)}`;
    }

    // ── 4. HELPERS DE VISTA ───────────────────────────────────────────────
    function fmt(segundos) {
        if (!segundos || isNaN(segundos)) return '0:00';
        const m = Math.floor(segundos / 60);
        const s = String(Math.floor(segundos % 60)).padStart(2, '0');
        return `${m}:${s}`;
    }

    // Actualiza todos los elementos del footer player-bar si existen en la página
    function actualizarUI() {
        const c = estado.lista[estado.idx];
        if (!c) return;

        // --- Clase is-playing en el footer (activa estilos CSS de estado) ---
        const playerBar = document.getElementById('global-player-bar');
        if (playerBar) playerBar.classList.toggle('is-playing', estado.playing);

        // --- Imagen portada ---
        const npArt = document.getElementById('np-art');
        if (npArt) {
            npArt.src = c.img;
            npArt.alt = c.titulo;
            // Animación spin solo cuando está reproduciendo
            npArt.classList.toggle('spinning', estado.playing);
        }

        // --- Título y artista ---
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);

        // --- Botón play/pause ---
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) {
            btnPlay.innerHTML = estado.playing
                ? '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>';
        }

        // --- Tiempo total ---
        setTexto('p-total', fmt(c.duracion));

        // --- Botones de estado ---
        toggleClass('btn-shuffle', 'active', estado.shuffle);
        toggleClass('btn-repeat',  'active', estado.repeat);

        // --- Botón Like (Actualizar data-id) ---
        const btnLike = document.querySelector('.btn-like');
        if (btnLike) {
            btnLike.setAttribute('data-id', c.id);
        }
    }

    function setTexto(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    function toggleClass(id, cls, condicion) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle(cls, condicion);
    }

    function actualizarProgreso() {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        const fill = document.getElementById('p-fill');
        const cur  = document.getElementById('p-current');
        if (fill) fill.style.width = pct + '%';
        if (cur)  cur.textContent  = fmt(audio.currentTime);
    }

    // ── 5. LÓGICA DE REPRODUCCIÓN ─────────────────────────────────────────
    function cargarEnAudio(cancion, tiempoInicial = 0) {
        if (!cancion || !cancion.src) {
            console.warn('[SoundlyPlayer] Canción sin src, saltando:', cancion?.titulo);
            mostrarToastError('Esta canción no tiene preview disponible.');
            return false; // señal de fallo
        }
        // Validación mínima: debe ser una URL o ruta relativa
        const srcStr = String(cancion.src).trim();
        if (!srcStr || srcStr === 'undefined' || srcStr === 'null') {
            console.warn('[SoundlyPlayer] archivoUrl vacío o inválido:', srcStr);
            mostrarToastError('Esta canción no tiene preview disponible.');
            return false;
        }
        // Solo recargamos si cambió la fuente (evita restart innecesario)
        // Comparamos contra la URL proxeada ya que eso es lo que tendrá audio.src
        // Ahora pasamos también cancion.id para que el backend la busque fresca
        const proxyUrl = construirProxyUrl(srcStr, cancion.id);
        if (audio.src !== proxyUrl) {
            setLoadingState(true);
            audio.src = proxyUrl;
            audio.load();
        }
        if (tiempoInicial > 0) {
            audio.currentTime = tiempoInicial;
        }
        return true; // señal de éxito
    }

    // Indicador visual de carga en el botón play
    function setLoadingState(loading) {
        const btnPlay = document.getElementById('btn-play');
        if (!btnPlay) return;
        if (loading) {
            btnPlay.classList.add('loading');
            btnPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                width="20" height="20" style="animation:sp-spin .7s linear infinite">
                <path d="M12 2a10 10 0 1 0 10 10" stroke-linecap="round"/>
            </svg>`;
        } else {
            btnPlay.classList.remove('loading');
            // El icono correcto lo pone actualizarUI()
            actualizarUI();
        }
    }

    function reproducir(cancion) {
        const c = adaptarCancion(cancion);
        estado.lista = [c];
        estado.idx   = 0;
        // Actualizar título/artista en el footer de forma inmediata (feedback visual)
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        const cargado = cargarEnAudio(c);
        if (!cargado) return; // src vacío → no continuar
        audio.play().then(() => {
            estado.playing = true;
            guardarEstado();
            actualizarUI();
            notificarCambio();
        }).catch(err => {
            console.error('[SoundlyPlayer] Error al reproducir:', err);
            estado.playing = false;
            setLoadingState(false);
            mostrarToastError('No se pudo reproducir la canción. Verificá tu conexión.');
        });
    }

    function reproducirLista(listaCrudos, indice = 0) {
        estado.lista = listaCrudos.map(adaptarCancion);
        estado.idx   = Math.max(0, Math.min(indice, estado.lista.length - 1));
        const c = estado.lista[estado.idx];
        // Feedback inmediato: título/artista/portada se muestran al instante
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        const cargado = cargarEnAudio(c);
        if (!cargado) {
            // Sin src: igual actualizamos la UI con el título/artista para que el usuario sepa qué seleccionó
            actualizarUI();
            return;
        }
        audio.play().then(() => {
            estado.playing = true;
            guardarEstado();
            actualizarUI();
            notificarCambio();
            // Avisar al backend que se reprodujo (CU-07)
            if (c.id) registrarReproduccion(c.id);
        }).catch(err => {
            console.error('[SoundlyPlayer] Error al reproducir lista:', err);
            estado.playing = false;
            setLoadingState(false);
            mostrarToastError('No se pudo reproducir la canción. Verificá tu conexión.');
        });
    }

    function togglePlay() {
        if (!estado.lista.length) {
            mostrarToastError('Seleccioná una canción primero.');
            return;
        }
        if (!audio.src) {
            const cargado = cargarEnAudio(estado.lista[estado.idx]);
            if (!cargado) return;
        }
        if (estado.playing) {
            audio.pause();
            // El evento 'pause' del audio se encarga de actualizar estado.playing y la UI
        } else {
            // Actualizamos icono optimistamente para dar feedback inmediato
            estado.playing = true;
            actualizarUI();
            audio.play().catch(err => {
                console.error('[SoundlyPlayer] togglePlay error:', err);
                estado.playing = false;
                actualizarUI();
                mostrarToastError('No se pudo reproducir. Intentá de nuevo.');
            });
        }
        guardarEstado();
    }

    function siguiente() {
        if (!estado.lista.length) return;
        if (estado.shuffle) {
            estado.idx = Math.floor(Math.random() * estado.lista.length);
        } else {
            estado.idx = (estado.idx + 1) % estado.lista.length;
        }
        const c = estado.lista[estado.idx];
        // Feedback visual inmediato
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        const cargado = cargarEnAudio(c);
        if (!cargado) { actualizarUI(); return; }
        if (estado.playing) {
            audio.play()
                .then(() => { actualizarUI(); notificarCambio(); if (c.id) registrarReproduccion(c.id); })
                .catch(err => { console.error('[SoundlyPlayer] siguiente error:', err); estado.playing = false; actualizarUI(); });
        } else {
            actualizarUI();
            notificarCambio();
        }
        guardarEstado();
    }

    function anterior() {
        if (!estado.lista.length) return;
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        estado.idx = (estado.idx - 1 + estado.lista.length) % estado.lista.length;
        const c = estado.lista[estado.idx];
        // Feedback visual inmediato
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        const cargado = cargarEnAudio(c);
        if (!cargado) { actualizarUI(); return; }
        if (estado.playing) {
            audio.play()
                .then(() => { actualizarUI(); notificarCambio(); })
                .catch(err => { console.error('[SoundlyPlayer] anterior error:', err); estado.playing = false; actualizarUI(); });
        } else {
            actualizarUI();
            notificarCambio();
        }
        guardarEstado();
    }

    function toggleShuffle() {
        estado.shuffle = !estado.shuffle;
        guardarEstado();
        toggleClass('btn-shuffle', 'active', estado.shuffle);
    }

    function toggleRepeat() {
        estado.repeat = !estado.repeat;
        guardarEstado();
        toggleClass('btn-repeat', 'active', estado.repeat);
    }

    function setVolumen(valor) {
        // valor: 0-100 (del input range) o 0.0-1.0
        const vol = valor > 1 ? valor / 100 : valor;
        audio.volume = vol;
        estado.volumen = vol;
        guardarEstado();

        // Actualizar ícono de volumen
        const volBtn = document.getElementById('vol-btn');
        if (volBtn) {
            volBtn.classList.toggle('muted', vol === 0);
            // Restaurar SVG original si no hay icono emoji
            if (!volBtn.querySelector('svg')) {
                volBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
            }
        }

        // Actualizar variable CSS --vol-pct para el fill del slider
        const volSlider = document.getElementById('vol-slider');
        if (volSlider) {
            volSlider.style.setProperty('--vol-pct', Math.round(vol * 100) + '%');
        }
    }

    function seekTo(event) {
        const track = document.getElementById('progress-track');
        if (!track || !audio.duration) return;
        const rect = track.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
    }

    // ── 6. EVENTOS DEL AUDIO NATIVO ───────────────────────────────────────
    audio.addEventListener('timeupdate', actualizarProgreso);

    audio.addEventListener('ended', () => {
        if (estado.repeat) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } else {
            siguiente();
        }
    });

    // Quitar estado de carga cuando el audio puede reproducirse
    audio.addEventListener('canplay', () => {
        setLoadingState(false);
    });

    // Mostrar carga si el buffer se agota durante la reproducción
    audio.addEventListener('waiting', () => {
        setLoadingState(true);
    });

    audio.addEventListener('playing', () => {
        setLoadingState(false);
        estado.playing = true;
        actualizarUI();
    });

    audio.addEventListener('play',  () => { estado.playing = true;  actualizarUI(); });
    audio.addEventListener('pause', () => { estado.playing = false; actualizarUI(); });

    audio.addEventListener('error', () => {
        const codigo = audio.error?.code;
        // Código 4 = MEDIA_ELEMENT_ERROR: No soportado / URL inválida / CORS
        const msg = codigo === 4
            ? 'Preview no disponible para esta canción (formato no compatible o CORS).'
            : 'Error al cargar el audio. Intentá con otra canción.';
        console.error('[SoundlyPlayer] Error de audio (código', codigo, '):', audio.error);
        mostrarToastError(msg);
        estado.playing = false;
        setLoadingState(false);
        actualizarUI();
    });

    // ── 7. NOTIFICACIONES ENTRE MÓDULOS ──────────────────────────────────
    // Cualquier controlador puede suscribirse a cambios de canción:
    //   window.addEventListener('soundly:cancion-cambio', e => { ... e.detail ... })
    function notificarCambio() {
        const c = estado.lista[estado.idx];
        window.dispatchEvent(new CustomEvent('soundly:cancion-cambio', { detail: { cancion: c, idx: estado.idx } }));
    }

    // ── 8. REGISTRO DE REPRODUCCIÓN (CU-07) ──────────────────────────────
    async function registrarReproduccion(cancionId) {
        try {
            await fetch(`${window.SoundlyConfig.API_BASE_URL}/canciones/${cancionId}/reproducir`, { method: 'POST' });
        } catch (e) { /* silencioso — no interrumpir la UX */ }
    }

    // ── 8b. TOAST DE ERROR NO INVASIVO ───────────────────────────────────
    // Muestra un mensaje flotante sobre el reproductor por 3 segundos.
    // No interrumpe ninguna navegación ni estado del reproductor.
    function mostrarToastError(mensaje) {
        // Reutilizar toast existente o crear uno nuevo
        let toast = document.getElementById('sp-toast-error');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sp-toast-error';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            // Estilos inline para ser autónomo (no depende de ningún CSS externo)
            Object.assign(toast.style, {
                position:        'fixed',
                bottom:          '100px',      // justo encima del footer del reproductor
                left:            '50%',
                transform:       'translateX(-50%)',
                background:      'rgba(20, 10, 40, 0.92)',
                backdropFilter:  'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border:          '1px solid rgba(167, 139, 250, 0.35)',
                color:           '#e9d5ff',
                padding:         '10px 20px',
                borderRadius:    '999px',
                fontSize:        '0.82rem',
                fontWeight:      '500',
                boxShadow:       '0 4px 20px rgba(0,0,0,0.5)',
                zIndex:          '9999',
                transition:      'opacity 0.3s ease',
                pointerEvents:   'none',
                whiteSpace:      'nowrap',
            });
            document.body.appendChild(toast);
        }

        // Limpiar timer anterior si el toast ya estaba visible
        clearTimeout(toast._timer);

        toast.textContent = `⚠️  ${mensaje}`;
        toast.style.opacity = '1';
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    // ── 9. RESTAURAR ESTADO AL NAVEGAR ───────────────────────────────────
    // Si hay una canción en sessionStorage y el audio no está reproduciendo,
    // restauramos la UI sin reiniciar el audio (evita corte).
    cargarEstadoGuardado();
    if (estado.lista.length > 0) {
        const c = estado.lista[estado.idx];
        // Restauramos la UI del footer inmediatamente (sin autoplay por política del browser)
        actualizarUI();
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
    }

    // ── 10. INICIALIZAR EVENTOS DEL FOOTER ───────────────────────────────
    // Se conecta automáticamente con los botones del footer player-bar
    document.addEventListener('DOMContentLoaded', () => {
        // Botones de control
        document.getElementById('btn-play')    ?.addEventListener('click', togglePlay);
        document.getElementById('btn-next')    ?.addEventListener('click', siguiente);
        document.getElementById('btn-prev')    ?.addEventListener('click', anterior);
        document.getElementById('btn-shuffle') ?.addEventListener('click', toggleShuffle);
        document.getElementById('btn-repeat')  ?.addEventListener('click', toggleRepeat);
        document.getElementById('progress-track')?.addEventListener('click', seekTo);

        // Volumen — inicializar slider y fill dinámico
        const volSlider = document.getElementById('vol-slider');
        if (volSlider) {
            const pct = Math.round(estado.volumen * 100);
            volSlider.value = pct;
            // Establecer variable CSS inicial para el fill del slider
            volSlider.style.setProperty('--vol-pct', pct + '%');
            volSlider.addEventListener('input', e => setVolumen(Number(e.target.value)));
        }

        // Mute al hacer clic en el ícono de volumen
        const volBtn = document.getElementById('vol-btn');
        if (volBtn) {
            volBtn.addEventListener('click', () => {
                if (audio.muted) {
                    audio.muted = false;
                    setVolumen(estado.volumen || 0.8);
                    volBtn.classList.remove('muted');
                } else {
                    audio.muted = true;
                    volBtn.classList.add('muted');
                    const vs = document.getElementById('vol-slider');
                    if (vs) vs.style.setProperty('--vol-pct', '0%');
                }
            });
        }

        // Restaurar UI si hay estado guardado
        if (estado.lista.length > 0) {
            actualizarUI();
        }
    });

    // ── 11. EXPONER API PÚBLICA ───────────────────────────────────────────
    window.SoundlyPlayer = {
        reproducir,
        reproducirLista,
        togglePlay,
        siguiente,
        anterior,
        toggleShuffle,
        toggleRepeat,
        setVolumen,
        seekTo,
        adaptarCancion,
        getEstado: () => ({ ...estado }),
        getCancionActual: () => estado.lista[estado.idx] || null,
        getAudio: () => audio,
    };

})();
