import { clearAuth, getToken, restoreSession } from "./auth.jsx";

const NATIVE = typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true || /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST = (typeof window !== "undefined" && window.COMPTABILITE_API_HOST) || "https://dev.ongdngolu.org";
export const API_ROOT = (NATIVE ? API_HOST : "") + "/api";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch(path, init = {}, retried = false) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (!retried) {
        const token = await restoreSession();
        if (token) return jsonFetch(path, init, true);
      }
      clearAuth();
      window.dispatchEvent(new CustomEvent("comptabilite:auth-changed"));
    }
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${body.slice(0, 180)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function withQuery(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString();
  return suffix ? `${path}${path.includes("?") ? "&" : "?"}${suffix}` : path;
}

export const api = {
  setting: () => jsonFetch("/setting"),
  currencies: () => jsonFetch("/currency?query=all"),
  transactions: () => jsonFetch("/transaction?status=true&page=1&limit=100"),
  accounts: () => jsonFetch("/account?type=sa&query=all"),
  mainAccounts: () => jsonFetch("/account?query=ma"),
  trialBalance: () => jsonFetch("/account?query=tb"),
  balanceSheet: () => jsonFetch("/account?query=bs"),
  incomeStatement: () => jsonFetch("/account?query=is"),
  createTransaction: (body) => jsonFetch("/transaction", { method: "POST", body: JSON.stringify(body) }),
  createAccount: (body) => jsonFetch("/account", { method: "POST", body: JSON.stringify(body) }),
  transactionTypes: () => jsonFetch("/transaction-type"),
  // ── Types SIFA (règles multi-lignes paramétrables) ───────────────────
  typeRules: () => jsonFetch("/ledger/type-rules"),
  saveType: (body) => jsonFetch("/ledger/type-rules", { method: "POST", body: JSON.stringify(body) }),
  deleteType: (type) => jsonFetch(`/ledger/type-rules/${encodeURIComponent(type)}/delete`, { method: "POST" }),

  // ── Grand livre moderne (partie double) ──────────────────────────────
  ledgerEntries: (params) => jsonFetch(withQuery("/ledger", params)),
  ledgerEntry: (id) => jsonFetch(`/ledger/${id}`),
  ledgerBalances: (params) => jsonFetch(withQuery("/ledger/balances", params)),
  ledgerAccount: (accountId) => jsonFetch(`/ledger/account/${accountId}`),
  ledgerTrialBalance: (params) => jsonFetch(withQuery("/ledger/trial-balance", params)),
  ledgerIncomeStatement: (params) => jsonFetch(withQuery("/ledger/income-statement", params)),
  ledgerBalanceSheet: (params) => jsonFetch(withQuery("/ledger/balance-sheet", params)),
  ledgerPeriods: () => jsonFetch("/ledger/periods"),

  // ── Échange de devise (modèle bancaire : vrais montants + taux réel) ──
  exchanges: () => jsonFetch("/ledger/exchanges"),
  exchange: (id) => jsonFetch(`/ledger/exchanges/${id}`),
  createExchange: (body) => jsonFetch("/ledger/exchanges", { method: "POST", body: JSON.stringify(body) }),
  reverseExchange: (id, reason) => jsonFetch(`/ledger/exchanges/${id}/reverse`, { method: "POST", body: JSON.stringify({ reason }) }),

  // ── Projets / Bailleurs (analytique) ─────────────────────────────────
  projects: () => jsonFetch("/projects"),
  createProject: (body) => jsonFetch("/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id, body) => jsonFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  projectReport: (id) => jsonFetch(`/projects/${id}/report`),
  createLedgerEntry: (body) => jsonFetch("/ledger", { method: "POST", body: JSON.stringify(body) }),
  reverseEntry: (id, reason) => jsonFetch(`/ledger/${id}/reverse`, { method: "POST", body: JSON.stringify({ reason }) }),

  // ── Approbations (gate + workflow) ───────────────────────────────────
  approvalRequirements: () => jsonFetch("/ledger/approval-requirements"),
  setApprovalRequirement: (body) => jsonFetch("/ledger/approval-requirements", { method: "POST", body: JSON.stringify(body) }),
  pendingApprovals: () => jsonFetch("/workflow/instances?status=pending"),
  approveInstance: (id, comment) => jsonFetch(`/workflow/instances/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
  rejectInstance: (id, comment) => jsonFetch(`/workflow/instances/${id}/reject`, { method: "POST", body: JSON.stringify({ comment }) }),

  // ── Taux de taxe (réutilise l'API product-vat existante) ─────────────
  taxRates: () => jsonFetch("/product-vat"),
  createTaxRate: (body) => jsonFetch("/product-vat", { method: "POST", body: JSON.stringify(body) }),
  updateTaxRate: (id, body) => jsonFetch(`/product-vat/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // ── Budget (live depuis le grand livre) ──────────────────────────────
  budgets: () => jsonFetch("/budget"),
  budgetStatus: (id) => jsonFetch(`/budget/${id}/status-ledger`),

  // ── Achats / Factures fournisseurs (purchase-invoices) ───────────────
  purchaseInvoices: () => jsonFetch("/purchase-invoice"),
  purchaseInvoicesInfo: () => jsonFetch("/purchase-invoice?query=info"),
  approvePurchaseInvoice: (id, comment) => jsonFetch(`/purchase-invoice/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),

  // ── Procurement / Stock (entrepôts, mouvements, commandes) ───────────
  warehouses: () => jsonFetch("/procurement/warehouses"),
  warehouseStock: (id) => jsonFetch(`/procurement/warehouses/${id}/stock`),
  purchaseOrders: () => jsonFetch("/procurement/orders"),
  purchaseOrder: (id) => jsonFetch(`/procurement/orders/${id}`),
  setOrderStatus: (id, status) => jsonFetch(`/procurement/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  receiveOrder: (id, body) => jsonFetch(`/procurement/orders/${id}/receive`, { method: "POST", body: JSON.stringify(body || {}) })
};
