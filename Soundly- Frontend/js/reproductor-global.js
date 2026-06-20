/**
 * reproductor-global.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * REPRODUCTOR GLOBAL PERSISTENTE — Singleton + Event Bus
 *
 * Arquitectura:
 *   1. Audio singleton en window.__soundlyAudioInstance (sobrevive en SPA).
 *   2. Estado en window.__soundlyEstado (compartido entre re-evaluaciones).
 *   3. Vistas comunican vía eventos (window.dispatchEvent), nunca reinician audio.
 *   4. syncUI() solo actualiza DOM — nunca toca audio.src si ya está activo.
 *
 * Eventos de comando (vistas → reproductor):
 *   soundly:reproducir          { cancion }
 *   soundly:reproducir-lista    { lista, indice }
 *   soundly:toggle-play
 *   soundly:siguiente / soundly:anterior
 *   soundly:set-volumen         { valor }
 *   soundly:seek                { event }
 *   soundly:toggle-shuffle / soundly:toggle-repeat
 *
 * Eventos de notificación (reproductor → vistas):
 *   soundly:cancion-cambio      { cancion, idx }
 *   soundly:estado-cambio       { playing, idx, lista }
 *   soundly:ui-sync
 *   soundly:vista-cambiada      { url }  → reproductor llama syncUI()
 *
 * Atajo para controladores:
 *   window.SoundlyEvents.reproducirLista(lista, idx)
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── GUARD IDEMPOTENTE ─────────────────────────────────────────────────
    // Si el motor ya está activo (SPA), solo sincronizamos UI y salimos.
    if (window.__soundlyPlayerInitialized && window.__soundlyPlayerCore) {
        window.__soundlyPlayerCore.syncUI();
        return;
    }

    const STORAGE_KEY = 'soundly_player_state';

    // ── ESTADO GLOBAL ─────────────────────────────────────────────────────
    if (!window.__soundlyEstado) {
        window.__soundlyEstado = {
            lista:    [],
            idx:      0,
            playing:  false,
            shuffle:  false,
            repeat:   false,
            volumen:  0.8,
            currentTime: 0,
        };
    }
    const estado = window.__soundlyEstado;

    // ── AUDIO SINGLETON ───────────────────────────────────────────────────
    if (!window.__soundlyAudioInstance) {
        window.__soundlyAudioInstance = new Audio();
        window.__soundlyAudioInstance.preload = 'metadata';
    }
    const audio = window.__soundlyAudioInstance;

    // ── ADAPTADOR DE DATOS ────────────────────────────────────────────────
    function adaptarCancion(dto) {
        if (!dto) return null;
        // ── GUARD: si el objeto ya fue adaptado por el Modelo (tiene .img y .src
        // como campos normalizados), no re-mapear con los campos DTO crudos o
        // perderemos los valores correctos (img quedaría undefined → placeholder).
        const yaAdaptado = (dto.img !== undefined && dto.src !== undefined
                           && dto.imagenUrl === undefined && dto.archivoUrl === undefined);
        return {
            id:       dto.id,
            titulo:   dto.titulo   || 'Sin título',
            artista:  dto.nombreArtista || dto.artista || 'Artista desconocido',
            genero:   dto.genero   || '',
            duracion: dto.duracion || 0,
            img:      yaAdaptado ? dto.img  : (dto.imagenUrl  || dto.img  || 'https://placehold.co/96x96/1a1a2e/a78bfa?text=♪'),
            src:      yaAdaptado ? dto.src  : (dto.archivoUrl || dto.src  || ''),
        };
    }

    function cargarEstadoGuardado() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            estado.lista       = saved.lista       || [];
            estado.idx         = saved.idx         || 0;
            estado.shuffle     = saved.shuffle     || false;
            estado.repeat      = saved.repeat      || false;
            estado.volumen     = saved.volumen !== undefined ? saved.volumen : 0.8;
            estado.playing     = saved.playing     || false;
            estado.currentTime = saved.currentTime || 0;
        } catch (e) {
            console.warn('[SoundlyPlayer] No se pudo restaurar el estado:', e);
        }
    }

    function guardarEstado() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                lista:       estado.lista,
                idx:         estado.idx,
                shuffle:     estado.shuffle,
                repeat:      estado.repeat,
                volumen:     estado.volumen,
                playing:     estado.playing,
                currentTime: audio.currentTime,
            }));
        } catch (e) { /* quota exceeded */ }
    }

    function construirProxyUrl(src, idLocal) {
        if (!src) return src;
        const apiBase = window.SoundlyConfig?.API_BASE_URL || 'http://localhost:8080/api';
        const esUrlExterna = /^https?:\/\//.test(src) &&
                             !src.includes('localhost') &&
                             !src.includes('127.0.0.1');
        if (esUrlExterna && idLocal) {
            return `${apiBase}/audio/proxy/track/${idLocal}`;
        }
        if (!esUrlExterna) return src;
        return `${apiBase}/audio/proxy?url=${encodeURIComponent(src)}`;
    }

    function esMismaFuenteActiva(cancion) {
        if (!audio.src || !cancion?.src) return false;
        const proxyUrl = construirProxyUrl(cancion.src, cancion.id);
        return audio.src === proxyUrl ||
               audio.src.includes(proxyUrl) ||
               (cancion.id && audio.src.includes(String(cancion.id)));
    }

    function audioEstaActivo() {
        return Boolean(audio.src && audio.src !== window.location.href);
    }

    // ── HELPERS DE VISTA ──────────────────────────────────────────────────
    function fmt(segundos) {
        if (!segundos || isNaN(segundos)) return '0:00';
        const m = Math.floor(segundos / 60);
        const s = String(Math.floor(segundos % 60)).padStart(2, '0');
        return `${m}:${s}`;
    }

    function setTexto(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    function toggleClass(id, cls, condicion) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle(cls, condicion);
    }

    function actualizarVisibilidad() {
        const playerBar = document.getElementById('global-player-bar');
        if (!playerBar) return;
        playerBar.classList.toggle('player-visible', estado.lista.length > 0);
    }

    function actualizarUI() {
        const c = estado.lista[estado.idx];
        actualizarVisibilidad();
        if (!c) return;

        const playerBar = document.getElementById('global-player-bar');
        if (playerBar) playerBar.classList.toggle('is-playing', estado.playing);

        const npArt = document.getElementById('np-art');
        if (npArt) {
            npArt.src = c.img;
            npArt.alt = c.titulo;
            npArt.classList.toggle('spinning', estado.playing);
        }

        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);

        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) {
            btnPlay.innerHTML = estado.playing
                ? '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>';
        }

        setTexto('p-total', fmt(c.duracion));
        toggleClass('btn-shuffle', 'active', estado.shuffle);
        toggleClass('btn-repeat',  'active', estado.repeat);

        const btnLike = document.querySelector('.btn-like');
        if (btnLike) btnLike.setAttribute('data-id', c.id);

        const volSlider = document.getElementById('vol-slider');
        if (volSlider) {
            const pct = Math.round(estado.volumen * 100);
            volSlider.value = pct;
            volSlider.style.setProperty('--vol-pct', pct + '%');
        }

        actualizarProgreso();

        // ── ACTUALIZACIÓN DEL MODAL (FULL-SCREEN PLAYER) ──
        // Puede que el HTML use 'fs-player-overlay' o 'full-screen-player'. Verificamos ambos.
        const modalId = document.getElementById('fs-player-overlay') ? '#fs-player-overlay' : '#full-screen-player';
        const modal = document.querySelector(modalId);
        
        if (modal) {
            // Usamos querySelector dentro del modal para estar seguros de no chocar con otros elementos
            const fspTitle  = modal.querySelector('#fsp-title');
            const fspArtist = modal.querySelector('#fsp-artist');
            const fspCover  = modal.querySelector('#fsp-cover');
            const fspPlay   = modal.querySelector('#fsp-play');
            const fspShuffle = modal.querySelector('#fsp-shuffle');
            const fspRepeat  = modal.querySelector('#fsp-repeat');
            
            if (fspTitle) fspTitle.textContent = c.titulo || 'Sin título';
            if (fspArtist) fspArtist.textContent = c.artista || 'Artista desconocido';
            if (fspCover) {
                fspCover.src = c.img;
                fspCover.alt = c.titulo;
            }
            
            if (fspPlay) {
                const playBtnSvg = estado.playing
                    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
                    : '<polygon points="5,3 19,12 5,21"/>';
                fspPlay.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">${playBtnSvg}</svg>`;
            }
            
            if (fspShuffle) fspShuffle.style.color = estado.shuffle ? '#1db954' : 'rgba(255,255,255,0.45)';
            if (fspRepeat) fspRepeat.style.color = estado.repeat ? '#1db954' : 'rgba(255,255,255,0.45)';
            
            if (estado.playing) {
                modal.classList.add('fsp-is-playing');
                if (fspCover) {
                    fspCover.classList.add('fsp-spinning');
                    fspCover.classList.remove('fsp-paused');
                }
            } else {
                modal.classList.remove('fsp-is-playing');
                if (fspCover) {
                    fspCover.classList.remove('fsp-spinning');
                    fspCover.classList.add('fsp-paused');
                }
            }
        }
    }

    /** Solo DOM — nunca modifica el objeto Audio si ya está reproduciendo. */
    function syncUI() {
        if (audioEstaActivo() && !audio.paused) {
            estado.playing = true;
        } else if (audioEstaActivo() && audio.paused) {
            estado.playing = false;
        }
        actualizarUI();
        window.dispatchEvent(new CustomEvent('soundly:ui-sync', {
            detail: { playing: estado.playing, idx: estado.idx },
        }));
    }

    function actualizarProgreso() {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        
        // Footer
        const fill = document.getElementById('p-fill');
        const cur  = document.getElementById('p-current');
        if (fill) fill.style.width = pct + '%';
        if (cur)  cur.textContent  = fmt(audio.currentTime);

        // Modal
        const fspFill = document.getElementById('fsp-fill');
        const fspCur  = document.getElementById('fsp-current');
        if (fspFill) fspFill.style.width = pct + '%';
        if (fspCur)  fspCur.textContent  = fmt(audio.currentTime);
    }

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
            actualizarUI();
        }
    }

    function notificarCambio() {
        const c = estado.lista[estado.idx];
        window.dispatchEvent(new CustomEvent('soundly:cancion-cambio', {
            detail: { cancion: c, idx: estado.idx },
        }));
        notificarEstado();
    }

    function notificarEstado() {
        window.dispatchEvent(new CustomEvent('soundly:estado-cambio', {
            detail: { playing: estado.playing, idx: estado.idx, lista: estado.lista },
        }));
    }

    async function registrarReproduccion(cancionId) {
        try {
            await fetch(`${window.SoundlyConfig.API_BASE_URL}/canciones/${cancionId}/reproducir`, { method: 'POST' });
        } catch (e) { /* silencioso */ }
    }

    function mostrarToastError(mensaje) {
        let toast = document.getElementById('sp-toast-error');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sp-toast-error';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            Object.assign(toast.style, {
                position: 'fixed', bottom: '100px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(20, 10, 40, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(167, 139, 250, 0.35)',
                color: '#e9d5ff', padding: '10px 20px', borderRadius: '999px',
                fontSize: '0.82rem', fontWeight: '500',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: '9999',
                transition: 'opacity 0.3s ease', pointerEvents: 'none', whiteSpace: 'nowrap',
            });
            document.body.appendChild(toast);
        }
        clearTimeout(toast._timer);
        toast.textContent = `⚠️  ${mensaje}`;
        toast.style.opacity = '1';
        toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    // ── LÓGICA DE REPRODUCCIÓN ────────────────────────────────────────────
    function cargarEnAudio(cancion, tiempoInicial = 0) {
        if (!cancion || !cancion.src) {
            console.warn('[SoundlyPlayer] Canción sin src:', cancion?.titulo);
            mostrarToastError('Esta canción no tiene preview disponible.');
            return false;
        }
        const srcStr = String(cancion.src).trim();
        if (!srcStr || srcStr === 'undefined' || srcStr === 'null') {
            mostrarToastError('Esta canción no tiene preview disponible.');
            return false;
        }
        const proxyUrl = construirProxyUrl(srcStr, cancion.id);
        if (audio.src !== proxyUrl) {
            setLoadingState(true);
            audio.src = proxyUrl;
            audio.load();
        }
        if (tiempoInicial > 0) audio.currentTime = tiempoInicial;
        return true;
    }

    function reproducir(cancion) {
        const c = adaptarCancion(cancion);
        estado.lista = [c];
        estado.idx   = 0;

        // ── Actualizar UI INMEDIATAMENTE con los datos de la canción ────────
        // No esperar al .then() de audio.play() para que el footer siempre
        // refleje la canción seleccionada, incluso si el audio tarda en cargar
        // o falla por CORS / formato.
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        actualizarVisibilidad();

        const cargado = cargarEnAudio(c);
        if (!cargado) {
            // Sin src válido: mostramos la canción pero no reproducimos
            actualizarUI();
            return;
        }
        audio.play().then(() => {
            estado.playing = true;
            guardarEstado();
            actualizarUI();
            notificarCambio();
        }).catch(err => {
            console.error('[SoundlyPlayer] Error al reproducir:', err);
            estado.playing = false;
            setLoadingState(false);
            // Aun con error, dejamos la info de la canción visible en el footer
            actualizarUI();
            mostrarToastError('No se pudo reproducir la canción. Verificá tu conexión.');
        });
    }

    function reproducirLista(listaCrudos, indice = 0) {
        if (!Array.isArray(listaCrudos) || listaCrudos.length === 0) return;

        estado.lista = listaCrudos.map(adaptarCancion);
        estado.idx   = Math.max(0, Math.min(indice, estado.lista.length - 1));
        const c = estado.lista[estado.idx];

        // ── Actualizar UI INMEDIATAMENTE ────────────────────────────────────
        // El footer debe reflejar la canción seleccionada en el mismo tick del
        // click, sin depender de que audio.play() resuelva exitosamente.
        // Esto corrige el bug donde el reproductor se queda en el estado inicial
        // ('Seleccioná una canción') cuando el audio falla por CORS u otro error.
        setTexto('np-title',  c.titulo);
        setTexto('np-artist', c.artista);
        const npArt = document.getElementById('np-art');
        if (npArt) { npArt.src = c.img; npArt.alt = c.titulo; }
        actualizarVisibilidad();
        console.log('[SoundlyPlayer] reproducirLista → canción seleccionada:', c.titulo, '| img:', c.img, '| src:', c.src);

        const cargado = cargarEnAudio(c);
        if (!cargado) {
            // Sin src válido: mostramos la info pero no intentamos reproducir
            actualizarUI();
            return;
        }
        audio.play().then(() => {
            estado.playing = true;
            guardarEstado();
            actualizarUI();
            notificarCambio();
            if (c.id) registrarReproduccion(c.id);
        }).catch(err => {
            console.error('[SoundlyPlayer] Error al reproducir lista:', err);
            estado.playing = false;
            setLoadingState(false);
            // La info de la canción ya está visible — solo reportamos el error de audio
            actualizarUI();
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
        } else {
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
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        estado.idx = (estado.idx - 1 + estado.lista.length) % estado.lista.length;
        const c = estado.lista[estado.idx];
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
        notificarEstado();
    }

    function toggleRepeat() {
        estado.repeat = !estado.repeat;
        guardarEstado();
        toggleClass('btn-repeat', 'active', estado.repeat);
        notificarEstado();
    }

    function setVolumen(valor) {
        const vol = valor > 1 ? valor / 100 : valor;
        audio.volume = vol;
        estado.volumen = vol;
        guardarEstado();
        
        const pct = Math.round(vol * 100);
        
        // Footer
        const volBtn = document.getElementById('vol-btn');
        if (volBtn) {
            volBtn.classList.toggle('muted', vol === 0);
            if (!volBtn.querySelector('svg')) {
                volBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
            }
        }
        const volSlider = document.getElementById('vol-slider');
        if (volSlider) {
            volSlider.value = pct;
            volSlider.style.setProperty('--vol-pct', pct + '%');
        }

        // Modal
        const fspVolBtn = document.getElementById('fsp-vol-btn');
        if (fspVolBtn) {
            fspVolBtn.classList.toggle('muted', vol === 0);
            if (!fspVolBtn.querySelector('svg')) {
                fspVolBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
            }
        }
        const fspVolSlider = document.getElementById('fsp-vol-slider');
        if (fspVolSlider) {
            fspVolSlider.value = pct;
            fspVolSlider.style.setProperty('--vol-pct', pct + '%');
        }
    }

    function seekTo(event) {
        // Encontramos si hizo clic en el track del footer o del modal
        const track = event.target.closest('#progress-track') || event.target.closest('#fsp-progress-track');
        if (!track || !audio.duration) return;
        const rect = track.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
    }

    // ── LISTENERS DEL AUDIO NATIVO (una sola vez por instancia) ───────────
    function registerAudioListeners() {
        if (window.__soundlyAudioListenersAttached) return;
        window.__soundlyAudioListenersAttached = true;

        audio.addEventListener('timeupdate', actualizarProgreso);

        audio.addEventListener('ended', () => {
            if (estado.repeat) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } else {
                const esUltima = (!estado.shuffle && estado.idx === estado.lista.length - 1);
                if (esUltima) {
                    estado.playing = false;
                    siguiente();
                } else {
                    estado.playing = true;
                    siguiente();
                }
            }
        });

        audio.addEventListener('canplay', () => setLoadingState(false));
        audio.addEventListener('waiting', () => setLoadingState(true));
        audio.addEventListener('playing', () => { setLoadingState(false); estado.playing = true; actualizarUI(); });
        audio.addEventListener('play',  () => { estado.playing = true;  actualizarUI(); notificarEstado(); });
        audio.addEventListener('pause', () => { estado.playing = false; actualizarUI(); notificarEstado(); });

        audio.addEventListener('error', () => {
            const codigo = audio.error?.code;
            const msg = codigo === 4
                ? 'Preview no disponible para esta canción (formato no compatible o CORS).'
                : 'Error al cargar el audio. Intentá con otra canción.';
            console.error('[SoundlyPlayer] Error de audio (código', codigo, '):', audio.error);
            mostrarToastError(msg);
            estado.playing = false;
            setLoadingState(false);
            actualizarUI();
        });
    }

    // ── EVENT BUS: vistas → reproductor ───────────────────────────────────
    function registerEventBus() {
        if (window.__soundlyEventBusRegistered) return;
        window.__soundlyEventBusRegistered = true;

        window.addEventListener('soundly:reproducir', e => {
            if (e.detail?.cancion) reproducir(e.detail.cancion);
        });
        window.addEventListener('soundly:reproducir-lista', e => {
            if (e.detail?.lista) reproducirLista(e.detail.lista, e.detail.indice ?? 0);
        });
        window.addEventListener('soundly:toggle-play', () => togglePlay());
        window.addEventListener('soundly:siguiente',   () => siguiente());
        window.addEventListener('soundly:anterior',    () => anterior());
        window.addEventListener('soundly:toggle-shuffle', () => toggleShuffle());
        window.addEventListener('soundly:toggle-repeat',  () => toggleRepeat());
        window.addEventListener('soundly:set-volumen', e => {
            if (e.detail?.valor !== undefined) setVolumen(e.detail.valor);
        });
        window.addEventListener('soundly:seek', e => {
            if (e.detail?.event) seekTo(e.detail.event);
        });
        window.addEventListener('soundly:vista-cambiada', () => syncUI());
    }

    // ── CONTROLES DEL FOOTER (delegación — sobrevive al inject SPA) ───────
    function registerGlobalControls() {
        if (window.__soundlyControlsRegistered) return;
        window.__soundlyControlsRegistered = true;

        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-play'))    { togglePlay();    return; }
            if (e.target.closest('#btn-next'))    { siguiente();     return; }
            if (e.target.closest('#btn-prev'))    { anterior();      return; }
            if (e.target.closest('#btn-shuffle')) { toggleShuffle(); return; }
            if (e.target.closest('#btn-repeat'))  { toggleRepeat();  return; }
            if (e.target.closest('#progress-track')) { seekTo(e);    return; }
            if (e.target.closest('#fsp-play'))    { togglePlay();    return; }
            if (e.target.closest('#fsp-next'))    { siguiente();     return; }
            if (e.target.closest('#fsp-prev'))    { anterior();      return; }
            if (e.target.closest('#fsp-shuffle')) { 
                console.log('--- DEBUG EVENTOS ---: Clic en Shuffle (Modal)');
                toggleShuffle(); 
                return; 
            }
            if (e.target.closest('#fsp-repeat'))  { 
                console.log('--- DEBUG EVENTOS ---: Clic en Repeat (Modal)');
                toggleRepeat();  
                return; 
            }
            // ── LÓGICA DE BARRA DE PROGRESO (SOLO SI ES UN DIV/CONTENEDOR, NO UN INPUT) ──
            const fspTrack = e.target.closest('#fsp-progress-track');
            // Verificamos que no haya hecho clic en un slider (input) dentro o superpuesto
            if (fspTrack && e.target.tagName !== 'INPUT') {
                if (audio.duration) {
                    const rect = fspTrack.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    audio.currentTime = pct * audio.duration;
                }
                return;
            }
            if (e.target.closest('#fsp-close')) {
                console.log('--- DEBUG EVENTOS ---: Clic en Cerrar (Modal)');
                const fsp = document.getElementById('fs-player-overlay') || document.getElementById('full-screen-player');
                if (fsp) {
                    fsp.classList.add('fsp-closing');
                    setTimeout(() => {
                        fsp.style.display = 'none';
                        fsp.classList.remove('fsp-closing');
                    }, 350);
                }
                return;
            }
            if (e.target.closest('#vol-btn') || e.target.closest('#fsp-vol-btn')) {
                const volBtn = document.getElementById('vol-btn');
                const fspVolBtn = document.getElementById('fsp-vol-btn');
                if (audio.muted) {
                    audio.muted = false;
                    setVolumen(estado.volumen || 0.8);
                    if(volBtn) volBtn.classList.remove('muted');
                    if(fspVolBtn) fspVolBtn.classList.remove('muted');
                } else {
                    audio.muted = true;
                    if(volBtn) volBtn.classList.add('muted');
                    if(fspVolBtn) fspVolBtn.classList.add('muted');
                    document.getElementById('vol-slider')?.style.setProperty('--vol-pct', '0%');
                    document.getElementById('fsp-vol-slider')?.style.setProperty('--vol-pct', '0%');
                }
            }
        });

        // ── DELEGACIÓN DE EVENTOS PARA SLIDERS (INPUT TYPE="RANGE") ──
        document.addEventListener('input', (e) => {
            // Verificación estricta por ID para BARRA DE PROGRESO
            if (e.target.id === 'progress-track' || e.target.id === 'fsp-progress-track') {
                e.stopPropagation(); // Evitar propagación que cause conflictos
                if (audio.duration) {
                    // Lógica exclusiva para avanzar/retroceder canción
                    const pct = Number(e.target.value) / 100;
                    audio.currentTime = pct * audio.duration;
                }
            } 
            // Verificación estricta por ID para SLIDER DE VOLUMEN
            else if (e.target.id === 'vol-slider' || e.target.id === 'fsp-vol-slider') {
                e.stopPropagation(); // Aislar el evento de volumen del resto del reproductor
                // Lógica exclusiva para audio.volume
                setVolumen(Number(e.target.value));
            }
        });
    }

    // ── BOOTSTRAP: restaurar solo en cold start (recarga completa) ────────
    function bootstrapPlayback() {
        if (audioEstaActivo()) {
            estado.playing = !audio.paused;
            syncUI();
            return;
        }

        cargarEstadoGuardado();
        audio.volume = estado.volumen;

        if (!estado.lista.length) {
            syncUI();
            return;
        }

        const c = estado.lista[estado.idx];
        if (!c?.src) {
            syncUI();
            return;
        }

        if (esMismaFuenteActiva(c)) {
            syncUI();
            return;
        }

        cargarEnAudio(c, estado.currentTime || 0);
        if (estado.playing) {
            audio.play().then(() => syncUI()).catch(err => {
                console.warn('[SoundlyPlayer] Autoplay bloqueado tras recarga:', err);
                estado.playing = false;
                syncUI();
            });
        } else {
            syncUI();
        }
    }

    // ── PERSISTENCIA ──────────────────────────────────────────────────────
    window.addEventListener('beforeunload', guardarEstado);
    setInterval(() => {
        if (!audio.paused && audio.currentTime > 0) guardarEstado();
    }, 5000);

    // ── INICIALIZACIÓN ────────────────────────────────────────────────────
    registerAudioListeners();
    registerEventBus();
    registerGlobalControls();
    bootstrapPlayback();
    initUIEnhancements();

    // ── API PÚBLICA (retrocompatibilidad) ─────────────────────────────────
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
        syncUI,
        getEstado: () => ({ ...estado }),
        getCancionActual: () => estado.lista[estado.idx] || null,
        getCancionActualId: () => (estado.lista[estado.idx] ? estado.lista[estado.idx].id : null),
        getAudio: () => audio,
    };

    window.SoundlyEvents = {
        reproducir(cancion) {
            window.dispatchEvent(new CustomEvent('soundly:reproducir', { detail: { cancion } }));
        },
        reproducirLista(lista, indice = 0) {
            window.dispatchEvent(new CustomEvent('soundly:reproducir-lista', { detail: { lista, indice } }));
        },
        togglePlay()  { window.dispatchEvent(new CustomEvent('soundly:toggle-play')); },
        siguiente()   { window.dispatchEvent(new CustomEvent('soundly:siguiente')); },
        anterior()    { window.dispatchEvent(new CustomEvent('soundly:anterior')); },
        toggleShuffle() { window.dispatchEvent(new CustomEvent('soundly:toggle-shuffle')); },
        toggleRepeat()  { window.dispatchEvent(new CustomEvent('soundly:toggle-repeat')); },
        setVolumen(v) { window.dispatchEvent(new CustomEvent('soundly:set-volumen', { detail: { valor: v } })); },
    };

    window.__soundlyPlayerCore = { syncUI, bootstrapPlayback };
    window.__soundlyPlayerInitialized = true;

    // ── MEJORAS UI: FULLSCREEN PLAYER & PROFILE DROPDOWN ─────────────────
    function initUIEnhancements() {
        if (window.__soundlyUIEnhancementsInit) return;
        window.__soundlyUIEnhancementsInit = true;

        // ── PROFILE DROPDOWN ────────────────────────────────────────────
        let existingProfileDropdown = document.getElementById('profile-dropdown');
        let profileDropdown = existingProfileDropdown;

        if (!profileDropdown) {
            profileDropdown = document.createElement('div');
            profileDropdown.id = 'profile-dropdown';
            profileDropdown.className = 'profile-dropdown';
            
            let storedUser = null;
            try {
                storedUser = JSON.parse(localStorage.getItem('usuario_activo') || sessionStorage.getItem('usuarioLogueado') || sessionStorage.getItem('soundly_usuario') || 'null');
            } catch (e) {
                console.error("Error parsing user info:", e);
            }
            
            const rawEmail = storedUser?.email || storedUser?.correo || 'usuario@soundly.com';
            
            // Escape HTML to prevent XSS
            const escapeHTML = str => String(str).replace(/[&<>'"]/g, tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
            const userEmail = escapeHTML(rawEmail);

            profileDropdown.innerHTML = `<div style="font-weight: 600; margin-bottom: 4px;">Mi Perfil</div><div style="font-size: 12px; color: var(--sp-muted);">${userEmail}</div>`;
            document.body.appendChild(profileDropdown);
        }

        // ── GLOBAL CLICK LISTENERS (for profile dropdown and opening fullscreen) ─────────
        document.addEventListener('click', (e) => {
            const chip = e.target.closest('.user-chip');
            if (chip) {
                const rect = chip.getBoundingClientRect();
                profileDropdown.style.top = (rect.bottom + window.scrollY) + 'px';
                profileDropdown.style.right = (window.innerWidth - rect.right) + 'px';
                profileDropdown.classList.toggle('show');
            } else if (!e.target.closest('#profile-dropdown')) {
                profileDropdown.classList.remove('show');
            }

            const playerBar = e.target.closest('#global-player-bar');
            
            // Handle opening fullscreen player (from index.html)
            if (playerBar && !e.target.closest('button') && !e.target.closest('.gp-progress-row') && !e.target.closest('.gp-extras')) {
                e.stopPropagation();
                console.log('--- DEBUG REPRODUCTOR ---');
                console.log('Clic detectado en playerBar (intento de abrir overlay)');
                const fspOverlay = document.getElementById('fs-player-overlay');
                console.log('¿Existe #fs-player-overlay en el DOM?:', fspOverlay);
                const fullScreenIdOriginal = document.getElementById('full-screen-player');
                console.log('¿Existe #full-screen-player en el DOM?:', fullScreenIdOriginal);

                if (fspOverlay) {
                    fspOverlay.style.display = 'flex';
                    fspOverlay.classList.remove('fsp-closing');
                    actualizarUI();
                } else if (fullScreenIdOriginal) {
                    console.warn('Parece que el ID en el HTML sigue siendo full-screen-player y no fs-player-overlay.');
                    fullScreenIdOriginal.style.display = 'flex';
                    fullScreenIdOriginal.classList.remove('fsp-closing');
                    actualizarUI();
                }
            }
        });
        
        // Sync fullscreen player UI on state changes is handled natively by actualizarUI()
        // so we don't need redundant event listeners here anymore.
        
        const audio = window.__soundlyAudioInstance;
        audio.addEventListener('timeupdate', () => {
            const modalId = document.getElementById('fs-player-overlay') ? 'fs-player-overlay' : 'full-screen-player';
            const fullScreenPlayer = document.getElementById(modalId);
            
            if (!fullScreenPlayer || fullScreenPlayer.style.display === 'none') return;
            
            const cur = audio.currentTime || 0;
            const tot = audio.duration || 0;
            
            const fspCurrent = document.getElementById('fsp-current');
            const fspTotal = document.getElementById('fsp-total');
            const fspFill = document.getElementById('fsp-fill');

            if (fspCurrent) fspCurrent.textContent = formatTime(cur);
            if (fspTotal) fspTotal.textContent = formatTime(tot);
            
            if (fspFill) {
                const pct = tot > 0 ? (cur / tot) * 100 : 0;
                fspFill.style.width = pct + '%';
            }
        });

        // Initial sync
        actualizarUI();
    }
    
    function formatTime(s) {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    }

})();
