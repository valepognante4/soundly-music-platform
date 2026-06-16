package com.streaming.soundly.repository;

import com.streaming.soundly.model.Album;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlbumRepository extends JpaRepository<Album, Long> {

    Optional<Album> findByExternalId(Long externalId);

    /**
     * FETCH JOIN que trae Artista y Canciones en una sola consulta,
     * evitando el problema N+1 y las LazyInitializationException.
     */
    @Query("""
            SELECT DISTINCT a FROM Album a
            LEFT JOIN FETCH a.artista
            LEFT JOIN FETCH a.canciones
            """)
    List<Album> findAllWithArtistaAndCanciones();
}
