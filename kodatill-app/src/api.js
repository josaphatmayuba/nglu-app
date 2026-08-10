// KodaTill — API client. Meme pattern que farmos-app/src/api.js : token en
// memoire (auth.jsx), retry 401 via refresh silencieux, URLs relatives en web,
// prefixees par KODATILL_API_HOST en Capacitor natif.
import { getToken, restoreSession, clearAuth } from "./auth.jsx";

const NATIVE = typeof window !== "undefined"
  && (window.Capacitor?.isNativePlatform?.() === true
      || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.KODATILL_API_HOST) || "https://dev.ongdngolu.org";
const BASE = (NATIVE ? API_HOST : "") + "/api/kodatill";

const buildQuery = (params) => {
  const q = Object.entries(params).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return q ? `?${q}` : "";
};

function authHeaders() {
  const token = getToken(); // SCRUM-119 — token en memoire
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function doJsonFetch(path, init = {}, retried = false) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    // 401 = access-token expire. Tentative de refresh silencieux (cookie
    // httpOnly) puis rejoue une fois. Sinon purge + bascule sur login.
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return doJsonFetch(path, init, true);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent("kodatill:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function jsonFetch(path, init = {}) {
  return doJsonFetch(path, init);
}

export const api = {
  // Catalogue
  listCategories: () => jsonFetch("/categories"),
  createCategory: (body) => jsonFetch("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id, body) => jsonFetch(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeCategory: (id) => jsonFetch(`/categories/${id}`, { method: "DELETE" }),
  listProducts: (params = {}) => jsonFetch(`/products${buildQuery(params)}`),
  getProduct: (id) => jsonFetch(`/products/${id}`),
  getProductByBarcode: (code) => jsonFetch(`/products/barcode/${encodeURIComponent(code)}`),
  createProduct: (body) => jsonFetch("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id, body) => jsonFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeProduct: (id) => jsonFetch(`/products/${id}`, { method: "DELETE" }),

  // Commandes
  listOrders: (params = {}) => jsonFetch(`/orders${buildQuery(params)}`),
  getOrder: (id) => jsonFetch(`/orders/${id}`),
  createOrder: (body) => jsonFetch("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrderLines: (id, body) => jsonFetch(`/orders/${id}/lines`, { method: "PATCH", body: JSON.stringify(body) }),
  setOrderStatus: (id, body) => jsonFetch(`/orders/${id}/status`, { method: "POST", body: JSON.stringify(body) }),
  addOrderPayment: (id, body) => jsonFetch(`/orders/${id}/payments`, { method: "POST", body: JSON.stringify(body) }),

  // Sessions de caisse
  openCashSession: (body) => jsonFetch("/cash-sessions/open", { method: "POST", body: JSON.stringify(body) }),
  getCurrentCashSession: () => jsonFetch("/cash-sessions/current"),
  closeCashSession: (id, body) => jsonFetch(`/cash-sessions/${id}/close`, { method: "POST", body: JSON.stringify(body) }),
  addCashMovement: (id, body) => jsonFetch(`/cash-sessions/${id}/movements`, { method: "POST", body: JSON.stringify(body) }),
  listCashMovements: (id) => jsonFetch(`/cash-sessions/${id}/movements`),

  // Methodes de paiement
  listPaymentMethods: () => jsonFetch("/payment-methods"),
  createPaymentMethod: (body) => jsonFetch("/payment-methods", { method: "POST", body: JSON.stringify(body) }),
  updatePaymentMethod: (id, body) => jsonFetch(`/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removePaymentMethod: (id) => jsonFetch(`/payment-methods/${id}`, { method: "DELETE" }),

  // Succursales
  listBranches: () => jsonFetch("/branches"),
  createBranch: (body) => jsonFetch("/branches", { method: "POST", body: JSON.stringify(body) }),
  updateBranch: (id, body) => jsonFetch(`/branches/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeBranch: (id) => jsonFetch(`/branches/${id}`, { method: "DELETE" }),
};
