import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth, getUser } from "./auth.jsx";
import { AiAssistant } from "./aiAssistant.jsx";
import { defaultSymbol } from "./currency.js";
import {
  fallback, journaux as fbJournaux, journalCaisse, ecritures as fbEcritures, planComptable,
  types as fbTypes, grandLivreAccounts, grandLivre as fbGrandLivre, tresorerieComptes, tresorerieMvts,
  tva as fbTva, tiers as fbTiers, immobilisations as fbImmo, analytiqueCards, analytiqueRows,
  budgetLines, cashflowPlan, resultat as fbResultat, bilan as fbBilan, balanceGenerale, flux as fbFlux
} from "./data.js";

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
const dash = (v) => (v ? nf.format(v) : "—");
const initialsOf = (s) => (s || "U").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "U";

// Toast léger — fait répondre tous les boutons sans endpoint dédié.
const DEMO = "Action de démonstration — à connecter au backend.";
function notify(msg) { try { window.dispatchEvent(new CustomEvent("compta:toast", { detail: msg || DEMO })); } catch {} }
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
  const [data, setData] = React.useState({ ...fallback });
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const [, forceCur] = React.useState(0);
  const load = React.useCallback(() => {
    Promise.allSettled([api.transactions(), api.accounts(), api.mainAccounts(), api.trialBalance(), api.balanceSheet(), api.incomeStatement(), api.setting(), api.currencies()])
      .then(([tx, acc, ma, tb, bs, is, setting, currencies]) => {
        const txs = tx.value?.getAllTransaction || (Array.isArray(tx.value) ? tx.value : null);
        const curList = currencies.value?.getAllCurrency || (Array.isArray(currencies.value) ? currencies.value : null);
        if (setting.value && curList) { CUR = defaultSymbol(setting.value, curList, CUR); forceCur((n) => n + 1); }
        setData({
          transactions: txs?.length ? txs : fallback.transactions,
          accounts: Array.isArray(acc.value) && acc.value.length ? acc.value : fallback.accounts,
          mainAccounts: Array.isArray(ma.value) && ma.value.length ? ma.value : fallback.mainAccounts,
          trialBalance: tb.value || fallback.trialBalance,
          balanceSheet: bs.value || fallback.balanceSheet,
          incomeStatement: is.value || fallback.incomeStatement,
        });
        setApiStatus([tx, acc, tb].some((r) => r.status === "fulfilled" && r.value) ? "api" : "local");
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
    types: <Types />,
    approbations: <Approbations canMutate={canMutate} />,
    grandlivre: <GrandLivre />,
    plan: <Plan accounts={data.accounts} canMutate={canMutate} onNew={() => setModal({ kind: "account" })} />,
    tiers: <Tiers />,
    tresorerie: <Tresorerie />,
    immo: <Immo />,
    analytique: <Analytique />,
    budget: <Budget />,
    capacite: <Capacite />,
    etats: <Etats is={data.incomeStatement} bs={data.balanceSheet} />,
    tva: <Tva />,
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
  const rev = Number(is.totalRevenue || 0) || txs.filter(txRev).reduce((s, t) => s + Number(t.amount || 0), 0);
  const exp = Math.abs(Number(is.totalExpense || 0)) || txs.filter(txExp).reduce((s, t) => s + Number(t.amount || 0), 0);
  const profit = Number(is.profit ?? rev - exp);
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
  const entree = (t) => ["CA", "BQ", "VE", "BU"].includes(t);
  const rows = txs.slice(0, 8).map((t) => ({
    date: String(t.date || "").slice(5).split("-").reverse().join("/"),
    piece: t.type ? `${t.type}-${String(t.id).padStart(4, "0")}` : "—",
    label: t.particulars, debit: entree(t.type) ? t.amount : null, credit: entree(t.type) ? null : t.amount,
  }));
  const list = rows.length ? rows : journalCaisse;
  // Journaux agrégés en temps réel depuis les écritures.
  const JMETA = { CA: { name: "Caisse (CA)", icon: "coins", tone: "accent" }, BQ: { name: "Banque (BQ)", icon: "landmark", tone: "accent" }, VE: { name: "Ventes (VE)", icon: "trendingUp", tone: "emerald" }, AC: { name: "Achats (AC)", icon: "trendingDown", tone: "rose" }, OD: { name: "Opérations diverses (OD)", icon: "shuffle", tone: "ink" } };
  const agg = {};
  txs.forEach((t) => { const k = JMETA[t.type] ? t.type : "OD"; (agg[k] = agg[k] || { count: 0, sum: 0 }).count++; agg[k].sum += Number(t.amount || 0); });
  const real = Object.keys(JMETA).filter((k) => agg[k]).map((k) => ({ code: k, ...JMETA[k], count: agg[k].count, sum: agg[k].sum }));
  const cards = real.length ? real : fbJournaux.map((j) => ({ code: j.code, name: j.name, icon: j.icon, tone: j.tone, count: j.mvts, valStr: j.val }));
  const toneBg = { emerald: "var(--emerald-100)", rose: "var(--rose-100)", ink: "var(--ink-100)" };
  const toneFg = { emerald: "var(--emerald-600)", rose: "var(--rose-600)", ink: "var(--ink-600)" };
  return (
    <>
      <PageHead eyebrow="Saisie" title="Journaux" action="Nouvelle écriture" actionIcon="penLine" onAction={onNew} disabled={!canMutate} />
      <div className="g3" style={{ marginBottom: 18 }}>
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
      </div>
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
    journal: t.type || "OD", label: t.particulars, amount: t.amount, status: t.status === "Brouillon" ? "Brouillon" : "Validée",
  }));
  const list = rows.length ? rows : fbEcritures;
  return (
    <>
      <PageHead eyebrow="Saisie en partie double" title="Écritures" action="Nouvelle écriture" actionIcon="penLine" onAction={onNew} disabled={!canMutate} />
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="section-head"><h3 className="font-display">Nouvelle écriture</h3><span className="chip emerald"><Icon name="check" style={{ width: 11, height: 11 }} /> Équilibrée</span></div>
        <div className="g3" style={{ marginBottom: 12 }}>
          <Field label="Date" value="05/06/2026" /><Field label="Journal" value="Caisse (CA)" /><Field label="Pièce" value="CA-0143" muted />
        </div>
        <Field label="Libellé" value="Encaissement loyer juin — Joseph Mwepu" block />
        <div className="tbl-scroll" style={{ marginTop: 12 }}>
          <table className="tbl num" style={{ minWidth: 560 }}>
            <thead><tr><th>Compte</th><th>Libellé</th><th className="r">Débit</th><th className="r">Crédit</th></tr></thead>
            <tbody>
              <tr><td><span className="chip accent-soft">521 · Caisse</span></td><td className="muted" style={{ fontVariantNumeric: "normal" }}>Encaissement loyer</td><td className="r pos">620 000</td><td className="r muted">—</td></tr>
              <tr><td><span className="chip emerald-soft">706 · Produits locatifs</span></td><td className="muted" style={{ fontVariantNumeric: "normal" }}>Loyer juin LEASE-018</td><td className="r muted">—</td><td className="r neg">620 000</td></tr>
            </tbody>
            <tfoot><tr><td colSpan={2}>Totaux</td><td className="r">620 000</td><td className="r">620 000</td></tr></tfoot>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span className="pos" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="checkCircle" style={{ width: 16, height: 16 }} /> Débit = Crédit · l'écriture peut être enregistrée</span>
          <div style={{ display: "flex", gap: 8 }}><button type="button" className="btn btn-ghost" style={{ height: 34 }} onClick={() => notify("Brouillon enregistré (démo).")}>Brouillon</button><button className="btn btn-accent grad-accent" style={{ height: 34 }} disabled={!canMutate} onClick={onNew}><Icon name="check" /> Enregistrer</button></div>
        </div>
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Liste des écritures</h3><button className="link" onClick={() => notify()}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
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
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function Field({ label, value, muted, block }) {
  return (
    <label style={{ display: "block", fontSize: 12, marginBottom: block ? 0 : undefined }}>
      <span className="muted">{label}</span>
      <div style={{ marginTop: 4, height: 38, borderRadius: 10, border: "1px solid var(--ink-200)", background: "#fff", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 13, color: muted ? "var(--ink-400)" : "var(--ink-800)" }}>{value}</div>
    </label>
  );
}

/* ── Types de transaction ──────────────────────────────────────────────── */
function Types() {
  return (
    <>
      <PageHead eyebrow="Paramétrage · le cœur du système" title="Types de transaction" action="Nouveau type" onAction={() => notify()} />
      <Note>Toute activité de l'entreprise est saisie via un <b>type de transaction</b>. Chaque type pré‑remplit automatiquement les comptes (débit/crédit), le journal et l'imputation analytique — loyers, dons, ventes, achats, salaires…</Note>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Types configurés <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({fbTypes.length} activités)</span></h3></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 680 }}>
            <thead><tr><th>Activité (type)</th><th>Sens</th><th>Compte débit</th><th>Compte crédit</th><th>Journal</th><th>Analytique</th></tr></thead>
            <tbody>
              {fbTypes.map((t, i) => (
                <tr key={i}><td style={{ fontWeight: 500 }}>{t.name}</td><td><span className={`chip ${t.sens === "Entrée" ? "emerald-soft" : "rose-soft"}`}>{t.sens}</span></td><td>{t.debit}</td><td>{t.credit}</td><td>{t.journal}</td><td className="muted">{t.ana}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> À la saisie, choisir le type suffit : l'écriture équilibrée est générée. Idéal pour les opérateurs non‑comptables (caisse, terrain).</p>
      </div>
    </>
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
        <div className="section-head"><h3 className="font-display">Modules sous approbation obligatoire</h3></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 420 }}>
            <thead><tr><th>Module</th><th>Statut</th></tr></thead>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.id}><td>{MODULE_LABELS[r.sourceModule] || r.sourceModule}</td><td>{r.isActive ? <span className="chip pos">actif</span> : <span className="chip">inactif</span>}</td></tr>
              ))}
              {reqs.length === 0 && <tr><td colSpan={2} className="muted">Aucun gate configuré.</td></tr>}
            </tbody>
          </table>
        </div>
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
      setEntries([]); // bascule sur le fallback local
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

  // Pas encore d'écriture moderne (ou API indispo) → on garde l'aperçu local existant.
  if (entries && entries.length === 0) {
    return (
      <>
        <PageHead eyebrow="Détail par compte" title="Grand livre" ghost />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}><b>API grand livre indisponible.</b> <span className="tiny">{error}</span></div>}
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Aperçu (données de démonstration)</h3></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 640 }}>
              <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th className="r">Débit</th><th className="r">Crédit</th><th className="r">Solde</th></tr></thead>
              <tbody>
                {fbGrandLivre.map((r, i) => r.report
                  ? <tr key={i} className="grp"><td colSpan={5}>{r.label}</td><td className="r">{nf.format(r.solde)}</td></tr>
                  : <tr key={i}><td>{r.date}</td><td className="muted">{r.piece}</td><td style={{ fontVariantNumeric: "normal" }}>{r.label}</td><td className="r pos">{r.debit ? nf.format(r.debit) : <span className="muted">—</span>}</td><td className="r neg">{r.credit ? nf.format(r.credit) : <span className="muted">—</span>}</td><td className="r">{nf.format(r.solde)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
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
function Plan({ accounts, canMutate, onNew }) {
  return (
    <>
      <PageHead eyebrow="SYSCOHADA · OHADA" title="Plan comptable" action="Nouveau compte" onAction={onNew} disabled={!canMutate} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Actif" value={`62,4 M ${CUR}`} /><Mini label="Passif" value={`21,2 M ${CUR}`} />
        <Mini label="Produits (cumul)" value={`134 M ${CUR}`} valueClass="pos" /><Mini label="Charges (cumul)" value={`98 M ${CUR}`} valueClass="neg" />
      </div>
      <div className="card pad table-card">
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 560 }}>
            <thead><tr><th>Compte</th><th>Intitulé</th><th>Type</th><th className="r">Solde</th></tr></thead>
            <tbody>
              {planComptable.map((g) => (
                <React.Fragment key={g.grp}>
                  <tr className="grp"><td colSpan={4}>{g.grp}</td></tr>
                  {g.rows.map((r) => (
                    <tr key={r.num}><td style={{ fontWeight: 500 }}>{r.num}</td><td style={{ fontVariantNumeric: "normal" }}>{r.name}</td><td><span className={`chip ${r.chip}`}>{r.type}</span></td><td className={`r ${r.pos ? "pos" : ""}`}>{r.solde}</td></tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {accounts?.length > 4 && <p className="tiny" style={{ marginTop: 10 }}>{accounts.length} sous-comptes connectés à l'API.</p>}
      </div>
    </>
  );
}

/* ── Tiers ─────────────────────────────────────────────────────────────── */
function Tiers() {
  const sum = (k) => fbTiers.reduce((s, r) => s + (r[k] || 0), 0);
  return (
    <>
      <PageHead eyebrow="Comptes auxiliaires" title="Tiers — clients & fournisseurs" action="Relancer les impayés" actionIcon="bellRing" onAction={() => notify()} />
      <div className="g4 kpis" style={{ marginBottom: 18 }}>
        <Mini label="Créances clients" value="2 150 000" valueClass="pos" />
        <Mini label="Dont échu" value="640 000" tone="danger" valueClass="neg" />
        <Mini label="Dettes fournisseurs" value="3 400 000" valueClass="neg" />
        <Mini label="À payer < 30 j" value="1 900 000" />
      </div>
      <div className="card pad table-card">
        <h3 className="block-title font-display">Balance âgée — clients</h3>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 640 }}>
            <thead><tr><th>Tiers</th><th className="r">Total dû</th><th className="r">Non échu</th><th className="r">0–30 j</th><th className="r">30–60 j</th><th className="r">+60 j</th></tr></thead>
            <tbody>
              {fbTiers.map((t, i) => (
                <tr key={i}><td style={{ fontWeight: 500 }}>{t.name}</td><td className="r">{nf.format(t.total)}</td><td className="r">{dash(t.nonEchu)}</td><td className="r" style={t.d30 ? { color: "var(--amber-600)" } : undefined}>{dash(t.d30)}</td><td className="r" style={t.d60 ? { color: "var(--amber-600)" } : undefined}>{dash(t.d60)}</td><td className="r" style={t.plus60 ? { color: "var(--rose-600)" } : undefined}>{dash(t.plus60)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total</td><td className="r">{nf.format(sum("total"))}</td><td className="r">{nf.format(sum("nonEchu"))}</td><td className="r">{nf.format(sum("d30"))}</td><td className="r">{nf.format(sum("d60"))}</td><td className="r neg">{nf.format(sum("plus60"))}</td></tr></tfoot>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Le <b>lettrage</b> rapproche chaque facture de son paiement ; les soldes +60 j sont signalés pour relance.</p>
      </div>
    </>
  );
}

/* ── Trésorerie ────────────────────────────────────────────────────────── */
function Tresorerie() {
  return (
    <>
      <PageHead eyebrow="Caisse & banques" title="Trésorerie" action="Rapprocher" actionIcon="gitCompare" onAction={() => notify()} />
      <div className="g3" style={{ marginBottom: 18 }}>
        {tresorerieComptes.map((c) => (
          <div className="card pad" key={c.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span className="row-ic" style={{ background: c.subTone === "emerald" ? "var(--emerald-100)" : "var(--blue-100)", color: c.subTone === "emerald" ? "var(--emerald-600)" : "var(--blue-600)" }}><Icon name={c.icon} /></span><span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span></div>
            <div className="font-display num" style={{ fontSize: 24, fontWeight: 700 }}>{c.val}</div>
            <div className="tiny" style={c.subTone === "amber" ? { color: "var(--amber-600)" } : c.subTone === "emerald" ? { color: "var(--emerald-600)" } : undefined}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="card pad table-card">
        <div className="section-head"><h3 className="font-display">Mouvements — Banque FC</h3><span className="chip amber">3 non pointés</span></div>
        <div className="searchbar"><div className="search-input"><Icon name="search" /> Rechercher un mouvement…</div></div>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 600 }}>
            <thead><tr><th>Date</th><th>Libellé</th><th className="r">Entrée</th><th className="r">Sortie</th><th className="r">Pointé</th></tr></thead>
            <tbody>
              {tresorerieMvts.map((m, i) => (
                <tr key={i} style={!m.pointe ? { background: "rgba(255,251,235,.6)" } : undefined}><td>{m.date}</td><td style={{ fontVariantNumeric: "normal" }}>{m.label}</td><td className="r pos">{m.entree ? nf.format(m.entree) : <span className="muted">—</span>}</td><td className="r neg">{m.sortie ? nf.format(m.sortie) : <span className="muted">—</span>}</td><td className="r"><Icon name={m.pointe ? "checkCircle" : "circle"} style={{ width: 16, height: 16, color: m.pointe ? "var(--emerald-500)" : "var(--amber-400)", display: "inline" }} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Immobilisations ───────────────────────────────────────────────────── */
function Immo() {
  const sum = (k) => fbImmo.reduce((s, r) => s + r[k], 0);
  return (
    <>
      <PageHead eyebrow="Registre & amortissements" title="Immobilisations" action="Nouveau bien" onAction={() => notify()} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <Mini label="Valeur brute" value="41 700 000" /><Mini label="Amort. cumulés" value="23 000 000" valueClass="neg" />
        <Mini label="Valeur nette (VNC)" value="18 700 000" valueClass="" tone="info" />
      </div>
      <div className="card pad table-card tbl-scroll">
        <table className="tbl num" style={{ minWidth: 680 }}>
          <thead><tr><th>Bien</th><th>Acquis</th><th className="r">Valeur brute</th><th>Durée</th><th className="r">Dotation/an</th><th className="r">Amort. cumulé</th><th className="r">VNC</th></tr></thead>
          <tbody>
            {fbImmo.map((b, i) => (
              <tr key={i}><td style={{ fontWeight: 500 }}>{b.name}</td><td>{b.an}</td><td className="r">{nf.format(b.brute)}</td><td>{b.duree}</td><td className="r">{nf.format(b.dot)}</td><td className="r neg">{nf.format(b.amort)}</td><td className="r" style={{ fontWeight: 600 }}>{nf.format(b.vnc)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={2}>Total</td><td className="r">{nf.format(sum("brute"))}</td><td></td><td className="r">{nf.format(sum("dot"))}</td><td className="r">{nf.format(sum("amort"))}</td><td className="r">{nf.format(sum("vnc"))}</td></tr></tfoot>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Dotation d'amortissement passée automatiquement chaque mois (compte 681 → 28x).</p>
      </div>
    </>
  );
}

/* ── Analytique ────────────────────────────────────────────────────────── */
function Analytique() {
  return (
    <>
      <PageHead eyebrow="Suivi par projet / bailleur" title="Comptabilité analytique" action="Rapport bailleur" actionIcon="download" onAction={() => notify()} ghost />
      <div className="g3" style={{ marginBottom: 18 }}>
        {analytiqueCards.map((c) => (
          <div className={`card pad ${c.warn ? "warn" : ""}`} key={c.name}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span><span className={`chip ${c.chip}`}>{c.pct} %</span></div>
            <div className="tiny" style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 8 }}>Bailleur : {c.bailleur}</div>
            <div className="bar"><span className={c.grad === "amber" ? "" : c.grad} style={{ width: `${c.pct}%`, background: c.grad === "amber" ? "var(--amber-500)" : undefined }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }} className="tiny num"><span>Dépensé {c.depense}</span><span>Budget {c.budget}</span></div>
          </div>
        ))}
      </div>
      <div className="card pad table-card tbl-scroll">
        <h3 className="block-title font-display">Produits & charges par axe analytique</h3>
        <table className="tbl num" style={{ minWidth: 560 }}>
          <thead><tr><th>Axe (projet / bailleur)</th><th className="r">Produits</th><th className="r">Charges</th><th className="r">Solde</th></tr></thead>
          <tbody>
            {analytiqueRows.map((r, i) => (
              <tr key={i}><td style={{ fontWeight: 500 }}>{r.axe}</td><td className="r pos">{dash(r.prod)}</td><td className="r neg">{nf.format(r.charge)}</td><td className="r" style={{ fontWeight: 600, color: r.solde < 0 ? "var(--rose-600)" : undefined }}>{signed(r.solde)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Chaque écriture porte un axe analytique (via le type de transaction) → reporting par bailleur/projet en un clic.</p>
      </div>
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

  // Pas de budget réel (ou API indispo) → aperçu de démonstration existant.
  if (budgets && budgets.length === 0) {
    return (
      <>
        <PageHead eyebrow="Suivi budgétaire" title="Budget vs réalisé" />
        {error && <div className="card pad" style={{ marginBottom: 12, color: "var(--rose-600)" }}><b>API budget indisponible.</b> <span className="tiny">{error}</span></div>}
        <div className="g4 kpis" style={{ marginBottom: 18 }}>
          <Mini label="Budget total" value="160 000 000" /><Mini label="Réalisé" value="98 000 000" tone="info" />
          <Mini label="Disponible" value="62 000 000" valueClass="pos" /><Mini label="Consommé" value="61 %" />
        </div>
        <div className="card pad">
          <h3 className="block-title font-display">Lignes budgétaires (démonstration)</h3>
          {budgetLines.map((b, i) => (
            <div key={i} style={{ marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontWeight: 500 }}>{b.name}</span><span className="num" style={b.warn ? { color: "var(--rose-600)" } : { color: "var(--ink-500)" }}>{b.txt}</span></div>
              <div className="bar"><span className={b.grad === "rose" ? "" : b.grad} style={{ width: `${b.pct}%`, background: b.grad === "rose" ? "var(--rose-500)" : undefined }} /></div>
            </div>
          ))}
        </div>
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
              const allocated = Number(l.allocated ?? l.allocatedAmount ?? 0);
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
function Capacite() {
  return (
    <>
      <PageHead eyebrow="« A-t-on l'argent pour un projet ? »" title="Plan de trésorerie & capacité" action="Exporter" actionIcon="download" onAction={() => notify()} ghost />
      <div className="banner grad-emerald">
        <div>
          <div style={{ fontSize: 12, opacity: .85, display: "flex", alignItems: "center", gap: 6 }}><Icon name="gauge" /> Disponible réel — mobilisable sur fonds propres</div>
          <div className="font-display num" style={{ fontSize: 30, fontWeight: 700 }}>{`17 278 000 ${CUR}`}</div>
          <div style={{ fontSize: 12, opacity: .85 }}>après déduction des dettes à payer et des fonds bailleurs affectés</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, opacity: .9 }}><span className="chip" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}><Icon name="check" style={{ width: 11, height: 11 }} /> Capacité pour un nouveau projet</span><div style={{ marginTop: 8 }}>+ 18,4 k$ en banque USD (non inclus)</div></div>
      </div>
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card pad">
          <h3 className="block-title font-display">Du solde brut au disponible réel</h3>
          <div className="stmt num">
            <div className="ln"><span><Dot c="var(--blue-500)" /> Trésorerie (caisse + banques FC)</span><b>41 200 000</b></div>
            <div className="ln"><span><Dot c="var(--rose-400)" /> − Dettes à payer (court terme)</span><b className="neg">−10 622 000</b></div>
            <div className="ln"><span><Dot c="var(--amber-400)" /> − Fonds bailleurs affectés</span><b style={{ color: "var(--amber-700)" }}>−13 300 000</b></div>
            <div className="ln total" style={{ background: "var(--emerald-50)" }}><span style={{ color: "var(--emerald-800)" }}><Dot c="var(--emerald-500)" /> = Disponible réel (libre)</span><b className="pos">{`17 278 000 ${CUR}`}</b></div>
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>Détail des dettes : fournisseurs 3,4 M · salaires & charges 5,0 M · TVA DGI 2,2 M.</p>
        </div>
        <div className="card pad">
          <h3 className="block-title font-display">Répartition de la trésorerie</h3>
          <div className="stack" style={{ marginBottom: 12 }}><span style={{ width: "42%", background: "var(--emerald-500)" }} /><span style={{ width: "32%", background: "var(--amber-400)" }} /><span style={{ width: "26%", background: "var(--rose-400)" }} /></div>
          <div className="stmt num" style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><Dot c="var(--emerald-500)" /> Libre (mobilisable)</span><b>17 278 000</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><Dot c="var(--amber-400)" /> Affecté à des projets bailleurs</span><span>13 300 000</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><Dot c="var(--rose-400)" /> Engagé (dettes à payer)</span><span>10 622 000</span></div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ink-100)" }} className="stmt num">
            <div className="ln"><span className="muted">Programme Kongo Central (reste)</span><span>2 900 000</span></div>
            <div className="ln" style={{ borderBottom: 0 }}><span className="muted">Programme Kinshasa (reste)</span><span>10 400 000</span></div>
          </div>
        </div>
      </div>
      <div className="card pad table-card" style={{ marginBottom: 14 }}>
        <h3 className="block-title font-display">Plan de trésorerie prévisionnel <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(3 mois)</span></h3>
        <div className="tbl-scroll">
          <table className="tbl num" style={{ minWidth: 620 }}>
            <thead><tr><th>Mois</th><th className="r">Solde début</th><th className="r">Entrées prévues</th><th className="r">Sorties prévues</th><th className="r">Solde fin</th></tr></thead>
            <tbody>
              {cashflowPlan.map((m, i) => (
                <tr key={i} style={m.warn ? { background: "rgba(255,251,235,.6)" } : undefined}><td style={{ fontWeight: 500 }}>{m.mois}</td><td className="r">{nf.format(m.debut)}</td><td className="r pos">+{nf.format(m.entrees)}</td><td className="r neg">−{nf.format(m.sorties)}</td><td className="r" style={{ fontWeight: 600, color: m.warn ? "var(--amber-700)" : undefined }}>{nf.format(m.fin)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> Entrées : loyers + tranches de subvention attendues · Sorties : salaires, fournisseurs, activités terrain.</p>
      </div>
      <div className="card pad info">
        <h3 className="block-title font-display" style={{ marginBottom: 8 }}><Icon name="lightbulb" style={{ color: "var(--blue-600)" }} /> Peut-on financer un nouveau projet ?</h3>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 8, fontSize: 13, color: "var(--ink-700)" }}>
          <li style={{ display: "flex", gap: 8 }}><Icon name="checkCircle" style={{ width: 16, height: 16, color: "var(--emerald-600)", flex: "none", marginTop: 1 }} /> <span><b>~17,3 M {CUR}</b> mobilisables aujourd'hui sur fonds propres (sans toucher aux fonds bailleurs).</span></li>
          <li style={{ display: "flex", gap: 8 }}><Icon name="alertTriangle" style={{ width: 16, height: 16, color: "var(--amber-600)", flex: "none", marginTop: 1 }} /> <span>La trésorerie descend à <b>13,6 M en août</b> : éviter d'engager plus de ~12 M avant la subvention de septembre.</span></li>
          <li style={{ display: "flex", gap: 8 }}><Icon name="wallet" style={{ width: 16, height: 16, color: "var(--blue-600)", flex: "none", marginTop: 1 }} /> <span>Au-delà : prévoir un <b>financement bailleur</b> dédié — les fonds affectés (13,3 M) ne peuvent pas être détournés.</span></li>
        </ul>
      </div>
    </>
  );
}
function Dot({ c }) { return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: c, marginRight: 8 }} />; }

/* ── États financiers ──────────────────────────────────────────────────── */
function Etats({ is, bs }) {
  const [tab, setTab] = React.useState("resultat");
  const tabs = [["resultat", "Compte de résultat"], ["bilan", "Bilan"], ["balance", "Balance"], ["flux", "Flux de trésorerie"]];
  const rev = Number(is.totalRevenue) || fbResultat.totalProduits;
  const exp = Math.abs(Number(is.totalExpense)) || fbResultat.totalCharges;
  const profit = Number(is.profit ?? rev - exp);
  return (
    <>
      <PageHead eyebrow="Exercice 2026 · au 30 juin" title="États financiers" action="Exporter PDF" actionIcon="download" onAction={() => notify()} ghost />
      <div className="segtabs">{tabs.map(([id, lbl]) => <button key={id} className={`segtab ${tab === id ? "active grad-accent" : ""}`} onClick={() => setTab(id)}>{lbl}</button>)}</div>

      {tab === "resultat" && (
        <div className="card pad" style={{ maxWidth: 680 }}>
          <h3 className="block-title font-display">Compte de résultat <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(cumul 2026)</span></h3>
          <div className="stmt num">
            {fbResultat.produits.map(([l, v]) => <div className="ln" key={l}><span className="muted">{l}</span><span className="pos">{nf.format(v)}</span></div>)}
            <div className="ln bold"><span>Total produits</span><span className="pos">{nf.format(rev)}</span></div>
            {fbResultat.charges.map(([l, v]) => <div className="ln" key={l} style={{ marginTop: 0 }}><span className="muted">{l}</span><span className="neg">{nf.format(v)}</span></div>)}
            <div className="ln bold"><span>Total charges</span><span className="neg">{nf.format(exp)}</span></div>
            <div className="ln total" style={{ background: "var(--emerald-50)" }}><span style={{ color: "var(--emerald-800)" }}>Résultat (excédent)</span><span className="pos">{signed(profit)} {CUR}</span></div>
          </div>
        </div>
      )}

      {tab === "bilan" && (
        <div className="card pad" style={{ maxWidth: 820 }}>
          <h3 className="block-title font-display">Bilan <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(au 30/06/2026)</span></h3>
          <div className="g2">
            <div>
              <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Actif</div>
              <div className="stmt num">{fbBilan.actif.map(([l, v]) => <div className="ln" key={l}><span className="muted">{l}</span><span>{nf.format(v)}</span></div>)}<div className="ln total" style={{ background: "var(--blue-50)" }}><span style={{ color: "var(--blue-800)" }}>Total Actif</span><span>{nf.format(fbBilan.totalActif)} {CUR}</span></div></div>
            </div>
            <div>
              <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Passif</div>
              <div className="stmt num">{fbBilan.passif.map(([l, v], i) => <div className="ln" key={l}><span className="muted">{l}</span><span className={i === 1 ? "pos" : ""}>{nf.format(v)}</span></div>)}<div className="ln total" style={{ background: "var(--blue-50)" }}><span style={{ color: "var(--blue-800)" }}>Total Passif</span><span>{nf.format(fbBilan.totalPassif)} {CUR}</span></div></div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}><span className="chip emerald"><Icon name="check" style={{ width: 11, height: 11 }} /> Bilan équilibré · Actif = Passif</span></div>
        </div>
      )}

      {tab === "balance" && (
        <div className="card pad table-card">
          <div className="section-head"><h3 className="font-display">Balance générale <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(au 30/06/2026)</span></h3><button className="link" onClick={() => notify()}><Icon name="download" style={{ width: 13, height: 13 }} /> Exporter</button></div>
          <div className="tbl-scroll">
            <table className="tbl num" style={{ minWidth: 560 }}>
              <thead><tr><th>Compte</th><th>Intitulé</th><th className="r">Solde débit</th><th className="r">Solde crédit</th></tr></thead>
              <tbody>{balanceGenerale.map((r) => <tr key={r.num}><td style={{ fontWeight: 500 }}>{r.num}</td><td style={{ fontVariantNumeric: "normal" }}>{r.name}</td><td className="r">{r.debit ? nf.format(r.debit) : <span className="muted">—</span>}</td><td className="r">{r.credit ? nf.format(r.credit) : <span className="muted">—</span>}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={2}>Totaux</td><td className="r">160 050 000</td><td className="r">160 050 000</td></tr></tfoot>
            </table>
          </div>
          <div style={{ marginTop: 12 }}><span className="chip emerald"><Icon name="check" style={{ width: 11, height: 11 }} /> Balance équilibrée · Total débit = Total crédit</span></div>
        </div>
      )}

      {tab === "flux" && (
        <div className="card pad" style={{ maxWidth: 680 }}>
          <h3 className="block-title font-display">Tableau des flux de trésorerie <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>(cumul 2026)</span></h3>
          <div className="stmt num">
            {fbFlux.map((s) => (
              <React.Fragment key={s.sec}>
                <div className="tiny" style={{ textTransform: "uppercase", letterSpacing: ".04em", margin: "10px 0 2px" }}>{s.sec}</div>
                {s.rows.map(([l, v, c]) => <div className="ln" key={l}><span className="muted">{l}</span><span className={c}>{v}</span></div>)}
                <div className="ln bold"><span>{s.total[0]}</span><span className={s.total[2]}>{s.total[1]}</span></div>
              </React.Fragment>
            ))}
            <div className="ln total" style={{ background: "var(--blue-50)" }}><span style={{ color: "var(--blue-800)" }}>Variation de trésorerie</span><span>+35 200 000</span></div>
            <div className="ln" style={{ marginTop: 4 }}><span className="muted">Trésorerie d'ouverture</span><span>6 000 000</span></div>
            <div className="ln bold"><span>Trésorerie de clôture</span><span>41 200 000</span></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── TVA ───────────────────────────────────────────────────────────────── */
function Tva() {
  return (
    <>
      <PageHead eyebrow="Déclaration · juin 2026" title="TVA & taxes" action="Préparer la déclaration" actionIcon="fileCheck" onAction={() => notify()} />
      <div className="g3" style={{ marginBottom: 18 }}>
        <div className="card pad"><div className="kpi-label">TVA collectée (16 %)</div><div className="font-display num pos" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>3 632 000</div><div className="tiny">sur ventes / prestations</div></div>
        <div className="card pad"><div className="kpi-label">TVA déductible</div><div className="font-display num neg" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>1 410 000</div><div className="tiny">sur achats</div></div>
        <div className="card pad warn"><div className="kpi-label" style={{ color: "var(--amber-700)" }}>TVA à payer</div><div className="font-display num" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--amber-700)" }}>2 222 000</div><div className="tiny" style={{ color: "var(--amber-600)" }}>échéance 15 juil. 2026</div></div>
      </div>
      <div className="card pad table-card tbl-scroll">
        <h3 className="block-title font-display">Détail par taux</h3>
        <table className="tbl num" style={{ minWidth: 520 }}>
          <thead><tr><th>Taux</th><th className="r">Base HT</th><th className="r">TVA</th><th className="r">Sens</th></tr></thead>
          <tbody>
            {fbTva.map((t, i) => (
              <tr key={i}><td style={{ fontVariantNumeric: "normal" }}>{t.taux}</td><td className="r">{nf.format(t.base)}</td><td className={`r ${t.cls || "muted"}`}>{t.tva ? nf.format(t.tva) : "—"}</td><td className="r"><span className={`chip ${t.chip}`}>{t.sens}</span></td></tr>
            ))}
          </tbody>
          <tfoot><tr><td>Net à payer</td><td></td><td className="r" style={{ color: "var(--amber-700)" }}>2 222 000</td><td></td></tr></tfoot>
        </table>
        <p className="tiny" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="info" style={{ width: 13, height: 13 }} /> TVA RDC à 16 %. Les dons/subventions sont exonérés. Déclaration mensuelle à la DGI.</p>
      </div>
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
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{(rows || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
}
function defaults(kind, accounts, mainAccounts) {
  if (kind === "account") return { name: "", accountId: mainAccounts[0]?.id || 1 };
  return { date: new Date().toISOString().slice(0, 10), particulars: "", debitId: accounts[0]?.id || 1, creditId: accounts[1]?.id || accounts[0]?.id || 2, amount: 0, type: "transaction" };
}

export default AppShell;
