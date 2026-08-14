// Journal Entreprise — client API du module journal-entreprise (backend2 NestJS).
// SCRUM-119 : token lu en mémoire (auth.jsx), jamais dans localStorage.
import { readToken, restoreSession, clearToken } from "./auth.jsx";
// Offline-first (miroir Dexie events/tasks + outbox), même pattern que
// farmos-app/src/api.js : cache-then-refresh en lecture, bascule sur l'outbox
// en écriture si hors ligne ou si le réseau échoue.
import { db, lastSync, replaceCache, readCache } from "./offline-db.js";
import { enqueueMutation, startOutboxWorker } from "./offline-outbox.js";

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
  const res = await fetch(url, {
    ...fetchInit,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(fetchInit.headers || {}) },
  });
  if (!res.ok) {
    // 401 = access-token expiré. Tentative de refresh silencieux (cookie
    // httpOnly) puis rejoue une fois. Si le refresh échoue faute de réseau
    // (isNetworkError), on NE déconnecte PAS — on laisse l'erreur remonter
    // pour que l'appelant retombe sur le cache/l'outbox (même fix que
    // farmos-app/src/api.js appliqué aujourd'hui).
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        try {
          const token = await restoreSession();
          if (token) return jsonFetch(path, init, true);
        } catch (err) {
          if (err?.isNetworkError) throw err;
        }
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

// ID temporaire pour les enregistrements optimistes en attente du retour
// serveur — remplacé par le vrai id quand l'outbox synchronise (même
// pattern que farmos-app/src/api.js).
let _tempCounter = 0;
function tempId() {
  _tempCounter += 1;
  return `tmp-${Date.now()}-${_tempCounter}`;
}

// Quelles tables miroir doivent être invalidées (re-fetch au prochain accès)
// après chaque mutation — permet aux écrans de refléter l'action sans F5.
const KIND_INVALIDATES = {
  createEvent: ["events"], updateEvent: ["events"], deleteEvent: ["events"],
  pinEvent: ["events"], unpinEvent: ["events"],
  createTask: ["tasks"], updateTask: ["tasks"], deleteTask: ["tasks"], toggleTask: ["tasks"],
};

async function invalidateAndBroadcast(kind) {
  const tables = KIND_INVALIDATES[kind] || [];
  for (const table of tables) {
    try { await db.meta.delete(table); } catch {}
  }
  if (tables.length) {
    window.dispatchEvent(new CustomEvent("journal:data-changed", { detail: { kind, tables } }));
  }
}

// Bascule sur l'outbox si hors ligne, ou si le fetch échoue pour une raison
// réseau (pas un refus serveur 4xx) — même helper que farmos-app/src/api.js.
async function mutate({ kind, method, path, body, optimistic }) {
  if (!navigator.onLine) {
    const id = await enqueueMutation({ kind, method, path, body, optimistic });
    return { id, _queued: true };
  }
  try {
    const result = await jsonFetch(path, { method, body: body ? JSON.stringify(body) : undefined });
    await invalidateAndBroadcast(kind);
    return result;
  } catch (err) {
    if (/Failed to fetch|NetworkError|TypeError/i.test(String(err.message || err))) {
      const id = await enqueueMutation({ kind, method, path, body, optimistic });
      return { id, _queued: true };
    }
    throw err;
  }
}

async function jsonMutate(kind, path, init = {}) {
  const result = await jsonFetch(path, init);
  await invalidateAndBroadcast(kind);
  return result;
}

// Cache-then-refresh (SCRUM offline-first, pilote journal-app) : sert
// immédiatement le miroir Dexie s'il existe, rafraîchit en arrière-plan et
// émet "journal:cache-updated" pour que les écrans se re-rendent. N'est
// utilisé que pour la liste NON filtrée (params vides) — avec un filtre actif
// (recherche/source/type/statut), on repart en direct réseau : le miroir ne
// stocke que la collection complète, pas chaque combinaison de filtres.
const inFlightReads = new Map();
function sameRows(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}
function readFreshList(table, path) {
  if (inFlightReads.has(table)) return inFlightReads.get(table);
  const refresh = jsonFetch(path, { method: "GET" })
    .then(async (fresh) => {
      const rows = Array.isArray(fresh) ? fresh : (fresh?.data || []);
      const cached = await readCache(table).catch(() => []);
      const changed = !sameRows(cached, rows);
      await replaceCache(table, rows);
      if (changed) window.dispatchEvent(new CustomEvent("journal:cache-updated", { detail: table }));
      return fresh;
    })
    .catch(() => null)
    .finally(() => inFlightReads.delete(table));
  inFlightReads.set(table, refresh);
  return refresh;
}
async function cachedList(table, path, params) {
  const hasFilters = params && Object.values(params).some((v) => v != null && v !== "");
  if (hasFilters) return get(path, params);
  let cached = [];
  try { cached = await readCache(table); } catch { cached = []; }
  let syncedAt = null;
  try { syncedAt = await lastSync(table); } catch {}
  const refresh = readFreshList(table, path);
  if (cached.length > 0 && syncedAt) return cached;
  const fresh = await refresh;
  return Array.isArray(fresh) ? fresh : (fresh?.data || cached || []);
}

export const api = {
  // Tableau de bord
  dashboard: () => get("/dashboard"),

  // Événements
  events: (params) => cachedList("events", "/events", params),
  event: (id) => get(`/events/${id}`),
  createEvent: (b) => mutate({ kind: "createEvent", method: "POST", path: "/events", body: b,
                     optimistic: { table: "events", row: { id: tempId(), ...b, _pending: true } } }),
  updateEvent: (id, b) => mutate({ kind: "updateEvent", method: "PUT", path: `/events/${id}`, body: b }),
  deleteEvent: (id) => mutate({ kind: "deleteEvent", method: "DELETE", path: `/events/${id}` }),
  pinEvent: (id) => jsonMutate("pinEvent", `/events/${id}/pin`, { method: "PATCH" }),
  unpinEvent: (id) => jsonMutate("unpinEvent", `/events/${id}/unpin`, { method: "PATCH" }),

  // Tâches / rappels
  tasks: (params) => cachedList("tasks", "/tasks", params),
  task: (id) => get(`/tasks/${id}`),
  createTask: (b) => mutate({ kind: "createTask", method: "POST", path: "/tasks", body: b,
                     optimistic: { table: "tasks", row: { id: tempId(), ...b, _pending: true } } }),
  updateTask: (id, b) => mutate({ kind: "updateTask", method: "PUT", path: `/tasks/${id}`, body: b }),
  toggleTask: (id) => jsonMutate("toggleTask", `/tasks/${id}/toggle`, { method: "PATCH" }),
  deleteTask: (id) => mutate({ kind: "deleteTask", method: "DELETE", path: `/tasks/${id}` }),

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

// Démarre le worker de l'outbox Dexie (rejoue au retour réseau + drain de
// l'ancien outbox localStorage une seule fois — voir offline-outbox.js).
startOutboxWorker();

export { BASE, NATIVE };
