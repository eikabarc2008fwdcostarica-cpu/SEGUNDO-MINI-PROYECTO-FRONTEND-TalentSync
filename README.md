# ❖ TALENTSYNC 
## ⬢ PLATAFORMA INTEGRAL DE GESTIÓN Y EMPLEABILIDAD FRONTEND
### DOCUMENTACIÓN OFICIAL DEL SISTEMA Y GUÍA DE INSTALACIÓN - VERSIÓN 2.0

---

## 1. DESCRIPCIÓN DEL PROYECTO

**TalentSync V2** (evolución arquitectónica de JobConnect) es una aplicación web Frontend diseñada como un panel de administración empresarial para la orquestación centralizada de procesos de reclutamiento y selección de talento. 

La plataforma permite gestionar de manera unificada el flujo completo de empleabilidad a través de 6 módulos estratégicos:
▪ **Candidatos**: Registro, perfil profesional, experiencia y habilidades técnicas.
▪ **Vacantes**: Publicación, descripción de puestos, rangos salariales y estados de apertura.
▪ **Empresas**: Directorio corporativo, sedes, sectores industriales y enlaces de contacto.
▪ **Postulaciones**: Seguimiento del ciclo de vida del candidato asociado a vacantes específicas.
▪ **Entrevistas**: Planificación, cronograma de sesiones, evaluadores y formatos de evaluación.
▪ **Tareas**: Asignaciones operativas internas para el equipo de reclutamiento y seguimiento de hitos.

---

## 2. CARACTERÍSTICAS PRINCIPALES (FEATURES)

El sistema satisface los Requerimientos Funcionales (RF) mediante las siguientes capacidades técnicas:

1. ❯ **Autenticación Protegida con JWT (Simulado)**:
   ↳ Inicio de sesión seguro contra el endpoint `/auth/login` de DummyJSON.
   ↳ Almacenamiento persistente de sesión en `LocalStorage` con control de expiración.
   ↳ Protección perimetral de rutas mediante guardias de acceso (`AuthGuard`).

2. ❯ **Operaciones CRUD Completas en los 6 Módulos**:
   ↳ Creación, lectura, actualización y eliminación de registros en Candidatos, Vacantes, Empresas, Postulaciones, Entrevistas y Tareas.

3. ❯ **Búsqueda y Filtrado en Tiempo Real**:
   ↳ Barra de búsqueda predictiva en memoria optimizada con algoritmos de `debounce` para reducir llamadas redundantes.
   ↳ Filtros cruzados por departamentos, roles y estados operativos.

4. ❯ **Paginación y Navegación de Alto Rendimiento**:
   ↳ Control de paginación fluida por cursor (`limit` y `skip`) y soporte para carga progresiva de grandes volúmenes de datos.

5. ❯ **Modales Dinámicos de Detalle y Edición**:
   ↳ Visualización ampliada de métricas de perfil, historiales y edición inline sin recarga de página.

6. ❯ **Ciclo Completo de Estados de Interfaz (UI States)**:
   ↳ *Loading States* con Skeleton Screens accesibles (`aria-busy="true"`).
   ↳ *Empty States* con guías visuales y botones de acción (CTA).
   ↳ *Error States* con mecanismos de reintento manual y toasts normalizados.
   ↳ *Success States* con transiciones visuales limpias.

---

## 3. STACK TECNOLÓGICO (TECH STACK)

TalentSync V2 ha sido desarrollado como una **aplicación Frontend pura**, libre de dependencias de frameworks o bundlers complejos, maximizando el apego a los estándares web nativos del W3C:

▪ **HTML5 Semántico**: Estructuración accesible, uso de etiquetas semánticas (`<main>`, `<section>`, `<article>`, `<header>`, `<nav>`, `<aside>`) y roles WAI-ARIA.
▪ **CSS3 Puro (Vanilla CSS)**:
  ↳ Metodología de clases **BEM** (*Block, Element, Modifier*) para garantizar especificidad plana y mantenibilidad.
  ↳ Tokens globales centralizados en `:root` (escala tipográfica, espaciados en grilla de 8pt, radios de borde, sombras y z-index).
  ↳ Diseño adaptativo **Mobile-First** con breakpoints estandarizados (640px, 1024px, 1280px, 1536px).
  ↳ Criterio de accesibilidad universal con contraste **WCAG 2.1 AAA**.
▪ **JavaScript ES6+ (Vanilla JS)**:
  ↳ Módulos nativos de JavaScript (`import` / `export`) con modo estricto (`"use strict"`).
  ↳ Gestión asíncrona avanzada mediante promesas nativas y sintaxis `async` / `await`.
  ↳ Cliente HTTP modularizado con soporte de `AbortController` para cancelación de peticiones obsoletas y control de tiempos de espera (*timeouts*).
▪ **API Remota de Datos**:
  ↳ **DummyJSON API** (`https://dummyjson.com/`): Proveedor de servicios REST para la simulación de autenticación y transacciones de datos.

---

## 4. ESTRUCTURA DEL PROYECTO

La base de código sigue una arquitectura modular y desacoplada organizada por responsabilidades específicas:

```
SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync/
├── public/
│   ├── favicon.ico
│   ├── index.html                       # Redirección y punto de entrada
│   ├── imgs/                            # Recursos gráficos, vectores y placeholders
│   │   ├── avatars/
│   │   └── vectors/
│   ├── pages/                           # Vistas HTML independientes del sistema
│   │   ├── dashboard.html               # Panel central de control y métricas
│   │   ├── login.html                   # Vista de autenticación con credenciales
│   │   ├── talent-detail.html           # Vista de detalle ampliado de perfiles
│   │   └── talent-form.html             # Formulario de creación y modificación
│   ├── styles/                          # Arquitectura modular de estilos CSS (BEM)
│   │   ├── main.css                     # Importador maestro de hojas de estilo
│   │   ├── base/                        # Resets, tipografía y variables (:root)
│   │   ├── components/                  # Estilos aislados por componente
│   │   └── layouts/                     # Grillas, encabezados, barras laterales y footers
│   └── js/                              # Lógica de aplicación Vanilla JS
│       ├── app.js                       # Bootstrap y arranque de la aplicación
│       ├── config/                      # Constantes, endpoints de API y rutas
│       ├── guards/                      # Control de acceso y validación de tokens
│       ├── services/                    # Clientes de red y comunicación HTTP (DummyJSON)
│       ├── state/                       # Store inmutable y Bus de Eventos (Pub/Sub)
│       ├── components/                  # Factorías de renderizado y eventos de UI
│       └── utils/                       # Funciones puras (validación, saneamiento, debounce)
├── docs/                                # Documentación técnica complementaria
├── Agent.md                             # Marco de arquitectura y directrices de ingeniería
└── README.md                            # Documentación principal de uso e instalación
```

### 4.1 Responsabilidad de Directorios Principales
▪ `/services`: Encapsula de forma exclusiva las peticiones de red (`fetch`), configuración de cabeceras, transformación de modelos de dominio y almacenamiento de datos.
▪ `/pages`: Contiene las páginas HTML semánticas que estructuran las distintas vistas del flujo de usuario.
▪ `/styles`: Alberga los archivos CSS modulares categorizados según su ámbito (base, componentes y layout).
▪ `/js/components`: Aloja las funciones responsables de instanciar plantillas HTML y enlazar listeners de eventos locales en el DOM.
▪ `/js/utils`: Colección de utilidades puras y funciones reutilizables sin efectos secundarios (sanitización XSS, formateadores de fecha, algoritmos de debounce).

---

## 5. GUÍA DE INSTALACIÓN Y USO (GETTING STARTED)

Dado que TalentSync V2 es una solución Frontend pura basada en módulos ES6+, no requiere compiladores, transpiladores ni configuración compleja de empaquetadores (*bundlers*).

### 5.1 Requisitos Previos
▪ Git instalado en su sistema operativo.
▪ Navegador web moderno compatible con ES Modules (Google Chrome >= 110, Mozilla Firefox >= 110, Microsoft Edge >= 110, Safari >= 16.4).
▪ Extensión **Live Server** para Visual Studio Code o servidor estático basado en Node.js / Python.

### 5.2 Pasos de Instalación y Ejecución

1. ❯ **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync.git
   ```

2. ❯ **Acceder al directorio del proyecto**:
   ```bash
   cd SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync
   ```

3. ❯ **Iniciar el servidor local**:

   ↳ **Opción A (Visual Studio Code - Recomendada)**:
      1. Abrir la carpeta en VS Code.
      2. Hacer clic derecho sobre `public/index.html` o `public/pages/login.html`.
      3. Seleccionar **"Open with Live Server"**.

   ↳ **Opción B (Node.js con npx serve)**:
      ```bash
      cd public
      npx serve -l 3000
      ```

   ↳ **Opción C (Python 3 HTTP Server)**:
      ```bash
      cd public
      python -m http.server 3000
      ```

4. ❯ **Acceder a la aplicación**:
   Abrir el navegador web e ingresar a: `http://localhost:3000/pages/login.html` (o el puerto provisto por Live Server).

---

### 5.3 Credenciales de Prueba Obligatorias

Para iniciar sesión y explorar la totalidad de las funciones del sistema, utilice las siguientes credenciales autorizadas provistas por la API de DummyJSON:

```
+-------------------------------------------------------------------------------+
|                       CREDENCIALES DE ACCESO AL SISTEMA                       |
+-------------------------------------------------------------------------------+
|  USUARIO:     emilys                                                          |
|  CONTRASEÑA:  emilyspass                                                      |
+-------------------------------------------------------------------------------+
```

---

## 6. LIMITACIONES CONOCIDAS Y RESTRICCIONES TÉCNICAS

▪ **Persistencia Simulada de la API Remota (DummyJSON)**:
  ↳ La API pública DummyJSON opera bajo un entorno de prueba simulado (*Mocking Sandbox*).
  ↳ Al realizar operaciones de creación (`POST`), edición (`PUT` / `PATCH`) o eliminación (`DELETE`), el servidor responde con códigos HTTP exitosos (`200 OK` / `201 Created`) y el retorno del objeto alterado.
  ↳ **Restricción Técnica**: Los cambios se reflejan inmediatamente en la interfaz de usuario y en el estado en memoria de la sesión activa; sin embargo, **no persisten de forma definitiva en la base de datos física del servidor externo**. Toda recarga completa de la página restablecerá los datos originales provistos por DummyJSON.

---

## 7. EQUIPO DE DESARROLLO (VERSIÓN 2.0)

Proyecto desarrollado y mantenido por el equipo de ingeniería Frontend:

▪ **Eiker Abarca Murillo**
▪ **Erian Badilla Fallas**
▪ **Wayner Villalobos Arauz**
▪ **Pablo**

---

## 8. RECONOCIMIENTOS Y HERRAMIENTAS

▪ **Herramienta de Asistencia e Investigación**:
  ↳ Se hace constar formalmente que la herramienta de Inteligencia Artificial **NotebookLM** fue utilizada como apoyo técnico para la investigación conceptual, estructuración de requerimientos, resolución de dudas de arquitectura y elaboración de los entregables finales del proyecto, en estricto cumplimiento de las directrices y normas académicas establecidas.
