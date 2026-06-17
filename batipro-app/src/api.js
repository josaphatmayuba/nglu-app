import { clearAuth, getToken, restoreSession } from "./auth.jsx";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.BATIPRO_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
export const BASE = `${API_ROOT}/batipro`;

function authHeaders() {
  const token = getToken(); // SCRUM-119 — token en mémoire
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}, retried = false) {
  const { base = BASE, ...fetchInit } = init;
  const res = await fetch(`${base}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(fetchInit.headers || {})
    }
  });
  if (!res.ok) {
    // 401 = access-token expiré. On tente un refresh silencieux (cookie httpOnly)
    // et on rejoue une fois ; sinon purge auth et bascule sur l'écran de connexion.
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return jsonFetch(path, init, true);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent("batipro:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 160)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  dashboard: () => jsonFetch("/dashboard"),
  projects: () => jsonFetch("/projects"),
  createProject: (b) => jsonFetch("/projects", { method: "POST", body: JSON.stringify(b || {}) }),
  updateProject: (id, b) => jsonFetch(`/projects/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteProject: (id) => jsonFetch(`/projects/${id}`, { method: "DELETE" }),
  tasks: () => jsonFetch("/tasks"),
  createTask: (b) => jsonFetch("/tasks", { method: "POST", body: JSON.stringify(b || {}) }),
  updateTask: (id, b) => jsonFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteTask: (id) => jsonFetch(`/tasks/${id}`, { method: "DELETE" }),
  // Référentiel central fournisseurs (route racine /api/supplier, hors préfixe /batipro)
  suppliers: () => jsonFetch("/supplier?query=all&type=construction", { base: API_ROOT }),
  materials: () => jsonFetch("/materials"),
  createMaterial: (b) => jsonFetch("/materials", { method: "POST", body: JSON.stringify(b || {}) }),
  updateMaterial: (id, b) => jsonFetch(`/materials/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteMaterial: (id) => jsonFetch(`/materials/${id}`, { method: "DELETE" }),
  crews: () => jsonFetch("/crews"),
  createCrew: (b) => jsonFetch("/crews", { method: "POST", body: JSON.stringify(b || {}) }),
  updateCrew: (id, b) => jsonFetch(`/crews/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteCrew: (id) => jsonFetch(`/crews/${id}`, { method: "DELETE" })
};
