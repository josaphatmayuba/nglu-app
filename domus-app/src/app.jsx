import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building, Building2, MapPin, Users, FileSignature, FileCheck2,
  UserPlus, Wallet, Smartphone, Wrench, UserRound, Settings, Home, Menu, LogOut,
} from "lucide-react";
import { LoginScreen, useAuthToken, clearToken } from "./auth.jsx";
import { startRealtimeClient, stopRealtimeClient, useRealtimeStatus } from "./realtime.js";
import { Dashboard } from "./screens/dashboard.jsx";
import { Biens } from "./screens/biens.jsx";
import { CarteBiens } from "./screens/carte.jsx";
import { Locataires } from "./screens/locataires.jsx";
import { Loyers, Paiement } from "./screens/loyers.jsx";
import { Maintenance } from "./screens/maintenance.jsx";
import { Baux } from "./screens/baux.jsx";
import { Reglages } from "./screens/reglages.jsx";
import { Portail } from "./screens/portail.jsx";
import { Contrats } from "./screens/contrats.jsx";
import { Placeholder } from "./screens/placeholder.jsx";
import { useDeviceMode } from "./data.js";
import { DateRangeBar, DateRangeProvider } from "./dateRange.jsx";

const NAV = [
  { sec: "Pilotage", items: [{ key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
  { sec: "Patrimoine", items: [
    { key: "biens", label: "Propriétés", icon: Building },
    { key: "carte", label: "Carte des propriétés", icon: MapPin },
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
const DAILY = ["dashboard", "loyers", "locataires", "maintenance"];
const MORE = ["baux", "contrats", "onboarding", "carte", "portail", "reglages"];

const SCREENS = {
  dashboard: (nav, device) => <Dashboard go={nav} device={device} />,
  biens: (nav, device) => <Biens go={nav} device={device} />,
  carte: (_nav, device) => <CarteBiens device={device} />,
  locataires: (_nav, device) => <Locataires device={device} />,
  baux: (nav, device) => <Baux go={nav} device={device} />,
  contrats: (_nav, device) => <Contrats device={device} />,
  onboarding: (_nav, device) => <Placeholder title="Onboarding locataire" story="SCRUM-246" device={device} />,
  loyers: (nav, device) => <Loyers go={nav} device={device} />,
  paiement: (nav, device) => <Paiement go={nav} device={device} />,
  maintenance: (_nav, device) => <Maintenance device={device} />,
  portail: (nav, device) => <Portail go={nav} device={device} />,
  reglages: (_nav, device) => <Reglages device={device} />,
};

export default function App() {
  const token = useAuthToken();
  const [view, setView] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const device = useDeviceMode();
  const realtimeOnline = useRealtimeStatus();

  // Connexion temps réel maintenue tant qu'une session est ouverte.
  useEffect(() => {
    if (!token) return undefined;
    startRealtimeClient();
    return () => stopRealtimeClient();
  }, [token]);

  if (!token) return <LoginScreen />;

  const go = (key) => {
    setView(key);
    setMoreOpen(false);
    window.scrollTo(0, 0);
  };

  const ScreenEl = (SCREENS[view] || SCREENS.dashboard)(go, device);

  return (
    <DateRangeProvider>
    <div className="shell" data-layout={device.mode} data-mobile={device.isMobile ? "true" : "false"}>
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
          <button className="navlink" style={{ width: "auto", marginLeft: "auto", padding: 8 }} title="Se deconnecter" onClick={clearToken}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="eyebrow">Domus - Gestion locative</div>
          <RealtimePill online={realtimeOnline} style={{ marginLeft: "auto" }} />
        </div>
        <DateRangeBar />

        <div className="mobhead mob-only">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-logo" style={{ width: 32, height: 32 }}><Building2 size={16} color="#fff" /></div>
            <span className="mh-title">{TITLES[view]}</span>
          </div>
          <RealtimePill online={realtimeOnline} compact />
          <div className="avatar">AK</div>
        </div>

        <div className="content">{ScreenEl}</div>
      </main>

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
    </DateRangeProvider>
  );
}

function RealtimePill({ online, compact = false, style }) {
  const label = online ? "Direct" : "Hors ligne";
  return (
    <div
      className={`rt-pill ${online ? "rt-on" : "rt-off"}`}
      style={style}
      title={online ? "Temps réel actif - les données se mettent à jour automatiquement" : "Temps réel interrompu - reconnexion..."}
    >
      <span className="rt-dot" />
      {!compact && <span>{label}</span>}
    </div>
  );
}
