# TalentSync Multipágina

TalentSync es una plataforma académica de reclutamiento construida con HTML5, CSS3, JavaScript vanilla, ES Modules, Node.js, Fetch API y APIs REST. Cada área funcional tiene su propio HTML y comparte autenticación, layout y servicios.

## Ejecución

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abrir `http://localhost:5173`. No utilizar Live Server: los roles, mensajes, idiomas y análisis de CV dependen del backend Node.

## Usuarios demo

Estas cuentas son exclusivamente académicas y se validan en Node; las contraseñas no están en el frontend.

| Rol | Usuario | Contraseña |
|---|---|---|
| Reclutador | `recruiter.demo` | `Recruiter2026!` |
| Candidato | `candidate.demo` | `Candidate2026!` |
| Reclutador de empresa | `company.demo` | `Company2026!` |

## Roles y permisos

- Reclutador: dashboard, candidatos, vacantes, empresas, postulaciones, entrevistas, tareas, ofertas, mensajería y análisis de CV.
- Candidato: perfil y CV, postulaciones propias, entrevistas, ofertas, mensajería y notificaciones.
- Reclutador de empresa: resumen, vacantes, candidatos vinculados, postulaciones, entrevistas, seguimiento y mensajería.

Cada página solicita `/api/permissions` antes de renderizar. Una URL fuera del rol redirige al dashboard. Los endpoints de mensajes vuelven a validar sesión, participantes y relación permitida en Node.

## Idiomas

El selector incluye únicamente español, inglés, chino, francés y portugués. La traducción utiliza diccionarios incluidos en el frontend, funciona sin conexión y conserva la preferencia en `talentsync_language`. No necesita claves, credenciales ni servicios de traducción externos.

## Búsqueda global

El buscador compartido consulta páginas, candidatos, vacantes y postulaciones. Reconoce aliases, mayúsculas, acentos, IDs, códigos como `APP-2041`, correos y símbolos como `C#`, `C++` y `UX/UI`. Admite ArrowUp, ArrowDown, Enter y Escape.

## Mensajería interna

Los mensajes se guardan en `data/messages.json`, no en `localStorage`. La interfaz consulta cambios cada cinco segundos únicamente mientras Mensajería está abierta.

Endpoints:

- `GET /api/users`
- `GET /api/messages`
- `GET /api/messages/:conversationId`
- `POST /api/messages`
- `PATCH /api/messages/:id/read`

Relaciones permitidas: candidato ↔ reclutador, reclutador ↔ empresa y candidato ↔ empresa cuando comparten una relación activa de empresa.

## Notificaciones, sonido y banner

La campana resume mensajes no leídos, entrevistas y tareas permitidas por rol. El sonido se genera con Web Audio API después de una interacción válida y puede desactivarse; la preferencia queda en `localStorage`. No suena al navegar.

El banner utiliza tres SVG propios en `public/imgs`, rota cada seis segundos y desactiva la rotación con `prefers-reduced-motion: reduce`.

## Datos y persistencia

- Datos externos de demostración: DummyJSON (`users`, `products`, `carts`, `posts`, `comments`, `todos`). Sus escrituras son simuladas.
- Usuarios demo y mensajes: archivos JSON administrados por Node en `data/`.
- Preferencias, etapas de pipeline y perfil candidato: `localStorage` del navegador.
- CV: PDF/DOCX procesado temporalmente en memoria; no se guarda el archivo.
- IA y traducción: servicios externos opcionales configurados en `.env`.

## Diseño

Empresas, Postulaciones y Vacantes reutilizan la información y acciones existentes con la jerarquía visual de las referencias proporcionadas: métricas, cards corporativas, pipeline y tarjetas de progreso. La marca permanece TalentSync y no se copiaron nombres, logos ni fotografías de las referencias.

## Documentación y Recursos

- 📄 **[PITCH_COMERCIAL_TALENTSYNC.md](file:///docs/PITCH_COMERCIAL_TALENTSYNC.md)**: Dossier comercial completo y framework de ventas B2B para empresas, consultoras de selección y directores de talento (Elevator pitches, matriz de problemas/solución PAS, cálculo de ROI, demo script de 10 min y manejo de objeciones).
- 📘 **[Agent.md](file:///Agent.md)**: Especificación técnica y framework de gobernanza arquitectónica de nivel Principal/Staff Frontend Architect.
- 🤝 **[CONTRIBUTING.md](file:///CONTRIBUTING.md)**: Guía de contribución, estándares de código, flujo de Git y plantilla oficial de Pull Request.
- 📜 **[CHANGELOG.md](file:///CHANGELOG.md)**: Registro histórico de cambios y versiones del proyecto (SemVer).

## Pruebas

```bash
npm test
```

Las pruebas comprueban páginas, rutas, sintaxis, roles demo, permisos, catálogo de idiomas, mensajería segura, análisis de CV y paletas accesibles.
