package com.streaming.soundly.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "cancion")
@NoArgsConstructor
@AllArgsConstructor
public class Cancion {

    @Id
    @GeneratedValue( strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private Long externalId;
    private String titulo;
    private int duracion;
    private String imagenUrl;

    @Column(columnDefinition = "TEXT") // Esto le dice a MySQL que use un tipo de dato grande
    private String archivoUrl;

    private Integer contadorReproducciones;


    @ManyToOne
    @JoinColumn(name = "artista_id", nullable = false) // Crea la clave foránea en la tabla canciones
    private Artista artista;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private Album album;

    @ManyToMany(mappedBy = "cancionesFavoritas")
    private List<Usuario> usuariosQueLeDieronLike;

}
