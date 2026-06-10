package com.streaming.soundly.repository;

import com.streaming.soundly.model.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    // Trae de la base de datos únicamente las playlists que pertenecen a un usuario en particular
    List<Playlist> findByUsuarioId(Long usuarioId);
}
