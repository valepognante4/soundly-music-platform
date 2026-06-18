// Custom confirmation modal
function mostrarModalConfirmacion(mensaje, onConfirmar, onCancelar) {
    // Check if modal already exists, create if not
    let modal = document.getElementById('modal-confirmar');
    if (!modal) {
        const modalHTML = `
        <div id="modal-confirmar" class="modal-overlay">
            <div class="modal-content">
                <h2>Confirmación</h2>
                <p id="modal-confirmar-mensaje"></p>
                <div class="modal-actions">
                    <button id="btn-confirmar-cancelar" class="btn-secundario">Cancelar</button>
                    <button id="btn-confirmar-aceptar" class="btn-primario">Aceptar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('modal-confirmar');
    }

    // Set message
    document.getElementById('modal-confirmar-mensaje').textContent = mensaje;

    // Show modal
    modal.style.display = 'flex';

    // Remove old listeners by cloning buttons
    const btnCancelar = document.getElementById('btn-confirmar-cancelar');
    const btnAceptar = document.getElementById('btn-confirmar-aceptar');
    const newBtnCancelar = btnCancelar.cloneNode(true);
    const newBtnAceptar = btnAceptar.cloneNode(true);
    btnCancelar.parentNode.replaceChild(newBtnCancelar, btnCancelar);
    btnAceptar.parentNode.replaceChild(newBtnAceptar, btnAceptar);

    // Add new listeners
    newBtnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof onCancelar === 'function') onCancelar();
    });

    newBtnAceptar.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof onConfirmar === 'function') onConfirmar();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            if (typeof onCancelar === 'function') onCancelar();
        }
    });
}

// Initialize app modals
document.addEventListener('DOMContentLoaded', () => {
    const modalHTML = `
    <div id="modal-crear-playlist" class="modal-overlay">
        <div class="modal-content">
            <h2>Crear Nueva Playlist</h2>
            <input type="text" id="input-nombre-playlist" placeholder="Nombre de la playlist">
            <div id="modal-error-message" style="color: #ff4d4d; margin-bottom: 10px; display: none;"></div>
            <div class="modal-actions">
                <button id="btn-cancelar" class="btn-secundario">Cancelar</button>
                <button id="btn-guardar" class="btn-primario">Guardar</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // Ahora aquí llamas a la lógica del modal que ya tenías
    inicializarModalCrear(); 
});