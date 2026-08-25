import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Busboy from "busboy";
import { MAX_CV_SIZE, extractDocumentText, analyzeWithConfiguredAI } from "./cv-analysis.js";

try { process.loadEnvFile(); } catch { /* La configuración de IA es opcional. */ }

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

function sendJSON(response, status, payload) {
  response.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" });
  response.end(JSON.stringify(payload));
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
  if (!request.headers.authorization?.startsWith("Bearer ")) return sendJSON(response,401,{ message:"Inicia sesión para analizar currículums." });
  try {
    const { fields,file } = await parseCVUpload(request), vacancyId = Number(fields.vacancyId), candidateId = Number(fields.candidateId) || null;
    if (!Number.isInteger(vacancyId) || vacancyId < 1) return sendJSON(response,400,{ message:"Selecciona una vacante válida." });
    const extension = extname(file.filename || "").toLowerCase(), allowedMime = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (![".pdf",".docx"].includes(extension) || !allowedMime.includes(file.mimeType)) return sendJSON(response,415,{ message:"Formato no válido. Utiliza un archivo PDF o DOCX." });
    const vacancyResponse = await fetch(`https://dummyjson.com/products/${vacancyId}`, { headers:{ Authorization:request.headers.authorization }, signal:AbortSignal.timeout(10000) });
    if (!vacancyResponse.ok) return sendJSON(response, vacancyResponse.status === 404 ? 404 : 502, { message:vacancyResponse.status === 404 ? "La vacante seleccionada no existe." : "No se pudo obtener la vacante." });
    const vacancy = await vacancyResponse.json(); let cvText;
    try { cvText = await extractDocumentText(file.buffer,extension); } finally { file.buffer.fill(0); }
    if (cvText.length < 40) return sendJSON(response,422,{ message:"No se pudo extraer suficiente texto profesional del documento." });
    const analysis = await analyzeWithConfiguredAI(cvText,vacancy);
    return sendJSON(response,200,{ ...analysis, candidateId, vacancy:{ id:vacancy.id,title:vacancy.title }, fileName:file.filename, analyzedAt:new Date().toISOString(), engine:process.env.AI_API_KEY ? "configured-ai" : "local-explainable" });
  } catch (error) {
    const known = /tamaño|formato|documento|currículum|extraer|vacante|IA|servicio|tiempo|solicitud/i.test(error.message);
    const status = /tamaño/i.test(error.message) ? 413 : /formato/i.test(error.message) ? 415 : /tiempo/i.test(error.message) ? 504 : /IA|servicio/i.test(error.message) ? 503 : known ? 400 : 500;
    return sendJSON(response, status, { message:known ? error.message : "No se pudo analizar el currículum. Inténtalo nuevamente." });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (request.method === "POST" && url.pathname === "/api/analyze-cv") return handleCVAnalysis(request,response);
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
}).listen(Number(process.env.PORT) || 5173, "127.0.0.1", () => console.log(`TalentSync disponible en http://localhost:${Number(process.env.PORT) || 5173}`));
