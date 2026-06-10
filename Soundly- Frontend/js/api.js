// Lee la URL base desde la configuración global (definida en js/config.js).
// Nunca hardcodees esta URL aquí — modifica config.js para cambiar el entorno.
const BASE_URL = window.SoundlyConfig.API_BASE_URL;

// Función para obtener canciones (la que ya tenías)
async function obtenerCancionesDesdeBackend() {
    try {
        const response = await fetch(`${BASE_URL}/canciones`);
        if (!response.ok) throw new Error('Error al conectar con el servidor');
        return await response.json();
    } catch (error) {
        console.error("Falló la carga:", error);
        return [];
    }
}

// NUEVA función para obtener categorías desde TU backend
async function obtenerCategoriasDesdeBackend() {
    try {
        // Asegúrate de que este endpoint exista en tu Spring Boot
        const response = await fetch(`${BASE_URL}/categorias`);
        if (!response.ok) throw new Error('No se pudieron cargar las categorías');
        return await response.json();
    } catch (error) {
        console.error("Falló la carga de categorías:", error);
        return []; // Retorna lista vacía si falla
    }
}