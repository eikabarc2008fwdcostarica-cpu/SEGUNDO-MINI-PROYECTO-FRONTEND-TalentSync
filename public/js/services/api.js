"use strict";

const BASE_URL="https://dummyjson.com";
export const SESSION_KEY="talentsync_session";
export function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch{return null}}
export function saveSession(value){localStorage.setItem(SESSION_KEY,JSON.stringify({...value,lastActivity:Date.now()}))}
export function clearSession(){localStorage.removeItem(SESSION_KEY)}
export async function apiRequest(path,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000),session=getSession();try{const response=await fetch(`${BASE_URL}${path}`,{...options,signal:controller.signal,headers:{"Content-Type":"application/json",...(session?.accessToken?{Authorization:`Bearer ${session.accessToken}`} :{}),...options.headers}});if(response.status===401&&path!=="/auth/login"){clearSession();location.href="index.html";throw new Error("Tu sesión expiró.")}const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||`Solicitud no completada (${response.status}).`);return data}catch(error){if(error.name==="AbortError")throw new Error("La solicitud tardó demasiado. Inténtalo nuevamente.");throw error}finally{clearTimeout(timer)}}
export const login=(username,password)=>apiRequest("/auth/login",{method:"POST",body:JSON.stringify({username,password,expiresInMins:30})});
export const getResource=(resource,limit=30)=>apiRequest(`/${resource}?limit=${limit}`);
export const createResource=(resource,data)=>apiRequest(`/${resource}/add`,{method:"POST",body:JSON.stringify(data)});
export const updateResource=(resource,id,data)=>apiRequest(`/${resource}/${id}`,{method:"PATCH",body:JSON.stringify(data)});
export const deleteResource=(resource,id)=>apiRequest(`/${resource}/${id}`,{method:"DELETE"});
