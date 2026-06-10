document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.querySelector('#form-registro');
    const linkTerminos = document.getElementById('link-terminos');
    const modal = document.getElementById('modal-terminos');
    const btnCerrar = document.getElementById('cerrar-modal');

    // Lógica del Modal
    linkTerminos.addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'block'; });
    btnCerrar.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    // Función de validación de edad completa
    function validarFechaNacimiento(fecha) {
        const hoy = new Date();
        const cumple = new Date(fecha);
        const anio = cumple.getFullYear();

        if (isNaN(cumple.getTime())) return { valida: false, mensaje: "Fecha no válida." };
        if (anio < 1910) return { valida: false, mensaje: "Año muy antiguo (mínimo 1910)." };
        if (cumple > hoy) return { valida: false, mensaje: "No podés haber nacido en el futuro." };

        let edad = hoy.getFullYear() - anio;
        if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) {
            edad--;
        }
        if (edad < 18) return { valida: false, mensaje: "Debes ser mayor de 18 años para Soundly." };
        return { valida: true };
    }

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = new FormData(formulario);
        const usuario = {
            apodo: datos.get('username'),
            correo: datos.get('email'),
            clave: datos.get('password'),
            nacimiento: datos.get('birthdate')
        };

        // 1. Validación de campos vacíos
        if (!usuario.apodo || !usuario.correo || !usuario.clave || !usuario.nacimiento) {
            return Swal.fire({ icon: 'warning', title: 'Atención', text: 'Por favor, completá todos los campos.', background: '#121212', color: '#fff' });
        }

        // 2. Validación de términos
        if (!datos.get('terms')) {
            return Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debes aceptar los términos.', background: '#121212', color: '#fff' });
        }

        // NUEVA VALIDACIÓN: Contraseña
        if (usuario.clave.length < 8) {
            return Swal.fire({ icon: 'error', title: 'Error', text: 'La contraseña debe tener al menos 8 caracteres.', background: '#121212', color: '#fff' });
        }

        // 3. Validación de edad (aquí está la lógica que faltaba)
        const checkFecha = validarFechaNacimiento(usuario.nacimiento);
        if (!checkFecha.valida) {
            return Swal.fire({ icon: 'error', title: 'Error', text: checkFecha.mensaje, background: '#121212', color: '#fff' });
        }

        // 4. Registro en el Backend
        try {
            if (await GestorUsuarios.yaExiste(usuario.correo)) {
                return Swal.fire({ icon: 'error', title: 'Ups', text: 'El correo ya existe.', background: '#121212', color: '#fff' });
            }
            await GestorUsuarios.registrar(usuario);
            Swal.fire({ icon: 'success', title: '¡Bienvenida!', text: 'Registro exitoso', background: '#121212', color: '#fff', timer: 2000 });
            setTimeout(() => window.location.href = 'home.html', 2000);
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al conectar con el servidor.', background: '#121212', color: '#fff' });
        }
    });
});