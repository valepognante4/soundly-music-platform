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
 * Orígenes permitidos:
 * - http://127.0.0.1:5500 (Live Server de VS Code - desarrollo local)
 * - https://soundly-music-platform-fkqu.vercel.app (Frontend desplegado en Vercel - producción)
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // Orígenes permitidos: desarrollo local y producción en Vercel
                        .allowedOrigins("http://127.0.0.1:5500", "https://soundly-music-platform-fkqu.vercel.app")
                        // Métodos HTTP necesarios para una API REST completa
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        // Cabeceras permitidas
                        .allowedHeaders("Content-Type", "Authorization")
                        // Permitir cookies / tokens de sesión
                        .allowCredentials(true)
                        // El preflight se cachea por 1 hora (3600 segundos)
                        .maxAge(3600);
            }
        };
    }
}
