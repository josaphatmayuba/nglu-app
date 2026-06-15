import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, ListChecks, Inbox, PlusSquare, Eye,
  Settings, LogOut, TicketCheck, Menu, Home, CheckSquare,
} from "lucide-react";
import { LoginScreen, useAuthToken, clearToken } from "./auth.jsx";
import { useCurrentUser } from "./data.js";
import { Dashboard } from "./screens/dashboard.jsx";
import { Liste } from "./screens/liste.jsx";
import { Approbation } from "./screens/approbation.jsx";
import { Nouveau } from "./screens/nouveau.jsx";
import { Detail } from "./screens/detail.jsx";

const NAV = [
  {
    sec: "Vue d'ensemble",
    items: [{ key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard }],
  },
  {
    sec: "Tickets",
    items: [
      { key: "liste",        label: "Mes tickets",    icon: ListChecks },
      { key: "approbation",  label: "À approuver",    icon: Inbox, badge: true },
      { key: "nouveau",      label: "Nouveau ticket", icon: PlusSquare },
    ],
  },
  {
    sec: "Lié à",
    items: [
      { key: "ledger", label: "Ledger / Comptabilité", icon: Settings, external: "/comptabilite/" },
    ],
  },
];

const MOBNAV = ["dashboard", "liste", "approbation", "nouveau"];

export default function App() {
  const token = useAuthToken();
  const [view, setView] = useState("dashboard");
  const [detailId, setDetailId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState({ msg: "", show: false });
  const toastTimer = useRef(null);
  const user = useCurrentUser();

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, show: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2400);
  };

  const go = (key, id) => {
    if (key === "detail" && id != null) { setDetailId(id); setView("detail"); return; }
    setView(key);
    setDetailId(null);
    window.scrollTo(0, 0);
  };

  if (!token) return <LoginScreen />;

  const renderScreen = () => {
    switch (view) {
      case "dashboard":   return <Dashboard go={go} />;
      case "liste":       return <Liste go={go} />;
      case "approbation": return <Approbation go={go} onToast={showToast} />;
      case "nouveau":     return <Nouveau go={go} onToast={showToast} />;
      case "detail":      return <Detail go={go} ticketId={detailId} onToast={showToast} />;
      default:            return <Dashboard go={go} />;
    }
  };

  return (
    <div className="shell">
      {/* ── Sidebar (bureau) ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><TicketCheck size={18} color="#fff" /></div>
          <div className="font-display" style={{ fontWeight: 600, fontSize: 15 }}>Tickets</div>
        </div>

        {NAV.map((s) => (
          <div key={s.sec}>
            <div className="nav-sec">{s.sec}</div>
            {s.items.map((item) => {
              const Icon = item.icon;
              if (item.external) {
                return (
                  <a key={item.key} href={item.external} className="navlink" style={{ textDecoration: "none" }}>
                    <Icon size={16} /> {item.label}
                  </a>
                );
              }
              return (
                <button key={item.key} className={`navlink${view === item.key || (view === "detail" && item.key === "liste") ? " active" : ""}`}
                  onClick={() => go(item.key)}>
                  <Icon size={16} /> {item.label}
                  {item.badge && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-user">
          <div className="avatar">{user.initials}</div>
          <div style={{ fontSize: 12, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ color: "var(--ink-400)", fontSize: 11 }}>{user.role || "Utilisateur"}</div>
          </div>
          <button className="navlink" style={{ width: "auto", padding: 8 }} title="Se déconnecter" onClick={clearToken}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <div className="topbar">
          <TicketCheck size={18} style={{ color: "var(--iris-600)" }} />
          <span style={{ fontSize: 13, color: "var(--ink-500)" }}>
            SIFA · <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>Tickets internes</span>
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{user.initials}</div>
          </div>
        </div>

        <div className="content">
          {renderScreen()}
        </div>

        <div className="mobnav-spacer" />
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav className="mobnav">
        {MOBNAV.map((key) => {
          const allItems = NAV.flatMap((s) => s.items);
          const item = allItems.find((i) => i.key === key);
          if (!item) return null;
          const Icon = key === "dashboard" ? Home : item.icon;
          const isActive = view === key || (key === "liste" && view === "detail");
          return (
            <button key={key} className={isActive ? "active" : ""} onClick={() => go(key)}>
              <Icon size={20} />
              <span>{key === "approbation" ? "Approuver" : item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Toast ── */}
      <div className={`toast${toast.show ? " show" : ""}`}>{toast.msg}</div>
    </div>
  );
}
