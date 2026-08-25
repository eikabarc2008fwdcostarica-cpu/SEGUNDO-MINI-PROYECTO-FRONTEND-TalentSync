import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const usersPath=fileURLToPath(new URL("./data/users.json",import.meta.url));
const messagesPath=fileURLToPath(new URL("./data/messages.json",import.meta.url));
const demoPasswords={"recruiter.demo":"Recruiter2026!","candidate.demo":"Candidate2026!","company.demo":"Company2026!"};
const sessions=new Map();let writeQueue=Promise.resolve();

const safeEqual=(left,right)=>{const a=Buffer.from(String(left)),b=Buffer.from(String(right));return a.length===b.length&&timingSafeEqual(a,b)};
const publicUser=user=>({userId:user.id,id:user.id,username:user.username,name:user.name,firstName:user.firstName,lastName:user.lastName,email:user.email,role:user.role,companyId:user.companyId,company:user.company,image:user.image});
const readJSON=async(path,fallback)=>{try{return JSON.parse(await readFile(path,"utf8"))}catch{return fallback}};
const saveMessages=messages=>{writeQueue=writeQueue.then(()=>writeFile(messagesPath,JSON.stringify(messages,null,2)+"\n","utf8"));return writeQueue};
const conversationId=(a,b)=>[a,b].sort().join("--");

export async function loginDemo(username,password){const users=await readJSON(usersPath,[]),user=users.find(item=>item.username===String(username).trim());if(!user||!safeEqual(demoPasswords[user.username]||"",password))return null;const token=randomBytes(32).toString("base64url");sessions.set(token,{userId:user.id,expiresAt:Date.now()+30*60*1000});return {...publicUser(user),token,accessToken:token,expiresIn:1800}}
export async function authenticatedUser(request){const token=request.headers.authorization?.replace(/^Bearer\s+/i,"");if(!token)return null;const session=sessions.get(token);if(!session||session.expiresAt<Date.now()){sessions.delete(token);return null}session.expiresAt=Date.now()+30*60*1000;const users=await readJSON(usersPath,[]);return users.find(user=>user.id===session.userId)||null}
export const userCanAccessPage=(role,page)=>({recruiter:["dashboard","candidatos","vacantes","empresas","postulaciones","entrevistas","tareas","ofertas","mensajeria","ayuda","analisis-cv","seguimiento-cliente"],candidate:["dashboard","candidatos","postulaciones","entrevistas","ofertas","mensajeria","ayuda"],company:["dashboard","candidatos","vacantes","postulaciones","entrevistas","mensajeria","ayuda","seguimiento-cliente"]}[role]||[]).includes(page);
function canMessage(from,to){if(from.id===to.id)return false;const pair=new Set([from.role,to.role]);if(pair.has("recruiter")&&(pair.has("candidate")||pair.has("company")))return true;return pair.has("candidate")&&pair.has("company")&&from.companyId&&from.companyId===to.companyId}
export async function contactsFor(user){const users=await readJSON(usersPath,[]);return users.filter(item=>canMessage(user,item)).map(publicUser)}
export async function conversationsFor(user){const [users,messages]=await Promise.all([readJSON(usersPath,[]),readJSON(messagesPath,[])]);return users.filter(item=>canMessage(user,item)).map(contact=>{const rows=messages.filter(message=>message.conversationId===conversationId(user.id,contact.id)).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)),last=rows.at(-1);return {...publicUser(contact),conversationId:conversationId(user.id,contact.id),lastMessage:last?.message||"",timestamp:last?.timestamp||null,unread:rows.filter(message=>message.receiverId===user.id&&!message.read).length}})}
export async function messagesFor(user,id){const participants=String(id).split("--");if(!participants.includes(user.id))return null;const users=await readJSON(usersPath,[]),other=users.find(item=>participants.includes(item.id)&&item.id!==user.id);if(!other||!canMessage(user,other))return null;const messages=await readJSON(messagesPath,[]);return messages.filter(message=>message.conversationId===id).sort((a,b)=>a.timestamp.localeCompare(b.timestamp))}
export async function createMessage(user,{receiverId,message}){const users=await readJSON(usersPath,[]),receiver=users.find(item=>item.id===receiverId),text=String(message||"").trim();if(!receiver||!canMessage(user,receiver)||!text||text.length>2000)return null;const messages=await readJSON(messagesPath,[]),record={id:messages.reduce((max,item)=>Math.max(max,Number(item.id)||0),0)+1,conversationId:conversationId(user.id,receiver.id),senderId:user.id,receiverId:receiver.id,role:user.role,timestamp:new Date().toISOString(),read:false,message:text};messages.push(record);await saveMessages(messages);return record}
export async function markMessageRead(user,id){const messages=await readJSON(messagesPath,[]),message=messages.find(item=>item.id===Number(id));if(!message||message.receiverId!==user.id)return null;message.read=true;await saveMessages(messages);return message}
export function endSession(request){const token=request.headers.authorization?.replace(/^Bearer\s+/i,"");if(token)sessions.delete(token)}
