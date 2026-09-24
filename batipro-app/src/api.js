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
  // `nature` restreint la liste a ce que fait le tiers : goods pour un achat de
  // materiaux, subcontractor pour un lot sous-traite. Sans argument, tout le domaine.
  suppliers: (nature) =>
    jsonFetch(`/supplier?query=all&type=construction${nature ? `&nature=${nature}` : ""}`, { base: API_ROOT }),
  currencies: () => jsonFetch("/currency?query=all", { base: API_ROOT }),
  // Prévisionnel (module forecast backend2, route racine /api/forecast) — scope "batipro".
  forecastCashFlow: ({ horizon, mode, scope = "batipro", adjust } = {}) =>
    jsonFetch(`/forecast/cash-flow?horizon=${horizon}&mode=${mode}&scope=${scope}${adjust ? `&adjust=${encodeURIComponent(adjust)}` : ""}`, { base: API_ROOT }),
  materials: ({ projectId } = {}) => jsonFetch(`/materials${projectId ? `?project_id=${projectId}` : ""}`),
  createMaterial: (b) => jsonFetch("/materials", { method: "POST", body: JSON.stringify(b || {}) }),
  updateMaterial: (id, b) => jsonFetch(`/materials/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteMaterial: (id) => jsonFetch(`/materials/${id}`, { method: "DELETE" }),
  // Suivi de stock par chantier (mouvements réception/consommation)
  stockMovements: (projectId) => jsonFetch(`/stock-movements${projectId ? `?project_id=${projectId}` : ""}`),
  createStockMovement: (b) => jsonFetch("/stock-movements", { method: "POST", body: JSON.stringify(b || {}) }),
  crews: () => jsonFetch("/crews"),
  createCrew: (b) => jsonFetch("/crews", { method: "POST", body: JSON.stringify(b || {}) }),
  updateCrew: (id, b) => jsonFetch(`/crews/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteCrew: (id) => jsonFetch(`/crews/${id}`, { method: "DELETE" }),
  // Ouvriers nominatifs (rattachés à une équipe)
  listWorkers: () => jsonFetch("/workers"),
  createWorker: (b) => jsonFetch("/workers", { method: "POST", body: JSON.stringify(b || {}) }),
  updateWorker: (id, b) => jsonFetch(`/workers/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteWorker: (id) => jsonFetch(`/workers/${id}`, { method: "DELETE" }),
  // Pointage journalier par chantier
  getAttendance: (projectId, { date, from, to } = {}) => {
    const qs = new URLSearchParams();
    if (date) qs.set("date", date);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    return jsonFetch(`/projects/${projectId}/attendance${q ? `?${q}` : ""}`);
  },
  saveAttendance: (projectId, entries) => jsonFetch(`/projects/${projectId}/attendance`, { method: "POST", body: JSON.stringify(entries || []) }),
  updateAttendance: (id, b) => jsonFetch(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(b || {}) }),
  deleteAttendance: (id) => jsonFetch(`/attendance/${id}`, { method: "DELETE" }),
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
  // Import du plan de l'architecte PAR ETAGE — le PDF du RDC n'est pas celui du R+1.
  uploadLevelPlan: (levelId, file) => { const fd = new FormData(); fd.append("plan", file); return uploadForm(`/building-levels/${levelId}/plan`, fd); },
  levelPlanUrl: (levelId) => blobUrl(`/building-levels/${levelId}/plan`),
  deleteLevelPlan: (levelId) => jsonFetch(`/building-levels/${levelId}/plan`, { method: "DELETE" }),
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
  // Photo/scan de la facture papier attachee a un document (ex. facture fournisseur, BC).
  uploadDocumentAttachment: (id, file) => { const fd = new FormData(); fd.append("file", file); return uploadForm(`/documents/${id}/attachment`, fd); },
  documentAttachmentUrl: (id) => blobUrl(`/documents/${id}/attachment`),
  // Scan OCR d'un devis/BC fournisseur (photo ou PDF) : upload + best-effort OCR,
  // ne cree aucun document — retourne { photoId, rawText, parsed } pour pre-remplir le formulaire.
  ocrScanDocument: (projectId, file) => { const fd = new FormData(); fd.append("scan", file); return uploadForm(`/projects/${projectId}/documents/ocr-scan`, fd); },
  // Bons de commande (Phase 2) : reutilise les endpoints /documents generiques (type=purchase_order)
  budgetSummary: (projectId) => jsonFetch(`/documents/budget-summary?project_id=${projectId}`),
  // Situations de travaux (Phase 3, type=situation) : coexiste avec les situations legacy (/situations)
  situationsAdvancement: (projectId) => jsonFetch(`/documents/situations-advancement?project_id=${projectId}`),
  createSituationDocument: (b) => jsonFetch("/documents/situations", { method: "POST", body: JSON.stringify(b || {}) }),
  // Factures (Phase 4, type=invoice) : generation depuis situation, emission (compta ledger), paiement
  invoices: (projectId) => jsonFetch(`/documents?direction=outbound&type=invoice${projectId ? `&project_id=${projectId}` : ""}`),
  createInvoiceFromSituation: (situationId) => jsonFetch(`/documents/situations/${situationId}/invoice`, { method: "POST", body: "{}" }),
  issueInvoice: (id) => jsonFetch(`/documents/${id}/issue`, { method: "POST", body: "{}" }),
  recordPayment: (id, amount) => jsonFetch(`/documents/${id}/payment`, { method: "POST", body: JSON.stringify({ amount }) }),
  postPurchase: (id) => jsonFetch(`/documents/${id}/post-purchase`, { method: "POST", body: "{}" }),
  // Factures fournisseur (type=invoice, direction=inbound) rattachees a un BC : un BC peut
  // recevoir plusieurs factures (livraisons/facturation partielles), chacune avec son propre reglement.
  createInvoiceFromPurchaseOrder: (poId, b) => jsonFetch(`/documents/purchase-orders/${poId}/invoice`, { method: "POST", body: JSON.stringify(b || {}) }),
  purchaseOrderInvoices: (poId) => jsonFetch(`/documents/purchase-orders/${poId}/invoices`),
  // Cycle de vie Bon de commande (SCRUM) : confirmation fournisseur puis réception par ligne.
  confirmDocument: (id, b) => jsonFetch(`/documents/${id}/confirm`, { method: "POST", body: JSON.stringify(b || {}) }),
  receiveDocument: (id, b) => jsonFetch(`/documents/${id}/receive`, { method: "POST", body: JSON.stringify(b || {}) }),
  cancelReceipt: (id, movementId) => jsonFetch(`/documents/${id}/receipts/${movementId}/cancel`, { method: "POST", body: "{}" }),
  // Galerie photo de chantier — l'upload backend n'accepte que le fichier
  // (champ "photo"). caption/taken_at/task_id sont appliqués via un PUT
  // immédiat après upload (2 appels, cf. batipro.controller.ts).
  uploadPhoto: async (projectId, file, { caption, takenAt, taskId, kind, linkedDocumentId } = {}) => {
    const fd = new FormData();
    fd.append("photo", file);
    const uq = new URLSearchParams();
    if (kind) uq.set("kind", kind);
    if (linkedDocumentId) uq.set("linkedDocumentId", linkedDocumentId);
    const uqs = uq.toString();
    const created = await uploadForm(`/projects/${projectId}/photos${uqs ? `?${uqs}` : ""}`, fd);
    const patch = {};
    if (caption) patch.caption = caption;
    if (takenAt) patch.taken_at = takenAt;
    if (taskId) patch.task_id = taskId;
    if (created?.id && Object.keys(patch).length) return jsonFetch(`/photos/${created.id}`, { method: "PUT", body: JSON.stringify(patch) });
    return created;
  },
  listPhotos: (projectId, { from, to, taskId, linkedDocumentId } = {}) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (taskId) qs.set("taskId", taskId);
    if (linkedDocumentId) qs.set("linkedDocumentId", linkedDocumentId);
    const q = qs.toString();
    return jsonFetch(`/projects/${projectId}/photos${q ? `?${q}` : ""}`);
  },
  photoBlobUrl: (id) => blobUrl(`/photos/${id}/file`),
  updatePhoto: (id, data) => jsonFetch(`/photos/${id}`, { method: "PUT", body: JSON.stringify(data || {}) }),
  deletePhoto: (id) => jsonFetch(`/photos/${id}`, { method: "DELETE" }),
  getReport: (projectId, { from, to } = {}) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    return jsonFetch(`/projects/${projectId}/report${q ? `?${q}` : ""}`);
  },
  // Notifications (cloche header)
  listNotifications: ({ unreadOnly } = {}) => jsonFetch(`/notifications${unreadOnly ? "?unreadOnly=true" : ""}`),
  markNotificationRead: (id) => jsonFetch(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => jsonFetch(`/notifications/read-all`, { method: "PUT" }),
  dismissNotification: (id) => jsonFetch(`/notifications/${id}`, { method: "DELETE" }),
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
