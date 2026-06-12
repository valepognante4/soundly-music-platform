package com.streaming.soundly.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Servicio responsable del envío de correos electrónicos.
 * El envío es asíncrono (@Async) para no bloquear el hilo HTTP durante la petición.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String remitente;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Envía el correo de recuperación de contraseña con un enlace que contiene el token.
     *
     * @param destinatario Email del usuario que solicitó la recuperación.
     * @param token        Token UUID único y temporal generado para este usuario.
     */
    @Async
    public void enviarEmailRecuperacion(String destinatario, String token) {
        String enlace = frontendUrl + "/reset-password.html?token=" + token;

        String cuerpoHtml = """
                <html>
                  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
                    <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 10px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      <h2 style="color: #6c3fc5;">🎵 Soundly — Recuperación de contraseña</h2>
                      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                      <p>Hacé clic en el botón para crear una nueva. Este enlace expira en <strong>1 hora</strong>.</p>
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="%s"
                           style="background-color: #6c3fc5; color: white; padding: 14px 28px;
                                  border-radius: 8px; text-decoration: none; font-size: 16px;">
                          Restablecer contraseña
                        </a>
                      </div>
                      <p style="color: #888; font-size: 13px;">
                        Si no solicitaste este cambio, podés ignorar este mensaje. Tu contraseña actual permanecerá sin cambios.
                      </p>
                    </div>
                  </body>
                </html>
                """.formatted(enlace);

        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");
            helper.setFrom(remitente);
            helper.setTo(destinatario);
            helper.setSubject("Soundly — Recuperá tu contraseña");
            helper.setText(cuerpoHtml, true); // true = es HTML
            mailSender.send(mensaje);
        } catch (MessagingException e) {
            // Loguear el error sin exponer detalles al cliente
            throw new RuntimeException("Error al enviar el correo de recuperación", e);
        }
    }
}
