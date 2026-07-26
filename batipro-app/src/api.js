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

// Upload multipart authentifié (le token JWT n'est jamais dans l'URL).
async function uploadForm(path, formData, retried = false) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { ...authHeaders() }, body: formData });
  if (!res.ok) {
    if (res.status === 401 && !retried && (await restoreSession())) return uploadForm(path, formData, true);
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 160)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Récupère un fichier protégé en blob authentifié → object URL (jamais via <img src> direct).
async function blobUrl(path, retried = false) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) {
    if (res.status === 401 && !retried && (await restoreSession())) return blobUrl(path, true);
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), type: blob.type };
}

// Portail sous-traitant : appels PUBLICS (aucun JWT ; l'autorisation = le token
// opaque dans l'URL). base = /api/batipro/public/submit.
const PUBLIC_BASE = `${API_ROOT}/batipro/public/submit`;
async function publicJson(path, init = {}) {
  const res = await fetch(`${PUBLIC_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
async function publicUpload(path, formData) {
  const res = await fetch(`${PUBLIC_BASE}${path}`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const publicApi = {
  submitContext: (token) => publicJson(`/${encodeURIComponent(token)}`),
  submitDocument: (token, body) => publicJson(`/${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(body || {}) }),
  attachFile: (token, documentId, file) => { const fd = new FormData(); fd.append("file", file); return publicUpload(`/${encodeURIComponent(token)}/file/${documentId}`, fd); },
};

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
  currencies: () => jsonFetch("/currency?query=all", { base: API_ROOT }),
  // Prévisionnel (module forecast backend2, route racine /api/forecast) — scope "batipro".
  forecastCashFlow: ({ horizon, mode, scope = "batipro", adjust } = {}) =>
    jsonFetch(`/forecast/cash-flow?horizon=${horizon}&mode=${mode}&scope=${scope}${adjust ? `&adjust=${encodeURIComponent(adjust)}` : ""}`, { base: API_ROOT }),
  materials: () => jsonFetch("/materials"),
  createMaterial: (b) => jsonFetch("/materials", { method: "POST", body: JSON.stringify(b || {}) }),
  updateMaterial: (id, b) => jsonFetch(`/materials/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteMaterial: (id) => jsonFetch(`/materials/${id}`, { method: "DELETE" }),
  crews: () => jsonFetch("/crews"),
  createCrew: (b) => jsonFetch("/crews", { method: "POST", body: JSON.stringify(b || {}) }),
  updateCrew: (id, b) => jsonFetch(`/crews/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteCrew: (id) => jsonFetch(`/crews/${id}`, { method: "DELETE" }),
  phases: (projectId) => jsonFetch(`/phases${projectId ? `?project_id=${projectId}` : ""}`),
  createPhase: (b) => jsonFetch("/phases", { method: "POST", body: JSON.stringify(b || {}) }),
  updatePhase: (id, b) => jsonFetch(`/phases/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deletePhase: (id) => jsonFetch(`/phases/${id}`, { method: "DELETE" }),
  situations: (projectId) => jsonFetch(`/situations${projectId ? `?project_id=${projectId}` : ""}`),
  createSituation: (b) => jsonFetch("/situations", { method: "POST", body: JSON.stringify(b || {}) }),
  updateSituation: (id, b) => jsonFetch(`/situations/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteSituation: (id) => jsonFetch(`/situations/${id}`, { method: "DELETE" }),
  changeOrders: (projectId) => jsonFetch(`/change-orders${projectId ? `?project_id=${projectId}` : ""}`),
  createChangeOrder: (b) => jsonFetch("/change-orders", { method: "POST", body: JSON.stringify(b || {}) }),
  updateChangeOrder: (id, b) => jsonFetch(`/change-orders/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteChangeOrder: (id) => jsonFetch(`/change-orders/${id}`, { method: "DELETE" }),
  subcontractors: () => jsonFetch("/subcontractors"),
  createSubcontractor: (b) => jsonFetch("/subcontractors", { method: "POST", body: JSON.stringify(b || {}) }),
  updateSubcontractor: (id, b) => jsonFetch(`/subcontractors/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteSubcontractor: (id) => jsonFetch(`/subcontractors/${id}`, { method: "DELETE" }),
  // Plan 3D par chantier (modele architectural + niveaux)
  buildingModel: (projectId) => jsonFetch(`/building-model?project_id=${projectId}`),
  createBuildingModel: (b) => jsonFetch("/building-model", { method: "POST", body: JSON.stringify(b || {}) }),
  updateBuildingModel: (id, b) => jsonFetch(`/building-model/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteBuildingModel: (id) => jsonFetch(`/building-model/${id}`, { method: "DELETE" }),
  createBuildingLevel: (b) => jsonFetch("/building-levels", { method: "POST", body: JSON.stringify(b || {}) }),
  updateBuildingLevel: (id, b) => jsonFetch(`/building-levels/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteBuildingLevel: (id) => jsonFetch(`/building-levels/${id}`, { method: "DELETE" }),
  // Import du plan de l'architecte (image/PDF) — Phase 2
  uploadModelPlan: (modelId, file) => { const fd = new FormData(); fd.append("plan", file); return uploadForm(`/building-model/${modelId}/plan`, fd); },
  modelPlanUrl: (modelId) => blobUrl(`/building-model/${modelId}/plan`),
  deleteModelPlan: (modelId) => jsonFetch(`/building-model/${modelId}/plan`, { method: "DELETE" }),
  // Portail sous-traitant (Phase 0) — cote gestionnaire
  createSubcontractorLink: (b) => jsonFetch("/documents/subcontractor-link", { method: "POST", body: JSON.stringify(b || {}) }),
  submissions: (projectId) => jsonFetch(`/documents/submissions${projectId ? `?project_id=${projectId}` : ""}`),
  submissionLines: (id) => jsonFetch(`/documents/submissions/${id}/lines`),
  reviewSubmission: (id, b) => jsonFetch(`/documents/submissions/${id}/review`, { method: "POST", body: JSON.stringify(b || {}) }),
  submissionFileUrl: (id) => blobUrl(`/documents/submissions/${id}/file`),
  // Documents sortants : devis (Phase 1)
  documents: (projectId, type = "quote") => jsonFetch(`/documents?direction=outbound${type ? `&type=${type}` : ""}${projectId ? `&project_id=${projectId}` : ""}`),
  getDocument: (id) => jsonFetch(`/documents/${id}`),
  createDocument: (b) => jsonFetch("/documents", { method: "POST", body: JSON.stringify(b || {}) }),
  updateDocument: (id, b) => jsonFetch(`/documents/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteDocument: (id) => jsonFetch(`/documents/${id}`, { method: "DELETE" }),
  documentHtmlUrl: (id) => blobUrl(`/documents/${id}/html`),
  shareDocument: (id) => jsonFetch(`/documents/${id}/share`, { method: "POST", body: "{}" }),
  // Bons de commande (Phase 2) : reutilise les endpoints /documents generiques (type=purchase_order)
  budgetSummary: (projectId) => jsonFetch(`/documents/budget-summary?project_id=${projectId}`),
  // Situations de travaux (Phase 3, type=situation) : coexiste avec les situations legacy (/situations)
  situationsAdvancement: (projectId) => jsonFetch(`/documents/situations-advancement?project_id=${projectId}`),
  createSituationDocument: (b) => jsonFetch("/documents/situations", { method: "POST", body: JSON.stringify(b || {}) }),
  // Factures (Phase 4, type=invoice) : generation depuis situation, emission (compta ledger), paiement
  invoices: (projectId) => jsonFetch(`/documents?direction=outbound&type=invoice${projectId ? `&project_id=${projectId}` : ""}`),
  createInvoiceFromSituation: (situationId) => jsonFetch(`/documents/situations/${situationId}/invoice`, { method: "POST", body: "{}" }),
  issueInvoice: (id) => jsonFetch(`/documents/${id}/issue`, { method: "POST", body: "{}" }),
  recordPayment: (id, amount) => jsonFetch(`/documents/${id}/payment`, { method: "POST", body: JSON.stringify({ amount }) })
};

// Lien public partageable a copier/envoyer au sous-traitant.
export function subcontractorSubmitUrl(token) {
  const origin = (typeof window !== "undefined" && window.location?.origin) || "https://dev.ongdngolu.org";
  return `${origin}/batipro/public/submit/${token}`;
}

// Lien public du devis a copier/envoyer au client (page /batipro/public/document/:token).
export function clientDocumentUrl(token) {
  const origin = (typeof window !== "undefined" && window.location?.origin) || "https://dev.ongdngolu.org";
  return `${origin}/batipro/public/document/${token}`;
}

// Appels publics client (devis) : aucun JWT, autorisation = token opaque.
const PUBLIC_DOC_BASE = `${API_ROOT}/batipro/public/documents`;
export const publicDocApi = {
  htmlUrl: (token) => `${PUBLIC_DOC_BASE}/${encodeURIComponent(token)}`,
  accept: async (token) => {
    const res = await fetch(`${PUBLIC_DOC_BASE}/${encodeURIComponent(token)}/accept`, { method: "POST" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 200)}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
};
