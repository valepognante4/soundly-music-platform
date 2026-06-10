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
                window.location.href = 'home.html';
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
        enlaceOlvido.addEventListener('click', (e) => {
            e.preventDefault();

            Swal.fire({
                title: 'Recuperar contraseña',
                text: 'Ingresá tu correo electrónico para enviarte las instrucciones:',
                input: 'email',
                inputPlaceholder: 'tu-correo@email.com',
                background: '#121212',
                color: '#fff',
                confirmButtonColor: '#a855f7',
                confirmButtonText: 'Enviar instrucciones',
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                cancelButtonColor: '#374151'
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Correo enviado',
                        text: `Te enviamos un enlace de recuperación a: ${result.value}`,
                        background: '#121212',
                        color: '#fff',
                        confirmButtonColor: '#a855f7',
                        timer: 3000
                    });

                }
            });
        });
    }

});