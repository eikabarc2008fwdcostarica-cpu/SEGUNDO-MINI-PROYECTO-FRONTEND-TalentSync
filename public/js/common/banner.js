"use strict";
const slides=[
  {image:"../imgs/banner-opportunities.svg",alt:"Ilustración de oportunidades laborales",title:"Conecta talento con oportunidades",text:"Gestiona procesos claros y accesibles desde un mismo espacio."},
  {image:"../imgs/banner-interviews.svg",alt:"Ilustración de una entrevista profesional",title:"Entrevistas mejor coordinadas",text:"Consulta próximas citas, mensajes y tareas prioritarias."},
  {image:"../imgs/banner-inclusion.svg",alt:"Ilustración de un equipo profesional diverso",title:"Inclusión por diseño",text:"Personaliza contraste, color, idioma y tamaño de texto."}
];
export function initBanner(){const root=document.querySelector("#info-banner");if(!root)return;root.innerHTML=slides.map((slide,index)=>`<article class="banner-slide ${index===0?"active":""}"><div><p class="eyebrow">TalentSync</p><h2>${slide.title}</h2><p>${slide.text}</p></div><img src="${slide.image}" alt="${slide.alt}"></article>`).join("");if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;let active=0;setInterval(()=>{const all=root.querySelectorAll(".banner-slide");all[active].classList.remove("active");active=(active+1)%all.length;all[active].classList.add("active")},6000)}
