package com.streaming.soundly.repository;

import com.streaming.soundly.model.Usuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    // TIENE QUE DECIR EXACTAMENTE "existsByNombre"
    boolean existsByNombre(String nombre);

    boolean existsByEmail(@NotBlank(message = "El email es obligatorio") @Email(message = "El formato del email no es válido") String email);
}
