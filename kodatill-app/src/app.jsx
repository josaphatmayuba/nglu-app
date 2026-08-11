// KodaTill — App root. Meme pattern de routing que farmos-app/src/app.jsx
// (state + window.history.pushState, pas de react-router dans ce monorepo).
import React from "react";
import { Sidebar, Topbar, navForActivityProfile } from "./shell.jsx";
import { DashboardScreen, ProduitsScreen, CommandesScreen, CaisseScreen, ParametresScreen, StockScreen, IngredientsScreen, DepensesScreen, KitchenScreen, ScanScreen } from "./screens.jsx";
import { PublicMenuScreen, PublicOrderTrackingScreen } from "./public-menu.jsx";
import { LoginScreen, useAuthToken } from "./auth.jsx";
import { api } from "./api.js";

// URL <-> route id. URLs en francais (coherent avec farmos-app).
const ROUTE_SLUGS = {
  dashboard: "",
  produits: "produits",
  commandes: "commandes",
  stock: "stock",
  ingredients: "ingredients",
  caisse: "caisse",
  depenses: "depenses",
  scan: "scan",
  parametres: "parametres",
};
const SLUGS_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_SLUGS).map(([k, v]) => [v, k]));
// Base injectee par vite : "/kodatill/".
const BASE = import.meta.env.BASE_URL;

function routeFromLocation() {
  if (typeof window === "undefined") return "dashboard";
  const p = window.location.pathname || "";
  if (!p.startsWith(BASE)) return "dashboard";
  const slug = p.slice(BASE.length).replace(/\/$/, "").split("/")[0] || "";
  return SLUGS_TO_ROUTE[slug] || "dashboard";
}
function pathForRoute(r) {
  const slug = ROUTE_SLUGS[r] ?? "";
  return BASE + slug;
}

const ROUTE_META = {
  dashboard:   { title: "Tableau de bord", subtitle: "Aperçu global de l'activité" },
  produits:    { title: "Produits",        subtitle: "Catalogue & prix" },
  commandes:   { title: "Commandes",       subtitle: "Historique des ventes" },
  stock:       { title: "Stock",           subtitle: "Inventaire & réapprovisionnement" },
  ingredients: { title: "Ingrédients",     subtitle: "Matières premières & coûts de recette" },
  caisse:      { title: "Caisse",          subtitle: "Point de vente" },
  depenses:    { title: "Dépenses",        subtitle: "Charges & sorties de caisse" },
  scan:        { title: "Scanner",         subtitle: "Jumelage caisse & scan mobile" },
  parametres:  { title: "Paramètres",      subtitle: "Profil d'activité & configuration" },
};

// SCRUM-296 — /kodatill/r/:orgSlug/:qrToken : surface publique (scan QR par
// le client final), SANS verification JWT/auth.jsx. Detectee AVANT le gate
// d'authentification pour fonctionner meme deconnecte. Route dediee, pas
// integree a ROUTE_SLUGS (qui suppose un premier segment fixe parmi un
// ensemble connu ; ici orgSlug/qrToken sont dynamiques).
function publicMenuParamsFromLocation() {
  if (typeof window === "undefined") return null;
  const p = window.location.pathname || "";
  if (!p.startsWith(BASE)) return null;
  const parts = p.slice(BASE.length).replace(/\/$/, "").split("/");
  if (parts[0] !== "r" || !parts[1] || !parts[2]) return null;
  return { orgSlug: parts[1], qrToken: parts[2] };
}

// SCRUM-297 — /kodatill/r/:orgSlug/suivi/:orderRef : suivi de commande public,
// meme detection AVANT le gate JWT que publicMenuParamsFromLocation (fonctionne
// deconnecte, autorisation via publicRef opaque plutot que qrToken).
function publicOrderTrackingParamsFromLocation() {
  if (typeof window === "undefined") return null;
  const p = window.location.pathname || "";
  if (!p.startsWith(BASE)) return null;
  const parts = p.slice(BASE.length).replace(/\/$/, "").split("/");
  if (parts[0] !== "r" || !parts[1] || parts[2] !== "suivi" || !parts[3]) return null;
  return { orgSlug: parts[1], publicRef: parts[3] };
}

// SCRUM-298 — /kodatill/cuisine : ecran cuisine plein ecran (TV/tablette
// fixe en cuisine). Route authentifiee (JWT requis, contrairement a /r/...)
// mais volontairement rendue HORS du wrapper Sidebar/Topbar de <App/> : pas
// de navigation admin sur un ecran cuisine fixe, tout l'espace est dedie au
// board de commandes.
function isKitchenScreenLocation() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname || "";
  if (!p.startsWith(BASE)) return false;
  const slug = p.slice(BASE.length).replace(/\/$/, "").split("/")[0] || "";
  return slug === "cuisine";
}

function AppShell() {
  const [trackingParams] = React.useState(publicOrderTrackingParamsFromLocation);
  const [publicParams] = React.useState(publicMenuParamsFromLocation);
  const [isKitchen] = React.useState(isKitchenScreenLocation);
  if (trackingParams) {
    return <PublicOrderTrackingScreen orgSlug={trackingParams.orgSlug} publicRef={trackingParams.publicRef} />;
  }
  if (publicParams) {
    return <PublicMenuScreen orgSlug={publicParams.orgSlug} qrToken={publicParams.qrToken} />;
  }

  const token = useAuthToken();
  if (!token) return <LoginScreen lang="fr" />;
  if (isKitchen) return <KitchenScreen />;
  return <App />;
}

function App() {
  const [route, setRouteState] = React.useState(routeFromLocation);
  const [profile, setProfile] = React.useState(null);
  const setRoute = React.useCallback((r) => {
    setRouteState(r);
    const next = pathForRoute(r);
    if (typeof window !== "undefined" && window.location.pathname !== next) {
      window.history.pushState({ route: r }, "", next);
    }
  }, []);
  React.useEffect(() => {
    const onPop = () => setRouteState(routeFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Charge le profil d'activite au montage du shell pour adapter la nav
  // (SCRUM-287). Echec silencieux : la sidebar retombe sur le mapping par
  // defaut (navForActivityProfile(null)) si l'appel echoue.
  const loadProfile = React.useCallback(async () => {
    try {
      const p = await api.listBusinessProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);
  React.useEffect(() => { loadProfile(); }, [loadProfile]);

  const meta = ROUTE_META[route] || ROUTE_META.dashboard;
  const nav = React.useMemo(() => navForActivityProfile(profile), [profile]);

  const renderScreen = () => {
    switch (route) {
      case "dashboard":   return <DashboardScreen />;
      case "produits":    return <ProduitsScreen />;
      case "commandes":   return <CommandesScreen />;
      case "stock":       return <StockScreen />;
      case "ingredients": return <IngredientsScreen />;
      case "caisse":      return <CaisseScreen />;
      case "depenses":    return <DepensesScreen />;
      case "scan":        return <ScanScreen />;
      case "parametres":  return <ParametresScreen profile={profile} onSaved={loadProfile} />;
      default:            return <DashboardScreen />;
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "var(--bg-app, #FBF8F2)" }}>
      <Sidebar active={route} onNav={setRoute} nav={nav} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {renderScreen()}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
