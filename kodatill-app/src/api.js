// KodaTill — API client. Meme pattern que farmos-app/src/api.js : token en
// memoire (auth.jsx), retry 401 via refresh silencieux, URLs relatives en web,
// prefixees par KODATILL_API_HOST en Capacitor natif.
import { getToken, restoreSession, clearAuth } from "./auth.jsx";

const NATIVE = typeof window !== "undefined"
  && (window.Capacitor?.isNativePlatform?.() === true
      || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.KODATILL_API_HOST) || "https://dev.ongdngolu.org";
const BASE = (NATIVE ? API_HOST : "") + "/api/kodatill";
// SCRUM-303 — /organizations/:publicId/suspend|reactivate existent AVANT
// KodaTill (console super_owner generique, organizations.controller.ts) et ne
// sont pas sous /kodatill : base HTTP dediee, meme host/prefixe /api que BASE.
const ROOT_BASE = (NATIVE ? API_HOST : "") + "/api";

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

// SCRUM-303 — meme logique que doJsonFetch (retry 401 via refresh) mais sur
// ROOT_BASE ("/api") au lieu de BASE ("/api/kodatill"), pour les routes
// generiques hors module KodaTill (ex: /organizations/...).
async function doRootJsonFetch(path, init = {}, retried = false) {
  const res = await fetch(`${ROOT_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return doRootJsonFetch(path, init, true);
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

// SCRUM-296 — surface publique (scan QR, sans JWT). Client HTTP dedie et
// volontairement distinct de jsonFetch : pas d'Authorization, pas de retry
// 401/refresh (aucune session a restaurer sur cette page), erreurs remontees
// telles quelles pour affichage cote ecran.
async function publicJsonFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const publicApi = {
  getMenu: (orgSlug, qrToken) => publicJsonFetch(`/public/menu/${encodeURIComponent(orgSlug)}/${encodeURIComponent(qrToken)}`),
  createOrder: (body) => publicJsonFetch("/public/orders", { method: "POST", body: JSON.stringify(body) }),
  // SCRUM-297 — memes donnees pour le suivi de commande public-menu.jsx
  // (GET /public/orders/:publicRef, statut + lignes + total, sans compte).
  getOrder: (publicRef) => publicJsonFetch(`/public/orders/${encodeURIComponent(publicRef)}`),
};

export const api = {
  // Catalogue
  listCategories: () => jsonFetch("/categories"),
  createCategory: (body) => jsonFetch("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id, body) => jsonFetch(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeCategory: (id) => jsonFetch(`/categories/${id}`, { method: "DELETE" }),
  listProducts: (params = {}) => jsonFetch(`/products${buildQuery(params)}`),
  // Snapshot offline (SCRUM-304) : {version, categories, products} en un seul
  // payload, avec support ETag (If-None-Match -> 304 si rien n'a change).
  // Retourne null sur 304 (pas de body) pour signaler "pas de changement" a
  // l'appelant, qui garde alors le cache IndexedDB existant.
  getCatalogSnapshot: async (etag) => {
    const headers = etag ? { "If-None-Match": etag } : {};
    const res = await fetch(`${BASE}/catalog/snapshot`, { headers: { ...authHeaders(), ...headers } });
    if (res.status === 304) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return { ...data, etag: res.headers.get("etag") || null };
  },
  getProduct: (id) => jsonFetch(`/products/${id}`),
  getProductByBarcode: (code) => jsonFetch(`/products/barcode/${encodeURIComponent(code)}`),
  createProduct: (body) => jsonFetch("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id, body) => jsonFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeProduct: (id) => jsonFetch(`/products/${id}`, { method: "DELETE" }),

  // Commandes
  listOrders: (params = {}) => jsonFetch(`/orders${buildQuery(params)}`),
  getOrder: (id) => jsonFetch(`/orders/${id}`),
  // Donnees structurees pour impression du ticket client (SCRUM-306) — pas de
  // HTML/ESC-POS cote backend, seulement les donnees ; le rendu est ici.
  getOrderReceipt: (id) => jsonFetch(`/orders/${id}/receipt`),
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

  // Profil d'activite (parametres)
  listBusinessProfile: () => jsonFetch("/business-profile"),
  updateBusinessProfile: (body) => jsonFetch("/business-profile", { method: "PUT", body: JSON.stringify(body) }),

  // Stock (SCRUM-289)
  listStock: (params = {}) => jsonFetch(`/stock${buildQuery(params)}`),
  listStockAlerts: () => jsonFetch("/stock/alerts"),
  listStockMovements: (id) => jsonFetch(`/stock/${id}/movements`),
  restockItem: (id, body) => jsonFetch(`/stock/${id}/restock`, { method: "POST", body: JSON.stringify(body) }),
  adjustStock: (id, body) => jsonFetch(`/stock/${id}/adjust`, { method: "POST", body: JSON.stringify(body) }),

  // Ingredients (SCRUM-291)
  listIngredients: (params = {}) => jsonFetch(`/ingredients${buildQuery(params)}`),
  getIngredient: (id) => jsonFetch(`/ingredients/${id}`),
  createIngredient: (body) => jsonFetch("/ingredients", { method: "POST", body: JSON.stringify(body) }),
  updateIngredient: (id, body) => jsonFetch(`/ingredients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeIngredient: (id) => jsonFetch(`/ingredients/${id}`, { method: "DELETE" }),

  // Recette produit (SCRUM-291) — computedCost toujours recalcule cote serveur.
  getProductRecipe: (productId) => jsonFetch(`/products/${productId}/recipe`),
  saveProductRecipe: (productId, body) => jsonFetch(`/products/${productId}/recipe`, { method: "PUT", body: JSON.stringify(body) }),
  removeProductRecipe: (productId) => jsonFetch(`/products/${productId}/recipe`, { method: "DELETE" }),

  // Depenses (SCRUM-292)
  listExpenseCategories: () => jsonFetch("/expenses/categories"),
  createExpenseCategory: (body) => jsonFetch("/expenses/categories", { method: "POST", body: JSON.stringify(body) }),
  updateExpenseCategory: (id, body) => jsonFetch(`/expenses/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeExpenseCategory: (id) => jsonFetch(`/expenses/categories/${id}`, { method: "DELETE" }),
  listExpenses: (params = {}) => jsonFetch(`/expenses${buildQuery(params)}`),
  createExpense: (body) => jsonFetch("/expenses", { method: "POST", body: JSON.stringify(body) }),
  updateExpense: (id, body) => jsonFetch(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeExpense: (id) => jsonFetch(`/expenses/${id}`, { method: "DELETE" }),
  getExpensesSummary: (params) => jsonFetch(`/expenses/summary${buildQuery(params)}`),

  // Variantes & modificateurs (SCRUM-293)
  listProductVariants: (productId) => jsonFetch(`/products/${productId}/variants`),
  createProductVariant: (productId, body) => jsonFetch(`/products/${productId}/variants`, { method: "POST", body: JSON.stringify(body) }),
  updateProductVariant: (id, body) => jsonFetch(`/variants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeProductVariant: (id) => jsonFetch(`/variants/${id}`, { method: "DELETE" }),

  listModifierGroups: () => jsonFetch("/modifier-groups"),
  createModifierGroup: (body) => jsonFetch("/modifier-groups", { method: "POST", body: JSON.stringify(body) }),
  updateModifierGroup: (id, body) => jsonFetch(`/modifier-groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeModifierGroup: (id) => jsonFetch(`/modifier-groups/${id}`, { method: "DELETE" }),
  createModifier: (groupId, body) => jsonFetch(`/modifier-groups/${groupId}/modifiers`, { method: "POST", body: JSON.stringify(body) }),
  updateModifier: (id, body) => jsonFetch(`/modifiers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeModifier: (id) => jsonFetch(`/modifiers/${id}`, { method: "DELETE" }),

  setProductModifierGroups: (productId, body) => jsonFetch(`/products/${productId}/modifier-groups`, { method: "PUT", body: JSON.stringify(body) }),
  getProductSaleOptions: (productId) => jsonFetch(`/products/${productId}/sale-options`),

  // Ecran cuisine (SCRUM-298)
  getKitchenBoard: (params = {}) => jsonFetch(`/kitchen/board${buildQuery(params)}`),
  updateKitchenLineStatus: (lineId, body) => jsonFetch(`/kitchen/lines/${lineId}/status`, { method: "POST", body: JSON.stringify(body) }),

  // Caisses & jumelage scanner mobile (SCRUM-299)
  listRegisters: (params = {}) => jsonFetch(`/registers${buildQuery(params)}`),
  createRegister: (body) => jsonFetch("/registers", { method: "POST", body: JSON.stringify(body) }),
  updateRegister: (id, body) => jsonFetch(`/registers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeRegister: (id) => jsonFetch(`/registers/${id}`, { method: "DELETE" }),
  requestPairingCode: (id) => jsonFetch(`/registers/${id}/pairing-code`, { method: "POST" }),
  pairWithCode: (pairingCode) => jsonFetch("/registers/pair", { method: "POST", body: JSON.stringify({ pairingCode }) }),

  // Espace Super Admin plateforme (SCRUM-303). Ce sous-ensemble d'appels est
  // pense comme un premier jalon reutilisable pour d'autres modules futurs
  // (pas seulement KodaTill) : la console super_owner est generique cote
  // backend (organizations.controller.ts existe depuis avant KodaTill), seule
  // la vue "platform/*" est specifique KodaTill pour l'instant.
  getPlatformOverview: () => jsonFetch("/platform/overview"),
  listPlatformCompanies: (params = {}) => jsonFetch(`/platform/companies${buildQuery(params)}`),
  listPlans: () => jsonFetch("/platform/plans"),
  createPlan: (body) => jsonFetch("/platform/plans", { method: "POST", body: JSON.stringify(body) }),
  updatePlan: (id, body) => jsonFetch(`/platform/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removePlan: (id) => jsonFetch(`/platform/plans/${id}`, { method: "DELETE" }),
  getMySubscription: () => jsonFetch("/my-subscription"),
  createSubscription: (body) => jsonFetch("/platform/subscriptions", { method: "POST", body: JSON.stringify(body) }),
  updateSubscription: (organizationId, body) => jsonFetch(`/platform/subscriptions/${organizationId}`, { method: "PATCH", body: JSON.stringify(body) }),
  computeCommissions: (body) => jsonFetch("/platform/commissions/compute", { method: "POST", body: JSON.stringify(body) }),
  listCommissions: (period) => jsonFetch(`/platform/commissions${buildQuery({ period })}`),
  // Console organisations : routes racine /organizations/... (pas /kodatill/...).
  // listOrganizations expose organizationId <-> publicId (necessaire pour
  // suspendre/reactiver depuis la liste platform/companies, qui ne renvoie
  // que l'id interne — jointure faite cote ecran, pas de doublon backend).
  listOrganizations: () => doRootJsonFetch("/organizations"),
  suspendOrganization: (publicId, reason) => doRootJsonFetch(`/organizations/${encodeURIComponent(publicId)}/suspend`, { method: "POST", body: JSON.stringify({ reason }) }),
  reactivateOrganization: (publicId) => doRootJsonFetch(`/organizations/${encodeURIComponent(publicId)}/reactivate`, { method: "POST" }),
};
