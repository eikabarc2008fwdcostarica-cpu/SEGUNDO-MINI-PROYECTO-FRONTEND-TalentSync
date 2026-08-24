"use strict";

const BASE_URL = "https://dummyjson.com";

export function getSession() {
  try { return JSON.parse(localStorage.getItem("talentsync_session")); } catch { return null; }
}

export function saveSession(session) { localStorage.setItem("talentsync_session", JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem("talentsync_session"); }

export async function request(path, options = {}) {
  const session = getSession();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...options.headers
      }
    });
    if (response.status === 401 && path !== "/auth/login") {
      clearSession();
      window.dispatchEvent(new CustomEvent("auth:expired"));
      throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `No se pudo completar la solicitud (${response.status}).`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("La solicitud tardó demasiado. Inténtalo nuevamente.");
    throw error;
  } finally { clearTimeout(timeout); }
}

export const login = (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password, expiresInMins: 30 }) });
export const getList = (endpoint, limit = 30) => request(`/${endpoint}?limit=${limit}`);
export const createItem = (endpoint, data) => request(`/${endpoint}/add`, { method: "POST", body: JSON.stringify(data) });
export const updateItem = (endpoint, id, data) => request(`/${endpoint}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteItem = (endpoint, id) => request(`/${endpoint}/${id}`, { method: "DELETE" });
