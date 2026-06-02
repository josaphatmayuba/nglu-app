import { useState } from "react";
import {
  LayoutDashboard, Building, Building2, MapPin, Users, FileSignature, FileCheck2,
  UserPlus, Wallet, Smartphone, Wrench, UserRound, Settings, Home, Menu, LogOut, Lock,
} from "lucide-react";
import { useAuthToken, clearToken } from "./auth.jsx";
import { Dashboard } from "./screens/dashboard.jsx";
import { Biens } from "./screens/biens.jsx";
import { Placeholder } from "./screens/placeholder.jsx";

// Navigation : organisée en sections (bureau). `daily` = items de la bottom-nav mobile.
const NAV = [
  { sec: "Pilotage", items: [{ key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
  { sec: "Patrimoine", items: [
    { key: "biens", label: "Biens & unités", icon: Building },
    { key: "carte", label: "Carte des biens", icon: MapPin },
    { key: "locataires", label: "Locataires", icon: Users },
  ] },
  { sec: "Locatif", items: [
    { key: "baux", label: "Baux", icon: FileSignature },
    { key: "contrats", label: "Contrats & signature", icon: FileCheck2 },
    { key: "onboarding", label: "Onboarding locataire", icon: UserPlus },
    { key: "loyers", label: "Loyers & paiements", icon: Wallet },
    { key: "paiement", label: "Paiement & quittance", icon: Smartphone },
    { key: "maintenance", label: "Maintenance", icon: Wrench },
  ] },
  { sec: "Espace & config", items: [
    { key: "portail", label: "Espace locataire", icon: UserRound },
    { key: "reglages", label: "Réglages", icon: Settings },
  ] },
];
const TITLES = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.key, i.label]));
const DAILY = ["dashboard", "loyers", "locataires", "maintenance"]; // + "Plus"
const MORE = ["baux", "contrats", "onboarding", "carte", "portail", "reglages"];

const SCREENS = {
  dashboard: (nav) => <Dashboard go={nav} />,
  biens: () => <Biens />,
  // À implémenter dans les stories suivantes (SCRUM-245..251) :
  carte: () => <Placeholder title="Carte des biens" story="SCRUM-245" />,
  locataires: () => <Placeholder title="Locataires" story="SCRUM-246" />,
  baux: () => <Placeholder title="Baux" story="SCRUM-247" />,
  contrats: () => <Placeholder title="Contrats & signature" story="SCRUM-247" />,
  onboarding: () => <Placeholder title="Onboarding locataire" story="SCRUM-246" />,
  loyers: () => <Placeholder title="Loyers & paiements" story="SCRUM-248" />,
  paiement: () => <Placeholder title="Paiement & quittance" story="SCRUM-248" />,
  maintenance: () => <Placeholder title="Maintenance" story="SCRUM-263" />,
  portail: () => <Placeholder title="Espace locataire" story="SCRUM-249" />,
  reglages: () => <Placeholder title="Réglages" story="SCRUM-250" />,
};

export default function App() {
  const token = useAuthToken();
  const [view, setView] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);

  if (!token) return <ConnectScreen />;

  const go = (key) => {
    setView(key);
    setMoreOpen(false);
    window.scrollTo(0, 0);
  };

  const ScreenEl = (SCREENS[view] || SCREENS.dashboard)(go);

  return (
    <div className="shell">
      {/* ── Sidebar (bureau) ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><Building2 size={18} color="#fff" /></div>
          <div className="font-display" style={{ fontWeight: 600, fontSize: 15 }}>Domus</div>
        </div>
        {NAV.map((s) => (
          <div key={s.sec}>
            <div className="nav-sec">{s.sec}</div>
            {s.items.map((i) => {
              const Icon = i.icon;
              return (
                <button key={i.key} className={`navlink ${view === i.key ? "active" : ""}`} onClick={() => go(i.key)}>
                  <Icon size={16} /> {i.label}
                </button>
              );
            })}
          </div>
        ))}
        <div className="sidebar-user">
          <div className="avatar">AK</div>
          <div style={{ fontSize: 12, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 500 }}>A. Kalala</div>
            <div style={{ color: "var(--ink-400)", fontSize: 11 }}>Gestionnaire</div>
          </div>
          <button className="navlink" style={{ width: "auto", marginLeft: "auto", padding: 8 }} title="Se déconnecter" onClick={clearToken}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className="main">
        <div className="topbar">
          <div className="eyebrow">Domus · Gestion locative</div>
          <div style={{ marginLeft: "auto" }} className="chip chip-iris">Connecté</div>
        </div>

        {/* En-tête mobile */}
        <div className="mobhead mob-only">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-logo" style={{ width: 32, height: 32 }}><Building2 size={16} color="#fff" /></div>
            <span className="mh-title">{TITLES[view]}</span>
          </div>
          <div className="avatar">AK</div>
        </div>

        <div className="content">{ScreenEl}</div>
      </main>

      {/* ── Bottom-nav mobile ── */}
      <nav className="mobnav">
        {DAILY.map((k) => {
          const item = NAV.flatMap((s) => s.items).find((i) => i.key === k);
          const Icon = k === "dashboard" ? Home : item.icon;
          const label = k === "dashboard" ? "Accueil" : k === "locataires" ? "Locat." : k === "maintenance" ? "Maint." : item.label;
          return (
            <button key={k} className={view === k ? "active" : ""} onClick={() => go(k)}>
              <Icon size={20} /> <span>{label}</span>
            </button>
          );
        })}
        <button className={MORE.includes(view) ? "active" : ""} onClick={() => setMoreOpen(true)}>
          <Menu size={20} /> <span>Plus</span>
        </button>
      </nav>

      {/* ── Feuille « Plus » ── */}
      <div className={`moresheet ${moreOpen ? "open" : ""}`}>
        <div className="scrim" onClick={() => setMoreOpen(false)} />
        <div className="panel">
          <div className="grip" />
          <div className="nav-sec" style={{ color: "var(--ink-400)" }}>Tout le reste</div>
          {MORE.map((k) => {
            const item = NAV.flatMap((s) => s.items).find((i) => i.key === k);
            const Icon = item.icon;
            return (
              <div key={k} className="mrow" onClick={() => go(k)}>
                <Icon size={20} /> {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Écran de connexion : si pas de token partagé, on guide l'utilisateur.
// (L'auth réelle se fait via le CRM ; Domus réutilise le même token.)
function ConnectScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", padding: 28, textAlign: "center" }}>
        <div className="brand-logo" style={{ margin: "0 auto 14px" }}><Lock size={18} color="#fff" /></div>
        <div className="title" style={{ fontSize: 20 }}>Connexion requise</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
          Domus utilise votre session NgoluApp. Ouvrez l'application depuis le CRM
          (ou connectez-vous), puis revenez ici.
        </p>
        <a className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 16, textDecoration: "none" }} href="/admin">
          Aller à la connexion
        </a>
        <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
          En dev, un token <code>access-token</code> dans le localStorage suffit.
        </p>
      </div>
    </div>
  );
}
