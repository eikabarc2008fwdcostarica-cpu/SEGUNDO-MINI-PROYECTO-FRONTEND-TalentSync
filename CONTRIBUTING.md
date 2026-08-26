# ❖ GUÍA DE CONTRIBUCIÓN: TALENTSYNC V2
## ⬢ ESTÁNDARES DE COLABORACIÓN Y DIRECTRICES DE CÓDIGO
### DOCUMENTO OFICIAL PARA DESARROLLADORES Y COLABORADORES

---

## 1. BIENVENIDA Y PROPÓSITO

Agradecemos tu interés en colaborar en el desarrollo de **TalentSync V2**, una plataforma web Frontend orientada a la administración y gestión centralizada de procesos de empleabilidad (candidatos, vacantes, empresas, postulaciones, entrevistas y tareas).

Este documento establece las pautas técnicas, convenciones de código y el flujo de trabajo estandarizado que todo colaborador debe seguir para asegurar que la base de código permanezca limpia, modular, accesible y libre de errores.

---

## 2. CÓMO EMPEZAR (FLUJO DE TRABAJO GIT)

Para mantener un historial de control de versiones ordenado y facilitar la integración continua, se debe seguir el siguiente flujo de trabajo:

1. ❯ **Bifurcar (Fork) el Repositorio**:
   ↳ Genera un Fork del repositorio principal hacia tu cuenta de GitHub o GitLab.

2. ❯ **Clonar Localmente**:
   ↳ Clona tu repositorio bifurcado a tu máquina local:
   ```bash
   git clone https://github.com/tu-usuario/SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync.git
   cd SEGUNDO-MINI-PROYECTO-FRONTEND-TalentSync
   ```

3. ❯ **Crear una Rama de Trabajo (Branch)**:
   ↳ Nunca realices cambios directos sobre la rama `main` o `master`.
   ↳ Crea una rama específica utilizando prefijos descriptivos en minúsculas y separados por guiones:
     ▪ Nuevas funcionalidades: `feature/nombre-funcionalidad` (ej. `feature/modal-entrevistas`, `feature/filtro-candidatos`).
     ▪ Correcciones de fallos: `fix/descripcion-error` (ej. `fix/error-login-jwt`, `fix/validacion-correo`).
     ▪ Refactorizaciones: `refactor/modulo-afectado` (ej. `refactor/api-client-timeout`).
     ▪ Documentación: `docs/seccion-actualizada` (ej. `docs/actualizacion-readme`).

   ```bash
   git checkout -b feature/nueva-vista
   ```

---

## 3. ESTÁNDARES DE CÓDIGO

Todo código aportado al repositorio debe cumplir estrictamente con los siguientes principios arquitectónicos:

### 3.1 Estructura y Modularidad
▪ **Respeto a la Jerarquía de Carpetas**:
  ↳ `/public/pages`: Páginas HTML individuales para cada módulo (`dashboard.html`, `candidatos.html`, `vacantes.html`, `analisis-cv.html`, `seguimiento-cliente.html`, etc.).
  ↳ `/public/js/common`: Controladores transversales (accesibilidad, autenticación, layout, búsqueda global, notificaciones, sonido, traducciones).
  ↳ `/public/js/pages`: Scripts específicos por cada página multipágina.
  ↳ `/public/js/services`: Clientes de comunicación HTTP (`api.js`, `cv-api.js`).
  ↳ `/public/styles`: Hojas de estilo modulares en CSS3 nativo.
  ↳ `/docs`: Documentación técnica, planificación y dossiers comerciales (`PITCH_COMERCIAL_TALENTSYNC.md`).
  ↳ `/data`: Persistencia de usuarios y mensajes seguros administrados por Node.
  ↳ `/tests`: Pruebas de integración, sintaxis y estructura multipágina.
▪ **Separación de Responsabilidades**: Prohibido acoplar llamadas de red dentro de funciones de renderizado o manipular el DOM desde la capa de servicios.

### 3.2 Estilos (CSS3 Puro)
▪ **Metodología BEM Obligatoria**: Nomenclatura rigurosa de selectores (`.bloque__elemento--modificador`). Prohibido anidar selectores de más de dos niveles de profundidad.
▪ **Variables Globales (`:root`)**: Usar las variables de diseño declaradas para espaciados, tipografías, sombras y z-index.
▪ **Cero Estilos en Línea**: Queda terminantemente prohibido el uso del atributo `style="..."` en el marcado HTML. Cualquier variación visual debe gestionarse a través de clases CSS o propiedades de variables dinámicas.
▪ **Mobile-First y Accesibilidad**: Toda maquetación debe realizarse inicialmente para móviles y adaptarse progresivamente mediante Media Queries `min-width`, garantizando compatibilidad con alto contraste, daltonismo y `prefers-reduced-motion`.

### 3.3 Lógica y JavaScript (ES6+ Estricto)
▪ **JavaScript Vanilla Puro**: Modo estricto (`"use strict"`), modularización nativa con `import` y `export`.
▪ **Manejo Asíncrono Robusto**:
  ↳ Toda operación de I/O o red debe implementarse con sintaxis `async` / `await`.
  ↳ Toda llamada a servicios debe estar encapsulada en bloques `try / catch`, propagando o notificando errores mediante la infraestructura centralizada de la aplicación.
▪ **Prevención de Vulnerabilidades**: Prohibida la inserción de contenido dinámico no sanitizado en `innerHTML`. Usar funciones de escape (`esc()`) o inserción mediante `textContent` / `setAttribute`.

### 3.4 Prohibición de Dependencias Externas de UI
▪ **Frontend Puro**: No se admiten frameworks o librerías de interfaz de usuario externas (tales como TailwindCSS, Bootstrap, React, Vue, jQuery). Toda la interactividad y presentación debe construirse con estándares nativos del navegador y Node.js para el backend.

---

## 4. PROCESO DE PULL REQUESTS (PR)

Una vez completado el desarrollo de tu aporte, sigue este procedimiento para someterlo a revisión:

1. ❯ **Commits Claros y Atómicos**:
   ↳ Realiza commits frecuentes con mensajes concisos y descriptivos en imperativo (ej. `git commit -m "feat(candidatos): agregar barra de busqueda con debounce"` o `git commit -m "docs: agregar framework de pitch comercial"`).

2. ❯ **Verificación Local Obligatoria**:
   ↳ Ejecuta la suite de pruebas del proyecto:
   ```bash
   npm test
   ```
   ↳ Comprueba que el servidor arranca y responde correctamente en `http://localhost:5173`:
   ```bash
   npm start
   ```
   ↳ Verifica que la consola del navegador permanezca libre de errores no controlados.

3. ❯ **Enviar la Rama al Repositorio Remoto**:
   ```bash
   git push origin feature/nombre-funcionalidad
   ```

4. ❯ **Plantilla y Apertura de Pull Request**:
   ↳ Al abrir el PR en GitHub/GitLab, utiliza la siguiente plantilla estandarizada:

   ```markdown
   ## ¿Qué hace este PR?
   Breve resumen del cambio en 1-2 frases.

   ## ¿Por qué?
   El problema o necesidad que resuelve.

   ## ¿Cómo se probó?
   Pasos para verificar que funciona.

   ## Checklist
   - [ ] El código compila / corre sin errores
   - [ ] Los commits siguen el estándar
   - [ ] Se actualizó la documentación si aplica
   ```

---

## 5. REPORTE DE ERRORES (ISSUES)

Si identificas un fallo en el sistema, un error de renderizado o un comportamiento inesperado:

1. ❯ **Verificar Duplicados**: Revisa la lista de *Issues* abiertos para confirmar que el problema no haya sido reportado previamente.
2. ❯ **Crear un Nuevo Issue**: Abre un reporte proporcionando:
   ↳ **Título Claro**: Resumen descriptivo del fallo (ej. `[Bug]: Error 401 no redirige a la vista de login`).
   ↳ **Pasos para Reproducir**: Lista secuencial de acciones que detonan el error.
   ↳ **Comportamiento Observado vs. Esperado**: Qué ocurrió en pantalla frente a qué debió ocurrir.
   ↳ **Información de Entorno**: Navegador web y versión utilizada.
3. ❯ **Sin Asignación Previa**: No es necesario asignar ni asumir la resolución del Issue al momento de crearlo; la revisión y priorización se gestionará conjuntamente por el equipo.
