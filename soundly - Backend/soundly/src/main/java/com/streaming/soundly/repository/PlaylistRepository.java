package com.streaming.soundly.repository;

import com.streaming.soundly.model.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    // Trae de la base de datos únicamente las playlists que pertenecen a un usuario
    // Usamos LEFT JOIN FETCH para recuperar las playlists incluso si no tienen canciones (tabla playlist_canciones vacía)
    @Query("SELECT DISTINCT p FROM Playlist p LEFT JOIN FETCH p.canciones WHERE p.usuario.id = :usuarioId")
    List<Playlist> findByUsuarioId(@Param("usuarioId") Long usuarioId);
}
