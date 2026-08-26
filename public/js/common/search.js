"use strict";
import{$,esc}from"./ui.js";
const aliases=[
  {key:"candidatos",page:"candidatos.html",title:"Candidatos",description:"Perfiles, talento, currículum y CV",keywords:"candidato candidatos talento perfil curriculum currículum cv"},
  {key:"vacantes",page:"vacantes.html",title:"Vacantes",description:"Gestión y publicación de vacantes",keywords:"vacante vacantes empleo trabajo oportunidad"},
  {key:"empresas",page:"empresas.html",title:"Empresas",description:"Directorio de empresas clientes",keywords:"empresa empresas organización cliente"},
  {key:"postulaciones",page:"postulaciones.html",title:"Postulaciones",description:"Pipeline y procesos de selección",keywords:"postulacion postulación postulaciones aplicación APP-"},
  {key:"entrevistas",page:"entrevistas.html",title:"Entrevistas",description:"Evaluaciones y calendario",keywords:"entrevista entrevistas fecha calendario"},
  {key:"tareas",page:"tareas.html",title:"Tareas",description:"Tareas y prioridades",keywords:"tarea tareas pendiente 2026"},
  {key:"ofertas",page:"ofertas.html",title:"Ofertas",description:"Propuestas laborales",keywords:"oferta ofertas propuesta"},
  {key:"mensajeria",page:"mensajeria.html",title:"Mensajería",description:"Mensajes y conversaciones",keywords:"mensaje mensajes mensajeria mensajería chat correo @"},
  {key:"analisis-cv",page:"analisis-cv.html",title:"Análisis de CV",description:"Compatibilidad documental",keywords:"cv curriculum currículum análisis"},
  {key:"ayuda",page:"ayuda.html",title:"Ayuda",description:"Guías y accesibilidad",keywords:"ayuda accesibilidad soporte"}
];
const normalize=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
let recordsPromise,activeIndex=-1;
async function records(){if(recordsPromise)return recordsPromise;recordsPromise=Promise.all([fetch("https://dummyjson.com/users?limit=30").then(r=>r.json()),fetch("https://dummyjson.com/products?limit=30").then(r=>r.json()),fetch("https://dummyjson.com/posts?limit=30").then(r=>r.json())]).then(([users,products,posts])=>[
  ...users.users.map(item=>({title:`${item.firstName} ${item.lastName}`,type:"Candidato",description:`${item.email} · ${item.company?.title||item.role}`,page:`candidatos.html?id=${item.id}`,search:JSON.stringify(item)})),
  ...products.products.map(item=>({title:item.title,type:"Vacante",description:`${item.brand||"Empresa"} · ${item.category} · ID ${item.id}`,page:`vacantes.html?id=${item.id}`,search:JSON.stringify(item)})),
  ...posts.posts.map(item=>({title:`APP-${String(item.id).padStart(4,"0")} · ${item.title}`,type:"Postulación",description:item.body.slice(0,90),page:`postulaciones.html?id=${item.id}`,search:JSON.stringify(item)}))
]).catch(()=>[]);return recordsPromise}
function render(items){const box=$("#global-search-results");activeIndex=-1;if(!items.length){box.innerHTML='<p class="search-empty">Sin resultados</p>';box.hidden=false;return}box.innerHTML=items.slice(0,10).map((item,index)=>`<a href="${item.page}" data-search-index="${index}"><strong>${esc(item.title)}</strong><span>${esc(item.type)}</span><small>${esc(item.description)}</small></a>`).join("");box.hidden=false}
function setActive(next){const links=[...document.querySelectorAll("#global-search-results a")];if(!links.length)return;activeIndex=(next+links.length)%links.length;links.forEach((link,index)=>link.classList.toggle("active",index===activeIndex));links[activeIndex].focus()}
export function initSearch(page,permissions=[]){const input=$("#global-search"),box=$("#global-search-results");if(!input)return;input.placeholder="Buscar páginas, personas, vacantes, IDs o fechas...";input.addEventListener("input",async()=>{const raw=input.value,query=normalize(raw);dispatchEvent(new CustomEvent("page:search",{detail:raw.trim()}));if(query.length<2){box.hidden=true;return}const pageResults=aliases.filter(item=>permissions.includes(item.key)&&normalize(`${item.title} ${item.description} ${item.keywords}`).includes(query)).map(item=>({...item,type:"Página"})),dataResults=(await records()).filter(item=>permissions.some(key=>item.page.startsWith(key))&&normalize(`${item.title} ${item.description} ${item.search}`).includes(query));render([...pageResults,...dataResults])});input.addEventListener("keydown",event=>{if(event.key==="ArrowDown"){event.preventDefault();setActive(activeIndex+1)}if(event.key==="ArrowUp"){event.preventDefault();setActive(activeIndex-1)}if(event.key==="Enter"&&activeIndex>=0){event.preventDefault();box.querySelectorAll("a")[activeIndex].click()}if(event.key==="Escape"){box.hidden=true;input.focus()}});document.addEventListener("click",event=>{if(!event.target.closest(".global-search"))box.hidden=true})}
