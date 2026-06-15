document.addEventListener('DOMContentLoaded', () => {
    const formularioLogin = document.querySelector('#form-login');

    // 1. Convertimos la función en async para poder usar await
    formularioLogin.addEventListener('submit', async (e) => { 
        e.preventDefault();
        const datos = new FormData(formularioLogin);
        const correo = datos.get('email');
        const clave = datos.get('password');

        if (!correo || !clave) {
            alert("Ingresá tu correo y contraseña.");
            return;
        }

        // 2. Usamos el modelo para validar contra el servidor
        const resultado = await GestorUsuarios.validarLogin(correo, clave);

        if (resultado.exito) {
            // El usuario ya se guardó en localStorage dentro de GestorUsuarios.validarLogin
            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido de nuevo!',
                text: 'Preparando tu música...',
                background: '#121212',
                color: '#fff',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.href = 'index.html';
            });
        } else {
            // Mensajes específicos según el motivo del fallo
            const mensajes = {
                credenciales: 'El email o la contraseña son incorrectos.',
                servidor:     'El servidor respondió con un error. Intentá de nuevo.',
                red:          'No se pudo conectar con el servidor. ¿Está el backend corriendo?'
            };
            Swal.fire({
                icon: 'error',
                title: 'Error de ingreso',
                text: mensajes[resultado.motivo] || 'Error desconocido.',
                background: '#121212',
                color: '#fff',
                confirmButtonColor: '#a855f7'
            });
        }
    });

    const enlaceOlvido = document.querySelector('#recuperar-link');

    if (enlaceOlvido) {
        enlaceOlvido.addEventListener('click', async (e) => {
            e.preventDefault();

            // Paso A: pedir el email al usuario
            const { isConfirmed, value: email } = await Swal.fire({
                title: 'Recuperar contraseña',
                text: 'Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña.',
                input: 'email',
                inputPlaceholder: 'tu-correo@email.com',
                background: '#121212',
                color: '#fff',
                confirmButtonColor: '#a855f7',
                confirmButtonText: 'Enviar enlace',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                cancelButtonColor: '#374151',
                inputValidator: (value) => {
                    if (!value) return 'Ingresá tu email.';
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Formato de email inválido.';
                }
            });

            if (!isConfirmed || !email) return;

            // Paso B: loader mientras se hace el fetch
            Swal.fire({
                title: 'Enviando...',
                text: 'Estamos procesando tu solicitud.',
                background: '#121212',
                color: '#fff',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Paso C: llamada al backend
            const resultado = await GestorUsuarios.solicitarRecuperacion(email);

            // Paso D: feedback al usuario
            if (resultado.exito) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    html: `Revisá tu bandeja de <strong>${email}</strong>.<br>
                           El enlace expira en <strong>1 hora</strong>.`,
                    background: '#121212',
                    color: '#fff',
                    confirmButtonColor: '#a855f7',
                    confirmButtonText: 'Entendido'
                });
            } else {
                const textos = {
                    red:      'No se pudo conectar con el servidor. ¿Está el backend corriendo?',
                    servidor: 'El servidor respondió con un error. Intentá de nuevo más tarde.'
                };
                Swal.fire({
                    icon: 'error',
                    title: 'Algo salió mal',
                    text: textos[resultado.motivo] || resultado.mensaje,
                    background: '#121212',
                    color: '#fff',
                    confirmButtonColor: '#a855f7'
                });
            }
        });
    }

});