package com.streaming.soundly.repository;

import com.streaming.soundly.model.Cancion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CancionRepository extends JpaRepository<Cancion, Long> {

    // 1. Consulta estándar para buscar por título (incluyendo al artista para evitar el null)
    @Query("SELECT c FROM Cancion c JOIN FETCH c.artista WHERE LOWER(c.titulo) LIKE LOWER(CONCAT('%', :titulo, '%'))")
    List<Cancion> findByTituloContainingIgnoreCase(@Param("titulo") String titulo);

    // 2. Consulta para obtener TODO el catálogo completo (usado en el listar)
    @Query("SELECT c FROM Cancion c LEFT JOIN FETCH c.artista")
    List<Cancion> findAllWithArtista();

    // 3. Tu búsqueda por ID que ya tenías
    Optional<Cancion> findByExternalId(Long id);

    // 4. Carga masiva de external_ids existentes para un artista (elimina N+1 selects)
    @Query("SELECT c.externalId FROM Cancion c WHERE c.artista.id = :artistaId")
    List<Long> findAllExternalIdsByArtistaId(@Param("artistaId") Long artistaId);

    // 5. Carga masiva de todos los external_ids existentes en la tabla (para importación bulk)
    @Query("SELECT c.externalId FROM Cancion c WHERE c.externalId IN :externalIds")
    List<Long> findExternalIdsByExternalIdIn(@Param("externalIds") List<Long> externalIds);

    // 6. Búsqueda por nombre de género (case-insensitive) con JOIN FETCH del artista
    @Query("SELECT c FROM Cancion c JOIN FETCH c.artista a JOIN a.genero g WHERE LOWER(g.nombre) LIKE LOWER(CONCAT('%', :genero, '%'))")
    List<Cancion> findByGeneroNombreContainingIgnoreCase(@Param("genero") String genero);

    // 7. Búsqueda por ID de género con JOIN FETCH del artista
    @Query("SELECT c FROM Cancion c JOIN FETCH c.artista a JOIN a.genero g WHERE g.id = :generoId")
    List<Cancion> findByGeneroId(@Param("generoId") Long generoId);

    // 8. Búsqueda combinada: título (parcial) + género (ID exacto)
    // Permite filtrar simultáneamente por texto libre Y por género seleccionado
    @Query("SELECT c FROM Cancion c JOIN FETCH c.artista a JOIN a.genero g " +
           "WHERE LOWER(c.titulo) LIKE LOWER(CONCAT('%', :titulo, '%')) " +
           "AND g.id = :generoId")
    List<Cancion> findByTituloContainingAndGeneroId(@Param("titulo") String titulo,
                                                     @Param("generoId") Long generoId);

    // 9. Búsqueda combinada: nombre artista (parcial) + género (ID exacto)
    @Query("SELECT c FROM Cancion c JOIN FETCH c.artista a JOIN a.genero g " +
           "WHERE LOWER(a.nombre) LIKE LOWER(CONCAT('%', :artista, '%')) " +
           "AND g.id = :generoId")
    List<Cancion> findByArtistaContainingAndGeneroId(@Param("artista") String artista,
                                                      @Param("generoId") Long generoId);
}
