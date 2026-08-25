"use strict";
import{$}from"./ui.js";
const placeholders={dashboard:"Buscar en TalentSync...",candidatos:"Buscar candidatos...",vacantes:"Buscar vacantes...",empresas:"Buscar empresas...",postulaciones:"Buscar postulaciones...",entrevistas:"Buscar entrevistas...",tareas:"Buscar tareas...",ofertas:"Buscar ofertas o candidatos...",mensajeria:"Buscar conversaciones...",ayuda:"Buscar artículos...",analisisCv:"Buscar vacantes...",seguimientoCliente:"Buscar procesos..."};
export function initSearch(page){const input=$("#global-search");if(!input)return;input.placeholder=placeholders[page]||"Buscar...";input.addEventListener("input",()=>dispatchEvent(new CustomEvent("page:search",{detail:input.value.trim()})))}
