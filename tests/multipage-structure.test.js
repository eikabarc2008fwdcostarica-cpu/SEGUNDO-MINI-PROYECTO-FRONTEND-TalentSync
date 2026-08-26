import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root=resolve(import.meta.dirname,".."),publicRoot=join(root,"public"),pagesRoot=join(publicRoot,"pages");
const pages=["index.html","dashboard.html","candidatos.html","vacantes.html","empresas.html","postulaciones.html","entrevistas.html","tareas.html","ofertas.html","mensajeria.html","ayuda.html","analisis-cv.html","seguimiento-cliente.html"];
function files(dir){return readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?files(path):[path]})}

test("existen todas las páginas multipágina",()=>{for(const page of pages)assert.ok(existsSync(join(pagesRoot,page)),page)});
test("index es un login exclusivo para la arquitectura multipágina",()=>{const html=readFileSync(join(pagesRoot,"index.html"),"utf8");assert.match(html,/id="login-form"/);assert.doesNotMatch(html,/id="app"/);assert.match(html,/src="\.\.\/js\/pages\/login\.js"/);assert.match(html,/href="\.\.\/styles\/index\.css"/)});
test("cada HTML tiene IDs únicos",()=>{for(const page of pages){const html=readFileSync(join(pagesRoot,page),"utf8"),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size,page)}});
test("hojas de estilo y scripts locales de cada HTML resuelven",()=>{for(const page of pages){const path=join(pagesRoot,page),html=readFileSync(path,"utf8");for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(!/^(?:https?:|#|data:)/.test(match[1]))assert.ok(existsSync(resolve(dirname(path),match[1])),`${page}: ${match[1]}`)}}});
test("imports JavaScript resuelven y todos los módulos tienen sintaxis válida",()=>{for(const file of files(join(publicRoot,"js")).filter(path=>extname(path)===".js")){const source=readFileSync(file,"utf8");for(const match of source.matchAll(/from\s*["']([^"']+)["']/g)){if(match[1].startsWith("."))assert.ok(existsSync(resolve(dirname(file),match[1])),`${file}: ${match[1]}`)}const checked=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});assert.equal(checked.status,0,checked.stderr)}});
test("enlaces internos declarados en JavaScript apuntan a páginas existentes",()=>{for(const file of files(join(publicRoot,"js")).filter(path=>extname(path)===".js")){const source=readFileSync(file,"utf8");for(const match of source.matchAll(/(?:href=\\?"|["'`])([a-z0-9-]+\.html)(?:[?#[^"'`\\]*)?/gi))assert.ok(existsSync(join(pagesRoot,match[1])),`${file}: ${match[1]}`)}});
test("el login evita ejecutarse desde Live Server",()=>{const source=readFileSync(join(publicRoot,"js/pages/login.js"),"utf8");assert.match(source,/5500/);assert.match(source,/localhost:5173\/pages\/index\.html/)});
