/**
 * config.js — Configuración global del frontend de Soundly.
 *
 * Este archivo DEBE cargarse antes que cualquier otro script JS.
 * Expone window.SoundlyConfig para que todos los módulos puedan
 * acceder a la URL base de la API sin URLs hardcodeadas.
 *
 * Para cambiar el entorno (desarrollo / producción) basta con
 * modificar API_BASE_URL en este único lugar.
 */
window.SoundlyConfig = {
    /** URL base de la API REST del backend Spring Boot */
    API_BASE_URL: 'http://localhost:8080/api'
};
