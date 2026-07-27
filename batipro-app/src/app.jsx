import React from "react";
import { api, subcontractorSubmitUrl, clientDocumentUrl } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth } from "./auth.jsx";
import ViewerBoundary from "./ViewerBoundary.jsx";
import CurrencyPicker from "./CurrencyPicker.jsx";

/* ────────────────────────────────────────────────────────────────────────
   Icônes (SVG inline, style lucide) — pas de dépendance externe.
   ──────────────────────────────────────────────────────────────────────── */
const P = {
  hardHat: "M2 18h20M10 5.5A6 6 0 0 0 4 11v3h16v-3a6 6 0 0 0-6-5.5M10 5.5V4a2 2 0 0 1 4 0v1.5M10 5.5h4",
  dashboard: "M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z",
  gantt: "M8 6h10M6 12h12M4 18h8M3 4v16",
  rotate3d: "M3 12a9 3 0 1 0 18 0 9 3 0 1 0-18 0M12 9v12M7 10l5 3 5-3",
  receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5",
  package: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11",
  plus: "M12 5v14M5 12h14",
  building2: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  trendingUp: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  wallet: "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 12h.01",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  calendarCheck: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 16l2 2 4-4",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  listChecks: "M11 6h10M11 12h10M11 18h10M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17",
  pieChart: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  clipboard: "M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
  zap: "M13 2 3 14h9l-1 8 10-12h-9z",
  droplet: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
  paint: "M19 11H5V5h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2zM7 11v4a2 2 0 0 0 2 2h2v3a1 1 0 0 0 1 1h0a1 1 0 0 0 1-1v-3",
  filePlus: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15h6",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6",
  menu: "M3 12h18M3 6h18M3 18h18",
  chevronRight: "M9 18l6-6-6-6",
  sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 3v4M21 5h-4M5 17v2M6 18H4",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8",
  fileDown: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15l3 3 3-3",
  calculator: "M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  checkCheck: "M18 6 7 17l-4-4M22 10l-7.5 7.5L13 16",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  x: "M18 6 6 18M6 6l12 12",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.3-2.3z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01",
};
function Icon({ name, className = "ic" }) {
  const d = P[name] || P.circle;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { id: "chantiers", label: "Projets / chantiers", icon: "hardHat" },
  { id: "equipes", label: "Équipes", icon: "userPlus" },
  { id: "pointage", label: "Pointage", icon: "calendarCheck" },
  { id: "previsionnel", label: "Prévisionnel", icon: "gantt" },
  { id: "materiaux", label: "Matériaux & achats", icon: "package" },
  { id: "parametres", label: "Paramètres", icon: "clipboard" },
];
const MOB_PRIMARY = ["dashboard", "chantiers", "pointage"];
const MOB_MORE = ["equipes", "previsionnel", "materiaux", "parametres"];
const TITLES = Object.fromEntries(NAV.map((n) => [n.id, n.label]));

function money(value, currency) {
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${code} ${Number(value || 0).toLocaleString("fr-CA", { maximumFractionDigits: 0 })}`;
  }
}
// Regroupe un total par devise projet (chaque projet peut avoir sa propre devise).
function moneyByCurrency(projects, field) {
  const byCurrency = new Map();
  for (const p of projects) {
    const code = p.currencyCode || "USD";
    byCurrency.set(code, (byCurrency.get(code) || 0) + n(p[field]));
  }
  const entries = [...byCurrency.entries()];
  if (!entries.length) return money(0);
  return entries.map(([code, total]) => money(total, code)).join(" + ");
}
const n = (v) => Number(v || 0);
const projectDue = (p) => p.dueDate || p.due || "-";

// Charge la liste des devises actives (pour CurrencyPicker) — même pattern que
// Ouvriers/RecordModal (api.currencies() -> filtre status actif).
function useCurrencies() {
  const [currencies, setCurrencies] = React.useState([]);
  React.useEffect(() => {
    api.currencies().then((r) => {
      const arr = Array.isArray(r) ? r : (r?.data || r?.getAllCurrency || []);
      setCurrencies((arr || []).filter((c) => String(c.status) === "true" || c.status === true));
    }).catch(() => setCurrencies([]));
  }, []);
  return currencies;
}
// Résout le code d'une devise depuis son id, dans une liste de devises.
function resolveCurrencyCode(currencies, id) {
  const c = (currencies || []).find((x) => String(x.currencyId ?? x.id) === String(id));
  return c ? (c.currencyCode || c.currencyName || c.name) : null;
}

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

function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen />;
  return <App />;
}

function useCurrentUser() {
  return React.useMemo(() => {
    const name = (typeof window !== "undefined" && localStorage.getItem("user")) || "Utilisateur";
    const role = (typeof window !== "undefined" && localStorage.getItem("role")) || "—";
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
    return { name, role, initials };
  }, []);
}

function App() {
  const { name: userName, role: userRole, initials: userInitials } = useCurrentUser();
  const [route, setRoute] = React.useState("dashboard");
  const [snapshot, setSnapshot] = React.useState(null);
  const [apiStatus, setApiStatus] = React.useState("loading");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [openProjectId, setOpenProjectId] = React.useState(null);
  const isMobile = useIsMobile();

  const loadDashboard = React.useCallback(() => {
    setApiStatus((s) => (s === "api" ? s : "loading"));
    api.dashboard()
      .then((data) => { setSnapshot(data); setApiStatus("api"); })
      .catch(() => setApiStatus("error"));
  }, []);
  React.useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const projectRows = snapshot?.projects || [];
  const taskRows = snapshot?.tasks || [];
  const materialRows = snapshot?.materials || [];
  const canMutate = apiStatus === "api";

  const go = (id) => { setRoute(id); setMoreOpen(false); window.scrollTo(0, 0); };

  // Ouvre le chantier concerné par une notification (task/document/project → page dédiée du projet).
  const goToProject = (projectId) => {
    if (projectId != null) setOpenProjectId(projectId);
  };

  const saveRecord = async (kind, form) => {
    setBusy(true); setError("");
    try {
      const payload = payloadFor(kind, form);
      if (kind === "project") form.id ? await api.updateProject(form.id, payload) : await api.createProject(payload);
      else if (kind === "material") form.id ? await api.updateMaterial(form.id, payload) : await api.createMaterial(payload);
      setModal(null); loadDashboard();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  const views = {
    dashboard: <Dashboard projects={projectRows} tasks={taskRows} go={go} onNew={() => setModal({ kind: "project" })} canMutate={canMutate} isMobile={isMobile} onOpen={setOpenProjectId} />,
    chantiers: <Chantiers projects={projectRows} onNew={() => setModal({ kind: "project" })} canMutate={canMutate} onOpen={setOpenProjectId} />,
    pointage: <Pointage projects={projectRows} canMutate={canMutate} />,
    equipes: <Equipes canMutate={canMutate} />,
    previsionnel: <Forecast />,
    materiaux: <Materiaux materials={materialRows} onNew={() => setModal({ kind: "material" })} canMutate={canMutate} />,
    parametres: <Parametres />,
  };

  const openProject = openProjectId != null ? projectRows.find((p) => p.id === openProjectId) : null;

  return (
    <div className="app">
      <aside className="sidebar grad-dark">
        <a className="brand" href={import.meta.env.BASE_URL}>
          <span className="brand-icon grad-amber"><Icon name="hardHat" /></span>
          <span className="brand-title font-display">BâtiPro</span>
        </a>
        <nav className="nav">
          {NAV.map((item) => (
            <button key={item.id} className={`navlink ${route === item.id ? "active" : ""}`} onClick={() => go(item.id)}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.ia && <span className="ia-badge grad-iris">IA</span>}
            </button>
          ))}
        </nav>
        <div className="user-chip">
          <NotificationBell goToProject={goToProject} />
          <span className="user-avatar grad-amber">{userInitials}</span>
          <div>
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <button className="user-logout" title="Se déconnecter" onClick={clearAuth}><Icon name="logout" /></button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="mob-topbar grad-dark">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="brand-icon grad-amber"><Icon name="hardHat" /></span>
          <span className="mob-title font-display">{TITLES[route]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NotificationBell goToProject={goToProject} />
          <span className="user-avatar grad-amber">{userInitials}</span>
        </div>
      </div>

      <main className="main">
        <div className="content">
          {error && <div className="inline-error">{error}</div>}
          {apiStatus === "loading" && <div className="card pad" style={{ marginBottom: 16 }}><span className="muted">Connexion au serveur…</span></div>}
          {apiStatus === "error" && <div className="inline-error">Impossible de contacter le serveur BâtiPro. Vérifiez votre connexion, puis réessayez.</div>}
          {apiStatus === "api" && (openProject
            ? <ProjectDetail project={openProject} onBack={() => setOpenProjectId(null)} canMutate={canMutate} projects={projectRows} tasks={taskRows} materials={materialRows} />
            : views[route])}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mob-nav">
        {MOB_PRIMARY.map((id) => {
          const item = NAV.find((x) => x.id === id);
          const lbl = { dashboard: "Accueil", chantiers: "Chantiers", pointage: "Pointage" }[id];
          return (
            <button key={id} className={route === id ? "active" : ""} onClick={() => go(id)}>
              <Icon name={id === "dashboard" ? "home" : item.icon} /><span>{lbl}</span>
            </button>
          );
        })}
        <button className={MOB_MORE.includes(route) ? "active" : ""} onClick={() => setMoreOpen(true)}>
          <Icon name="menu" /><span>Plus</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet">
          <div className="more-scrim" onClick={() => setMoreOpen(false)} />
          <div className="more-panel">
            <div className="more-handle" />
            <p className="kv-title" style={{ paddingLeft: 8 }}>Tout le reste</p>
            {MOB_MORE.map((id) => {
              const item = NAV.find((x) => x.id === id);
              return (
                <button key={id} className="navlink" onClick={() => go(id)}>
                  <Icon name={item.icon} /><span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modal && <RecordModal modal={modal} busy={busy} error={error} onClose={() => setModal(null)} onSave={saveRecord} />}
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
function Dashboard({ projects, tasks, go, onNew, canMutate, onOpen }) {
  const active = projects.filter((p) => p.status !== "Livre" && p.status !== "Livré");
  const avg = Math.round(projects.reduce((s, p) => s + n(p.progress), 0) / Math.max(1, projects.length));
  const late = tasks.filter((t) => t.status === "Bloque" || t.status === "Bloqué").length;
  const projColor = (i) => ["grad-amber", "", "grad-iris"][i % 3] || "grad-amber";

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Vue d'ensemble · {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
          <h2 className="title font-display">Vos chantiers</h2>
        </div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Nouveau projet</button>
      </div>

      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Chantiers actifs" value={active.length} sub={`${projects.length} au total`} icon="hardHat" />
        <KPI label="Avancement moyen" value={`${avg} %`} sub="tous projets" subClass="up" icon="trendingUp" />
        <KPI label="Budget engagé" value={moneyByCurrency(projects, "spent")} sub={`/ ${moneyByCurrency(projects, "budget")} contractés`} icon="wallet" />
        <KPI label="Retards / blocages" value={late} sub={late ? "à traiter" : "aucun"} subClass={late ? "down" : ""} icon="alert" danger={late > 0} />
      </div>

      <div className="g3">
        <section className="card pad span2">
          <div className="section-head">
            <h3 className="font-display">Chantiers en cours</h3>
            <button className="link" onClick={() => go("chantiers")}>Tout voir</button>
          </div>
          {active.slice(0, 4).map((p, i) => (
            <div className="proj-row" key={p.id} onClick={() => onOpen?.(p.id)} style={{ cursor: onOpen ? "pointer" : "default" }}>
              <span className={`proj-ic ${projColor(i)}`} style={projColor(i) === "" ? { background: "#0f172a" } : undefined}>
                <Icon name={i % 3 === 2 ? "home" : "building2"} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="proj-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span className="chip ink">{p.status}</span>
                </div>
                <div className="progress" style={{ marginTop: 8 }}>
                  <span className={projColor(i) || "grad-amber"} style={{ width: `${n(p.progress)}%`, background: projColor(i) ? undefined : "var(--ink-900)" }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}><strong className="font-display">{n(p.progress)} %</strong></div>
            </div>
          ))}
        </section>

        <section className="card pad">
          <h3 className="font-display" style={{ fontSize: 15, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="bell" className="ic" /> À traiter
          </h3>
          {(() => {
            const blocked = tasks.filter((t) => t.status === "Bloque" || t.status === "Bloqué");
            if (!blocked.length) return <p className="muted" style={{ fontSize: 12 }}>Aucun blocage en cours.</p>;
            return blocked.slice(0, 5).map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              return <Todo key={t.id} icon="alert" tone="rose" title={t.label} sub={proj?.name || "Chantier"} />;
            });
          })()}
        </section>
      </div>
    </>
  );
}

function KPI({ label, value, sub, subClass = "", icon, danger }) {
  return (
    <div className={`card pad ${danger ? "danger" : ""}`}>
      <div className="kpi-head"><span className="kpi-label">{label}</span><Icon name={icon} /></div>
      <div className="kpi-value font-display">{value}</div>
      <div className={`kpi-sub ${subClass}`}>{sub}</div>
    </div>
  );
}
function Todo({ icon, tone, title, sub }) {
  const bg = { amber: "var(--amber-100)", rose: "var(--rose-100)", iris: "var(--iris-50)" }[tone];
  const fg = { amber: "var(--amber-600)", rose: "var(--rose-600)", iris: "var(--iris-600)" }[tone];
  return (
    <div className="todo-row">
      <span className="todo-ic" style={{ background: bg, color: fg }}><Icon name={icon} /></span>
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ color: "var(--ink-400)" }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── Chantiers ─────────────────────────────────────────────────────────── */
/* ── Notifications (cloche header) ───────────────────────────────────────
   Panneau déroulant listant les notifications actives ; réutilise le
   pattern chip/tone existant (amber=warning, rose=critical, ink=info). */
const NOTIF_TONE = { critical: "rose", warning: "amber", info: "ink" };
const NOTIF_ICON = { task_overdue: "alert", invoice_pending: "receipt", budget_exceeded: "wallet" };
function notifRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return d.toLocaleDateString("fr-FR");
}
function NotificationBell({ goToProject }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const rootRef = React.useRef(null);

  const load = React.useCallback(() => {
    api.listNotifications().then((data) => { setItems(Array.isArray(data) ? data : []); setLoaded(true); }).catch(() => {});
  }, []);

  // Rafraîchissement léger : au montage puis toutes les 60s (pas de canal SSE/publish dans cette app).
  React.useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);
  React.useEffect(() => { if (open) load(); }, [open, load]);

  // Ferme le panneau au clic en dehors.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unreadCount = items.filter((it) => !it.isRead).length;

  const handleClick = async (it) => {
    if (!it.isRead) {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, isRead: true } : x)));
      api.markNotificationRead(it.id).catch(() => {});
    }
    setOpen(false);
    if (it.projectId != null) goToProject(it.projectId);
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    api.markAllNotificationsRead().catch(() => {});
  };

  const dismiss = (e, id) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((x) => x.id !== id));
    api.dismissNotification(id).catch(() => {});
  };

  return (
    <div className="notif-bell" ref={rootRef}>
      <button type="button" className="notif-bell-btn" title="Notifications" onClick={() => setOpen((v) => !v)}>
        <Icon name="bell" />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-panel card">
          <div className="notif-panel-head">
            <span className="kv-title">Notifications</span>
            <button type="button" className="link" onClick={markAllRead} disabled={!unreadCount}>Tout marquer comme lu</button>
          </div>
          <div className="notif-list">
            {!loaded && <p className="muted" style={{ fontSize: 12, padding: "8px 4px" }}>Chargement…</p>}
            {loaded && !items.length && <p className="muted" style={{ fontSize: 12, padding: "8px 4px" }}>Aucune notification.</p>}
            {items.map((it) => (
              <div key={it.id} className={`notif-row ${it.isRead ? "" : "unread"}`} onClick={() => handleClick(it)}>
                <span className={`todo-ic notif-ic-${NOTIF_TONE[it.severity] || "ink"}`}><Icon name={NOTIF_ICON[it.type] || "bell"} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`chip ${NOTIF_TONE[it.severity] || "ink"}`}>{it.severity}</span>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{it.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>{it.message}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 2 }}>{notifRelativeTime(it.createdAt)}</div>
                </div>
                <button type="button" className="notif-dismiss" title="Ignorer" onClick={(e) => dismiss(e, it.id)}><Icon name="x" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chantiers({ projects, onNew, canMutate, onOpen }) {
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Projets</p><h2 className="title font-display">Projets / chantiers</h2></div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Nouveau projet</button>
      </div>

      <div className="g3" style={{ marginBottom: 18 }}>
        {projects.map((p) => (
          <div className="card pad" key={p.id} onClick={() => onOpen?.(p.id)} style={{ cursor: "pointer" }}>
            <div className="proj-card-head">
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <span className="chip amber" style={{ marginLeft: "auto" }}>{n(p.progress)} %</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 8 }}>{p.client} · {p.location}</div>
            <div className="progress"><span className="grad-amber" style={{ width: `${n(p.progress)}%` }} /></div>
            <div className="proj-meta">
              <span>{money(p.spent, p.currencyCode)} / {money(p.budget, p.currencyCode)}</span>
              <span className={p.risk === "Eleve" || p.risk === "Élevé" ? "danger-txt" : ""}>{p.risk}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function BudgetBar({ label, txt, pct }) {
  return (
    <div style={{ marginBottom: 12, fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>{label}</span><span style={{ color: "var(--ink-500)" }}>{txt}</span></div>
      <div className="progress"><span className="grad-amber" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ── ProjectDetail : page dédiée d'un chantier avec tous ses onglets ────── */
const PROJECT_TABS = [
  { id: "apercu", label: "Aperçu", icon: "pieChart" },
  { id: "devis", label: "Devis", icon: "receipt" },
  { id: "bonscommande", label: "Bons de commande", icon: "receipt" },
  { id: "materiaux", label: "Matériaux", icon: "hardHat" },
  { id: "situations", label: "Avenants & sous-traitants", icon: "receipt", hint: "Le marché : montant initial, avenants (+/-) et soumissions des sous-traitants." },
  { id: "situationstravaux", label: "Situations de travaux", icon: "receipt", hint: "Décomptes d'avancement : combien vous pouvez facturer selon l'avancement des phases." },
  { id: "factures", label: "Factures", icon: "receipt", hint: "Réclamer l'argent au client à partir d'une situation validée (génère l'écriture comptable)." },
  { id: "photos", label: "Photos & rapport", icon: "camera" },
  { id: "planning", label: "Planning", icon: "gantt" },
  { id: "plan3d", label: "Plan 3D", icon: "rotate3d" },
  { id: "soustraitants", label: "Sous-traitants", icon: "users" },
];
function ProjectDetail({ project, onBack, canMutate, projects, tasks, materials }) {
  const [tab, setTab] = React.useState("apercu");
  const p = project;
  const [budget, setBudget] = React.useState(null);
  React.useEffect(() => {
    if (tab !== "apercu" || !p.id) return;
    api.budgetSummary(p.id).then(setBudget).catch(() => setBudget(null));
  }, [tab, p.id]);
  const budgetCur = budget?.currency_code || p.currencyCode;

  return (
    <>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={onBack}><Icon name="chevronRight" className="ic" style={{ transform: "rotate(180deg)" }} /> Retour</button>
          <div>
            <p className="eyebrow">Chantier</p>
            <h2 className="title font-display">{p.name}</h2>
          </div>
        </div>
        <span className="chip amber">{n(p.progress)} % avancé</span>
      </div>

      <div className="selected-banner grad-amber">
        <div>
          <div style={{ fontSize: 12, opacity: .85, display: "flex", alignItems: "center", gap: 6 }}><Icon name="hardHat" /> {p.client} · {p.location} · {p.manager}</div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>{p.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: .85 }}>Avancement</div>
          <div className="font-display" style={{ fontSize: 36, fontWeight: 700 }}>{n(p.progress)} %</div>
        </div>
      </div>

      <div className="proj-tabs">
        {PROJECT_TABS.map((t) => (
          <button key={t.id} className={`proj-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} title={t.hint || undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.hint && <span className="tab-info" title={t.hint} aria-hidden="true"><Icon name="info" /></span>}
          </button>
        ))}
      </div>

      <div className="proj-tab-body">
        {tab === "apercu" && (
          <div className="g3">
            <div className="card pad">
              <p className="kv-title">
                <Icon name="pieChart" /> Budget
                {budget?.has_other_currency && (
                  <span title="Certains documents sont dans une autre devise, non inclus dans ce total" style={{ marginLeft: 6, fontSize: 11, color: "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <Icon name="alert" /> autre devise ignorée
                  </span>
                )}
              </p>
              <div onClick={() => setTab("bonscommande")} style={{ cursor: "pointer" }}>
                <BudgetBar
                  label="Coût"
                  txt={`${money(budget?.cost_committed, budgetCur)} / ${money(budget?.budget, budgetCur)}`}
                  pct={n(budget?.budget) ? Math.min(100, Math.round((n(budget?.cost_committed) / n(budget?.budget)) * 100)) : 0}
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--ink-500)", marginTop: -6, marginBottom: 12 }}>
                  <span>Décaissé : {money(budget?.cost_actual, budgetCur)}</span>
                  <span>Devis accepté : {money(budget?.quote_accepted, budgetCur)}</span>
                </div>
              </div>
              <div onClick={() => setTab("factures")} style={{ cursor: "pointer" }}>
                <BudgetBar
                  label="Facturation"
                  txt={`${money(budget?.billed_issued, budgetCur)} / ${money(budget?.contract_with_change_orders, budgetCur)}`}
                  pct={n(budget?.contract_with_change_orders) ? Math.min(100, Math.round((n(budget?.billed_issued) / n(budget?.contract_with_change_orders)) * 100)) : 0}
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--ink-500)", marginTop: -6 }}>
                  <span>Encaissé : {money(budget?.billed_cashed, budgetCur)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "devis" && <Devis projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "bonscommande" && <BonsCommande projects={projects} canMutate={canMutate} fixedProjectId={p.id} materials={materials} />}
        {tab === "materiaux" && <Materiaux canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "situations" && <Situations projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "situationstravaux" && <SituationsTravaux projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "factures" && <Factures projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "photos" && <SitePhotos projects={projects} tasks={tasks} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "planning" && <Planning projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "plan3d" && <Plan3D projects={projects} materials={materials} canMutate={canMutate} fixedProjectId={p.id} />}
        {tab === "soustraitants" && <SousTraitants projects={projects} canMutate={canMutate} fixedProjectId={p.id} />}
      </div>
    </>
  );
}

/* ── Prévisionnel (échéancier chantiers : à facturer − coût restant) ────── */
const BPF_HORIZONS = [
  { v: 1, label: "1 mois" }, { v: 3, label: "3 mois" }, { v: 6, label: "6 mois" },
  { v: 12, label: "1 an" }, { v: 24, label: "2 ans" }, { v: 36, label: "3 ans" },
];
const BPF_MODES = [
  { v: "prudent", label: "Prudent", hint: "engagé seul", enabled: true },
  { v: "realiste", label: "Réaliste", hint: "+ tendance", enabled: true },
  { v: "optimiste", label: "Optimiste", hint: "+ IA (à venir)", enabled: false },
];
const bpfNf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const bpfSigned = (v) => (v > 0 ? "+" : "") + bpfNf.format(Math.round(Number(v || 0)));
function bpfMonth(key) {
  const [y, m] = key.split("-");
  const names = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  return `${names[Number(m) - 1]} ${y}`;
}
function bpfSeries(months) {
  const byCur = new Map();
  for (const m of months) {
    for (const c of m.currencies) {
      const key = String(c.currencyId ?? "null");
      const code = c.currencyCode || c.currencySymbol || "—";
      const entry = byCur.get(key) || { code, points: [] };
      const last = entry.points.length ? entry.points[entry.points.length - 1] : null;
      const prev = last ? last.cumul : 0, prevLow = last ? last.low : 0, prevHigh = last ? last.high : 0;
      const opening = Number(c.opening || 0), net = Number(c.net || 0);
      const cumul = prev + opening + net;
      const low = prevLow + opening + Number(c.netLow ?? net);
      const high = prevHigh + opening + Number(c.netHigh ?? net);
      entry.points.push({ month: m.month, net, opening, cumul, low, high });
      byCur.set(key, entry);
    }
  }
  return [...byCur.values()];
}
function BpfChart({ serie }) {
  const W = 560, H = 170, pad = 30, color = "#d97706";
  const pts = serie.points;
  if (pts.length < 2) return <p className="muted" style={{ fontSize: 13, padding: "12px 0" }}>Pas assez de points pour tracer une courbe.</p>;
  const ys = pts.flatMap((p) => [p.cumul, p.low ?? p.cumul, p.high ?? p.cumul]);
  const min = Math.min(0, ...ys), max = Math.max(0, ...ys), span = max - min || 1;
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) * (H - 2 * pad)) / span;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumul).toFixed(1)}`).join(" ");
  const areaFill = `${line} L${x(pts.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const hasBand = pts.some((p) => (p.high ?? p.cumul) !== (p.low ?? p.cumul));
  const bandUp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.high ?? p.cumul).toFixed(1)}`).join(" ");
  const bandDown = pts.map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)},${y(pts[pts.length - 1 - i].low ?? pts[pts.length - 1 - i].cumul).toFixed(1)}`).join(" ");
  const zeroY = y(0), gid = `bpf-${serie.code}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`Courbe ${serie.code}`}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="var(--ink-200)" strokeDasharray="3 3" />
      <path d={areaFill} fill={`url(#${gid})`} stroke="none" />
      {hasBand && <path d={`${bandUp} ${bandDown} Z`} fill={color} opacity="0.1" stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={p.month} cx={x(i)} cy={y(p.cumul)} r="3.5" fill="#fff" stroke={color} strokeWidth="2">
          <title>{`${bpfMonth(p.month)} : ${bpfSigned(p.cumul)} ${serie.code}`}</title>
        </circle>
      ))}
      {pts.map((p, i) => (i === 0 || i === pts.length - 1) && (
        <text key={`x-${p.month}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "end"} fontSize="10" fill="var(--ink-400)">{bpfMonth(p.month)}</text>
      ))}
    </svg>
  );
}
function BpfSeg({ active, disabled, onClick, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        border: active ? 0 : "1px solid var(--ink-200)",
        background: active ? "var(--amber-500)" : "#fff",
        color: active ? "#fff" : "var(--ink-500)",
      }}>{children}</button>
  );
}
function Forecast() {
  const [horizon, setHorizon] = React.useState(3);
  const [mode, setMode] = React.useState("prudent");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    api.forecastCashFlow({ horizon, mode, scope: "batipro" })
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [horizon, mode]);

  const series = React.useMemo(() => (data ? bpfSeries(data.months) : []), [data]);
  const summary = series.map((s) => { const last = s.points[s.points.length - 1]; return { code: s.code, cumul: last ? last.cumul : 0 }; });
  const horizonLabel = BPF_HORIZONS.find((h) => h.v === horizon)?.label;
  const upper = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6, color: "var(--ink-400)" };

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 14 }}>
        <p className="eyebrow">Pilotage</p>
        <h2 className="title font-display">Prévisionnel — Chantiers</h2>
        <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>Échéancier de trésorerie des chantiers (à facturer − coût restant), étalé jusqu'à l'échéance, par devise.</p>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div>
          <div style={upper}>Horizon</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BPF_HORIZONS.map((h) => <BpfSeg key={h.v} active={horizon === h.v} onClick={() => setHorizon(h.v)}>{h.label}</BpfSeg>)}
          </div>
        </div>
        <div>
          <div style={upper}>Hypothèse</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BPF_MODES.map((m) => (
              <BpfSeg key={m.v} active={mode === m.v} disabled={!m.enabled} title={m.enabled ? m.hint : `${m.hint} — à venir`} onClick={() => m.enabled && setMode(m.v)}>
                {m.label} <span style={{ fontWeight: 400, opacity: 0.75 }}>· {m.hint}</span>
              </BpfSeg>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 18 }}><span className="muted">Calcul de la projection…</span></div>}
      {error && <div className="card" style={{ padding: 18, color: "var(--rose-600)" }}>Erreur : {error}</div>}

      {!loading && !error && data && (summary.length === 0 ? (
        <div className="card" style={{ padding: 18 }}><span className="muted">Aucun chantier à projeter. Renseignez budget, montant contrat et échéance sur vos chantiers.</span></div>
      ) : (
        <>
          <div className="card" style={{ padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>
              À ce rythme, le solde de trésorerie chantiers projeté à <strong>{horizonLabel}</strong> serait de{" "}
              {summary.map((s, i) => (
                <strong key={s.code} style={{ color: s.cumul >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>{i > 0 ? " et " : ""}{bpfSigned(s.cumul)} {s.code}</strong>
              ))}.
            </div>
            <div className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
              {summary.map((s) => (
                <div key={s.code} className="card" style={{ padding: 16, background: "var(--amber-50)" }}>
                  <div className="kpi-label">Solde chantiers · {s.code}</div>
                  <div className="kpi-value" style={{ color: s.cumul >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>{bpfSigned(s.cumul)} {s.code}</div>
                  <div className="kpi-sub">sur {horizonLabel}</div>
                </div>
              ))}
            </div>
          </div>
          {series.map((s) => (
            <div className="card" style={{ padding: 18, marginBottom: 14 }} key={s.code}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <strong className="font-display" style={{ fontSize: 15 }}>Trésorerie chantiers · {s.code}</strong>
                <span className="chip">{mode === "prudent" ? "certain · engagé" : "engagé + tendance"}</span>
              </div>
              <BpfChart serie={s} />
            </div>
          ))}
          {data.months.length > 0 && (
            <details className="card" style={{ padding: 18 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }} className="font-display">Détail mensuel</summary>
              <div style={{ marginTop: 8 }}>
                {data.months.map((m) => (
                  <div key={m.month} style={{ borderTop: "1px solid var(--ink-100)", padding: "10px 0" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{bpfMonth(m.month)}</div>
                    {m.currencies.map((c) => {
                      const code = c.currencyCode || c.currencySymbol || "—";
                      return (
                        <div key={code} style={{ marginLeft: 8, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span className="muted">Variation nette {code}</span>
                            <strong style={{ color: c.net >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>{bpfSigned(c.net)} {code}</strong>
                          </div>
                          {c.lines.map((l, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--ink-500)", marginLeft: 8, padding: "1px 0" }}>
                              <span>{l.amount >= 0 ? "+ " : "− "}{l.source} <em style={{ opacity: 0.7 }}>· {l.basis}</em></span>
                              <span className="chip">{l.confidence === "certain" ? "certain" : "estimé"}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      ))}
    </div>
  );
}

/* ── Paramètres ────────────────────────────────────────────────────────── */
function Parametres() {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(window.location.hostname) ? "dev" : "prod";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE;
  const lastUpdate = buildDate
    ? new Date(buildDate).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "—";
  const [currencies, setCurrencies] = React.useState([]);
  React.useEffect(() => {
    api.currencies()
      .then((res) => setCurrencies(res?.getAllCurrency || (Array.isArray(res) ? res : [])))
      .catch(() => setCurrencies([]));
  }, []);
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}>{v}</span>
    </div>
  );
  return (
    <section>
      <h1 className="page-title font-display" style={{ marginBottom: 16 }}>Paramètres</h1>
      <div className="card" style={{ maxWidth: 560, padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Devises actives</div>
        {!currencies.length ? (
          <span className="muted" style={{ fontSize: 13 }}>Aucune devise chargée.</span>
        ) : (
          currencies.map((c) => (
            <Row
              key={c.currencyId ?? c.id}
              k={`${c.currencyCode || "—"} ${c.currencySymbol ? `(${c.currencySymbol})` : ""}`.trim()}
              v={c.exchangeRate ? `Taux : ${c.exchangeRate}` : "—"}
            />
          ))
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Gestion des taux dans Comptabilité → Change.</p>
      </div>
      <div className="card" style={{ maxWidth: 560, padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>À propos</div>
        <Row k="Version" v={`v${base}`} />
        <Row k="Build" v={build} />
        <Row k="Commit" v={commit} />
        <Row k="Dernière mise à jour" v={lastUpdate} />
        <Row k="Environnement" v={env} />
      </div>
    </section>
  );
}

function Planning({ projects, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [phases, setPhases] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    if (!projectId) { setPhases([]); setLoading(false); return; }
    setLoading(true);
    api.phases(projectId).then((rows) => setPhases(rows || [])).catch(() => setPhases([])).finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const selected = projects.find((p) => p.id === projectId);
  const range = React.useMemo(() => {
    const dates = phases.flatMap((p) => [p.startDate, p.endDate]).filter(Boolean).map((d) => new Date(d));
    if (!dates.length) return null;
    const min = new Date(Math.min(...dates)), max = new Date(Math.max(...dates));
    return { min, max, span: Math.max(1, max - min) };
  }, [phases]);

  const statusTone = (s) => (s === "Termine" || s === "Terminé" ? "emerald" : s === "En_cours" || s === "En cours" ? "amber" : "ink");
  const pctFor = (d) => range ? ((new Date(d) - range.min) / range.span) * 100 : 0;

  const save = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = {
        project_id: projectId, label: form.label, position: Number(form.position || 0),
        status: form.status || "A_venir", progress: Number(form.progress || 0),
        start_date: form.start_date || null, end_date: form.end_date || null,
        planned_budget: form.planned_budget === "" || form.planned_budget == null ? undefined : Number(form.planned_budget),
        planned_duration_days: form.planned_duration_days === "" || form.planned_duration_days == null ? undefined : Number(form.planned_duration_days),
        cap_mode: form.cap_mode || "planning",
        currency_id: form.currency_id === "" || form.currency_id == null ? undefined : Number(form.currency_id),
      };
      form.id ? await api.updatePhase(form.id, payload) : await api.createPhase(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Planning</p>
          <h2 className="title font-display">Planning{selected ? ` — ${selected.name}` : ""}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={() => setModal({})}><Icon name="plus" /> Phase</button>
        </div>
      </div>

      {loading ? (
        <div className="card pad"><span className="muted">Chargement…</span></div>
      ) : !phases.length ? (
        <div className="card pad"><span className="muted">Aucune phase définie pour ce chantier.</span></div>
      ) : (
        <div className="phase-list">
          {phases.map((r) => {
            const tone = statusTone(r.status);
            const barColor = tone === "emerald" ? "var(--emerald-500)" : tone === "amber" ? "var(--amber-500)" : "var(--ink-300)";
            const hasRange = range && r.startDate && r.endDate;
            return (
              <div className="phase-card" key={r.id} onClick={() => canMutate && setModal(r)} style={{ cursor: canMutate ? "pointer" : "default" }}>
                <div className="phase-card-top">
                  <span className="phase-name">{r.label}</span>
                  <span className={`chip ${tone}`}>{r.status?.replace(/_/g, " ")}</span>
                </div>
                <div className="progress" style={{ marginTop: 8 }}>
                  <span style={{ width: `${Math.max(0, Math.min(100, n(r.progress)))}%`, background: barColor }} />
                </div>
                <div className="phase-card-bottom">
                  <span>{hasRange ? `${r.startDate} → ${r.endDate}` : "Dates non définies"}</span>
                  <strong>{r.progress} %</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <PhaseModal modal={modal} busy={busy} error={error} currencyId={selected?.currencyId} currencyCode={selected?.currencyCode} onClose={() => setModal(null)} onSave={save} />
      )}
    </>
  );
}
function PhaseModal({ modal, busy, error, currencyId, currencyCode, onClose, onSave }) {
  const [form, setForm] = React.useState(() => ({
    id: modal.id, label: modal.label || "", position: modal.position ?? 0, status: modal.status || "A_venir",
    progress: modal.progress ?? 0, start_date: modal.startDate || "", end_date: modal.endDate || "",
    planned_budget: modal.plannedBudget ?? "", planned_duration_days: modal.plannedDurationDays ?? "",
    cap_mode: modal.capMode || "planning",
    currency_id: modal.currencyId || currencyId || "",
  }));
  const currencies = useCurrencies();
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier la phase" : "Nouvelle phase"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Nom" value={form.label} onChange={(v) => set("label", v)} required />
          <label className="field">
            <span>Statut</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="A_venir">À venir</option>
              <option value="En_cours">En cours</option>
              <option value="Termine">Terminé</option>
            </select>
          </label>
          <Field label="Avancement %" type="number" value={form.progress} onChange={(v) => set("progress", v)} />
          <Field label="Ordre" type="number" value={form.position} onChange={(v) => set("position", v)} />
          <Field label="Début" type="date" value={form.start_date} onChange={(v) => set("start_date", v)} />
          <Field label="Fin" type="date" value={form.end_date} onChange={(v) => set("end_date", v)} />
          <label className="field">
            <span>Devise</span>
            <CurrencyPicker value={form.currency_id} onChange={(id) => set("currency_id", id)} currencies={currencies} />
          </label>
          <label className="field">
            <span>Budget planifié</span>
            <input type="number" min="0" value={form.planned_budget} onChange={(e) => set("planned_budget", e.target.value)} />
          </label>
          <Field label="Durée planifiée (jours)" type="number" value={form.planned_duration_days} onChange={(v) => set("planned_duration_days", v)} />
          <label className="field">
            <span>Mode de plafond</span>
            <select value={form.cap_mode} onChange={(e) => set("cap_mode", e.target.value)}>
              <option value="planning">Planning</option>
              <option value="manual">Manuel</option>
              <option value="off">Désactivé</option>
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.label}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Plan 3D architectural par chantier ────────────────────────────────── */
const Plan3DViewer = React.lazy(() => import("./Plan3DViewer.jsx"));
const Plan3DEditor = React.lazy(() => import("./Plan3DEditor.jsx"));
const Plan2DView = React.lazy(() => import("./Plan2DView.jsx"));
const PlanOriginalView = React.lazy(() => import("./PlanOriginalView.jsx"));
const ROOF_LABELS = { flat: "Plat / terrasse", gable: "2 pentes (pignon)", hip: "4 pentes", none: "Sans toit" };

function Plan3D({ projects, materials, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [model, setModel] = React.useState(undefined); // undefined=chargement, null=aucun
  const [tab, setTab] = React.useState("view3d"); // view2d | view3d | editor
  const [levelIdx, setLevelIdx] = React.useState(0);
  const [isolated, setIsolated] = React.useState(false);
  const [exploded, setExploded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [overlayUrl, setOverlayUrl] = React.useState(null); // plan importé (image) en fond de calque
  const fileRef = React.useRef(null);

  const selected = projects.find((p) => p.id === projectId);

  const load = React.useCallback(() => {
    if (!projectId) { setModel(null); return; }
    setModel(undefined); setError("");
    api.buildingModel(projectId).then((m) => setModel(m)).catch((e) => { setModel(null); setError(String(e.message || e)); });
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const levels = model?.levels || [];
  React.useEffect(() => { if (levelIdx >= levels.length) setLevelIdx(Math.max(0, levels.length - 1)); }, [levels.length, levelIdx]);
  const currentLevel = levels[levelIdx];

  // Calque : charge l'image importée (hors PDF) en object URL pour la mettre en fond de l'éditeur 2D.
  // Chaque étage a désormais son propre plan ; fallback sur le plan du modèle
  // (legacy) uniquement si l'étage courant n'a pas encore le sien.
  const modelId = model?.id;
  const levelId = currentLevel?.id;
  const levelFileKey = currentLevel?.importedFileKey;
  const levelFileFmt = currentLevel?.importedFileFormat;
  const modelFileKey = model?.importedFileKey;
  const modelFileFmt = model?.importedFileFormat;
  React.useEffect(() => {
    let url = null, alive = true;
    setOverlayUrl(null);
    if (levelId && levelFileKey && levelFileFmt !== "pdf") {
      api.levelPlanUrl(levelId).then((r) => { if (alive) { url = r.url; setOverlayUrl(r.url); } }).catch(() => {});
    } else if (modelId && modelFileKey && modelFileFmt !== "pdf" && !levelFileKey) {
      // Fallback legacy : modèle importé avant l'existence du plan par étage.
      api.modelPlanUrl(modelId).then((r) => { if (alive) { url = r.url; setOverlayUrl(r.url); } }).catch(() => {});
    }
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [modelId, modelFileKey, modelFileFmt, levelId, levelFileKey, levelFileFmt]);

  const createModel = async () => {
    setBusy(true); setError("");
    try { await api.createBuildingModel({ project_id: projectId, name: selected?.name }); load(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const addLevel = async () => {
    setBusy(true); setError("");
    try {
      const idx = levels.length;
      await api.createBuildingLevel({ model_id: model.id, project_id: projectId, level_index: idx, label: idx === 0 ? "RDC" : `R+${idx}`, elevation: idx * Number(model.storeyHeight || 2.8), geometry: { rooms: [], walls: [], openings: [] } });
      load(); setTab("editor"); setLevelIdx(idx);
    } catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const removeLevel = async (id) => {
    setBusy(true); setError("");
    try { await api.deleteBuildingLevel(id); load(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const saveLevel = async (id, geometry) => {
    setBusy(true); setError("");
    try { await api.updateBuildingLevel(id, { geometry }); load(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const setRoof = async (roof_type) => {
    setBusy(true); setError("");
    try { await api.updateBuildingModel(model.id, { roof_type }); load(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const uploadPlan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentLevel) return;
    setBusy(true); setError("");
    try { await api.uploadLevelPlan(currentLevel.id, file); load(); setTab("original"); }
    catch (err) { setError(String(err.message || err)); } finally { setBusy(false); }
  };
  const removePlan = async () => {
    if (!currentLevel) return;
    setBusy(true); setError("");
    try { await api.deleteLevelPlan(currentLevel.id); load(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };

  const colors = ["#475569", "#64748b", "#f59e0b", "#6366f1", "#10b981", "#f43f5e"];
  const metre = materials.slice(0, 6).map((m, i) => ({ i: i + 1, c: colors[i % colors.length], name: m.name, q: `${n(m.stock)} ${m.unit}` }));

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow iris">Plan architectural</p><h2 className="title font-display">Maquette 3D{selected ? ` — ${selected.name}` : ""}</h2></div>
        {!fixedProjectId && (
          <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="inline-error" style={{ marginBottom: 12 }}>{error}</div>}

      {model === undefined ? (
        <div className="card pad"><span className="muted">Chargement du plan…</span></div>
      ) : model === null ? (
        <div className="card pad" style={{ textAlign: "center", padding: 32 }}>
          <p className="muted" style={{ marginBottom: 14 }}>Aucun plan 3D pour ce chantier.</p>
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={createModel}><Icon name="plus" /> Créer le plan</button>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6, padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className={`chip ${tab === "view2d" ? "iris-solid grad-iris" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setTab("view2d")}>Vue 2D</button>
              <button type="button" className={`chip ${tab === "view3d" ? "iris-solid grad-iris" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setTab("view3d")}>Vue 3D</button>
              {(currentLevel?.importedFileKey || model.importedFileKey) && <button type="button" className={`chip ${tab === "original" ? "iris-solid grad-iris" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setTab("original")}>Plan original</button>}
              <button type="button" className={`chip ${tab === "editor" ? "iris-solid grad-iris" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setTab("editor")} disabled={!canMutate}>Éditeur</button>
              {currentLevel && (tab === "editor" || tab === "view2d" || tab === "view3d") && (
                <>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={uploadPlan} />
                  <button type="button" className="chip ink" style={{ cursor: "pointer", border: 0 }} disabled={!canMutate || busy} onClick={() => fileRef.current?.click()}><Icon name="filePlus" /> {currentLevel.importedFileKey ? "Remplacer le plan" : "Importer un plan"}</button>
                  {currentLevel.importedFileKey && <button type="button" className="chip rose" style={{ cursor: "pointer", border: 0 }} disabled={!canMutate || busy} onClick={removePlan}>Retirer</button>}
                </>
              )}
              {(tab === "view2d" || tab === "view3d") && levels.length > 0 && (
                <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {levels.map((lv, i) => (
                    <button key={lv.id} type="button" className={`chip ${i === levelIdx ? "amber" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setLevelIdx(i)}>{lv.label || `Niv. ${lv.levelIndex}`}</button>
                  ))}
                  {tab === "view3d" && <>
                    <button type="button" className={`chip ${isolated ? "amber" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setIsolated((v) => !v)}>Isoler</button>
                    <button type="button" className={`chip ${exploded ? "amber" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setExploded((v) => !v)}><Icon name="box" /> Éclatée</button>
                  </>}
                </span>
              )}
            </div>

            {tab === "view3d" ? (
              <div className="viewer3d" style={{ height: 420 }}>
                <ViewerBoundary>
                  <React.Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Chargement du moteur 3D…</div>}>
                    <Plan3DViewer model={model} isolatedIndex={isolated ? levelIdx : null} exploded={exploded} />
                  </React.Suspense>
                </ViewerBoundary>
              </div>
            ) : tab === "view2d" ? (
              <div className="viewer3d" style={{ height: 420, background: "#f8fafc" }}>
                <React.Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Chargement…</div>}>
                  <Plan2DView level={currentLevel} />
                </React.Suspense>
              </div>
            ) : tab === "original" ? (
              <div className="viewer3d" style={{ height: 420, background: "#334155" }}>
                <React.Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Chargement…</div>}>
                  <PlanOriginalView level={currentLevel} model={model} />
                </React.Suspense>
              </div>
            ) : (
              <div className="pad">
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                  <label className="field" style={{ minWidth: 180 }}>
                    <span>Toit</span>
                    <select value={model.roofType} onChange={(e) => setRoof(e.target.value)}>
                      {Object.entries(ROOF_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-ghost" type="button" onClick={addLevel} disabled={busy}>+ Étage</button>
                </div>
                {!levels.length ? (
                  <p className="muted" style={{ fontSize: 13 }}>Aucun étage. Ajoutez un étage pour commencer à dessiner le plan.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                      {levels.map((lv, i) => (
                        <span key={lv.id} style={{ display: "inline-flex", alignItems: "center" }}>
                          <button type="button" className={`chip ${i === levelIdx ? "iris-solid grad-iris" : "ink"}`} style={{ cursor: "pointer", border: 0 }} onClick={() => setLevelIdx(i)}>{lv.label || `Niv. ${lv.levelIndex}`}</button>
                          {i === levelIdx && levels.length > 1 && <button type="button" className="icon-btn" title="Supprimer l'étage" style={{ marginLeft: 2 }} onClick={() => removeLevel(lv.id)}>✕</button>}
                        </span>
                      ))}
                    </div>
                    {currentLevel && (
                      <React.Suspense fallback={<span className="muted">Chargement de l'éditeur…</span>}>
                        <Plan3DEditor level={currentLevel} model={model} busy={busy} onSaveLevel={saveLevel} overlayUrl={overlayUrl} />
                      </React.Suspense>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card pad">
            <p className="kv-title"><Icon name="package" /> Matériaux suivis</p>
            {metre.length ? metre.map((m) => (
              <div className="metre-row" key={m.i}>
                <span className="metre-idx" style={{ background: m.c }}>{m.i}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{m.name}</div><div style={{ color: "var(--ink-400)" }}>{m.q}</div></div>
              </div>
            )) : <p className="muted" style={{ fontSize: 12 }}>Aucun matériau enregistré.</p>}
          </div>
        </>
      )}
    </>
  );
}
/* ── Devis clients (documents sortants — Phase 1) ──────────────────────── */
const DOC_STATUS_TONE = { draft: "ink", sent: "amber", viewed: "amber", accepted: "emerald", refused: "rose", expired: "ink" };
const DOC_STATUS_LABEL = { draft: "Brouillon", sent: "Envoyé", viewed: "Consulté", accepted: "Accepté", refused: "Refusé", expired: "Expiré" };
const emptyDocLine = () => ({ designation: "", quantity: 1, unit_price: 0, vat_rate: 0, phase_id: "" });

function Devis({ projects, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [error, setError] = React.useState("");

  const selected = projects.find((p) => p.id === projectId);
  const cur = selected?.currencyCode;

  const load = React.useCallback(() => {
    if (!projectId) { setDocs([]); setLoading(false); return; }
    setLoading(true);
    api.documents(projectId, "quote")
      .then((d) => setDocs(d || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const openPreview = async (id) => {
    try { const { url } = await api.documentHtmlUrl(id); window.open(url, "_blank", "noopener"); }
    catch (err) { setError(err.message || String(err)); }
  };
  const removeDoc = async (id) => {
    if (!window.confirm("Supprimer ce devis ?")) return;
    try { await api.deleteDocument(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Documents</p><h2 className="title font-display">Devis clients</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={() => setModal({ kind: "new" })}><Icon name="filePlus" /> Nouveau devis</button>
        </div>
      </div>

      {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div className="card table-card">
        <table className="bp">
          <thead><tr><th>Numéro</th><th>Émis le</th><th>Total TTC</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="muted">Chargement…</td></tr> :
              !docs.length ? <tr><td colSpan={5} className="muted">Aucun devis pour ce chantier.</td></tr> :
              docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.number || `#${d.id}`}</td>
                  <td style={{ color: "var(--ink-500)" }}>{d.issueDate || (d.createdAt ? String(d.createdAt).slice(0, 10) : "—")}</td>
                  <td>{money(d.totalTtc, d.currencyCode || cur)}</td>
                  <td><span className={`chip ${DOC_STATUS_TONE[d.status] || "ink"}`}>{DOC_STATUS_LABEL[d.status] || d.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="link" onClick={() => openPreview(d.id)}><Icon name="eye" /> Aperçu</button>
                      {canMutate && <button className="link" onClick={() => setModal({ kind: "edit", id: d.id })}>Modifier</button>}
                      {canMutate && <button className="link" onClick={() => setModal({ kind: "share", id: d.id })}><Icon name="userPlus" /> Envoyer</button>}
                      {canMutate && <button className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removeDoc(d.id)}>Suppr.</button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(modal?.kind === "new" || modal?.kind === "edit") && (
        <DevisEditorModal
          docId={modal.kind === "edit" ? modal.id : null}
          projectId={projectId}
          currencyId={selected?.currencyId}
          currencyCode={cur}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
      {modal?.kind === "share" && <DevisShareModal docId={modal.id} onClose={() => setModal(null)} onShared={load} />}
    </>
  );
}

function DevisEditorModal({ docId, projectId, currencyId, currencyCode, onClose, onSaved }) {
  const [lines, setLines] = React.useState([emptyDocLine()]);
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [phases, setPhases] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(!!docId);
  const currencies = useCurrencies();
  // Devise héritée du chantier par défaut — modifiable via le picker ci-dessous.
  const [docCurrencyId, setDocCurrencyId] = React.useState(currencyId || "");
  const docCurrencyCode = resolveCurrencyCode(currencies, docCurrencyId) || currencyCode;

  React.useEffect(() => {
    api.phases(projectId).then((p) => setPhases(p || [])).catch(() => setPhases([]));
    if (docId) {
      api.getDocument(docId)
        .then((d) => {
          setLines((d.lines || []).length ? d.lines.map((l) => ({ designation: l.designation, quantity: l.quantity, unit_price: l.unitPrice, vat_rate: l.vatRate, phase_id: l.phaseId || "" })) : [emptyDocLine()]);
          setDueDate(d.dueDate || "");
          setNotes(d.notes || "");
        })
        .catch((e) => setError(e.message || String(e)))
        .finally(() => setLoading(false));
    }
  }, [docId, projectId]);

  const setLine = (i, k, v) => setLines((c) => c.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((c) => [...c, emptyDocLine()]);
  const removeLine = (i) => setLines((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : c));

  const totalHt = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price), 0);
  const totalVat = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price) * (n(l.vat_rate) / 100), 0);
  const totalTtc = totalHt + totalVat;

  const save = async () => {
    setError("");
    const clean = lines.filter((l) => l.designation.trim());
    if (!clean.length) { setError("Ajoutez au moins une ligne."); return; }
    setBusy(true);
    try {
      const payload = {
        project_id: projectId,
        currency_id: docCurrencyId || undefined,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
        lines: clean.map((l) => ({
          designation: l.designation.trim(),
          quantity: n(l.quantity),
          unit_price: n(l.unit_price),
          vat_rate: n(l.vat_rate),
          phase_id: l.phase_id ? Number(l.phase_id) : undefined,
        })),
      };
      docId ? await api.updateDocument(docId, payload) : await api.createDocument(payload);
      onSaved();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 720 }}>
        <div className="modal-head">
          <div><h2 className="font-display">{docId ? "Modifier le devis" : "Nouveau devis"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        {loading ? <p className="muted">Chargement…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="field" style={{ maxWidth: 220 }}>
              <span>Devise</span>
              <CurrencyPicker value={docCurrencyId} onChange={setDocCurrencyId} currencies={currencies} />
            </label>
            {/* scroll horizontal tactile plutot que flexWrap sur mobile */}
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-500)" }}>
                    <th style={{ padding: "6px" }}>Désignation</th><th style={{ padding: "6px" }}>Qté</th><th style={{ padding: "6px" }}>P.U.</th>
                    <th style={{ padding: "6px" }}>TVA %</th><th style={{ padding: "6px" }}>Phase</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td style={{ padding: "3px 6px" }}><input value={l.designation} onChange={(e) => setLine(i, "designation", e.target.value)} style={{ minWidth: 180, width: "100%" }} placeholder="Prestation…" /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} style={{ width: 70 }} /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" step="any" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} style={{ width: 90 }} /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" max="100" step="any" value={l.vat_rate} onChange={(e) => setLine(i, "vat_rate", e.target.value)} style={{ width: 70 }} /></td>
                      <td style={{ padding: "3px 6px" }}>
                        <select value={l.phase_id} onChange={(e) => setLine(i, "phase_id", e.target.value)} style={{ minWidth: 120 }}>
                          <option value="">—</option>
                          {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "3px 6px" }}><button type="button" className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removeLine(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="link" onClick={addLine}>+ Ajouter une ligne</button>

            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total HT</span><strong>{money(totalHt, docCurrencyCode)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>TVA</span><strong>{money(totalVat, docCurrencyCode)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}><span>Total TTC</span><strong>{money(totalTtc, docCurrencyCode)}</strong></div>
            </div>

            <label className="field"><span>Validité / échéance</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label className="field"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 60 }} placeholder="Précisions…" /></label>

            {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
            <button className="btn btn-amber grad-amber" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer le devis"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DevisShareModal({ docId, onClose, onShared }) {
  const [link, setLink] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const generate = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.shareDocument(docId);
      setLink(clientDocumentUrl(res.token));
      onShared && onShared();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };
  const copy = () => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ } };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Votre devis : ${link}`)}`, "_blank", "noopener");

  React.useEffect(() => { generate(); }, []);

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div><h2 className="font-display">Envoyer au client</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
        {busy && !link ? <p className="muted">Génération du lien…</p> : link ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--ink-500)" }}>Partagez ce lien avec le client (il pourra consulter et accepter le devis) :</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--ink-200, #cbd5e1)", borderRadius: 8, fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</button>
              <button className="btn btn-amber grad-amber" onClick={whatsapp}>WhatsApp</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Bons de commande (documents sortants — Phase 2) ─────────────────────
   Calque de Devis : meme socle batipro_documents (type=purchase_order),
   ajoute le rattachement fournisseur/sous-traitant + le suivi budgétaire
   chantier (devis accepté vs BC engagés vs budget/contrat). */
const PO_STATUS_TONE = { draft: "ink", sent: "amber", confirmed: "emerald", received: "emerald", cancelled: "rose" };
const PO_STATUS_LABEL = { draft: "Brouillon", sent: "Envoyé", confirmed: "Confirmé", received: "Réceptionné", cancelled: "Annulé" };
const emptyPoLine = () => ({ designation: "", quantity: 1, unit_price: 0, vat_rate: 0, phase_id: "", material_id: "" });

function BonsCommande({ projects, canMutate, fixedProjectId, materials }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [docs, setDocs] = React.useState([]);
  const [budget, setBudget] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(0);

  const selected = projects.find((p) => p.id === projectId);
  const cur = selected?.currencyCode;

  const load = React.useCallback(() => {
    if (!projectId) { setDocs([]); setBudget(null); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.documents(projectId, "purchase_order"),
      api.budgetSummary(projectId).catch(() => null),
    ])
      .then(([d, b]) => { setDocs(d || []); setBudget(b); })
      .catch(() => { setDocs([]); setBudget(null); })
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const openPreview = async (id) => {
    try { const { url } = await api.documentHtmlUrl(id); window.open(url, "_blank", "noopener"); }
    catch (err) { setError(err.message || String(err)); }
  };
  const removeDoc = async (id) => {
    if (!window.confirm("Supprimer ce bon de commande ?")) return;
    try { await api.deleteDocument(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };
  const pay = async (d) => {
    const balance = Math.max(0, n(d.totalTtc) - n(d.paidAmount));
    const raw = window.prompt(`Montant du règlement (solde : ${money(balance, d.currencyCode || cur)}) :`, String(balance));
    if (raw == null) return;
    const amount = Number(raw);
    if (!(amount > 0)) { setError("Montant invalide."); return; }
    setError(""); setNotice(""); setBusy(d.id);
    try {
      const r = await api.recordPayment(d.id, amount);
      setNotice(`Règlement enregistré. Solde : ${money(r.balance, d.currencyCode || cur)}.`);
      load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(0); }
  };

  const postPurchase = async (d) => {
    if (!window.confirm("Comptabiliser ce bon de commande ? Une écriture comptable d'achat sera créée.")) return;
    setError(""); setNotice(""); setBusy(d.id);
    try {
      const r = await api.postPurchase(d.id);
      setNotice(r?.deferred
        ? "Bon de commande comptabilisé. Écriture comptable EN ATTENTE d'approbation (gate)."
        : `Bon de commande comptabilisé${r?.ledger_entry_id ? ` (écriture #${r.ledger_entry_id})` : ""}.`);
      load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(0); }
  };

  const budgetCur = budget?.currency_code || cur;

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Documents</p><h2 className="title font-display">Bons de commande</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={() => setModal({ kind: "new" })}><Icon name="filePlus" /> Nouveau BC</button>
        </div>
      </div>

      {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {notice && <div style={{ color: "var(--emerald-600, #047857)", fontSize: 13, marginBottom: 8 }}>{notice}</div>}

      {budget && (
        <div className="card pad" style={{ marginBottom: 12 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Suivi budgétaire chantier</p>
          <BudgetBar
            label="Engagé (BC) vs budget/contrat"
            txt={`${money(budget.purchase_orders_engaged, budgetCur)} / ${money(budget.contract_amount || budget.budget, budgetCur)}`}
            pct={budget.engagement_rate != null ? Math.min(100, Math.round(budget.engagement_rate)) : 0}
          />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--ink-500)" }}>
            <span>Devis accepté (prévu) : <strong style={{ color: "var(--ink-900, #111)" }}>{money(budget.quote_accepted, budgetCur)}</strong></span>
            <span>Déjà dépensé : <strong style={{ color: "var(--ink-900, #111)" }}>{money(budget.spent, budgetCur)}</strong></span>
            <span>Reste vs budget : <strong style={{ color: "var(--ink-900, #111)" }}>{money(budget.remaining_vs_budget, budgetCur)}</strong></span>
          </div>
        </div>
      )}

      <div className="card table-card">
        <table className="bp">
          <thead><tr><th>Numéro</th><th>Fournisseur / sous-traitant</th><th>Émis le</th><th>Total TTC</th><th>Payé / solde</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="muted">Chargement…</td></tr> :
              !docs.length ? <tr><td colSpan={7} className="muted">Aucun bon de commande pour ce chantier.</td></tr> :
              docs.map((d) => {
                const balance = Math.max(0, n(d.totalTtc) - n(d.paidAmount));
                const canPay = canMutate && d.status !== "draft" && d.status !== "cancelled";
                const canPost = canMutate && d.status !== "draft" && d.status !== "cancelled" && !d.ledgerEntryId;
                return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.number || `#${d.id}`}</td>
                  <td>{d.supplierName || d.subcontractorName || "—"}</td>
                  <td style={{ color: "var(--ink-500)" }}>{d.issueDate || (d.createdAt ? String(d.createdAt).slice(0, 10) : "—")}</td>
                  <td>{money(d.totalTtc, d.currencyCode || cur)}</td>
                  <td style={{ color: "var(--ink-500)", fontSize: 12 }}>
                    {money(n(d.paidAmount), d.currencyCode || cur)} / solde {money(balance, d.currencyCode || cur)}
                  </td>
                  <td><span className={`chip ${PO_STATUS_TONE[d.status] || "ink"}`}>{PO_STATUS_LABEL[d.status] || d.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="link" onClick={() => openPreview(d.id)}><Icon name="eye" /> Aperçu</button>
                      {canPost && <button className="link" disabled={busy === d.id} onClick={() => postPurchase(d)}>Comptabiliser</button>}
                      {canPay && <button className="link" disabled={busy === d.id} onClick={() => pay(d)}>Régler</button>}
                      {canMutate && <button className="link" onClick={() => setModal({ kind: "edit", id: d.id })}>Modifier</button>}
                      {canMutate && <button className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removeDoc(d.id)}>Suppr.</button>}
                    </div>
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {(modal?.kind === "new" || modal?.kind === "edit") && (
        <BonCommandeEditorModal
          docId={modal.kind === "edit" ? modal.id : null}
          projectId={projectId}
          currencyId={selected?.currencyId}
          currencyCode={cur}
          materials={materials}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function BonCommandeEditorModal({ docId, projectId, currencyId, currencyCode, materials, onClose, onSaved }) {
  const [lines, setLines] = React.useState([emptyPoLine()]);
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [phases, setPhases] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [subcontractors, setSubcontractors] = React.useState([]);
  const [supplierId, setSupplierId] = React.useState("");
  const [subcontractorId, setSubcontractorId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(!!docId);
  // Scan OCR (pre-remplissage) : le formulaire reste entierement editable ensuite.
  const [scanBusy, setScanBusy] = React.useState(false);
  const [scanPhotoId, setScanPhotoId] = React.useState(null);
  const [scanJustApplied, setScanJustApplied] = React.useState(false);
  const scanInputRef = React.useRef(null);
  const currencies = useCurrencies();
  // Devise héritée du chantier par défaut — modifiable via le picker ci-dessous.
  const [docCurrencyId, setDocCurrencyId] = React.useState(currencyId || "");
  const docCurrencyCode = resolveCurrencyCode(currencies, docCurrencyId) || currencyCode;

  React.useEffect(() => {
    api.phases(projectId).then((p) => setPhases(p || [])).catch(() => setPhases([]));
    api.suppliers().then((s) => setSuppliers(s || [])).catch(() => setSuppliers([]));
    api.subcontractors().then((s) => setSubcontractors(s || [])).catch(() => setSubcontractors([]));
    if (docId) {
      api.getDocument(docId)
        .then((d) => {
          setLines((d.lines || []).length ? d.lines.map((l) => ({ designation: l.designation, quantity: l.quantity, unit_price: l.unitPrice, vat_rate: l.vatRate, phase_id: l.phaseId || "", material_id: l.materialId || "" })) : [emptyPoLine()]);
          setDueDate(d.dueDate || "");
          setNotes(d.notes || "");
          setSupplierId(d.supplierId || "");
          setSubcontractorId(d.subcontractorId || "");
        })
        .catch((e) => setError(e.message || String(e)))
        .finally(() => setLoading(false));
      // Document deja cree : retrouve la photo source du scan (traçabilité) en
      // filtrant la galerie du chantier par linkedDocumentId — pas de nouvel
      // endpoint backend necessaire, listPhotos renvoie deja toutes les colonnes.
      api.listPhotos(projectId)
        .then((photos) => {
          const src = (photos || []).find((p) => p.linkedDocumentId === docId);
          if (src) setScanPhotoId(src.id);
        })
        .catch(() => {});
    }
  }, [docId, projectId]);

  const setLine = (i, k, v) => setLines((c) => c.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((c) => [...c, emptyPoLine()]);
  const removeLine = (i) => setLines((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : c));

  const totalHt = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price), 0);
  const totalVat = lines.reduce((s, l) => s + n(l.quantity) * n(l.unit_price) * (n(l.vat_rate) / 100), 0);
  const totalTtc = totalHt + totalVat;

  // Upload immediat + OCR best-effort. Pre-remplit les champs EXISTANTS du
  // formulaire (fournisseur/lignes/echeance/notes) qui restent 100% editables
  // ensuite — aucun champ ne devient lecture seule.
  const handleScanFile = async (file) => {
    if (!file) return;
    setError(""); setScanBusy(true); setScanJustApplied(false);
    try {
      const res = await api.ocrScanDocument(projectId, file);
      setScanPhotoId(res?.photoId ?? null);
      const parsed = res?.parsed || {};
      if (parsed.supplierName) {
        const match = suppliers.find((s) => s.name && s.name.trim().toLowerCase() === parsed.supplierName.trim().toLowerCase());
        if (match) setSupplierId(String(match.id));
      }
      if (parsed.date) {
        // JJ/MM/AAAA ou JJ-MM-AAAA -> input date (AAAA-MM-JJ)
        const m = parsed.date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
          const [, d, mo, y] = m;
          const yyyy = y.length === 2 ? `20${y}` : y;
          setDueDate(`${yyyy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
        }
      }
      const noteBits = [];
      if (parsed.documentNumber) noteBits.push(`N° document fournisseur : ${parsed.documentNumber}`);
      if (parsed.totalHt != null) noteBits.push(`Total HT scanné : ${parsed.totalHt}`);
      if (parsed.totalTtc != null) noteBits.push(`Total TTC scanné : ${parsed.totalTtc}`);
      if (noteBits.length) setNotes((c) => (c ? `${c}\n${noteBits.join(" — ")}` : noteBits.join(" — ")));
      if (Array.isArray(parsed.lines) && parsed.lines.length) {
        setLines(parsed.lines.map((l) => ({
          designation: l.designation || "",
          quantity: l.quantity ?? 1,
          unit_price: l.unitPrice ?? 0,
          vat_rate: 0,
          phase_id: "",
          material_id: "",
        })));
      }
      setScanJustApplied(true);
    } catch (err) { setError(err.message || String(err)); }
    finally { setScanBusy(false); }
  };

  const save = async () => {
    setError("");
    const clean = lines.filter((l) => l.designation.trim());
    if (!clean.length) { setError("Ajoutez au moins une ligne."); return; }
    setBusy(true);
    try {
      const payload = {
        project_id: projectId,
        type: "purchase_order",
        currency_id: docCurrencyId || undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
        subcontractor_id: subcontractorId ? Number(subcontractorId) : undefined,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
        ...(docId ? {} : { sourcePhotoId: scanPhotoId || undefined }),
        lines: clean.map((l) => ({
          designation: l.designation.trim(),
          quantity: n(l.quantity),
          unit_price: n(l.unit_price),
          vat_rate: n(l.vat_rate),
          phase_id: l.phase_id ? Number(l.phase_id) : undefined,
          material_id: l.material_id ? Number(l.material_id) : undefined,
        })),
      };
      docId ? await api.updateDocument(docId, payload) : await api.createDocument(payload);
      onSaved();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: scanPhotoId ? 1040 : 720 }}>
        <div className="modal-head">
          <div><h2 className="font-display">{docId ? "Modifier le bon de commande" : "Nouveau bon de commande"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        {loading ? <p className="muted">Chargement…</p> : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 480px", minWidth: 280 }}>
            {!docId && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <input
                  ref={scanInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleScanFile(f); }}
                />
                <button type="button" className="btn btn-ghost" disabled={scanBusy} onClick={() => scanInputRef.current?.click()}>
                  <Icon name={scanBusy ? "loader" : "camera"} /> {scanBusy ? "Analyse du document…" : "Scanner un document"}
                </button>
                {scanJustApplied && (
                  <span className="chip amber" style={{ fontSize: 12 }}>Champs extraits automatiquement — vérifiez avant d'enregistrer</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                <span>Fournisseur</span>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">—</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="field" style={{ flex: 1, minWidth: 200 }}>
                <span>Sous-traitant</span>
                <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)}>
                  <option value="">—</option>
                  {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="field" style={{ flex: 1, minWidth: 180 }}>
                <span>Devise</span>
                <CurrencyPicker value={docCurrencyId} onChange={setDocCurrencyId} currencies={currencies} />
              </label>
            </div>

            {/* scroll horizontal tactile plutot que flexWrap sur mobile */}
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-500)" }}>
                    <th style={{ padding: "6px" }}>Désignation</th><th style={{ padding: "6px" }}>Qté</th><th style={{ padding: "6px" }}>P.U.</th>
                    <th style={{ padding: "6px" }}>TVA %</th><th style={{ padding: "6px" }}>Phase</th><th style={{ padding: "6px" }}>Matériau suivi en stock</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td style={{ padding: "3px 6px" }}><input value={l.designation} onChange={(e) => setLine(i, "designation", e.target.value)} style={{ minWidth: 180, width: "100%" }} placeholder="Article / prestation…" /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} style={{ width: 70 }} /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" step="any" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} style={{ width: 90 }} /></td>
                      <td style={{ padding: "3px 6px" }}><input type="number" min="0" max="100" step="any" value={l.vat_rate} onChange={(e) => setLine(i, "vat_rate", e.target.value)} style={{ width: 70 }} /></td>
                      <td style={{ padding: "3px 6px" }}>
                        <select value={l.phase_id} onChange={(e) => setLine(i, "phase_id", e.target.value)} style={{ minWidth: 120 }}>
                          <option value="">—</option>
                          {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "3px 6px" }}>
                        <select value={l.material_id} onChange={(e) => setLine(i, "material_id", e.target.value)} style={{ minWidth: 140 }}>
                          <option value="">— (texte libre)</option>
                          {(materials || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "3px 6px" }}><button type="button" className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removeLine(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="link" onClick={addLine}>+ Ajouter une ligne</button>

            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total HT</span><strong>{money(totalHt, docCurrencyCode)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>TVA</span><strong>{money(totalVat, docCurrencyCode)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}><span>Total TTC</span><strong>{money(totalTtc, docCurrencyCode)}</strong></div>
            </div>

            <label className="field"><span>Échéance / livraison prévue</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label className="field"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 60 }} placeholder="Précisions…" /></label>

            {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
            <button className="btn btn-amber grad-amber" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer le bon de commande"}</button>
          </div>
          {scanPhotoId != null && (
            <div style={{ flex: "1 1 260px", minWidth: 220, maxWidth: 320 }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Document scanné</p>
              <ScanSourcePreview photoId={scanPhotoId} />
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

// Apercu du document source (photo/PDF scanné) — meme helper que la galerie
// Photos (api.photoBlobUrl : fetch blob authentifié, jamais <img src> direct
// vers l'API). Consultable pendant la saisie ET, via ce meme composant, dans
// la fiche du document une fois créé.
function ScanSourcePreview({ photoId }) {
  const [src, setSrc] = React.useState(null);
  const [type, setType] = React.useState(null);
  React.useEffect(() => {
    let revoke; let active = true;
    api.photoBlobUrl(photoId).then(({ url, type: t }) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      revoke = url; setSrc(url); setType(t);
    }).catch(() => {});
    return () => { active = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [photoId]);

  if (!src) return <p className="muted" style={{ fontSize: 12 }}>Chargement de l'aperçu…</p>;
  if (type === "application/pdf") {
    return <embed src={src} type="application/pdf" style={{ width: "100%", height: 360, border: "1px solid var(--ink-200, #cbd5e1)", borderRadius: 8 }} />;
  }
  return <img src={src} alt="Document scanné" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--ink-200, #cbd5e1)" }} />;
}

/* ── Situations de travaux (Phase 3 — documentaire, type=situation) ───────
   Nouveau : décompte périodique d'avancement branché sur les PHASES du chantier,
   sur le socle batipro_documents (type=situation). COEXISTE avec l'onglet legacy
   "Situations & avenants" (table batipro_situations) — aucun des deux ne casse
   l'autre. Montant de période calculé serveur = marché_phase × (Δ avancement). */
const SIT_DOC_STATUS_TONE = { draft: "ink", submitted: "amber", validated: "emerald", invoiced: "emerald" };
const SIT_DOC_STATUS_LABEL = { draft: "Brouillon", submitted: "Soumise", validated: "Validée", invoiced: "Facturée" };

function SituationsTravaux({ projects, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(false);
  const [error, setError] = React.useState("");

  const selected = projects.find((p) => p.id === projectId);
  const cur = selected?.currencyCode;

  const load = React.useCallback(() => {
    if (!projectId) { setDocs([]); setLoading(false); return; }
    setLoading(true);
    api.documents(projectId, "situation")
      .then((d) => setDocs(d || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const openPreview = async (id) => {
    try { const { url } = await api.documentHtmlUrl(id); window.open(url, "_blank", "noopener"); }
    catch (err) { setError(err.message || String(err)); }
  };
  const removeDoc = async (id) => {
    if (!window.confirm("Supprimer cette situation de travaux ?")) return;
    try { await api.deleteDocument(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Documents</p><h2 className="title font-display">Situations de travaux</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={() => setModal(true)}><Icon name="filePlus" /> Nouvelle situation</button>
        </div>
      </div>

      {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div className="card table-card">
        <table className="bp">
          <thead><tr><th>Numéro</th><th>Période</th><th>Émise le</th><th>Montant période TTC</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> :
              !docs.length ? <tr><td colSpan={6} className="muted">Aucune situation de travaux pour ce chantier.</td></tr> :
              docs.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.number || `#${d.id}`}</td>
                  <td style={{ color: "var(--ink-500)" }}>{(d.notes && /Période\s*:\s*([^\n]+)/.exec(d.notes)?.[1]) || "—"}</td>
                  <td style={{ color: "var(--ink-500)" }}>{d.issueDate || (d.createdAt ? String(d.createdAt).slice(0, 10) : "—")}</td>
                  <td>{money(d.totalTtc, d.currencyCode || cur)}</td>
                  <td><span className={`chip ${SIT_DOC_STATUS_TONE[d.status] || "ink"}`}>{SIT_DOC_STATUS_LABEL[d.status] || d.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="link" onClick={() => openPreview(d.id)}><Icon name="eye" /> Aperçu</button>
                      {canMutate && <button className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removeDoc(d.id)}>Suppr.</button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <SituationTravauxEditorModal
          projectId={projectId}
          currencyId={selected?.currencyId}
          currencyCode={cur}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </>
  );
}

/* ── Factures (Phase 4 — type=invoice, compta ledger) ─────────────────────
   Génération depuis une situation VALIDÉE, émission (= comptabilisation ledger
   via postByRules, idempotent), suivi paiement/solde. Montants + devise DB. */
const INV_STATUS_TONE = { draft: "ink", issued: "amber", paid: "emerald", cancelled: "rose" };
const INV_STATUS_LABEL = { draft: "Brouillon", issued: "Émise", paid: "Payée", cancelled: "Annulée" };

function Factures({ projects, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [invoices, setInvoices] = React.useState([]);
  const [situations, setSituations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(0);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const selected = projects.find((p) => p.id === projectId);
  const cur = selected?.currencyCode;

  const load = React.useCallback(() => {
    if (!projectId) { setInvoices([]); setSituations([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.invoices(projectId).catch(() => []),
      api.documents(projectId, "situation").catch(() => []),
    ])
      .then(([inv, sit]) => {
        setInvoices(inv || []);
        // Seules les situations VALIDÉES (pas encore facturées) sont facturables.
        setSituations((sit || []).filter((s) => s.status === "validated"));
      })
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const openPreview = async (id) => {
    try { const { url } = await api.documentHtmlUrl(id); window.open(url, "_blank", "noopener"); }
    catch (err) { setError(err.message || String(err)); }
  };

  const generateFrom = async (situationId) => {
    setError(""); setNotice(""); setBusy(situationId);
    try { await api.createInvoiceFromSituation(situationId); setNotice("Facture générée (brouillon)."); load(); }
    catch (err) { setError(err.message || String(err)); }
    finally { setBusy(0); }
  };

  const issue = async (id) => {
    if (!window.confirm("Émettre et comptabiliser cette facture ? Une écriture comptable sera créée.")) return;
    setError(""); setNotice(""); setBusy(id);
    try {
      const r = await api.issueInvoice(id);
      setNotice(r?.deferred
        ? "Facture émise. Écriture comptable EN ATTENTE d'approbation (gate)."
        : `Facture émise et comptabilisée${r?.ledger_entry_id ? ` (écriture #${r.ledger_entry_id})` : ""}.`);
      load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(0); }
  };

  const pay = async (d) => {
    const balance = Math.max(0, n(d.totalTtc) - n(d.paidAmount));
    const raw = window.prompt(`Montant du règlement (solde : ${money(balance, d.currencyCode || cur)}) :`, String(balance));
    if (raw == null) return;
    const amount = Number(raw);
    if (!(amount > 0)) { setError("Montant invalide."); return; }
    setError(""); setNotice(""); setBusy(d.id);
    try {
      const r = await api.recordPayment(d.id, amount);
      setNotice(`Règlement enregistré. Solde : ${money(r.balance, d.currencyCode || cur)}.`);
      load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(0); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Documents</p><h2 className="title font-display">Factures</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {notice && <div style={{ color: "var(--emerald-600, #047857)", fontSize: 13, marginBottom: 8 }}>{notice}</div>}

      {canMutate && situations.length > 0 && (
        <div className="card pad" style={{ marginBottom: 12 }}>
          <div className="kpi-label" style={{ marginBottom: 6 }}>Situations validées à facturer</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {situations.map((s) => (
              <button key={s.id} className="btn btn-amber grad-amber" disabled={busy === s.id} onClick={() => generateFrom(s.id)}>
                <Icon name="filePlus" /> {s.number || `#${s.id}`} — {money(s.totalTtc, s.currencyCode || cur)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card table-card" style={{ overflowX: "auto" }}>
        <table className="bp">
          <thead><tr><th>Numéro</th><th>Émise le</th><th>Total TTC</th><th>Réglé</th><th>Solde</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="muted">Chargement…</td></tr> :
              !invoices.length ? <tr><td colSpan={7} className="muted">Aucune facture pour ce chantier.</td></tr> :
              invoices.map((d) => {
                const balance = Math.max(0, n(d.totalTtc) - n(d.paidAmount));
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.number || `#${d.id}`}</td>
                    <td style={{ color: "var(--ink-500)" }}>{d.issueDate || (d.createdAt ? String(d.createdAt).slice(0, 10) : "—")}</td>
                    <td>{money(d.totalTtc, d.currencyCode || cur)}</td>
                    <td>{money(d.paidAmount, d.currencyCode || cur)}</td>
                    <td>{money(balance, d.currencyCode || cur)}</td>
                    <td><span className={`chip ${INV_STATUS_TONE[d.status] || "ink"}`}>{INV_STATUS_LABEL[d.status] || d.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="link" onClick={() => openPreview(d.id)}><Icon name="eye" /> Aperçu</button>
                        {canMutate && d.status === "draft" && (
                          <button className="link" disabled={busy === d.id} onClick={() => issue(d.id)}>Émettre / Comptabiliser</button>
                        )}
                        {canMutate && (d.status === "issued") && (
                          <button className="link" style={{ color: "var(--emerald-600)" }} disabled={busy === d.id} onClick={() => pay(d)}>Encaisser</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SituationTravauxEditorModal({ projectId, currencyId, currencyCode, onClose, onSaved }) {
  const [advancement, setAdvancement] = React.useState(null);
  const [rows, setRows] = React.useState([]); // { phase_id, label, contract_amount, previous_progress_pct, progress_pct }
  const [period, setPeriod] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const currencies = useCurrencies();
  // Devise héritée du chantier par défaut — modifiable via le picker ci-dessous.
  const [docCurrencyId, setDocCurrencyId] = React.useState(currencyId || "");
  const docCurrencyCode = resolveCurrencyCode(currencies, docCurrencyId) || currencyCode;

  React.useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.situationsAdvancement(projectId)
      .then((a) => {
        setAdvancement(a);
        setRows((a.phases || []).map((p) => ({
          phase_id: p.phase_id,
          label: p.label,
          contract_amount: p.contract_amount,
          previous_progress_pct: p.previous_progress_pct,
          // Pré-remplit avec le cumul précédent (le gestionnaire relève à la valeur courante).
          progress_pct: p.previous_progress_pct,
          payment_cap: p.payment_cap,
          over_cap: p.over_cap,
        })));
      })
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [projectId]);

  const setRow = (i, v) => setRows((c) => c.map((r, idx) => (idx === i ? { ...r, progress_pct: v } : r)));

  // Aperçu du montant de période = marché_phase × (courant − précédent) borné ≥ 0.
  const periodAmount = (r) => Math.max(0, n(r.progress_pct) - n(r.previous_progress_pct)) / 100 * n(r.contract_amount);
  const totalPeriod = rows.reduce((s, r) => s + periodAmount(r), 0);

  const save = async () => {
    setError("");
    // Ne garde que les phases avec un avancement en progression (delta > 0).
    const lines = rows
      .filter((r) => n(r.progress_pct) > n(r.previous_progress_pct))
      .map((r) => ({ phase_id: r.phase_id, progress_pct: n(r.progress_pct) }));
    if (!lines.length) { setError("Relevez l'avancement d'au moins une phase (au-dessus du cumul précédent)."); return; }
    setBusy(true);
    try {
      await api.createSituationDocument({
        project_id: projectId,
        period: period.trim() || undefined,
        currency_id: docCurrencyId || undefined,
        notes: notes.trim() || undefined,
        lines,
      });
      onSaved();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 760 }}>
        <div className="modal-head">
          <div><h2 className="font-display">Nouvelle situation de travaux</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        {loading ? <p className="muted">Chargement…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label className="field" style={{ flex: 1, minWidth: 160 }}><span>Période</span><input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="ex. Juin 2026" /></label>
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>Devise</span>
                <CurrencyPicker value={docCurrencyId} onChange={setDocCurrencyId} currencies={currencies} />
              </label>
            </div>

            {!rows.length ? (
              <p className="muted">Ce chantier n'a aucune phase. Ajoutez des phases (onglet Planning) pour établir une situation.</p>
            ) : (
              /* scroll horizontal tactile plutot que flexWrap sur mobile */
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--ink-500)" }}>
                      <th style={{ padding: "6px" }}>Phase</th>
                      <th style={{ padding: "6px" }}>Marché</th>
                      <th style={{ padding: "6px" }}>Cumul préc.</th>
                      <th style={{ padding: "6px" }}>Avanc. cumulé %</th>
                      <th style={{ padding: "6px" }}>Montant période</th>
                      <th style={{ padding: "6px" }}>Plafond à ce jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.phase_id}>
                        <td style={{ padding: "3px 6px" }}>
                          {r.label}
                          {r.over_cap && (
                            <span className="chip rose" style={{ marginLeft: 6 }} title="L'avancement réel dépasse le plafond planifié">⚠ Dépasse le plafond planifié</span>
                          )}
                        </td>
                        <td style={{ padding: "3px 6px", color: "var(--ink-500)" }}>{money(r.contract_amount, docCurrencyCode)}</td>
                        <td style={{ padding: "3px 6px", color: "var(--ink-500)" }}>{n(r.previous_progress_pct).toFixed(2)} %</td>
                        <td style={{ padding: "3px 6px" }}>
                          <input type="number" min={r.previous_progress_pct} max="100" step="any" value={r.progress_pct} onChange={(e) => setRow(i, e.target.value)} style={{ width: 90 }} />
                        </td>
                        <td style={{ padding: "3px 6px", fontWeight: 600 }}>{money(periodAmount(r), docCurrencyCode)}</td>
                        <td style={{ padding: "3px 6px", color: r.over_cap ? "var(--rose-700, #be123c)" : "var(--ink-500)" }}>
                          {r.payment_cap != null ? money(r.payment_cap, docCurrencyCode) : "Aucun plafond"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card pad" style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
              <span>Montant HT à facturer sur la période</span><strong>{money(totalPeriod, docCurrencyCode)}</strong>
            </div>
            <p className="muted" style={{ fontSize: 11 }}>Le montant définitif (TVA/TTC) est recalculé côté serveur à l'enregistrement, sur la base du marché de chaque phase (devis acceptés du chantier).</p>

            <label className="field"><span>Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 60 }} placeholder="Précisions…" /></label>

            {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
            <button className="btn btn-amber grad-amber" disabled={busy || !rows.length} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer la situation"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Photos de chantier (galerie + rapport imprimable) ─────────────────── */
function dateInputValue(v) {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
function formatDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("fr-CA"); } catch { return String(v).slice(0, 10); }
}

function SitePhotos({ projects, tasks, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [photos, setPhotos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [modal, setModal] = React.useState(null); // { kind: "upload" | "edit" | "lightbox" | "report", ... }

  const projectTasks = tasks.filter((t) => t.projectId === projectId);

  const load = React.useCallback(() => {
    if (!projectId) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    api.listPhotos(projectId)
      .then((p) => setPhotos(p || []))
      .catch((e) => { setPhotos([]); setError(e.message || String(e)); })
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const removePhoto = async (id) => {
    if (!window.confirm("Retirer cette photo de la galerie ?")) return;
    try { await api.deletePhoto(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Suivi</p><h2 className="title font-display">Photos de chantier</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn btn-ghost" disabled={!projectId} onClick={() => setModal({ kind: "report" })}><Icon name="fileDown" /> Générer un rapport</button>
          <button className="btn btn-amber grad-amber" disabled={!canMutate || !projectId} onClick={() => setModal({ kind: "upload" })}><Icon name="camera" /> Ajouter une photo</button>
        </div>
      </div>

      {error && <div className="inline-error">{error}</div>}

      <div className="card pad">
        {loading ? <p className="muted">Chargement…</p> :
          !photos.length ? <p className="muted">Aucune photo pour ce chantier.</p> : (
          <div className="photo-grid">
            {photos.map((p) => <PhotoThumb key={p.id} photo={p} onOpen={() => setModal({ kind: "lightbox", photo: p })} />)}
          </div>
        )}
      </div>

      {modal?.kind === "upload" && (
        <PhotoUploadModal projectId={projectId} tasks={projectTasks} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === "lightbox" && (
        <PhotoLightbox
          photo={modal.photo}
          tasks={projectTasks}
          canMutate={canMutate}
          onClose={() => setModal(null)}
          onDeleted={() => { setModal(null); load(); }}
          onSaved={(updated) => { setModal(null); load(); }}
          removePhoto={removePhoto}
        />
      )}
      {modal?.kind === "report" && (
        <ReportModal projectId={projectId} onClose={() => setModal(null)} />
      )}
    </>
  );
}

// Vignette : le fichier est protégé par JWT donc jamais de <img src> direct
// vers l'API — on récupère un blob authentifié (api.photoBlobUrl) puis on
// affiche une object URL locale, révoquée au démontage.
function PhotoThumb({ photo, onOpen }) {
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => {
    let revoke;
    let active = true;
    api.photoBlobUrl(photo.id).then(({ url }) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      revoke = url; setSrc(url);
    }).catch(() => {});
    return () => { active = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [photo.id]);

  return (
    <button type="button" className="photo-thumb" onClick={onOpen}>
      {src ? <img src={src} alt={photo.caption || "Photo de chantier"} /> : <span className="muted" style={{ fontSize: 11 }}>…</span>}
      <span className="photo-thumb-date">{formatDate(photo.takenAt)}</span>
    </button>
  );
}

function PhotoUploadModal({ projectId, tasks, onClose, onSaved }) {
  const [file, setFile] = React.useState(null);
  const [caption, setCaption] = React.useState("");
  const [takenAt, setTakenAt] = React.useState(dateInputValue(new Date().toISOString()));
  const [taskId, setTaskId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const save = async () => {
    if (!file) { setError("Choisissez ou prenez une photo."); return; }
    setError(""); setBusy(true);
    try {
      await api.uploadPhoto(projectId, file, { caption: caption.trim() || undefined, takenAt: takenAt || undefined, taskId: taskId ? Number(taskId) : undefined });
      onSaved();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div><h2 className="font-display">Ajouter une photo</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className="field">
            <span>Photo</span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <label className="field"><span>Légende (optionnel)</span><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex. Coulage dalle RDC" /></label>
          <label className="field"><span>Date</span><input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} /></label>
          <label className="field">
            <span>Tâche liée (optionnel)</span>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">—</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="button" className="btn btn-amber grad-amber" disabled={busy} onClick={save}>{busy ? "Envoi…" : "Ajouter"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoLightbox({ photo, tasks, canMutate, onClose, removePhoto }) {
  const [src, setSrc] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [caption, setCaption] = React.useState(photo.caption || "");
  const [takenAt, setTakenAt] = React.useState(dateInputValue(photo.takenAt));
  const [taskId, setTaskId] = React.useState(photo.taskId || "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [current, setCurrent] = React.useState(photo);

  React.useEffect(() => {
    let revoke;
    let active = true;
    api.photoBlobUrl(photo.id).then(({ url }) => { if (!active) { URL.revokeObjectURL(url); return; } revoke = url; setSrc(url); }).catch(() => {});
    return () => { active = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [photo.id]);

  const save = async () => {
    setError(""); setBusy(true);
    try {
      const updated = await api.updatePhoto(photo.id, { caption: caption.trim() || null, taken_at: takenAt || undefined, task_id: taskId ? Number(taskId) : null });
      setCurrent(updated);
      setEditing(false);
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <div><h2 className="font-display">{formatDate(current.takenAt)}</h2>{current.caption && <p>{current.caption}</p>}</div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", background: "var(--ink-50)", borderRadius: 12, minHeight: 220 }}>
          {src ? <img src={src} alt={current.caption || "Photo de chantier"} style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 12 }} /> : <p className="muted" style={{ alignSelf: "center" }}>Chargement…</p>}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="field"><span>Légende</span><input value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
            <label className="field"><span>Date</span><input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} /></label>
            <label className="field">
              <span>Tâche liée</span>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">—</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
            {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
              <button type="button" className="btn btn-amber grad-amber" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        ) : canMutate && (
          <div className="modal-actions">
            <button type="button" className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => removePhoto(current.id)}>Retirer de la galerie</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>Modifier</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Rapport imprimable : sélection de période puis mise en page propre via
// window.print() (pas de génération PDF côté client, cf. backend siteReport).
function ReportModal({ projectId, onClose }) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [report, setReport] = React.useState(null);
  const [thumbs, setThumbs] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const generate = async () => {
    setError(""); setBusy(true);
    try {
      const r = await api.getReport(projectId, { from: from || undefined, to: to || undefined });
      setReport(r);
      const entries = await Promise.all((r.photos || []).map(async (p) => {
        try { const { url } = await api.photoBlobUrl(p.id); return [p.id, url]; }
        catch { return [p.id, null]; }
      }));
      setThumbs(Object.fromEntries(entries));
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  React.useEffect(() => () => { Object.values(thumbs).forEach((u) => u && URL.revokeObjectURL(u)); }, [thumbs]);

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 840 }}>
        <div className="modal-head no-print">
          <div><h2 className="font-display">Rapport photo de chantier</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field"><span>Du</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>Au</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button type="button" className="btn btn-amber grad-amber" disabled={busy} onClick={generate}>{busy ? "Génération…" : "Générer"}</button>
          {report && <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Icon name="fileDown" /> Imprimer / PDF</button>}
        </div>
        {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }} className="no-print">{error}</div>}

        {report && (
          <div className="report-print">
            <h3 className="font-display" style={{ margin: "4px 0 0" }}>{report.project?.name}</h3>
            <p className="muted" style={{ margin: "2px 0 12px" }}>
              {report.project?.client ? `Client : ${report.project.client} — ` : ""}
              {report.project?.location ? `${report.project.location} — ` : ""}
              Période : {report.from ? formatDate(report.from) : "début"} au {report.to ? formatDate(report.to) : "aujourd'hui"}
            </p>
            {!report.photos?.length ? <p className="muted">Aucune photo sur cette période.</p> : (
              <div className="photo-grid report-grid">
                {report.photos.map((p) => (
                  <div key={p.id} className="report-photo">
                    {thumbs[p.id] ? <img src={thumbs[p.id]} alt={p.caption || "Photo de chantier"} /> : <div className="muted" style={{ fontSize: 11 }}>…</div>}
                    <div className="report-photo-caption">
                      <strong>{formatDate(p.takenAt)}</strong>
                      {p.caption && <span>{p.caption}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Situations & avenants ─────────────────────────────────────────────── */
const SITUATION_STATUS_TONE = { Payee: "emerald", "Payée": "emerald", En_validation: "amber", Rejetee: "rose" };
const CHANGE_ORDER_STATUS_TONE = { Valide: "emerald", "Validé": "emerald", En_attente: "amber", Refuse: "rose" };

function Situations({ projects, canMutate, fixedProjectId }) {
  const [projectId, setProjectId] = React.useState(fixedProjectId ?? projects[0]?.id ?? null);
  const [situations, setSituations] = React.useState([]);
  const [changeOrders, setChangeOrders] = React.useState([]);
  const [submissions, setSubmissions] = React.useState([]);
  const [subcontractors, setSubcontractors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const selected = projects.find((p) => p.id === projectId);

  const load = React.useCallback(() => {
    if (!projectId) { setSituations([]); setChangeOrders([]); setSubmissions([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([api.situations(projectId), api.changeOrders(projectId), api.submissions(projectId), api.subcontractors()])
      .then(([s, c, sub, st]) => { setSituations(s || []); setChangeOrders(c || []); setSubmissions(sub || []); setSubcontractors(st || []); })
      .catch(() => { setSituations([]); setChangeOrders([]); setSubmissions([]); })
      .finally(() => setLoading(false));
  }, [projectId]);
  React.useEffect(() => { load(); }, [load]);

  const reviewSubmission = async (id, action, motif) => {
    setBusy(true); setError("");
    try { await api.reviewSubmission(id, { action, motif: motif || undefined }); setModal(null); load(); }
    catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };
  const openSubmissionFile = async (id) => {
    try { const { url } = await api.submissionFileUrl(id); window.open(url, "_blank", "noopener"); }
    catch (err) { setError(err.message || String(err)); }
  };

  const billedToDate = situations.reduce((sum, s) => sum + n(s.amount), 0);
  const changeOrdersTotal = changeOrders.reduce((sum, c) => sum + n(c.amount), 0);
  const cur = selected?.currencyCode;

  const saveSituation = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = { project_id: projectId, number: Number(form.number), period: form.period || null, progress: Number(form.progress || 0), amount: Number(form.amount || 0), currency_id: form.currency_id || null, status: form.status || "En_validation" };
      form.id ? await api.updateSituation(form.id, payload) : await api.createSituation(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };
  const saveChangeOrder = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = { project_id: projectId, title: form.title, reference: form.reference || null, amount: Number(form.amount || 0), currency_id: form.currency_id || null, delay_days: Number(form.delay_days || 0), status: form.status || "En_attente", notes: form.notes || null };
      form.id ? await api.updateChangeOrder(form.id, payload) : await api.createChangeOrder(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Le marché</p><h2 className="title font-display">Avenants & sous-traitants</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!fixedProjectId && (
            <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button className="btn" disabled={!canMutate || !projectId} onClick={() => setModal({ kind: "subLink" })}><Icon name="userPlus" /> Lien sous-traitant</button>
        </div>
      </div>

      {selected && (
        <div className="g2" style={{ marginBottom: 16 }}>
          <div className="card pad"><div className="kpi-label">Marché initial</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{money(selected.contractAmount, cur)}</div></div>
          <div className="card pad" style={{ boxShadow: "inset 0 0 0 1px var(--amber-100)", background: "rgba(254,243,199,.3)" }}><div className="kpi-label" style={{ color: "var(--amber-700)" }}>Marché révisé (+ avenants)</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--amber-700)" }}>{money(n(selected.contractAmount) + changeOrdersTotal, cur)} <span style={{ fontSize: 12, color: "var(--ink-400)", fontWeight: 400 }}>(+{money(changeOrdersTotal, cur)})</span></div></div>
        </div>
      )}

      <p className="muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
        Les décomptes d'avancement (situations de travaux) se gèrent désormais dans l'onglet <strong>Situations de travaux</strong>.
      </p>

      {false && (
      <div className="card table-card" style={{ marginBottom: 18 }}>
        <table className="bp">
          <thead><tr><th>Situation</th><th>Période</th><th>Avancement</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="muted">Chargement…</td></tr> :
              !situations.length ? <tr><td colSpan={5} className="muted">Aucune situation enregistrée.</td></tr> :
              situations.map((r) => (
                <tr key={r.id} onClick={() => canMutate && setModal({ kind: "situation", ...r })} style={{ cursor: canMutate ? "pointer" : "default" }}>
                  <td style={{ fontWeight: 500 }}>Situation n° {r.number}</td>
                  <td style={{ color: "var(--ink-500)" }}>{r.period || "—"}</td>
                  <td>{r.progress} %</td>
                  <td>{money(r.amount, r.currencyCode || cur)}</td>
                  <td><span className={`chip ${SITUATION_STATUS_TONE[r.status] || "ink"}`}>{r.status?.replace(/_/g, " ")}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}

      <div className="section-head" style={{ marginBottom: 8 }}>
        <h3 className="font-display" style={{ fontSize: 15, margin: 0 }}>Avenants / ordres de changement</h3>
        <button className="link" disabled={!canMutate || !projectId} onClick={() => setModal({ kind: "changeOrder" })}>+ Ajouter</button>
      </div>
      <div className="g2">
        {loading ? <p className="muted">Chargement…</p> :
          !changeOrders.length ? <p className="muted">Aucun avenant.</p> :
          changeOrders.map((c) => (
            <div className="card pad" key={c.id} onClick={() => canMutate && setModal({ kind: "changeOrder", ...c })} style={{ cursor: canMutate ? "pointer" : "default" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="chip amber">{c.reference || `Avenant ${c.id}`}</span>
                <span style={{ marginLeft: "auto", color: "var(--emerald-600)", fontWeight: 700 }}>+{money(c.amount, c.currencyCode || cur)}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 4 }}>{c.status?.replace(/_/g, " ")}{c.delayDays ? ` · délai +${c.delayDays} j` : ""}</div>
            </div>
          ))}
      </div>

      <h3 className="font-display" style={{ fontSize: 15, margin: "18px 0 8px" }}>Soumissions sous-traitants</h3>
      <div className="card table-card" style={{ marginBottom: 18 }}>
        <table className="bp">
          <thead><tr><th>Sous-traitant</th><th>Type</th><th>Montant TTC</th><th>Fichier</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> :
              !submissions.length ? <tr><td colSpan={6} className="muted">Aucune soumission reçue.</td></tr> :
              submissions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.subcontractorName || s.submittedByCompany || s.submittedByName || "—"}</td>
                  <td>{s.type === "invoice" ? "Facture" : "Devis"}</td>
                  <td>{money(s.totalTtc, s.currencyCode || cur)}</td>
                  <td>{s.attachedFileKey ? <button className="link" onClick={() => openSubmissionFile(s.id)}><Icon name="eye" /> Voir</button> : <span className="muted">—</span>}</td>
                  <td><span className={`chip ${SUBMISSION_STATUS_TONE[s.status] || "ink"}`}>{s.status?.replace(/_/g, " ")}</span></td>
                  <td>
                    {s.status === "submitted" && canMutate ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="link" onClick={() => reviewSubmission(s.id, "validate")}><Icon name="checkCheck" /> Valider</button>
                        <button className="link" onClick={() => setModal({ kind: "returnSubmission", id: s.id })}>Renvoyer</button>
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal?.kind === "situation" && <SituationModal modal={modal} defaultCurrencyId={selected?.currencyId} busy={busy} error={error} onClose={() => setModal(null)} onSave={saveSituation} />}
      {modal?.kind === "changeOrder" && <ChangeOrderModal modal={modal} defaultCurrencyId={selected?.currencyId} busy={busy} error={error} onClose={() => setModal(null)} onSave={saveChangeOrder} />}
      {modal?.kind === "subLink" && <SubcontractorLinkModal projectId={projectId} subcontractors={subcontractors} onClose={() => setModal(null)} />}
      {modal?.kind === "returnSubmission" && <ReturnSubmissionModal busy={busy} error={error} onClose={() => setModal(null)} onSubmit={(motif) => reviewSubmission(modal.id, "return", motif)} />}
    </>
  );
}

const SUBMISSION_STATUS_TONE = { submitted: "amber", validated: "emerald", returned: "rose" };

function SubcontractorLinkModal({ projectId, subcontractors, onClose }) {
  const [subId, setSubId] = React.useState("");
  const [expiryDays, setExpiryDays] = React.useState(7);
  const [link, setLink] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const generate = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.createSubcontractorLink({ project_id: projectId, subcontractor_id: subId ? Number(subId) : undefined, expiry_days: Number(expiryDays) || 7 });
      setLink(subcontractorSubmitUrl(res.token));
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };
  const copy = () => { try { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ } };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div><h2 className="font-display">Lien sous-traitant</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        {!link ? (
          <div className="form-grid">
            <label className="field">
              <span>Sous-traitant (optionnel — sinon lien générique)</span>
              <select value={subId} onChange={(e) => setSubId(e.target.value)}>
                <option value="">Lien générique (le sous-traitant s'identifie)</option>
                {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <Field label="Expiration (jours)" type="number" value={expiryDays} onChange={(v) => setExpiryDays(v)} />
            {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
            <button className="btn btn-amber grad-amber" disabled={busy} onClick={generate}>{busy ? "Génération…" : "Générer le lien"}</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--ink-500)" }}>Partagez ce lien avec le sous-traitant (copier / WhatsApp) :</p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--ink-200, #cbd5e1)", borderRadius: 8, fontSize: 13 }} />
            <button className="btn" onClick={copy}>{copied ? "Copié ✓" : "Copier le lien"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReturnSubmissionModal({ busy, error, onClose, onSubmit }) {
  const [motif, setMotif] = React.useState("");
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSubmit(motif); }}>
        <div className="modal-head">
          <div><h2 className="font-display">Renvoyer pour correction</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Motif du renvoi</span>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ce qui doit être corrigé…" />
          </label>
          {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}
          <button className="btn btn-amber grad-amber" type="submit" disabled={busy}>{busy ? "Envoi…" : "Renvoyer"}</button>
        </div>
      </form>
    </div>
  );
}
function SituationModal({ modal, defaultCurrencyId, busy, error, onClose, onSave }) {
  const [form, setForm] = React.useState(() => ({ id: modal.id, number: modal.number ?? "", period: modal.period || "", progress: modal.progress ?? 0, amount: modal.amount ?? 0, currency_id: modal.currencyId || defaultCurrencyId || "", status: modal.status || "En_validation" }));
  const currencies = useCurrencies();
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier la situation" : "Nouvelle situation"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Numéro" type="number" value={form.number} onChange={(v) => set("number", v)} required />
          <Field label="Période" value={form.period} onChange={(v) => set("period", v)} />
          <Field label="Avancement %" type="number" value={form.progress} onChange={(v) => set("progress", v)} />
          <Field label="Montant" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
          <label className="field">
            <span>Devise</span>
            <CurrencyPicker value={form.currency_id} onChange={(id) => set("currency_id", id)} currencies={currencies} />
          </label>
          <label className="field">
            <span>Statut</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="En_validation">En validation</option>
              <option value="Payee">Payée</option>
              <option value="Rejetee">Rejetée</option>
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.number}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}
function ChangeOrderModal({ modal, defaultCurrencyId, busy, error, onClose, onSave }) {
  const [form, setForm] = React.useState(() => ({ id: modal.id, title: modal.title || "", reference: modal.reference || "", amount: modal.amount ?? 0, currency_id: modal.currencyId || defaultCurrencyId || "", delay_days: modal.delayDays ?? 0, status: modal.status || "En_attente", notes: modal.notes || "" }));
  const currencies = useCurrencies();
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier l'avenant" : "Nouvel avenant"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Titre" value={form.title} onChange={(v) => set("title", v)} required />
          <Field label="Référence" value={form.reference} onChange={(v) => set("reference", v)} />
          <Field label="Montant" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
          <label className="field">
            <span>Devise</span>
            <CurrencyPicker value={form.currency_id} onChange={(id) => set("currency_id", id)} currencies={currencies} />
          </label>
          <Field label="Délai ajouté (jours)" type="number" value={form.delay_days} onChange={(v) => set("delay_days", v)} />
          <label className="field">
            <span>Statut</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="En_attente">En attente</option>
              <option value="Valide">Validé</option>
              <option value="Refuse">Refusé</option>
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.title}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Matériaux & achats ────────────────────────────────────────────────── */
const STOCK_MOVEMENT_LABEL = { reception: "Reçu", consumption: "Consommé", adjustment: "Ajustement" };
const STOCK_MOVEMENT_TONE = { reception: "emerald", consumption: "amber", adjustment: "ink" };

function Materiaux({ materials: globalMaterials, onNew, canMutate, fixedProjectId }) {
  // Mode projet (fixedProjectId) : matériaux + mouvements de CE chantier uniquement.
  // Mode global (sidebar, sans fixedProjectId) : comportement inchangé (props materials).
  const [projectMaterials, setProjectMaterials] = React.useState([]);
  const [movements, setMovements] = React.useState([]);
  const [loading, setLoading] = React.useState(!!fixedProjectId);
  const [modal, setModal] = React.useState(null);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    if (!fixedProjectId) return;
    setLoading(true);
    Promise.all([
      api.materials({ projectId: fixedProjectId }),
      api.stockMovements(fixedProjectId),
    ])
      .then(([mats, mvts]) => { setProjectMaterials(mats || []); setMovements(mvts || []); })
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, [fixedProjectId]);
  React.useEffect(() => { load(); }, [load]);

  if (fixedProjectId) {
    const totalReceived = projectMaterials.reduce((s, m) => s + n(m.received), 0);
    const totalConsumed = projectMaterials.reduce((s, m) => s + n(m.consumed), 0);
    const totalRemaining = projectMaterials.reduce((s, m) => s + n(m.remaining), 0);
    return (
      <>
        <div className="topbar">
          <div><p className="eyebrow">Achats</p><h2 className="title font-display">Matériaux du chantier</h2></div>
          <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={() => setModal({})}><Icon name="box" /> Déclarer une sortie</button>
        </div>
        {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div className="g3 kpis" style={{ marginBottom: 16 }}>
          <div className="card pad"><div className="kpi-label">Reçu (total)</div><div className="font-display kpi-value" style={{ color: "var(--emerald-600)" }}>{totalReceived}</div></div>
          <div className="card pad"><div className="kpi-label">Consommé (total)</div><div className="font-display kpi-value" style={{ color: "var(--amber-600)" }}>{totalConsumed}</div></div>
          <div className="card pad"><div className="kpi-label">Restant (total)</div><div className="font-display kpi-value">{totalRemaining}</div></div>
        </div>
        <div className="card table-card" style={{ marginBottom: 16 }}>
          <table className="bp">
            <thead><tr><th>Matériau</th><th>Reçu</th><th>Consommé</th><th>Restant</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="muted">Chargement…</td></tr> :
                !projectMaterials.length ? <tr><td colSpan={4} className="muted">Aucun mouvement de stock pour ce chantier.</td></tr> :
                projectMaterials.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ color: "var(--emerald-600)" }}>{n(m.received)} {m.unit}</td>
                    <td style={{ color: "var(--amber-600)" }}>{n(m.consumed)} {m.unit}</td>
                    <td style={{ fontWeight: 600 }}>{n(m.remaining)} {m.unit}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Historique des mouvements</p>
        <div className="card table-card">
          <table className="bp">
            <thead><tr><th>Date</th><th>Matériau</th><th>Type</th><th>Quantité</th><th>Phase</th><th>Note</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> :
                !movements.length ? <tr><td colSpan={6} className="muted">Aucun mouvement enregistré.</td></tr> :
                movements.map((mv) => (
                  <tr key={mv.id}>
                    <td style={{ color: "var(--ink-500)" }}>{mv.createdAt ? String(mv.createdAt).slice(0, 10) : "—"}</td>
                    <td>{mv.materialName}</td>
                    <td><span className={`chip ${STOCK_MOVEMENT_TONE[mv.movementType] || "ink"}`}>{STOCK_MOVEMENT_LABEL[mv.movementType] || mv.movementType}</span></td>
                    <td>{n(mv.quantity)} {mv.materialUnit}</td>
                    <td style={{ color: "var(--ink-500)" }}>{mv.phaseLabel || "—"}</td>
                    <td style={{ color: "var(--ink-500)" }}>{mv.note || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {modal && (
          <StockMovementModal
            projectId={fixedProjectId}
            materials={projectMaterials.length ? projectMaterials : globalMaterials}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); load(); }}
          />
        )}
      </>
    );
  }

  // Vue globale (sidebar, hors projet) — comportement inchangé.
  const materials = globalMaterials || [];
  const low = materials.filter((m) => n(m.stock) < n(m.min ?? m.minStock)).length;
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Achats</p><h2 className="title font-display">Matériaux & achats</h2></div>
        {onNew && <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Bon de commande</button>}
      </div>
      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <div className="card pad"><div className="kpi-label">Références suivies</div><div className="font-display kpi-value">{materials.length}</div></div>
        <div className="card pad"><div className="kpi-label">Sous le seuil</div><div className="font-display kpi-value" style={{ color: low ? "var(--rose-600)" : undefined }}>{low}</div></div>
        <div className="card pad"><div className="kpi-label">Réservé total</div><div className="font-display kpi-value">{materials.reduce((s, m) => s + n(m.reserved), 0)}</div></div>
        <div className="card pad"><div className="kpi-label">En stock total</div><div className="font-display kpi-value">{materials.reduce((s, m) => s + n(m.stock), 0)}</div></div>
      </div>
      <div className="card table-card">
        <table className="bp">
          <thead><tr><th>Matériau</th><th>Stock</th><th>Réservé</th><th>Seuil</th><th>Statut</th></tr></thead>
          <tbody>
            {materials.map((m) => {
              const min = n(m.min ?? m.minStock);
              const lowStock = n(m.stock) < min;
              return (
                <tr key={m.name}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{n(m.stock)} {m.unit}</td>
                  <td style={{ color: "var(--ink-500)" }}>{n(m.reserved)}</td>
                  <td style={{ color: "var(--ink-500)" }}>{min}</td>
                  <td><span className={`chip ${lowStock ? "rose" : "emerald"}`}>{lowStock ? "À commander" : "OK"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Déclaration d'une sortie (consommation) manuelle — rattachée à une phase du
// planning du chantier. Le backend force movementType: 'consumption'.
function StockMovementModal({ projectId, materials, onClose, onSaved }) {
  const [materialId, setMaterialId] = React.useState("");
  const [phaseId, setPhaseId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [note, setNote] = React.useState("");
  const [phases, setPhases] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api.phases(projectId).then((p) => setPhases(p || [])).catch(() => setPhases([]));
  }, [projectId]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (!materialId) { setError("Choisissez un matériau."); return; }
    if (!(n(quantity) > 0)) { setError("La quantité doit être supérieure à 0."); return; }
    setBusy(true);
    try {
      await api.createStockMovement({
        projectId,
        materialId: Number(materialId),
        phaseId: phaseId ? Number(phaseId) : undefined,
        quantity: n(quantity),
        note: note.trim() || undefined,
      });
      onSaved();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={save}>
        <div className="modal-head">
          <div><h2 className="font-display">Déclarer une sortie de stock</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Matériau</span>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} required>
              <option value="">—</option>
              {(materials || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Phase</span>
            <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
              <option value="">—</option>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <Field label="Quantité" type="number" value={quantity} onChange={setQuantity} required />
          <label className="field"><span>Note (optionnel)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 50 }} placeholder="Précisions…" /></label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !materialId}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Sous-traitants ────────────────────────────────────────────────────── */
const SUBCONTRACTOR_STATUS_TONE = { Actif: "emerald", En_cours: "amber", Termine: "ink", "Terminé": "ink" };

function SousTraitants({ projects, canMutate, fixedProjectId }) {
  const [subs, setSubs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    api.subcontractors().then((rows) => setSubs(rows || [])).catch(() => setSubs([])).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const visibleSubs = fixedProjectId ? subs.filter((s) => (s.projectId ?? s.project_id) === fixedProjectId) : subs;

  const save = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = {
        name: form.name, trade: form.trade || null, project_id: form.project_id ? Number(form.project_id) : null,
        contract_amount: n(form.contract_amount), currency_id: form.currency_id || null,
        status: form.status || "En_cours",
      };
      form.id ? await api.updateSubcontractor(form.id, payload) : await api.createSubcontractor(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  const siteName = (s) => projects.find((p) => p.id === s.projectId)?.name || "—";

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Partenaires</p><h2 className="title font-display">Sous-traitants</h2></div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={() => setModal({ projectId: fixedProjectId ?? undefined })}><Icon name="userPlus" /> Ajouter</button>
      </div>
      {loading ? (
        <div className="card pad"><span className="muted">Chargement…</span></div>
      ) : !visibleSubs.length ? (
        <div className="card pad"><span className="muted">Aucun sous-traitant enregistré.</span></div>
      ) : (
        <div className="g3">
          {visibleSubs.map((s) => (
            <div className="card pad" key={s.id} onClick={() => canMutate && setModal(s)} style={{ cursor: canMutate ? "pointer" : "default" }}>
              <div className="sub-head">
                <span className="sub-ic" style={{ background: "#0f172a" }}><Icon name="wrench" /></span>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div><div style={{ fontSize: 12, color: "var(--ink-500)" }}>{s.trade || "—"}</div></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--ink-500)" }}>{siteName(s)}</span>
                <span style={{ fontWeight: 600 }}>{money(s.contractAmount, s.currencyCode)}</span>
              </div>
              <div style={{ marginTop: 8 }}><span className={`chip ${SUBCONTRACTOR_STATUS_TONE[s.status] || "ink"}`}>{s.status?.replace(/_/g, " ")}</span></div>
            </div>
          ))}
        </div>
      )}
      {modal && <SubcontractorModal modal={modal} projects={projects} busy={busy} error={error} onClose={() => setModal(null)} onSave={save} />}
    </>
  );
}
function SubcontractorModal({ modal, projects, busy, error, onClose, onSave }) {
  const project = projects.find((p) => p.id === modal.projectId);
  const [form, setForm] = React.useState(() => ({
    id: modal.id, name: modal.name || "", trade: modal.trade || "", project_id: modal.projectId || "",
    contract_amount: modal.contractAmount ?? 0, currency_id: modal.currencyId || project?.currencyId || "", status: modal.status || "En_cours",
  }));
  const currencies = useCurrencies();
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier le sous-traitant" : "Nouveau sous-traitant"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
          <Field label="Corps de métier" value={form.trade} onChange={(v) => set("trade", v)} />
          <label className="field">
            <span>Chantier</span>
            <select value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
              <option value="">— Aucun —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <Field label="Montant contrat" type="number" value={form.contract_amount} onChange={(v) => set("contract_amount", v)} />
          <label className="field">
            <span>Devise</span>
            <CurrencyPicker value={form.currency_id} onChange={(id) => set("currency_id", id)} currencies={currencies} />
          </label>
          <label className="field">
            <span>Statut</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="En_cours">En cours</option>
              <option value="Actif">Actif</option>
              <option value="Termine">Terminé</option>
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.name}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Équipes ───────────────────────────────────────────────────────────── */
const CREW_STATUS_TONE = { Actif: "emerald", "En_pause": "amber", Termine: "ink", "Terminé": "ink" };
function Equipes({ canMutate }) {
  const [sub, setSub] = React.useState("equipes"); // "equipes" | "ouvriers"
  const [crews, setCrews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(() => {
    setLoading(true);
    api.crews().then((rows) => setCrews(rows || [])).catch(() => setCrews([])).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = { name: form.name, people: n(form.people), site: form.site || null, status: form.status || "Actif", lead: form.lead || null };
      form.id ? await api.updateCrew(form.id, payload) : await api.createCrew(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Supprimer cette équipe ?")) return;
    try { await api.deleteCrew(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Ressources humaines</p><h2 className="title font-display">Équipes</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="seg" role="tablist" style={{ display: "flex", gap: 4, background: "var(--ink-100)", borderRadius: 10, padding: 3 }}>
            <button type="button" className={`btn ${sub === "equipes" ? "btn-dark" : "btn-ghost"}`} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setSub("equipes")}>Équipes</button>
            <button type="button" className={`btn ${sub === "ouvriers" ? "btn-dark" : "btn-ghost"}`} style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setSub("ouvriers")}>Ouvriers</button>
          </div>
          {sub === "equipes" && <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={() => setModal({})}><Icon name="userPlus" /> Nouvelle équipe</button>}
        </div>
      </div>

      {sub === "equipes" ? (
        <>
          {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

          <div className="card table-card">
            <table className="bp">
              <thead><tr><th>Équipe</th><th>Chef d'équipe</th><th>Effectif</th><th>Chantier</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> :
                  !crews.length ? <tr><td colSpan={6} className="muted">Aucune équipe enregistrée.</td></tr> :
                  crews.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ color: "var(--ink-500)" }}>{c.lead || "—"}</td>
                      <td>{n(c.people)}</td>
                      <td style={{ color: "var(--ink-500)" }}>{c.site || "—"}</td>
                      <td><span className={`chip ${CREW_STATUS_TONE[c.status] || "ink"}`}>{c.status ? c.status.replace(/_/g, " ") : "—"}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {canMutate && <button className="link" onClick={() => setModal(c)}>Modifier</button>}
                          {canMutate && <button className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => remove(c.id)}>Suppr.</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {modal && <CrewModal modal={modal} busy={busy} error={error} onClose={() => setModal(null)} onSave={save} />}
        </>
      ) : (
        <Ouvriers crews={crews} canMutate={canMutate} />
      )}
    </>
  );
}

/* ── Ouvriers nominatifs (rattachés à une équipe) ─────────────────────── */
const WORKER_ROLES = ["Maçon", "Chef d'équipe", "Électricien", "Plombier", "Menuisier", "Peintre", "Manœuvre", "Ferrailleur", "Autre"];
function Ouvriers({ crews, canMutate }) {
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [currencies, setCurrencies] = React.useState([]);

  const load = React.useCallback(() => {
    setLoading(true);
    api.listWorkers().then((rows) => setWorkers(rows || [])).catch(() => setWorkers([])).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    api.currencies().then((r) => {
      const arr = Array.isArray(r) ? r : (r?.data || r?.getAllCurrency || []);
      setCurrencies((arr || []).filter((c) => String(c.status) === "true" || c.status === true));
    }).catch(() => setCurrencies([]));
  }, []);

  const currencyLabel = (id) => {
    const c = currencies.find((x) => String(x.id) === String(id));
    return c ? (c.currencyCode || c.currencyName || c.name) : null;
  };

  const save = async (form) => {
    setBusy(true); setError("");
    try {
      const payload = {
        fullName: form.fullName, role: form.role || null, phone: form.phone || null,
        dailyRate: n(form.dailyRate), currencyId: form.currencyId ? Number(form.currencyId) : null,
        crewId: form.crewId ? Number(form.crewId) : null,
      };
      form.id ? await api.updateWorker(form.id, payload) : await api.createWorker(payload);
      setModal(null); load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Retirer cet ouvrier ? (désactivation, l'historique est conservé)")) return;
    try { await api.deleteWorker(id); load(); }
    catch (err) { setError(err.message || String(err)); }
  };

  return (
    <>
      <div className="topbar" style={{ marginTop: 12 }}>
        <div><p className="eyebrow">Ressources humaines</p><h2 className="title font-display">Ouvriers</h2></div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={() => setModal({})}><Icon name="userPlus" /> Nouvel ouvrier</button>
      </div>

      {error && <div style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div className="card table-card">
        <table className="bp">
          <thead><tr><th>Nom</th><th>Rôle</th><th>Téléphone</th><th>Taux journalier</th><th>Équipe</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> :
              !workers.length ? <tr><td colSpan={6} className="muted">Aucun ouvrier enregistré.</td></tr> :
              workers.map((w) => {
                const crew = crews.find((c) => String(c.id) === String(w.crewId));
                return (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 500 }}>{w.fullName}</td>
                    <td style={{ color: "var(--ink-500)" }}>{w.role || "—"}</td>
                    <td style={{ color: "var(--ink-500)" }}>{w.phone || "—"}</td>
                    <td>{w.dailyRate != null ? money(w.dailyRate, w.currencyCode || currencyLabel(w.currencyId)) : "—"}</td>
                    <td style={{ color: "var(--ink-500)" }}>{crew?.name || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {canMutate && <button className="link" onClick={() => setModal(w)}>Modifier</button>}
                        {canMutate && <button className="link" style={{ color: "var(--rose-600, #b91c1c)" }} onClick={() => remove(w.id)}>Suppr.</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modal && (
        <WorkerModal modal={modal} crews={crews} currencies={currencies} busy={busy} error={error} onClose={() => setModal(null)} onSave={save} />
      )}
    </>
  );
}
function WorkerModal({ modal, crews, currencies, busy, error, onClose, onSave }) {
  const [form, setForm] = React.useState(() => ({
    id: modal.id, fullName: modal.fullName || "", role: modal.role || WORKER_ROLES[0],
    phone: modal.phone || "+243", dailyRate: modal.dailyRate ?? 0,
    currencyId: modal.currencyId || "", crewId: modal.crewId || "",
  }));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier l'ouvrier" : "Nouvel ouvrier"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Nom complet" value={form.fullName} onChange={(v) => set("fullName", v)} required />
          <label className="field">
            <span>Rôle</span>
            <select value={form.role} onChange={(e) => set("role", e.target.value)}>
              {WORKER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {/* Téléphone international — défaut RDC +243 (pas de composant PhoneInput partagé dans batipro-app). */}
          <Field label="Téléphone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Taux journalier" type="number" value={form.dailyRate} onChange={(v) => set("dailyRate", v)} />
          <label className="field">
            <span>Devise</span>
            <CurrencyPicker value={form.currencyId} onChange={(id) => set("currencyId", id)} currencies={currencies} />
          </label>
          <label className="field">
            <span>Équipe</span>
            <select value={form.crewId} onChange={(e) => set("crewId", e.target.value)}>
              <option value="">— Sans équipe —</option>
              {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.fullName}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}
function CrewModal({ modal, busy, error, onClose, onSave }) {
  const [form, setForm] = React.useState(() => ({
    id: modal.id, name: modal.name || "", lead: modal.lead || "", people: modal.people ?? 0,
    site: modal.site || "", status: modal.status || "Actif",
  }));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{form.id ? "Modifier l'équipe" : "Nouvelle équipe"}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          <Field label="Nom de l'équipe" value={form.name} onChange={(v) => set("name", v)} required />
          <Field label="Chef d'équipe" value={form.lead} onChange={(v) => set("lead", v)} />
          <Field label="Effectif" type="number" value={form.people} onChange={(v) => set("people", v)} />
          <Field label="Chantier" value={form.site} onChange={(v) => set("site", v)} />
          <label className="field">
            <span>Statut</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="Actif">Actif</option>
              <option value="En_pause">En pause</option>
              <option value="Termine">Terminé</option>
            </select>
          </label>
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !form.name}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Pointage (présence journalière par chantier) ─────────────────────── */
const ATTENDANCE_STATUSES = [
  { id: "present", label: "Présent", tone: "emerald" },
  { id: "absent", label: "Absent", tone: "rose" },
  { id: "partiel", label: "Partiel", tone: "amber" },
  { id: "conge", label: "Congé", tone: "ink" },
];
function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function Pointage({ projects, canMutate }) {
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? null);
  const [date, setDate] = React.useState(todayInputValue());
  const [workers, setWorkers] = React.useState([]);
  const [entries, setEntries] = React.useState({}); // workerId -> { status, hours, notes }
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const selected = projects.find((p) => p.id === projectId);
  // Filtre par équipe assignée au chantier si l'info existe sur le projet, sinon tous les ouvriers actifs.
  const projectCrewId = selected?.crewId ?? selected?.crew_id ?? null;
  const visibleWorkers = projectCrewId
    ? workers.filter((w) => String(w.crewId) === String(projectCrewId))
    : workers;

  const load = React.useCallback(() => {
    if (!projectId) { setWorkers([]); setEntries({}); setLoading(false); return; }
    setLoading(true); setNotice("");
    Promise.all([api.listWorkers(), api.getAttendance(projectId, { date })])
      .then(([w, att]) => {
        setWorkers(w || []);
        const map = {};
        for (const a of att || []) {
          map[a.workerId] = { id: a.id, status: a.status || "present", hours: a.hours ?? "", notes: a.notes || "" };
        }
        setEntries(map);
      })
      .catch((e) => { setWorkers([]); setEntries({}); setError(e.message || String(e)); })
      .finally(() => setLoading(false));
  }, [projectId, date]);
  React.useEffect(() => { load(); }, [load]);

  const setEntry = (workerId, patch) => {
    setEntries((c) => ({ ...c, [workerId]: { status: "present", hours: "", notes: "", ...c[workerId], ...patch } }));
  };

  const save = async () => {
    if (!projectId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = visibleWorkers.map((w) => {
        const e = entries[w.id] || { status: "present" };
        return {
          workerId: w.id,
          status: e.status || "present",
          hours: e.status === "partiel" && e.hours !== "" ? Number(e.hours) : undefined,
          notes: e.notes || undefined,
        };
      });
      await api.saveAttendance(projectId, payload);
      setNotice("Pointage enregistré.");
      load();
    } catch (err) { setError(err.message || String(err)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Suivi</p><h2 className="title font-display">Pointage</h2></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ minHeight: 40, borderRadius: 8, border: "1px solid var(--ink-200)", padding: "0 10px" }} />
        </div>
      </div>

      {error && <div className="inline-error">{error}</div>}
      {notice && <div style={{ color: "var(--emerald-600)", fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{notice}</div>}

      <div className="card pad">
        {loading ? <p className="muted">Chargement…</p> :
          !visibleWorkers.length ? <p className="muted">Aucun ouvrier {projectCrewId ? "dans l'équipe de ce chantier" : "enregistré"}.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleWorkers.map((w) => {
              const e = entries[w.id] || { status: "present", hours: "", notes: "" };
              return (
                <div key={w.id} className="card" style={{ padding: 12, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{w.fullName}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{w.role || "—"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!canMutate}
                        className={`chip ${e.status === s.id ? s.tone : "ink"}`}
                        style={{ minHeight: 40, minWidth: 84, fontSize: 13, cursor: canMutate ? "pointer" : "default", border: e.status === s.id ? "2px solid currentColor" : "1px solid transparent" }}
                        onClick={() => setEntry(w.id, { status: s.id })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {e.status === "partiel" && (
                    <div style={{ marginTop: 8 }}>
                      <label className="field" style={{ maxWidth: 160 }}>
                        <span>Heures effectuées</span>
                        <input type="number" min="0" step="0.5" value={e.hours} disabled={!canMutate}
                          onChange={(ev) => setEntry(w.id, { hours: ev.target.value })} />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {Boolean(visibleWorkers.length) && (
        <div style={{ position: "sticky", bottom: 0, paddingTop: 12, background: "linear-gradient(to top, var(--bg, #f6f7f9) 60%, transparent)" }}>
          <button className="btn btn-amber grad-amber" style={{ width: "100%", minHeight: 48, fontSize: 16 }} disabled={!canMutate || busy || !projectId} onClick={save}>
            {busy ? "Enregistrement…" : "Enregistrer le pointage"}
          </button>
        </div>
      )}
    </>
  );
}

/* ── Modal création (chantier / matériau) ──────────────────────────────── */
function payloadFor(kind, form) {
  if (kind === "project") {
    return {
      code: form.code || `BAT-${Date.now()}`, name: form.name, client: form.client || null, manager: form.manager || null,
      status: form.status || "Planifie", progress: n(form.progress), budget: n(form.budget), spent: n(form.spent),
      currency_id: form.currency_id ? Number(form.currency_id) : null,
      contract_amount: n(form.contractAmount), billed_amount: n(form.billedAmount),
      due_date: form.dueDate || form.due || null, location: form.location || null, risk: form.risk || "Faible",
    };
  }
  return { name: form.name, unit: form.unit || "unite", stock: n(form.stock), min_stock: n(form.minStock ?? form.min), reserved: n(form.reserved), supplier: form.supplier || null, supplier_id: form.supplier_id ? Number(form.supplier_id) : null };
}
function RecordModal({ modal, busy, error, onClose, onSave }) {
  const { kind } = modal;
  const [form, setForm] = React.useState(() => (kind === "project"
    ? { name: "", status: "Planifie", risk: "Faible", progress: 0, budget: 0, spent: 0 }
    : { name: "", unit: "unite", stock: 0, minStock: 0, reserved: 0 }));
  const set = (k, v) => setForm((c) => ({ ...c, [k]: v }));
  const [suppliers, setSuppliers] = React.useState([]);
  const [currencies, setCurrencies] = React.useState([]);
  React.useEffect(() => {
    if (kind !== "material") return;
    api.suppliers().then((r) => {
      const arr = Array.isArray(r) ? r : (r?.getAllSupplier || r?.data || []);
      setSuppliers((arr || []).filter((s) => String(s.status) === "true"));
    }).catch(() => setSuppliers([]));
  }, [kind]);
  React.useEffect(() => {
    if (kind !== "project") return;
    api.currencies().then((r) => {
      const arr = Array.isArray(r) ? r : (r?.data || r?.getAllCurrency || []);
      setCurrencies((arr || []).filter((c) => String(c.status) === "true" || c.status === true));
    }).catch(() => setCurrencies([]));
  }, [kind]);
  const canSave = Boolean(form.name);
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={(e) => { e.preventDefault(); onSave(kind, form); }}>
        <div className="modal-head">
          <div><h2 className="font-display">{kind === "project" ? "Nouveau chantier" : "Nouveau matériau"}</h2><p>BâtiPro Construction</p></div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="form-grid">
          {kind === "project" ? (
            <>
              <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
              <Field label="Client" value={form.client || ""} onChange={(v) => set("client", v)} />
              <Field label="Responsable" value={form.manager || ""} onChange={(v) => set("manager", v)} />
              <Field label="Lieu" value={form.location || ""} onChange={(v) => set("location", v)} />
              <Field label="Avancement %" type="number" value={form.progress} onChange={(v) => set("progress", v)} />
              <label className="field">
                <span>Devise</span>
                <CurrencyPicker value={form.currency_id || ""} onChange={(id) => set("currency_id", id || null)} currencies={currencies} />
              </label>
              <Field label="Budget (coût)" type="number" value={form.budget} onChange={(v) => set("budget", v)} />
              <Field label="Montant contrat (client)" type="number" value={form.contractAmount} onChange={(v) => set("contractAmount", v)} />
              <Field label="Échéance" type="date" value={form.dueDate || ""} onChange={(v) => set("dueDate", v)} />
            </>
          ) : (
            <>
              <Field label="Matériau" value={form.name} onChange={(v) => set("name", v)} required />
              <Field label="Unité" value={form.unit} onChange={(v) => set("unit", v)} />
              <Field label="Stock" type="number" value={form.stock} onChange={(v) => set("stock", v)} />
              <Field label="Seuil minimum" type="number" value={form.minStock} onChange={(v) => set("minStock", v)} />
              <Field label="Réservé" type="number" value={form.reserved} onChange={(v) => set("reserved", v)} />
              <label className="field">
                <span>Fournisseur</span>
                <select value={form.supplier_id || ""} onChange={(e) => {
                  const id = e.target.value;
                  const s = suppliers.find((x) => String(x.id) === id);
                  setForm((c) => ({ ...c, supplier_id: id || null, supplier: s ? s.name : (id ? c.supplier : "") }));
                }}>
                  <option value="">— Choisir un fournisseur —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.partyType === "individual" ? " (personne)" : ""}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-amber grad-amber" disabled={busy || !canSave}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </div>
  );
}
function Field({ label, value, onChange, type = "text", required }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default AppShell;
