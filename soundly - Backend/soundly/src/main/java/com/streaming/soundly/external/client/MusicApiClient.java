package com.streaming.soundly.external.client;

import com.streaming.soundly.external.dto.ExternalAlbumDTO;
import com.streaming.soundly.external.dto.ExternalAlbumListDTO;
import com.streaming.soundly.external.dto.ExternalArtistaDTO;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.external.dto.ExternalTrackListDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
@Component
public class MusicApiClient {
    private static final Logger log = LoggerFactory.getLogger(MusicApiClient.class);
    private static final String DEEZER_BASE_URL = "https://api.deezer.com";
    private final RestTemplate restTemplate;
    public MusicApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    /**
     * Obtiene los datos de una canción desde el endpoint /track/{id} de Deezer.
     * NOTA: El artista que viene dentro de este response NO trae picture_medium ni genres.
     */
    public ExternalCancionDTO getCancionExterna(String id) {
        String url = DEEZER_BASE_URL + "/track/" + id;
        // Obtienes el objeto directamente
        ExternalCancionDTO respuesta = restTemplate.getForObject(url, ExternalCancionDTO.class);
        // Si necesitas ver qué llegó, logueas el objeto (Spring lo convierte a String automáticamente)
        log.info("[Deezer] Respuesta recibida: {}", respuesta);
        return respuesta;
    }
    /**
     * Obtiene los datos COMPLETOS de un artista desde /artist/{id}.
     * Este endpoint sí devuelve picture_medium y genres.
     *
     * @param artistaId el ID externo del artista en Deezer
     * @return ExternalArtistaDTO con foto y géneros, o null si falla la llamada
     */
    public ExternalArtistaDTO getArtistaExterno(Long artistaId) {
        if (artistaId == null) {
            log.warn("[Deezer] Se intentó obtener artista con id null, se omite la llamada.");
            return null;
        }
        String url = DEEZER_BASE_URL + "/artist/" + artistaId;
        log.info("[Deezer] Consultando artista completo: {}", url);
        try {
            return restTemplate.getForObject(url, ExternalArtistaDTO.class);
        } catch (HttpClientErrorException e) {
            log.warn("[Deezer] No se pudo obtener el artista con id {}: {} {}",
                    artistaId, e.getStatusCode(), e.getMessage());
            return null;
        }
    }
    /**
     * Obtiene las canciones destacadas (top tracks) de un artista desde /artist/{id}/top.
     *
     * @param artistaId el ID externo del artista en Deezer
     * @return ExternalTrackListDTO con la lista de canciones, o null si falla
     */
    public ExternalTrackListDTO getTopCancionesArtista(Long artistaId) {
        if (artistaId == null) return null;
        // Limitamos a 50 canciones para no sobrecargar, pero Deezer permite configurar el 'limit'
        String url = DEEZER_BASE_URL + "/artist/" + artistaId + "/top?limit=50";
        log.info("[Deezer] Consultando canciones del artista: {}", url);
        try {
            return restTemplate.getForObject(url, ExternalTrackListDTO.class);
        } catch (HttpClientErrorException e) {
            log.warn("[Deezer] No se pudieron obtener las canciones del artista {}: {} {}",
                    artistaId, e.getStatusCode(), e.getMessage());
            return null;
        }
    }

    public ExternalAlbumListDTO getAlbumesArtista(Long artistaId) {
        if (artistaId == null) return null;
        String url = DEEZER_BASE_URL + "/artist/" + artistaId + "/albums?limit=5";
        log.info("[Deezer] Consultando álbumes del artista: {}", url);
        try {
            return restTemplate.getForObject(url, ExternalAlbumListDTO.class);
        } catch (HttpClientErrorException e) {
            log.warn("[Deezer] No se pudieron obtener los álbumes del artista {}: {} {}",
                    artistaId, e.getStatusCode(), e.getMessage());
            return null;
        }
    }

    public ExternalAlbumDTO getAlbumExterno(Long albumId) {
        if (albumId == null) return null;
        String url = DEEZER_BASE_URL + "/album/" + albumId;
        log.info("[Deezer] Consultando detalle del álbum: {}", url);
        try {
            return restTemplate.getForObject(url, ExternalAlbumDTO.class);
        } catch (HttpClientErrorException e) {
            log.warn("[Deezer] No se pudo obtener el álbum {}: {} {}",
                    albumId, e.getStatusCode(), e.getMessage());
            return null;
        }
    }
}

