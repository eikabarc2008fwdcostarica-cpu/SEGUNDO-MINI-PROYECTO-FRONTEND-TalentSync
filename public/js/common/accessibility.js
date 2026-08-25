"use strict";

const root=document.documentElement;
const preferences={
  theme:localStorage.getItem("talentsync_theme")||"light",
  color:localStorage.getItem("talentsync_color_mode")||"none",
  font:localStorage.getItem("talentsync_font_scale")||"normal"
};

function apply(){
  root.dataset.theme=preferences.theme;
  root.dataset.colorMode=preferences.color;
  root.dataset.fontScale=preferences.font;
  document.querySelector("#theme-toggle")?.setAttribute("aria-pressed",String(preferences.theme==="dark"));
  document.querySelector("#font-toggle")?.setAttribute("aria-label",`Tamaño de texto: ${preferences.font}`);
  document.querySelectorAll("[data-color]").forEach(button=>button.setAttribute("aria-checked",String(button.dataset.color===preferences.color)));
}

export function applyAccessibilityPreferences(){apply()}

export function initAccessibility(){
  apply();
  const menu=document.querySelector("#color-menu"),menuButton=document.querySelector("#color-toggle");
  document.querySelector("#theme-toggle").onclick=()=>{preferences.theme=preferences.theme==="dark"?"light":"dark";localStorage.setItem("talentsync_theme",preferences.theme);apply()};
  menuButton.onclick=()=>{menu.hidden=!menu.hidden;menuButton.setAttribute("aria-expanded",String(!menu.hidden))};
  menu.onclick=event=>{const button=event.target.closest("[data-color]");if(!button)return;preferences.color=button.dataset.color;localStorage.setItem("talentsync_color_mode",preferences.color);apply();menu.hidden=true;menuButton.setAttribute("aria-expanded","false")};
  document.querySelector("#font-toggle").onclick=()=>{const sizes=["normal","large","xlarge"];preferences.font=sizes[(sizes.indexOf(preferences.font)+1)%sizes.length];localStorage.setItem("talentsync_font_scale",preferences.font);apply()};
  document.querySelector("#voice-search").onclick=startVoiceSearch;
  document.addEventListener("click",event=>{if(!event.target.closest(".access-menu-wrap")){menu.hidden=true;menuButton.setAttribute("aria-expanded","false")}});
}

function startVoiceSearch(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,button=document.querySelector("#voice-search"),input=document.querySelector("#global-search");
  if(!Recognition){button.title="El dictado no está disponible en este navegador";return}
  const recognition=new Recognition();recognition.lang=document.documentElement.lang||"es-CR";recognition.interimResults=false;
  recognition.onstart=()=>{button.classList.add("listening");button.setAttribute("aria-pressed","true")};
  recognition.onend=()=>{button.classList.remove("listening");button.setAttribute("aria-pressed","false")};
  recognition.onresult=event=>{input.value=event.results[0][0].transcript;input.dispatchEvent(new Event("input",{bubbles:true}));input.focus()};
  recognition.start();
}
