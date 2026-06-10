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
@NoArgsConstructor
@AllArgsConstructor
public class Artista {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private Long externalId;

    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String fotoUrl;
    @ManyToOne
    @JoinColumn(name = "genero_id")
    private Genero genero;

    @OneToMany(mappedBy = "artista", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Cancion> canciones = new java.util.ArrayList<>();

    // Métodos de conveniencia para asegurar la bidireccionalidad
    public void addCancion(Cancion cancion) {
        this.canciones.add(cancion);
        cancion.setArtista(this);
    }

    public void removeCancion(Cancion cancion) {
        this.canciones.remove(cancion);
        cancion.setArtista(null);
    }
}
