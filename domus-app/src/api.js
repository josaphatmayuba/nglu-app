// Domus — client API du module property-management (backend2 NestJS).
//
// Web  : URLs relatives (/api/property-management/...), nginx route vers le backend.
// Capacitor (Android/iOS) : la WebView a pour origin capacitor://localhost ; les
// URLs relatives ne marcheraient pas. On détecte le natif et on préfixe l'hôte API.
//
// Le token est lu depuis localStorage `access-token` — partagé en same-origin avec
// le CRM (/admin et /domus), comme FarmOS le fait sous /farmos.
const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.DOMUS_API_HOST) || "https://dev.ongdngolu.org";
const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
const BASE = `${API_ROOT}/property-management`;

function authHeaders() {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access-token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}) {
  const { base = BASE, ...fetchInit } = init;
  const res = await fetch(`${base}${path}`, {
    ...fetchInit,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(fetchInit.headers || {}),
    },
  });
  if (!res.ok) {
    // 401 = token invalide/expiré → purge auth et bascule sur l'écran de connexion.
    if (res.status === 401 && typeof window !== "undefined") {
      try {
        ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) =>
          localStorage.removeItem(k),
        );
      } catch {}
      window.dispatchEvent(new CustomEvent("domus:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  // 204/empty → null
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const get = (path) => jsonFetch(path, { method: "GET" });
const post = (path, body) => jsonFetch(path, { method: "POST", body: JSON.stringify(body || {}) });
const put = (path, body) => jsonFetch(path, { method: "PUT", body: JSON.stringify(body || {}) });
const patch = (path, body) => jsonFetch(path, { method: "PATCH", body: JSON.stringify(body || {}) });
const del = (path) => jsonFetch(path, { method: "DELETE" });

// ── Endpoints (alignés sur property-management.controller.ts) ──
export const api = {
  currencies: () => jsonFetch("/currency?query=all", { method: "GET", base: API_ROOT }),
  allCurrencies: () => jsonFetch("/currency?query=all&status=all", { method: "GET", base: API_ROOT }),
  setting: () => jsonFetch("/setting", { method: "GET", base: API_ROOT }),
  updateSetting: (b) => jsonFetch("/setting", { method: "PUT", base: API_ROOT, body: JSON.stringify(b || {}) }),
  setCurrencyStatus: (id, status) => jsonFetch(`/currency/${id}`, { method: "PATCH", base: API_ROOT, body: JSON.stringify({ status }) }),
  bulkCurrencyStatus: (ids, status) => jsonFetch("/currency/bulk-status", { method: "PATCH", base: API_ROOT, body: JSON.stringify({ ids, status }) }),

  dashboard: () => get("/dashboard"),

  tenants: () => get("/tenants"),
  createTenant: (b) => post("/tenants", b),

  onboardingList: () => get("/onboarding"),
  generateOnboarding: (b) => post("/onboarding", b),
  validateOnboarding: (id) => post(`/onboarding/${id}/validate`),
  deleteOnboarding: (id) => del(`/onboarding/${id}`),

  properties: () => get("/properties"),
  property: (id) => get(`/properties/${id}`),
  createProperty: (b) => post("/properties", b),
  updateProperty: (id, b) => put(`/properties/${id}`, b),
  deleteProperty: (id) => del(`/properties/${id}`),

  units: () => get("/units"),
  unit: (id) => get(`/units/${id}`),
  createUnit: (b) => post("/units", b),
  updateUnit: (id, b) => put(`/units/${id}`, b),
  deleteUnit: (id) => del(`/units/${id}`),

  leases: () => get("/leases"),
  lease: (id) => get(`/leases/${id}`),
  createLease: (b) => post("/leases", b),
  updateLease: (id, b) => put(`/leases/${id}`, b),
  renewLease: (id, b) => post(`/leases/${id}/renew`, b),
  deleteLease: (id) => del(`/leases/${id}`),

  payments: () => get("/payments"),
  createPayment: (b) => post("/payments", b),
  sendReminder: (b) => post("/payments/reminder", b),
  runOverdueReminders: () => post("/payments/run-overdue-reminders"),

  maintenance: () => get("/maintenance"),
  maintenanceItem: (id) => get(`/maintenance/${id}`),
  createMaintenance: (b) => post("/maintenance", b),
  updateMaintenance: (id, b) => put(`/maintenance/${id}`, b),
  deleteMaintenance: (id) => del(`/maintenance/${id}`),
  maintenanceCosts: (id) => get(`/maintenance/${id}/costs`),
  addMaintenanceCost: (id, b) => post(`/maintenance/${id}/costs`, b),

  contracts: () => get("/contracts"),
  contract: (id) => get(`/contracts/${id}`),
  createContract: (b) => post("/contracts", b),
  sendContract: (id, b) => post(`/contracts/${id}/send`, b),
  deleteContract: (id) => del(`/contracts/${id}`),

  contractTemplates: () => get("/contract-templates"),
};

export { BASE, NATIVE, API_ROOT };
