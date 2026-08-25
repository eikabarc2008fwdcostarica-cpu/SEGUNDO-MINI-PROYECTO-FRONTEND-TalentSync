# TalentSync Multipágina

TalentSync es una plataforma administrativa de reclutamiento construida con HTML5, CSS3, JavaScript vanilla, ES Modules, Node.js, Fetch API, DummyJSON y localStorage. Cada área funcional tiene ahora su propio documento HTML; no utiliza routing SPA ni frameworks frontend.

## Instalación y ejecución

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abrir `http://localhost:5173`. Credenciales de demostración: `emilys` / `emilyspass`.

## Mapa de páginas

| Página | Función |
|---|---|
| `pages/index.html` | Login exclusivo |
| `dashboard.html` | Resumen general |
| `candidatos.html` | Gestión de candidatos |
| `vacantes.html` | Gestión de vacantes |
| `empresas.html` | Empresas clientes |
| `postulaciones.html` | Pipeline de postulaciones |
| `entrevistas.html` | Evaluaciones y Calendario Maestro |
| `tareas.html` | Tareas diarias y progreso |
| `ofertas.html` | Ofertas laborales a candidatos |
| `mensajeria.html` | Conversaciones locales |
| `ayuda.html` | Ayuda, accesibilidad e inclusión |
| `analisis-cv.html` | Match explicable CV/vacante |
| `seguimiento-cliente.html` | Portal de seguimiento del cliente |

Empresas abre `seguimiento-cliente.html?id=...`; Candidatos abre `mensajeria.html?candidateId=...` y `analisis-cv.html?candidateId=...`; Postulaciones puede enviar candidato y vacante mediante parámetros URL.

## Arquitectura

```text
public/
├── pages/
│   ├── index.html
│   ├── dashboard.html
│   ├── candidatos.html
│   ├── vacantes.html
│   ├── empresas.html
│   ├── postulaciones.html
│   ├── entrevistas.html
│   ├── tareas.html
│   ├── ofertas.html
│   ├── mensajeria.html
│   ├── ayuda.html
│   ├── analisis-cv.html
│   └── seguimiento-cliente.html
├── styles/css/styles.css
└── js/
    ├── common/
    │   ├── auth.js
    │   ├── layout.js
    │   ├── notifications.js
    │   ├── search.js
    │   ├── ui.js
    │   └── resource-page.js
    ├── services/
    │   ├── api.js
    │   └── cv-api.js
    └── pages/
        ├── login.js
        └── un módulo por página
```

El layout común genera sidebar, topbar, perfil, búsqueda, notificaciones, logout, modal y toasts. La navegación contiene enlaces HTML reales y marca la página activa mediante `body[data-page]`.

## Autenticación y sesión

El login usa `POST /auth/login` de DummyJSON. La sesión, usuario, token y última actividad se comparten mediante `localStorage`. `auth.js` protege todas las páginas privadas y las redirige a `index.html` cuando no hay sesión válida. Después de 30 minutos sin actividad limpia la sesión. Logout funciona desde cualquier página.

## Servicios compartidos y DummyJSON

`js/services/api.js` centraliza autorización, timeout y errores para:

- Candidatos → `/users`
- Vacantes → `/products`
- Empresas → `/carts`
- Postulaciones → `/posts`
- Entrevistas → `/comments`
- Tareas → `/todos`

DummyJSON simula POST, PATCH y DELETE, pero no persiste definitivamente los cambios.

## Datos locales

Ofertas, conversaciones, decisiones del portal y resultados de CV se guardan en localStorage porque DummyJSON no ofrece esas entidades. No representan mensajes, contratos ni decisiones enviados a servicios reales.

## Análisis de CV

`POST /api/analyze-cv` recibe PDF o DOCX de hasta 5 MB, obtiene la vacante, extrae texto en memoria y devuelve un resultado JSON explicable. PDF Parse y Mammoth procesan el documento sin escribirlo en disco. El buffer se elimina después de extraer el texto.

Sin configuración externa usa el analizador local explicable. Para un servicio de IA compatible con JSON, copiar `.env.example` como `.env` y definir `AI_API_URL`, `AI_API_KEY` y `AI_MODEL`. La clave permanece exclusivamente en Node.js.

El porcentaje describe coincidencia documental; no es probabilidad de contratación. Atributos sensibles no participan y ninguna decisión se ejecuta automáticamente.

## Responsive y accesibilidad

El CSS global soporta escritorio, tablet y móvil desde 320 px. Incluye drawer móvil, tablas con scroll controlado, mensajería adaptable, calendario desplazable, labels, focus visible, dialogs accesibles, regiones ARIA y `prefers-reduced-motion`.

## Pruebas

```bash
npm test
```

Las pruebas verifican cálculo CV, páginas requeridas, IDs únicos, imports existentes y sintaxis de todos los módulos.
