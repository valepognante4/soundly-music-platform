package com.streaming.soundly.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Set;
import java.util.Objects;
@Getter
@Setter
@Entity
@Table(name = "artista")
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
    private Set<Cancion> canciones = new java.util.HashSet<>();

    @OneToMany(mappedBy = "artista", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Album> albumes = new java.util.HashSet<>();

    // Métodos de conveniencia para asegurar la bidireccionalidad
    public void addCancion(Cancion cancion) {
        this.canciones.add(cancion);
        cancion.setArtista(this);
    }

    public void removeCancion(Cancion cancion) {
        this.canciones.remove(cancion);
        cancion.setArtista(null);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Artista)) return false;
        Artista artista = (Artista) o;
        return id != null && id.equals(artista.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
