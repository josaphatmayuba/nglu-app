// KodaTill — App root. Meme pattern de routing que farmos-app/src/app.jsx
// (state + window.history.pushState, pas de react-router dans ce monorepo).
import React from "react";
import { Sidebar, Topbar } from "./shell.jsx";
import { DashboardScreen, ProduitsScreen, CommandesScreen, CaisseScreen } from "./screens.jsx";
import { LoginScreen, useAuthToken } from "./auth.jsx";

// URL <-> route id. URLs en francais (coherent avec farmos-app).
const ROUTE_SLUGS = {
  dashboard: "",
  produits: "produits",
  commandes: "commandes",
  caisse: "caisse",
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
  dashboard: { title: "Tableau de bord", subtitle: "Aperçu global de l'activité" },
  produits:  { title: "Produits",        subtitle: "Catalogue & prix" },
  commandes: { title: "Commandes",       subtitle: "Historique des ventes" },
  caisse:    { title: "Caisse",          subtitle: "Point de vente" },
};

function AppShell() {
  const token = useAuthToken();
  if (!token) return <LoginScreen lang="fr" />;
  return <App />;
}

function App() {
  const [route, setRouteState] = React.useState(routeFromLocation);
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

  const meta = ROUTE_META[route] || ROUTE_META.dashboard;

  const renderScreen = () => {
    switch (route) {
      case "dashboard": return <DashboardScreen />;
      case "produits":  return <ProduitsScreen />;
      case "commandes": return <CommandesScreen />;
      case "caisse":    return <CaisseScreen />;
      default:          return <DashboardScreen />;
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "var(--bg-app, #FBF8F2)" }}>
      <Sidebar active={route} onNav={setRoute} />
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
