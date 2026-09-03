// KodaTill — App root. Meme pattern de routing que farmos-app/src/app.jsx
// (state + window.history.pushState, pas de react-router dans ce monorepo).
import React from "react";
import { Sidebar, Topbar, MobileTabBar, navForActivityProfile, useNarrow } from "./shell.jsx";
import { DashboardScreen, ProduitsScreen, CommandesScreen, CaisseScreen, ParametresScreen, StockScreen, IngredientsScreen, DepensesScreen, RapportsScreen, KitchenScreen, ScanScreen } from "./screens.jsx";
import { PublicMenuScreen, PublicOrderTrackingScreen } from "./public-menu.jsx";
import { SuperAdminScreen, isSuperOwner } from "./platform-admin.jsx";
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
  rapports: "rapports",
  scan: "scan",
  parametres: "parametres",
  admin: "admin",
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
  rapports:    { title: "Rapports",        subtitle: "Exports CSV & résumé période" },
  scan:        { title: "Scanner",         subtitle: "Jumelage caisse & scan mobile" },
  parametres:  { title: "Paramètres",      subtitle: "Profil d'activité & configuration" },
  // SCRUM-303 — espace reserve super_owner, premier jalon d'une console
  // multi-modules future (pas seulement KodaTill).
  admin:       { title: "Super Admin",     subtitle: "Console propriétaire de la plateforme" },
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

// SCRUM-303 — affiche quand un non-super_owner atteint /kodatill/admin
// directement (URL tapee/partagee). Pas de crash, retour propre au dashboard.
function AccessDeniedScreen({ onBack }) {
  return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3, #6b6b6b)" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1, #0E2418)", marginBottom: 8 }}>
        Accès réservé
      </div>
      <div style={{ marginBottom: 16 }}>
        Cet espace est réservé au propriétaire de la plateforme.
      </div>
      <button onClick={onBack} style={{
        background: "#1f6d75", color: "#FBF8F2", padding: "8px 16px", border: 0,
        borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
      }}>
        Retour au tableau de bord
      </button>
    </div>
  );
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
  // Sidebar en tiroir coulissant + MobileTabBar sur les ecrans back-office,
  // actifs sur TOUTE la plage compacte (mobile ET tablette, <=1180px, meme
  // seuil que caisseSidebarHidden ci-dessous) — signale par le proprietaire
  // du projet avec capture : la bottom tab bar n'apparaissait qu'en mobile
  // stricte (<=768px), pas en tablette, laissant la nav generale incomplete
  // sur cet ecran. CaisseScreen fait exception (cf. caisseSidebarHidden) :
  // le mockup POS (surf-pos/surf-posm) est un ecran plein cadre SANS
  // sidebar ni hamburger jusqu'en tablette — sa propre bottom nav dediee
  // (Menu/Commandes/Transactions/Articles/Plus) couvre deja la navigation
  // necessaire sur cet ecran precis.
  const caisseSidebarHidden = useNarrow(1180);
  const isCompact = caisseSidebarHidden;
  const [mobileNav, setMobileNav] = React.useState(false);
  const navWithClose = React.useCallback((r) => { setRoute(r); setMobileNav(false); }, [setRoute]);

  const renderScreen = () => {
    switch (route) {
      case "dashboard":   return <DashboardScreen />;
      case "produits":    return <ProduitsScreen />;
      case "commandes":   return <CommandesScreen />;
      case "stock":       return <StockScreen />;
      case "ingredients": return <IngredientsScreen />;
      // onNav = navWithClose : la bottom nav dediee de CaisseScreen (mockup
      // surf-pos/surf-posm) reutilise le meme routeur que la Sidebar plutot
      // que d'inventer un mecanisme de navigation separe ; ferme aussi le
      // tiroir mobile s'il etait ouvert (ex: retour depuis le hamburger).
      case "caisse":      return <CaisseScreen onNav={navWithClose} />;
      case "depenses":    return <DepensesScreen />;
      case "rapports":    return <RapportsScreen />;
      case "scan":        return <ScanScreen />;
      case "parametres":  return <ParametresScreen profile={profile} onSaved={loadProfile} />;
      // SCRUM-303 — la route est accessible dans le routeur (pushState direct
      // possible) mais l'ecran lui-meme re-verifie isSuperOwner() et affiche un
      // message d'acces refuse plutot que de planter si un non-super_owner
      // atteint l'URL ; le backend refuse de toute facon via SuperOwnerGuard.
      case "admin":       return isSuperOwner() ? <SuperAdminScreen /> : <AccessDeniedScreen onBack={() => setRoute("dashboard")} />;
      default:            return <DashboardScreen />;
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "var(--bg-app, #FBF8F2)", position: "relative" }}>
      {/* Tiroir compact (mobile+tablette <=1180px, meme pattern que
          farmos-app/src/app.jsx lignes 240-256) : overlay sombre qui
          referme le tiroir au clic, rendu seulement quand le tiroir est
          ouvert. N'existe jamais sur la route caisse. */}
      {route !== "caisse" && isCompact && mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{ position: "absolute", inset: 0, background: "rgba(6,32,37,0.5)", zIndex: 70 }} />
      )}
      {/* CaisseScreen (mockup surf-pos/surf-posm) est un ecran plein cadre
          sans sidebar de nav generale jusqu'en tablette (<=1180px, meme
          seuil que le layout responsive interne de CaisseScreen) — sa
          bottom nav dediee couvre deja la navigation. Sur les autres
          ecrans, Sidebar reste visible (desktop) ou en tiroir hamburger
          (mobile+tablette <=1180px). */}
      {!(route === "caisse" && caisseSidebarHidden) && (
        <div style={isCompact ? { position: "absolute", top: 0, bottom: 0, left: 0, zIndex: 75 } : { flexShrink: 0 }}>
          <Sidebar active={route} onNav={navWithClose} nav={nav} mobile={isCompact} mobileOpen={mobileNav} />
        </div>
      )}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
        {/* CaisseScreen a sa propre topbar dediee (mockup surf-pos/surf-posm,
            logo+POS+service+recherche/scan/wifi/notifications/avatar) —
            le Topbar generique ne s'affiche donc pas pour cette route, pour
            eviter un double bandeau, et sans hamburger (pas de sidebar sur
            cet ecran, cf. plus haut). */}
        {route !== "caisse" && <Topbar title={meta.title} subtitle={meta.subtitle} onHamburger={isCompact ? () => setMobileNav(true) : undefined} />}
        {/* overflow:hidden (pas auto) : chaque ecran (CommandesScreen,
            StockScreen, etc., screens.jsx) pose deja son propre
            overflow:auto en racine — un double overflow:auto imbrique ici
            + dans l'ecran cassait le scroll (barre absente/scroll au
            mauvais niveau selon navigateur, signale avec capture sur
            CommandesScreen). Ce wrapper ne fait que deleguer la hauteur en
            flex, chaque ecran reste seul responsable de son scroll interne
            (CaisseScreen gere deja overflow:hidden en interne, non
            affecte). */}
        {/* minHeight:0 obligatoire ici (piege flexbox classique) : sans ca,
            un enfant flex:1 dans une colonne flex ne se reduit jamais en
            dessous de la hauteur de son contenu (min-height:auto par
            defaut du navigateur) — overflow:hidden/auto ne declenche alors
            AUCUN scroll, le contenu deborde silencieusement de l'ecran a la
            place. Signale avec capture : liste des commandes visiblement
            tronquee, aucune barre de scroll, meme en desktop large. */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {renderScreen()}
        </div>
        {/* Raccourcis rapides back-office (mobile+tablette <=1180px), en
            COMPLEMENT du hamburger — meme role que MobileTabBar de
            farmos-app/src/app.jsx. Jamais sur la route caisse : elle a deja
            sa propre bottom nav dediee (screens.jsx, Menu/Commandes/
            Transactions/Articles/Plus). */}
        {isCompact && route !== "caisse" && <MobileTabBar active={route} onNav={navWithClose} />}
      </main>
    </div>
  );
}

export default AppShell;
