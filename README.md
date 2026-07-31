# 🎵 Soundly - Aplicación de Streaming de Música

**Soundly** es una aplicación moderna de streaming y reproducción de música desarrollada como proyecto de tesis. Cuenta con una arquitectura desacoplada, integrando un backend robusto en Java con Spring Boot y una interfaz de usuario frontend ligera y veloz construida con JavaScript puro bajo un enfoque de SPA (Single Page Application).

---

## 🚀 Tecnologías Utilizadas

### ⚙️ Backend (Servidor y API REST)
El servidor está diseñado para ofrecer alto rendimiento, seguridad y una gestión eficiente de los datos:
* **Lenguaje:** Java (Versión 17)
* **Framework Principal:** Spring Boot
* **Gestor de Dependencias:** Maven (`pom.xml`)
* **Base de Datos:** MySQL (conectada mediante `mysql-connector-j`)
* **Manejo de Datos (ORM):** Spring Data JPA para la persistencia y mapeo de entidades.
* **Desarrollo de API:** Spring Web MVC para la creación de endpoints RESTful.
* **Seguridad y Encriptación:** Spring Security Crypto (implementación de encriptación de contraseñas con BCrypt).
* **Envío de Correos:** Spring Boot Mail (para notificaciones, confirmaciones y recuperación de contraseñas vía SMTP).
* **Validación de Datos:** Spring Boot Validation.
* **Herramientas y Productividad:** Lombok (reducción de código repetitivo) y Spring Boot DevTools.
### 🌐 Integración de API Externa
* **Deezer API:** Utilizada para la búsqueda y obtención de pistas musicales, permitiendo enriquecer el catálogo y la experiencia de reproducción dentro de la plataforma.

### 🎨 Frontend (Interfaz de Usuario)
Desarrollado sin frameworks pesados, implementando una arquitectura SPA estructurada bajo un patrón MVC modular:
* **Estructura y Estilos:** HTML5 y CSS3 modular (con hojas de estilo independientes como `home.css`, `player.css`, `mobile-nav.css`).
* **Lógica e Interacción:** JavaScript Vanilla (ES6+):
  * **Controladores:** Gestión de la lógica por vistas (`controlador-home.js`, `controlador-player.js`).
  * **Modelos:** Gestión de estados y datos (`modelo.js`, `modelo-canciones.js`).
  * **Ruteo y Vistas:** Manipulación del DOM para comportamiento de SPA (`vista.js`, `navegacion.js`).
* **Reproductor Global:** Lógica persistente de audio (`reproductor-global.js`) que evita interrupciones al navegar entre pantallas.
* **Diseño e Iconografía:** FontAwesome 6.4.0 y tipografía "DM Sans" de Google Fonts.

---

## ✨ Características Principales
- 🎧 **Reproductor de audio global y persistente** que sigue reproduciendo la música sin cortes al cambiar de sección.
- 📂 **Arquitectura SPA fluida** sin recargas de página gracias al manejo dinámico del DOM.
- 🔐 **Sistema seguro de autenticación** con contraseñas encriptadas.
- ✉️ **Servicio de mensajería integrado** para recuperación de cuentas y avisos por correo.
- 📊 **Persistencia robusta** de usuarios, playlists y canciones conectada a una base de datos relacional MySQL.

---

## 🛠️ Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone [https://github.com/valepognante4/soundly-music-platform.git](https://github.com/valepognante4/soundly-music-platform.git)
cd soundly-music-platform
