// Shell KodaTill — sidebar minimale + topbar, meme pattern que farmos-app/src/shell.jsx.
import React from "react";
import { clearAuth } from "./auth.jsx";
import { isSuperOwner } from "./platform-admin.jsx";
import { Brand } from "./icons.jsx";
import {
  LayoutDashboard, ClipboardList, Package, ArchiveRestore, Carrot,
  Calculator, Wallet, ScanLine, LineChart, Settings, ShieldCheck,
} from "lucide-react";

// Liens toujours presents, quelle que soit l'activite.
const BASE_NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
];
const COMMON_NAV = [
  { id: "commandes",   label: "Commandes",   icon: ClipboardList },
  { id: "produits",    label: "Produits",    icon: Package },
  { id: "stock",       label: "Stock",       icon: ArchiveRestore },
  { id: "ingredients", label: "Ingrédients", icon: Carrot },
];
const CAISSE_NAV = { id: "caisse", label: "Caisse", icon: Calculator };
// Depenses (SCRUM-292) : besoin universel, pas lie a un type de commerce —
// ajoute inconditionnellement dans navForActivityProfile, pas via le mapping
// module -> profil comme stock/ingredients.
const DEPENSES_NAV = { id: "depenses", label: "Dépenses", icon: Wallet };
// Scanner (SCRUM-299) : meme logique que Dépenses — besoin universel, pas lie
// a un type de commerce, ajoute inconditionnellement quel que soit le profil.
const SCAN_NAV = { id: "scan", label: "Scanner", icon: ScanLine };
// Rapports (SCRUM-308) : meme logique que Dépenses/Scanner — besoin universel
// (exports CSV ventes/depenses + resume periode), pas lie a un type de
// commerce, ajoute inconditionnellement quel que soit le profil d'activite.
const RAPPORTS_NAV = { id: "rapports", label: "Rapports", icon: LineChart };

// Mapping module -> lien de nav (ecrans disponibles dans app.jsx).
const NAV_LINKS_BY_MODULE = {
  dashboard: BASE_NAV[0],
  commandes: COMMON_NAV[0],
  produits: COMMON_NAV[1],
  stock: COMMON_NAV[2],
  ingredients: COMMON_NAV[3],
  caisse: CAISSE_NAV,
};

// Modules par activite (repris du mapping backend business-profile.service.ts).
// - restaurant : dashboard, commandes, produits, ingredients, caisse
// - supermarket/pharmacy/hardware : dashboard, commandes, produits, stock, caisse
// - shop : dashboard, commandes, produits, caisse
const DEFAULT_NAV = ["dashboard", "commandes", "produits", "caisse"];

export function navForActivityProfile(profile) {
  const modules = Array.isArray(profile?.enabledModules) && profile.enabledModules.length
    ? profile.enabledModules
    : DEFAULT_NAV;
  const links = modules.map((m) => NAV_LINKS_BY_MODULE[m]).filter(Boolean);
  // Toujours garantir dashboard + caisse meme si le profil ne les liste pas.
  if (!links.some((l) => l.id === "dashboard")) links.unshift(NAV_LINKS_BY_MODULE.dashboard);
  if (!links.some((l) => l.id === "caisse")) links.push(NAV_LINKS_BY_MODULE.caisse);
  links.push(DEPENSES_NAV);
  links.push(RAPPORTS_NAV);
  links.push(SCAN_NAV);
  links.push({ id: "parametres", label: "Paramètres", icon: Settings });
  // SCRUM-303 — lien conditionne par le ROLE (super_owner), pas par l'activite
  // de commerce comme le reste de ce mapping : ajoute inconditionnellement ici,
  // filtre a l'affichage dans Sidebar via isSuperOwner().
  links.push({ id: "admin", label: "Super Admin", icon: ShieldCheck, superOwnerOnly: true });
  return links;
}

// Meme seuil/pattern que CaisseScreen (screens.jsx) : au-dela de l'iPad
// portrait CSS, pour ne pas basculer trop tot sur les tablettes larges.
export function useNarrow(breakpoint = 900) {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false
  );
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return narrow;
}

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

export const Sidebar = ({ active, onNav, nav }) => {
  const user = readCurrentUser();
  const superOwner = isSuperOwner();
  const narrow = useNarrow();
  // superOwnerOnly filtre a l'affichage : le lien existe dans le tableau nav
  // (navForActivityProfile) mais n'est rendu que si le role courant est
  // super_owner. Le backend refuse de toute facon via SuperOwnerGuard.
  const NAV = (nav || navForActivityProfile(null)).filter((n) => !n.superOwnerOnly || superOwner);
  // Tablette portrait (<=900px, meme seuil que CaisseScreen) : rail
  // icone-seule au lieu du panneau 220px, pour laisser la place au contenu.
  return (
    <aside style={{
      width: narrow ? 64 : 220, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "#062025", color: "#ECF1EC", transition: "width 0.15s ease",
    }}>
      <div style={{ padding: narrow ? "18px 8px" : "18px 16px", display: "flex", alignItems: "center", justifyContent: narrow ? "center" : "flex-start", gap: 10 }}>
        <Brand size={32} radius={8} />
        {!narrow && <div style={{ fontWeight: 700, fontSize: 15 }}>KodaTill</div>}
      </div>
      <nav style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV.map((n) => {
          const isActive = active === n.id;
          const Icon = n.icon;
          return (
            <button key={n.id} onClick={() => onNav(n.id)} title={narrow ? n.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: narrow ? "10px 0" : "10px 12px",
                justifyContent: narrow ? "center" : "flex-start",
                borderRadius: 8, border: 0, cursor: "pointer", textAlign: "left",
                background: isActive ? "rgba(69,167,173,0.25)" : "transparent",
                color: isActive ? "#FBF8F2" : "rgba(236,241,236,0.75)",
                fontWeight: isActive ? 600 : 500, fontSize: 14,
              }}>
              {Icon && <Icon size={17} strokeWidth={2} aria-hidden="true" />}
              {!narrow && <span>{n.label}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: narrow ? "12px 8px" : 12, borderTop: "1px solid #123F46", display: "flex", alignItems: "center", justifyContent: narrow ? "center" : "flex-start", gap: 10 }}>
        <button
          onClick={narrow ? () => { clearAuth(); window.dispatchEvent(new CustomEvent("kodatill:auth-changed")); } : undefined}
          title={narrow ? `${user ? user.display : "Non connecté"} — Déconnexion` : undefined}
          style={{
            width: 32, height: 32, borderRadius: 8, background: "#123F46", color: "rgba(236,241,236,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13,
            flexShrink: 0, border: 0, cursor: narrow ? "pointer" : "default", padding: 0,
          }}>
          {user ? user.initials : "?"}
        </button>
        {!narrow && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(236,241,236,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user ? user.display : "Non connecté"}
            </div>
            <button onClick={() => { clearAuth(); window.dispatchEvent(new CustomEvent("kodatill:auth-changed")); }}
              style={{ background: "transparent", border: 0, color: "rgba(236,241,236,0.55)", fontSize: 11, cursor: "pointer", padding: 0 }}>
              Déconnexion
            </button>
          </div>
        )}
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
