import React from "react";
import { api } from "./api.js";
import { LoginScreen, useAuthToken, clearAuth } from "./auth.jsx";
import { crews as fallbackCrews, materials as fallbackMaterials, projects as fallbackProjects, tasks as fallbackTasks } from "./data.js";

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
  { id: "planning", label: "Planning (Gantt)", icon: "gantt" },
  { id: "plan3d", label: "Plan 3D & matériaux", icon: "rotate3d", ia: true },
  { id: "situations", label: "Situations & avenants", icon: "receipt" },
  { id: "previsionnel", label: "Prévisionnel", icon: "gantt" },
  { id: "materiaux", label: "Matériaux & achats", icon: "package" },
  { id: "soustraitants", label: "Sous-traitants", icon: "users" },
  { id: "parametres", label: "Paramètres", icon: "clipboard" },
];
const MOB_PRIMARY = ["dashboard", "chantiers", "plan3d", "materiaux"];
const MOB_MORE = ["planning", "situations", "soustraitants"];
const TITLES = Object.fromEntries(NAV.map((n) => [n.id, n.label]));

function money(value) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}
const n = (v) => Number(v || 0);
const projectDue = (p) => p.dueDate || p.due || "-";

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

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [snapshot, setSnapshot] = React.useState(null);
  const [apiStatus, setApiStatus] = React.useState("local");
  const [modal, setModal] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [moreOpen, setMoreOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const loadDashboard = React.useCallback(() => {
    api.dashboard()
      .then((data) => { setSnapshot(data); setApiStatus("api"); })
      .catch(() => setApiStatus("local"));
  }, []);
  React.useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const projectRows = snapshot?.projects || fallbackProjects;
  const taskRows = snapshot?.tasks || fallbackTasks;
  const materialRows = snapshot?.materials || fallbackMaterials;
  const crewRows = snapshot?.crews || fallbackCrews;
  const canMutate = apiStatus === "api";

  const go = (id) => { setRoute(id); setMoreOpen(false); window.scrollTo(0, 0); };

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
    dashboard: <Dashboard projects={projectRows} tasks={taskRows} go={go} onNew={() => setModal({ kind: "project" })} canMutate={canMutate} isMobile={isMobile} />,
    chantiers: <Chantiers projects={projectRows} onNew={() => setModal({ kind: "project" })} canMutate={canMutate} />,
    planning: <Planning />,
    plan3d: <Plan3D />,
    situations: <Situations />,
    previsionnel: <Forecast />,
    materiaux: <Materiaux materials={materialRows} onNew={() => setModal({ kind: "material" })} canMutate={canMutate} />,
    soustraitants: <SousTraitants />,
    parametres: <Parametres />,
  };

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
          <span className="user-avatar grad-amber">JM</span>
          <div>
            <div className="user-name">J. Mwepu</div>
            <div className="user-role">Conducteur travaux</div>
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
        <span className="user-avatar grad-amber">JM</span>
      </div>

      <main className="main">
        <div className="content">
          {error && <div className="inline-error">{error}</div>}
          {views[route]}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mob-nav">
        {MOB_PRIMARY.map((id) => {
          const item = NAV.find((x) => x.id === id);
          const lbl = { dashboard: "Accueil", chantiers: "Chantiers", plan3d: "3D", materiaux: "Achats" }[id];
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
function Dashboard({ projects, tasks, go, onNew, canMutate }) {
  const active = projects.filter((p) => p.status !== "Livre" && p.status !== "Livré");
  const avg = Math.round(projects.reduce((s, p) => s + n(p.progress), 0) / Math.max(1, projects.length));
  const budget = projects.reduce((s, p) => s + n(p.budget), 0);
  const spent = projects.reduce((s, p) => s + n(p.spent), 0);
  const late = tasks.filter((t) => t.status === "Bloque" || t.status === "Bloqué").length;
  const palette = ["grad-amber", "grad-iris", "bg-emerald"];
  const projColor = (i) => ["grad-amber", "", "grad-iris"][i % 3] || "grad-amber";

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Vue d'ensemble · juin 2026</p>
          <h2 className="title font-display">Vos chantiers</h2>
        </div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Nouveau projet</button>
      </div>

      <div className="g4 kpis" style={{ marginBottom: 16 }}>
        <KPI label="Chantiers actifs" value={active.length} sub={`${projects.length} au total`} icon="hardHat" />
        <KPI label="Avancement moyen" value={`${avg} %`} sub="tous projets" subClass="up" icon="trendingUp" />
        <KPI label="Budget engagé" value={money(spent)} sub={`/ ${money(budget)} contractés`} icon="wallet" />
        <KPI label="Retards / blocages" value={late} sub={late ? "à traiter" : "aucun"} subClass={late ? "down" : ""} icon="alert" danger={late > 0} />
      </div>

      <div className="g3">
        <section className="card pad span2">
          <div className="section-head">
            <h3 className="font-display">Chantiers en cours</h3>
            <button className="link" onClick={() => go("chantiers")}>Tout voir</button>
          </div>
          {active.slice(0, 4).map((p, i) => (
            <div className="proj-row" key={p.id}>
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
          <Todo icon="calendarCheck" tone="amber" title="Inspection béton" sub="Les Cèdres · demain 09 h" />
          <Todo icon="package" tone="rose" title="Rupture ciment proche" sub="120 sacs restants" />
          <Todo icon="receipt" tone="iris" title="Situation 3 à valider" sub="590 k$ · main d'œuvre" />
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
function Chantiers({ projects, onNew, canMutate }) {
  const selected = projects[0];
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Projets</p><h2 className="title font-display">Projets / chantiers</h2></div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Nouveau projet</button>
      </div>

      <div className="g3" style={{ marginBottom: 18 }}>
        {projects.map((p) => (
          <div className="card pad" key={p.id}>
            <div className="proj-card-head">
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              <span className="chip amber" style={{ marginLeft: "auto" }}>{n(p.progress)} %</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginBottom: 8 }}>{p.client} · {p.location}</div>
            <div className="progress"><span className="grad-amber" style={{ width: `${n(p.progress)}%` }} /></div>
            <div className="proj-meta">
              <span>{money(p.spent)} / {money(p.budget)}</span>
              <span className={p.risk === "Eleve" || p.risk === "Élevé" ? "danger-txt" : ""}>{p.risk}</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <>
          <div className="selected-banner grad-amber">
            <div>
              <div style={{ fontSize: 12, opacity: .85, display: "flex", alignItems: "center", gap: 6 }}><Icon name="hardHat" /> Chantier sélectionné</div>
              <div className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>{selected.name}</div>
              <div style={{ fontSize: 12, opacity: .85 }}>{selected.client} · {selected.location} · {selected.manager}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: .85 }}>Avancement</div>
              <div className="font-display" style={{ fontSize: 36, fontWeight: 700 }}>{n(selected.progress)} %</div>
            </div>
          </div>

          <div className="g3">
            <div className="card pad">
              <p className="kv-title"><Icon name="listChecks" /> Phases</p>
              <Phase done label="Études & permis" pct="100 %" />
              <Phase done label="Fondations" pct="100 %" />
              <Phase running label="Gros œuvre" pct="70 %" />
              <Phase label="Toiture" pct="20 %" />
              <Phase label="Finitions" pct="0 %" />
            </div>
            <div className="card pad">
              <p className="kv-title"><Icon name="pieChart" /> Budget prévu vs réel</p>
              <BudgetBar label="Matériaux" txt="980 k / 1,6 M$" pct={61} />
              <BudgetBar label="Main d'œuvre" txt="720 k / 1,1 M$" pct={65} />
              <BudgetBar label="Sous-traitance" txt="610 k / 900 k$" pct={68} />
            </div>
            <div className="card pad">
              <p className="kv-title"><Icon name="clipboard" /> Journal de chantier</p>
              <Journal accent label="12 juin — Coulage dalle niv. 2" sub="14 ouvriers · 2 photos" />
              <Journal label="11 juin — Livraison acier" sub="8 t · bon n° 2231" />
              <Journal label="10 juin — Retard ciment" sub="Fournisseur relancé" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
function Phase({ done, running, label, pct }) {
  const icon = done ? "checkCircle" : running ? "loader" : "circle";
  const color = done ? "var(--emerald-500)" : running ? "var(--amber-500)" : "var(--ink-300)";
  const txtColor = done ? "var(--emerald-600)" : running ? "var(--amber-600)" : "var(--ink-400)";
  return (
    <div className="phase">
      <Icon name={icon} className="ic" />
      <span className="grow" style={{ fontWeight: running ? 600 : 400, color }} />
      <span className="grow" style={{ fontWeight: running ? 600 : 400 }}>{label}</span>
      <span style={{ color: txtColor, fontWeight: 600 }}>{pct}</span>
    </div>
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
function Journal({ accent, label, sub }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 12 }}>
      <div className={accent ? "grad-amber" : ""} style={{ width: 4, borderRadius: 4, flex: "none", background: accent ? undefined : "var(--ink-200)" }} />
      <div><div style={{ fontWeight: 500 }}>{label}</div><div style={{ color: "var(--ink-400)" }}>{sub}</div></div>
    </div>
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
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
      <span style={{ color: "#6b7280", fontSize: 13 }}>{k}</span>
      <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }}>{v}</span>
    </div>
  );
  return (
    <section>
      <h1 className="page-title font-display" style={{ marginBottom: 16 }}>Paramètres</h1>
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

function Planning() {
  const rows = [
    { label: "Études & permis", left: 0, width: 25, color: "bg-emerald", solid: "var(--emerald-500)" },
    { label: "Fondations", left: 25, width: 25, color: "bg-emerald", solid: "var(--emerald-500)" },
    { label: "Gros œuvre", left: 50, width: 25, grad: "grad-amber", now: 62.5 },
    { label: "Toiture", left: 62.5, width: 12.5, solid: "var(--ink-300)" },
    { label: "Second œuvre", left: 75, width: 15, solid: "var(--ink-300)" },
    { label: "Finitions / livraison", left: 88, width: 12, solid: "var(--ink-300)", milestone: true },
  ];
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"];
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Planning</p><h2 className="title font-display">Planning — Les Cèdres</h2></div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="chip emerald">Terminé</span><span className="chip amber">En cours</span><span className="chip ink">À venir</span>
        </div>
      </div>
      <div className="card pad gantt-scroll">
        <div className="gantt-months"><span /> {months.map((m, i) => <span key={m} className={i === 5 ? "now" : ""}>{m}</span>)}</div>
        <div className="gantt-rows">
          {rows.map((r) => (
            <div className="gantt-row" key={r.label}>
              <div style={{ fontSize: 12, fontWeight: r.grad ? 600 : 500, color: r.solid === "var(--ink-300)" ? "var(--ink-500)" : "inherit" }}>{r.label}</div>
              <div className="gantt-track">
                <div className={`gantt-bar ${r.grad || ""}`} style={{ left: `${r.left}%`, width: `${r.width}%`, background: r.grad ? undefined : r.solid }} />
                {r.now != null && <div style={{ position: "absolute", top: -2, height: 28, width: 2, background: "var(--amber-600)", left: `${r.now}%` }} />}
                {r.milestone && <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, transform: "rotate(45deg)", background: "var(--amber-600)" }} />}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 11, color: "var(--ink-400)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: "var(--amber-600)" }} /> Aujourd'hui</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, transform: "rotate(45deg)", background: "var(--amber-600)", display: "inline-block" }} /> Jalon livraison</span>
        </div>
      </div>
      <div className="g3" style={{ marginTop: 14 }}>
        <div className="card pad"><div className="kpi-label">Durée totale</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>8 mois</div></div>
        <div className="card pad danger"><div className="kpi-label" style={{ color: "var(--rose-600)" }}>Retard chemin critique</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--rose-600)" }}>+45 jours</div></div>
        <div className="card pad"><div className="kpi-label">Prochain jalon</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Hors-d'eau</div><div className="kpi-sub">prévu 15 juil.</div></div>
      </div>
    </>
  );
}

/* ── Plan 3D & matériaux ───────────────────────────────────────────────── */
function Plan3D() {
  const metre = [
    { i: 1, c: "#475569", name: "Fondations · béton", q: "320 m³", price: "96 k$" },
    { i: 2, c: "#64748b", name: "Murs · blocs", q: "12 400 u", price: "148 k$" },
    { i: 3, c: "#f59e0b", name: "Toiture · charpente", q: "480 m²", price: "64 k$" },
    { i: 4, c: "#6366f1", name: "Menuiseries · alu", q: "86 ouvertures", price: "92 k$" },
  ];
  const [floor, setFloor] = React.useState(null); // null = tous les étages
  const [exploded, setExploded] = React.useState(false);
  const [rotated, setRotated] = React.useState(false);
  const chipBtn = { cursor: "pointer", border: 0, font: "inherit" };
  const Tab = ({ on, onClick, children }) => (
    <button type="button" className={`chip ${on ? "iris-solid grad-iris" : "ink"}`} style={chipBtn} onClick={onClick}>{children}</button>
  );
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow iris">IA</p><h2 className="title font-display">Du plan papier à la <span className="text-grad">maquette 3D</span></h2></div>
        <span className="chip iris-solid grad-iris"><Icon name="sparkles" /> Vision IA</span>
      </div>
      <div className="g3">
        <div className="card span2" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 6, padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", flexWrap: "wrap" }}>
            <Tab on={floor === null} onClick={() => setFloor(null)}>Tous les étages</Tab>
            <Tab on={floor === 0} onClick={() => setFloor(0)}>RDC</Tab>
            <Tab on={floor === 1} onClick={() => setFloor(1)}>R+1</Tab>
            <Tab on={floor === 2} onClick={() => setFloor(2)}>R+2</Tab>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <Tab on={exploded} onClick={() => setExploded((e) => !e)}><Icon name="box" /> Éclatée</Tab>
              <Tab on={rotated} onClick={() => setRotated((r) => !r)}><Icon name="rotate3d" /> Rotation</Tab>
            </span>
          </div>
          <div className="viewer3d">
            <IsoBuilding floor={floor} exploded={exploded} rotated={rotated} />
            <div style={{ position: "absolute", bottom: 8, left: 12, fontSize: 10, color: "var(--ink-500)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="rotate3d" className="ic" style={{ width: 12, height: 12 }} /> aperçu maquette · <span style={{ color: "var(--emerald-600)", fontWeight: 600 }}>{floor === null ? "3 niveaux" : ["RDC", "R+1", "R+2"][floor]}</span>
            </div>
          </div>
        </div>
        <div className="card pad">
          <p className="kv-title"><Icon name="package" /> Matériaux · métré auto</p>
          {metre.map((m) => (
            <div className="metre-row" key={m.i}>
              <span className="metre-idx" style={{ background: m.c }}>{m.i}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{m.name}</div><div style={{ color: "var(--ink-400)" }}>{m.q}</div></div>
              <span style={{ fontWeight: 600 }}>{m.price}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--ink-100)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>Devis estimé</span>
            <span className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>610 k$</span>
          </div>
          <button className="btn grad-iris" style={{ width: "100%", justifyContent: "center", color: "#fff", marginTop: 12 }}><Icon name="fileDown" /> Exporter le métré</button>
        </div>
      </div>
      <div className="g4" style={{ marginTop: 20 }}>
        <Feature icon="calculator" tone="iris" title="Métré & devis instantanés" text="Quantités extraites du plan → bon de commande en 1 clic." />
        <Feature icon="eye" tone="amber" title="Vendre sur plan" text="Le client visualise en 3D avant les travaux." />
        <Feature icon="checkCheck" tone="emerald" title="Avancement en 3D" text="On coche les matériaux posés → la maquette se remplit." />
        <Feature icon="shield" tone="rose" title="Moins de gaspillage" text="Détection d'incohérences, juste quantité commandée." />
      </div>
    </>
  );
}
function IsoBuilding({ floor = null, exploded = false, rotated = false }) {
  const gap = exploded ? 52 : 34;       // écartement vertical des niveaux
  const base = 150;                      // y du RDC (i=0)
  const op = (i) => (floor === null || floor === i ? 1 : 0.14);
  const yt = base - 2 * gap;             // niveau supérieur (R+2)
  const roofY = yt - 6;
  return (
    <svg viewBox="0 0 200 210" style={{ width: 232, height: 248, transform: rotated ? "rotateY(180deg)" : "none", transition: "transform .55s cubic-bezier(.4,0,.2,1)" }} aria-hidden="true">
      <polygon points={`60,${roofY} 100,${roofY - 22} 140,${roofY} 100,${roofY + 22}`} fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" opacity={floor === null || floor === 2 ? 1 : 0.14} style={{ transition: "opacity .35s" }} />
      {[2, 1, 0].map((i) => {
        const y = base - i * gap;
        return (
          <g key={i} opacity={op(i)} style={{ transition: "opacity .35s" }}>
            <polygon points={`60,${y} 100,${y - 22} 140,${y} 100,${y + 22}`} fill="#cfd6e2" stroke="#94a3b8" strokeWidth="1.5" />
            <polygon points={`60,${y} 100,${y + 22} 100,${y + 44} 60,${y + 22}`} fill="#9aa6b8" stroke="#64748b" strokeWidth="1.5" />
            <polygon points={`140,${y} 100,${y + 22} 100,${y + 44} 140,${y + 22}`} fill="#b6c0d0" stroke="#64748b" strokeWidth="1.5" />
            <rect x="72" y={y + 8} width="9" height="9" fill="#6366f1" transform="skewY(28)" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}
function Feature({ icon, tone, title, text }) {
  const bg = { iris: "var(--iris-50)", amber: "var(--amber-50)", emerald: "var(--emerald-100)", rose: "var(--rose-100)" }[tone];
  const fg = { iris: "var(--iris-600)", amber: "var(--amber-600)", emerald: "var(--emerald-600)", rose: "var(--rose-600)" }[tone];
  return (
    <div className="card pad">
      <div className="feature-ic" style={{ background: bg, color: fg }}><Icon name={icon} /></div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
      <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "4px 0 0" }}>{text}</p>
    </div>
  );
}

/* ── Situations & avenants ─────────────────────────────────────────────── */
function Situations() {
  const rows = [
    { n: "Situation n° 1", per: "Mars 2026", av: "25 %", amt: "1 050 k$", chip: "emerald", st: "Payée" },
    { n: "Situation n° 2", per: "Avril 2026", av: "45 %", amt: "840 k$", chip: "emerald", st: "Payée" },
    { n: "Situation n° 3", per: "Mai 2026", av: "62 %", amt: "590 k$", chip: "amber", st: "En validation MO" },
  ];
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Facturation</p><h2 className="title font-display">Situations & avenants</h2></div>
        <button className="btn btn-amber grad-amber"><Icon name="filePlus" /> Nouvelle situation</button>
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>
        <div className="card pad"><div className="kpi-label">Marché initial</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>4,00 M$</div></div>
        <div className="card pad" style={{ boxShadow: "inset 0 0 0 1px var(--amber-100)", background: "rgba(254,243,199,.3)" }}><div className="kpi-label" style={{ color: "var(--amber-700)" }}>+ Avenants</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--amber-700)" }}>+0,20 M$</div></div>
        <div className="card pad"><div className="kpi-label">Facturé à ce jour</div><div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>2,48 M$ <span style={{ fontSize: 12, color: "var(--ink-400)", fontWeight: 400 }}>/ 4,20</span></div></div>
      </div>
      <h3 className="font-display" style={{ fontSize: 15, margin: "0 0 8px" }}>Situations de travaux</h3>
      <div className="card table-card" style={{ marginBottom: 18 }}>
        <table className="bp">
          <thead><tr><th>Situation</th><th>Période</th><th>Avancement</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n}><td style={{ fontWeight: 500 }}>{r.n}</td><td style={{ color: "var(--ink-500)" }}>{r.per}</td><td>{r.av}</td><td>{r.amt}</td><td><span className={`chip ${r.chip}`}>{r.st}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="font-display" style={{ fontSize: 15, margin: "0 0 8px" }}>Avenants / ordres de changement</h3>
      <div className="g2">
        <Avenant tag="Avenant 01" amt="+120 k$" title="Renforcement fondations (sol argileux)" sub="Validé · délai +20 j" />
        <Avenant tag="Avenant 02" amt="+80 k$" title="Upgrade menuiseries alu (demande MO)" sub="En attente de signature" />
      </div>
    </>
  );
}
function Avenant({ tag, amt, title, sub }) {
  return (
    <div className="card pad">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span className="chip amber">{tag}</span>
        <span style={{ marginLeft: "auto", color: "var(--emerald-600)", fontWeight: 700 }}>{amt}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ink-400)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

/* ── Matériaux & achats ────────────────────────────────────────────────── */
function Materiaux({ materials, onNew, canMutate }) {
  const low = materials.filter((m) => n(m.stock) < n(m.min ?? m.minStock)).length;
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Achats</p><h2 className="title font-display">Matériaux & achats</h2></div>
        <button className="btn btn-amber grad-amber" disabled={!canMutate} onClick={onNew}><Icon name="plus" /> Bon de commande</button>
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

/* ── Sous-traitants ────────────────────────────────────────────────────── */
function SousTraitants() {
  const subs = [
    { name: "ÉlectroPlus SARL", trade: "Électricité", icon: "zap", grad: "", bg: "#0f172a", site: "Tour Horizon", amt: "420 k$", rating: 4.2 },
    { name: "AquaTech", trade: "Plomberie", icon: "droplet", grad: "", bg: "var(--iris-600)", site: "Les Cèdres", amt: "280 k$", chip: "emerald", st: "Contrat actif" },
    { name: "Déco+ Finitions", trade: "Peinture", icon: "paint", grad: "grad-amber", site: "Villas du Lac", amt: "150 k$", chip: "amber", st: "En cours" },
  ];
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Partenaires</p><h2 className="title font-display">Sous-traitants</h2></div>
        <button className="btn btn-amber grad-amber"><Icon name="userPlus" /> Ajouter</button>
      </div>
      <div className="g3">
        {subs.map((s) => (
          <div className="card pad" key={s.name}>
            <div className="sub-head">
              <span className={`sub-ic ${s.grad}`} style={s.grad ? undefined : { background: s.bg }}><Icon name={s.icon} /></span>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div><div style={{ fontSize: 12, color: "var(--ink-500)" }}>{s.trade}</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "var(--ink-500)" }}>{s.site}</span><span style={{ fontWeight: 600 }}>{s.amt}</span></div>
            {s.rating ? (
              <div className="stars">{[0, 1, 2, 3].map((i) => <Icon key={i} name="star" />)}<span style={{ color: "var(--ink-400)", marginLeft: 4 }}>{s.rating}</span></div>
            ) : (
              <div style={{ marginTop: 8 }}><span className={`chip ${s.chip}`}>{s.st}</span></div>
            )}
          </div>
        ))}
      </div>
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
                <select value={form.currency_id || ""} onChange={(e) => set("currency_id", e.target.value || null)}>
                  <option value="">— Devise —</option>
                  {currencies.map((c) => <option key={c.id} value={c.id}>{c.currencyCode || c.currencyName || c.name}</option>)}
                </select>
              </label>
              <Field label="Budget (coût)" type="number" value={form.budget} onChange={(v) => set("budget", v)} />
              <Field label="Dépensé" type="number" value={form.spent} onChange={(v) => set("spent", v)} />
              <Field label="Montant contrat (client)" type="number" value={form.contractAmount} onChange={(v) => set("contractAmount", v)} />
              <Field label="Déjà facturé" type="number" value={form.billedAmount} onChange={(v) => set("billedAmount", v)} />
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
