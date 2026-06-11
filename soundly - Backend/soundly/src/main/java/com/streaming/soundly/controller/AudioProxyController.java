package com.streaming.soundly.controller;

import com.streaming.soundly.external.client.MusicApiClient;
import com.streaming.soundly.external.dto.ExternalCancionDTO;
import com.streaming.soundly.model.Cancion;
import com.streaming.soundly.repository.CancionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.List;

@RestController
@RequestMapping("/api/audio")
public class AudioProxyController {

    private static final Logger log = LoggerFactory.getLogger(AudioProxyController.class);

    private static final List<String> DOMINIOS_PERMITIDOS = List.of(
            "cdns-preview",
            "dzcdn.net",
            "deezer.com"
    );

    private final MusicApiClient musicApiClient;
    private final CancionRepository cancionRepository;

    public AudioProxyController(MusicApiClient musicApiClient, CancionRepository cancionRepository) {
        this.musicApiClient = musicApiClient;
        this.cancionRepository = cancionRepository;
    }

    /**
     * Nuevo enfoque dinámico: El frontend manda el ID local de la BD.
     * Nosotros buscamos su external_id, consultamos a Deezer para sacar una URL 
     * completamente fresca, y transmitimos esa. Así evitamos el error 403 por URLs caducadas.
     */
    @GetMapping("/proxy/track/{id}")
    public ResponseEntity<InputStreamResource> proxyAudioById(
            @PathVariable Long id,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {

        log.info("[AudioProxy] 🎧 Solicitud de reproducción dinámica para canción local ID: {}", id);

        // 1. Obtener la canción de la Base de Datos Local
        Cancion cancion = cancionRepository.findById(id).orElse(null);
        if (cancion == null || cancion.getExternalId() == null) {
            log.error("[AudioProxy] ❌ Canción no encontrada o sin external_id. ID local: {}", id);
            return ResponseEntity.notFound().build();
        }

        Long externalId = cancion.getExternalId();

        // 2. Consultar la API de Deezer para obtener una preview_url fresca en tiempo real
        ExternalCancionDTO externalDTO = musicApiClient.getCancionExterna(String.valueOf(externalId));
        if (externalDTO == null || externalDTO.getPreviewUrl() == null || externalDTO.getPreviewUrl().isBlank()) {
            log.error("[AudioProxy] ❌ Deezer no devolvió preview_url (quizás no está disponible) para external_id: {}", externalId);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }

        String freshUrl = externalDTO.getPreviewUrl();
        log.info("[AudioProxy] 🚀 URL Fresca generada por Deezer: {}", freshUrl);

        // 3. Abrir el stream a esa URL fresca
        return retransmitirAudio(freshUrl, rangeHeader);
    }

    /**
     * Mantenemos el proxy por URL clásico por compatibilidad o por si hay archivos en S3
     */
    @GetMapping("/proxy")
    public ResponseEntity<InputStreamResource> proxyAudio(
            @RequestParam String url,
            @RequestHeader(value = "Range", required = false) String rangeHeader) {
        return retransmitirAudio(url, rangeHeader);
    }

    /**
     * Helper centralizado para retransmitir cualquier URL externa
     */
    private ResponseEntity<InputStreamResource> retransmitirAudio(String url, String rangeHeader) {
        if (!esDominioPermitido(url)) {
            log.warn("[AudioProxy] Dominio no autorizado bloqueado: {}", url);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            URL externalUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) externalUrl.openConnection();
            connection.setRequestMethod("GET");
            
            // Headers anti-bot súper completos requeridos por el CDN de Deezer
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            connection.setRequestProperty("Referer", "https://www.deezer.com/");
            connection.setRequestProperty("Accept", "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5");
            connection.setRequestProperty("Accept-Language", "en-US,en;q=0.9,es;q=0.8");
            connection.setRequestProperty("Connection", "keep-alive");

            if (rangeHeader != null) {
                connection.setRequestProperty("Range", rangeHeader);
            }

            int responseCode = connection.getResponseCode();

            if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_PARTIAL) {
                log.error("[AudioProxy] ❌ Error del CDN: HTTP {} para URL {}", responseCode, url);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }

            InputStream inputStream = connection.getInputStream();
            InputStreamResource resource = new InputStreamResource(inputStream);

            HttpHeaders responseHeaders = new HttpHeaders();

            String contentType = connection.getContentType();
            responseHeaders.setContentType(
                    contentType != null ? MediaType.parseMediaType(contentType) : MediaType.parseMediaType("audio/mpeg")
            );

            int contentLength = connection.getContentLength();
            if (contentLength > 0) {
                responseHeaders.setContentLength(contentLength);
            }

            String contentRange = connection.getHeaderField("Content-Range");
            if (contentRange != null) {
                responseHeaders.set("Content-Range", contentRange);
            }

            responseHeaders.set("Accept-Ranges", "bytes");
            responseHeaders.set("Access-Control-Allow-Origin", "*");
            responseHeaders.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
            responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");

            HttpStatus status = HttpStatus.valueOf(responseCode);

            return new ResponseEntity<>(resource, responseHeaders, status);

        } catch (Exception e) {
            log.error("[AudioProxy] Error interno al retransmitir: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean esDominioPermitido(String url) {
        if (url == null || url.isBlank()) return false;
        try {
            String host = URI.create(url).getHost();
            if (host == null) return false;
            return DOMINIOS_PERMITIDOS.stream().anyMatch(host::contains);
        } catch (Exception e) {
            return false;
        }
    }
}
