// Domus — client API du module property-management (backend2 NestJS).
//
// Web  : URLs relatives (/api/property-management/...), nginx route vers le backend.
// Capacitor (Android/iOS) : la WebView a pour origin capacitor://localhost ; les
// URLs relatives ne marcheraient pas. On détecte le natif et on préfixe l'hôte API.
//
// SCRUM-119 — le token est lu en mémoire (auth.jsx), pas dans localStorage. La
// session est partagée same-origin avec le CRM via le cookie refresh httpOnly.
import { enqueue, flushOutbox, isNetworkError } from "./outbox.js";
import { readToken, restoreSession, clearToken } from "./auth.jsx";

// Message d'erreur lisible : on extrait le `message` du corps NestJS au lieu
// d'afficher le JSON brut. message peut être une chaîne ou un tableau (validation).
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
const API_HOST = (typeof window !== "undefined" && window.DOMUS_API_HOST) || "https://dev.ongdngolu.org";
const API_ROOT = (NATIVE ? API_HOST : "") + "/api";
const BASE = `${API_ROOT}/property-management`;

function authHeaders() {
  const token = readToken(); // SCRUM-119 — token en mémoire
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
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(fetchInit.headers || {}),
      },
    });
  } catch (err) {
    // Hors ligne : on met les écritures en file d'attente pour rejeu au retour réseau.
    if (method !== "GET" && isNetworkError(err)) {
      enqueue({ url, method, body: fetchInit.body || null });
      return { _queued: true };
    }
    throw err;
  }
  if (!res.ok) {
    // 401 = access-token expiré. On tente un refresh silencieux (cookie httpOnly)
    // et on rejoue une fois ; sinon purge auth et bascule sur l'écran de connexion.
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
  // 204/empty → null
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const get = (path) => jsonFetch(path, { method: "GET" });
const post = (path, body) => jsonFetch(path, { method: "POST", body: JSON.stringify(body || {}) });
const put = (path, body) => jsonFetch(path, { method: "PUT", body: JSON.stringify(body || {}) });
const patch = (path, body) => jsonFetch(path, { method: "PATCH", body: JSON.stringify(body || {}) });
const del = (path) => jsonFetch(path, { method: "DELETE" });

async function multipartFetch(path, formData) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function authenticatedFileUrl(path) {
  const token = readToken();
  const sep = path.includes("?") ? "&" : "?";
  return `${BASE}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
}

// ── Endpoints (alignés sur property-management.controller.ts) ──
export const api = {
  currencies: () => jsonFetch("/currency?query=all", { method: "GET", base: API_ROOT }),
  allCurrencies: () => jsonFetch("/currency?query=all&status=all", { method: "GET", base: API_ROOT }),
  setting: () => jsonFetch("/setting", { method: "GET", base: API_ROOT }),
  updateSetting: (b) => jsonFetch("/setting", { method: "PUT", base: API_ROOT, body: JSON.stringify(b || {}) }),
  setCurrencyStatus: (id, status) => jsonFetch(`/currency/${id}`, { method: "PATCH", base: API_ROOT, body: JSON.stringify({ status }) }),
  bulkCurrencyStatus: (ids, status) => jsonFetch("/currency/bulk-status", { method: "PATCH", base: API_ROOT, body: JSON.stringify({ ids, status }) }),

  // Prévisionnel (module forecast backend2) — scope figé "domus" pour cette app.
  forecastCashFlow: ({ horizon, mode, scope = "domus", adjust } = {}) =>
    jsonFetch(`/forecast/cash-flow?horizon=${horizon}&mode=${mode}&scope=${scope}${adjust ? `&adjust=${encodeURIComponent(adjust)}` : ""}`, { method: "GET", base: API_ROOT }),
  forecastProduction: ({ horizon } = {}) =>
    jsonFetch(`/forecast/production?horizon=${horizon}`, { method: "GET", base: API_ROOT }),
  forecastVariance: ({ scope = "domus" } = {}) =>
    jsonFetch(`/forecast/variance?scope=${scope}`, { method: "GET", base: API_ROOT }),
  forecastSnapshot: ({ horizon = 6, mode = "realiste", scope = "domus" } = {}) =>
    jsonFetch(`/forecast/snapshot?horizon=${horizon}&mode=${mode}&scope=${scope}`, { method: "POST", base: API_ROOT }),

  // Moyens de paiement configurables (table paymentMethod partagée avec le CRM).
  paymentMethods: () => jsonFetch("/payment-method?query=all", { method: "GET", base: API_ROOT }),
  createPaymentMethod: (b) => jsonFetch("/payment-method", { method: "POST", base: API_ROOT, body: JSON.stringify(b || {}) }),
  updatePaymentMethod: (id, b) => jsonFetch(`/payment-method/${id}`, { method: "PUT", base: API_ROOT, body: JSON.stringify(b || {}) }),
  setPaymentMethodStatus: (id, status) => jsonFetch(`/payment-method/${id}`, { method: "PATCH", base: API_ROOT, body: JSON.stringify({ status }) }),
  subAccounts: () => jsonFetch("/sub-accounts", { method: "GET", base: API_ROOT }),

  dashboard: () => get("/dashboard"),

  tenants: () => get("/tenants"),
  createTenant: (b) => post("/tenants", b),
  updateTenant: (id, b) => put(`/tenants/${id}`, b),
  // Suppression = soft-delete (status=false) via l'API customer partagée du CRM.
  deleteTenant: (id) => jsonFetch(`/customer/${id}`, { method: "PATCH", base: API_ROOT, body: JSON.stringify({ status: "false" }) }),

  onboardingList: () => get("/onboarding"),
  generateOnboarding: (b) => post("/onboarding", b),
  validateOnboarding: (id) => post(`/onboarding/${id}/validate`),
  deleteOnboarding: (id) => del(`/onboarding/${id}`),
  sendOnboardingSms: (b) => jsonFetch("/send-sms", { method: "POST", base: API_ROOT, body: JSON.stringify(b || {}) }),
  sendOnboardingEmail: (b) => jsonFetch("/property-management/onboarding/send-email", { method: "POST", base: API_ROOT, body: JSON.stringify(b || {}) }),

  properties: () => get("/properties"),
  property: (id) => get(`/properties/${id}`),
  createProperty: (b) => post("/properties", b),
  updateProperty: (id, b) => put(`/properties/${id}`, b),
  deleteProperty: (id) => del(`/properties/${id}`),
  propertyPhotos: () => get("/properties/photos"),
  propertyPhotosForProperty: (id) => get(`/properties/${id}/photos`),
  uploadPropertyPhoto: (id, file, unitId = null) => {
    const form = new FormData();
    form.append("photo", file);
    if (unitId != null && unitId !== "") form.append("unitId", String(unitId));
    return multipartFetch(`/properties/${id}/photos`, form);
  },
  deletePropertyPhoto: (photoId) => del(`/properties/photos/${photoId}`),
  propertyPhotoUrl: (photoId) => authenticatedFileUrl(`/properties/photos/${photoId}/file`),

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
  // Référentiel central fournisseurs (route racine /api/supplier, hors préfixe /property-management)
  suppliers: () => jsonFetch("/supplier?query=all&type=real_estate", { method: "GET", base: API_ROOT }),
  maintenanceCosts: (id) => get(`/maintenance/${id}/costs`),
  addMaintenanceCost: (id, b) => post(`/maintenance/${id}/costs`, b),
  deleteMaintenanceCost: (id) => del(`/maintenance/costs/${id}`),

  // Caution / dépôt de garantie (cycle complet : encaissement + restitution).
  deposits: () => get("/deposits"),
  collectDeposit: (leaseId, b) => post(`/leases/${leaseId}/deposit`, b),
  returnDeposit: (leaseId, b) => post(`/leases/${leaseId}/deposit/return`, b),

  // Réservations temporaires (type hôtel, tarif par jour, recette au check-out).
  reservations: () => get("/reservations"),
  reservation: (id) => get(`/reservations/${id}`),
  reservationsForProperty: (id) => get(`/properties/${id}/reservations`),
  createReservation: (b) => post("/reservations", b),
  updateReservation: (id, b) => put(`/reservations/${id}`, b),
  deleteReservation: (id) => del(`/reservations/${id}`),
  confirmReservation: (id) => post(`/reservations/${id}/confirm`),
  checkInReservation: (id) => post(`/reservations/${id}/check-in`),
  checkOutReservation: (id, b) => post(`/reservations/${id}/check-out`, b),
  cancelReservation: (id) => post(`/reservations/${id}/cancel`),
  reservationAvailability: ({ propertyId, unitId, checkIn, checkOut }) =>
    get(`/reservations/availability?propertyId=${propertyId}${unitId ? `&unitId=${unitId}` : ""}&checkIn=${checkIn}&checkOut=${checkOut}`),
  coupons: () => get("/coupons"),
  validateCoupon: ({ code, amount, currencyId }) =>
    get(`/coupons/validate?code=${encodeURIComponent(code || "")}&amount=${encodeURIComponent(amount || 0)}${currencyId ? `&currencyId=${encodeURIComponent(currencyId)}` : ""}`),
  createCoupon: (b) => post("/coupons", b),
  updateCoupon: (id, b) => put(`/coupons/${id}`, b),
  deleteCoupon: (id) => del(`/coupons/${id}`),

  contracts: () => get("/contracts"),
  contract: (id) => get(`/contracts/${id}`),
  createContract: (b) => post("/contracts", b),
  sendContract: (id, b) => post(`/contracts/${id}/send`, b),
  deleteContract: (id) => del(`/contracts/${id}`),

  // Messages / notifications configurables (table email_templates partagée).
  messageTemplates: () => jsonFetch("/email-templates", { method: "GET", base: API_ROOT }),
  createMessageTemplate: (b) => jsonFetch("/email-templates", { method: "POST", base: API_ROOT, body: JSON.stringify(b || {}) }),
  updateMessageTemplate: (id, b) => jsonFetch(`/email-templates/${id}`, { method: "PUT", base: API_ROOT, body: JSON.stringify(b || {}) }),
  deleteMessageTemplate: (id) => jsonFetch(`/email-templates/${id}`, { method: "DELETE", base: API_ROOT }),

  contractTemplates: () => get("/contract-templates"),
  contractTemplate: (id) => get(`/contract-templates/${id}`),
  createContractTemplate: (b) => post("/contract-templates", b),
  updateContractTemplate: (id, b) => put(`/contract-templates/${id}`, b),
  activateContractTemplate: (id) => patch(`/contract-templates/${id}/activate`),
  deleteContractTemplate: (id) => del(`/contract-templates/${id}`),
};

// ── Onboarding public (page locataire Domus, sans authentification) ──
// Le backend renvoie un lien vers la page CRM (APP_URL/onboarding/tenant?token=).
// Domus possède sa PROPRE page publique : on réécrit le lien vers une URL propre
// sous /domus/. nginx assure le fallback SPA (`@dev_domus_spa`/`@prod_domus_spa`
// → /domus/index.html) pour ce deep-link, donc pas besoin de routage par hash.
export const ONBOARDING_PATH = "/domus/onboarding/tenant";
export function domusOnboardingUrl(backendUrl) {
  try {
    const u = new URL(backendUrl);
    const token = u.searchParams.get("token");
    if (!token) return backendUrl || "";
    return `${u.origin}${ONBOARDING_PATH}?token=${encodeURIComponent(token)}`;
  } catch {
    return backendUrl || "";
  }
}

// Appels publics (pas de token d'auth, pas de file d'attente hors ligne) que la
// page d'onboarding Domus utilise — mêmes endpoints que la page tenant du CRM.
async function publicFetch(path, init = {}) {
  const url = `${API_ROOT}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
export const publicApi = {
  onboarding: (token) => publicFetch(`/tenant-onboarding?token=${encodeURIComponent(token)}`),
  saveOnboarding: (token, values) =>
    publicFetch(`/tenant-onboarding/save?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(values || {}) }),
  submitOnboarding: (token, values) =>
    publicFetch(`/tenant-onboarding/submit?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(values || {}) }),
  stays: () => publicFetch("/property-management/public/stays"),
  stay: (key) => publicFetch(`/property-management/public/stays/${encodeURIComponent(key)}`),
  publicPhotoUrl: (photoId) => `${API_ROOT}/property-management/public/photos/${encodeURIComponent(photoId)}/file`,
  publicAvailability: ({ propertyId, unitId, checkIn, checkOut }) =>
    publicFetch(`/property-management/public/availability?propertyId=${encodeURIComponent(propertyId)}${unitId ? `&unitId=${encodeURIComponent(unitId)}` : ""}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`),
  validatePublicCoupon: ({ code, amount, currencyId }) =>
    publicFetch(`/property-management/public/coupons/validate?code=${encodeURIComponent(code || "")}&amount=${encodeURIComponent(amount || 0)}${currencyId ? `&currencyId=${encodeURIComponent(currencyId)}` : ""}`),
  createPublicReservation: (values) =>
    publicFetch("/property-management/public/reservations", { method: "POST", body: JSON.stringify(values || {}) }),
  createPublicLeaseRequest: (values) =>
    publicFetch("/property-management/public/lease-requests", { method: "POST", body: JSON.stringify(values || {}) }),
};

// ── Rejeu de la file d'attente hors ligne ──
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
  window.addEventListener("online", () => { syncOutbox(); });
  // Tentative au démarrage (au cas où des écritures seraient restées en file).
  setTimeout(() => syncOutbox(), 1500);
}

export { BASE, NATIVE, API_ROOT };
