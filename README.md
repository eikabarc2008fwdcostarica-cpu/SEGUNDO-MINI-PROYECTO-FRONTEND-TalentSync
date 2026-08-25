# TalentSync

TalentSync es una aplicación web de gestión de empleabilidad para reclutadores. Incluye dashboard, candidatos, vacantes, empresas clientes, postulaciones, entrevistas y tareas en una interfaz responsive y accesible.

## Tecnologías

HTML5, CSS3, JavaScript vanilla con ES Modules, Node.js, Fetch API, DummyJSON y localStorage. No requiere frameworks ni dependencias de producción.

## Estructura

```text
public/pages/index.html   Punto de entrada y estructura semántica
public/styles/index.css  Sistema visual y diseño responsive
public/js/index.js       Estado, vistas, eventos y CRUD
public/js/api.js         Cliente HTTP y sesión
server.js                Servidor estático con módulos nativos de Node
```

## Instalación y ejecución

Requiere Node.js 18 o superior. Ejecutar `npm start` y abrir `http://localhost:5173`. No hace falta instalar dependencias externas.

## Login y seguridad

La autenticación usa `POST https://dummyjson.com/auth/login`. Credenciales demo: usuario `emilys`, contraseña `emilyspass`.

El token retornado se almacena en `localStorage`, se agrega como encabezado `Authorization: Bearer` y se elimina al cerrar sesión. La sesión se cierra después de 30 minutos sin actividad. No se incluyen secretos privados.

## API, módulos y CRUD

| Módulo | Recurso DummyJSON |
|---|---|
| Candidatos | `/users` |
| Vacantes | `/products` |
| Empresas | `/carts` |
| Postulaciones | `/posts` |
| Entrevistas | `/comments` |
| Tareas | `/todos` |

Cada módulo permite consultar, crear, ver, editar y eliminar registros con Fetch API. Las eliminaciones requieren confirmación. Hay búsqueda local, paginación, estados de carga/error/vacío, modales reutilizables y mensajes toast.

## Vistas ampliadas e integraciones

- **Calendario Maestro:** se encuentra dentro de Entrevistas y alterna entre vista mensual y semanal. Permite navegar fechas, filtrar por reclutador o tipo y abrir cada evento en el modal existente.
- **Gestión de Ofertas:** vincula candidatos de `/users` con vacantes de `/products`. Permite redactar, consultar, filtrar y actualizar el estado de propuestas laborales.
- **Mensajería Directa:** se abre desde la navegación o desde la acción `Mensaje` de un candidato. Incluye conversaciones, plantillas rápidas y composición revisable antes de guardar.
- **Portal del Cliente:** se abre mediante `Empresas → Ver seguimiento`. Resume procesos prioritarios y decisiones de avance, rechazo o feedback.
- **Centro de Ayuda:** integra artículos operativos con el Centro de Accesibilidad e Inclusión; no duplica una página separada de accesibilidad.
- **Notificaciones:** el botón de campana resume tareas pendientes, entrevistas próximas y ofertas que requieren revisión. El antiguo botón decorativo de seguridad fue eliminado y las opciones de cuenta se concentraron en el avatar y el logout.

Las rutas internas adicionales son `#offers`, `#messaging`, `#help` y `#clientPortal`. Calendario y Portal del Cliente permanecen integrados en sus módulos de origen.

## Datos locales de demostración

DummyJSON no dispone de ofertas laborales, mensajería ni decisiones del portal. Esos datos se guardan exclusivamente en `localStorage` bajo las claves `talentsync_offers`, `talentsync_chats` y `talentsync_client_actions`. No representan correos, SMS, mensajes o decisiones enviados a un servicio real.

## Limitaciones de DummyJSON

DummyJSON simula respuestas de `POST`, `PUT`, `PATCH` y `DELETE`, pero no persiste los cambios. TalentSync los conserva en memoria mientras la página sigue abierta; al recargar se recuperan los datos originales.

## Responsive y accesibilidad

El diseño se adapta desde 320 px hasta escritorios amplios. En móvil usa sidebar desplegable, cards de una columna, tablas con desplazamiento interno y controles táctiles. Incluye HTML semántico, labels, foco visible, dialogs nativos, regiones ARIA y soporte para `prefers-reduced-motion`.

La barra superior ofrece modo claro y oscuro, paletas para deuteranopia, protanopia y tritanopia, tres tamaños de texto y dictado por voz para el buscador. Estas preferencias se guardan localmente. El dictado depende de `SpeechRecognition` y del permiso de micrófono del navegador; funciona mejor en navegadores basados en Chromium.
