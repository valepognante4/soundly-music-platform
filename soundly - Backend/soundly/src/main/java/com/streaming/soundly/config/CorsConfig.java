package com.streaming.soundly.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuración global de CORS para Soundly.
 * Centraliza la política de orígenes permitidos en un único lugar,
 * eliminando la necesidad de @CrossOrigin en cada controlador.
 *
 * Origen permitido: http://127.0.0.1:5500 (Live Server de VS Code)
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // Puerto estándar de Live Server de VS Code
                        .allowedOrigins("http://127.0.0.1:5500")
                        // Métodos HTTP necesarios para una API REST completa
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        // Cabeceras estándar que el frontend puede enviar
                        .allowedHeaders("*")
                        // Permitir cookies / tokens de sesión si se necesitan en el futuro
                        .allowCredentials(true)
                        // El preflight se cachea por 1 hora (3600 segundos)
                        .maxAge(3600);
            }
        };
    }
}
