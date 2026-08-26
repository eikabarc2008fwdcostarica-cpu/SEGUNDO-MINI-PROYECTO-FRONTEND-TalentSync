"use strict";
import{clearSession,getSession,saveSession,internalRequest}from"../services/api.js";
import{doubleConfirm}from"./ui.js";
const LIMIT=30*60*1000;let timer;
export function hasSession(){const session=getSession();return Boolean(session?.accessToken)&&Date.now()-(session.lastActivity||0)<LIMIT}
export function requireAuth(){if(!hasSession()){clearSession();location.replace("index.html");return null}const session=getSession();saveSession(session);resetInactivity();return session}
export async function redirectIfAuthenticated(){
  if(!hasSession())return false;
  try{await internalRequest("/api/session");location.replace("/pages/dashboard.html");return true}
  catch{clearSession();return false}
}
export async function logout(options={}){const skipConfirmation=options?.skipConfirmation===true;if(!skipConfirmation&&!await doubleConfirm({title:"Cerrar sesión",message:"Se cerrará tu sesión actual y tendrás que ingresar nuevamente.",confirmLabel:"Cerrar sesión",danger:true}))return;clearTimeout(timer);try{await internalRequest("/api/auth/logout",{method:"POST"})}catch{}clearSession();location.replace("index.html")}
export function resetInactivity(){if(!getSession())return;clearTimeout(timer);const session=getSession();session.lastActivity=Date.now();localStorage.setItem("talentsync_session",JSON.stringify(session));timer=setTimeout(()=>logout({skipConfirmation:true}),LIMIT)}
export function initSessionActivity(){["pointerdown","keydown","scroll"].forEach(event=>addEventListener(event,resetInactivity,{passive:true}));resetInactivity()}
