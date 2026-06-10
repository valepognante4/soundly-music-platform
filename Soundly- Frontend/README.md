# Soundly 🎧 — Plataforma de Streaming Musical

¡Bienvenido al repositorio oficial de **Soundly**! Una aplicación web funcional dedicada al streaming de música, diseñada bajo un enfoque de desarrollo integral que prioriza una experiencia de usuario interactiva, moderna y clara.

Este proyecto ha sido desarrollado en el marco de la asignatura **Programación III** (3.º Año) de la carrera **Tecnicatura Superior en Desarrollo de Software** en el **Instituto de Enseñanza Superior (IDES)**.

### 👥 Integrantes
* **Pognante, Valentina**
* **Prono, Santiago**

**Docente:** Tello, Marysol

---

## 🚀 Estado del Proyecto: Etapa 1 (Frontend & Arquitectura Local)

De acuerdo con la planificación actual del sistema, esta primera fase cubre la maquetación completa, el diseño de la interfaz de usuario y la lógica del negocio ejecutada del lado del cliente. 

### 🎯 Objetivos Cubiertos en esta Entrega:
1.  **Diseño Inmersivo (UX/UI):** Interfaz optimizada con preferencias estéticas en *Dark Mode*, detalles vibrantes y efectos visuales fluidos que acompañan la navegación del usuario.
2.  **Organización del Código:** Estructuración profesional basada en principios del patrón **MVC (Modelo-Vista-Controlador)** para garantizar la legibilidad y la futura escalabilidad.
3.  **Lógica del Cliente y Persistencia Temporal:** * Gestión y captura de datos de formularios a través de controladores en JavaScript Vanilla (ES6).
    * Uso de `localStorage` para simular la persistencia de usuarios activos durante la sesión.
    * Notificaciones enriquecidas e interactivas integrando la librería **SweetAlert2**.

---

## 🛠️ Tecnologías y Herramientas

* **Arquitectura:** Patrón Modelo-Vista-Controlador (MVC) local.
* **Frontend Base:** HTML5 estructurado y CSS3 nativo para estilos globales.
* **Interactividad:** JavaScript (Vanilla ES6) para la manipulación del DOM y manejo de eventos.
* **Componentes de UI:** [SweetAlert2](https://sweetalert2.github.io/) para cuadros de diálogo dinámicos y elegantes (Login/Registro/Recuperación).
* **Diseño y Prototipado:** Figma (Alta fidelidad).

---

## 📋 Flujos y Casos de Uso Implementados

El sistema cuenta con las siguientes vistas principales completamente funcionales en su comportamiento frontend:

1.  **Landing Page Principal (`index.html`):** Puerta de entrada a la plataforma con la identidad de marca de Soundly.
2.  **Registro de Usuarios (`register.html`):** Interfaz para la creación de cuentas que interactúa con el `GestorUsuarios` para almacenar la información de forma local.
3.  **Inicio de Sesión (`login.html`):** * **Autenticación:** Comprobación de credenciales (email y contraseña) contrastadas con el modelo local.
    * **Flujo de Recuperación:** Ventana modal interactiva integrada con SweetAlert2 que captura el correo del usuario de manera clara y consistente con la estética de la app.
4.  **Reproductor Musical (`player.html`):** Tablero central y corazón de la experiencia de la plataforma.

---

## 🔮 Próxima Etapa: Integración con el Backend

En la segunda fase del desarrollo, la plataforma evolucionará hacia una arquitectura Cliente-Servidor completa y distribuida:

* **Backend Robustecido:** Migración de la lógica de negocio a una API REST construida con **Java 17** y el ecosistema de **Spring Boot**.
* **Capa de Datos:** Implementación de bases de datos relacionales administradas con **SQL** y mapeadas mediante **Hibernate** para una persistencia real y segura.
* **Seguridad y Servicios:** Reemplazo de los flujos locales por autenticación basada en tokens de acceso y activación del servicio SMTP de **Gmail** para el envío real de correos de recuperación de contraseña.
