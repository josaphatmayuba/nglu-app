// Shell KodaTill — sidebar minimale + topbar, meme pattern que farmos-app/src/shell.jsx.
import React from "react";
import { clearAuth } from "./auth.jsx";
import { clearAllCaches } from "./offline-db";
import { isSuperOwner } from "./platform-admin.jsx";
import { Brand } from "./icons.jsx";
import {
  LayoutDashboard, ClipboardList, Package, ArchiveRestore, Carrot,
  Calculator, Wallet, ScanLine, LineChart, Settings, ShieldCheck,
  Menu as MenuIcon,
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

// mobile/mobileOpen : meme pattern que farmos-app/src/app.jsx (Sidebar en
// tiroir coulissant sous <=768px, position absolute + transition left,
// ouvert/ferme via le hamburger du Topbar) — remplace le rail icone-seule
// permanent qui existait avant sous ce seuil (masquait trop de contexte,
// pas d'equivalent dans FarmOS).
export const Sidebar = ({ active, onNav, nav, mobile, mobileOpen }) => {
  const user = readCurrentUser();
  const superOwner = isSuperOwner();
  const narrowRail = useNarrow();
  // superOwnerOnly filtre a l'affichage : le lien existe dans le tableau nav
  // (navForActivityProfile) mais n'est rendu que si le role courant est
  // super_owner. Le backend refuse de toute facon via SuperOwnerGuard.
  const NAV = (nav || navForActivityProfile(null)).filter((n) => !n.superOwnerOnly || superOwner);
  // Tablette portrait (<=900px, hors mode mobile tiroir) : rail icone-seule
  // au lieu du panneau 220px, pour laisser la place au contenu.
  const narrow = !mobile && narrowRail;
  const logout = () => {
    clearAuth();
    // Purge aussi le miroir IndexedDB (catalogue + outbox) : sur une caisse
    // partagee, les donnees de l'utilisateur precedent ne doivent pas rester
    // lisibles par le suivant.
    clearAllCaches().catch(() => {});
    window.dispatchEvent(new CustomEvent("kodatill:auth-changed"));
  };
  return (
    <aside style={{
      width: mobile ? 220 : (narrow ? 64 : 220), flexShrink: mobile ? 0 : undefined,
      height: "100%", display: "flex", flexDirection: "column",
      background: "#062025", color: "#ECF1EC", transition: mobile ? "none" : "width 0.15s ease",
      ...(mobile ? { position: "absolute", top: 0, bottom: 0, left: mobileOpen ? 0 : -220, zIndex: 75, transition: "left 220ms ease" } : {}),
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
          onClick={narrow ? logout : undefined}
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
            <button onClick={logout}
              style={{ background: "transparent", border: 0, color: "rgba(236,241,236,0.55)", fontSize: 11, cursor: "pointer", padding: 0 }}>
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

// onHamburger : ouvre le tiroir Sidebar mobile (cf. Sidebar mobile/mobileOpen
// ci-dessus) — meme role que le bouton hamburger du Topbar farmos-app.
// Bouton rendu seulement si la prop est fournie (app.jsx ne la passe qu'en
// mode mobile <=768px), pas d'icone morte en desktop/tablette.
export const Topbar = ({ title, subtitle, onHamburger }) => (
  <header style={{
    padding: "16px 24px", borderBottom: "1px solid var(--border-1, #E7EBF1)", background: "var(--paper, #fff)",
    display: "flex", alignItems: "center", gap: 12,
  }}>
    {onHamburger && (
      <button onClick={onHamburger} aria-label="Ouvrir le menu"
        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fg-1, #0E2418)", display: "flex", padding: 4, flexShrink: 0 }}>
        <MenuIcon size={20} />
      </button>
    )}
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginTop: 2 }}>{subtitle}</div>}
    </div>
  </header>
);

// Bottom tab bar mobile pour le back-office (<=768px), meme role/structure
// que MobileTabBar de farmos-app/src/app.jsx (5 slots, bouton central
// surelevé) — en COMPLEMENT du hamburger (Topbar), pas en remplacement :
// raccourcis rapides vers les 4 ecrans les plus frequents + Caisse au
// centre (action la plus frequente dans un commerce, equivalent du "+"
// FarmOS qui ouvre une saisie rapide). Teinte marque KodaTill (#1f6d75),
// pas la palette clay/forest de FarmOS. N'apparait jamais sur la route
// caisse elle-meme (qui a deja sa propre bottom nav dediee, screens.jsx).
export const MobileTabBar = ({ active, onNav }) => {
  const items = [
    { id: "dashboard", label: "Accueil",   icon: LayoutDashboard },
    { id: "commandes", label: "Commandes", icon: ClipboardList },
    { id: "_caisse",   label: "Caisse",    icon: Calculator },
    { id: "produits",  label: "Produits",  icon: Package },
    { id: "parametres", label: "Réglages", icon: Settings },
  ];
  return (
    <nav style={{
      flexShrink: 0, display: "flex", borderTop: "1px solid var(--border-1, #E7EBF1)",
      background: "var(--paper, #fff)", padding: "6px 8px 10px", gap: 4,
    }}>
      {items.map((it) => {
        const Icon = it.icon;
        if (it.id === "_caisse") {
          return (
            <button key="_caisse" onClick={() => onNav("caisse")} aria-label="Caisse"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
              <span style={{
                width: 44, height: 44, borderRadius: 999, background: "#1f6d75", color: "#FBF8F2",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 18px -4px rgba(31,109,117,0.5)", marginTop: -16,
              }}>
                <Icon size={20} />
              </span>
            </button>
          );
        }
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            border: 0, background: "transparent", padding: "6px 0", cursor: "pointer",
          }}>
            <Icon size={18} color={isActive ? "#1f6d75" : "var(--fg-3, #6b6b6b)"} />
            <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? "#1f6d75" : "var(--fg-3, #6b6b6b)" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
