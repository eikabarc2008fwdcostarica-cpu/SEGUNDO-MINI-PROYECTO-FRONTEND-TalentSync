"use strict";
import{clearSession,getSession,saveSession}from"../services/api.js";
const LIMIT=30*60*1000;let timer;
export function hasSession(){const session=getSession();return Boolean(session?.accessToken)&&Date.now()-(session.lastActivity||0)<LIMIT}
export function requireAuth(){if(!hasSession()){clearSession();location.replace("index.html");return null}const session=getSession();saveSession(session);resetInactivity();return session}
export function redirectIfAuthenticated(){if(hasSession())location.replace("dashboard.html")}
export function logout(){clearTimeout(timer);clearSession();location.replace("index.html")}
export function resetInactivity(){if(!getSession())return;clearTimeout(timer);const session=getSession();session.lastActivity=Date.now();localStorage.setItem("talentsync_session",JSON.stringify(session));timer=setTimeout(logout,LIMIT)}
export function initSessionActivity(){["pointerdown","keydown","scroll"].forEach(event=>addEventListener(event,resetInactivity,{passive:true}));resetInactivity()}
