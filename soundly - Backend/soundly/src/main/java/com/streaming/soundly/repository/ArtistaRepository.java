package com.streaming.soundly.repository;

import com.streaming.soundly.model.Artista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArtistaRepository extends JpaRepository<Artista, Long> {

    // Busca artistas por nombre (ej: si buscan "Cerati" o "cerati" lo encuentra igual)
    List<Artista> findByNombreContainingIgnoreCase(String nombre);

    boolean existsByNombre(String nombre);

    Optional<Artista> findByNombre(String nombre);

    List<Artista> findByGeneroIsNull();
}
