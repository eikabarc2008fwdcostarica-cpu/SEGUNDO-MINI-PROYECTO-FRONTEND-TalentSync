"use strict";

import { internalRequest } from "../services/api.js";
import { $ } from "./ui.js";

export function initAssistant() {
  document.body.insertAdjacentHTML("beforeend", `<button id="assistant-open" class="assistant-open" type="button" aria-label="Abrir asistente virtual">TS</button><aside id="assistant-panel" class="assistant-panel" aria-label="Asistente virtual TalentSync" hidden><header><div><strong>Asistente TalentSync</strong><small>Especialista en empleo y plataforma</small></div><button id="assistant-close" type="button" aria-label="Cerrar asistente">×</button></header><div id="assistant-messages" class="assistant-messages" aria-live="polite"><p class="assistant-message assistant">Hola. Puedo ayudarte exclusivamente con vacantes, empresas, candidatos, postulaciones, entrevistas, ofertas y funciones de TalentSync.</p></div><form id="assistant-form"><textarea name="message" maxlength="1200" required aria-label="Mensaje para el asistente" placeholder="Pregunta sobre empleo o TalentSync..."></textarea><button class="btn btn--primary">Enviar</button></form><p class="assistant-scope">Gemini · Respaldo local · Temas laborales únicamente</p></aside>`);

  const panel = $("#assistant-panel");
  const messages = $("#assistant-messages");
  const form = $("#assistant-form");

  $("#assistant-open").onclick = () => {
    panel.hidden = false;
    form.message.focus();
  };
  $("#assistant-close").onclick = () => {
    panel.hidden = true;
    $("#assistant-open").focus();
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const field = event.currentTarget.message;
    const message = field.value.trim();
    if (!message) return;
    append(message, "user");
    field.value = "";
    field.disabled = true;
    const waiting = append("Procesando…", "assistant");
    try {
      const data = await internalRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message, language: localStorage.getItem("talentsync_language") || "es" })
      });
      waiting.textContent = data.reply;
    } catch (error) {
      waiting.textContent = error.message;
      waiting.classList.add("error");
    } finally {
      field.disabled = false;
      field.focus();
    }
  };

  function append(text, type) {
    const item = document.createElement("p");
    item.className = `assistant-message ${type}`;
    item.textContent = text;
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }
}
