import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Busboy from "busboy";
import { MAX_CV_SIZE, extractDocumentText, analyzeWithConfiguredAI } from "./cv-analysis.js";
import { authenticatedUser, contactsFor, conversationsFor, createMessage, endSession, loginDemo, markMessageRead, messagesFor, userCanAccessPage } from "./talentsync-service.js";

try { process.loadEnvFile(); } catch { /* La configuración de IA es opcional. */ }

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
function configuredSecret(value){return Boolean(value&&!/^(?:tu_|your_|example|change[-_]?me)/i.test(value.trim()))}

function sendJSON(response, status, payload) {
  response.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" });
  response.end(JSON.stringify(payload));
}

function readJSON(request,limit=150000){return new Promise((resolve,reject)=>{const chunks=[];let size=0;request.on("data",chunk=>{size+=chunk.length;if(size>limit){reject(new Error("La solicitud es demasiado grande."));request.destroy();return}chunks.push(chunk)});request.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}"))}catch{reject(new Error("El contenido JSON no es válido."))}});request.on("error",reject)})}
async function readRemoteJSON(remoteResponse,service){const text=await remoteResponse.text();try{return JSON.parse(text)}catch{throw new Error(`${service} devolvió una respuesta incompatible. Verifica la URL del endpoint y desactiva respuestas en streaming.`)}}

async function handleChat(request,response){
  const currentUser=await authenticatedUser(request);if(!currentUser)return sendJSON(response,401,{message:"Inicia sesión para utilizar el asistente."});
  if(!process.env.AI_API_URL||!configuredSecret(process.env.AI_API_KEY)||!process.env.AI_MODEL)return sendJSON(response,503,{message:"Configura AI_API_URL, una AI_API_KEY real y AI_MODEL para activar el asistente."});
  try{const {message,language="es",consent=false,behavior=[]}=await readJSON(request);if(typeof message!=="string"||!message.trim()||message.length>1200)return sendJSON(response,400,{message:"Escribe un mensaje válido de hasta 1200 caracteres."});const safeRoles={recruiter:"reclutador",company:"reclutador de empresa",candidate:"persona que busca empleo"};const activity=consent&&Array.isArray(behavior)?behavior.slice(-20).map(item=>`${item.type}:${String(item.value).slice(0,80)}`).join(", "):"No disponible (sin consentimiento).";const aiResponse=await fetch(process.env.AI_API_URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({model:process.env.AI_MODEL,stream:false,messages:[{role:"system",content:`Eres el asistente de TalentSync. Atiendes a un ${safeRoles[currentUser.role]||safeRoles.recruiter}. Responde en el idioma ${language}, de forma breve, útil y sin tomar decisiones laborales automáticas. No infieras atributos sensibles. Actividad autorizada: ${activity}`},{role:"user",content:message.trim()}],temperature:.35}),signal:AbortSignal.timeout(25000)});const data=await readRemoteJSON(aiResponse,"El proveedor de IA");if(!aiResponse.ok)throw new Error(data.error?.message||"El proveedor de IA no respondió.");const reply=data.choices?.[0]?.message?.content;if(!reply)throw new Error("El proveedor de IA devolvió una respuesta vacía.");return sendJSON(response,200,{reply,engine:"configured-ai"})}catch(error){return sendJSON(response,/grande|válid|1200/.test(error.message)?400:502,{message:error.message})}
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
  if (request.method === "GET" && url.pathname === "/api/status") return sendJSON(response,200,{server:"TalentSync",translationMode:"local-offline",aiConfigured:Boolean(process.env.AI_API_URL&&configuredSecret(process.env.AI_API_KEY)&&process.env.AI_MODEL)});
  if (request.method === "POST" && url.pathname === "/api/analyze-cv") return handleCVAnalysis(request,response);
  if (request.method === "POST" && url.pathname === "/api/chat") return handleChat(request,response);
  try {
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === "/" ? "/pages/index.html" : pathname;
    const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = join(root, safePath);
    if (!(await stat(file)).isFile()) throw new Error("Not found");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 · Recurso no encontrado");
  }
}).listen(Number(process.env.PORT) || 5173, "0.0.0.0", () => console.log(`TalentSync disponible en http://localhost:${Number(process.env.PORT) || 5173}`));
