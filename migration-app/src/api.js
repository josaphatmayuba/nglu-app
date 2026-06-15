// Migration Cockpit — client API (lecture seule) du module migration de backend2.
// Toutes les routes sont en GET. Token JWT en mémoire (SCRUM-119).
import { readToken, restoreSession, clearToken } from "./auth.jsx";

const NATIVE =
  typeof window !== "undefined" && /^capacitor:\/\//.test(window.location?.protocol || "");
const API_HOST = (typeof window !== "undefined" && window.MIGRATION_API_HOST) || "https://dev.ongdngolu.org";
const BASE = (NATIVE ? API_HOST : "") + "/api/migration";

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
  return `Erreur ${res.status} — ${res.statusText || "requête refusée"}`;
}

async function get(path, retried = false) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", ...authHeaders() },
  });
  if (!res.ok) {
    if (res.status === 401 && !retried) {
      const token = await restoreSession();
      if (token) return get(path, true);
      clearToken();
    }
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  return res.json();
}

export const api = {
  domains: () => get("/domains"),
  preview: (table, limit = 25) => get(`/source/${encodeURIComponent(table)}/preview?limit=${limit}`),
  validate: (domain) => get(`/validate/${encodeURIComponent(domain)}`),
  runCommand: (domain) => get(`/run-command/${encodeURIComponent(domain)}`),
};
