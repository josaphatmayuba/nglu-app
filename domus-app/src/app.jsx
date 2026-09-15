import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building, Building2, MapPin, Users, FileSignature, FileCheck2,
  UserPlus, Wallet, Smartphone, Wrench, UserRound, Settings, Home, Menu, LogOut, CloudUpload, TrendingUp, BedDouble,
  ShieldCheck, Receipt, Landmark, BarChart3,
} from "lucide-react";
import { LoginScreen, useAuthToken, useAuthUser, clearToken } from "./auth.jsx";
import { startRealtimeClient, stopRealtimeClient, useRealtimeStatus } from "./realtime.js";
import { outboxCount } from "./outbox.js";
import { t, useLang } from "./i18n.js";
import { Dashboard } from "./screens/dashboard.jsx";
import { Biens } from "./screens/biens.jsx";
import { CarteBiens } from "./screens/carte.jsx";
import { Locataires } from "./screens/locataires.jsx";
import { Loyers, Paiement } from "./screens/loyers.jsx";
import { Maintenance } from "./screens/maintenance.jsx";
import { Depenses } from "./screens/depenses.jsx";
import { Hypotheque } from "./screens/hypotheque.jsx";
import { Pnl } from "./screens/pnl.jsx";
import { Baux } from "./screens/baux.jsx";
import { Reservations } from "./screens/reservations.jsx";
import { Reglages } from "./screens/reglages.jsx";
import { Portail } from "./screens/portail.jsx";
import { Contrats } from "./screens/contrats.jsx";
import { Onboarding } from "./screens/onboarding.jsx";
import { Prescreening } from "./screens/prescreening.jsx";
import { Forecast } from "./screens/forecast.jsx";
import { TenantOnboardingPublic } from "./screens/onboarding-public.jsx";
import { PrescreeningPublic } from "./screens/prescreening-public.jsx";
import { PublicReservationsPage } from "./screens/public-reservations.jsx";
import { useDeviceMode } from "./data.js";
import { DateRangeBar, DateRangeProvider } from "./dateRange.jsx";
import { DialogProvider } from "./components/Dialog.jsx";
import { AiAssistant } from "./aiAssistant.jsx";

const NAV = [
  { sec: "Pilotage", items: [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "previsionnel", label: "Prévisionnel", icon: TrendingUp },
    { key: "pnl", label: "P&L par propriété", icon: BarChart3 },
  ] },
  { sec: "Patrimoine", items: [
    { key: "biens", label: "Propriétés", icon: Building },
    { key: "carte", label: "Carte des propriétés", icon: MapPin },
    { key: "locataires", label: "Locataires", icon: Users },
  ] },
  { sec: "Locatif", items: [
    { key: "baux", label: "Baux", icon: FileSignature },
    { key: "reservations", label: "Réservations", icon: BedDouble },
    { key: "contrats", label: "Contrats & signature", icon: FileCheck2 },
    { key: "prescreening", label: "Enquête de prélocation", icon: ShieldCheck },
    { key: "onboarding", label: "Onboarding locataire", icon: UserPlus },
    { key: "loyers", label: "Loyers & paiements", icon: Wallet },
    { key: "paiement", label: "Paiement & quittance", icon: Smartphone },
    { key: "maintenance", label: "Maintenance", icon: Wrench },
    { key: "depenses", label: "Dépenses", icon: Receipt },
    { key: "hypotheque", label: "Hypothèque", icon: Landmark },
  ] },
  { sec: "Espace & config", items: [
    { key: "portail", label: "Espace locataire", icon: UserRound },
    { key: "reglages", label: "Réglages", icon: Settings },
  ] },
];

const TITLES = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.key, i.label]));
const DAILY = ["dashboard", "loyers", "locataires", "maintenance"];
const MORE = ["previsionnel", "pnl", "baux", "reservations", "contrats", "prescreening", "onboarding", "carte", "depenses", "hypotheque", "portail", "reglages"];

const SCREENS = {
  dashboard: (nav, device) => <Dashboard go={nav} device={device} />,
  previsionnel: () => <Forecast />,
  pnl: () => <Pnl />,
  biens: (nav, device) => <Biens go={nav} device={device} />,
  carte: (_nav, device) => <CarteBiens device={device} />,
  locataires: (nav, device) => <Locataires go={nav} device={device} />,
  baux: (nav, device) => <Baux go={nav} device={device} />,
  reservations: (nav, device) => <Reservations go={nav} device={device} />,
  contrats: (_nav, device) => <Contrats device={device} />,
  prescreening: (nav) => <Prescreening go={nav} />,
  onboarding: (nav) => <Onboarding go={nav} />,
  loyers: (nav, device) => <Loyers go={nav} device={device} />,
  paiement: (nav, device) => <Paiement go={nav} device={device} />,
  maintenance: (_nav, device) => <Maintenance device={device} />,
  depenses: (_nav, device) => <Depenses device={device} />,
  hypotheque: (_nav, device) => <Hypotheque device={device} />,
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

// Route publique de l'enquête de prélocation (/domus/prescreening/candidature?token=...) —
// sans auth, même principe que useOnboardingRoute. Tolère un ancien lien par
// hash (#/prescreening?token=) par robustesse.
function usePrescreeningRoute() {
  const read = () => {
    if (typeof window === "undefined") return null;
    const { pathname, search, hash } = window.location;
    if (/\/prescreening\/candidature\/?$/.test(pathname || "")) {
      return new URLSearchParams(search || "").get("token") || "";
    }
    const m = (hash || "").match(/^#\/prescreening(?:\?(.*))?$/);
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

function usePublicReservationsRoute() {
  const read = () => {
    if (typeof window === "undefined") return null;
    const { pathname, hash } = window.location;
    const match = (pathname || "").match(/\/public(?:\/([^/?#]+))?\/?$/);
    if (match) return decodeURIComponent(match[1] || "");
    const hashMatch = (hash || "").match(/^#\/public(?:\/([^/?#]+))?$/);
    if (hashMatch) return decodeURIComponent(hashMatch[1] || "");
    return null;
  };
  const [key, setKey] = useState(read);
  useEffect(() => {
    const on = () => setKey(read());
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
    };
  }, []);
  return key;
}

export default function App() {
  const token = useAuthToken();
  const onboardingToken = useOnboardingRoute();
  const prescreeningToken = usePrescreeningRoute();
  const publicReservationsKey = usePublicReservationsRoute();
  const [view, setView] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const device = useDeviceMode();
  const realtimeOnline = useRealtimeStatus();
  const [lang, setLang] = useLang();
  const authUser = useAuthUser();

  // Connexion temps réel maintenue tant qu'une session est ouverte.
  useEffect(() => {
    if (!token || onboardingToken !== null || prescreeningToken !== null) return undefined;
    startRealtimeClient();
    return () => stopRealtimeClient();
  }, [token, onboardingToken, prescreeningToken]);

  // Page publique d'onboarding : prioritaire sur l'authentification.
  if (onboardingToken !== null) return <TenantOnboardingPublic token={onboardingToken} />;
  if (prescreeningToken !== null) return <PrescreeningPublic token={prescreeningToken} />;
  if (publicReservationsKey !== null) return <PublicReservationsPage routeKey={publicReservationsKey} />;

  if (!token) return <LoginScreen />;

  const go = (key) => {
    setView(key);
    setMoreOpen(false);
    window.scrollTo(0, 0);
  };

  const ScreenEl = (SCREENS[view] || SCREENS.dashboard)(go, device);

  return (
    <DateRangeProvider>
    <DialogProvider>
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
          <div className="avatar">{authUser.initials}</div>
          <div style={{ fontSize: 12, lineHeight: 1.2, minWidth: 0, flex: "1 1 auto" }}>
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {authUser.displayName}
            </div>
            <div style={{ color: "var(--ink-400)", fontSize: 11 }}>{t(authUser.roleLabel)}</div>
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
          <div className="avatar">{authUser.initials}</div>
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
    </DialogProvider>
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
