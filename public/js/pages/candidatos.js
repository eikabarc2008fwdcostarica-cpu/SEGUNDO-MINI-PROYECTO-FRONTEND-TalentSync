"use strict";
import{initLayout}from"../common/layout.js";
import{initResourcePage}from"../common/resource-page.js";
import{getSession}from"../services/api.js";
import{$,esc,showToast}from"../common/ui.js";

if(!await initLayout())await new Promise(()=>{});
const session=getSession();
if(session.role!=="candidate")await initResourcePage("candidatos");
else{
  const profileKey=`talentsync_profile_${session.userId}`;let saved={};
  try{saved=JSON.parse(localStorage.getItem(profileKey)||"{}")}catch{localStorage.removeItem(profileKey)}
  let analyses=[];try{analyses=JSON.parse(localStorage.getItem("talentsync_cv_analyses")||"[]")}catch{localStorage.removeItem("talentsync_cv_analyses")}
  $("#page-content").innerHTML=`<header class="page-head"><div><p class="eyebrow">Cuenta candidata</p><h1>Mi Perfil</h1><p>Administra tu información profesional y consulta tus procesos.</p></div></header><section class="profile-layout"><article class="panel"><h2>${esc(session.name)}</h2><p>${esc(session.email)}</p><form id="candidate-profile"><div class="field"><label for="headline">Título profesional</label><input id="headline" name="headline" value="${esc(saved.headline||"")}" placeholder="Ej. Frontend Developer"></div><div class="field"><label for="skills">Habilidades</label><input id="skills" name="skills" value="${esc(saved.skills||"")}" placeholder="JavaScript, CSS, UX/UI"></div><div class="field"><label for="summary">Resumen</label><textarea id="summary" name="summary">${esc(saved.summary||"")}</textarea></div><button class="btn btn--primary">Guardar perfil</button></form></article><aside class="panel"><h2>Resultados de CV</h2>${analyses.length?analyses.slice(0,3).map(item=>`<div class="detail-row"><small>${esc(item.vacancy?.title||"Vacante")}</small><strong>${Number(item.matchPercentage)||0}%</strong></div>`).join(""):'<p>Aún no tienes resultados de análisis disponibles.</p>'}<a class="btn btn--ghost" href="postulaciones.html">Mis postulaciones</a></aside></section>`;
  $("#candidate-profile").onsubmit=event=>{event.preventDefault();localStorage.setItem(profileKey,JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));showToast("Perfil guardado.")};
}
