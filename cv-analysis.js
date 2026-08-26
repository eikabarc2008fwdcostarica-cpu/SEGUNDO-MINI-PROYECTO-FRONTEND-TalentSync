"use strict";

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const MAX_CV_SIZE = 5 * 1024 * 1024;
export const SCORE_WEIGHTS = Object.freeze({ skills: 30, experience: 25, tools: 15, education: 10, certifications: 10, essentialRequirements: 10 });

const EQUIVALENCES = Object.freeze({
  javascript: ["javascript", "js", "ecmascript", "node.js", "nodejs"],
  python: ["python"], java: ["java"], sql: ["sql", "postgresql", "mysql", "base de datos relacional", "bases de datos relacionales"],
  postgresql: ["postgresql", "postgres", "sql", "base de datos relacional"], aws: ["aws", "amazon web services", "cloud computing", "nube"],
  azure: ["azure", "microsoft azure", "cloud computing", "nube"], git: ["git", "github", "gitlab", "control de versiones"],
  ux: ["ux", "ui", "ux/ui", "experiencia de usuario", "diseño de interfaz"], react: ["react", "react.js", "reactjs"],
  docker: ["docker", "contenedores"], kubernetes: ["kubernetes", "k8s"], excel: ["excel", "hojas de cálculo"],
  liderazgo: ["liderazgo", "liderando", "líder", "leader", "gestión de equipos"], inglés: ["inglés", "english"],
  finanzas: ["finanzas", "financiero", "financial"], marketing: ["marketing", "mercadeo"], ventas: ["ventas", "sales"]
});
const EDUCATION_TERMS = ["licenciatura", "bachillerato", "maestría", "master", "universidad", "ingeniería", "degree"];
const CERTIFICATION_TERMS = ["certificación", "certificado", "certified", "pmp", "scrum master", "aws certified"];
const SENSITIVE_LABELS = ["edad", "sexo", "género", "religión", "estado civil", "raza", "etnia", "discapacidad", "orientación sexual", "dirección", "nacionalidad"];

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cleanText = value => String(value || "").replace(/\0/g, "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const contains = (text, term) => {
  const haystack = normalize(text), needle = normalize(term).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`(^|[^a-z0-9])${needle}([^a-z0-9]|$)`,"i").test(haystack);
};

export async function extractDocumentText(buffer, extension) {
  if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try { return cleanText((await parser.getText()).text); } finally { await parser.destroy(); }
  }
  if (extension === ".docx") return cleanText((await mammoth.extractRawText({ buffer })).value);
  throw new Error("Formato no válido. Utiliza un archivo PDF o DOCX.");
}

function vacancyEvidence(vacancy) {
  return cleanText([vacancy.title, vacancy.description, vacancy.category, vacancy.brand, ...(vacancy.tags || [])].filter(Boolean).join("\n"));
}
function professionalCVText(text) {
  return cleanText(text.split("\n").filter(line => !SENSITIVE_LABELS.some(label => contains(line,label))).join("\n"));
}
function requiredConcepts(vacancyText) {
  return Object.entries(EQUIVALENCES).filter(([, aliases]) => aliases.some(alias => contains(vacancyText, alias))).map(([key, aliases]) => ({ key, aliases }));
}
function yearsIn(text) {
  const values = [...normalize(text).matchAll(/(\d{1,2})\s*(?:\+\s*)?(?:anos|years)/g)].map(match => Number(match[1])).filter(value => value < 60);
  return values.length ? Math.max(...values) : null;
}
function classification(score) {
  if (score >= 85) return "Alta coincidencia";
  if (score >= 65) return "Coincidencia media-alta";
  if (score >= 40) return "Coincidencia parcial";
  return "Coincidencia baja";
}
function bounded(value) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }

export function analyzeEvidence(cvSource, vacancy) {
  const cvText = professionalCVText(cvSource), vacancyText = vacancyEvidence(vacancy), concepts = requiredConcepts(vacancyText);
  const comparisons = concepts.map(concept => {
    const found = concept.aliases.filter(alias => contains(cvText, alias));
    return { requirement: concept.key, cvEvidence: found.length ? found.join(" / ") : "No identificado", status: found.length ? "Coincidencia" : "Sin evidencia" };
  });
  const matched = comparisons.filter(item => item.status === "Coincidencia"), missing = comparisons.filter(item => item.status === "Sin evidencia");
  const requestedYears = yearsIn(vacancyText), cvYears = yearsIn(cvText), experienceScore = requestedYears ? (cvYears === null ? 0 : bounded(cvYears / requestedYears * 100)) : 0;
  const skillScore = concepts.length ? bounded(matched.length / concepts.length * 100) : 0;
  const toolConcepts = comparisons.filter(item => ["javascript","python","java","sql","postgresql","aws","azure","git","react","docker","kubernetes","excel"].includes(item.requirement));
  const toolsScore = toolConcepts.length ? bounded(toolConcepts.filter(item => item.status === "Coincidencia").length / toolConcepts.length * 100) : 0;
  const vacancyEducation = EDUCATION_TERMS.filter(term => contains(vacancyText, term)), vacancyCerts = CERTIFICATION_TERMS.filter(term => contains(vacancyText, term));
  const educationScore = vacancyEducation.length ? bounded(vacancyEducation.filter(term => contains(cvText, term)).length / vacancyEducation.length * 100) : 0;
  const certificationScore = vacancyCerts.length ? bounded(vacancyCerts.filter(term => contains(cvText, term)).length / vacancyCerts.length * 100) : 0;
  const essentialScore = concepts.length ? skillScore : 0;
  const categoryScores = { skills:skillScore, experience:experienceScore, tools:toolsScore, education:educationScore, certifications:certificationScore, essentialRequirements:essentialScore };
  const applicableKeys = new Set([...(concepts.length?["skills","essentialRequirements"]:[]),...(toolConcepts.length?["tools"]:[]),...(requestedYears?["experience"]:[]),...(vacancyEducation.length?["education"]:[]),...(vacancyCerts.length?["certifications"]:[])]);
  const applicable = Object.entries(categoryScores).filter(([key]) => applicableKeys.has(key));
  const weightTotal = applicable.reduce((sum,[key]) => sum + SCORE_WEIGHTS[key], 0);
  const matchPercentage = weightTotal ? bounded(applicable.reduce((sum,[key,value]) => sum + value * SCORE_WEIGHTS[key], 0) / weightTotal) : 0;
  const strengths = matched.slice(0,6).map(item => ({ title:item.requirement, evidence:`Se encontró evidencia explícita relacionada con “${item.cvEvidence}” en el currículum.` }));
  if (requestedYears && cvYears !== null && cvYears >= requestedYears) strengths.unshift({ title:"Experiencia solicitada", evidence:`El currículum declara ${cvYears} años y la vacante solicita ${requestedYears}.` });
  const gaps = missing.slice(0,6).map(item => ({ requirement:item.requirement, reason:`No se encontró evidencia suficiente de ${item.requirement} en el currículum proporcionado.` }));
  if (requestedYears && cvYears === null) gaps.unshift({ requirement:`${requestedYears}+ años de experiencia`, reason:"No se encontró una cantidad de años de experiencia claramente documentada." });
  const label = weightTotal ? classification(matchPercentage) : "Datos insuficientes";
  return {
    matchPercentage, classification:label,
    summary:weightTotal?`El perfil presenta ${label.toLowerCase()} con la información profesional disponible para “${vacancy.title}”. Se identificaron ${matched.length} coincidencias y ${missing.length} requisitos sin evidencia suficiente. Este resultado describe coincidencia documental y requiere revisión humana.`:`No fue posible calcular una coincidencia profesional significativa porque la vacante “${vacancy.title}” no contiene requisitos profesionales estructurados en los datos disponibles. Agrega requisitos verificables antes de interpretar el porcentaje.`,
    categoryScores, strengths, gaps, matchedRequirements:matched.map(item=>item.requirement), missingRequirements:missing.map(item=>item.requirement), keywordComparison:comparisons,
    methodology:{ weights:SCORE_WEIGHTS, applicableCategories:[...applicableKeys], note:"Las categorías sin requisitos explícitos en la vacante no influyen en el porcentaje general ni reciben puntos automáticos." }
  };
}

function normalizeAIResponse(value) {
  const required = ["matchPercentage","classification","summary","categoryScores","strengths","gaps","matchedRequirements","missingRequirements"];
  if (!value || required.some(key => value[key] === undefined)) throw new Error("Respuesta IA inválida.");
  value.matchPercentage = bounded(value.matchPercentage);
  for (const key of Object.keys(SCORE_WEIGHTS)) value.categoryScores[key] = bounded(value.categoryScores[key]);
  return value;
}

export function parseAIJSON(raw) {
  const cleaned=String(raw).trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  try{return JSON.parse(cleaned)}catch{}
  const start=cleaned.indexOf("{");if(start<0)throw new Error("El servicio IA no devolvió JSON válido.");
  let depth=0,inString=false,escaped=false;
  for(let index=start;index<cleaned.length;index++){const char=cleaned[index];if(inString){if(escaped)escaped=false;else if(char==="\\")escaped=true;else if(char==='"')inString=false;continue}if(char==='"'){inString=true;continue}if(char==="{")depth++;if(char==="}"&&--depth===0){try{return JSON.parse(cleaned.slice(start,index+1))}catch{break}}}
  throw new Error("El servicio IA devolvió JSON incompleto o incompatible.");
}

export async function analyzeWithConfiguredAI(cvText, vacancy) {
  const hasRealKey=Boolean(process.env.AI_API_KEY&&!/^(?:tu_|your_|example|change[-_]?me)/i.test(process.env.AI_API_KEY.trim()));
  if (!process.env.AI_API_URL || !hasRealKey || !process.env.AI_MODEL) return analyzeEvidence(cvText, vacancy);
  const instruction = `Analiza exclusivamente el contenido proporcionado. No inventes habilidades ni experiencia. No infieras características personales o sensibles. Compara el CV con los requisitos de la vacante. Diferencia evidencia encontrada, parcial y no encontrada. Devuelve JSON con matchPercentage, classification, summary, categoryScores (skills, experience, tools, education, certifications, essentialRequirements), strengths, gaps, matchedRequirements, missingRequirements y keywordComparison. Nunca recomiendes contratar o rechazar. Pesos: ${JSON.stringify(SCORE_WEIGHTS)}.`;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(process.env.AI_API_URL, { method:"POST", signal:controller.signal, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${process.env.AI_API_KEY}` }, body:JSON.stringify({ model:process.env.AI_MODEL, response_format:{ type:"json_object" }, messages:[{ role:"system", content:instruction },{ role:"user", content:`VACANTE:\n${vacancyEvidence(vacancy)}\n\nCURRÍCULUM PROFESIONAL:\n${professionalCVText(cvText).slice(0,50000)}` }] }) });
    if (!response.ok) throw new Error("Servicio IA no disponible.");
    const payload = await response.json(), raw = payload.choices?.[0]?.message?.content ?? payload.output_text ?? payload;
    return normalizeAIResponse(typeof raw === "string" ? parseAIJSON(raw) : raw);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("El servicio IA superó el tiempo de espera.");
    throw error;
  } finally { clearTimeout(timer); }
}
