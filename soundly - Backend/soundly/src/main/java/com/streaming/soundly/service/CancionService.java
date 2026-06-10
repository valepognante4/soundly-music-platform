package com.streaming.soundly.service;

import com.streaming.soundly.dto.CancionDTO;
import com.streaming.soundly.external.client.MusicApiClient;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.mapper.CancionMapper;
import com.streaming.soundly.model.Artista;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.model.Usuario;
import com.streaming.soundly.repository.CancionRepository;
import com.streaming.soundly.repository.UsuarioRepository;
import com.streaming.soundly.service.ICancionService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CancionService implements ICancionService {

    private final CancionRepository cancionRepository;
    private final UsuarioRepository usuarioRepository;
    private final MusicApiClient musicApiClient;
    // 1. Agregamos el servicio de artistas
    private final IArtistaService artistaService;

    public CancionService(CancionRepository cancionRepository,
                          UsuarioRepository usuarioRepository,
                          MusicApiClient musicApiClient,
                          IArtistaService artistaService) { // Inyección
        this.cancionRepository = cancionRepository;
        this.usuarioRepository = usuarioRepository;
        this.musicApiClient = musicApiClient;
        this.artistaService = artistaService;
    }

    @Override
    @Transactional
    public CancionDTO agregarDesdeApi(String idDeezer) {
        ExternalCancionDTO externalDto = musicApiClient.getCancionExterna(idDeezer);

        if (externalDto == null) {
            throw new EntityNotFoundException("No se encontró la canción en la API externa con ID: " + idDeezer);
        }

        Optional<Cancion> cancionExistente = cancionRepository.findByExternalId(externalDto.getId());
        if (cancionExistente.isPresent()) {
            return CancionMapper.toDTO(cancionExistente.get());
        }

        // --- Lógica única y limpia ---

        // 1. Obtener/Crear Artista (Seguro)
        String nombreArtista = (externalDto.getArtist() != null) ? externalDto.getArtist().getName() : "Artista Desconocido";
        // Le pasamos el nombre Y el objeto DTO del artista que viene de la API
        Artista artista = artistaService.obtenerOCrearArtista(nombreArtista, externalDto.getArtist());

        // 2. Mapear canción
        Cancion nuevaCancion = CancionMapper.toEntity(externalDto);

        // 3. Asegurar campos (usando los datos validados)
        nuevaCancion.setTitulo(externalDto.getTitle());
        nuevaCancion.setImagenUrl(externalDto.getCoverUrl());
        nuevaCancion.setArtista(artista);

        // 4. Guardar
        Cancion guardada = cancionRepository.save(nuevaCancion);

        return CancionMapper.toDTO(guardada);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> buscarConFiltros(String titulo, String artista, String genero) {
        // Cuando agregues las queries personalizadas en tu repositorio, mapearás la lista así:
        List<Cancion> canciones = cancionRepository.findAll(); // Ejemplo base

        return canciones.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void incrementarReproduccion(Long id) {
        Cancion cancion = cancionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        cancion.setContadorReproducciones(cancion.getContadorReproducciones() + 1);
        cancionRepository.save(cancion);
    }

    @Override
    @Transactional
    public boolean alternarFavorito(Long cancionId, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));
        Cancion cancion = cancionRepository.findById(cancionId)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        boolean esFavorito;
        if (usuario.getCancionesFavoritas().contains(cancion)) {
            usuario.getCancionesFavoritas().remove(cancion);
            esFavorito = false;
        } else {
            usuario.getCancionesFavoritas().add(cancion);
            esFavorito = true;
        }
        usuarioRepository.save(usuario);
        return esFavorito;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CancionDTO> obtenerCancionesDestacadas() {
        // Usamos el nuevo método con JOIN FETCH
        List<Cancion> destacadas = cancionRepository.findAllWithArtista();

        return destacadas.stream()
                .map(CancionMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CancionDTO guardar(CancionDTO cancionDTO) {
        Cancion cancion = new Cancion();
        cancion.setTitulo(cancionDTO.getTitulo());
        cancion.setDuracion(cancionDTO.getDuracion());
        cancion.setImagenUrl(cancionDTO.getImagenUrl());
        cancion.setArchivoUrl(cancionDTO.getArchivoUrl());
        cancion.setContadorReproducciones(0); // Inicializa en cero seguro

        Cancion guardada = cancionRepository.save(cancion);

        // Retornamos el DTO real e idéntico de la BD con su ID
        return CancionMapper.toDTO(guardada);
    }

    @Override
    @Transactional
    public CancionDTO actualizarMetadata(Long id, CancionDTO cancionDTO) {
        Cancion cancion = cancionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Canción no encontrada"));

        cancion.setTitulo(cancionDTO.getTitulo());
        cancion.setDuracion(cancionDTO.getDuracion());
        cancion.setImagenUrl(cancionDTO.getImagenUrl());
        cancion.setArchivoUrl(cancionDTO.getArchivoUrl());

        Cancion actualizada = cancionRepository.save(cancion);

        // Retornamos los datos frescos actualizados
        return CancionMapper.toDTO(actualizada);
    }

    @Override
    @Transactional
    public void eliminarDelCatalogo(Long id) {
        if (!cancionRepository.existsById(id)) {
            throw new EntityNotFoundException("Canción no encontrada");
        }
        cancionRepository.deleteById(id);
    }
}
