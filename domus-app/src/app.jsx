import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building, Building2, MapPin, Users, FileSignature, FileCheck2,
  UserPlus, Wallet, Smartphone, Wrench, UserRound, Settings, Home, Menu, LogOut, CloudUpload, TrendingUp,
} from "lucide-react";
import { LoginScreen, useAuthToken, clearToken } from "./auth.jsx";
import { startRealtimeClient, stopRealtimeClient, useRealtimeStatus } from "./realtime.js";
import { outboxCount } from "./outbox.js";
import { t, useLang } from "./i18n.js";
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
import { Forecast } from "./screens/forecast.jsx";
import { TenantOnboardingPublic } from "./screens/onboarding-public.jsx";
import { Placeholder } from "./screens/placeholder.jsx";
import { useDeviceMode } from "./data.js";
import { DateRangeBar, DateRangeProvider } from "./dateRange.jsx";
import { AiAssistant } from "./aiAssistant.jsx";

const NAV = [
  { sec: "Pilotage", items: [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "previsionnel", label: "Prévisionnel", icon: TrendingUp },
  ] },
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
const MORE = ["previsionnel", "baux", "contrats", "onboarding", "carte", "portail", "reglages"];

const SCREENS = {
  dashboard: (nav, device) => <Dashboard go={nav} device={device} />,
  previsionnel: () => <Forecast />,
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

// Route publique d'inscription locataire (/domus/onboarding/tenant?token=...) —
// sans auth. URL propre servie via le fallback SPA nginx ; on tolère aussi un
// éventuel ancien lien par hash (#/onboarding?token=) par robustesse.
function useOnboardingRoute() {
  const read = () => {
    if (typeof window === "undefined") return null;
    const { pathname, search, hash } = window.location;
    if (/\/onboarding\/tenant\/?$/.test(pathname || "")) {
      return new URLSearchParams(search || "").get("token") || "";
    }
    const m = (hash || "").match(/^#\/onboarding(?:\?(.*))?$/);
    if (m) return new URLSearchParams(m[1] || "").get("token") || "";
    return null;
  };
  const [token, setToken] = useState(read);
  useEffect(() => {
    const on = () => setToken(read());
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  return token;
}

export default function App() {
  const token = useAuthToken();
  const onboardingToken = useOnboardingRoute();
  const [view, setView] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const device = useDeviceMode();
  const realtimeOnline = useRealtimeStatus();
  const [lang, setLang] = useLang();

  // Connexion temps réel maintenue tant qu'une session est ouverte.
  useEffect(() => {
    if (!token || onboardingToken !== null) return undefined;
    startRealtimeClient();
    return () => stopRealtimeClient();
  }, [token, onboardingToken]);

  // Page publique d'onboarding : prioritaire sur l'authentification.
  if (onboardingToken !== null) return <TenantOnboardingPublic token={onboardingToken} />;

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
            <div className="nav-sec">{t(s.sec)}</div>
            {s.items.map((i) => {
              const Icon = i.icon;
              return (
                <button key={i.key} className={`navlink ${view === i.key ? "active" : ""}`} onClick={() => go(i.key)}>
                  <Icon size={16} /> {t(i.label)}
                </button>
              );
            })}
          </div>
        ))}
        <div className="sidebar-user">
          <div className="avatar">AK</div>
          <div style={{ fontSize: 12, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 500 }}>A. Kalala</div>
            <div style={{ color: "var(--ink-400)", fontSize: 11 }}>{t("Gestionnaire")}</div>
          </div>
          <button className="lang-toggle" style={{ marginLeft: "auto" }} title="Langue / Language"
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}>
            {lang === "fr" ? "EN" : "FR"}
          </button>
          <button className="navlink" style={{ width: "auto", padding: 8 }} title={t("Se deconnecter")} onClick={clearToken}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="eyebrow">{t("Domus - Gestion locative")}</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <OutboxPill />
            <RealtimePill online={realtimeOnline} />
          </div>
        </div>
        <DateRangeBar />

        <div className="mobhead mob-only">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-logo" style={{ width: 32, height: 32 }}><Building2 size={16} color="#fff" /></div>
            <span className="mh-title">{t(TITLES[view])}</span>
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
          const label = k === "dashboard" ? t("Accueil") : k === "locataires" ? t("Locataires") : k === "maintenance" ? t("Maintenance") : t(item.label);
          return (
            <button key={k} className={view === k ? "active" : ""} onClick={() => go(k)}>
              <Icon size={20} /> <span>{label}</span>
            </button>
          );
        })}
        <button className={MORE.includes(view) ? "active" : ""} onClick={() => setMoreOpen(true)}>
          <Menu size={20} /> <span>{t("Plus")}</span>
        </button>
      </nav>

      <div className={`moresheet ${moreOpen ? "open" : ""}`}>
        <div className="scrim" onClick={() => setMoreOpen(false)} />
        <div className="panel">
          <div className="grip" />
          <div className="nav-sec" style={{ color: "var(--ink-400)" }}>{t("Tout le reste")}</div>
          {MORE.map((k) => {
            const item = NAV.flatMap((s) => s.items).find((i) => i.key === k);
            const Icon = item.icon;
            return (
              <div key={k} className="mrow" onClick={() => go(k)}>
                <Icon size={20} /> {t(item.label)}
              </div>
            );
          })}
        </div>
      </div>
      <AiAssistant />
    </div>
    </DateRangeProvider>
  );
}

function useOutboxCount() {
  const [n, setN] = useState(() => outboxCount());
  useEffect(() => {
    const refresh = () => setN(outboxCount());
    window.addEventListener("domus-outbox-changed", refresh);
    window.addEventListener("domus-outbox-synced", refresh);
    return () => {
      window.removeEventListener("domus-outbox-changed", refresh);
      window.removeEventListener("domus-outbox-synced", refresh);
    };
  }, []);
  return n;
}

function OutboxPill() {
  const count = useOutboxCount();
  if (!count) return null;
  return (
    <div className="rt-pill outbox-pill" title={`${count} modification(s) en attente de synchronisation (hors ligne)`}>
      <CloudUpload size={13} />
      <span>{count} {t("en attente")}</span>
    </div>
  );
}

function RealtimePill({ online, compact = false, style }) {
  const label = online ? t("Direct") : t("Hors ligne");
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
