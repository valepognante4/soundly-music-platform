/**
 * config.js — Configuración global del frontend de Soundly.
 *
 * Este archivo DEBE cargarse antes que cualquier otro script JS.
 * Expone window.SoundlyConfig para que todos los módulos puedan
 * acceder a la URL base de la API sin URLs hardcodeadas.
 *
 * Detecta automáticamente el entorno (desarrollo local vs producción en Vercel)
 * y configura la URL base de la API en consecuencia.
 */

// Detectar entorno: producción en Vercel o desarrollo local
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

window.SoundlyConfig = {
    /** URL base de la API REST del backend Spring Boot */
    API_BASE_URL: isProduction 
        ? 'https://tu-url-de-railway.up.railway.app/api'  // ← REEMPLAZA ESTA URL POR LA DE TU BACKEND EN RAILWAY
        : 'http://localhost:8080/api'                     // URL para desarrollo local
};
