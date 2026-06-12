package com.streaming.soundly.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Habilita el procesamiento asíncrono en toda la aplicación.
 * Necesario para que @Async en EmailService funcione en un hilo separado
 * y no bloquee el hilo HTTP durante el envío del correo.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
    // Spring Boot crea automáticamente un ThreadPoolTaskExecutor por defecto.
    // Si se necesita configurar el pool (tamaño, prefijo de hilo, etc.),
    // se puede sobreescribir aquí con un @Bean de tipo Executor.
}
