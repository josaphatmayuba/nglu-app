// Shell KodaTill — sidebar minimale + topbar, meme pattern que farmos-app/src/shell.jsx.
import React from "react";
import { clearAuth } from "./auth.jsx";
import { Brand } from "./icons.jsx";

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "📊" },
  { id: "produits",  label: "Produits",        icon: "📦" },
  { id: "commandes", label: "Commandes",       icon: "🧾" },
  { id: "caisse",    label: "Caisse",          icon: "🧮" },
];

function readCurrentUser() {
  try {
    const name = (localStorage.getItem("user") || "").trim();
    const email = (localStorage.getItem("email") || "").trim();
    if (!name && !email) return null;
    const display = name || email || "—";
    const initials = display.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
    return { display, initials };
  } catch {
    return null;
  }
}

export const Sidebar = ({ active, onNav }) => {
  const user = readCurrentUser();
  return (
    <aside style={{
      width: 220, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "#062025", color: "#ECF1EC",
    }}>
      <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <Brand size={32} radius={8} />
        <div style={{ fontWeight: 700, fontSize: 15 }}>KodaTill</div>
      </div>
      <nav style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <button key={n.id} onClick={() => onNav(n.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, border: 0, cursor: "pointer", textAlign: "left",
                background: isActive ? "rgba(69,167,173,0.25)" : "transparent",
                color: isActive ? "#FBF8F2" : "rgba(236,241,236,0.75)",
                fontWeight: isActive ? 600 : 500, fontSize: 14,
              }}>
              <span aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 12, borderTop: "1px solid #123F46", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#123F46", color: "rgba(236,241,236,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
          {user ? user.initials : "?"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(236,241,236,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user ? user.display : "Non connecté"}
          </div>
          <button onClick={() => { clearAuth(); window.dispatchEvent(new CustomEvent("kodatill:auth-changed")); }}
            style={{ background: "transparent", border: 0, color: "rgba(236,241,236,0.55)", fontSize: 11, cursor: "pointer", padding: 0 }}>
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
};

export const Topbar = ({ title, subtitle }) => (
  <header style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-1, #E7EBF1)", background: "var(--paper, #fff)" }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginTop: 2 }}>{subtitle}</div>}
  </header>
);
