import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth, getUser } from "./auth.jsx";
import { AiAssistant } from "./aiAssistant.jsx";
import { defaultSymbol } from "./currency.js";

/* ───────────────────────────────────────────────────────────────────────
   Icônes (SVG inline, style lucide) — aucune dépendance externe.
   ─────────────────────────────────────────────────────────────────────── */
const P = {
  dashboard: "M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z",
  bookText: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM8 7h6M8 11h8",
  penLine: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  shapes: "M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1zM6 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8M14 14h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z",
  scrollText: "M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4M19 17V5a2 2 0 0 0-2-2H8M15 8h-5M15 12h-5",
  listTree: "M10 5h11M10 12h11M10 19h11M4 4v16M4 9h3M4 15h3",
  contact: "M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM10 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0M8 18a3 3 0 0 1 8 0",
  landmark: "M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M2 9l10-6 10 6zM2 11h20",
  warehouse: "M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.3-1.87l8-3.2a2 2 0 0 1 1.4 0l8 3.2A2 2 0 0 1 22 8.35M6 18h12M6 14h12M6 10h12",
  pieChart: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  piggyBank: "M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2zM2 9v1c0 1.1.9 2 2 2h1M16 11h.01",
  gauge: "M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0",
  barChart: "M3 3v18h18M7 16v-5M12 16V8M17 16v-9",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5",
  bookOpenCheck: "M12 21V7M16 12l2 2 4-4M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3",
  coins: "M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82",
  dollarSign: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  trendingUp: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  trendingDown: "M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6",
  shuffle: "M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  gitCompare: "M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9",
  scale: "M12 3v18M16 21H8M3 7l3 9c-.5.5-1.5 1-3 1s-2.5-.5-3-1l3-9zM21 7l3 9c-.5.5-1.5 1-3 1s-2.5-.5-3-1l3-9zM7 7h10",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  check: "M20 6 9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16v-4M12 8h.01",
  lightbulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.5 1 1.3 1 2.3h6c0-1 .5-1.8 1-2.3A7 7 0 0 0 12 2z",
  x: "M18 6 6 18M6 6l12 12",
  chevronRight: "M9 18l6-6-6-6",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  menu: "M3 12h18M3 6h18M3 18h18",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  fileCheck: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4",
  alertTriangle: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  bellRing: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0M4 2C2.8 3.7 2 5.7 2 8M22 8c0-2.3-.8-4.3-2-6",
  slidersH: "M21 4H14M10 4H3M21 12H12M8 12H3M21 20H16M12 20H3M14 2v4M8 10v4M16 18v4",
  wallet: "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 12h.01",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
};
function Icon({ name, className = "ic", style }) {
  const d = P[name] || P.circle;
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

/* ── Navigation (sections comme le mockup) ─────────────────────────────── */
const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { section: "Saisie" },
  { id: "approbations", label: "Approbations", icon: "bellRing" },
  { id: "journaux", label: "Journaux", icon: "bookText" },
  { id: "ecritures", label: "Écritures", icon: "penLine" },
  { id: "types", label: "Types de transaction", icon: "shapes" },
  { section: "Grands livres" },
  { id: "grandlivre", label: "Grand livre", icon: "scrollText" },
  { id: "plan", label: "Plan comptable", icon: "listTree" },
  { id: "tiers", label: "Tiers (clients/fourn.)", icon: "contact" },
  { section: "Trésorerie & immo." },
  { id: "tresorerie", label: "Trésorerie", icon: "landmark" },
  { id: "immo", label: "Immobilisations", icon: "warehouse" },
  { section: "Pilotage" },
  { id: "analytique", label: "Analytique (projets)", icon: "pieChart" },
  { id: "budget", label: "Budget", icon: "piggyBank" },
  { id: "capacite", label: "Plan de trésorerie", icon: "gauge" },
  { section: "Achats & stock" },
  { id: "achats", label: "Factures fournisseurs", icon: "receipt" },
  { id: "stock", label: "Stock & entrepôts", icon: "warehouse" },
  { section: "États" },
  { id: "etats", label: "États financiers", icon: "barChart" },
  { id: "tva", label: "TVA & taxes", icon: "receipt" },
  { section: "Système" },
  { id: "parametres", label: "Paramètres", icon: "gauge" },
];
const ITEMS = NAV.filter((n) => n.id);
const TITLES = Object.fromEntries(ITEMS.map((n) => [n.id, n.label]));
const MOB_PRIMARY = ["dashboard", "ecritures", "tresorerie", "etats"];
const MOB_LABEL = { dashboard: "Accueil", ecritures: "Saisie", tresorerie: "Trésor.", etats: "États" };

/* ── Helpers ───────────────────────────────────────────────────────────── */
// Devise résolue depuis la BD (GET /setting + /currency), mise à jour au runtime.
let CUR = "CDF";
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const m = (v) => `${nf.format(Math.round(Number(v || 0)))} ${CUR}`;
const mM = (v) => `${(Number(v || 0) / 1e6).toFixed(1).replace(".", ",")} M ${CUR}`;
const signed = (v) => `${v >= 0 ? "+" : "−"}${nf.format(Math.abs(Math.round(v)))}`;
const initialsOf = (s) => (s || "U").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "U";
const EMPTY_INCOME = { totalRevenue: 0, totalExpense: 0, profit: 0, revenue: [], expense: [], expenses: [] };
const EMPTY_BALANCE = { match: true, totalAsset: 0, totalLiability: 0, totalEquity: 0, assets: [], liabilities: [], equity: [] };
const EMPTY_TRIAL = { match: true, totalDebit: 0, totalCredit: 0, debits: [], credits: [] };
const EMPTY_DATA = {
  transactions: [],
  accounts: [],
  mainAccounts: [],
  trialBalance: EMPTY_TRIAL,
  balanceSheet: EMPTY_BALANCE,
  incomeStatement: EMPTY_INCOME,
};
const asArray = (value, key) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return [];
};
const accountLabel = (a) => a.subAccount || a.name || a.account || "Compte";
const accountType = (a) => a.accountType || a.account?.type || a.type || "—";
const accountText = (a) => `${accountLabel(a)} ${a.account || ""} ${accountType(a)}`.toLowerCase();
const balanceOf = (a) => Number((a.balance ?? (Number(a.totalDebit || 0) - Number(a.totalCredit || 0))) || 0);
const hasAny = (a, words) => words.some((w) => accountText(a).includes(w));
const isTreasuryAccount = (a) => hasAny(a, ["banque", "bank", "caisse", "cash", "trésorerie", "tresorerie"]);
const isReceivableAccount = (a) => hasAny(a, ["client", "customer", "receivable", "locataire", "tenant"]);
const isPayableAccount = (a) => hasAny(a, ["fournisseur", "supplier", "payable", "dette"]);
const isTaxAccount = (a) => hasAny(a, ["tva", "vat", "tax", "dgi"]);
const isFixedAssetAccount = (a) => hasAny(a, ["immobil", "asset", "équipement", "equipement", "matériel", "materiel", "véhicule", "vehicule"]);

// Toast léger.
const DEMO = "Action à connecter au backend.";
function notify(msg) { try { window.dispatchEvent(new CustomEvent("compta:toast", { detail: msg || DEMO })); } catch {} }

// Export CSV réel côté client (pas d'endpoint requis) : rows = tableau d'objets, cols = [[clé,libellé]].
function exportCsv(filename, cols, rows) {
  if (!rows || !rows.length) { notify("Rien à exporter."); return; }
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = cols.map((c) => esc(c[1])).join(",");
  const body = rows.map((r) => cols.map((c) => esc(typeof c[0] === "function" ? c[0](r) : r[c[0]])).join(",")).join("\n");
  const csv = "﻿" + head + "\n" + body; // BOM pour Excel/accents
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* Autocomplete recherchable (remplace les <select> de listes de données).
   options = [{ value, label }]. onChange reçoit la valeur. */
function Autocomplete({ value, onChange, options, placeholder = "—", allowClear = true, style }) {
  const norm = (options || []).map((o) => ({ value: o.value, label: o.label }));
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef(null);
  const selected = norm.find((o) => String(o.value) === String(value));
  const display = open ? query : (selected ? selected.label : "");
  const q = query.trim().toLowerCase();
  const filtered = !open ? norm : (q ? norm.filter((o) => o.label.toLowerCase().includes(q)) : norm);
  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const pick = (o) => { onChange(o.value); setOpen(false); setQuery(""); };
  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input className="ac-input" autoComplete="off" placeholder={placeholder} value={display}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } else if (e.key === "Enter" && filtered.length) { e.preventDefault(); pick(filtered[0]); } }}
        style={{ width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid var(--border-1, #d8d5cc)", fontSize: 13 }} />
      {allowClear && value && !open && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(""); }} aria-label="effacer"
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-500)", padding: 4, lineHeight: 1 }}>
          <Icon name="x" style={{ width: 11, height: 11 }} />
        </button>
      )}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid var(--border-1, #d8d5cc)", borderRadius: 8, boxShadow: "0 8px 24px -8px rgba(14,36,24,0.18)", maxHeight: 240, overflowY: "auto", zIndex: 200 }}>
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-500)" }}>—</div>}
          {filtered.map((o) => (
            <div key={o.value} onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              style={{ padding: "8px 12px", fontSize: 13.5, cursor: "pointer", background: String(o.value) === String(value) ? "var(--bg-sunken, #f4f3ef)" : "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken, #f4f3ef)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = String(o.value) === String(value) ? "var(--bg-sunken, #f4f3ef)" : "transparent")}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Toaster() {
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    let t;
    const on = (e) => { setMsg(e.detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 2600); };
    window.addEventListener("compta:toast", on);
    return () => { window.removeEventListener("compta:toast", on); clearTimeout(t); };
  }, []);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

// Classement produit / charge d'une transaction (comme le CRM).
const txRev = (t) => /revenue|produit|vente|sales|don|subvention|loyer|rental|locatif/i.test(`${t.credit?.name || t.creditAccountName || ""}`);
const txExp = (t) => /charge|expense|salaire|salary|achat|purchase|frais|cost|carburant|maintenance|fourniture/i.test(`${t.debit?.name || t.debitAccountName || ""}`);
const monthKey = (d) => String(d || "").slice(0, 7);

function useIsMobile() {
  const get = () => (typeof window !== "undefined" ? window.innerWidth <= 960 : false);
  const [m, setM] = React.useState(get);
  React.useEffect(() => {
    const on = () => setM(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return m;
}

/* ── Petits composants ─────────────────────────────────────────────────── */
function KPI({ label, value, sub, valueClass = "", icon, tone }) {
  const cls = tone === "warn" ? "warn" : tone === "good" ? "good" : tone === "info" ? "info" : tone === "danger" ? "danger" : "";
  return (
    <div className={`card pad ${cls}`}>
      <div className="kpi-head"><span className="kpi-label">{label}</span>{icon && <Icon name={icon} />}</div>
      <div className={`kpi-value font-display num ${valueClass}`}>{value}</div>
      {sub != null && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
function Mini({ label, value, valueClass = "", tone }) {
  return <div className={`card pad ${tone === "warn" ? "warn" : tone === "danger" ? "danger" : tone === "info" ? "info" : ""}`}><div className="kpi-label">{label}</div><div className={`font-display num ${valueClass}`} style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{value}</div></div>;
}
function PageHead({ eyebrow, title, action, onAction, actionIcon = "plus", disabled, ghost }) {
  return (
    <div className="topbar">
      <div><p className="eyebrow">{eyebrow}</p><h2 className="title font-display">{title}</h2></div>
      {action && <button className={`btn ${ghost ? "btn-ghost" : "btn-accent grad-accent"}`} disabled={disabled} onClick={onAction}><Icon name={actionIcon} /> {action}</button>}
    </div>
  );
}
function Note({ icon = "lightbulb", children }) {
  return <div className="note blue"><Icon name={icon} /> <span>{children}</span></div>;
}
function EmptyState({ title = "Aucune donnée réelle disponible", detail = "Cet écran attend les données du backend.", action, onAction, icon = "info" }) {
  return (
    <div className="card pad" style={{ color: "var(--ink-600)", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="row-ic" style={{ background: "var(--blue-100)", color: "var(--blue-600)" }}><Icon name={icon} /></span>
          <div><div style={{ fontWeight: 700, color: "var(--ink-800)" }}>{title}</div><div className="muted">{detail}</div></div>
        </div>
        {action && <button className="btn btn-ghost" type="button" onClick={onAction}>{action}</button>}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────
   Shell
   ─────────────────────────────────────────────────────────────────────── */
function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <App />;
}

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [data, setData] = React.useState(EMPTY_DATA);
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const [, forceCur] = React.useState(0);
  const load = React.useCallback(() => {
    Promise.allSettled([
      api.ledgerEntries(),
      api.ledgerBalances(),
      api.mainAccounts(),
      api.ledgerTrialBalance(),
      api.ledgerBalanceSheet(),
      api.ledgerIncomeStatement(),
      api.setting(),
      api.currencies(),
    ])
      .then(([entries, balances, ma, tb, bs, is, setting, currencies]) => {
        const txs = asArray(entries.value, "entries");
        const accounts = asArray(balances.value, "balances");
        const mainAccounts = asArray(ma.value, "getAllAccount");
        const curList = currencies.value?.getAllCurrency || (Array.isArray(currencies.value) ? currencies.value : null);
        if (setting.value && curList) { CUR = defaultSymbol(setting.value, curList, CUR); forceCur((n) => n + 1); }
        setData({
          transactions: txs,
          accounts,
          mainAccounts,
          trialBalance: tb.value || EMPTY_TRIAL,
          balanceSheet: bs.value || EMPTY_BALANCE,
          incomeStatement: is.value || EMPTY_INCOME,
        });
        setApiStatus([entries, balances, tb].some((r) => r.status === "fulfilled" && r.value) ? "api" : "local");
      })
      .catch(() => setApiStatus("local"));
  }, []);
  React.useEffect(() => load(), [load]);
  const me = getUser();
  const myInitials = initialsOf(me.name);
  const myRole = me.role || "Comptabilité";

  const canMutate = apiStatus === "api";
  const go = (id) => { setRoute(id); setMoreOpen(false); window.scrollTo(0, 0); };

  async function save(kind, form) {
    setBusy(true); setError("");
    try {
      if (kind === "transaction") await api.createTransaction({
        date: new Date(form.date).toISOString(), debitId: Number(form.debitId), creditId: Number(form.creditId),
        particulars: form.particulars, amount: Number(form.amount), type: form.type || "transaction", relatedId: "0", status: "true",
      });
      if (kind === "account") await api.createAccount({ name: form.name, accountId: Number(form.accountId) });
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  }

  const newEntry = () => setModal({ kind: "transaction" });
  const views = {
    dashboard: <Dashboard is={data.incomeStatement} transactions={data.transactions} go={go} onNew={newEntry} canMutate={canMutate} />,
    journaux: <Journaux transactions={data.transactions} onNew={newEntry} canMutate={canMutate} />,
    ecritures: <Ecritures transactions={data.transactions} onNew={newEntry} canMutate={canMutate} />,
    types: <Types canMutate={canMutate} accounts={data.accounts} />,
    approbations: <Approbations canMutate={canMutate} />,
    grandlivre: <GrandLivre />,
    plan: <Plan accounts={data.accounts} trialBalance={data.trialBalance} incomeStatement={data.incomeStatement} balanceSheet={data.balanceSheet} canMutate={canMutate} onNew={() => setModal({ kind: "account" })} />,
    tiers: <Tiers accounts={data.accounts} />,
    tresorerie: <Tresorerie accounts={data.accounts} />,
    immo: <Immo accounts={data.accounts} />,
    analytique: <Analytique />,
    budget: <Budget />,
    capacite: <Capacite accounts={data.accounts} />,
    achats: <Achats canMutate={canMutate} />,
    stock: <Stock />,
    etats: <Etats is={data.incomeStatement} bs={data.balanceSheet} />,
    tva: <Tva accounts={data.accounts} canMutate={canMutate} />,
    parametres: <Parametres />,
  };

  return (
    <div className="app">
      <aside className="sidebar grad-dark">
        <a className="brand" href="/comptabilite/">
          <span className="brand-icon grad-accent"><Icon name="bookOpenCheck" /></span>
          <span className="brand-title font-display">Compta</span>
        </a>
        <nav className="nav">
          {NAV.map((item, i) => item.section
            ? <div key={`s${i}`} className="nav-section">{item.section}</div>
            : <button key={item.id} className={`navlink ${route === item.id ? "active" : ""}`} onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
        </nav>
        <div className="user-chip">
          <span className="user-avatar grad-accent">{myInitials}</span>
          <div><div className="user-name">{me.name}</div><div className="user-role">{myRole}</div></div>
          <button className="user-logout" title="Se déconnecter" onClick={clearAuth}><Icon name="logout" /></button>
        </div>
      </aside>

      <div className="mob-topbar grad-dark">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="brand-icon grad-accent"><Icon name="bookOpenCheck" /></span>
          <span className="mob-title font-display">{TITLES[route]}</span>
        </div>
        <span className="user-avatar grad-accent">{myInitials}</span>
      </div>

      <main className="main">
        <div className="content">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <span className={`source-pill ${apiStatus}`}>{apiStatus === "api" ? "Données live" : "Démo locale"}</span>
          </div>
          {error && <div className="inline-error">{error}</div>}
          {views[route]}
        </div>
      </main>

      <nav className="mob-nav">
        {MOB_PRIMARY.map((id) => {
          const item = ITEMS.find((x) => x.id === id);
          return <button key={id} className={route === id ? "active" : ""} onClick={() => go(id)}><Icon name={id === "dashboard" ? "home" : item.icon} /><span>{MOB_LABEL[id]}</span></button>;
        })}
        <button className={!MOB_PRIMARY.includes(route) ? "active" : ""} onClick={() => setMoreOpen(true)}><Icon name="menu" /><span>Plus</span></button>
      </nav>

      {moreOpen && (
        <div className="more-sheet">
          <div className="more-scrim" onClick={() => setMoreOpen(false)} />
          <div className="more-panel">
            <div className="more-handle" />
            {NAV.filter((n) => n.section || !MOB_PRIMARY.includes(n.id)).map((item, i) => item.section
              ? <div key={`ms${i}`} className="nav-section">{item.section}</div>
              : <button key={item.id} className="navlink" onClick={() => go(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
          </div>
        </div>
      )}

      {modal && <RecordModal modal={modal} accounts={data.accounts} mainAccounts={data.mainAccounts} busy={busy} error={error} onSave={save} onClose={() => setModal(null)} />}
      <Toaster />
      <AiAssistant />
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
function Parametres() {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(window.location.hostname) ? "dev" : "prod";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE;
  const lastUpdate = buildDate
    ? new Date(buildDate).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}>{v}</span>
    </div>
  );
  return (
    <>
      <PageHead eyebrow="Système" title="Paramètres" />
      <div className="card" style={{ maxWidth: 560, padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>À propos</div>
        <Row k="Version" v={`v${base}`} />
        <Row k="Build" v={build} />
        <Row k="Commit" v={commit} />
        <Row k="Dernière mise à jour" v={lastUpdate} />
        <Row k="Environnement" v={env} />
      </div>
    </>
  );
}

function Dashboard({ is, transactions, go, onNew, canMutate }) {
  const txs = transactions || [];
  const rev = Number(is.totalRevenue || 0) || txs.filter(txRev).reduce((s, t) => s + Number(t.totalCredit || t.amount || 0), 0);
  const exp = Math.abs(Number(is.totalExpenses ?? is.totalExpense ?? 0)) || txs.filter(txExp).reduce((s, t) => s + Number(t.totalDebit || t.amount || 0), 0);
  const profit = Number(is.netIncome ?? is.profit ?? rev - exp);
  const brouillons = txs.filter((t) => /brouillon|draft|false/i.test(`${t.status ?? ""}`)).length;
  const MN = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  // 6 derniers mois calculés depuis les transactions réelles.
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let p = 0, c = 0;
    txs.forEach((t) => { if (monthKey(t.date) === key) { const a = Number(t.amount || 0); if (txRev(t)) p += a; else if (txExp(t)) c += a; } });
    months.push({ label: MN[d.getMonth()], p, c, now: i === 0 });
  }
  const max = Math.max(1, ...months.map((x) => Math.max(x.p, x.c)));
  const hasData = months.some((x) => x.p || x.c);

  return (
    <>
      <PageHead eyebrow={`Exercice ${now.getFullYear()}`} title="Comptabilité" action="Nouvelle écriture" actionIcon="penLine" onAction={onNew} disabled={!canMutate} />
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Produits" value={mM(rev)} sub="dons, loyers, ventes" valueClass="pos" icon="trendingUp" />
        <KPI label="Charges" value={mM(exp)} sub="salaires, terrain, logistique" valueClass="neg" icon="trendingDown" />
        <KPI label="Résultat net" value={`${profit >= 0 ? "+" : "−"}${mM(Math.abs(profit))}`} sub={profit >= 0 ? "excédent" : "déficit"} valueClass={profit >= 0 ? "pos" : "neg"} icon="scale" tone={profit >= 0 ? "good" : "danger"} />
        <KPI label="Écritures" value={txs.length} sub={`${brouillons} brouillon(s)`} icon="penLine" />
      </div>
      <div className="g3">
        <section className="card pad span2">
          <div className="section-head"><h3 className="font-display">Produits vs charges</h3><span className="tiny">6 derniers mois ({CUR})</span></div>
          {hasData ? (
            <div className="barchart">
              {months.map((mo, i) => (
                <div className="col" key={i}>
                  <div className="bars"><i style={{ height: `${Math.round((mo.p / max) * 100)}%`, background: mo.now ? "var(--emerald-500)" : "var(--emerald-400)" }} /><i style={{ height: `${Math.round((mo.c / max) * 100)}%`, background: mo.now ? "var(--rose-400)" : "var(--rose-300)" }} /></div>
                  <span className="tiny" style={mo.now ? { color: "var(--ink-600)", fontWeight: 500 } : undefined}>{mo.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13, padding: "24px 0" }}>Pas encore d'écritures sur la période — le graphique se remplira au fil des saisies.</p>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--emerald-500)" }} /> Produits</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--rose-400)" }} /> Charges</span>
          </div>
        </section>
        <section className="card pad">
          <h3 className="block-title font-display"><Icon name="bell" style={{ color: "var(--rose-500)" }} /> À traiter</h3>
          <Todo icon="penLine" tone="accent" title={`${brouillons} écriture(s) à valider`} sub="brouillons" onClick={() => go("ecritures")} />
          <Todo icon="gitCompare" tone="amber" title="Rapprochement banque" sub="lignes à pointer" onClick={() => go("tresorerie")} />
          <Todo icon="receipt" tone="rose" title="TVA à déclarer" sub="échéance mensuelle" onClick={() => go("tva")} />
        </section>
      </div>
    </>
  );
}
function Todo({ icon, tone, title, sub, onClick }) {
  const bg = { accent: "var(--blue-100)", amber: "var(--amber-100)", rose: "var(--rose-100)", emerald: "var(--emerald-100)" }[tone];
  const fg = { accent: "var(--blue-600)", amber: "var(--amber-600)", rose: "var(--rose-600)", emerald: "var(--emerald-600)" }[tone];
  return (
    <div className="row" style={{ cursor: "pointer", borderBottom: 0, padding: "4px 0", marginBottom: 8 }} onClick={onClick}>
      <span className="row-ic" style={{ background: bg, color: fg, width: 32, height: 32 }}><Icon name={icon} /></span>
      <div style={{ fontSize: 12, flex: 1 }}><div style={{ fontWeight: 500 }}>{title}</div><div className="muted">{sub}</div></div>
      <Icon name="chevronRight" style={{ color: "var(--ink-300)" }} />
    </div>
  );
}

/* ── Journaux ──────────────────────────────────────────────────────────── */
function Journaux({ transactions, onNew, canMutate }) {
  const txs = transactions || [];
  const codeFor = (t) => String(t.type || t.sourceModule || "OD").slice(0, 2).toUpperCase();
  const rows = txs.slice(0, 8).map((t) => ({
    date: String(t.date || "").slice(5).split("-").reverse().join("/"),
    piece: t.reference || `${codeFor(t)}-${String(t.id).padStart(4, "0")}`,
    label: t.particulars,
    debit: Number(t.totalDebit ?? t.amount ?? 0),
    credit: Number(t.totalCredit ?? t.amount ?? 0),
  }));
  const list = rows;
  // Journaux agrégés en temps réel depuis les écritures.
  const JMETA = { CA: { name: "Caisse (CA)", icon: "coins", tone: "accent" }, BQ: { name: "Banque (BQ)", icon: "landmark", tone: "accent" }, VE: { name: "Ventes (VE)", icon: "trendingUp", tone: "emerald" }, AC: { name: "Achats (AC)", icon: "trendingDown", tone: "rose" }, OD: { name: "Opérations diverses (OD)", icon: "shuffle", tone: "ink" } };
  const agg = {};
  txs.forEach((t) => { const k = JMETA[codeFor(t)] ? codeFor(t) : "OD"; (agg[k] = agg[k] || { count: 0, sum: 0 }).count++; agg[k].sum += Number(t.totalDebit ?? t.amount ?? 0); });
  const real = Object.keys(JMETA).filter((k) => agg[k]).map((k) => ({ code: k, ...JMETA[k], count: agg[k].count, sum: agg[k].sum }));
  const cards = real;
  const toneBg = { emerald: "var(--emerald-100)", rose: "var(--rose-100)", ink: "var(--ink-100)" };
  const toneFg = { emerald: "var(--emerald-600)", rose: "var(--rose-600)", ink: "var(--ink-600)" };
  return (
    <>
      <PageHead eyebrow="Saisie" title="Journaux" action="Nouvelle écriture" actionIcon="penLine" onAction={onNew} disabled={!canMutate} />
      {cards.length ? <div className="g3" style={{ marginBottom: 18 }}>
        {cards.map((j) => (
          <div className="card pad" key={j.code}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="row-ic" style={{ width: 32, height: 32, background: toneBg[j.tone] || "var(--blue-100)", color: toneFg[j.tone] || "var(--blue-600)" }}><Icon name={j.icon} /></span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{j.name}</span>
              <span className="chip ink" style={{ marginLeft: "auto" }}>{j.count} mvts</span>
            </div>
            <div className="tiny" style={{ fontSize: 12, color: "var(--ink-500)" }}>Cumul : <b className="num" style={{ color: "var(--ink-800)" }}>{j.valStr || m(j.sum)}</b></div>
          </div>
        ))}
      </div> : <div style={{ marginBottom: 18 }}><EmptyState title="Aucun journal alimenté" detail="Les journaux se rempliront avec les écritures du grand livre." action={canMutate ? "Créer une écriture" : undefined} onAction={onNew} /></div>}
      <div className="card pad table-card">
        <h3 className="block-title font-display">Dernières écritures — Journal de caisse</h3>
        <div className="searchbar"><div className="search-input"><Icon name="search" /> Rechercher un libellé, une pièce…</div></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 560 }}>
            <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th className="r">Débit</th><th className="r">Crédit</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}><td>{r.date}</td><td className="muted">{r.piece}</td><td style={{ fontVariantNumeric: "normal" }}>{r.label}</td><td className="r pos">{r.debit ? nf.format(r.debit) : <span className="muted">—</span>}</td><td className="r neg">{r.credit ? nf.format(r.credit) : <span className="muted">—</span>}</td></tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="muted">Aucune écriture réelle.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Écritures ─────────────────────────────────────────────────────────── */
function Ecritures({ transactions, onNew, canMutate }) {
  const rows = (transactions || []).map((t) => ({
    date: String(t.date || "").slice(5).split("-").reverse().join("/"),
    journal: String(t.type || t.sourceModule || "OD").slice(0, 12),
    label: t.particulars,
    amount: Number(t.totalDebit ?? t.amount ?? 0),
    status: /draft|brouillon|false/i.test(`${t.status ?? ""}`) ? "Brouillon" : "Validée",
  }));
  const list = rows;
  return (
    <>
      <PageHead eyebrow="Saisie en partie double" title="Écritures" action="Nouvelle écriture" actionIcon="penLine" onAction={onNew} disabled={!canMutate} />
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="section-head"><h3 className="font-display">Saisie réelle</h3><span className="chip emerald"><Icon name="check" style={{ width: 11, height: 11 }} /> Contrôle backend</span></div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Les montants affichés ci-dessous proviennent du grand livre. Les exemples de maquette ont été retirés pour éviter toute confusion avec la comptabilité réelle.</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span className="pos" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="checkCircle" style={{ width: 16, height: 16 }} /> Débit = Crédit validé côté API ledger.</span>
          <button className="btn btn-accent grad-accent" style={{ height: 34 }} disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Créer</button>
        </div>
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Liste des écritures</h3><button className="link" onClick={() => exportCsv("ecritures.csv", [["date", "Date"], ["journal", "Journal"], ["label", "Libellé"], ["amount", "Montant"], ["status", "Statut"]], list)}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
        <div className="searchbar">
          <div className="search-input"><Icon name="search" /> Rechercher un libellé, une pièce…</div>
          <select className="select"><option>Tous journaux</option><option>Caisse (CA)</option><option>Banque (BQ)</option><option>Ventes (VE)</option><option>Achats (AC)</option></select>
          <select className="select"><option>Tous statuts</option><option>Validée</option><option>Brouillon</option></select>
        </div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 620 }}>
            <thead><tr><th>Date</th><th>Journal</th><th>Libellé</th><th className="r">Montant</th><th className="r">Statut</th></tr></thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i}><td>{r.date}</td><td><span className="chip ink">{r.journal}</span></td><td style={{ fontVariantNumeric: "normal" }}>{r.label}</td><td className="r">{nf.format(r.amount)}</td><td className="r"><span className={`chip ${r.status === "Brouillon" ? "amber" : "emerald"}`}>{r.status}</span></td></tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="muted">Aucune écriture réelle.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
/* ── Types de transaction ──────────────────────────────────────────────── */
function Types({ canMutate, accounts = [] }) {
  const [types, setTypes] = React.useState(null);
  const [rules, setRules] = React.useState(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // type SIFA en édition (objet) ou null

  const load = React.useCallback(async () => {
    try {
      setError("");
      const [legacy, sifa] = await Promise.all([
        api.transactionTypes().catch(() => []),
        api.typeRules().catch(() => []),
      ]);
      setTypes(Array.isArray(legacy) ? legacy : []);
      setRules(Array.isArray(sifa) ? sifa : []);
    } catch (e) { setError(String(e.message || e)); setTypes([]); setRules([]); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const saveType = async (form) => {
    setBusy(true);
    try { await api.saveType(form); setEditing(null); await load(); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };
  const removeType = async (type) => {
    if (!window.confirm(`Désactiver le type « ${type} » ?`)) return;
    setBusy(true);
    try { await api.deleteType(type); await load(); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead eyebrow="Paramétrage · le cœur du système" title="Types de transaction" action={canMutate ? "Nouveau type (SIFA)" : "Rafraîchir"} actionIcon={canMutate ? "plus" : "download"} onAction={canMutate ? () => setEditing({ type: "", lines: [{ role: "debit", accountId: accounts[0]?.id || "", side: "DEBIT" }, { role: "credit", accountId: accounts[0]?.id || "", side: "CREDIT" }] }) : load} />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}

      {/* Types SIFA modernes (règles multi-lignes paramétrables). */}
      <div className="card pad table-card" style={{ marginBottom: 16 }}>
        <div className="section-head"><h3 className="font-display">Types SIFA (règles multi-lignes) <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({rules ? rules.length : "..."})</span></h3><span className="tiny">Comptes par rôle métier · partie double</span></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 640 }}>
            <thead><tr><th>Type</th><th>Lignes (rôle · compte · sens)</th><th className="r">Action</th></tr></thead>
            <tbody>
              {(rules || []).map((r) => (
                <tr key={r.type}>
                  <td style={{ fontWeight: 500 }}>{r.type}</td>
                  <td className="tiny">{r.lines.map((l) => `${l.role}: ${l.accountName || `#${l.accountId}`} (${l.side})`).join(" · ")}</td>
                  <td className="r">
                    {canMutate ? <span style={{ display: "inline-flex", gap: 6 }}>
                      <button className="btn-sm" disabled={busy} onClick={() => setEditing({ type: r.type, lines: r.lines.map((l) => ({ role: l.role, accountId: l.accountId, side: l.side })) })}>Éditer</button>
                      <button className="btn-sm" disabled={busy} onClick={() => removeType(r.type)}>Suppr.</button>
                    </span> : <span className="muted tiny">lecture seule</span>}
                  </td>
                </tr>
              ))}
              {rules && rules.length === 0 && <tr><td colSpan={3} className="muted">Aucun type SIFA. Cliquez « Nouveau type (SIFA) » pour en créer un (ex. Dépense = Débit charge / Crédit caisse).</td></tr>}
              {rules === null && <tr><td colSpan={3} className="muted">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>Un type SIFA génère des écritures en partie double : chaque ligne nomme un <b>rôle métier</b> (résolu en compte + sens). Les modules comptabilisent en fournissant les montants par rôle.</p>
      </div>

      {/* Types legacy (lecture seule, débit/crédit fixe). */}
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Types legacy <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({types ? types.length : "..."})</span></h3><span className="tiny">débit/crédit fixe · lecture</span></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 680 }}>
            <thead><tr><th>Activité (type)</th><th>Compte débit</th><th>Compte crédit</th><th>Statut</th><th>Description</th></tr></thead>
            <tbody>
              {(types || []).map((t) => (
                <tr key={t.id}><td style={{ fontWeight: 500 }}>{t.name}</td><td>{t.debitAccount?.name || "—"}</td><td>{t.creditAccount?.name || "—"}</td><td><span className={`chip ${t.isActive ? "emerald-soft" : "ink"}`}>{t.isActive ? "actif" : "inactif"}</span></td><td className="muted">{t.description || "—"}</td></tr>
              ))}
              {types && types.length === 0 && <tr><td colSpan={5} className="muted">Aucun type legacy.</td></tr>}
              {types === null && <tr><td colSpan={5} className="muted">Chargement...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <TypeRuleModal initial={editing} accounts={accounts} busy={busy} onSave={saveType} onClose={() => setEditing(null)} />}
    </>
  );
}

/* Modal d'édition d'un type SIFA : nom + N lignes (rôle / compte / sens). */
function TypeRuleModal({ initial, accounts, busy, onSave, onClose }) {
  const [type, setType] = React.useState(initial.type || "");
  const [lines, setLines] = React.useState(initial.lines?.length ? initial.lines : [{ role: "debit", accountId: accounts[0]?.id || "", side: "DEBIT" }]);
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines((ls) => [...ls, { role: "", accountId: accounts[0]?.id || "", side: "DEBIT" }]);
  const delLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));
  const submit = (e) => {
    e.preventDefault();
    if (!type.trim()) return;
    onSave({ type: type.trim(), lines: lines.map((l) => ({ role: l.role, accountId: Number(l.accountId), side: l.side, formula: "amount" })) });
  };
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" style={{ maxWidth: 640 }} onSubmit={submit}>
        <div className="modal-head"><div><h2 className="font-display">{initial.type ? "Modifier le type" : "Nouveau type (SIFA)"}</h2><p>Règles multi-lignes · partie double</p></div><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div style={{ padding: "0 4px" }}>
          <label className="field"><span>Nom du type (identifiant)</span><input value={type} onChange={(e) => setType(e.target.value)} placeholder="ex. farm_expense" required disabled={!!initial.type} /></label>
          <div style={{ marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--ink-600)" }}>Lignes comptables</div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <input style={{ flex: 1 }} placeholder="rôle (ex. cash)" value={l.role} onChange={(e) => setLine(i, "role", e.target.value)} required />
              <Autocomplete style={{ flex: 1.4 }} value={l.accountId} onChange={(v) => setLine(i, "accountId", v)} placeholder="Compte…"
                options={accounts.map((a) => ({ value: a.id, label: accountLabel(a) }))} />
              <select style={{ width: 96 }} value={l.side} onChange={(e) => setLine(i, "side", e.target.value)}>
                <option value="DEBIT">Débit</option><option value="CREDIT">Crédit</option>
              </select>
              {lines.length > 1 && <button type="button" className="icon-btn" onClick={() => delLine(i)}><Icon name="x" /></button>}
            </div>
          ))}
          <button type="button" className="link" onClick={addLine}><Icon name="plus" style={{ width: 13, height: 13 }} /> Ajouter une ligne</button>
          <p className="tiny muted" style={{ marginTop: 8 }}>Au moins un Débit et un Crédit. Le rôle est l'identifiant métier (ex. expense, cash) que les modules fournissent à la saisie.</p>
        </div>
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-accent grad-accent" disabled={busy}>{busy ? "…" : "Enregistrer"}</button></div>
      </form>
    </div>
  );
}

/* ── Grand livre ───────────────────────────────────────────────────────── */
/* ── Approbations (gate de dépense + workflow) ─────────────────────────── */
const MODULE_LABELS = {
  farmos_expense: "Dépense FarmOS",
  payroll: "Paie (HR)",
  purchase: "Facture d'achat",
  maintenance: "Maintenance (immobilier)",
};
function Approbations({ canMutate }) {
  const [pending, setPending] = React.useState(null);
  const [reqs, setReqs] = React.useState([]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError("");
      const [p, r] = await Promise.all([
        api.pendingApprovals().catch(() => []),
        api.approvalRequirements().catch(() => []),
      ]);
      setPending(Array.isArray(p) ? p : []);
      setReqs(Array.isArray(r) ? r : []);
    } catch (e) { setError(String(e.message || e)); setPending([]); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const decide = async (id, action) => {
    const comment = window.prompt(action === "approve" ? "Commentaire d'approbation (optionnel) :" : "Motif du rejet :") ?? "";
    if (action === "reject" && !comment) return;
    setBusy(true);
    try {
      if (action === "approve") await api.approveInstance(id, comment);
      else await api.rejectInstance(id, comment);
      await load();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  // Active/désactive le gate d'approbation d'un module (comptabilisation différée).
  const toggleGate = async (sourceModule, isActive) => {
    if (!window.confirm(isActive
      ? `Activer l'approbation obligatoire pour « ${MODULE_LABELS[sourceModule] || sourceModule} » ? Les écritures seront différées jusqu'à validation.`
      : `Désactiver l'approbation pour « ${MODULE_LABELS[sourceModule] || sourceModule} » ? Les écritures seront comptabilisées directement.`)) return;
    setBusy(true);
    try {
      await api.setApprovalRequirement({ sourceModule, workflowKey: "exp_approval", isActive });
      await load();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  // Vue des 4 modules de dépense connus (état dérivé des requirements ; ignore les gates de test).
  const gateState = Object.keys(MODULE_LABELS).map((mod) => {
    const r = reqs.find((x) => x.sourceModule === mod);
    return { sourceModule: mod, isActive: !!(r && r.isActive) };
  });

  return (
    <>
      <PageHead eyebrow="Gate de comptabilisation" title="Approbations" action="Rafraîchir" actionIcon="bellRing" onAction={load} ghost />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}

      <div className="card pad table-card" style={{ marginBottom: 16 }}>
        <div className="section-head"><h3 className="font-display">Dépenses en attente d'approbation</h3><span className="tiny">{pending ? `${pending.length} en attente` : "Chargement…"}</span></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 640 }}>
            <thead><tr><th>Soumis le</th><th>Module</th><th>Référence</th><th>Étape</th><th className="r">Action</th></tr></thead>
            <tbody>
              {(pending || []).map((i) => (
                <tr key={i.id}>
                  <td>{(i.createdAt || "").slice(0, 10)}</td>
                  <td><span className="chip">{MODULE_LABELS[i.entityType] || i.entityType}</span></td>
                  <td className="muted">#{i.entityId}</td>
                  <td>étape {Number(i.currentStep) + 1}</td>
                  <td className="r">
                    {canMutate ? (
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <button className="btn-sm grad-accent" disabled={busy} onClick={() => decide(i.id, "approve")}>Approuver</button>
                        <button className="btn-sm" disabled={busy} onClick={() => decide(i.id, "reject")}>Rejeter</button>
                      </span>
                    ) : <span className="muted tiny">lecture seule</span>}
                  </td>
                </tr>
              ))}
              {pending && pending.length === 0 && <tr><td colSpan={5} className="muted">Aucune dépense en attente. 🎉</td></tr>}
              {pending === null && <tr><td colSpan={5} className="muted">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Modules sous approbation obligatoire</h3><span className="tiny">Gate de comptabilisation différée</span></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 480 }}>
            <thead><tr><th>Module de dépense</th><th>Statut</th><th className="r">Action</th></tr></thead>
            <tbody>
              {gateState.map((g) => (
                <tr key={g.sourceModule}>
                  <td>{MODULE_LABELS[g.sourceModule]}</td>
                  <td>{g.isActive ? <span className="chip pos">actif</span> : <span className="chip">inactif</span>}</td>
                  <td className="r">
                    {canMutate
                      ? <button className={`btn-sm ${g.isActive ? "" : "grad-accent"}`} disabled={busy} onClick={() => toggleGate(g.sourceModule, !g.isActive)}>{g.isActive ? "Désactiver" : "Activer"}</button>
                      : <span className="muted tiny">lecture seule</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>Gate actif = toute écriture du module est différée (mise en attente) jusqu'à approbation du workflow, puis comptabilisée. Gate inactif = comptabilisation directe.</p>
      </div>
    </>
  );
}

function GrandLivre() {
  const [entries, setEntries] = React.useState(null); // null = chargement
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError("");
      const rows = await api.ledgerEntries();
      setEntries(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(String(e.message || e));
      setEntries([]);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const reverse = async (id) => {
    const reason = window.prompt("Motif de la contre-passation ?");
    if (!reason) return;
    setBusy(true);
    try { await api.reverseEntry(id, reason); await load(); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  // Pas encore d'écriture moderne (ou API indispo) : ne pas afficher de démo comptable.
  if (entries && entries.length === 0) {
    return (
      <>
        <PageHead eyebrow="Détail par compte" title="Grand livre" ghost />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}><b>API grand livre indisponible.</b> <span className="tiny">{error}</span></div>}
        <EmptyState title="Aucune écriture au grand livre" detail="Le journal des écritures affichera uniquement les écritures postées dans `/ledger`." action="Rafraîchir" onAction={load} icon="scrollText" />
      </>
    );
  }

  const fmt = (v) => nf.format(Number(v || 0));
  return (
    <>
      <PageHead eyebrow="Partie double · écritures réelles" title="Grand livre" action="Rafraîchir" actionIcon="download" onAction={load} ghost />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Journal des écritures</h3><span className="tiny">{entries ? `${entries.length} écriture(s)` : "Chargement…"}</span></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 720 }}>
            <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th>Module</th><th className="r">Débit</th><th className="r">Crédit</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {(entries || []).map((e) => (
                <tr key={e.id} style={e.reversalOfId ? { opacity: 0.6 } : undefined}>
                  <td>{(e.date || "").slice(0, 10)}</td>
                  <td className="muted">{e.reference || `#${e.id}`}</td>
                  <td style={{ fontVariantNumeric: "normal" }}>{e.particulars}</td>
                  <td><span className="chip">{e.sourceModule || "—"}</span></td>
                  <td className="r pos">{fmt(e.totalDebit)}</td>
                  <td className="r neg">{fmt(e.totalCredit)}</td>
                  <td>{e.reversalOfId ? <span className="chip">contre-passation</span> : e.reversedById ? <span className="chip">contre-passée</span> : <span className="chip pos">{e.status}</span>}</td>
                  <td className="r">{!e.reversalOfId && !e.reversedById && <button className="navlink" disabled={busy} onClick={() => reverse(e.id)} title="Contre-passer"><Icon name="gitCompare" /></button>}</td>
                </tr>
              ))}
              {entries === null && <tr><td colSpan={8} className="muted">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Plan comptable ────────────────────────────────────────────────────── */
function Plan({ accounts, trialBalance, incomeStatement, balanceSheet, canMutate, onNew }) {
  const totalAssets = Number(balanceSheet?.totalAssets ?? balanceSheet?.totalAsset ?? 0);
  const totalLiabilities = Number(balanceSheet?.totalLiabilities ?? balanceSheet?.totalLiability ?? 0);
  const totalRevenue = Number(incomeStatement?.totalRevenue ?? 0);
  const totalExpenses = Number(incomeStatement?.totalExpenses ?? incomeStatement?.totalExpense ?? 0);
  return (
    <>
      <PageHead eyebrow="SYSCOHADA · OHADA" title="Plan comptable" action="Nouveau compte" onAction={onNew} disabled={!canMutate} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Actif" value={mM(totalAssets)} /><Mini label="Passif" value={mM(totalLiabilities)} />
        <Mini label="Produits (cumul)" value={mM(totalRevenue)} valueClass="pos" /><Mini label="Charges (cumul)" value={mM(totalExpenses)} valueClass="neg" />
      </div>
      <div className="card pad table-card">
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 560 }}>
            <thead><tr><th>Compte</th><th>Intitulé</th><th>Type</th><th className="r">Solde</th></tr></thead>
            <tbody>
              {(accounts || []).map((a) => (
                <tr key={a.id}><td style={{ fontWeight: 500 }}>{a.code || a.id}</td><td style={{ fontVariantNumeric: "normal" }}>{accountLabel(a)}</td><td><span className="chip ink">{accountType(a)}</span></td><td className={`r ${Number(a.balance || 0) >= 0 ? "pos" : "neg"}`}>{nf.format(Number(a.balance || 0))}</td></tr>
              ))}
              {(!accounts || accounts.length === 0) && <tr><td colSpan={4} className="muted">Aucun sous-compte réel disponible.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={2}>Balance</td><td className="r">{trialBalance?.match ? "équilibrée" : "à vérifier"}</td><td className="r">{nf.format(Number(trialBalance?.totalDebit || 0))} / {nf.format(Number(trialBalance?.totalCredit || 0))}</td></tr></tfoot>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10 }}>{accounts?.length || 0} sous-compte(s) connectés à l'API.</p>
      </div>
    </>
  );
}

/* ── Tiers ─────────────────────────────────────────────────────────────── */
function Tiers({ accounts = [] }) {
  const receivables = accounts.filter(isReceivableAccount);
  const payables = accounts.filter(isPayableAccount);
  const rows = [...receivables.map((a) => ({ ...a, family: "Créance" })), ...payables.map((a) => ({ ...a, family: "Dette" }))];
  const totalReceivable = receivables.reduce((s, a) => s + Math.max(0, balanceOf(a)), 0);
  const totalPayable = payables.reduce((s, a) => s + Math.abs(Math.min(0, balanceOf(a))), 0);
  if (rows.length) {
    return (
      <>
        <PageHead eyebrow="Comptes auxiliaires" title="Tiers — clients & fournisseurs" />
        <div className="g4 kpis" style={{ marginBottom: 18 }}>
          <Mini label="Créances clients" value={m(totalReceivable)} valueClass="pos" />
          <Mini label="Dettes fournisseurs" value={m(totalPayable)} valueClass="neg" />
          <Mini label="Comptes clients" value={receivables.length} />
          <Mini label="Comptes fournisseurs" value={payables.length} />
        </div>
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Soldes auxiliaires</h3><span className="tiny">Depuis le ledger</span></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 620 }}>
              <thead><tr><th>Compte</th><th>Famille</th><th>Type</th><th className="r">Solde</th></tr></thead>
              <tbody>{rows.map((a) => <tr key={`${a.family}-${a.id}`}><td style={{ fontWeight: 500 }}>{accountLabel(a)}</td><td><span className="chip ink">{a.family}</span></td><td>{accountType(a)}</td><td className={`r ${balanceOf(a) >= 0 ? "pos" : "neg"}`}>{m(balanceOf(a))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="Comptes auxiliaires" title="Tiers — clients & fournisseurs" />
      <EmptyState title="Aucun compte tiers mouvementé" detail="Connecté au grand livre : les créances (clients) et dettes (fournisseurs) s'afficheront dès qu'un sous-compte de tiers aura des écritures." icon="contact" />
    </>
  );
}

/* ── Trésorerie ────────────────────────────────────────────────────────── */
function Tresorerie({ accounts = [] }) {
  const rows = accounts.filter(isTreasuryAccount);
  const total = rows.reduce((s, a) => s + balanceOf(a), 0);
  if (rows.length) {
    return (
      <>
        <PageHead eyebrow="Caisse & banques" title="Trésorerie" />
        <div className="g3" style={{ marginBottom: 18 }}>
          <Mini label="Solde trésorerie" value={m(total)} valueClass={total >= 0 ? "pos" : "neg"} />
          <Mini label="Comptes suivis" value={rows.length} />
          <Mini label="Source" value="Ledger" tone="info" />
        </div>
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Soldes banque & caisse</h3><span className="tiny">Depuis le ledger</span></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Compte</th><th>Type</th><th className="r">Débit</th><th className="r">Crédit</th><th className="r">Solde</th></tr></thead>
              <tbody>{rows.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{accountLabel(a)}</td><td>{accountType(a)}</td><td className="r pos">{nf.format(Number(a.totalDebit || 0))}</td><td className="r neg">{nf.format(Number(a.totalCredit || 0))}</td><td className={`r ${balanceOf(a) >= 0 ? "pos" : "neg"}`}>{m(balanceOf(a))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="Caisse & banques" title="Trésorerie" />
      <EmptyState title="Aucun compte de trésorerie mouvementé" detail="Connecté au grand livre : les soldes banque/caisse s'afficheront dès qu'un sous-compte de trésorerie (Cash, Bank…) aura des écritures." icon="landmark" />
    </>
  );
}

/* ── Immobilisations ───────────────────────────────────────────────────── */
function Immo({ accounts = [] }) {
  const rows = accounts.filter((a) => accountType(a) === "Asset" && isFixedAssetAccount(a) && !isTreasuryAccount(a));
  const total = rows.reduce((s, a) => s + balanceOf(a), 0);
  if (rows.length) {
    return (
      <>
        <PageHead eyebrow="Registre & amortissements" title="Immobilisations" />
        <div className="g3" style={{ marginBottom: 18 }}>
          <Mini label="Valeur nette comptable" value={m(total)} tone="info" />
          <Mini label="Comptes immo." value={rows.length} />
          <Mini label="Source" value="Ledger" />
        </div>
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Soldes immobilisations</h3><span className="tiny">Depuis le ledger</span></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Compte</th><th>Type</th><th className="r">Solde</th></tr></thead>
              <tbody>{rows.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{accountLabel(a)}</td><td>{accountType(a)}</td><td className={`r ${balanceOf(a) >= 0 ? "pos" : "neg"}`}>{m(balanceOf(a))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="Registre & amortissements" title="Immobilisations" />
      <EmptyState title="Aucune immobilisation au grand livre" detail="Connecté au grand livre : les comptes d'actif immobilisé s'afficheront dès qu'un sous-compte d'immobilisation aura des écritures (le registre détaillé amortissements viendra d'un module dédié)." icon="warehouse" />
    </>
  );
}

/* ── Analytique (projets / financeurs) ─────────────────────────────────── */
function Analytique() {
  const [projects, setProjects] = React.useState(null);
  const [reports, setReports] = React.useState({}); // id -> rapport
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError("");
      const list = await api.projects();
      const arr = Array.isArray(list) ? list : [];
      setProjects(arr);
      const entries = await Promise.all(arr.map(async (p) => {
        try { return [p.id, await api.projectReport(p.id)]; } catch { return [p.id, null]; }
      }));
      setReports(Object.fromEntries(entries));
    } catch (e) { setError(String(e.message || e)); setProjects([]); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const newProject = () => setShowNew(true);
  const submitProject = async (form) => {
    const budgetAmount = form.budget ? Number(String(form.budget).replace(/\s/g, "")) : undefined;
    setBusy(true);
    try {
      await api.createProject({ name: form.name, donor: form.donor || undefined, budgetAmount });
      setShowNew(false);
      await load();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };
  const projectModal = showNew && (
    <FormModal
      title="Nouveau projet"
      subtitle="Axe analytique / financeur"
      submitLabel="Créer le projet"
      busy={busy}
      onClose={() => setShowNew(false)}
      onSubmit={submitProject}
      fields={[
        { key: "name", label: "Nom du projet", required: true },
        { key: "donor", label: "Financeur (optionnel)" },
        { key: "budget", label: "Budget (optionnel)", type: "number" },
      ]}
    />
  );

  // Aucun projet réel (ou API indispo) : ne pas afficher de fausses consommations.
  if (projects && projects.length === 0) {
    return (
      <>
        <PageHead eyebrow="Suivi par projet / financeur" title="Comptabilité analytique" action="Nouveau projet" onAction={newProject} disabled={busy} />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}><b>API projets indisponible.</b> <span className="tiny">{error}</span></div>}
        <EmptyState title="Aucun projet analytique" detail="Les rapports financeurs s'afficheront après création de projets et écritures portant un project_id." action="Nouveau projet" onAction={newProject} icon="pieChart" />
        {projectModal}
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Suivi par projet / financeur · live grand livre" title="Comptabilité analytique" action="Nouveau projet" onAction={newProject} disabled={busy} />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}
      {projects === null && <div className="card pad muted">Chargement…</div>}
      <div className="g3" style={{ marginBottom: 18 }}>
        {(projects || []).map((p) => {
          const r = reports[p.id];
          const pct = r && r.consumptionPct != null ? r.consumptionPct : 0;
          const warn = pct >= 90;
          return (
            <div className={`card pad ${warn ? "warn" : ""}`} key={p.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>{r && r.consumptionPct != null && <span className={`chip ${warn ? "" : "emerald"}`} style={warn ? { background: "var(--rose-50)", color: "var(--rose-600)" } : undefined}>{pct} %</span>}</div>
              <div className="tiny" style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 8 }}>Financeur : {p.donor || "—"}</div>
              {r && r.budget ? <div className="bar"><span style={{ width: `${Math.min(100, pct)}%`, background: warn ? "var(--rose-500)" : undefined }} /></div> : null}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }} className="tiny num"><span>Dépensé {nf.format(r ? r.totalExpenses : 0)}</span><span>Budget {r && r.budget ? nf.format(r.budget) : "—"}</span></div>
            </div>
          );
        })}
      </div>
      <div className="card pad table-card tbl-scroll">
        <h3 className="block-title font-display">Produits & charges par projet</h3>
        <table className="tbl num" style={{ minWidth: 560 }}>
          <thead><tr><th>Projet (financeur)</th><th className="r">Produits</th><th className="r">Charges</th><th className="r">Solde</th></tr></thead>
          <tbody>
            {(projects || []).map((p) => {
              const r = reports[p.id];
              const prod = r ? r.totalRevenue : 0, charge = r ? r.totalExpenses : 0, solde = r ? r.net : 0;
              return <tr key={p.id}><td style={{ fontWeight: 500 }}>{p.name}{p.donor ? <span className="muted"> · {p.donor}</span> : null}</td><td className="r pos">{prod ? nf.format(prod) : <span className="muted">—</span>}</td><td className="r neg">{nf.format(charge)}</td><td className="r" style={{ fontWeight: 600, color: solde < 0 ? "var(--rose-600)" : undefined }}>{signed(solde)}</td></tr>;
            })}
          </tbody>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Chiffres calculés depuis le grand livre (écritures portant le project_id) → rapport financeur en temps réel.</p>
      </div>
      {projectModal}
    </>
  );
}

/* ── Budget ────────────────────────────────────────────────────────────── */
function Budget() {
  const [budgets, setBudgets] = React.useState(null);
  const [statuses, setStatuses] = React.useState({}); // id -> status live
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const list = await api.budgets();
        const arr = Array.isArray(list) ? list : [];
        setBudgets(arr);
        const entries = await Promise.all(arr.map(async (b) => {
          try { return [b.id, await api.budgetStatus(b.id)]; } catch { return [b.id, null]; }
        }));
        setStatuses(Object.fromEntries(entries));
      } catch (e) { setError(String(e.message || e)); setBudgets([]); }
    })();
  }, []);

  // Pas de budget réel (ou API indispo) : ne pas afficher de fausses lignes.
  if (budgets && budgets.length === 0) {
    return (
      <>
        <PageHead eyebrow="Suivi budgétaire" title="Budget vs réalisé" />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}><b>API budget indisponible.</b> <span className="tiny">{error}</span></div>}
        <EmptyState title="Aucun budget réel" detail="Le suivi budgétaire utilise `/budget/:id/status-ledger` et s'affichera après création d'un budget avec lignes." icon="piggyBank" />
      </>
    );
  }

  const fmt = (v) => nf.format(Number(v || 0));
  return (
    <>
      <PageHead eyebrow="Suivi budgétaire · live grand livre" title="Budget vs réalisé" />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}
      {budgets === null && <div className="card pad muted">Chargement…</div>}
      {(budgets || []).map((b) => {
        const st = statuses[b.id];
        const lines = (st && st.lines) || [];
        return (
          <div className="card pad" key={b.id} style={{ marginBottom: 16 }}>
            <div className="section-head"><h3 className="font-display">{b.name}</h3><span className="tiny">{b.fiscalYear || b.period || ""}</span></div>
            {lines.length === 0 && <p className="muted tiny">Aucune ligne budgétaire.</p>}
            {lines.map((l, i) => {
              const allocated = Number(l.allocated ?? l.allocatedAmount ?? l.planned ?? l.plannedAmount ?? 0);
              const consumed = Number(l.consumed ?? l.consumedAmount ?? 0);
              const pct = allocated > 0 ? Math.min(100, Math.round((consumed / allocated) * 100)) : 0;
              const warn = pct >= 90;
              return (
                <div key={i} style={{ marginBottom: 16, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{l.label || l.name || `Ligne ${i + 1}`}</span>
                    <span className="num" style={warn ? { color: "var(--rose-600)" } : { color: "var(--ink-500)" }}>{fmt(consumed)} / {fmt(allocated)} {CUR} · {pct}%</span>
                  </div>
                  <div className="bar"><span style={{ width: `${pct}%`, background: warn ? "var(--rose-500)" : undefined }} /></div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/* ── Plan de trésorerie & capacité ─────────────────────────────────────── */
function Capacite({ accounts = [] }) {
  const [budgets, setBudgets] = React.useState(null);
  const [statuses, setStatuses] = React.useState({});

  React.useEffect(() => {
    (async () => {
      try {
        const list = await api.budgets();
        const arr = Array.isArray(list) ? list : [];
        setBudgets(arr);
        const entries = await Promise.all(arr.map(async (b) => {
          try { return [b.id, await api.budgetStatus(b.id)]; } catch { return [b.id, null]; }
        }));
        setStatuses(Object.fromEntries(entries));
      } catch { setBudgets([]); }
    })();
  }, []);

  const treasury = accounts.filter(isTreasuryAccount);
  const cash = treasury.reduce((s, a) => s + balanceOf(a), 0);
  const payables = accounts.filter(isPayableAccount).reduce((s, a) => s + Math.abs(Math.min(0, balanceOf(a))), 0);
  const receivables = accounts.filter(isReceivableAccount).reduce((s, a) => s + Math.max(0, balanceOf(a)), 0);
  // Reste à engager sur budgets = somme des (alloué − consommé) encore disponibles.
  const remainingBudget = Object.values(statuses).reduce((s, st) => {
    if (!st || !Array.isArray(st.lines)) return s;
    return s + st.lines.reduce((acc, l) => acc + Math.max(0, Number(l.allocated || 0) - Number(l.consumed || 0)), 0);
  }, 0);
  const netNow = cash - payables;           // disponible immédiat
  const netProjected = cash + receivables - payables; // après encaissement créances

  if (!treasury.length && !payables && !receivables) {
    return (
      <>
        <PageHead eyebrow="Disponibilité financière" title="Plan de trésorerie & capacité" />
        <EmptyState title="Capacité non calculable" detail="Aucun compte de trésorerie, dette ou créance n'existe encore dans le grand livre." icon="gauge" />
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Disponibilité financière · depuis le grand livre" title="Plan de trésorerie & capacité" />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Trésorerie (banque + caisse)" value={m(cash)} valueClass={cash >= 0 ? "pos" : "neg"} />
        <Mini label="Dettes fournisseurs" value={m(payables)} valueClass="neg" />
        <Mini label="Créances à encaisser" value={m(receivables)} valueClass="pos" />
        <Mini label={netNow >= 0 ? "Disponible immédiat" : "Découvert"} value={m(Math.abs(netNow))} tone={netNow >= 0 ? "info" : "warn"} />
      </div>
      <div className="card pad" style={{ maxWidth: 680, marginBottom: 18 }}>
        <h3 className="block-title font-display">Capacité financière</h3>
        <div className="stmt num">
          <div className="ln"><span className="muted">Trésorerie disponible</span><span className={cash >= 0 ? "pos" : "neg"}>{nf.format(cash)}</span></div>
          <div className="ln"><span className="muted">− Dettes fournisseurs</span><span className="neg">{nf.format(payables)}</span></div>
          <div className="ln bold"><span>= Disponible immédiat</span><span className={netNow >= 0 ? "pos" : "neg"}>{nf.format(netNow)}</span></div>
          <div className="ln"><span className="muted">+ Créances à encaisser</span><span className="pos">{nf.format(receivables)}</span></div>
          <div className="ln total" style={{ background: netProjected >= 0 ? "var(--emerald-50)" : "var(--rose-50)" }}>
            <span style={{ color: netProjected >= 0 ? "var(--emerald-800)" : "var(--rose-600)" }}>Disponible projeté</span>
            <span className={netProjected >= 0 ? "pos" : "neg"}>{signed(netProjected)} {CUR}</span>
          </div>
        </div>
      </div>
      {budgets && budgets.length > 0 && (
        <div className="card pad">
          <div className="section-head"><h3 className="font-display">Engagements budgétaires restants</h3><span className="tiny">Reste à engager</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }} className="num">
            <span className="muted">Budget encore disponible (toutes lignes)</span>
            <span className={remainingBudget > netNow ? "neg" : "pos"}>{m(remainingBudget)}</span>
          </div>
          {remainingBudget > netNow && (
            <div className="tiny" style={{ color: "var(--rose-600)", marginTop: 6 }}>
              ⚠ Les engagements budgétaires restants ({m(remainingBudget)}) dépassent le disponible immédiat ({m(netNow)}).
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── Achats / Factures fournisseurs ────────────────────────────────────── */
function Achats({ canMutate }) {
  const [rows, setRows] = React.useState(null);
  const [info, setInfo] = React.useState(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError("");
      const [list, agg] = await Promise.all([
        api.purchaseInvoices().catch(() => []),
        api.purchaseInvoicesInfo().catch(() => null),
      ]);
      // findAll renvoie { data, total } ou un tableau selon la version : on normalise.
      const arr = Array.isArray(list) ? list : (list?.data || list?.rows || []);
      setRows(Array.isArray(arr) ? arr : []);
      setInfo(agg && agg._sum ? agg : null);
    } catch (e) { setError(String(e.message || e)); setRows([]); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    const comment = window.prompt("Commentaire d'approbation (optionnel) :") ?? "";
    setBusy(true);
    try { await api.approvePurchaseInvoice(id, comment); await load(); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const totalAmount = info?._sum?.totalAmount ?? (rows || []).reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  const totalDue = info?._sum?.dueAmount ?? (rows || []).reduce((s, r) => s + Number(r.dueAmount || 0), 0);
  const totalPaid = info?._sum?.paidAmount ?? (rows || []).reduce((s, r) => s + Number(r.paidAmount || 0), 0);

  return (
    <>
      <PageHead eyebrow="Comptes fournisseurs · gate purchase" title="Factures fournisseurs" action="Rafraîchir" actionIcon="bellRing" onAction={load} ghost />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Factures" value={(rows || []).length} />
        <Mini label="Total facturé" value={m(totalAmount)} />
        <Mini label="Payé" value={m(totalPaid)} valueClass="pos" />
        <Mini label="Reste dû" value={m(totalDue)} valueClass={Number(totalDue) > 0 ? "neg" : "pos"} />
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Liste des factures d'achat</h3><span className="tiny">{rows ? `${rows.length} facture(s)` : "Chargement…"}</span></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 720 }}>
            <thead><tr><th>Date</th><th>Pièce</th><th>Fournisseur</th><th className="r">Total</th><th className="r">Reste dû</th><th className="r">Action</th></tr></thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r.id}>
                  <td>{String(r.date || "").slice(0, 10)}</td>
                  <td className="muted">{r.invoiceMemoNo || `#${r.id}`}</td>
                  <td style={{ fontWeight: 500 }}>{r.supplierName || `Fournisseur #${r.supplierId}`}</td>
                  <td className="r">{nf.format(Number(r.totalAmount || 0))}</td>
                  <td className={`r ${Number(r.dueAmount) > 0 ? "neg" : "pos"}`}>{nf.format(Number(r.dueAmount || 0))}</td>
                  <td className="r">
                    {canMutate
                      ? <button className="btn-sm grad-accent" disabled={busy} onClick={() => approve(r.id)}>Approuver</button>
                      : <span className="muted tiny">lecture seule</span>}
                  </td>
                </tr>
              ))}
              {rows && rows.length === 0 && <tr><td colSpan={6} className="muted">Aucune facture d'achat. Connecté à <code>/purchase-invoice</code>.</td></tr>}
              {rows === null && <tr><td colSpan={6} className="muted">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>Module gaté (sourceModule « purchase ») : l'approbation déclenche la comptabilisation de l'écriture différée via le workflow.</p>
      </div>
    </>
  );
}

/* ── Stock & entrepôts ─────────────────────────────────────────────────── */
const ORDER_STATUS_FR = { draft: "Brouillon", ordered: "Commandé", received: "Reçu", cancelled: "Annulé" };
function Stock() {
  const [warehouses, setWarehouses] = React.useState(null);
  const [stockByWh, setStockByWh] = React.useState({});
  const [orders, setOrders] = React.useState(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError("");
      const [whs, ords] = await Promise.all([
        api.warehouses(),
        api.purchaseOrders().catch(() => []),
      ]);
      const arr = Array.isArray(whs) ? whs : (whs?.data || []);
      setWarehouses(arr);
      setOrders(Array.isArray(ords) ? ords : (ords?.data || []));
      const entries = await Promise.all(arr.map(async (w) => {
        try { return [w.id, await api.warehouseStock(w.id)]; } catch { return [w.id, []]; }
      }));
      setStockByWh(Object.fromEntries(entries));
    } catch (e) { setError(String(e.message || e)); setWarehouses([]); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  // Réception : récupère les lignes restant à recevoir et appelle receiveOrder.
  const receive = async (orderId) => {
    setBusy(true);
    try {
      const detail = await api.purchaseOrder(orderId);
      const order = detail.order || detail;
      const lines = (detail.lines || []).map((l) => ({
        productId: l.productId,
        purchaseOrderLineId: l.id,
        quantity: Math.max(0, Number(l.quantity || 0) - Number(l.receivedQuantity || 0)),
        unitCost: Number(l.unitPrice || 0),
      })).filter((l) => l.quantity > 0);
      if (!lines.length) { notify("Rien à recevoir (déjà tout reçu)."); return; }
      await api.receiveOrder(orderId, { warehouseId: order.warehouseId, lines });
      await load();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  if (warehouses && warehouses.length === 0 && (!orders || orders.length === 0)) {
    return (
      <>
        <PageHead eyebrow="Inventaire · procurement" title="Stock & entrepôts" action="Rafraîchir" actionIcon="bellRing" onAction={load} ghost />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}
        <EmptyState title="Aucun entrepôt ni commande" detail="Connecté à /procurement : les entrepôts, niveaux de stock et bons de commande s'afficheront après création." icon="warehouse" />
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Inventaire · procurement" title="Stock & entrepôts" action="Rafraîchir" actionIcon="bellRing" onAction={load} ghost />
      {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}>{error}</div>}

      {orders && orders.length > 0 && (
        <div className="card pad table-card" style={{ marginBottom: 16 }}>
          <div className="section-head"><h3 className="font-display">Bons de commande</h3><span className="tiny">{orders.length} commande(s)</span></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Réf.</th><th>Fournisseur</th><th>Statut</th><th className="r">Total</th><th className="r">Action</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="muted">{o.reference || `PO-${o.id}`}</td>
                    <td>{o.supplierName || (o.supplierId ? `Fournisseur #${o.supplierId}` : "—")}</td>
                    <td><span className={`chip ${o.status === "received" ? "pos" : o.status === "cancelled" ? "" : "ink"}`}>{ORDER_STATUS_FR[o.status] || o.status}</span></td>
                    <td className="r">{nf.format(Number(o.totalAmount || 0))}</td>
                    <td className="r">
                      {o.status !== "received" && o.status !== "cancelled"
                        ? <button className="btn-sm grad-accent" disabled={busy} onClick={() => receive(o.id)}>Recevoir</button>
                        : <span className="muted tiny">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>Recevoir une commande crée les mouvements de stock et incrémente les quantités en entrepôt.</p>
        </div>
      )}

      {warehouses === null && <div className="card pad muted">Chargement…</div>}
      {(warehouses || []).map((w) => {
        const stock = stockByWh[w.id] || [];
        return (
          <div className="card pad table-card" key={w.id} style={{ marginBottom: 16 }}>
            <div className="section-head"><h3 className="font-display">{w.name}{w.code ? ` · ${w.code}` : ""}</h3><span className="tiny">{stock.length} référence(s)</span></div>
            <div className="tbl-scroll">
              <table className="tbl num" style={{ minWidth: 480 }}>
                <thead><tr><th>Article</th><th className="r">Quantité</th><th>Unité</th></tr></thead>
                <tbody>
                  {stock.map((s, i) => (
                    <tr key={s.id || i}><td style={{ fontWeight: 500 }}>{s.itemName || s.name || s.productName || `Article #${s.itemId || s.id}`}</td><td className="r">{nf.format(Number(s.quantity ?? s.qty ?? 0))}</td><td>{s.unit || "—"}</td></tr>
                  ))}
                  {stock.length === 0 && <tr><td colSpan={3} className="muted">Aucun mouvement de stock.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── États financiers ──────────────────────────────────────────────────── */
function Etats({ is, bs }) {
  const [tab, setTab] = React.useState("resultat");
  const tabs = [["resultat", "Compte de résultat"], ["bilan", "Bilan"], ["balance", "Balance"], ["flux", "Flux de trésorerie"]];
  // États réels depuis le grand livre moderne.
  const [liveIs, setLiveIs] = React.useState(null);
  const [liveBs, setLiveBs] = React.useState(null);
  const [liveTb, setLiveTb] = React.useState(null);
  React.useEffect(() => {
    api.ledgerIncomeStatement().then(setLiveIs).catch(() => setLiveIs(null));
    api.ledgerBalanceSheet().then(setLiveBs).catch(() => setLiveBs(null));
    api.ledgerTrialBalance().then(setLiveTb).catch(() => setLiveTb(null));
  }, []);
  const hasLiveIs = liveIs && (liveIs.revenue?.length || liveIs.expenses?.length);
  const hasLiveBs = liveBs && (liveBs.assets?.length || liveBs.liabilities?.length || liveBs.equity?.length);
  const hasLiveTb = liveTb && ((liveTb.debits?.length || 0) + (liveTb.credits?.length || 0) > 0);

  const rev = hasLiveIs ? Number(liveIs.totalRevenue) : 0;
  const exp = hasLiveIs ? Number(liveIs.totalExpenses) : 0;
  const profit = hasLiveIs ? Number(liveIs.netIncome) : 0;

  // Export CSV de l'onglet courant (depuis le grand livre).
  const exportCurrent = () => {
    if (tab === "resultat" && hasLiveIs) {
      const rows = [
        ...liveIs.revenue.map((r) => ({ poste: r.subAccount || r.account, sens: "Produit", montant: r.amount })),
        ...liveIs.expenses.map((r) => ({ poste: r.subAccount || r.account, sens: "Charge", montant: r.amount })),
        { poste: "Résultat net", sens: profit >= 0 ? "Excédent" : "Déficit", montant: profit },
      ];
      exportCsv("compte-resultat.csv", [["poste", "Poste"], ["sens", "Sens"], ["montant", "Montant"]], rows);
    } else if (tab === "bilan" && hasLiveBs) {
      const rows = [
        ...(liveBs.assets || []).map((r) => ({ poste: r.subAccount || r.account, classe: "Actif", montant: r.amount })),
        ...(liveBs.liabilities || []).map((r) => ({ poste: r.subAccount || r.account, classe: "Passif", montant: r.amount })),
        ...(liveBs.equity || []).map((r) => ({ poste: r.subAccount || r.account, classe: "Capitaux", montant: r.amount })),
      ];
      exportCsv("bilan.csv", [["poste", "Poste"], ["classe", "Classe"], ["montant", "Montant"]], rows);
    } else if (tab === "balance" && hasLiveTb) {
      exportCsv("balance.csv", [["account", "Compte"], ["debit", "Solde débit"], ["credit", "Solde crédit"]],
        [...(liveTb.debits || []).map((r) => ({ account: r.subAccount || r.account, debit: r.balance, credit: "" })),
         ...(liveTb.credits || []).map((r) => ({ account: r.subAccount || r.account, debit: "", credit: Math.abs(r.balance) }))]);
    } else { notify("Rien à exporter sur cet onglet."); }
  };
  return (
    <>
      <PageHead eyebrow="Depuis le grand livre" title="États financiers" action="Exporter (CSV)" actionIcon="download" onAction={exportCurrent} ghost />
      <div className="segtabs">{tabs.map(([id, lbl]) => <button key={id} className={`segtab ${tab === id ? "active grad-accent" : ""}`} onClick={() => setTab(id)}>{lbl}</button>)}</div>

      {tab === "resultat" && (
        hasLiveIs ? <div className="card pad" style={{ maxWidth: 680 }}>
          <h3 className="block-title font-display">Compte de résultat</h3>
          <div className="stmt num">
            {liveIs.revenue.map((r) => <div className="ln" key={`r${r.id}`}><span className="muted">{r.subAccount || r.account}</span><span className="pos">{nf.format(r.amount)}</span></div>)}
            <div className="ln bold"><span>Total produits</span><span className="pos">{nf.format(rev)}</span></div>
            {liveIs.expenses.map((r) => <div className="ln" key={`e${r.id}`} style={{ marginTop: 0 }}><span className="muted">{r.subAccount || r.account}</span><span className="neg">{nf.format(r.amount)}</span></div>)}
            <div className="ln bold"><span>Total charges</span><span className="neg">{nf.format(exp)}</span></div>
            <div className="ln total" style={{ background: profit >= 0 ? "var(--emerald-50)" : "var(--rose-50)" }}><span style={{ color: profit >= 0 ? "var(--emerald-800)" : "var(--rose-600)" }}>Résultat ({profit >= 0 ? "excédent" : "déficit"})</span><span className={profit >= 0 ? "pos" : "neg"}>{signed(profit)} {CUR}</span></div>
          </div>
        </div> : <EmptyState title="Compte de résultat vide" detail="Aucune ligne produit/charge réelle n'est disponible dans le grand livre." icon="barChart" />
      )}

      {tab === "bilan" && (
        hasLiveBs ? <div className="card pad" style={{ maxWidth: 820 }}>
          <h3 className="block-title font-display">Bilan</h3>
          <div className="g2">
            <div>
              <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Actif</div>
              <div className="stmt num">
                {liveBs.assets.map((r) => <div className="ln" key={`a${r.id}`}><span className="muted">{r.subAccount || r.account}</span><span>{nf.format(r.amount)}</span></div>)}
                <div className="ln total" style={{ background: "var(--blue-50)" }}><span style={{ color: "var(--blue-800)" }}>Total Actif</span><span>{nf.format(liveBs.totalAssets)} {CUR}</span></div>
              </div>
            </div>
            <div>
              <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Passif + Capitaux propres</div>
              <div className="stmt num">
                {[...liveBs.liabilities.map((r) => <div className="ln" key={`l${r.id}`}><span className="muted">{r.subAccount || r.account}</span><span>{nf.format(r.amount)}</span></div>),
                  ...liveBs.equity.map((r) => <div className="ln" key={`eq${r.id}`}><span className="muted">{r.subAccount || r.account}</span><span>{nf.format(r.amount)}</span></div>),
                  <div className="ln" key="netinc"><span className="muted">Résultat de l'exercice</span><span className={liveBs.netIncome >= 0 ? "pos" : "neg"}>{nf.format(liveBs.netIncome)}</span></div>]}
                <div className="ln total" style={{ background: "var(--blue-50)" }}><span style={{ color: "var(--blue-800)" }}>Total Passif + CP</span><span>{nf.format(liveBs.totalLiabilitiesAndEquity)} {CUR}</span></div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {liveBs.balanced
              ? <span className="chip emerald"><Icon name="check" style={{ width: 11, height: 11 }} /> Bilan équilibré · Actif = Passif + CP</span>
              : <span className="chip" style={{ background: "var(--rose-50)", color: "var(--rose-600)" }}>Écart de bilan à vérifier</span>}
          </div>
        </div> : <EmptyState title="Bilan vide" detail="Aucune ligne bilan réelle n'est disponible dans le grand livre." icon="scale" />
      )}

      {tab === "balance" && (
        hasLiveTb ? <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Balance générale</h3><button className="link" onClick={() => exportCsv("balance.csv", [["account", "Compte"], ["debit", "Solde débit"], ["credit", "Solde crédit"]], [...(liveTb.debits || []).map((r) => ({ account: r.subAccount || r.account, debit: r.balance, credit: "" })), ...(liveTb.credits || []).map((r) => ({ account: r.subAccount || r.account, debit: "", credit: Math.abs(r.balance) }))])}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Compte</th><th>Intitulé</th><th className="r">Solde débit</th><th className="r">Solde crédit</th></tr></thead>
              <tbody>
                {[...(liveTb.debits || []).map((r) => ({ ...r, debit: r.balance, credit: null })), ...(liveTb.credits || []).map((r) => ({ ...r, debit: null, credit: Math.abs(r.balance) }))].map((r) => (
                  <tr key={r.id}><td style={{ fontWeight: 500 }}>{r.id}</td><td style={{ fontVariantNumeric: "normal" }}>{r.subAccount || r.account}</td><td className="r">{r.debit ? nf.format(r.debit) : <span className="muted">—</span>}</td><td className="r">{r.credit ? nf.format(r.credit) : <span className="muted">—</span>}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>Totaux</td><td className="r">{nf.format(Number(liveTb.totalDebit || 0))}</td><td className="r">{nf.format(Math.abs(Number(liveTb.totalCredit || 0)))}</td></tr></tfoot>
            </table>
          </div>
          <div style={{ marginTop: 12 }}><span className={`chip ${liveTb.match ? "emerald" : "amber"}`}><Icon name={liveTb.match ? "check" : "alertTriangle"} style={{ width: 11, height: 11 }} /> {liveTb.match ? "Balance équilibrée" : "Balance à vérifier"}</span></div>
        </div> : <EmptyState title="Balance générale vide" detail="Aucun solde réel n'est disponible dans `/ledger/trial-balance`." icon="barChart" />
      )}

      {tab === "flux" && (() => {
        // Flux de trésorerie (méthode indirecte simplifiée) à partir d'éléments réels :
        // résultat net (compte de résultat) + position de trésorerie (bilan).
        const treasury = hasLiveBs ? (liveBs.assets || []).filter((a) => /banque|bank|caisse|cash|trésor|tresor/i.test(a.subAccount || a.account || "")) : [];
        const cashPos = treasury.reduce((s, a) => s + Number(a.amount || 0), 0);
        if (!hasLiveIs && !treasury.length) {
          return <EmptyState title="Flux de trésorerie indisponible" detail="Aucun résultat ni compte de trésorerie réel dans le grand livre pour construire le tableau des flux." icon="wallet" />;
        }
        return (
          <div className="card pad" style={{ maxWidth: 680 }}>
            <h3 className="block-title font-display">Flux de trésorerie (méthode indirecte)</h3>
            <div className="stmt num">
              <div className="ln bold"><span>Activités opérationnelles</span><span /></div>
              <div className="ln"><span className="muted">Résultat net de l'exercice</span><span className={profit >= 0 ? "pos" : "neg"}>{nf.format(profit)}</span></div>
              <div className="ln bold" style={{ marginTop: 10 }}><span>Position de trésorerie</span><span /></div>
              {treasury.length
                ? treasury.map((a, i) => <div className="ln" key={i}><span className="muted">{a.subAccount || a.account}</span><span className={Number(a.amount) >= 0 ? "pos" : "neg"}>{nf.format(Number(a.amount || 0))}</span></div>)
                : <div className="ln"><span className="muted">Aucun compte de trésorerie</span><span className="muted">—</span></div>}
              <div className="ln total" style={{ background: cashPos >= 0 ? "var(--emerald-50)" : "var(--rose-50)" }}>
                <span style={{ color: cashPos >= 0 ? "var(--emerald-800)" : "var(--rose-600)" }}>Trésorerie de clôture</span>
                <span className={cashPos >= 0 ? "pos" : "neg"}>{signed(cashPos)} {CUR}</span>
              </div>
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>Méthode indirecte simplifiée : résultat net + position de trésorerie du bilan. La variation période-à-période nécessitera un historique daté.</p>
          </div>
        );
      })()}
    </>
  );
}

/* ── TVA ───────────────────────────────────────────────────────────────── */
function Tva({ accounts = [], canMutate = true }) {
  const rows = accounts.filter(isTaxAccount);
  const deductible = rows.reduce((s, a) => s + Math.max(0, balanceOf(a)), 0);
  const collected = rows.reduce((s, a) => s + Math.abs(Math.min(0, balanceOf(a))), 0);
  const net = collected - deductible;

  // Taux de taxe paramétrables (réutilise l'API product-vat existante).
  const [rates, setRates] = React.useState(null);
  const [showNew, setShowNew] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const loadRates = React.useCallback(async () => {
    try { const r = await api.taxRates(); setRates(Array.isArray(r) ? r : (r?.data || [])); }
    catch (e) { setError(String(e.message || e)); setRates([]); }
  }, []);
  React.useEffect(() => { loadRates(); }, [loadRates]);
  const createRate = async (form) => {
    setBusy(true);
    try { await api.createTaxRate({ title: form.title, percentage: Number(form.percentage) }); setShowNew(false); await loadRates(); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const ratesPanel = (
    <>
      <div className="card pad table-card" style={{ marginBottom: 16 }}>
        <div className="section-head"><h3 className="font-display">Taux de taxe</h3>{canMutate && <button className="btn-sm grad-accent" onClick={() => setShowNew(true)}>+ Nouveau taux</button>}</div>
        {error && <div className="tiny" style={{ color: "var(--rose-600)", marginBottom: 8 }}>{error}</div>}
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 360 }}>
            <thead><tr><th>Libellé</th><th className="r">Taux</th><th>Statut</th></tr></thead>
            <tbody>
              {(rates || []).map((t) => (
                <tr key={t.id}><td style={{ fontWeight: 500 }}>{t.title}</td><td className="r">{Number(t.percentage)} %</td><td><span className={`chip ${String(t.status) === "true" ? "emerald-soft" : "ink"}`}>{String(t.status) === "true" ? "actif" : "inactif"}</span></td></tr>
              ))}
              {rates && rates.length === 0 && <tr><td colSpan={3} className="muted">Aucun taux. Créez-en un (ex. TVA 16 %).</td></tr>}
              {rates === null && <tr><td colSpan={3} className="muted">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showNew && <FormModal title="Nouveau taux de taxe" subtitle="TVA / autre taxe" submitLabel="Créer le taux" busy={busy}
        onClose={() => setShowNew(false)} onSubmit={createRate}
        fields={[{ key: "title", label: "Libellé (ex. TVA 16%)", required: true }, { key: "percentage", label: "Taux (%)", type: "number", required: true }]} />}
    </>
  );

  if (rows.length) {
    return (
      <>
        <PageHead eyebrow="Déclaration fiscale" title="TVA & taxes" />
        {ratesPanel}
        <div className="g3" style={{ marginBottom: 18 }}>
          <Mini label="TVA collectée" value={m(collected)} valueClass="pos" />
          <Mini label="TVA déductible" value={m(deductible)} valueClass="neg" />
          <Mini label={net >= 0 ? "TVA à payer" : "Crédit TVA"} value={m(Math.abs(net))} tone={net >= 0 ? "warn" : "info"} />
        </div>
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Soldes fiscaux</h3><span className="tiny">Depuis le ledger</span></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Compte</th><th>Type</th><th className="r">Solde</th></tr></thead>
              <tbody>{rows.map((a) => <tr key={a.id}><td style={{ fontWeight: 500 }}>{accountLabel(a)}</td><td>{accountType(a)}</td><td className={`r ${balanceOf(a) >= 0 ? "pos" : "neg"}`}>{m(balanceOf(a))}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHead eyebrow="Déclaration fiscale" title="TVA & taxes" />
      {ratesPanel}
      <EmptyState title="Aucun compte de taxe mouvementé" detail="Connecté au grand livre : les soldes TVA collectée/déductible s'afficheront dès qu'un sous-compte de taxe aura des écritures. Les taux ci-dessus servent à paramétrer la taxe." icon="receipt" />
    </>
  );
}

/* ── Modal création (écriture / compte) ────────────────────────────────── */
function RecordModal({ modal, accounts, mainAccounts, busy, error, onSave, onClose }) {
  const [form, setForm] = React.useState(() => defaults(modal.kind, accounts, mainAccounts));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(modal.kind, form); }}>
        <div className="modal-head"><div><h2 className="font-display">{modal.kind === "account" ? "Nouveau compte" : "Nouvelle écriture"}</h2><p>Compta NgoluApp</p></div><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="form-grid">
          {modal.kind === "transaction" && (
            <>
              <FField label="Date" type="date" value={form.date} onChange={(v) => set("date", v)} required />
              <FField label="Libellé" value={form.particulars} onChange={(v) => set("particulars", v)} required />
              <FSelect label="Débit" value={form.debitId} onChange={(v) => set("debitId", v)} rows={accounts} />
              <FSelect label="Crédit" value={form.creditId} onChange={(v) => set("creditId", v)} rows={accounts} />
              <FField label={`Montant (${CUR})`} type="number" value={form.amount} onChange={(v) => set("amount", v)} required />
              <FField label="Type / journal" value={form.type} onChange={(v) => set("type", v)} />
            </>
          )}
          {modal.kind === "account" && (
            <>
              <FField label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
              <FSelect label="Compte principal" value={form.accountId} onChange={(v) => set("accountId", v)} rows={mainAccounts} />
            </>
          )}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-accent grad-accent" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button></div>
      </form>
    </div>
  );
}
function FField({ label, value, onChange, type = "text", required = false }) {
  return <label className="field"><span>{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
function FSelect({ label, value, onChange, rows }) {
  return <label className="field"><span>{label}</span>
    <Autocomplete value={value} onChange={onChange} placeholder="Rechercher un compte…"
      options={(rows || []).map((r) => ({ value: r.id, label: accountLabel(r) }))} />
  </label>;
}

/* Modal générique (remplace window.prompt) : titre + champs configurables. */
function FormModal({ title, subtitle, fields, submitLabel = "Enregistrer", busy, onSubmit, onClose }) {
  const [form, setForm] = React.useState(() => Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""])));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (fields.some((f) => f.required && !String(form[f.key] ?? "").trim())) return;
    onSubmit(form);
  };
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head"><div><h2 className="font-display">{title}</h2><p>{subtitle || "Compta NgoluApp"}</p></div><button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button></div>
        <div className="form-grid">
          {fields.map((f) => f.type === "textarea"
            ? <label className="field" key={f.key} style={{ gridColumn: "1 / -1" }}><span>{f.label}</span><textarea rows={3} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required} /></label>
            : <FField key={f.key} label={f.label} type={f.type || "text"} value={form[f.key]} onChange={(v) => set(f.key, v)} required={f.required} />)}
        </div>
        <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-accent grad-accent" disabled={busy}>{busy ? "…" : submitLabel}</button></div>
      </form>
    </div>
  );
}
function defaults(kind, accounts, mainAccounts) {
  if (kind === "account") return { name: "", accountId: mainAccounts[0]?.id || 1 };
  return { date: new Date().toISOString().slice(0, 10), particulars: "", debitId: accounts[0]?.id || 1, creditId: accounts[1]?.id || accounts[0]?.id || 2, amount: 0, type: "transaction" };
}

export default AppShell;
