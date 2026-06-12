package com.streaming.soundly.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Expone BCryptPasswordEncoder como bean de Spring.
 * Separado en su propia clase para respetar el principio de responsabilidad única
 * y evitar dependencias circulares entre UsuarioService y otras configuraciones.
 *
 * Nota: solo usa spring-security-crypto (sin el autoconfigurador de Spring Security),
 * por lo que NO bloquea ningún endpoint ni activa el login form de Spring Security.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Strength 12: balance recomendado entre seguridad y rendimiento en producción.
        // Strength 10 es el default; 12 agrega ~4x más trabajo de hashing.
        return new BCryptPasswordEncoder(12);
    }
}
