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

    @org.springframework.data.jpa.repository.Query("""
            SELECT DISTINCT a FROM Artista a
            LEFT JOIN FETCH a.albumes al
            LEFT JOIN FETCH al.canciones
            WHERE a.id = :id
            """)
    Optional<Artista> findByIdWithAlbumesAndCanciones(@org.springframework.data.repository.query.Param("id") Long id);
}
