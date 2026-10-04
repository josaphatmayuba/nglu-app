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

/**
 * Ouvre un fichier protege par JWT dans un nouvel onglet SANS jamais mettre
 * le token dans l'URL (SCRUM-119 : access-token en memoire uniquement). Le
 * token en `?token=` finirait en clair dans les logs d'acces nginx.
 *
 * `window.open("", "_blank")` doit etre appele de façon SYNCHRONE dans le
 * handler de clic — un appel apres un `await` est bloque par les navigateurs
 * (ouverture de popup hors interaction utilisateur directe).
 *
 * En cas d'erreur (ex. 404 "a re-televerser"), ferme l'onglet et renvoie le
 * message d'erreur a l'appelant (pour un toast/alert existant de l'ecran) au
 * lieu de laisser un onglet vide ouvert.
 */
async function openAuthenticatedFile(path) {
  const win = window.open("", "_blank");
  try {
    const blob = await fetchAuthenticatedBlob(path);
    const blobUrl = URL.createObjectURL(blob);
    if (win) win.location = blobUrl;
    return { opened: true };
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

/**
 * Recupere un fichier protege par JWT comme Blob, sans jamais mettre le token
 * dans l'URL. Utilise par les apercus <img> (ReceiptField) via un hook qui
 * cree un object URL et le revoque au demontage.
 *
 * @param {string} path
 * @param {(p: number|null) => void} [onProgress] pourcentage 0-100, null = taille inconnue
 * @param {AbortSignal} [signal] annulation (AbortError a ignorer par l'appelant)
 */
async function fetchAuthenticatedBlob(path, onProgress, signal) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), signal });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    const body = await res.text().catch(() => "");
    throw new Error(cleanApiError(res, body));
  }
  // Content-Length = taille compressee si content-encoding : ne pas s'y fier.
  const total = res.headers.get("content-encoding") ? 0 : Number(res.headers.get("content-length")) || 0;
  if (!onProgress || !res.body?.getReader) return res.blob();
  // Lecture en flux pour remonter un pourcentage (0-100) ; sans Content-Length
  // le total est inconnu et onProgress recoit null (barre indeterminee).
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(total ? Math.min(100, Math.round((loaded / total) * 100)) : null);
  }
  onProgress(100);
  return new Blob(chunks, { type: res.headers.get("content-type") || "" });
}

// ── Endpoints (alignés sur property-management.controller.ts) ──
export const api = {
  // Ouvre un fichier protege par JWT dans un nouvel onglet via fetch+blob
  // (jamais de token dans l'URL). A appeler directement dans le handler de
  // clic (ouverture synchrone de la fenetre avant l'await interne).
  openAuthenticatedFile: (path) => openAuthenticatedFile(path),
  // Pour les apercus <img> (ReceiptField) : recupere le fichier en Blob avec
  // l'en-tete Authorization, sans jamais mettre le token dans l'URL.
  // onProgress et signal (AbortSignal) optionnels.
  fetchAuthenticatedBlob: (path, onProgress, signal) => fetchAuthenticatedBlob(path, onProgress, signal),
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
  // Copie de la pièce d'identité du locataire (une copie par locataire, MinIO).
  uploadTenantIdDocument: (id, file) => {
    const form = new FormData();
    form.append("document", file);
    return multipartFetch(`/tenants/${id}/id-document`, form);
  },
  deleteTenantIdDocument: (id) => del(`/tenants/${id}/id-document`),
  tenantIdDocumentUrl: (id) => authenticatedFileUrl(`/tenants/${id}/id-document/file`),
  // Lien portail locataire (accès public sans login, token opaque dans l'URL).
  tenantPortalLink: (id) => get(`/tenants/${id}/portal-link`),
  tenantChangeRequests: (status = "pending") => get(`/tenant-change-requests?status=${encodeURIComponent(status)}`),
  approveTenantChangeRequest: (id, note) => post(`/tenant-change-requests/${id}/approve`, { note }),
  rejectTenantChangeRequest: (id, note) => post(`/tenant-change-requests/${id}/reject`, { note }),
  generateTenantPortalLink: (id) => post(`/tenants/${id}/portal-link`),
  revokeTenantPortalLink: (id) => del(`/tenants/${id}/portal-link`),
  // Historique des communications (email + SMS) envoyées à ce locataire.
  tenantCommunications: (id) => get(`/tenants/${id}/communications`),
  // Renvoi d'un SMS dont l'envoi a echoue (reprend destinataire + texte du log).
  resendSmsLog: (logId) => post(`/sms-logs/${logId}/resend`),

  onboardingList: () => get("/onboarding"),
  generateOnboarding: (b) => post("/onboarding", b),
  updateOnboarding: (id, b) => patch(`/onboarding/${id}`, b),
  validateOnboarding: (id) => post(`/onboarding/${id}/validate`),
  deleteOnboarding: (id) => del(`/onboarding/${id}`),
  sendOnboardingSms: (id) => post(`/onboarding/${id}/send-sms`),
  sendOnboardingEmail: (id) => post(`/onboarding/${id}/send-email`),

  owners: () => get("/owners"),
  owner: (id) => get(`/owners/${id}`),
  createOwner: (b) => post("/owners", b),
  updateOwner: (id, b) => put(`/owners/${id}`, b),
  deleteOwner: (id) => del(`/owners/${id}`),

  // Délégués : mandataires chargés du suivi de loyer. Ils reçoivent les mêmes
  // annonces que le propriétaire sur le périmètre qui leur est affecté.
  delegates: () => get("/delegates"),
  delegateRentChecks: (answer) => get(`/delegate-rent-checks${answer ? `?answer=${encodeURIComponent(answer)}` : ""}`),
  // Personnes designables comme delegue : employes + sous-traitants/prestataires
  // du registre central, en une seule liste (on ignore souvent, au moment de
  // designer, si la personne est enregistree comme employe ou comme tiers).
  delegateCandidates: () => get("/delegates/candidates"),
  delegate: (id) => get(`/delegates/${id}`),
  createDelegate: (b) => post("/delegates", b),
  updateDelegate: (id, b) => put(`/delegates/${id}`, b),
  deleteDelegate: (id) => del(`/delegates/${id}`),
  addDelegateAssignment: (id, b) => post(`/delegates/${id}/assignments`, b),
  updateDelegateAssignment: (id, assignmentId, b) => put(`/delegates/${id}/assignments/${assignmentId}`, b),
  removeDelegateAssignment: (id, assignmentId) => del(`/delegates/${id}/assignments/${assignmentId}`),

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
  // Justificatif de paiement (quittance signee envoyee par le locataire ou
  // declaree par un delegue) : verifie l'appartenance a l'organisation du JWT
  // avant de streamer le fichier — jamais de route statique /uploads publique,
  // jamais de token dans l'URL (fetch+blob via openAuthenticatedFile).
  paymentProofUrl: (paymentId) => openAuthenticatedFile(`/leases/payments/${paymentId}/proof-file`),

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

  // Bail signé à la main (papier) — import du scan/photo pour archivage + consultation.
  leaseDocuments: (id) => get(`/leases/${id}/documents`),
  uploadLeaseDocument: (id, file, notes = "") => {
    const form = new FormData();
    form.append("document", file);
    if (notes) form.append("notes", notes);
    return multipartFetch(`/leases/${id}/documents`, form);
  },
  deleteLeaseDocument: (documentId) => del(`/leases/documents/${documentId}`),
  leaseDocumentUrl: (documentId) => authenticatedFileUrl(`/leases/documents/${documentId}/file`),

  // Carnet de quittances (PDF imprimable) : lease enrichi + tous les paiements du bail.
  rentBook: (id) => get(`/leases/${id}/rent-book`),

  payments: () => get("/payments"),
  // proofFile optionnel (photo/scan recu, capture mobile money) — meme
  // pattern multipart que markContractSignedManually / uploadMaintenancePhoto.
  createPayment: (b, proofFile = null) => {
    if (!proofFile) return post("/payments", b);
    const form = new FormData();
    Object.entries(b || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append("proof", proofFile);
    return multipartFetch("/payments", form);
  },
  sendReminder: (b) => post("/payments/reminder", b),
  // Preavis pour defaut de paiement : reserve aux baux qui doivent plus d'un
  // mois de loyer (le backend revalide le seuil et refuse sinon).
  sendDefaultNotice: (leaseId) => post("/payments/default-notice", { leaseId }),
  runOverdueReminders: () => post("/payments/run-overdue-reminders"),

  // Bail cree retroactivement (aucun paiement saisi) : genere les echeances
  // manquantes en statut pending, une ligne par mois calendaire ecoule non couvert.
  generateMissingPayments: (leaseId) => post(`/leases/${leaseId}/generate-missing-payments`),
  // Confirme une echeance pending en paiement encaisse (transaction comptable
  // + ledger crees a la confirmation). Meme pattern multipart que createPayment.
  confirmPayment: (paymentId, b, proofFile = null) => {
    if (!proofFile) return post(`/payments/${paymentId}/confirm`, b);
    const form = new FormData();
    Object.entries(b || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append("proof", proofFile);
    return multipartFetch(`/payments/${paymentId}/confirm`, form);
  },

  maintenance: () => get("/maintenance"),
  maintenanceItem: (id) => get(`/maintenance/${id}`),
  createMaintenance: (b) => post("/maintenance", b),
  updateMaintenance: (id, b) => put(`/maintenance/${id}`, b),
  deleteMaintenance: (id) => del(`/maintenance/${id}`),
  // Référentiel central fournisseurs (route racine /api/supplier, hors préfixe /property-management)
  // `nature` restreint la liste a ce que fait le tiers (service, subcontractor,
  // goods) ; sans argument on garde tous les tiers du domaine immobilier, comme avant.
  suppliers: (nature) =>
    jsonFetch(`/supplier?query=all&type=real_estate${nature ? `&nature=${nature}` : ""}`, { method: "GET", base: API_ROOT }),
  // Ecriture sur le referentiel central. `domains`/`natures` sont multi-valeurs :
  // un sous-traitant cree ici reste UN seul tiers, visible aussi dans BatiPro
  // s il porte ce domaine. La suppression est un soft delete (status=false).
  createSupplier: (b) => jsonFetch("/supplier", { method: "POST", body: b, base: API_ROOT }),
  updateSupplier: (id, b) => jsonFetch(`/supplier/${id}`, { method: "PUT", body: b, base: API_ROOT }),
  setSupplierStatus: (id, status) =>
    jsonFetch(`/supplier/${id}`, { method: "PATCH", body: { status }, base: API_ROOT }),
  // Inscription au carnet BatiPro (route /api/batipro, hors prefixe Domus). Sert
  // a rendre un artisan saisi ici reutilisable tel quel sur un chantier : la fiche
  // part sans projet ni montant, que BatiPro renseigne en l affectant.
  registerBatiproSubcontractor: (b) =>
    jsonFetch("/batipro/subcontractors", { method: "POST", body: b, base: API_ROOT }),
  maintenanceCosts: (id) => get(`/maintenance/${id}/costs`),
  addMaintenanceCost: (id, b) => post(`/maintenance/${id}/costs`, b),
  deleteMaintenanceCost: (id) => del(`/maintenance/costs/${id}`),
  maintenancePhotos: (id) => get(`/maintenance/${id}/photos`),
  uploadMaintenancePhoto: (id, file, photoType = "before") => {
    const form = new FormData();
    form.append("photo", file);
    if (photoType) form.append("photoType", photoType);
    return multipartFetch(`/maintenance/${id}/photos`, form);
  },
  deleteMaintenancePhoto: (photoId) => del(`/maintenance/photos/${photoId}`),
  maintenancePhotoUrl: (photoId) => authenticatedFileUrl(`/maintenance/photos/${photoId}/file`),
  // Justificatif (recu) d'un cout de maintenance — verifie l'appartenance a
  // l'organisation du JWT avant de streamer le fichier (meme pattern que paymentProofUrl).
  maintenanceCostReceiptUrl: (costId) => openAuthenticatedFile(`/maintenance/costs/${costId}/receipt-file`),

  // Dépenses par propriété (SCRUM-310) — filtres query optionnels.
  propertyExpenses: ({ propertyId, category, dateFrom, dateTo } = {}) => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (category) params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return get(`/property-expenses${qs ? `?${qs}` : ""}`);
  },
  propertyExpense: (id) => get(`/property-expenses/${id}`),
  createPropertyExpense: (b) => post("/property-expenses", b),
  updatePropertyExpense: (id, b) => patch(`/property-expenses/${id}`, b),
  deletePropertyExpense: (id) => del(`/property-expenses/${id}`),
  // Justificatif (recu/facture) — meme pattern multipart que uploadMaintenancePhoto.
  uploadPropertyExpenseReceipt: (id, file) => {
    const form = new FormData();
    form.append("receipt", file);
    return multipartFetch(`/property-expenses/${id}/receipt`, form);
  },
  // Justificatif (recu/facture) — verifie l'appartenance a l'organisation du
  // JWT avant de streamer le fichier (meme pattern que paymentProofUrl).
  propertyExpenseReceiptUrl: (id) => openAuthenticatedFile(`/property-expenses/${id}/receipt-file`),

  // Echeancier de paiement des dépenses de propriété (SCRUM-313).
  expenseInstallments: (expenseId) => get(`/property-expenses/${expenseId}/installments`),
  generateExpenseInstallments: (expenseId, b) => post(`/property-expenses/${expenseId}/installments/generate`, b),
  addExpensePartialPayment: (expenseId, b) => post(`/property-expenses/${expenseId}/installments`, b),
  payExpenseInstallment: (installmentId, b) => patch(`/property-expenses/installments/${installmentId}/pay`, b),
  updateExpenseInstallment: (installmentId, b) => patch(`/property-expenses/installments/${installmentId}`, b),
  deleteExpenseInstallment: (installmentId) => del(`/property-expenses/installments/${installmentId}`),
  uploadExpenseInstallmentReceipt: (installmentId, file) => {
    const form = new FormData();
    form.append("receipt", file);
    return multipartFetch(`/property-expenses/installments/${installmentId}/receipt`, form);
  },
  // Justificatif (recu/facture) — verifie l'appartenance a l'organisation du
  // JWT avant de streamer le fichier (meme pattern que paymentProofUrl).
  expenseInstallmentReceiptUrl: (installmentId) => openAuthenticatedFile(`/property-expenses/installments/${installmentId}/receipt-file`),

  // Remboursement hypothèque par propriété (SCRUM-311) — filtres query optionnels.
  mortgagePayments: ({ propertyId, dateFrom, dateTo } = {}) => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return get(`/mortgage-payments${qs ? `?${qs}` : ""}`);
  },
  mortgagePayment: (id) => get(`/mortgage-payments/${id}`),
  createMortgagePayment: (b) => post("/mortgage-payments", b),
  updateMortgagePayment: (id, b) => patch(`/mortgage-payments/${id}`, b),
  deleteMortgagePayment: (id) => del(`/mortgage-payments/${id}`),
  // Justificatif (recu/facture) — meme pattern que uploadPropertyExpenseReceipt.
  uploadMortgagePaymentReceipt: (id, file) => {
    const form = new FormData();
    form.append("receipt", file);
    return multipartFetch(`/mortgage-payments/${id}/receipt`, form);
  },
  // Justificatif (recu/facture) — verifie l'appartenance a l'organisation du
  // JWT avant de streamer le fichier (meme pattern que paymentProofUrl).
  mortgagePaymentReceiptUrl: (id) => openAuthenticatedFile(`/mortgage-payments/${id}/receipt-file`),

  // Prêts hypothécaires (SCRUM-311 phase 2) — filtres query optionnels.
  mortgageLoans: ({ propertyId, status } = {}) => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    if (status) params.set("status", status);
    const qs = params.toString();
    return get(`/mortgage-loans${qs ? `?${qs}` : ""}`);
  },
  mortgageLoan: (id) => get(`/mortgage-loans/${id}`),
  createMortgageLoan: (b) => post("/mortgage-loans", b),
  updateMortgageLoan: (id, b) => patch(`/mortgage-loans/${id}`, b),
  deleteMortgageLoan: (id) => del(`/mortgage-loans/${id}`),

  // P&L par propriété (SCRUM-312) — revenus/dépenses/hypothèque sur une période.
  propertyPnl: (propertyId, dateFrom, dateTo) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    return get(`/properties/${propertyId}/pnl${qs ? `?${qs}` : ""}`);
  },

  // Caution / dépôt de garantie (cycle complet : encaissement + restitution).
  // proofFile optionnel (photo/scan recu signe) — meme pattern multipart que createPayment.
  deposits: () => get("/deposits"),
  collectDeposit: (leaseId, b, proofFile = null) => {
    if (!proofFile) return post(`/leases/${leaseId}/deposit`, b);
    const form = new FormData();
    Object.entries(b || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append("proof", proofFile);
    return multipartFetch(`/leases/${leaseId}/deposit`, form);
  },
  returnDeposit: (leaseId, b, proofFile = null) => {
    if (!proofFile) return post(`/leases/${leaseId}/deposit/return`, b);
    const form = new FormData();
    Object.entries(b || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append("proof", proofFile);
    return multipartFetch(`/leases/${leaseId}/deposit/return`, form);
  },

  // Réservations temporaires (type hôtel, tarif par jour, recette au check-out).
  reservations: () => get("/reservations"),
  reservation: (id) => get(`/reservations/${id}`),
  reservationsForProperty: (id) => get(`/properties/${id}/reservations`),
  createReservation: (b) => post("/reservations", b),
  updateReservation: (id, b) => put(`/reservations/${id}`, b),
  deleteReservation: (id) => del(`/reservations/${id}`),
  confirmReservation: (id) => post(`/reservations/${id}/confirm`),
  checkInReservation: (id) => post(`/reservations/${id}/check-in`),
  payReservation: (id, b) => post(`/reservations/${id}/pay`, b),
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
  sendContractWelcome: (id) => post(`/contracts/${id}/send-welcome`),
  deleteContract: (id) => del(`/contracts/${id}`),
  markContractSignedManually: (id, file) => {
    const form = new FormData();
    form.append("document", file);
    return multipartFetch(`/contracts/${id}/mark-signed-manually`, form);
  },

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

  // Enquête de prélocation (Québec) — dossier interne du gestionnaire (JWT).
  prescreenings: (status) => get(`/prescreenings${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  prescreening: (id) => get(`/prescreenings/${id}`),
  createPrescreeningInvite: (b) => post("/prescreenings/invite", b),
  addPrescreeningReference: (id, b) => post(`/prescreenings/${id}/references`, b),
  updatePrescreeningReferenceContact: (id, refId, b) => post(`/prescreenings/${id}/references/${refId}/contact`, b),
  decidePrescreening: (id, b) => post(`/prescreenings/${id}/decision`, b),
  markPrescreeningCreditCheck: (id) => post(`/prescreenings/${id}/credit-check/mark`),
  convertPrescreeningToOnboarding: (id) => post(`/prescreenings/${id}/convert-to-onboarding`),
  purgePrescreening: (id) => post(`/prescreenings/${id}/purge`),
  prescreeningConsentTexts: () => get("/prescreenings/consent-texts"),
};

// ── Onboarding public (page locataire Domus, sans authentification) ──
// Le backend renvoie un lien vers la page CRM (APP_URL/onboarding/tenant?token=).
// Domus possède sa PROPRE page publique : on réécrit le lien vers une URL propre
// sous /domus/. nginx assure le fallback SPA (`@dev_domus_spa`/`@prod_domus_spa`
// → /domus/index.html) pour ce deep-link, donc pas besoin de routage par hash.
// Base injectee par vite : "/domus/" (defaut) ou "/" (build --mode avelomi).
export const ONBOARDING_PATH = `${import.meta.env.BASE_URL}onboarding/tenant`;
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

// Même principe pour le portail locataire (accès public sans login) : URL propre
// Domus sous /domus/mon-espace?token=... (deep-link mobile à préserver).
export const PORTAL_PATH = `${import.meta.env.BASE_URL}mon-espace`;
// Domus sous /domus/proprietaire?token=... (pendant bailleur de PORTAL_PATH).
export const OWNER_PORTAL_PATH = `${import.meta.env.BASE_URL}proprietaire`;
export function domusPortalUrl(backendUrlOrToken) {
  if (!backendUrlOrToken) return "";
  try {
    const u = new URL(backendUrlOrToken);
    const token = u.searchParams.get("token");
    if (!token) return backendUrlOrToken || "";
    return `${u.origin}${PORTAL_PATH}?token=${encodeURIComponent(token)}`;
  } catch {
    return backendUrlOrToken || "";
  }
}

// Même principe pour l'enquête de prélocation (Québec) : URL propre Domus
// sous /domus/prescreening/candidature?token=... (deep-link mobile à préserver).
export const PRESCREENING_PATH = `${import.meta.env.BASE_URL}prescreening/candidature`;
export function domusPrescreeningUrl(backendUrlOrToken) {
  if (!backendUrlOrToken) return "";
  try {
    const u = new URL(backendUrlOrToken);
    const token = u.searchParams.get("token");
    if (!token) return backendUrlOrToken || "";
    return `${u.origin}${PRESCREENING_PATH}?token=${encodeURIComponent(token)}`;
  } catch {
    // Pas une URL absolue : on suppose que c'est déjà un token brut.
    return `${window.location.origin}${PRESCREENING_PATH}?token=${encodeURIComponent(backendUrlOrToken)}`;
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

  // Portail locataire (accès public sans login, token opaque fait autorisation).
  tenantPortal: (token) => publicFetch(`/tenant-portal?token=${encodeURIComponent(token)}`),
  // Justificatif d'un paiement : le backend verifie que le paiement appartient
  // bien au locataire porteur du token puis streame directement le fichier
  // (plus de JSON intermediaire) — meme pattern que tenantContractCopyUrl.
  tenantPaymentProofUrl: (token, paymentId) =>
    `${API_ROOT}/tenant-portal/payments/${paymentId}/proof?token=${encodeURIComponent(token)}`,
  // Resume minimal d'UNE quittance (mois/montant/statut), pour la page dediee
  // /domus/quittance ouverte par le QR individuel du carnet — pas le dossier complet.
  tenantPaymentSummary: (token, paymentId) =>
    publicFetch(`/tenant-portal/payments/${paymentId}/summary?token=${encodeURIComponent(token)}`),
  // Envoi de la preuve de paiement par le locataire (photo ou PDF) : multipart,
  // meme fetch dedie que submitDelegateRentCheck car publicFetch force un
  // Content-Type JSON incompatible avec FormData.
  uploadTenantPaymentProof: async (token, paymentId, file) => {
    const form = new FormData();
    form.append("proof", file);
    const res = await fetch(`${API_ROOT}/tenant-portal/payments/${paymentId}/proof?token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(cleanApiError(res, body));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  // Copie du bail : une seule URL selon `copySource` renvoye par le portail
  // ('scan' = bail papier numerise, 'electronic' = bail signe en ligne rendu en
  // HTML imprimable). Le backend revalide que le bail appartient au porteur du
  // token, l'id seul ne donne acces a rien.
  tenantContractCopyUrl: (token, contractId, source) =>
    `${API_ROOT}/tenant-portal/contracts/${contractId}/${source === "scan" ? "scan" : "print"}?token=${encodeURIComponent(token)}`,

  // Portail proprietaire (lecture seule, token opaque fait autorisation) :
  // le bailleur ouvre la fiche du locataire annonce par SMS.
  ownerPortal: (token) => publicFetch(`/owner-portal?token=${encodeURIComponent(token)}`),
  // Justificatif d'un paiement cote proprietaire : le backend verifie que le
  // paiement appartient bien a un bien du porteur du token puis streame
  // directement le fichier (plus de JSON intermediaire).
  ownerPaymentProofUrl: (token, paymentId) =>
    `${API_ROOT}/owner-portal/payments/${paymentId}/proof?token=${encodeURIComponent(token)}`,
  // Demande de mise a jour des donnees personnelles : rien n'est applique, la
  // demande attend la validation d'un gestionnaire.
  submitTenantChangeRequest: (token, values) =>
    publicFetch(`/tenant-portal/change-request?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(values || {}) }),

  // Portail delegue : le mandataire repond a une relance de loyer en retard.
  // La reponse "paye" cree une ligne de paiement EN ATTENTE que le gestionnaire
  // valide ensuite depuis le CRM — jamais un encaissement direct.
  delegateRentCheck: (token) => publicFetch(`/delegate-portal?token=${encodeURIComponent(token)}`),
  // Envoi multipart (une photo de preuve possible) : publicFetch force un
  // Content-Type JSON, on passe donc par un fetch dedie qui laisse le
  // navigateur poser lui-meme la frontiere multipart.
  submitDelegateRentCheck: async (token, { answer, amount, comment, proof } = {}) => {
    const form = new FormData();
    form.append("answer", answer || "");
    if (amount != null && amount !== "") form.append("amount", String(amount));
    if (comment) form.append("comment", comment);
    if (proof) form.append("proof", proof);
    const res = await fetch(`${API_ROOT}/delegate-portal?token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(cleanApiError(res, body));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // Enquête de prélocation (Québec) — dossier public sans authentification (token opaque).
  prescreening: (token) => publicFetch(`/tenant-prescreening?token=${encodeURIComponent(token)}`),
  savePrescreening: (token, values) =>
    publicFetch(`/tenant-prescreening/save?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(values || {}) }),
  recordPrescreeningConsent: (token, consentType, granted) =>
    publicFetch(`/tenant-prescreening/consent?token=${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify({ consentType, granted }) }),
  submitPrescreening: (token) =>
    publicFetch(`/tenant-prescreening/submit?token=${encodeURIComponent(token)}`, { method: "POST" }),
  prescreeningConsentText: (version, locale, consentType) =>
    publicFetch(`/tenant-prescreening/consent-text?version=${encodeURIComponent(version)}&locale=${encodeURIComponent(locale)}&consentType=${encodeURIComponent(consentType)}`),
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
