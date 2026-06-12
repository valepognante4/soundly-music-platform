package com.streaming.soundly.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entidad que almacena tokens temporales de recuperación de contraseña.
 * Cada token tiene una expiración de 1 hora y está asociado a un único usuario.
 */
@Getter @Setter
@NoArgsConstructor
@Entity
@Table(name = "password_reset_token")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Token UUID único generado para la recuperación. */
    @Column(nullable = false, unique = true)
    private String token;

    /** Usuario al que pertenece este token. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Fecha y hora en que expira el token (1 hora desde su creación). */
    @Column(nullable = false)
    private LocalDateTime expiracion;

    /** Indica si el token ya fue utilizado para evitar reutilizaciones. */
    @Column(nullable = false)
    private boolean utilizado = false;

    public PasswordResetToken(String token, Usuario usuario, LocalDateTime expiracion) {
        this.token = token;
        this.usuario = usuario;
        this.expiracion = expiracion;
    }

    /** Verifica si el token ya expiró o ya fue usado. */
    public boolean esValido() {
        return !utilizado && LocalDateTime.now().isBefore(expiracion);
    }
}
