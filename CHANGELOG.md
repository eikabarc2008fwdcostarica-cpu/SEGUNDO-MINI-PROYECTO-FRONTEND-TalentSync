# Registro de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Sin publicar] (Unreleased)

### Planeado
- Pruebas unitarias e integración continua automatizada (CI/CD).
- Exportación de reportes de candidatos en formato PDF y CSV.
- Filtros avanzados por rango de experiencia y habilidades técnicas en la vista de candidatos.

---

## [1.0.0] - 2026-08-25

### Añadido (Added)
- **Módulos de Negocio y Operaciones CRUD**:
  - **Dashboard Principal**: Métricas clave de empleabilidad, resumen de candidatos activos, vacantes disponibles y tareas prioritarias.
  - **Candidatos (`/users`)**: Búsqueda en tiempo real con técnica de *debounce*, visualización de perfil detallado, filtros, creación, edición y eliminación de candidatos con modal de confirmación.
  - **Vacantes (`/products`)**: Catálogo de puestos laborales, categorización, rangos salariales y gestión de estado.
  - **Empresas Clientes (`/carts`)**: Directorio de empresas aliadas y acceso directo a seguimiento de contrataciones.
  - **Postulaciones (`/posts`)**: Gestión y trazabilidad de postulaciones asociadas a vacantes.
  - **Entrevistas (`/comments`)**: Programación de entrevistas laborales, asignación de reclutadores y registro de notas.
  - **Tareas (`/todos`)**: Tablero interactivo de tareas con marcado de estado y filtros de avance.
- **Vistas Ampliadas e Integraciones Avanzadas**:
  - **Calendario Maestro**: Integrado en el módulo de Entrevistas con alternancia entre vista mensual y semanal, selector de fechas y filtrado por reclutador.
  - **Gestión de Ofertas Laborales (`#offers`)**: Vinculación de candidatos con vacantes activas, redacción de propuestas de contratación y seguimiento de estados persistido en `localStorage` (`talentsync_offers`).
  - **Mensajería Directa (`#messaging`)**: Módulo de mensajería interna con candidatos, selector de plantillas predefinidas y vista previa interactiva (`talentsync_chats`).
  - **Portal del Cliente (`#clientPortal`)**: Panel de seguimiento para empresas clientes con registro de decisiones (avance, rechazo, retroalimentación) persistidas localmente (`talentsync_client_actions`).
  - **Centro de Ayuda (`#help`)**: Documentación operativa y manual de usuario integrado con el Centro de Accesibilidad e Inclusión.
  - **Panel de Notificaciones**: Centro interactivo de notificaciones en la barra superior con resumen de tareas pendientes, entrevistas programadas y ofertas en revisión.
- **Autenticación y Seguridad**:
  - Integración de inicio de sesión con DummyJSON Auth API (`POST /auth/login`) usando credenciales demo (`emilys` / `emilyspass`).
  - Gestión segura de tokens JWT en `localStorage` e inyección automática en el encabezado `Authorization: Bearer`.
  - Cierre de sesión automático tras 30 minutos de inactividad.
  - Intercepción centralizada de errores HTTP 401 con redirección al inicio de sesión y limpieza de credenciales.
- **Accesibilidad e Inclusión (A11y)**:
  - Modo Claro y Oscuro con selector persistente en `localStorage`.
  - Paletas de accesibilidad visual adaptadas para daltonismo (Deuteranopía, Protanopía, Tritanopía).
  - Selector de tamaño de fuente con tres niveles (Normal, Grande, Muy grande).
  - Búsqueda mediante reconocimiento de voz con Web Speech API (`SpeechRecognition`).
  - Estructura HTML5 semántica, diálogos nativos `<dialog>`, foco visible accesible y compatibilidad con `prefers-reduced-motion`.
- **Arquitectura y Frontend Nativo**:
  - Servidor estático en Node.js nativo (`server.js`) con manejo de tipos MIME y cero dependencias externas.
  - Código modular JavaScript Vanilla con ES Modules (`api.js`, `index.js`).
  - Sistema de estilos CSS3 puro y diseño responsive (320px hasta pantallas ultra-wide) siguiendo metodología BEM y variables CSS globales.
  - Sistema centralizado de notificaciones tipo Toast y modales reutilizables.
  - Documentación técnica completa (`README.md`, `Agent.md`, `CONTRIBUTING.md`, `docs/`).

### Modificado (Changed)
- Optimización general de rendimiento y tiempos de renderizado en el Frontend.
- Consolidación del perfil de usuario y cierre de sesión en el menú desplegable del avatar, eliminando botones decorativos redundantes.
- Unificación del Centro de Accesibilidad dentro de la sección de Ayuda para una navegación más limpia e intuitiva.

### Corregido (Fixed)
- Manejo robusto de errores de red y control de timeouts en solicitudes Fetch API.
- Prevención de envíos duplicados en formularios (*double-submit*) deshabilitando reactivamente los botones durante la ejecución.
- Sincronización del estado en memoria y persistencia local para operaciones simuladas con DummyJSON.

---

## Convención de Versiones y Categorías
Este registro utiliza las siguientes categorías de clasificación:
- `Añadido` para nuevas funcionalidades implementadas.
- `Modificado` para cambios en funcionalidades existentes.
- `Obsoleto` para funcionalidades que serán retiradas en versiones futuras.
- `Eliminado` para funcionalidades que han sido eliminadas.
- `Corregido` para solución de incidencias y errores (bugs).
- `Seguridad` para mejoras en autenticación y protección de vulnerabilidades.
