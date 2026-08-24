# ❖ FRAMEWORK DE ARQUITECTURA Y DIRECTRICES TÉCNICAS: TALENTSYNC
### DOCUMENTO DE ESPECIFICACIÓN TÉCNICA Y GOBERNANZA DE CÓDIGO - NIVEL PRINCIPAL / STAFF FRONTEND ARCHITECT

---

## 1. CONTEXTO DE INGENIERÍA

### 1.1 Visión del Sistema
TalentSync V2 es una plataforma web orientada a la gestión integral, búsqueda, filtrado y administración de perfiles de talento profesional. El desarrollo se ejecuta sobre una arquitectura de software Frontend pura en JavaScript Vanilla (ES6+), priorizando la máxima eficiencia en tiempo de ejecución, cero sobrecarga por librerías superfluas, desacoplamiento estricto y fidelidad a los estándares web nativos del W3C y ECMAScript.

```
+-----------------------------------------------------------------------------------+
|                                  CAPA DE VISTA                                    |
|   [ HTML Semantico ] <---> [ Component Factory ] <---> [ UI Event Handlers ]      |
+------------------------------------------+----------------------------------------+
                                           | (Acciones / Despachos)
                                           v
+-----------------------------------------------------------------------------------+
|                             CAPA DE ESTADO (STORE)                                |
|   [ State Hub Central ] <---> [ Mutadores Inmutables ] <---> [ Event Bus Pub/Sub ] |
+------------------------------------------+----------------------------------------+
                                           | (Peticiones Asincronas)
                                           v
+-----------------------------------------------------------------------------------+
|                           CAPA DE SERVICIOS (HTTP CLIENT)                         |
|   [ BaseApiClient ] <---> [ Token Interceptor ] <---> [ Error Normalizer ]        |
+------------------------------------------+----------------------------------------+
                                           | (Red / I/O)
                                           v
+-----------------------------------------------------------------------------------+
|                           BACKEND REMOTO (DummyJSON API)                          |
|   /auth/login  |  /users  |  /users/search  |  /users/filter  |  /users/add       |
+-----------------------------------------------------------------------------------+
```

### 1.2 Flujo Unidireccional de Datos (Arquitectura Basada en Componentes)
El flujo de información en TalentSync V2 es estrictamente unidireccional y predecible:
1. ❯ **Acción del Usuario / Ciclo de Vida**: El usuario interactúa con la interfaz (click, input, submit) o la página se inicializa.
2. ❯ **Controlador / Event Handler**: Captura el evento DOM, extrae los datos limpios y delega la ejecución al Servicio de Negocio o al Gestor de Estado.
3. ❯ **Servicio de Datos**: Realiza la petición asíncrona mediante el cliente HTTP tipificado contra la API de DummyJSON.
4. ❯ **Mutación de Estado**: Los datos retornados actualizan el Estado Global de forma inmutable mediante el Store.
5. ❯ **Notificación de Cambio**: El Store emite un evento de cambio a través de un canal Pub/Sub interno.
6. ❯ **Renderizado de Componentes**: Los componentes suscritos reciben el nuevo fragmento de estado, procesan el markup y actualizan los nodos del DOM objetivo utilizando `DocumentFragment` o manipulaciones atómicas directas.

### 1.3 Matriz de Estado: Global vs. Local
▪ **Estado Global (Store Centralizado)**:
  ↳ Sesión de usuario activa (Token JWT, datos del perfil autenticado, permisos).
  ↳ Catálogo central de talentos y usuarios cargados.
  ↳ Preferencias del sistema (tema visual, idioma, filtros globales persistentes).
  ↳ Cola global de notificaciones tipo Toast / Alertas del sistema.

▪ **Estado Local (Component Transient State)**:
  ↳ Estado de formularios no enviados (valores de inputs temporales, errores de validación en tiempo real).
  ↳ Visibilidad de modales, dropdowns y toggles de acordeón.
  ↳ Estado de carga (loaders) específico de un botón o sección aislada.
  ↳ Paginación local y cursor de scroll de vistas específicas.

### 1.4 Entorno de Ejecución y Estándares
▪ **Estándar ECMAScript**: ES6+ (ES2022/ES2023) estricto.
▪ **Modo de Ejecución**: `"use strict";` obligatorio en todos los módulos.
▪ **Sistema de Módulos**: Módulos nativos JavaScript (`<script type="module">` con sintaxis `import` / `export`).
▪ **Compatibilidad Objetivo**: Navegadores Evergreen modernos (Chromium >= 110, Firefox >= 110, Safari >= 16.4).
▪ **Backend Externo**: DummyJSON API (`https://dummyjson.com/`).

---

## 2. REQUERIMIENTOS TÉCNICOS Y FUNCIONALES

### 2.1 Casos Extremos (Edge Cases) en Operaciones CRUD

#### 2.1.1 Fallas de Servidor y Red (HTTP 500, 502, 503, 504, Timeout)
▪ **Comportamiento**: El cliente HTTP debe abortar la solicitud tras un umbral de 10 segundos (`AbortSignal.timeout(10000)`).
▪ **Estrategia de Recuperación**:
  ↳ En peticiones idempotentes (GET): Ejecutar reintento automático con retroceso exponencial (Exponential Backoff: 1s, 2s, 4s) hasta un máximo de 3 intentos.
  ↳ En peticiones mutativas (POST, PUT, DELETE): No reintentar automáticamente. Desplegar un estado de error accionable con botón de reintento manual ("Reintentar operación").

#### 2.1.2 Expiración e Invalidez de Token JWT (HTTP 401 Unauthorized)
▪ **Detección**: Interceptada centralmente en la capa de servicios HTTP.
▪ **Protocolo de Invocación**:
  1. ⮑ Interceptar la respuesta 401.
  2. ⮑ Limpiar de inmediato el almacenamiento (`StorageService.clearAuth()`).
  3. ⮑ Resetear el estado global de autenticación en el Store.
  4. ⮑ Redirigir a la vista de login inyectando el parámetro de retorno (`/login.html?redirect=${encodeURIComponent(currentPath)}`).
  5. ⮑ Emitir un Toast global de advertencia: *"Su sesión ha expirado. Por favor ingrese nuevamente."*

#### 2.1.3 Control de Concurrencia y Condición de Carrera (Race Conditions)
▪ **Búsquedas y Filtrado Rápido**: Al escribir en campos de búsqueda o aplicar filtros concurrentes, toda petición anterior en vuelo debe ser cancelada utilizando una instancia activa de `AbortController`.
▪ **Deduplicación**: Impedir dobles envíos en formularios (Double Submit) deshabilitando de inmediato los botones de acción (`button.disabled = true`) y activando el estado de carga hasta la resolución de la promesa.

#### 2.1.4 Detección de Estado Offline / Online
▪ **Manejador de Conectividad**: Registrar listeners globales para `window.addEventListener('offline')` y `window.addEventListener('online')`.
▪ **Degradación Elegante**: Al perder conexión, bloquear mutaciones de datos y mostrar un banner persistente no invasivo en la cabecera del sistema.

```
+-------------------------------------------------------------------------------+
|                       MATRIZ DE RESOLUCION DE EDGE CASES                      |
+-------------------+----------------------------+------------------------------+
| ESCENARIO         | CAUSA RAIZ                 | ACCION SISTEMICA             |
+-------------------+----------------------------+------------------------------+
| HTTP 401          | Token expirado o alterado  | Logout forzado + Redireccion |
| HTTP 403          | Permisos insuficientes     | Toast Error + Bloqueo de UI  |
| HTTP 404          | Recurso inexistente        | Renderizado de Empty State   |
| HTTP 500-504      | Falla de API DummyJSON     | Toast Error + Log Central    |
| Timeout (>10s)    | Latencia de red severa     | AbortSignal + Reintento CTA  |
| Offline           | Desconexion local          | Banner global persistente    |
+-------------------+----------------------------+------------------------------+
```

### 2.2 Reglas de Validación de Formularios y Seguridad

#### 2.2.1 Políticas de Validación Estricta
▪ **Campos de Correo Electrónico**:
  ↳ Expresión Regular: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
  ↳ Validación adicional: Longitud máxima 254 caracteres, sin espacios al inicio o final (`trim()`).

▪ **Campos de Contraseña**:
  ↳ Longitud: Mínimo 8 caracteres, máximo 64 caracteres.
  ↳ Complejidad: Al menos una letra mayúscula (`[A-Z]`), una letra minúscula (`[a-z]`), un número (`[0-9]`) y un carácter especial (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).

▪ **Campos de Texto General (Nombres, Puestos, Habilidades)**:
  ↳ Longitud: Mínimo 2 caracteres, máximo 100 caracteres.
  ↳ Prohibición de caracteres de control o secuencias script maliciosas.

▪ **Campos Numéricos (Salarios, Años de Experiencia, Edad)**:
  ↳ Validación de rango estricto (`min`, `max`) y coherencia de enteros/decimales (`Number.isInteger()`, `!isNaN()`).

#### 2.2.2 Sanitización y Prevención Activa contra XSS
▪ **Directriz Absoluta**: Prohibido inyectar cadenas dinámicas sin escapar en `innerHTML`, `outerHTML` o `insertAdjacentHTML`.
▪ **Mecanismo de Escape Obligatorio**: Todo dato proveniente de usuarios o de la API debe ser procesado mediante una función pura de escape antes de su concatenación en templates, o insertado mediante `element.textContent` / `element.setAttribute()`.

```javascript
/**
 * Sanitiza una cadena de texto para evitar vulnerabilidades XSS.
 * @param {string} input - Texto a escapar.
 * @returns {string} Cadena segura con entidades HTML reemplazadas.
 */
export function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return input.replace(/[&<>"'/]/g, (match) => map[match]);
}
```

### 2.3 Especificación de Estados de Interfaz (UI States)

Toda vista o componente que interactúe con datos asíncronos debe implementar explícitamente el ciclo completo de 4 estados visuales:

```
[ INICIAL ] ───> [ 1. LOADING (Skeleton / Spinner) ]
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
[ 2. SUCCESS ]                    [ 4. ERROR ]
       │                          (Banner / Retry CTA)
       ├──────────────┐
       ▼              ▼
(Con Datos)      [ 3. EMPTY STATE ]
                 (Icono / Mensaje / CTA)
```

1. ❯ **Estado de Carga (Loading State)**:
   ↳ Obligatorio el uso de Skeleton Screens estructurados que repliquen las dimensiones de las tarjetas o tablas de datos.
   ↳ Accesibilidad: Contenedores marcados con `aria-busy="true"` y atributos `aria-live="polite"`.

2. ❯ **Estado Vacío (Empty State)**:
   ↳ Desplegado cuando un array de resultados posee longitud cero (`data.length === 0`).
   ↳ Contenido obligatorio: Gráfico/icono vectorial representativo, título explicativo, descripción secundaria y botón de acción principal ("Limpiar filtros", "Crear nuevo talento").

3. ❯ **Estado de Error (Error State)**:
   ↳ Desplegado ante fallas de red, HTTP 4xx/5xx o errores de parseo.
   ↳ Contenido obligatorio: Mensaje comprensible para humanos (sin volcar stack traces en pantalla), código de referencia y botón de acción ("Intentar nuevamente").
   ↳ Accesibilidad: Atributos `role="alert"` y `aria-atomic="true"`.

4. ❯ **Estado de Éxito / Contenido (Success State)**:
   ↳ Transición suave de opacidad al reemplazar el Skeleton por el contenido real.
   ↳ Retiro de banderas `aria-busy`.

---

## 3. REGLAS ARQUITECTÓNICAS Y ESTÁNDARES DE CÓDIGO

### 3.1 Principios Clean Code y SOLID

#### 3.1.1 DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid)
▪ Ningún algoritmo de transformación, formateo de fecha, cálculo de moneda o regla de validación debe existir en más de un lugar.
▪ La lógica compartida reside estrictamente en módulos utilitarios puros (`/utils`).

#### 3.1.2 SOLID Aplicado a Módulos JavaScript
▪ **Single Responsibility Principle (SRP)**:
  ↳ Un módulo de servicio solo gestiona peticiones HTTP.
  ↳ Un componente solo gestiona el renderizado y los eventos de su interfaz.
  ↳ Un validador solo evalúa la validez de los datos y retorna un objeto de resultado.

▪ **Open/Closed Principle (OCP)**:
  ↳ Los componentes y factories deben permitir extensión mediante parámetros de configuración sin requerir la modificación de su código interno.

▪ **Liskov Substitution Principle (LSP)**:
  ↳ Cualquier implementación de almacenamiento (LocalStorage, SessionStorage, MemoryStorage) debe respetar exactamente la misma interfaz (`getItem`, `setItem`, `removeItem`, `clear`).

▪ **Interface Segregation Principle (ISP)**:
  ↳ Módulos de utilidades divididos en subconjuntos específicos (`dateUtils.js`, `domUtils.js`, `formatUtils.js`) en lugar de un archivo general monolítico.

▪ **Dependency Inversion Principle (DIP)**:
  ↳ Los componentes de interfaz no invocan `fetch` directamente. Dependen de abstracciones de servicios inyectadas o importadas desde la capa de servicios.

### 3.2 Estructura Exacta del Árbol de Directorios

```
c:/Users/Estudiantes/Desktop/SEGUNDO MINI PROYECTO/SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync/
├── docs/
│   └── architecture_decisions.md
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── imgs/
│   │   ├── avatars/
│   │   ├── placeholders/
│   │   └── vectors/
│   ├── pages/
│   │   ├── dashboard.html
│   │   ├── login.html
│   │   ├── talent-detail.html
│   │   └── talent-form.html
│   ├── styles/
│   │   ├── main.css
│   │   ├── base/
│   │   │   ├── reset.css
│   │   │   ├── typography.css
│   │   │   └── variables.css
│   │   ├── components/
│   │   │   ├── alerts.css
│   │   │   ├── buttons.css
│   │   │   ├── cards.css
│   │   │   ├── forms.css
│   │   │   ├── modals.css
│   │   │   ├── skeletons.css
│   │   │   ├── tables.css
│   │   │   └── toasts.css
│   │   └── layouts/
│   │       ├── footer.css
│   │       ├── grid.css
│   │       ├── header.css
│   │       └── sidebar.css
│   └── js/
│       ├── app.js
│       ├── config/
│       │   ├── api.config.js
│       │   ├── constants.js
│       │   └── routes.config.js
│       ├── guards/
│       │   └── auth.guard.js
│       ├── services/
│       │   ├── api.client.js
│       │   ├── auth.service.js
│       │   ├── storage.service.js
│       │   └── talent.service.js
│       ├── state/
│       │   ├── event-bus.js
│       │   └── store.js
│       ├── components/
│       │   ├── common/
│       │   │   ├── modal.component.js
│       │   │   ├── skeleton.component.js
│       │   │   └── toast.component.js
│       │   ├── talent/
│       │   │   ├── talent-card.component.js
│       │   │   ├── talent-filter.component.js
│       │   │   ├── talent-form.component.js
│       │   │   └── talent-table.component.js
│       │   └── layout/
│       │       ├── header.component.js
│       │       └── sidebar.component.js
│       └── utils/
│           ├── date.util.js
│           ├── debounce.util.js
│           ├── dom.util.js
│           ├── error-handler.util.js
│           ├── formatters.util.js
│           ├── sanitize.util.js
│           └── validators.util.js
```

### 3.3 Responsabilidades Estrictas por Capa

▪ `/config`: Constantes inmutables, URLs base, endpoints, claves de almacenamiento, límites de paginación.
▪ `/guards`: Verificación de tokens y control de acceso previo al renderizado de páginas protegidas.
▪ `/services`: Único lugar autorizado para ejecutar peticiones HTTP (`fetch`), gestionar almacenamiento local y transformar datos brutos de la API en modelos de dominio.
▪ `/state`: Almacén reactivo de datos en memoria y bus de eventos. Cero referencias al DOM.
▪ `/components`: Funciones de creación de elementos UI, inyección de plantillas HTML puras, asignación de event listeners locales y ciclo de renderizado.
▪ `/utils`: Funciones puras e independientes, sin efectos secundarios, altamente testeables (validación, saneamiento, formateo).

### 3.4 Estándar Obligatorio de Documentación JSDoc

Toda función pública, método de clase, servicio o utilidad debe incluir un bloque de documentación JSDoc completo:

```javascript
/**
 * @typedef {Object} TalentFilterOptions
 * @property {string} [query] - Termino de busqueda general.
 * @property {string} [department] - Departamento corporativo a filtrar.
 * @property {number} [limit=10] - Limite de registros por pagina.
 * @property {number} [skip=0] - Cantidad de registros a omitir.
 */

/**
 * Consulta la coleccion de talentos aplicando filtros de busqueda y paginacion.
 * @async
 * @function fetchTalents
 * @param {TalentFilterOptions} options - Opciones de filtrado y control de paginacion.
 * @returns {Promise<{ talents: Array<Object>, total: number, skip: number, limit: number }>} Coleccion paginada de talentos.
 * @throws {AppError} Si la respuesta de red falla o el servidor retorna un codigo 4xx/5xx.
 */
export async function fetchTalents({ query = '', department = '', limit = 10, skip = 0 } = {}) {
  // Implementacion tecnica
}
```

---

## 4. RESTRICCIONES TÉCNICAS INNEGOCIABLES

1. ❖ **Prohibición de Datos Estáticos Quemados (Hardcoded Data)**:
   ↳ Queda estrictamente prohibido simular arreglos de datos en código fuente (mock arrays en JS) para las entidades de usuarios y talentos.
   ↳ Todos los datos de negocio deben fluir desde y hacia los endpoints provistos por DummyJSON (`https://dummyjson.com/users`).

2. ❖ **Prohibición de Frameworks y Librerías Externas de UI**:
   ↳ Prohibido el uso de TailwindCSS, Bootstrap, Bulma, Materialize o cualquier librería pre-empaquetada.
   ↳ Prohibido el uso de librerías JS para UI (jQuery, React, Vue, Svelte, Alpine). La solución debe ser 100% Vanilla JS y CSS nativo puro.

3. ❖ **Aislamiento Estricto de la Manipulación del DOM**:
   ↳ Prohibido consultar o modificar el DOM (`document.getElementById`, `querySelector`, `innerHTML`, `appendChild`) dentro de archivos ubicados en `/services`, `/state`, `/utils` o `/config`.
   ↳ La manipulación del DOM se encapsula exclusivamente dentro de los archivos de `/components` y los bootstrappers de página en `/pages`.

4. ❖ **Prohibición de Métodos Inseguros y Código Malicioso**:
   ↳ Prohibido el uso de `eval()`, `new Function()`, `document.write()` y el atributo HTML `javascript:`.
   ↳ Prohibido el uso de eventos en línea en el HTML (ej. `<button onclick="doSomething()">`). Todo listener debe asociarse mediante `addEventListener` en los módulos JS correspondientes.

---

## 5. OBJETIVOS DE RENDIMIENTO Y MANTENIBILIDAD

### 5.1 Métricas de Rendimiento (Web Vitals)
▪ **First Contentful Paint (FCP)**: < 0.8 segundos en conexiones de banda ancha estándar.
▪ **Largest Contentful Paint (LCP)**: < 1.5 segundos.
▪ **Cumulative Layout Shift (CLS)**: < 0.02 (Garantizar reservas de espacio para imágenes y skeletons).
▪ **Interaction to Next Paint (INP)**: < 80 milisegundos.
▪ **Tiempo de Bloqueo Total (TBT)**: < 50 milisegundos.

### 5.2 Estrategias de Optimización de Renderizado
▪ **Uso de DocumentFragment**: Todas las iteraciones que generen listas de tarjetas o filas de tablas deben acumularse en un `DocumentFragment` antes de realizar una única inserción en el DOM activo.
▪ **Delegación de Eventos**: Prohibido asociar listeners individuales a cada fila o tarjeta. Se debe asociar un único listener al elemento contenedor padre (`tableBody.addEventListener('click', handleRowAction)`), evaluando el objetivo mediante `event.target.closest('[data-action]')`.
▪ **Gestión de Memoria y Ciclo de Vida**: Todo componente montado debe disponer de una función de desmontaje (`destroy()` o `cleanup()`) que remueva listeners globales, observadores (`IntersectionObserver`, `ResizeObserver`) y temporizadores activos.

### 5.3 Métricas de Calidad de Código
▪ **Complejidad Ciclomática**: Máximo 8 por función. Si una función supera este umbral, debe descomponerse en funciones auxiliares.
▪ **Longitud de Función**: Máximo 35 líneas efectivas por función (excluyendo comentarios JSDoc).
▪ **Acoplamiento**: Cero dependencias circulares permitidas en el grafo de módulos.

---

## 6. MEMORIA DEL PROYECTO Y REGISTRO DE DECISIONES ARQUITECTÓNICAS (ADRs)

### 6.1 Registro de Decisiones de Arquitectura (ADR)

#### ⬢ ADR-001: Estrategia de Persistencia de Sesión y Tokens
▪ **Estado**: Aprobado.
▪ **Contexto**: Se requiere almacenar el token JWT provisto por DummyJSON (`/auth/login`) para mantener la sesión abierta durante la navegación entre páginas estáticas independientes.
▪ **Decisión**: Se selecciona `LocalStorage` complementado con una estructura de metadatos que incluye timestamp de creación y tiempo de expiración programado.
▪ **Justificación**: A diferencia de `SessionStorage`, permite conservar la sesión ante cierres accidentales de pestaña o apertura de nuevas ventanas dentro del mismo dominio, controlando la vigencia manualmente mediante validación en el `AuthGuard`.

#### ⬢ ADR-002: Patrón Singleton y Módulo para el Cliente de API
▪ **Estado**: Aprobado.
▪ **Contexto**: Las llamadas a DummyJSON requieren configuración uniforme de cabeceras (`Content-Type: application/json`), inyección automática del token `Authorization: Bearer <token>`, timeouts y normalización centralizada de errores.
▪ **Decisión**: Implementar la clase `ApiClient` bajo el patrón Singleton, exportando una única instancia inmutable.
▪ **Justificación**: Garantiza una única vía de comunicación HTTP en todo el sistema, facilitando la auditoría, interceptores globales y control de concurrencia mediante `AbortController`.

#### ⬢ ADR-003: Patrón Observer / Event Bus para Reactividad
▪ **Estado**: Aprobado.
▪ **Contexto**: Los componentes necesitan reaccionar a cambios en el estado global (ej. actualización del perfil de usuario, cambios en la lista de talentos favoritos) sin acoplarse directamente entre sí.
▪ **Decisión**: Diseñar un `EventBus` ligero basado en el patrón Publicador/Suscriptor con métodos tipificados `subscribe(event, callback)`, `unsubscribe(event, callback)` y `publish(event, payload)`.
▪ **Justificación**: Proporciona desacoplamiento total entre componentes emisores y receptores, manteniendo el código limpio y libre de dependencias rígidas.

### 6.2 Control y Mitigación de Deuda Técnica desde el Día 1
▪ **Evitar el "God Object" en main.js**: `app.js` solo orquesta el arranque del sistema, invoca los guards de seguridad y monta el componente raíz de la vista correspondiente.
▪ **Evitar Fugas de Memoria por Event Listeners Huérfanos**: Registrar siempre referencias a funciones con nombre (no anónimas inline) cuando se asocien a `window` o `document`, permitiendo su remoción explícita.
▪ **Evitar Duplicación de Código de Plantillas**: Las estructuras repetitivas (tarjeta de talento, fila de tabla, badge de estado) deben residir exclusivamente en su componente factory dedicado.

---

## 7. BUENAS PRÁCTICAS Y PATRONES DE IMPLEMENTACIÓN

### 7.1 Técnicas de Optimización en Entradas de Usuario (Debounce)
Todo campo de búsqueda por texto o filtrado en vivo debe encapsularse bajo una función de Debounce con un retardo nominal de 350ms para evitar la saturación de peticiones a la API.

```javascript
/**
 * Crea una version con retardo de la funcion provista.
 * @param {Function} fn - Funcion a ejecutar tras la pausa.
 * @param {number} delay - Tiempo de espera en milisegundos.
 * @returns {Function} Funcion optimizada con debounce.
 */
export function debounce(fn, delay = 350) {
  let timerId = null;
  return function (...args) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
      timerId = null;
    }, delay);
  };
}
```

### 7.2 Gestión Centralizada de Errores: Módulo ErrorHandler

#### 7.2.1 Clase Canónica de Error (AppError)
```javascript
/**
 * Clase estandar para la gestion de errores en TalentSync V2.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Mensaje amigable para el usuario.
   * @param {string} [type='UNKNOWN_ERROR'] - Categoria del error (NETWORK, AUTH, VALIDATION, SERVER).
   * @param {number} [statusCode=500] - Codigo HTTP o codigo interno.
   * @param {any} [details=null] - Informacion tecnica complementaria para depuracion.
   */
  constructor(message, type = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}
```

#### 7.2.2 Normalizador Central de Errores
```javascript
import { AppError } from './app-error.js';
import { ToastComponent } from '../components/common/toast.component.js';

export const ErrorHandler = {
  /**
   * Captura y procesa cualquier excepcion producida en la aplicacion.
   * @param {Error|AppError|unknown} error - Excepcion atrapada.
   * @param {string} [context='General'] - Contexto operativo donde ocurrio la falla.
   */
  handle(error, context = 'General') {
    let appError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      appError = new AppError('Error de conexion con el servidor. Verifique su red.', 'NETWORK_ERROR', 0, error);
    } else {
      appError = new AppError(
        error?.message || 'Ha ocurrido un error inesperado.',
        'INTERNAL_ERROR',
        500,
        error
      );
    }

    // Registro seguro en consola solo en desarrollo
    console.error(`[${appError.timestamp}] [${context}] [${appError.type}]:`, appError.details || appError.message);

    // Notificacion visual estandarizada
    ToastComponent.show({
      message: appError.message,
      type: 'danger',
      duration: 5000
    });

    return appError;
  }
};
```

### 7.3 Separación Absoluta: Lógica de Negocio vs. Lógica de Presentación
▪ **Regla de Oro**: Ninguna función de renderizado debe calcular transformaciones complejas ni ejecutar peticiones de red.
▪ **Regla Inversa**: Ningún servicio o función de estado debe conocer la existencia de nodos HTML, clases CSS o elementos del DOM.

---

## 8. REGLAS DE ESTILOS Y MAQUETACIÓN (CSS ARQUITECTURA)

### 8.1 Metodología BEM Estricta (Block, Element, Modifier)
Todo selector CSS debe regirse estrictamente por la nomenclatura BEM:
▪ **Bloque (Block)**: Representa la entidad independiente de nivel superior (`.talent-card`, `.navbar`, `.data-table`).
▪ **Elemento (Element)**: Representa una parte interna del bloque, delimitada por dos guiones bajos (`.talent-card__avatar`, `.talent-card__title`, `.data-table__row`).
▪ **Modificador (Modifier)**: Representa una variante visual o de estado, delimitada por dos guiones medios (`.talent-card--featured`, `.button--primary`, `.button--disabled`).
▪ **Prohibición de Selectores Huérfanos o Profundos**: Prohibido anidar selectores de más de dos niveles (ej. `.card .body .content p` está terminantemente prohibido). Utilizar `.talent-card__description`.

### 8.2 Variables CSS (`:root`)

El archivo `/styles/base/variables.css` debe contener la definición unificada de tokens de diseño:

```css
:root {
  /* ⬢ 1. TIPOGRAFÍA Y ESCALA */
  --font-family-base: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-family-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;

  --fs-xs:   0.75rem;   /* 12px */
  --fs-sm:   0.875rem;  /* 14px */
  --fs-base: 1rem;      /* 16px */
  --fs-lg:   1.125rem;  /* 18px */
  --fs-xl:   1.25rem;   /* 20px */
  --fs-2xl:  1.5rem;    /* 24px */
  --fs-3xl:  1.875rem;  /* 30px */
  --fs-4xl:  2.25rem;   /* 36px */

  --fw-normal:   400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;

  --lh-tight:  1.25;
  --lh-normal: 1.5;
  --lh-loose:  1.75;

  /* ⬢ 2. ESPACIADOS (Sistema Base 8pt) */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* ⬢ 3. RADIOS DE BORDE */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* ⬢ 4. SOMBRAS (ELEVACIONES) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

  /* ⬢ 5. TRANSICIONES Y TIEMPOS */
  --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:   350ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ⬢ 6. CAPAS Z-INDEX */
  --z-base:     1;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-header:   300;
  --z-modal:    400;
  --z-toast:    500;
  --z-tooltip:  600;
}
```

### 8.3 Breakpoints Exactos (Estrategia Mobile-First)

Toda la maquetación debe construirse inicialmente para pantallas móviles (ancho 100%) y expandirse progresivamente mediante Media Queries `min-width`:

```css
/* -------------------------------------------------------------
 * 1. Base Styles: Dispositivos Moviles (< 640px)
 * ------------------------------------------------------------- */
.talent-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* -------------------------------------------------------------
 * 2. Small Devices / Tablets Portatiles (>= 640px)
 * ------------------------------------------------------------- */
@media (min-width: 640px) {
  .talent-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}

/* -------------------------------------------------------------
 * 3. Medium Devices / Tablets Paisaje & Laptops (>= 1024px)
 * ------------------------------------------------------------- */
@media (min-width: 1024px) {
  .talent-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .layout-container {
    display: grid;
    grid-template-columns: 260px 1fr;
  }
}

/* -------------------------------------------------------------
 * 4. Large Desktop / Pantallas Anchas (>= 1280px)
 * ------------------------------------------------------------- */
@media (min-width: 1280px) {
  .talent-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-8);
  }
}

/* -------------------------------------------------------------
 * 5. Ultra-Wide Displays (>= 1536px)
 * ------------------------------------------------------------- */
@media (min-width: 1536px) {
  .main-content-wrapper {
    max-width: 1440px;
    margin-inline: auto;
  }
}
```

### 8.4 Prohibición Tajante de Estilos en Línea (Inline Styles)
▪ Queda prohibido el uso del atributo `style="..."` en cualquier elemento HTML.
▪ Cualquier modificación dinámica de apariencia desde JavaScript debe realizarse mediante la alternancia de clases BEM (`classList.add('is-active')`, `classList.toggle('talent-card--selected')`) o mediante la mutación de variables CSS en el elemento raíz (`element.style.setProperty('--dynamic-height', `${height}px`)`).

### 8.5 Conformidad con Accesibilidad y Contraste (WCAG 2.1 AAA)
▪ **Ratios de Contraste Obligatorios**:
  ↳ Texto Normal (< 18pt / 24px): Ratio de contraste mínimo de **7:1** contra su fondo inmediato.
  ↳ Texto Grande (>= 18pt o >= 14pt en negrita): Ratio de contraste mínimo de **4.5:1**.
▪ **Indicadores de Foco Visibles (Focus Ring)**:
  ↳ Todo elemento interactivo (`button`, `a`, `input`, `select`) debe contar con un estilo claro `:focus-visible`:
    ```css
    :focus-visible {
      outline: 2px solid var(--color-primary-600);
      outline-offset: 2px;
    }
    ```
▪ **Reducción de Movimiento**:
  ↳ Respetar la preferencia de accesibilidad del usuario para animaciones:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ```

---

## 9. CHECKLIST DE VERIFICACIÓN PRE-GENERACIÓN DE CÓDIGO

Antes de generar o modificar cualquier archivo de código en este espacio de trabajo, el asistente debe validar que:
1. ❯ No se incluyan emojis en el código, comentarios, mensajes de error o documentación.
2. ❯ La lógica se divida en el archivo y carpeta correcta según la estructura definida en la Sección 3.2.
3. ❯ Toda llamada a API utilice el `ApiClient` y gestione errores mediante `AppError` y `ErrorHandler`.
4. ❯ No existan datos estáticos quemados para usuarios/talentos.
5. ❯ Las clases CSS sigan BEM y utilicen las variables de `:root`.
6. ❯ Se incluya documentación JSDoc en todas las funciones y exportaciones.
7. ❯ Se eviten inyecciones directas de `innerHTML` no sanitizadas.
