import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Busboy from "busboy";
import { MAX_CV_SIZE, extractDocumentText, analyzeWithConfiguredAI } from "./cv-analysis.js";
import { authenticatedUser, contactsFor, conversationsFor, createMessage, endSession, loginDemo, markMessageRead, messagesFor, userCanAccessPage } from "./talentsync-service.js";

try { process.loadEnvFile(); } catch { /* La configuración de IA es opcional. */ }

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4" };
function configuredSecret(value){return Boolean(value&&!/^(?:tu_|your_|example|change[-_]?me)/i.test(value.trim()))}

function sendJSON(response, status, payload) {
  response.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" });
  response.end(JSON.stringify(payload));
}

function readJSON(request,limit=150000){return new Promise((resolve,reject)=>{const chunks=[];let size=0;request.on("data",chunk=>{size+=chunk.length;if(size>limit){reject(new Error("La solicitud es demasiado grande."));request.destroy();return}chunks.push(chunk)});request.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}"))}catch{reject(new Error("El contenido JSON no es válido."))}});request.on("error",reject)})}
async function readRemoteJSON(remoteResponse,service){const text=await remoteResponse.text();try{return JSON.parse(text)}catch{throw new Error(`${service} devolvió una respuesta incompatible. Verifica la URL del endpoint y desactiva respuestas en streaming.`)}}

function localTalentSyncReply(message,user){
  const text=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const includes=(...words)=>words.some(word=>text.includes(word));
  const role={recruiter:"reclutador",company:"reclutador de empresa",candidate:"candidato"}[user.role]||"usuario";
  const inScope=includes("empleo","trabajo","vacante","puesto","candidato","curriculum","currículum","cv","postul","aplicar","empresa","reclut","entrevista","oferta","contrat","talentsync","perfil","tarea","mensaje","salario","habilidad","experiencia","dashboard","panel","notificacion","idioma","accesibilidad","inicio de sesion","contraseña","cuenta");
  if(includes("hola","buenas","buen dia","ayuda","que puedes hacer","cómo estás","como estas"))return `Hola. Soy el asistente virtual de TalentSync para tu rol de ${role}. Puedo orientarte sobre vacantes, empresas, candidatos, postulaciones, entrevistas, ofertas y funciones de la plataforma.`;
  if(includes("gracias","muchas gracias"))return "Con gusto. Puedo seguir ayudándote con cualquier proceso laboral o función de TalentSync.";
  if(!inScope)return "Solo puedo responder consultas relacionadas con TalentSync, empleo, vacantes, candidatos, postulaciones, entrevistas y empresas. Formula tu pregunta dentro de alguno de esos temas.";
  if(includes("discrimin","raza","religion","género","genero","edad","descartar automaticamente","decide por mi","mejor candidato"))return "No puedo tomar ni recomendar decisiones laborales basadas en atributos sensibles. Puedes comparar experiencia, habilidades y requisitos objetivos; la decisión final debe tomarla una persona responsable.";
  if(includes("vacante","puesto"))return user.role==="candidate"?"Abre Vacantes para consultar oportunidades y usa Postularme en la que coincida con tu perfil. Revisa requisitos, empresa y condiciones antes de confirmar.":"Desde Vacantes puedes crear y editar puestos, consultar candidatos y dar seguimiento al progreso. Toda modificación requiere la doble confirmación de seguridad.";
  if(includes("postul","aplicar"))return user.role==="candidate"?"En Mis postulaciones puedes revisar los procesos en los que participas y su estado actual. Para aplicar, entra en Vacantes y confirma Postularme en los dos pasos.":"En Postulaciones puedes revisar el pipeline y administrar los procesos autorizados para tu rol.";
  if(includes("empresa"))return user.role==="candidate"?"Puedes consultar la empresa asociada a cada vacante y oferta. Verifica siempre la descripción y las condiciones del puesto.":"En Empresas encontrarás el directorio corporativo, vacantes activas y seguimiento de cada cuenta.";
  if(includes("entrevista"))return "La sección Entrevistas reúne las próximas reuniones y sus datos. Comprueba fecha, hora y medio de contacto antes de continuar.";
  if(includes("oferta","contrat"))return user.role==="candidate"?"En Mis ofertas puedes consultar y responder propuestas. Aceptar o rechazar exige dos confirmaciones para evitar cambios accidentales.":"En Ofertas puedes redactar propuestas y actualizar su estado; cada cambio utiliza doble confirmación.";
  if(includes("curriculum","currículum","cv","perfil","habilidad","experiencia"))return user.role==="candidate"?"Mantén actualizado Mi perfil con título, habilidades y resumen profesional. Procura describir experiencia verificable y relevante para la vacante.":"Puedes revisar el perfil y, si tu rol lo permite, usar Análisis de CV como apoyo explicable. La decisión final siempre corresponde a una persona.";
  if(includes("mensaje"))return "Mensajería permite conversar con los contactos autorizados de cada proceso. Evita compartir contraseñas, documentos sensibles o información personal innecesaria.";
  if(includes("notificacion"))return "El botón de campana está en la barra superior, después del traductor y antes del usuario. Ábrelo para consultar las novedades de tus procesos.";
  if(includes("idioma"))return "El selector de la barra superior permite usar TalentSync en español, inglés, chino, francés o portugués sin credenciales externas.";
  if(includes("accesibilidad"))return "La barra superior incluye modo oscuro, perfiles de daltonismo, tamaño de texto y dictado de búsqueda.";
  if(includes("inicio de sesion","contraseña","cuenta"))return "Usa únicamente una cuenta autorizada para acceder. Si la sesión expira, vuelve al login; nunca compartas tu contraseña en el chat.";
  if(includes("salario"))return "Para evaluar una compensación, compara responsabilidades, experiencia requerida, modalidad, ubicación y beneficios. TalentSync no fija salarios ni sustituye la negociación entre las partes.";
  return "Puedo orientarte sobre ese tema dentro de TalentSync. Indica si necesitas consultar, crear o dar seguimiento a una vacante, postulación, entrevista, oferta, candidato o empresa.";
}

async function handleChat(request,response){
  const currentUser=await authenticatedUser(request);if(!currentUser)return sendJSON(response,401,{message:"Inicia sesión para utilizar el asistente."});
  try{const {message}=await readJSON(request);if(typeof message!=="string"||!message.trim()||message.length>1200)return sendJSON(response,400,{message:"Escribe un mensaje válido de hasta 1200 caracteres."});return sendJSON(response,200,{reply:localTalentSyncReply(message,currentUser),engine:"local-talentsync"})}catch(error){return sendJSON(response,400,{message:/grande|JSON/.test(error.message)?error.message:"No se pudo procesar el mensaje."})}
}

function parseCVUpload(request) {
  return new Promise((resolve, reject) => {
    let busboy;
    try { busboy = Busboy({ headers:request.headers, limits:{ fileSize:MAX_CV_SIZE, files:1, fields:3 } }); }
    catch { reject(new Error("La solicitud de carga no es válida.")); return; }
    const fields = {}, chunks = []; let fileInfo = null, tooLarge = false;
    busboy.on("field", (name,value) => { fields[name] = value; });
    busboy.on("file", (name,file,info) => {
      if (name !== "cv") { file.resume(); return; }
      fileInfo = info;
      file.on("limit", () => { tooLarge = true; });
      file.on("data", chunk => chunks.push(chunk));
    });
    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (tooLarge) return reject(new Error("El archivo supera el tamaño máximo de 5 MB."));
      if (!fileInfo || !chunks.length) return reject(new Error("Selecciona un currículum para analizar."));
      resolve({ fields, file:{ ...fileInfo, buffer:Buffer.concat(chunks) } });
    });
    request.pipe(busboy);
  });
}

async function handleCVAnalysis(request, response) {
  const currentUser=await authenticatedUser(request);if (!currentUser) return sendJSON(response,401,{ message:"Inicia sesión para analizar currículums." });
  if(currentUser.role!=="recruiter")return sendJSON(response,403,{message:"Solo el rol reclutador puede iniciar análisis de currículums."});
  try {
    const { fields,file } = await parseCVUpload(request), vacancyId = Number(fields.vacancyId), candidateId = Number(fields.candidateId) || null;
    if (!Number.isInteger(vacancyId) || vacancyId < 1) return sendJSON(response,400,{ message:"Selecciona una vacante válida." });
    const extension = extname(file.filename || "").toLowerCase(), allowedMime = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (![".pdf",".docx"].includes(extension) || !allowedMime.includes(file.mimeType)) return sendJSON(response,415,{ message:"Formato no válido. Utiliza un archivo PDF o DOCX." });
    const vacancyResponse = await fetch(`https://dummyjson.com/products/${vacancyId}`, { signal:AbortSignal.timeout(10000) });
    if (!vacancyResponse.ok) return sendJSON(response, vacancyResponse.status === 404 ? 404 : 502, { message:vacancyResponse.status === 404 ? "La vacante seleccionada no existe." : "No se pudo obtener la vacante." });
    const vacancy = await vacancyResponse.json(); let cvText;
    try { cvText = await extractDocumentText(file.buffer,extension); } finally { file.buffer.fill(0); }
    if (cvText.length < 40) return sendJSON(response,422,{ message:"No se pudo extraer suficiente texto profesional del documento." });
    const analysis = await analyzeWithConfiguredAI(cvText,vacancy);
    return sendJSON(response,200,{ ...analysis, candidateId, vacancy:{ id:vacancy.id,title:vacancy.title }, fileName:file.filename, analyzedAt:new Date().toISOString(), engine:configuredSecret(process.env.AI_API_KEY) ? "configured-ai" : "local-explainable" });
  } catch (error) {
    const known = /tamaño|formato|documento|currículum|extraer|vacante|IA|servicio|tiempo|solicitud/i.test(error.message);
    const status = /tamaño/i.test(error.message) ? 413 : /formato/i.test(error.message) ? 415 : /tiempo/i.test(error.message) ? 504 : /IA|servicio/i.test(error.message) ? 503 : known ? 400 : 500;
    return sendJSON(response, status, { message:known ? error.message : "No se pudo analizar el currículum. Inténtalo nuevamente." });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if(request.method==="POST"&&url.pathname==="/api/auth/login"){try{const {username,password}=await readJSON(request),session=await loginDemo(username,password);return session?sendJSON(response,200,session):sendJSON(response,401,{message:"Usuario o contraseña incorrectos."})}catch(error){return sendJSON(response,400,{message:error.message})}}
  if(request.method==="GET"&&url.pathname==="/api/languages")return sendJSON(response,200,{languages:[{code:"es",name:"Español"},{code:"en",name:"English"},{code:"zh",name:"中文"},{code:"fr",name:"Français"},{code:"pt",name:"Português"}],source:"local-offline"})
  if(url.pathname.startsWith("/api/")&&!['/api/status','/api/languages','/api/chat','/api/analyze-cv'].includes(url.pathname)){
    const user=await authenticatedUser(request);if(!user)return sendJSON(response,401,{message:"Sesión no válida o expirada."});
    if(request.method==="GET"&&url.pathname==="/api/session")return sendJSON(response,200,{userId:user.id,name:user.name,role:user.role,companyId:user.companyId});
    if(request.method==="GET"&&url.pathname==="/api/permissions")return sendJSON(response,200,{pages:["dashboard","candidatos","vacantes","empresas","postulaciones","entrevistas","tareas","ofertas","mensajeria","ayuda","analisis-cv","seguimiento-cliente"].filter(page=>userCanAccessPage(user.role,page))});
    if(request.method==="POST"&&url.pathname==="/api/auth/logout"){endSession(request);return sendJSON(response,200,{ok:true})}
    if(request.method==="GET"&&url.pathname==="/api/users")return sendJSON(response,200,{users:await contactsFor(user)});
    if(request.method==="GET"&&url.pathname==="/api/messages")return sendJSON(response,200,{conversations:await conversationsFor(user)});
    const conversationMatch=url.pathname.match(/^\/api\/messages\/([^/]+)$/);
    if(request.method==="GET"&&conversationMatch){const messages=await messagesFor(user,decodeURIComponent(conversationMatch[1]));return messages?sendJSON(response,200,{messages}):sendJSON(response,403,{message:"No tienes acceso a esta conversación."})}
    if(request.method==="POST"&&url.pathname==="/api/messages"){const message=await createMessage(user,await readJSON(request));return message?sendJSON(response,201,{message}):sendJSON(response,400,{message:"Destinatario o mensaje no válido."})}
    const readMatch=url.pathname.match(/^\/api\/messages\/(\d+)\/read$/);if(request.method==="PATCH"&&readMatch){const message=await markMessageRead(user,readMatch[1]);return message?sendJSON(response,200,{message}):sendJSON(response,403,{message:"No puedes modificar este mensaje."})}
  }
  if (request.method === "GET" && url.pathname === "/api/status") return sendJSON(response,200,{server:"TalentSync",translationMode:"local-offline",assistantMode:"local-talentsync",aiConfigured:Boolean(process.env.AI_API_URL&&configuredSecret(process.env.AI_API_KEY)&&process.env.AI_MODEL)});
  if (request.method === "POST" && url.pathname === "/api/analyze-cv") return handleCVAnalysis(request,response);
  if (request.method === "POST" && url.pathname === "/api/chat") return handleChat(request,response);
  try {
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === "/" ? "/pages/landing.html" : pathname;
    const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = join(root, safePath);
    const fileStats = await stat(file);
    if (!fileStats.isFile()) throw new Error("Not found");

    const extension = extname(file);
    const contentType = types[extension] || "application/octet-stream";
    const range = request.headers.range;

    if (extension === ".mp4" && range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);

      if (!match) {
        response.writeHead(416, { "Content-Range": `bytes */${fileStats.size}` });
        return response.end();
      }

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : fileStats.size - 1;

      if (start > end || end >= fileStats.size) {
        response.writeHead(416, { "Content-Range": `bytes */${fileStats.size}` });
        return response.end();
      }

      const fileBuffer = await readFile(file);
      const chunk = fileBuffer.subarray(start, end + 1);

      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
        "Content-Length": chunk.length,
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      });

      return response.end(chunk);
    }

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileStats.size,
      "Accept-Ranges": extension === ".mp4" ? "bytes" : "none",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 · Recurso no encontrado");
  }
}).listen(Number(process.env.PORT) || 5173, "0.0.0.0", () => console.log(`TalentSync disponible en http://localhost:${Number(process.env.PORT) || 5173}`));
