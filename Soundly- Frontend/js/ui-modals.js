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