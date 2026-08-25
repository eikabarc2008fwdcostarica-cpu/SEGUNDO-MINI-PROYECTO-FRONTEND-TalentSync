"use strict";
export const $=(selector,root=document)=>root.querySelector(selector);
export const esc=(value="")=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
export function showToast(message,type="success"){let host=$("#toasts");if(!host){host=document.createElement("div");host.id="toasts";host.className="toasts";host.setAttribute("aria-live","polite");document.body.append(host)}const item=document.createElement("div");item.className=`toast ${type}`;item.textContent=message;host.append(item);setTimeout(()=>item.remove(),3500)}
export function showLoading(target=$("#page-content")){target.innerHTML='<div class="spinner-wrap" aria-busy="true"><span class="spinner"></span><p>Cargando información...</p></div>'}
export function showError(error,retry){const target=$("#page-content");target.innerHTML=`<div class="error-state" role="alert"><h2>No pudimos cargar la información</h2><p>${esc(error.message)}</p><button class="btn btn--primary" id="retry-page">Intentar nuevamente</button></div>`;$("#retry-page").onclick=retry}
export function openModal(title,body,kicker="TalentSync"){const dialog=$("#modal");$("#modal-title").textContent=title;$("#modal-kicker").textContent=kicker;$("#modal-body").innerHTML=body;dialog.showModal()}
export function closeModal(){$("#modal")?.close()}
export function bindModal(){document.addEventListener("click",event=>{if(event.target.closest("[data-close-modal]"))closeModal()});$("#modal")?.addEventListener("click",event=>{if(event.target===$("#modal"))closeModal()})}
export function pagination(total,page,perPage){const pages=Math.max(1,Math.ceil(total/perPage));return `<footer class="pagination"><span>${total} registros</span><div class="pages">${Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" class="${page===i+1?"active":""}">${i+1}</button>`).join("")}</div></footer>`}
