import test from "node:test";
import assert from "node:assert/strict";
import { analyzeEvidence, parseAIJSON, SCORE_WEIGHTS } from "../cv-analysis.js";

test("calcula un score explicable entre 0 y 100 usando evidencia", () => {
  const result = analyzeEvidence("Ingeniera con 6 años de experiencia. JavaScript, GitHub, AWS y PostgreSQL.", { id:1, title:"JavaScript Developer", description:"5 años, JavaScript, Git, AWS, SQL", category:"software" });
  assert.ok(result.matchPercentage >= 0 && result.matchPercentage <= 100);
  assert.ok(result.matchedRequirements.includes("javascript"));
  assert.ok(!result.matchedRequirements.includes("java"));
  assert.ok(result.keywordComparison.every(item => ["Coincidencia","Sin evidencia"].includes(item.status)));
  assert.deepEqual(result.methodology.weights,SCORE_WEIGHTS);
});

test("describe falta de evidencia sin afirmar incumplimiento", () => {
  const result = analyzeEvidence("Profesional en diseño UX/UI con 3 años de experiencia.", { id:2, title:"Cloud Engineer", description:"AWS, Docker y Kubernetes", category:"software" });
  assert.ok(result.gaps.length > 0);
  assert.ok(result.gaps.every(item => /No se encontró evidencia/i.test(item.reason)));
  assert.doesNotMatch(result.summary,/contratar|rechazar|no apto/i);
});

test("no otorga puntos cuando la vacante carece de requisitos profesionales", () => {
  const result = analyzeEvidence("Especialista con amplia trayectoria profesional y múltiples herramientas.", { id:3, title:"Producto de demostración", description:"Artículo de alta calidad", category:"general" });
  assert.equal(result.matchPercentage,0);
  assert.equal(result.classification,"Datos insuficientes");
  assert.deepEqual(result.methodology.applicableCategories,[]);
});

test("acepta JSON de IA envuelto en markdown o texto adicional",()=>{
  assert.deepEqual(parseAIJSON('```json\n{"ok":true}\n```'),{ok:true});
  assert.deepEqual(parseAIJSON('null\n{"ok":true}\ntexto adicional'),{ok:true});
});
