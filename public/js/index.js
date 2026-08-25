"use strict";

import { login, getSession, saveSession, clearSession, getList, createItem, updateItem, deleteItem } from "./api.js";

const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const state = { view: "dashboard", query: "", page: 1, perPage: 8, data: {}, session: getSession(), interviewMode: "evaluations", calendarMode: "month", calendarDate: new Date(), calendarFilters: { recruiter: "all", type: "all" }, offerFilter: "Todas", activeChat: null, chatMobileOpen: false, chatFilter: "all" };
const navItems = [
  ["dashboard", "dashboard", "Dashboard"], ["candidates", "users", "Candidatos"], ["vacancies", "briefcase", "Vacantes"],
  ["companies", "building", "Empresas"], ["applications", "pipeline", "Postulaciones"], ["interviews", "calendar", "Entrevistas"], ["tasks", "check", "Tareas"],
  ["offers", "offer", "Ofertas"], ["messaging", "message", "Mensajería"], ["help", "help", "Ayuda"]
];
const config = {
  candidates: { title: "Candidatos", subtitle: "Gestiona y descubre talento para tus procesos.", endpoint: "users", key: "users", create: "Agregar candidato", search: "Buscar candidatos..." },
  vacancies: { title: "Vacantes", subtitle: "Administra tus oportunidades laborales activas.", endpoint: "products", key: "products", create: "Publicar nueva vacante", search: "Buscar vacantes..." },
  companies: { title: "Empresas clientes", subtitle: "Directorio de cuentas y organizaciones asociadas.", endpoint: "carts", key: "carts", create: "Registrar nueva empresa cliente", search: "Buscar empresas, sectores..." },
  applications: { title: "Postulaciones", subtitle: "Acompaña candidatos en cada etapa del proceso.", endpoint: "posts", key: "posts", create: "Agregar postulación", search: "Buscar postulaciones..." },
  interviews: { title: "Entrevistas", subtitle: "Centraliza evaluaciones y notas de entrevistas.", endpoint: "comments", key: "comments", create: "Agregar nota de entrevista", search: "Buscar candidatos, notas..." },
  tasks: { title: "Tareas diarias", subtitle: "Prioriza el trabajo de tu equipo de reclutamiento.", endpoint: "todos", key: "todos", create: "Agregar tarea", search: "Buscar tareas..." },
  offers: { title: "Gestión de Ofertas", subtitle: "Propuestas laborales vinculadas con candidatos y vacantes.", search: "Buscar ofertas o candidatos..." },
  messaging: { title: "Mensajería Directa", subtitle: "Conversaciones locales con candidatos de tus procesos.", search: "Buscar conversaciones..." },
  help: { title: "Centro de Ayuda", subtitle: "Respuestas, guías y recursos de inclusión.", search: "Buscar artículos de ayuda..." },
  clientPortal: { title: "Seguimiento de Vacantes", subtitle: "Vista colaborativa de procesos para empresas clientes.", search: "Buscar procesos prioritarios..." }
};

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"></path>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"></path>',
  building: '<path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M2 21h20"></path>',
  pipeline: '<circle cx="5" cy="5" r="2"></circle><circle cx="19" cy="12" r="2"></circle><circle cx="5" cy="19" r="2"></circle><path d="M7 5h4a4 4 0 0 1 4 4v3h2M7 19h4a4 4 0 0 0 4-4v-3"></path>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
  check: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
  offer: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H8.5a2.5 2.5 0 1 1 2.3-3.5L12 7Zm0 0h3.5a2.5 2.5 0 1 0-2.3-3.5L12 7Z"></path>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>',
  help: '<circle cx="12" cy="12" r="10"></circle><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4M12 18h.01"></path>'
};
function icon(name) { return `<svg aria-hidden="true" viewBox="0 0 24 24">${iconPaths[name] || iconPaths.help}</svg>`; }

const content = $("#content");
const modal = $("#modal");
const ACCESSIBILITY_STORAGE_KEY = "talentsync_accessibility";
const defaultPreferences = {
  theme: "light",
  colorMode: "none",
  fontScale: "normal",
  voiceEnabled: false
};
const validThemes = ["light", "dark", "high-contrast"];
const validColorModes = ["none", "protanopia", "deuteranopia", "tritanopia", "monochrome"];
const validFontScales = ["small", "normal", "large", "xlarge"];

let preferences = loadAccessibilityPreferences();
let voiceRecognition = null;

function loadAccessibilityPreferences() {
  try {
    const savedPreferences = JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY));
    const loadedPreferences = { ...defaultPreferences, ...savedPreferences };

    if (!validThemes.includes(loadedPreferences.theme)) loadedPreferences.theme = "light";
    if (!validColorModes.includes(loadedPreferences.colorMode)) loadedPreferences.colorMode = "none";
    if (!validFontScales.includes(loadedPreferences.fontScale)) loadedPreferences.fontScale = "normal";
    loadedPreferences.voiceEnabled = Boolean(loadedPreferences.voiceEnabled);

    return loadedPreferences;
  } catch {
    return { ...defaultPreferences };
  }
}

function saveAccessibilityPreferences() {
  localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
}

function getCurrentVisualMode() {
  if (preferences.colorMode !== "none") return preferences.colorMode;
  if (preferences.theme === "dark") return "dark";
  if (preferences.theme === "high-contrast") return "high-contrast";
  return "base";
}

function applyAccessibilityPreferences() {
  const root = document.documentElement;
  const currentVisualMode = getCurrentVisualMode();

  root.dataset.theme = preferences.theme;
  root.dataset.colorMode = preferences.colorMode;
  root.dataset.fontScale = preferences.fontScale;

  saveAccessibilityPreferences();

  const lightButton = $("#theme-light");
  const darkButton = $("#theme-dark");
  const fontButton = $("#font-size");
  const voiceToggle = $("#login-voice-toggle");
  const voiceStatus = $("#login-voice-status");

  if (lightButton) {
    const isLight = preferences.theme === "light" && preferences.colorMode === "none";
    lightButton.classList.toggle("active", isLight);
    lightButton.setAttribute("aria-pressed", String(isLight));
  }

  if (darkButton) {
    const isDark = preferences.theme === "dark" && preferences.colorMode === "none";
    darkButton.classList.toggle("active", isDark);
    darkButton.setAttribute("aria-pressed", String(isDark));
  }

  document.querySelectorAll("[data-color-mode]").forEach(button => {
    const isSelected = button.dataset.colorMode === preferences.colorMode;
    button.setAttribute("aria-checked", String(isSelected));
  });

  document.querySelectorAll("[data-login-theme]").forEach(button => {
    const isSelected = button.dataset.loginTheme === currentVisualMode;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  document.querySelectorAll("[data-login-font-scale]").forEach(button => {
    const isSelected = button.dataset.loginFontScale === preferences.fontScale;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  if (fontButton) {
    const fontLabels = {
      small: "Restablecer tamaño del texto",
      normal: "Aumentar tamaño del texto",
      large: "Aumentar texto al tamaño extra grande",
      xlarge: "Reducir tamaño del texto"
    };

    fontButton.setAttribute("aria-label", fontLabels[preferences.fontScale]);
    fontButton.title = fontLabels[preferences.fontScale];
    fontButton.classList.toggle("active", preferences.fontScale !== "normal");
  }

  if (voiceToggle) {
    voiceToggle.classList.toggle("active", preferences.voiceEnabled);
    voiceToggle.setAttribute("aria-pressed", String(preferences.voiceEnabled));
    voiceToggle.setAttribute(
      "aria-label",
      preferences.voiceEnabled ? "Desactivar asistente de voz" : "Activar asistente de voz"
    );
  }

  if (voiceStatus) {
    voiceStatus.textContent = preferences.voiceEnabled
      ? "Asistente de voz activado"
      : "Asistente de voz desactivado";
  }
}

function setVisualMode(mode, announce = true) {
  const visualModes = {
    base: { theme: "light", colorMode: "none", label: "Modo base activado." },
    dark: { theme: "dark", colorMode: "none", label: "Modo oscuro activado." },
    "high-contrast": { theme: "high-contrast", colorMode: "none", label: "Alto contraste activado." },
    protanopia: { theme: "light", colorMode: "protanopia", label: "Modo protanopia activado." },
    deuteranopia: { theme: "light", colorMode: "deuteranopia", label: "Modo deuteranopia activado." },
    tritanopia: { theme: "light", colorMode: "tritanopia", label: "Modo tritanopia activado." },
    monochrome: { theme: "light", colorMode: "monochrome", label: "Modo monocromático activado." }
  };

  const selectedMode = visualModes[mode] || visualModes.base;
  preferences.theme = selectedMode.theme;
  preferences.colorMode = selectedMode.colorMode;
  applyAccessibilityPreferences();

  if (announce) {
    toast(selectedMode.label);
    speakText(selectedMode.label);
  }
}

function setFontScale(fontScale, announce = true) {
  if (!validFontScales.includes(fontScale)) return;

  preferences.fontScale = fontScale;
  applyAccessibilityPreferences();

  if (announce) {
    const messages = {
      small: "Texto reducido.",
      normal: "Tamaño de texto normal.",
      large: "Texto aumentado.",
      xlarge: "Texto en tamaño extra grande."
    };

    toast(messages[fontScale]);
    speakText(messages[fontScale]);
  }
}

function speakText(text) {
  if (!preferences.voiceEnabled || !("speechSynthesis" in window) || !text) return;

  window.speechSynthesis.cancel();

  const message = new SpeechSynthesisUtterance(String(text));
  message.lang = "es-CR";
  message.rate = 0.95;
  message.pitch = 1;
  window.speechSynthesis.speak(message);
}

function setVoiceEnabled(enabled) {
  if (!("speechSynthesis" in window)) {
    toast("El asistente de voz no está disponible en este navegador.", "error");
    return;
  }

  preferences.voiceEnabled = Boolean(enabled);
  applyAccessibilityPreferences();

  if (preferences.voiceEnabled) {
    speakText("Asistente de voz activado.");
    toast("Asistente de voz activado.");
  } else {
    window.speechSynthesis.cancel();
    toast("Asistente de voz desactivado.");
  }
}

function closeLoginAccessibilityPanel(returnFocus = true) {
  const panel = $("#login-accessibility-panel");
  const button = $("#login-accessibility-button");

  if (!panel || !button) return;

  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");

  if (returnFocus) button.focus();
}

function toggleLoginAccessibilityPanel() {
  const panel = $("#login-accessibility-panel");
  const button = $("#login-accessibility-button");

  if (!panel || !button) return;

  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));

  if (willOpen) {
    panel.querySelector("button")?.focus();
    speakText("Panel de accesibilidad abierto.");
  }
}

function closeColorMenu() {
  const menu = $("#color-menu");
  const button = $("#color-menu-button");

  if (menu) menu.hidden = true;
  if (button) button.setAttribute("aria-expanded", "false");
}

function startVoiceSearch() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    toast("El dictado de voz no está disponible en este navegador.", "error");
    return;
  }

  if (voiceRecognition) {
    voiceRecognition.stop();
    return;
  }

  voiceRecognition = new Recognition();
  voiceRecognition.lang = "es-CR";
  voiceRecognition.interimResults = false;
  voiceRecognition.continuous = false;

  const button = $("#voice-search");

  voiceRecognition.onstart = () => {
    button?.classList.add("listening");
    button?.setAttribute("aria-pressed", "true");
    button?.setAttribute("aria-label", "Detener dictado de voz");
    toast("Escuchando… Di lo que deseas buscar.");
    speakText("Dictado activado.");
  };

  voiceRecognition.onresult = event => {
    const text = event.results[0][0].transcript.trim();
    const input = $("#global-search");

    if (!input) return;

    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  voiceRecognition.onerror = event => {
    if (event.error !== "aborted") {
      toast(
        event.error === "not-allowed"
          ? "Permite el acceso al micrófono para usar el dictado."
          : "No pudimos reconocer la voz. Inténtalo de nuevo.",
        "error"
      );
    }
  };

  voiceRecognition.onend = () => {
    button?.classList.remove("listening");
    button?.setAttribute("aria-pressed", "false");
    button?.setAttribute("aria-label", "Activar dictado de voz para buscar");
    voiceRecognition = null;
  };

  voiceRecognition.start();
}

function toast(message, type = "success") {
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = message; $("#toasts").append(el);
  setTimeout(() => el.remove(), 3300);
}
function setLoading() { content.innerHTML = `<div class="spinner-wrap" aria-busy="true"><span class="spinner"></span><p>Cargando información...</p></div>`; }
function pageHead(view, showCreate = true) {
  const c = config[view];
  return `<header class="page-head"><div><p class="eyebrow">TalentSync workspace</p><h1>${c.title}</h1><p>${c.subtitle}</p></div>${showCreate ? `<button class="btn btn--primary" data-create="${view}">＋ ${c.create}</button>` : ""}</header>`;
}
function openModal(title, body, kicker = "TalentSync") { $("#modal-title").textContent = title; $("#modal-kicker").textContent = kicker; $("#modal-body").innerHTML = body; modal.showModal(); }
function closeModal() { modal.close(); }
function setView(view) {
  state.view = view; state.query = ""; state.page = 1; location.hash = view;
  $("#global-search").value = ""; $("#global-search").placeholder = view === "dashboard" ? "Buscar en TalentSync..." : config[view].search;
  document.querySelectorAll("#nav button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  closeSidebar(); render();
}
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#overlay").hidden = true; }

async function render() {
  if (state.view === "dashboard") return renderDashboard();
  setLoading();
  try {
    if (state.view === "help") return renderHelp();
    if (["offers", "messaging", "clientPortal"].includes(state.view)) {
      const [users, products] = await Promise.all([state.data.candidates ? { users: state.data.candidates } : getList("users", 30), state.data.vacancies ? { products: state.data.vacancies } : getList("products", 30)]);
      state.data.candidates ||= users.users; state.data.vacancies ||= products.products;
      if (state.view === "offers") return renderOffers();
      if (state.view === "messaging") return renderMessaging();
      return renderClientPortal();
    }
    if (!state.data[state.view]) {
      const c = config[state.view]; const response = await getList(c.endpoint, 30); state.data[state.view] = response[c.key] || [];
    }
    renderModule();
  } catch (error) { renderError(error); }
}

async function renderDashboard() {
  setLoading();
  try {
    const [users, products, posts, todos] = await Promise.all([getList("users", 5), getList("products", 5), getList("posts", 5), getList("todos", 30)]);
    const pending = todos.todos.filter(item => !item.completed).length;
    content.innerHTML = `<header class="page-head"><div><p class="eyebrow">Resumen general</p><h1>Hola, ${esc(state.session?.firstName || "Recruiter")} 👋</h1><p>Esto es lo que está ocurriendo hoy en tu equipo.</p></div><button class="btn btn--primary" data-create="vacancies">＋ Publicar vacante</button></header>
      <section class="metrics" aria-label="Métricas principales">
        ${metric("♙", users.total, "Total candidatos", "+12% este mes")}${metric("⑂", posts.total, "Procesos activos", "+8% este mes")}${metric("▤", products.total, "Vacantes", "+4 esta semana")}${metric("✓", pending, "Tareas pendientes", `${todos.total - pending} completadas`)}
      </section>
      <section class="dashboard-grid"><article class="panel"><div class="panel-head"><h2>Actividad reciente</h2><button class="btn btn--ghost" data-view="applications">Ver procesos</button></div><div class="activity">
        ${users.users.slice(0,4).map((u,i)=>`<div class="activity-row"><span class="activity-dot"></span><div><p><strong>${esc(u.firstName)} ${esc(u.lastName)}</strong> ${["se agregó como candidato","avanzó a revisión","actualizó su perfil","fue invitado a entrevista"][i]}</p><small>Hace ${i+1} hora${i ? "s" : ""}</small></div></div>`).join("")}
      </div></article><article class="panel"><div class="panel-head"><h2>Candidatos por etapa</h2><span class="badge green">Últimos 7 días</span></div><div class="bar-chart" aria-label="Gráfico de candidatos">${[45,74,57,90,65,82,53].map(n=>`<span class="bar" style="height:${n}%" title="${n} candidatos"></span>`).join("")}</div></article></section>`;
  } catch (error) { renderError(error); }
}
function metric(icon, value, label, delta) { return `<article class="metric"><span class="metric-icon">${icon}</span><strong>${Number(value).toLocaleString("es-CR")}</strong><small>${label}</small><span class="delta">${esc(delta)}</span></article>`; }

function renderModule() {
  const data = filteredData();
  if (state.view === "companies") return renderCompanies(data);
  if (state.view === "applications") return renderApplications(data);
  if (state.view === "interviews") return state.interviewMode === "calendar" ? renderCalendar() : renderInterviews(data);
  if (state.view === "tasks") return renderTasks(data);
  renderTable(data);
}
function filteredData() {
  const q = state.query.toLowerCase().trim(); const list = state.data[state.view] || [];
  return q ? list.filter(item => JSON.stringify(item).toLowerCase().includes(q)) : list;
}
function paged(data) { const pages = Math.max(1, Math.ceil(data.length / state.perPage)); state.page = Math.min(state.page, pages); return { rows: data.slice((state.page-1)*state.perPage,state.page*state.perPage), pages }; }
function pagination(total, pages) { return `<footer class="pagination"><span>Mostrando ${Math.min(total,(state.page-1)*state.perPage+1)}–${Math.min(total,state.page*state.perPage)} de ${total} registros</span><div class="pages">${Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" class="${state.page===i+1?"active":""}" aria-label="Página ${i+1}">${i+1}</button>`).join("")}</div></footer>`; }

function renderTable(data) {
  const { rows, pages } = paged(data); const vacancy = state.view === "vacancies";
  content.innerHTML = `${pageHead(state.view)}<section class="panel">${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr>${vacancy ? "<th>Vacante</th><th>Empresa</th><th>Categoría</th><th>Estado</th><th>Salario</th>" : "<th>Candidato</th><th>Información / posición</th><th>Etiquetas</th>"}<th>Acciones</th></tr></thead><tbody>${rows.map(vacancy ? vacancyRow : candidateRow).join("")}</tbody></table></div>${pagination(data.length,pages)}` : emptyState()}</section>`;
}
function candidateRow(item) { const name=`${item.firstName} ${item.lastName}`; return `<tr><td><div class="person"><img src="${esc(item.image)}" alt=""><div><strong>${esc(name)}</strong><small>${esc(item.email)}</small></div></div></td><td>${esc(item.company?.title || item.role || "Profesional")}<br><small class="muted">${esc(item.company?.department || item.address?.city || "Talento disponible")}</small></td><td><span class="badge">${esc(item.company?.department || "Candidato")}</span></td><td>${actions(item.id, true)}</td></tr>`; }
function vacancyRow(item) { return `<tr><td><strong>${esc(item.title)}</strong></td><td>${esc(item.brand || "TalentSync Partner")}</td><td><span class="badge">${esc(item.category)}</span></td><td><span class="badge ${item.stock>10?"green":"yellow"}">${item.stock>10?"Activa":"En revisión"}</span></td><td>$${Number(item.price*100).toLocaleString("en-US")}</td><td>${actions(item.id)}</td></tr>`; }
function actions(id, message = false) { return `<div class="row-actions"><button data-action="view" data-id="${id}">Ver</button><button data-action="edit" data-id="${id}">Editar</button>${message ? `<button data-message-candidate="${id}">Mensaje</button>` : ""}<button data-action="delete" data-id="${id}">Eliminar</button></div>`; }

function renderCompanies(data) {
  const { rows, pages }=paged(data); const vacancies=data.reduce((sum,c)=>sum+c.totalQuantity,0);
  content.innerHTML=`${pageHead("companies")}<section class="metrics">${metric("▣",data.length,"Total empresas","Directorio activo")}${metric("▤",vacancies,"Vacantes activas","En todas las cuentas")}${metric("◫",6,"Sectores principales","Cobertura regional")}${metric("✓",Math.round(data.length*.8),"Cuentas saludables","80% del total")}</section><section class="cards-grid">${rows.map((c,i)=>`<article class="company-card"><div class="company-top"><span class="company-logo">${String.fromCharCode(65+(c.id%26))}</span><span class="badge ${i%4===3?"yellow":"green"}">${i%4===3?"En revisión":"Activa"}</span></div><h3>${esc(["Nexa Solutions","BluePeak Labs","Grupo Horizonte","Vertex Digital","Innova Works","Central Partners"][i%6])}</h3><p>Cuenta corporativa con ${c.totalProducts} posiciones gestionadas por el equipo.</p><div class="company-meta"><div><small>SECTOR</small><strong>${esc(["Tecnología","Finanzas","Retail"][i%3])}</strong></div><div><small>VACANTES</small><strong>${c.totalQuantity}</strong></div></div><div class="card-actions"><button class="btn btn--ghost" data-client-portal="${c.id}">Ver seguimiento</button>${actions(c.id)}</div></article>`).join("")}</section>${pagination(data.length,pages)}`;
}
function renderApplications(data) {
  const stages=["Recibida","Revisión","Finalista"];
  content.innerHTML=`${pageHead("applications")}<section class="kanban">${stages.map((stage,index)=>{const items=data.filter((_,i)=>i%3===index);return `<div class="kanban-col"><div class="kanban-title"><span>${stage}</span><span class="badge">${items.length}</span></div>${items.map(p=>`<article class="kanban-card"><small>APP-${String(p.id).padStart(4,"0")}</small><h3>${esc(p.title)}</h3><p>${esc(p.body.slice(0,95))}...</p><div class="row-actions">${actions(p.id)}</div></article>`).join("")}</div>`}).join("")}</section>`;
}
function renderInterviews(data) {
  const {rows,pages}=paged(data); content.innerHTML=`${pageHead("interviews")}<div class="view-tabs" role="tablist"><button class="active" role="tab" aria-selected="true" data-interview-mode="evaluations">Evaluaciones</button><button role="tab" aria-selected="false" data-interview-mode="calendar">Calendario Maestro</button></div><section class="interviews">${rows.map((c,i)=>`<article class="panel interview-card"><div class="company-top"><div class="person"><span class="initials">${esc(c.user.fullName?.split(" ").map(x=>x[0]).slice(0,2).join("")||"TS")}</span><div><strong>${esc(c.user.fullName)}</strong><small>${i%2?"Entrevista técnica":"Entrevista cultural"}</small></div></div><span class="badge ${i%3?"green":"yellow"}">${i%3?"Completada":"Seguimiento"}</span></div><p class="stars" aria-label="${(i%2)+4} de 5 estrellas">${"★".repeat((i%2)+4)}${"☆".repeat(1-(i%2))}</p><p class="quote">“${esc(c.body)}”</p>${actions(c.id)}</article>`).join("")}</section>${pagination(data.length,pages)}`;
}
function renderTasks(data) {
  const done=data.filter(t=>t.completed).length, progress=data.length?Math.round(done/data.length*100):0;
  content.innerHTML=`${pageHead("tasks",false)}<section class="tasks-layout"><article class="panel"><form id="quick-task" class="quick-add"><label class="sr-only" for="quick-title">Nueva tarea</label><input id="quick-title" name="title" placeholder="Quick add task..." required><select name="priority" aria-label="Prioridad"><option>Media</option><option>Alta</option><option>Baja</option></select><button class="btn btn--primary" aria-label="Agregar tarea">＋</button></form><div>${data.map((t,i)=>`<div class="task ${t.completed?"done":""}"><input type="checkbox" data-toggle-task="${t.id}" ${t.completed?"checked":""} aria-label="Completar ${esc(t.todo)}"><label>${esc(t.todo)}</label><span class="badge ${i%3===0?"red":i%3===1?"yellow":"green"}">${["Alta","Media","Baja"][i%3]}</span><div class="row-actions"><button data-action="edit" data-id="${t.id}">Editar</button><button data-action="delete" data-id="${t.id}">×</button></div></div>`).join("")}</div></article><aside class="task-progress"><h2>Progress</h2><div class="progress-ring" style="--progress:${progress}%"><strong>${progress}%</strong></div><p class="progress-meta"><strong>${done}</strong> completadas de ${data.length}</p></aside></section>`;
}

function calendarEvents() {
  const comments = state.data.interviews || [], year = state.calendarDate.getFullYear(), month = state.calendarDate.getMonth();
  const types = ["Entrevista", "Filtro técnico", "Seguimiento", "Cierre de proceso", "Otro evento"];
  return comments.slice(0,18).map((comment,index)=>({ id:comment.id, title:comment.user?.fullName || `Candidato ${index+1}`, type:types[index%types.length], recruiter:["Emily Johnson","Michael Williams","Sophia Brown"][index%3], date:new Date(year,month,(index*2+2)%28+1,9+(index%7)), detail:comment.body }));
}
function renderCalendar() {
  const date=state.calendarDate,year=date.getFullYear(),month=date.getMonth(),monthName=date.toLocaleDateString("es-CR",{month:"long",year:"numeric"});
  let events=calendarEvents().filter(event=>(state.calendarFilters.recruiter==="all"||event.recruiter===state.calendarFilters.recruiter)&&(state.calendarFilters.type==="all"||event.type===state.calendarFilters.type));
  const tabs=`<div class="view-tabs" role="tablist"><button role="tab" aria-selected="false" data-interview-mode="evaluations">Evaluaciones</button><button class="active" role="tab" aria-selected="true" data-interview-mode="calendar">Calendario Maestro</button></div>`;
  const controls=`<section class="calendar-toolbar"><div class="calendar-nav"><button class="icon-btn" data-calendar-move="-1" aria-label="Periodo anterior">←</button><h2>${esc(monthName[0].toUpperCase()+monthName.slice(1))}</h2><button class="icon-btn" data-calendar-move="1" aria-label="Periodo siguiente">→</button></div><div class="calendar-filters"><select id="recruiter-filter" aria-label="Filtrar por reclutador"><option value="all">Todos los reclutadores</option>${["Emily Johnson","Michael Williams","Sophia Brown"].map(v=>`<option ${state.calendarFilters.recruiter===v?"selected":""}>${v}</option>`).join("")}</select><select id="event-type-filter" aria-label="Filtrar por tipo de evento"><option value="all">Todos los eventos</option>${["Entrevista","Filtro técnico","Seguimiento","Cierre de proceso","Otro evento"].map(v=>`<option ${state.calendarFilters.type===v?"selected":""}>${v}</option>`).join("")}</select><div class="segmented"><button class="${state.calendarMode==="month"?"active":""}" data-calendar-mode="month">Mensual</button><button class="${state.calendarMode==="week"?"active":""}" data-calendar-mode="week">Semanal</button></div></div></section>`;
  content.innerHTML=`${pageHead("interviews",false)}${tabs}${controls}${state.calendarMode==="month"?monthCalendar(year,month,events):weekCalendar(events)}`;
}
function monthCalendar(year,month,events){const first=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push(`<div class="calendar-day muted-day"></div>`);for(let day=1;day<=total;day++){const dayEvents=events.filter(e=>e.date.getDate()===day);cells.push(`<div class="calendar-day"><span class="day-number">${day}</span>${dayEvents.map(calendarEventButton).join("")}</div>`)}return `<section class="calendar-scroll"><div class="calendar-grid"><div class="calendar-weekdays">${["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map(d=>`<span>${d}</span>`).join("")}</div><div class="calendar-days">${cells.join("")}</div></div></section>`}
function weekCalendar(events){const start=new Date(state.calendarDate),weekday=(start.getDay()+6)%7;start.setDate(start.getDate()-weekday);return `<section class="week-grid">${Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);const items=events.filter(e=>e.date.getDate()===day.getDate());return `<article class="week-day"><strong>${day.toLocaleDateString("es-CR",{weekday:"short",day:"numeric"})}</strong>${items.length?items.map(calendarEventButton).join(""):`<small>Sin eventos</small>`}</article>`}).join("")}</section>`}
function calendarEventButton(event){return `<button class="calendar-event type-${event.type.replace(/\s/g,"-").toLowerCase()}" data-calendar-event="${event.id}"><strong>${event.date.toLocaleTimeString("es-CR",{hour:"2-digit",minute:"2-digit"})}</strong>${esc(event.title)}<small>${esc(event.type)}</small></button>`}

function getOffers(){try{const saved=JSON.parse(localStorage.getItem("talentsync_offers"));if(saved?.length)return saved}catch{}const statuses=["Pendiente","Firmada","Firmada","Rechazada"];const offers=state.data.candidates.slice(0,12).map((u,i)=>({id:i+1,candidateId:u.id,vacancyId:state.data.vacancies[i%state.data.vacancies.length].id,status:statuses[i%4],date:new Date(Date.now()-i*86400000*2).toISOString()}));localStorage.setItem("talentsync_offers",JSON.stringify(offers));return offers}
function saveOffers(offers){localStorage.setItem("talentsync_offers",JSON.stringify(offers))}
function renderOffers(){const offers=getOffers(),q=state.query.toLowerCase(),findUser=id=>state.data.candidates.find(u=>u.id===id),findVacancy=id=>state.data.vacancies.find(v=>v.id===id);const filtered=offers.filter(o=>state.offerFilter==="Todas"||o.status===state.offerFilter).filter(o=>{const u=findUser(o.candidateId),v=findVacancy(o.vacancyId);return !q||`${u?.firstName} ${u?.lastName} ${v?.title}`.toLowerCase().includes(q)});content.innerHTML=`${pageHead("offers",false)}<section class="metrics">${metric("○",offers.filter(o=>o.status==="Pendiente").length,"Ofertas pendientes","Requieren seguimiento")}${metric("✓",offers.filter(o=>o.status==="Firmada").length,"Ofertas firmadas","Aceptadas por candidatos")}${metric("×",offers.filter(o=>o.status==="Rechazada").length,"Ofertas rechazadas","Histórico local")}</section><section class="panel"><div class="panel-head"><h2>Ofertas recientes</h2><button class="btn btn--primary" data-new-offer>Redactar nueva oferta</button></div><div class="filter-tabs">${["Todas","Pendientes","Firmadas","Rechazadas"].map((f)=>{const status=f==="Pendientes"?"Pendiente":f==="Firmadas"?"Firmada":f==="Rechazadas"?"Rechazada":"Todas";return `<button class="${state.offerFilter===status?"active":""}" data-offer-filter="${status}">${f}</button>`}).join("")}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Vacante</th><th>Candidato</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>${filtered.map(o=>{const u=findUser(o.candidateId),v=findVacancy(o.vacancyId);return `<tr><td><strong>${esc(v?.title)}</strong></td><td>${esc(u?.firstName)} ${esc(u?.lastName)}</td><td><span class="badge ${o.status==="Firmada"?"green":o.status==="Rechazada"?"red":"yellow"}">${o.status}</span></td><td>${new Date(o.date).toLocaleDateString("es-CR")}</td><td><div class="row-actions"><button data-offer-view="${o.id}">Ver</button><button data-offer-status="${o.id}">Actualizar</button></div></td></tr>`}).join("")}</tbody></table></div></section>`}
function openOfferForm(){const users=state.data.candidates,products=state.data.vacancies;openModal("Redactar Nueva Oferta",`<form id="offer-form"><div class="form-grid"><div class="field"><label for="offer-candidate">Candidato</label><select id="offer-candidate" name="candidateId">${users.map(u=>`<option value="${u.id}">${esc(u.firstName)} ${esc(u.lastName)}</option>`).join("")}</select></div><div class="field"><label for="offer-vacancy">Vacante</label><select id="offer-vacancy" name="vacancyId">${products.map(v=>`<option value="${v.id}">${esc(v.title)}</option>`).join("")}</select></div><div class="field full"><label for="offer-note">Mensaje de oferta</label><textarea id="offer-note" name="note" required>Nos complace presentarte una propuesta para unirte a nuestro equipo.</textarea></div></div><div class="modal-actions"><button type="button" class="btn btn--ghost" data-close-modal>Cancelar</button><button class="btn btn--primary">Guardar oferta</button></div></form>`,"Oferta vinculada")}

function getChats(){try{return JSON.parse(localStorage.getItem("talentsync_chats"))||{}}catch{return {}}}function saveChats(chats){localStorage.setItem("talentsync_chats",JSON.stringify(chats))}
function renderMessaging(){let candidates=state.data.candidates.filter(u=>!state.query||`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(state.query.toLowerCase())).slice(0,12);if(state.chatFilter==="unread")candidates=candidates.slice(0,2);state.activeChat ||= candidates[0]?.id;const active=state.data.candidates.find(u=>u.id===state.activeChat),chats=getChats(),messages=chats[state.activeChat]||[{from:"candidate",text:"Hola, gracias por contactarme. Quedo atento al avance del proceso.",date:new Date().toISOString()}];content.innerHTML=`${pageHead("messaging",false)}<section class="messaging-layout ${state.chatMobileOpen?"chat-open":""}"><aside class="conversation-list"><div class="conversation-tabs"><button class="${state.chatFilter==="all"?"active":""}" data-chat-filter="all">Todos</button><button class="${state.chatFilter==="unread"?"active":""}" data-chat-filter="unread">No leídos</button></div>${candidates.map((u,i)=>`<button class="conversation ${u.id===state.activeChat?"active":""}" data-chat="${u.id}"><img src="${esc(u.image)}" alt=""><span><strong>${esc(u.firstName)} ${esc(u.lastName)}</strong><small>${esc(u.company?.title||u.email)}</small></span>${i<2?'<i aria-label="No leído"></i>':""}</button>`).join("")}</aside><article class="chat-panel"><header class="chat-head"><button class="icon-btn chat-back" data-chat-back aria-label="Volver a conversaciones">←</button><img src="${esc(active?.image)}" alt=""><div><strong>${esc(active?.firstName)} ${esc(active?.lastName)}</strong><small>${esc(active?.company?.title||"Candidato")}</small></div></header><div class="chat-history">${messages.map(m=>`<div class="message ${m.from}"><p>${esc(m.text)}</p><small>${new Date(m.date).toLocaleTimeString("es-CR",{hour:"2-digit",minute:"2-digit"})}</small></div>`).join("")}</div><div class="quick-messages">${["Solicitar CV","Agendar Entrevista","Rechazo Cordial"].map(t=>`<button data-quick-message="${t}">${t}</button>`).join("")}</div><form id="message-form" class="message-form"><label class="sr-only" for="message-text">Mensaje</label><textarea id="message-text" name="message" placeholder="Escribe un mensaje..." required></textarea><button class="btn btn--primary">Enviar</button></form></article></section>`}

const helpArticles=[{cat:"Primeros Pasos",title:"Configurar tu espacio de reclutamiento",text:"Conoce el dashboard, la navegación y las tareas iniciales."},{cat:"Gestión de Candidatos",title:"Crear y organizar candidatos",text:"Agrega perfiles, edita información y conecta conversaciones."},{cat:"Publicación de Vacantes",title:"Publicar una vacante urgente",text:"Crea la vacante y monitorea sus postulaciones."},{cat:"Accesibilidad e Inclusión",title:"Navegación por teclado",text:"Usa Tab, Shift + Tab, Enter y Escape para recorrer TalentSync."},{cat:"Accesibilidad e Inclusión",title:"Contraste y lectores de pantalla",text:"Utiliza los temas, modos de color, etiquetas y regiones ARIA."},{cat:"Accesibilidad e Inclusión",title:"Redacción inclusiva y formularios",text:"Crea contenidos comprensibles, respetuosos y con instrucciones claras."}];
function renderHelp(){const q=state.query.toLowerCase(),articles=helpArticles.filter(a=>!q||`${a.cat} ${a.title} ${a.text}`.toLowerCase().includes(q));content.innerHTML=`<section class="help-hero"><p class="eyebrow">Centro de Ayuda</p><h1>¿En qué podemos ayudarte hoy?</h1><p>Encuentra respuestas para aprovechar TalentSync de forma segura e inclusiva.</p><div class="help-search">${icon("help")}<label class="sr-only" for="help-query">Buscar artículos de ayuda</label><input id="help-query" placeholder="Ej. ¿Cómo publicar una vacante urgente?" value="${esc(state.query)}"></div></section><section class="help-grid">${["Primeros Pasos","Gestión de Candidatos","Publicación de Vacantes"].map(cat=>`<article class="help-category">${icon(cat==="Primeros Pasos"?"dashboard":cat==="Gestión de Candidatos"?"users":"briefcase")}<h2>${cat}</h2><p>${helpArticles.find(a=>a.cat===cat).text}</p><button data-help-category="${cat}">Ver artículos</button></article>`).join("")}</section><section class="accessibility-center"><div><p class="eyebrow">Inclusión por diseño</p><h2>Centro de Accesibilidad e Inclusión</h2><p>Guías sobre navegación por teclado, contraste, lectores de pantalla, redacción inclusiva y formularios accesibles.</p></div><div class="article-list">${articles.filter(a=>a.cat==="Accesibilidad e Inclusión"||q).map(a=>`<button data-help-article="${a.title}"><span><strong>${a.title}</strong><small>${a.text}</small></span><b>→</b></button>`).join("")}</div></section>`}

function renderClientPortal(){const products=state.data.vacancies.slice(0,6),users=state.data.candidates.slice(0,5),actionsState=JSON.parse(localStorage.getItem("talentsync_client_actions")||"{}");content.innerHTML=`<header class="page-head"><div><button class="back-link" data-view="companies">← Volver a empresas</button><p class="eyebrow">Portal de Clientes</p><h1>Seguimiento de Vacantes</h1><p>Visibilidad compartida de los procesos prioritarios.</p></div></header><section class="metrics">${metric("▤",products.length,"Vacantes activas","Procesos abiertos")}${metric("♙",users.length,"Candidatos en terna","Perfiles validados")}${metric("◷",18,"Tiempo promedio","Días por contratación")}</section><section class="portal-grid"><div><h2>Procesos prioritarios</h2>${products.slice(0,3).map((p,i)=>`<article class="process-card"><div><span class="badge ${i===0?"red":"yellow"}">${i===0?"Urgente":"Prioridad media"}</span><h3>${esc(p.title)}</h3><p>${["Ciudad de México · Híbrido","San José · Remoto","Bogotá · Presencial"][i]}</p><div><span class="badge">${esc(p.category)}</span> <span class="badge green">Validado</span></div></div><strong>${8+i*3}<small> candidatos</small></strong></article>`).join("")}</div><aside class="action-panel"><h2>Requiere Acción</h2>${users.slice(0,3).map((u,i)=>`<article class="action-candidate"><div class="person"><img src="${esc(u.image)}" alt=""><div><strong>${esc(u.firstName)} ${esc(u.lastName)}</strong><small>${esc(u.company?.title||"Finalista")}</small></div></div>${actionsState[u.id]?`<span class="badge green">${esc(actionsState[u.id])}</span>`:`<div class="client-actions"><button data-client-action="Avanzado" data-id="${u.id}">Avanzar</button><button data-client-action="Rechazado" data-id="${u.id}">Rechazar</button><button data-client-action="Feedback enviado" data-id="${u.id}">Dar feedback</button></div>`}</article>`).join("")}</aside></section>`}
function emptyState(){return `<div class="empty"><span class="metric-icon">⌕</span><h2>Sin resultados</h2><p>No encontramos registros con esos criterios.</p><button class="btn btn--ghost" data-clear-search>Limpiar búsqueda</button></div>`}
function renderError(error){content.innerHTML=`<div class="error-state" role="alert"><span class="metric-icon">!</span><h2>No pudimos cargar la información</h2><p>${esc(error.message)}</p><button class="btn btn--primary" data-retry>Intentar nuevamente</button></div>`}

function formFields(view,item={}) {
  const fields={
    candidates:[["firstName","Nombre",item.firstName],["lastName","Apellido",item.lastName],["email","Correo",item.email,"email"],["role","Rol",item.role]],
    vacancies:[["title","Nombre de vacante",item.title],["brand","Empresa",item.brand],["category","Categoría",item.category],["price","Salario (centenas USD)",item.price,"number"]],
    companies:[["title","Nombre de empresa",item.title||""],["sector","Sector",item.sector||"Tecnología"],["totalQuantity","Vacantes",item.totalQuantity||1,"number"],["status","Estado",item.status||"Activa"]],
    applications:[["title","Título",item.title],["body","Detalle",item.body,"textarea"]],
    interviews:[["fullName","Nombre",item.user?.fullName],["body","Comentario",item.body,"textarea"],["rating","Puntaje",item.rating||5,"number"]],
    tasks:[["todo","Descripción",item.todo],["priority","Prioridad",item.priority||"Media"]]
  }[view];
  return fields.map(([name,label,value,type="text"])=>`<div class="field ${type==="textarea"?"full":""}"><label for="field-${name}">${label}</label>${type==="textarea"?`<textarea id="field-${name}" name="${name}" required>${esc(value||"")}</textarea>`:`<input id="field-${name}" name="${name}" type="${type}" value="${esc(value||"")}" required>`}</div>`).join("");
}
function openForm(view,id=null) {
  const item=id ? state.data[view].find(x=>x.id===id) : {}; const c=config[view];
  openModal(id?`Editar ${c.title.toLowerCase()}`:c.create,`<form id="record-form" data-view="${view}" data-id="${id||""}"><div class="form-grid">${formFields(view,item)}</div><div class="modal-actions"><button type="button" class="btn btn--ghost" data-close-modal>Cancelar</button><button class="btn btn--primary" type="submit">${id?"Guardar cambios":"Crear registro"}</button></div></form>`,id?"Actualizar registro":"Nuevo registro");
}
function openDetails(id) {
  const item=state.data[state.view].find(x=>x.id===id); if(!item)return;
  const entries=Object.entries(item).filter(([,v])=>["string","number","boolean"].includes(typeof v)).slice(0,8);
  openModal("Detalle del registro",`<div class="detail-list">${entries.map(([k,v])=>`<div class="detail-row"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join("")}</div><div class="modal-actions"><button class="btn btn--primary" data-close-modal>Cerrar</button></div>`,config[state.view].title);
}
async function submitRecord(form) {
  const view=form.dataset.view,id=Number(form.dataset.id)||null,c=config[view],button=$("button[type=submit]",form); const data=Object.fromEntries(new FormData(form));
  button.disabled=true; button.textContent="Guardando...";
  try {
    let result;
    if(id){result=await updateItem(c.endpoint,id,data);state.data[view]=state.data[view].map(x=>x.id===id?{...x,...data,...result}:x)}
    else {result=await createItem(c.endpoint,data);const normalized=view==="interviews"?{...result,user:{fullName:data.fullName}}:result;state.data[view]=[normalized,...state.data[view]]}
    closeModal();renderModule();toast(id?"Registro actualizado correctamente.":"Registro creado correctamente.");
  } catch(error){toast(error.message,"error")} finally{button.disabled=false;button.textContent=id?"Guardar cambios":"Crear registro"}
}
function confirmDelete(id) { openModal("¿Eliminar este registro?",`<p class="muted">Esta acción enviará una solicitud DELETE a DummyJSON. El cambio se mantendrá durante esta sesión.</p><div class="modal-actions"><button class="btn btn--ghost" data-close-modal>Cancelar</button><button class="btn btn--danger" data-confirm-delete="${id}">Sí, eliminar</button></div>`,"Confirmación requerida"); }
async function removeRecord(id,button) {
  const c=config[state.view]; button.disabled=true;button.textContent="Eliminando...";
  try{await deleteItem(c.endpoint,id);state.data[state.view]=state.data[state.view].filter(x=>x.id!==id);closeModal();renderModule();toast("Registro eliminado correctamente.")}catch(error){toast(error.message,"error")}finally{button.disabled=false}
}

async function openNotifications() {
  const panel=$("#notification-panel"),button=$("#notification-button");
  if(!panel.hidden){panel.hidden=true;button.setAttribute("aria-expanded","false");return}
  panel.hidden=false;button.setAttribute("aria-expanded","true");$("#notification-list").innerHTML='<div class="notification-loading">Cargando resumen...</div>';
  try{
    if(!state.data.tasks){const result=await getList("todos",30);state.data.tasks=result.todos}
    const pending=state.data.tasks.filter(t=>!t.completed).length,interviews=state.data.interviews?.length||5,offers=state.data.candidates&&state.data.vacancies?getOffers().filter(o=>o.status==="Pendiente").length:3;
    $("#notification-list").innerHTML=`<button data-view="tasks">${icon("check")}<span><strong>${pending} tareas pendientes</strong><small>Revisa las prioridades de hoy</small></span></button><button data-open-calendar>${icon("calendar")}<span><strong>${Math.min(interviews,5)} entrevistas próximas</strong><small>Consulta el Calendario Maestro</small></span></button><button data-view="offers">${icon("offer")}<span><strong>${offers} ofertas requieren revisión</strong><small>Seguimiento de propuestas pendientes</small></span></button>`;
  }catch(error){$("#notification-list").innerHTML=`<p class="form-error">${esc(error.message)}</p>`}
}
function closeTopMenus(){ $("#notification-panel").hidden=true;$("#notification-button").setAttribute("aria-expanded","false");$("#profile-menu").hidden=true;$("#profile-button").setAttribute("aria-expanded","false") }

function buildNav(){ $("#nav").innerHTML=navItems.map(([view,iconName,label])=>`<button data-view="${view}"><span>${icon(iconName)}</span>${label}</button>`).join(""); }
function showApp() {
  state.session = getSession();

  if (!state.session?.accessToken) {
    showLogin();
    return;
  }

  closeLoginAccessibilityPanel(false);
  $("#login-view").hidden = true;
  $("#app").hidden = false;

  const name = `${state.session.firstName || "Recruiter"} ${state.session.lastName || ""}`.trim();
  $("#profile-name").textContent = name;
  $("#profile-menu-name").textContent = name;

  const image = state.session.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dbeafe&color=2563eb`;

  $("#profile-img").src = image;
  $("#top-avatar").src = image;

  buildNav();

  const requestedView = location.hash.slice(1);
  const initialView = requestedView in config || requestedView === "dashboard"
    ? requestedView
    : "dashboard";

  setView(initialView);
  resetInactivity();
}
function showLogin() {
  clearSession();
  state.session = null;
  clearTimeout(inactivityTimer);

  $("#app").hidden = true;
  $("#login-view").hidden = false;

  const form = $("#login-form");
  const errorElement = $("#login-error");

  form.reset();
  errorElement.textContent = "";
  errorElement.hidden = true;

  closeLoginAccessibilityPanel(false);
  $("#username").focus();
}
let inactivityTimer;
function resetInactivity(){if(!state.session)return;clearTimeout(inactivityTimer);inactivityTimer=setTimeout(()=>{showLogin();toast("La sesión se cerró por 30 minutos de inactividad.","error")},30*60*1000)}

function clearLoginError() {
  const errorElement = $("#login-error");
  errorElement.textContent = "";
  errorElement.hidden = true;
}

function showLoginError(message) {
  const errorElement = $("#login-error");
  errorElement.textContent = message;
  errorElement.hidden = false;
  speakText(message);
}

function getFriendlyLoginError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("conexión")
  ) {
    return "No se pudo conectar con el servicio. Revisa tu conexión a Internet.";
  }

  if (message.includes("timeout") || message.includes("tiempo")) {
    return "El servicio tardó demasiado en responder. Inténtalo nuevamente.";
  }

  if (
    message.includes("invalid credentials") ||
    message.includes("username or password") ||
    message.includes("401")
  ) {
    return "El usuario o la contraseña son incorrectos.";
  }

  return error?.message || "No fue posible iniciar sesión. Inténtalo nuevamente.";
}

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();

  const username = $("#username").value.trim();
  const password = $("#password").value;
  const humanCheck = $("#human-check");
  const button = $("#login-button") || $("button[type=submit]", event.currentTarget);
  const buttonText = $("span", button);

  clearLoginError();

  if (!username && !password) {
    showLoginError("Debes ingresar el usuario y la contraseña.");
    $("#username").focus();
    return;
  }

  if (!username) {
    showLoginError("Debes ingresar el nombre de usuario.");
    $("#username").focus();
    return;
  }

  if (!password) {
    showLoginError("Debes ingresar la contraseña.");
    $("#password").focus();
    return;
  }

  if (humanCheck && !humanCheck.checked) {
    showLoginError("Confirma que eres una persona antes de continuar.");
    humanCheck.focus();
    return;
  }

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  if (buttonText) buttonText.textContent = "Verificando...";
  else button.textContent = "Verificando...";

  try {
    const session = await login(username, password);

    if (!session?.accessToken) {
      throw new Error("La respuesta de autenticación no contiene un token válido.");
    }

    saveSession({ ...session, lastActivity: Date.now() });
    speakText("Sesión iniciada correctamente.");
    showApp();
  } catch (error) {
    console.error("Error técnico durante el inicio de sesión:", error);
    showLoginError(getFriendlyLoginError(error));
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (buttonText) buttonText.textContent = "Iniciar sesión";
    else button.textContent = "Iniciar sesión";
  }
});

$("#username").addEventListener("input", clearLoginError);
$("#password").addEventListener("input", clearLoginError);
$("#human-check")?.addEventListener("change", clearLoginError);

$("#toggle-password").addEventListener("click", () => {
  const passwordInput = $("#password");
  const shouldShowPassword = passwordInput.type === "password";

  passwordInput.type = shouldShowPassword ? "text" : "password";
  $("#toggle-password").setAttribute(
    "aria-label",
    shouldShowPassword ? "Ocultar contraseña" : "Mostrar contraseña"
  );

  speakText(shouldShowPassword ? "Contraseña visible." : "Contraseña oculta.");
});
$("#logout").addEventListener("click",()=>{showLogin();toast("Sesión cerrada correctamente.")});
$("#open-menu").addEventListener("click",()=>{$("#sidebar").classList.add("open");$("#overlay").hidden=false});$("#close-menu").addEventListener("click",closeSidebar);$("#overlay").addEventListener("click",closeSidebar);
$("#global-search").addEventListener("input",event=>{state.query=event.target.value;state.page=1;if(state.view!=="dashboard")(["offers","messaging","help","clientPortal"].includes(state.view)?render():renderModule())});
$("#theme-light").addEventListener("click", () => setVisualMode("base"));
$("#theme-dark").addEventListener("click", () => setVisualMode("dark"));
$("#color-menu-button").addEventListener("click", () => {
  const menu = $("#color-menu");
  const willOpen = menu.hidden;

  menu.hidden = !willOpen;
  $("#color-menu-button").setAttribute("aria-expanded", String(willOpen));
  if (willOpen) $("[data-color-mode]", menu)?.focus();
});
$("#color-menu").addEventListener("click", event => {
  const button = event.target.closest("[data-color-mode]");
  if (!button) return;

  const mode = button.dataset.colorMode === "none" ? "base" : button.dataset.colorMode;
  setVisualMode(mode);
  closeColorMenu();
});
$("#voice-search").addEventListener("click", startVoiceSearch);
$("#font-size").addEventListener("click", () => {
  const cycle = ["small", "normal", "large", "xlarge"];
  const nextScale = cycle[(cycle.indexOf(preferences.fontScale) + 1) % cycle.length];
  setFontScale(nextScale);
});

$("#login-accessibility-button")?.addEventListener("click", toggleLoginAccessibilityPanel);
$("#login-accessibility-panel")?.addEventListener("click", event => event.stopPropagation());

document.querySelectorAll("[data-login-theme]").forEach(button => {
  button.addEventListener("click", () => setVisualMode(button.dataset.loginTheme));
});

document.querySelectorAll("[data-login-font-scale]").forEach(button => {
  button.addEventListener("click", () => setFontScale(button.dataset.loginFontScale));
});

$("#login-voice-toggle")?.addEventListener("click", () => {
  setVoiceEnabled(!preferences.voiceEnabled);
});

$("#username")?.addEventListener("focus", () => {
  speakText("Campo de nombre de usuario.");
});

$("#password")?.addEventListener("focus", () => {
  speakText("Campo de contraseña.");
});

$("#human-check")?.addEventListener("focus", () => {
  speakText("Casilla para confirmar que eres una persona.");
});
$("#notification-button").addEventListener("click",openNotifications);
$("#profile-button").addEventListener("click",()=>{const menu=$("#profile-menu"),open=menu.hidden;closeTopMenus();menu.hidden=!open;$("#profile-button").setAttribute("aria-expanded",String(open))});
document.addEventListener("click",event=>{
  const target=event.target.closest("button");if(!target)return;
  if(target.dataset.view){closeTopMenus();setView(target.dataset.view)}
  if(target.dataset.create)openForm(target.dataset.create);
  if(target.dataset.closeModal!==undefined)closeModal();
  if(target.dataset.closeNotifications!==undefined)closeTopMenus();
  if(target.dataset.profileLogout!==undefined){closeTopMenus();showLogin();toast("Sesión cerrada correctamente.")}
  if(target.dataset.page){state.page=Number(target.dataset.page);renderModule()}
  if(target.dataset.retry!==undefined)render();
  if(target.dataset.clearSearch!==undefined){state.query="";$("#global-search").value="";renderModule()}
  if(target.dataset.action==="view")openDetails(Number(target.dataset.id));
  if(target.dataset.action==="edit")openForm(state.view,Number(target.dataset.id));
  if(target.dataset.action==="delete")confirmDelete(Number(target.dataset.id));
  if(target.dataset.confirmDelete)removeRecord(Number(target.dataset.confirmDelete),target);
  if(target.dataset.interviewMode){state.interviewMode=target.dataset.interviewMode;renderModule()}
  if(target.dataset.calendarMode){state.calendarMode=target.dataset.calendarMode;renderCalendar()}
  if(target.dataset.calendarMove){const amount=Number(target.dataset.calendarMove);state.calendarMode==="month"?state.calendarDate.setMonth(state.calendarDate.getMonth()+amount):state.calendarDate.setDate(state.calendarDate.getDate()+amount*7);renderCalendar()}
  if(target.dataset.calendarEvent){const item=calendarEvents().find(e=>e.id===Number(target.dataset.calendarEvent));openModal(item.type,`<div class="detail-list"><div class="detail-row"><small>Candidato</small><strong>${esc(item.title)}</strong></div><div class="detail-row"><small>Fecha y hora</small><strong>${item.date.toLocaleString("es-CR")}</strong></div><div class="detail-row"><small>Reclutador</small><strong>${esc(item.recruiter)}</strong></div><div class="detail-row"><small>Detalle</small><strong>${esc(item.detail)}</strong></div></div><div class="modal-actions"><button class="btn btn--primary" data-close-modal>Cerrar</button></div>`,"Calendario Maestro")}
  if(target.dataset.openCalendar!==undefined){closeTopMenus();state.interviewMode="calendar";setView("interviews")}
  if(target.dataset.messageCandidate){state.activeChat=Number(target.dataset.messageCandidate);state.chatMobileOpen=true;setView("messaging")}
  if(target.dataset.chat){state.activeChat=Number(target.dataset.chat);state.chatMobileOpen=true;renderMessaging()}
  if(target.dataset.chatBack!==undefined){state.chatMobileOpen=false;renderMessaging()}
  if(target.dataset.chatFilter){state.chatFilter=target.dataset.chatFilter;renderMessaging()}
  if(target.dataset.quickMessage){const templates={"Solicitar CV":"Hola, ¿podrías compartirnos tu CV actualizado para continuar con el proceso?","Agendar Entrevista":"Hola, nos gustaría coordinar una entrevista contigo. ¿Qué disponibilidad tienes esta semana?","Rechazo Cordial":"Agradecemos mucho tu interés y el tiempo dedicado. En esta ocasión continuaremos con otros perfiles."};$("#message-text").value=templates[target.dataset.quickMessage];$("#message-text").focus()}
  if(target.dataset.newOffer!==undefined)openOfferForm();
  if(target.dataset.offerFilter){state.offerFilter=target.dataset.offerFilter;renderOffers()}
  if(target.dataset.offerView){const offer=getOffers().find(o=>o.id===Number(target.dataset.offerView)),user=state.data.candidates.find(u=>u.id===offer.candidateId),vacancy=state.data.vacancies.find(v=>v.id===offer.vacancyId);openModal("Detalle de oferta",`<div class="detail-list"><div class="detail-row"><small>Candidato</small><strong>${esc(user.firstName)} ${esc(user.lastName)}</strong></div><div class="detail-row"><small>Vacante</small><strong>${esc(vacancy.title)}</strong></div><div class="detail-row"><small>Estado</small><strong>${offer.status}</strong></div></div><div class="modal-actions"><button class="btn btn--primary" data-close-modal>Cerrar</button></div>`,"Gestión de Ofertas")}
  if(target.dataset.offerStatus){const offers=getOffers(),offer=offers.find(o=>o.id===Number(target.dataset.offerStatus)),statuses=["Pendiente","Firmada","Rechazada"];offer.status=statuses[(statuses.indexOf(offer.status)+1)%statuses.length];saveOffers(offers);renderOffers();toast("Estado de oferta actualizado localmente.")}
  if(target.dataset.clientPortal){state.clientCompany=Number(target.dataset.clientPortal);setView("clientPortal")}
  if(target.dataset.clientAction){const actions=JSON.parse(localStorage.getItem("talentsync_client_actions")||"{}");actions[target.dataset.id]=target.dataset.clientAction;localStorage.setItem("talentsync_client_actions",JSON.stringify(actions));renderClientPortal();toast("Decisión guardada localmente.")}
  if(target.dataset.helpCategory){state.query=target.dataset.helpCategory;$("#global-search").value=state.query;renderHelp()}
  if(target.dataset.helpArticle){const article=helpArticles.find(a=>a.title===target.dataset.helpArticle);openModal(article.title,`<p class="quote">${esc(article.text)}</p><p class="muted">Esta guía forma parte del Centro de Accesibilidad e Inclusión de TalentSync.</p><div class="modal-actions"><button class="btn btn--primary" data-close-modal>Entendido</button></div>`,article.cat)}
});
document.addEventListener("pointerdown",event=>{
  if(!event.target.closest(".access-menu-wrap"))closeColorMenu();
  if(!event.target.closest(".notification-wrap")&&!event.target.closest(".avatar-button")&&!event.target.closest(".profile-menu"))closeTopMenus();
  if(!event.target.closest("#login-accessibility-panel")&&!event.target.closest("#login-accessibility-button"))closeLoginAccessibilityPanel(false);
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeColorMenu();closeTopMenus();closeLoginAccessibilityPanel(false)}});
document.addEventListener("submit",event=>{
  if(event.target.id==="record-form"){event.preventDefault();submitRecord(event.target)}
  if(event.target.id==="quick-task"){event.preventDefault();const title=new FormData(event.target).get("title");openForm("tasks");$("#field-todo").value=title}
  if(event.target.id==="offer-form"){event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),offers=getOffers();offers.unshift({id:Date.now(),candidateId:Number(data.candidateId),vacancyId:Number(data.vacancyId),status:"Pendiente",date:new Date().toISOString(),note:data.note});saveOffers(offers);closeModal();renderOffers();toast("Oferta guardada localmente.")}
  if(event.target.id==="message-form"){event.preventDefault();const text=new FormData(event.target).get("message").trim(),chats=getChats();chats[state.activeChat]||=[];chats[state.activeChat].push({from:"recruiter",text,date:new Date().toISOString()});saveChats(chats);renderMessaging();toast("Mensaje guardado en esta demostración local.")}
});
document.addEventListener("input",event=>{if(event.target.id==="help-query"){state.query=event.target.value;$("#global-search").value=state.query;renderHelp();const input=$("#help-query");input.focus();input.setSelectionRange(input.value.length,input.value.length)}});
document.addEventListener("change",async event=>{if(event.target.id==="recruiter-filter"){state.calendarFilters.recruiter=event.target.value;renderCalendar()}if(event.target.id==="event-type-filter"){state.calendarFilters.type=event.target.value;renderCalendar()}if(event.target.dataset.toggleTask){const id=Number(event.target.dataset.toggleTask),item=state.data.tasks.find(t=>t.id===id),completed=event.target.checked;try{await updateItem("todos",id,{completed});item.completed=completed;renderTasks(filteredData());toast("Tarea actualizada.")}catch(error){event.target.checked=!completed;toast(error.message,"error")}}});
modal.addEventListener("click",event=>{if(event.target===modal)closeModal()});
window.addEventListener("auth:expired",showLogin);window.addEventListener("offline",()=>{$("#offline").hidden=false});window.addEventListener("online",()=>{$("#offline").hidden=true;toast("Conexión restablecida.")});["pointerdown","keydown","scroll"].forEach(name=>window.addEventListener(name,resetInactivity,{passive:true}));

applyAccessibilityPreferences();
if(state.session?.accessToken)showApp();else showLogin();