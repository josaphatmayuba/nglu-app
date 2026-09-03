import { useEffect, useState } from "react";
import {
  BookOpen, LayoutDashboard, Activity, Calendar, CheckSquare, Pin,
  Download, Shield, Settings, Home, Menu, LogOut, CloudUpload,
} from "lucide-react";
import { LoginScreen, useAuthToken, clearToken } from "./auth.jsx";
import { startRealtimeClient, stopRealtimeClient, useRealtimeStatus } from "./realtime.js";
import { pendingCount } from "./offline-outbox.js";
import { clearAllCaches } from "./offline-db.js";
import { NetStatusPill } from "./offline-status.jsx";
import { t, useLang } from "./i18n.js";
import { Dashboard } from "./screens/dashboard.jsx";
import { Activite } from "./screens/activite.jsx";
import { Calendrier } from "./screens/calendrier.jsx";
import { Taches } from "./screens/taches.jsx";
import { Epingles } from "./screens/epingles.jsx";
import { Export } from "./screens/export.jsx";
import { Audit } from "./screens/audit.jsx";
import { Parametres } from "./screens/parametres.jsx";

const NAV = [
  { sec: "Pilotage", items: [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  ]},
  { sec: "Journal", items: [
    { key: "activite", label: "Fil d'activité", icon: Activity },
    { key: "calendrier", label: "Calendrier", icon: Calendar },
    { key: "taches", label: "Tâches & rappels", icon: CheckSquare },
    { key: "epingles", label: "Épinglés", icon: Pin },
  ]},
  { sec: "Outils", items: [
    { key: "export", label: "Export", icon: Download },
    { key: "audit", label: "Audit", icon: Shield },
    { key: "parametres", label: "Paramètres", icon: Settings },
  ]},
];

const TITLES = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.key, i.label]));
const DAILY = ["dashboard", "activite", "taches", "calendrier"];
const MORE = ["epingles", "export", "audit", "parametres"];

const SCREENS = {
  dashboard: (nav) => <Dashboard go={nav} />,
  activite: (nav) => <Activite go={nav} />,
  calendrier: (nav) => <Calendrier go={nav} />,
  taches: (nav) => <Taches go={nav} />,
  epingles: (nav) => <Epingles go={nav} />,
  export: () => <Export />,
  audit: () => <Audit />,
  parametres: () => <Parametres />,
};

export default function App() {
  const token = useAuthToken();
  const [view, setView] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const realtimeOnline = useRealtimeStatus();
  const [lang, setLang] = useLang();

  useEffect(() => {
    if (!token) return undefined;
    startRealtimeClient();
    return () => stopRealtimeClient();
  }, [token]);

  // Hors ligne au retour dans l'app : le token mémoire est vide (jamais
  // persisté, SCRUM-119) et le refresh via cookie a échoué faute de réseau
  // (restoreSession() jette isNetworkError, voir auth.jsx). On ne renvoie
  // PAS vers le login dans ce cas : `isLogged` prouve qu'une session a déjà
  // réussi sur cet appareil, donc on affiche l'app en mode dégradé (lecture
  // cache) plutôt que de forcer une reconnexion impossible hors ligne
  // (même fix appliqué aujourd'hui dans farmos-app/src/app.jsx).
  const hadSession = (() => {
    try { return localStorage.getItem("isLogged") === "true"; } catch { return false; }
  })();
  if (!token) {
    if (typeof navigator !== "undefined" && navigator.onLine === false && hadSession) {
      // fall through — rendu de l'app en mode dégradé ci-dessous
    } else {
      return <LoginScreen />;
    }
  }

  const go = (key) => { setView(key); setMoreOpen(false); window.scrollTo(0, 0); };
  const ScreenEl = (SCREENS[view] || SCREENS.dashboard)(go);

  // Purge aussi le miroir IndexedDB (events/tasks + outbox) au logout : sur un
  // poste partagé, les données de l'utilisateur précédent ne doivent pas
  // rester lisibles par le suivant (même fix appliqué aujourd'hui dans
  // farmos-app/kodatill-app).
  const logout = () => {
    clearAllCaches().catch(() => {});
    clearToken();
  };

  return (
    <div className="shell">
      {/* ── Sidebar bureau ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><BookOpen size={18} color="#fff" /></div>
          <div className="font-display" style={{ fontWeight:600, fontSize:15 }}>Journal</div>
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
          <div className="avatar">{userName()}</div>
          <div style={{ fontSize:12, lineHeight:1.2, minWidth:0, overflow:"hidden" }}>
            <div style={{ fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {userDisplay()}
            </div>
            <div style={{ color:"var(--ink-400)", fontSize:11 }}>{t("Gestionnaire")}</div>
          </div>
          <button className="btn btn-ghost" style={{ marginLeft:"auto", padding:6, minWidth:0 }}
            title="Langue" onClick={() => setLang(lang === "fr" ? "en" : "fr")}>
            {lang === "fr" ? "EN" : "FR"}
          </button>
          <button className="navlink" style={{ width:"auto", padding:8 }} title={t("Se déconnecter")} onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main className="main">
        <div className="topbar">
          <div className="eyebrow">{t("Journal Entreprise")}</div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
            <OutboxPill />
            <NetStatusPill />
            <RealtimePill online={realtimeOnline} />
          </div>
        </div>

        {/* En-tête mobile */}
        <div className="mobhead mob-only">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="brand-logo" style={{ width:32, height:32 }}><BookOpen size={16} color="#fff" /></div>
            <span className="mh-title">{t(TITLES[view] || "Journal")}</span>
          </div>
          <RealtimePill online={realtimeOnline} compact />
          <div className="avatar">{userName()}</div>
        </div>

        <div className="content">{ScreenEl}</div>
      </main>

      {/* ── Bottom-nav mobile ── */}
      <nav className="mobnav">
        {DAILY.map((k) => {
          const item = NAV.flatMap((s) => s.items).find((i) => i.key === k);
          const Icon = k === "dashboard" ? Home : item.icon;
          const label = k === "dashboard" ? t("Accueil") : t(item.label).split(" ")[0];
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

      {/* ── Feuille « Plus » ── */}
      <div className={`moresheet ${moreOpen ? "open" : ""}`}>
        <div className="scrim" onClick={() => setMoreOpen(false)} />
        <div className="panel">
          <div className="grip" />
          <div className="nav-sec" style={{ color:"var(--ink-400)" }}>{t("Tout le reste")}</div>
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
    </div>
  );
}

function userName() {
  try {
    const u = localStorage.getItem("user") || "";
    const parts = u.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  } catch {}
  return "JE";
}

function userDisplay() {
  try { return localStorage.getItem("user") || "Utilisateur"; } catch { return "Utilisateur"; }
}

function useOutboxCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const refresh = () => pendingCount().then(setN).catch(() => {});
    refresh();
    window.addEventListener("journal:outbox-changed", refresh);
    return () => window.removeEventListener("journal:outbox-changed", refresh);
  }, []);
  return n;
}

function OutboxPill() {
  const count = useOutboxCount();
  if (!count) return null;
  return (
    <div className="rt-pill outbox-pill" title={`${count} modification(s) en attente`}>
      <CloudUpload size={13} />
      <span>{count} {t("en attente")}</span>
    </div>
  );
}

function RealtimePill({ online, compact = false }) {
  const label = online ? t("Direct") : t("Hors ligne");
  return (
    <div className={`rt-pill ${online ? "rt-on" : "rt-off"}`}
      title={online ? "Temps réel actif" : "Temps réel interrompu — reconnexion..."}>
      <span className="rt-dot" />
      {!compact && <span>{label}</span>}
    </div>
  );
}
