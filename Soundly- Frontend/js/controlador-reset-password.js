/**
 * controlador-reset-password.js — Soundly
 * ─────────────────────────────────────────────────────────────────────────────
 * Controla la página reset-password.html (Paso 2 del flujo de recuperación).
 *
 * Responsabilidades:
 *   1. Extraer el ?token= de la URL al cargar la página.
 *   2. Bloquear la página si no hay token (redirige al login).
 *   3. Manejar el submit del formulario: validar, llamar al modelo y dar feedback.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ─── 1. EXTRAER TOKEN DE LA URL ───────────────────────────────────────────
    // El enlace del correo tiene el formato: /reset-password.html?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');

    const contenedorError   = document.getElementById('error-token');
    const contenedorFormulario = document.getElementById('contenedor-formulario');

    // ─── 2. GUARDIA: si no hay token, mostrar error y no renderizar el form ───
    if (!token || token.trim() === '') {
        contenedorFormulario.style.display = 'none';
        contenedorError.style.display      = 'flex';
        contenedorError.querySelector('#mensaje-error-token').textContent =
            'Este enlace es inválido o está incompleto. Solicitá uno nuevo desde el login.';
        return; // Detiene toda la ejecución del controlador
    }

    // ─── 3. TOGGLE VISIBILIDAD DE CONTRASEÑA ─────────────────────────────────
    document.querySelectorAll('.toggle-password').forEach(boton => {
        boton.addEventListener('click', () => {
            const input = boton.closest('.input-group').querySelector('input');
            const esPassword = input.type === 'password';
            input.type        = esPassword ? 'text' : 'password';
            boton.textContent = esPassword ? '🙈' : '👁️';
        });
    });

    // ─── 4. SUBMIT DEL FORMULARIO ─────────────────────────────────────────────
    const formulario     = document.getElementById('form-reset-password');
    const btnSubmit      = document.getElementById('btn-reset');
    const inputPassword  = document.getElementById('nueva-password');
    const inputConfirm   = document.getElementById('confirmar-password');
    const errorInline    = document.getElementById('error-match');

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaPassword  = inputPassword.value.trim();
        const confirmPassword = inputConfirm.value.trim();

        // Validación client-side antes de tocar el servidor
        errorInline.style.display = 'none';

        if (nuevaPassword.length < 8) {
            mostrarErrorInline('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (nuevaPassword !== confirmPassword) {
            mostrarErrorInline('Las contraseñas no coinciden.');
            return;
        }

        // UI: bloquear botón y mostrar spinner
        btnSubmit.disabled     = true;
        btnSubmit.textContent  = 'Guardando...';
        btnSubmit.classList.add('loading');

        // ── Llamada al modelo (que llama al backend) ──
        const resultado = await GestorUsuarios.resetearPassword(token, nuevaPassword);

        btnSubmit.disabled    = false;
        btnSubmit.textContent = 'Guardar nueva contraseña';
        btnSubmit.classList.remove('loading');

        if (resultado.exito) {
            // Éxito: redirigir al login con feedback
            await Swal.fire({
                icon: 'success',
                title: '¡Contraseña actualizada!',
                text: 'Ya podés iniciar sesión con tu nueva contraseña.',
                background: '#121212',
                color: '#fff',
                confirmButtonColor: '#a855f7',
                confirmButtonText: 'Ir al login',
                timer: 4000,
                timerProgressBar: true
            });
            window.location.href = 'login.html';

        } else {
            // Error: token inválido, expirado, red o servidor
            const iconos = { token: 'warning', red: 'error', servidor: 'error' };
            const titulos = {
                token:    'Enlace inválido',
                red:      'Sin conexión',
                servidor: 'Error del servidor'
            };
            Swal.fire({
                icon:  iconos[resultado.motivo]  || 'error',
                title: titulos[resultado.motivo] || 'Error',
                text:  resultado.mensaje,
                background: '#121212',
                color: '#fff',
                confirmButtonColor: '#a855f7',
                footer: resultado.motivo === 'token'
                    ? '<a href="login.html" style="color:#a855f7;">Solicitá un nuevo enlace</a>'
                    : ''
            });
        }
    });

    // ─── HELPERS ──────────────────────────────────────────────────────────────

    function mostrarErrorInline(mensaje) {
        errorInline.textContent   = mensaje;
        errorInline.style.display = 'block';
        // Foco en el primer campo con problema para accesibilidad
        inputPassword.focus();
    }
});
