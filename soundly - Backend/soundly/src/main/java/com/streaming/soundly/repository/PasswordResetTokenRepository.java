package com.streaming.soundly.repository;

import com.streaming.soundly.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    /** Invalida todos los tokens anteriores del usuario para evitar tokens huérfanos. */
    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.utilizado = true WHERE p.usuario.id = :usuarioId AND p.utilizado = false")
    void invalidarTokensAnteriores(@Param("usuarioId") Long usuarioId);

    /** Limpieza periódica de tokens expirados (útil para un @Scheduled si se desea). */
    @Modifying
    @Query("DELETE FROM PasswordResetToken p WHERE p.expiracion < :ahora")
    void eliminarTokensExpirados(@Param("ahora") LocalDateTime ahora);
}
