"use strict";

import { initLayout } from "../common/layout.js";
import { getResource, createResource, updateResource, deleteResource } from "../services/api.js";
import { $, esc, showLoading, showError, showToast, doubleConfirm } from "../common/ui.js";

if (!await initLayout()) await new Promise(() => {});

let data = [];
let query = "";

async function load() {
  showLoading();
  try {
    data = (await getResource("todos", 30)).todos;
    render();
  } catch (error) {
    showError(error, load);
  }
}

function render() {
  const rows = data.filter((item) => !query || item.todo.toLowerCase().includes(query));
  const done = rows.filter((item) => item.completed).length;
  const progress = rows.length ? Math.round((done / rows.length) * 100) : 0;
  $("#page-content").innerHTML = `<header class="page-head"><div><p class="eyebrow">Productividad</p><h1>Daily Tasks</h1><p>Prioridades del equipo.</p></div></header><section class="tasks-layout"><article class="panel"><form id="task-form" class="quick-add"><input name="todo" placeholder="Quick add task..." required aria-label="Nueva tarea"><select name="priority" aria-label="Prioridad"><option>Media</option><option>Alta</option><option>Baja</option></select><button class="btn btn--primary">Agregar</button></form>${rows.map((item, index) => `<div class="task ${item.completed ? "done" : ""}"><input type="checkbox" data-toggle="${item.id}" ${item.completed ? "checked" : ""} aria-label="Completar tarea"><label>${esc(item.todo)}</label><span class="badge ${index % 3 === 0 ? "red" : "yellow"}">${["Alta", "Media", "Baja"][index % 3]}</span><button data-delete="${item.id}" aria-label="Eliminar tarea">×</button></div>`).join("")}</article><aside class="task-progress"><h2>Progress</h2><div class="progress-ring" style="--progress:${progress}%"><strong>${progress}%</strong></div><p>${done} completadas de ${rows.length}</p></aside></section>`;
}

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "task-form") return;
  event.preventDefault();
  const todo = String(new FormData(event.target).get("todo") || "").trim();
  if (!todo) return;
  const approved = await doubleConfirm({
    title: "Agregar tarea",
    message: `Se agregará la tarea “${todo}”.`,
    confirmLabel: "Agregar tarea"
  });
  if (!approved) return;
  try {
    const result = await createResource("todos", { todo, completed: false, userId: 1 });
    data.unshift(result);
    render();
    showToast("Tarea agregada.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

$("#page-content").addEventListener("change", async (event) => {
  if (!event.target.dataset.toggle) return;
  const item = data.find((entry) => entry.id === Number(event.target.dataset.toggle));
  const completed = event.target.checked;
  const approved = await doubleConfirm({
    title: "Actualizar tarea",
    message: completed ? "La tarea se marcará como completada." : "La tarea volverá a quedar pendiente.",
    confirmLabel: "Actualizar"
  });
  if (!approved) {
    render();
    return;
  }
  try {
    await updateResource("todos", item.id, { completed });
    item.completed = completed;
    render();
    showToast("Tarea actualizada.");
  } catch (error) {
    render();
    showToast(error.message, "error");
  }
});

$("#page-content").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const id = Number(button.dataset.delete);
  const item = data.find((entry) => entry.id === id);
  const approved = await doubleConfirm({
    title: "Eliminar tarea",
    message: `Se eliminará “${item?.todo || "esta tarea"}”. Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar definitivamente",
    danger: true
  });
  if (!approved) return;
  try {
    await deleteResource("todos", id);
    data = data.filter((entry) => entry.id !== id);
    render();
    showToast("Tarea eliminada.");
  } catch (error) {
    showToast(error.message, "error");
  }
});

addEventListener("page:search", (event) => {
  query = event.detail.toLowerCase();
  render();
});

load();
