// Tickets — client API vers backend2 (NestJS).
// Base : /api/workflow  (WorkflowController existant, migration 0108)
// Même pattern auth que domus-app : token en mémoire, retry sur 401.
import { readToken, restoreSession, clearToken } from "./auth.jsx";

const API_HOST = (typeof window !== "undefined" && window.TICKETS_API_HOST) || "https://dev.ongdngolu.org";
const API_ROOT = API_HOST + "/api";
const BASE = `${API_ROOT}/workflow`;

function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

async function jsonFetch(path, init = {}, retried = false) {
  const { base = BASE, ...fetchInit } = init;
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...fetchInit,
      headers: { "Content-Type": "application/json", ...authHeaders(), ...(fetchInit.headers || {}) },
    });
  } catch (err) {
    throw err;
  }
  if (!res.ok) {
    if (res.status === 401 && !retried) {
      const token = await restoreSession();
      if (token) return jsonFetch(path, init, true);
      clearToken();
    }
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const get = (path, base) => jsonFetch(path, { method: "GET", ...(base ? { base } : {}) });
const post = (path, body, base) => jsonFetch(path, { method: "POST", body: JSON.stringify(body || {}), ...(base ? { base } : {}) });

export const api = {
  // ── Workflow engine (WorkflowController — /api/workflow) ──
  listWorkflows: () => get(""),
  createWorkflow: (b) => post("", b),

  // Instances (tickets soumis)
  listInstances: (status) => get(`/instances${status ? `?status=${status}` : ""}`),
  getInstance: (id) => get(`/instances/${id}`),
  submit: (b) => post("/instances", b),       // { workflowKey, entityType, entityId }
  approve: (id, comment) => post(`/instances/${id}/approve`, { comment: comment || "" }),
  reject: (id, comment) => post(`/instances/${id}/reject`, { comment: comment || "" }),

  // ── Metadata partagée ──
  currencies: () => get("/currency?query=all", API_ROOT),
  setting: () => get("/setting", API_ROOT),
  currentUser: () => get("/auth/me", API_ROOT),
};
