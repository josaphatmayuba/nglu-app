// Journal Entreprise — client API du module journal-entreprise (backend2 NestJS).
// SCRUM-119 : token lu en mémoire (auth.jsx), jamais dans localStorage.
import { enqueue, flushOutbox, isNetworkError } from "./outbox.js";
import { readToken, restoreSession, clearToken } from "./auth.jsx";

function cleanApiError(res, body) {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.message ?? parsed?.error;
    if (Array.isArray(msg) && msg.length) return msg.join(" · ");
    if (typeof msg === "string" && msg.trim()) return msg;
  } catch {}
  const text = (body || "").trim();
  if (text && !text.startsWith("{") && !text.startsWith("<")) return text.slice(0, 200);
  return `Erreur ${res.status} — ${res.statusText || "requête refusée"}`;
}

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.JOURNAL_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
const BASE = `${API_ROOT}/journal-entreprise`;

function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}, retried = false) {
  const { base = BASE, ...fetchInit } = init;
  const url = `${base}${path}`;
  const method = (fetchInit.method || "GET").toUpperCase();
  let res;
  try {
    res = await fetch(url, {
      ...fetchInit,
      headers: { "Content-Type": "application/json", ...authHeaders(), ...(fetchInit.headers || {}) },
    });
  } catch (err) {
    if (method !== "GET" && isNetworkError(err)) {
      enqueue({ url, method, body: fetchInit.body || null });
      return { _queued: true };
    }
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return jsonFetch(path, init, true);
      }
      clearToken();
    }
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const get = (path, params) => {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return jsonFetch(path + qs, { method: "GET" });
};
const post = (path, body) => jsonFetch(path, { method: "POST", body: JSON.stringify(body || {}) });
const put = (path, body) => jsonFetch(path, { method: "PUT", body: JSON.stringify(body || {}) });
const patch = (path, body) => jsonFetch(path, { method: "PATCH", body: JSON.stringify(body || {}) });
const del = (path) => jsonFetch(path, { method: "DELETE" });

export const api = {
  // Tableau de bord
  dashboard: () => get("/dashboard"),

  // Événements
  events: (params) => get("/events", params),
  event: (id) => get(`/events/${id}`),
  createEvent: (b) => post("/events", b),
  updateEvent: (id, b) => put(`/events/${id}`, b),
  deleteEvent: (id) => del(`/events/${id}`),
  pinEvent: (id) => patch(`/events/${id}/pin`),
  unpinEvent: (id) => patch(`/events/${id}/unpin`),

  // Tâches / rappels
  tasks: (params) => get("/tasks", params),
  task: (id) => get(`/tasks/${id}`),
  createTask: (b) => post("/tasks", b),
  updateTask: (id, b) => put(`/tasks/${id}`, b),
  toggleTask: (id) => patch(`/tasks/${id}/toggle`),
  deleteTask: (id) => del(`/tasks/${id}`),

  // Pièces jointes
  attachments: (eventId) => get(`/events/${eventId}/attachments`),
  uploadAttachment: (eventId, b) => post(`/events/${eventId}/attachments`, b),
  deleteAttachment: (id) => del(`/attachments/${id}`),

  // Calendrier (vue mensuelle)
  calendar: (year, month) => get("/events/calendar", { year, month }),

  // Export
  exportCsv: (params) => get("/export/csv", params),
  exportJson: (params) => get("/export/json", params),

  // Audit
  audit: (params) => get("/audit", params),

  // Paramètres
  settings: () => get("/settings"),
  updateSettings: (b) => put("/settings", b),

  // Référentiels partagés
  currencies: () => jsonFetch("/currency?query=all", { method: "GET", base: API_ROOT }),
  setting: () => jsonFetch("/setting", { method: "GET", base: API_ROOT }),
};

function replayQueued(entry) {
  return fetch(entry.url, {
    method: entry.method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: entry.body || undefined,
  });
}
export function syncOutbox() {
  return flushOutbox(replayQueued);
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => syncOutbox());
  setTimeout(() => syncOutbox(), 1500);
}

export { BASE, NATIVE };
