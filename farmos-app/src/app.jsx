/* eslint-disable */
// FarmOS Pro — App root. Manages route, species filter, language.

import React from "react";
import { Icon } from "./icons";
import { SPECIES, t } from "./data";
import { Sidebar, Topbar } from "./shell";
import { Dashboard } from "./dashboard";
import { Animals } from "./animals";
import { Identification } from "./identification";
import { QuickEntryDrawer, Toast } from "./quickentry";
import {
  HealthScreen, BuildingsScreen, CalendarScreen, StockScreen, ReproScreen, ProductionScreen,
  AlertsScreen, PosScreen, SalesManagementScreen, FinancesScreen, ReportsScreen, TasksScreen, FieldNotesScreen, EmployeesScreen, SettingsScreen, ForecastScreen,
} from "./screens";
import { SemenBankScreen } from "./semen-bank";
import { SimulatorScreen } from "./simulator";
import { PwaUpdateBanner, PwaInstallBanner } from "./pwa";
import { LoginScreen, useAuthToken } from "./auth";
import { TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle } from "./tweaks";
import { api } from "./api";
import { AiAssistant } from "./aiAssistant.jsx";

const DEFAULTS = {
  lang: "fr",
  theme: "light",
  density: "comfortable",
  sidebarStyle: "labels",
  showMobile: false,
  deviceMode: "auto",
};

function useLayoutMode(forced) {
  const detect = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w <= 768) return "mobile";
    if (w <= 1180) return "tablet";
    return "desktop";
  };
  const [mode, setMode] = React.useState(detect);
  React.useEffect(() => {
    const onResize = () => setMode(detect());
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (forced && forced !== "auto") return forced;
  return mode;
}

// URL <-> route id. URLs en français, vu que l'app est principalement FR.
const ROUTE_SLUGS = {
  dashboard: "",
  identification: "identification",
  animals: "animaux",
  buildings: "batiments",
  health: "sante",
  calendar: "calendrier",
  stock: "stock",
  feed: "aliments",
  medicines: "medicaments",
  repro: "reproduction",
  "semen-bank": "banque-semence",
  production: "production",
  alerts: "alertes",
  pos: "pos",
  "sales-management": "gestion-vente",
  finances: "finances",
  reports: "rapports",
  employees: "employes",
  settings: "parametres",
};
const SLUGS_TO_ROUTE = Object.fromEntries(Object.entries(ROUTE_SLUGS).map(([k, v]) => [v, k]));
// Base injectee par vite : "/farmos/" (defaut) ou "/" (build --mode avelomi,
// servi a la racine de farmos.avelomi.com). Ne pas re-hardcoder "/farmos/".
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
  return BASE + slug + (slug ? "" : "");
}

function AppShell() {
  // Si pas de token CRM en localStorage, on bascule sur l'écran de login
  // local. Sinon (token présent → CRM ou login FarmOS précédent), on charge
  // l'app normalement. Le composant Sidebar lit la même clé pour afficher
  // le user chip.
  const [lang] = React.useState(() => {
    try { return localStorage.getItem("farmos-lang") || "fr"; } catch { return "fr"; }
  });
  const token = useAuthToken();
  // Hors ligne au retour dans l'app : le token mémoire est vide (jamais
  // persisté, SCRUM-119) et le refresh via cookie a échoué faute de réseau
  // (restoreSession() jette isNetworkError, voir auth.jsx/api.js). On ne
  // renvoie PAS vers le login dans ce cas : `isLogged` prouve qu'une session
  // a déjà réussi sur cet appareil, donc on affiche l'app en mode dégradé
  // (lecture cache) plutôt que de forcer une reconnexion impossible hors ligne.
  const hadSession = (() => {
    try { return localStorage.getItem("isLogged") === "true"; } catch { return false; }
  })();
  if (!token) {
    if (typeof navigator !== "undefined" && navigator.onLine === false && hadSession) return <App/>;
    return <LoginScreen lang={lang}/>;
  }
  return <App/>;
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
  const [speciesFilter, setSpeciesFilter] = React.useState(null);
  const [enabledSpecies, setEnabledSpecies] = React.useState(() => SPECIES.map((s) => s.id));
  const [tweaks, setTweaks] = React.useState(DEFAULTS);
  const setTweak = (k, v) => setTweaks((prev) => ({ ...prev, [k]: v }));
  const [entry, setEntry] = React.useState({ open: false, tab: "animal" });
  const [toast, setToast] = React.useState(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const layoutMode = useLayoutMode(tweaks.deviceMode);
  const isMobile = layoutMode === "mobile";
  const isTablet = layoutMode === "tablet";
  React.useEffect(() => {
    let cancel = false;
    const load = () => api.getSettings()
      .then((settings) => {
        const next = Array.isArray(settings?.enabled_species) && settings.enabled_species.length
          ? settings.enabled_species
          : SPECIES.map((s) => s.id);
        if (!cancel) setEnabledSpecies(next);
      })
      .catch(() => {});
    load();
    window.addEventListener("farmos:settings-updated", load);
    return () => { cancel = true; window.removeEventListener("farmos:settings-updated", load); };
  }, []);
  React.useEffect(() => {
    if (speciesFilter && !enabledSpecies.includes(speciesFilter)) setSpeciesFilter(null);
  }, [enabledSpecies, speciesFilter]);

  const openEntry = (input = "animal") => {
    if (typeof input === "string") setEntry({ open: true, tab: input });
    else setEntry({ open: true, tab: input.tab || "animal", context: input });
  };
  const closeEntry = () => setEntry((e) => ({ ...e, open: false }));
  const handleSaved = (payload) => setToast(payload);

  React.useEffect(() => {
    const h = (e) => { setRoute(e.detail); setMobileNav(false); };
    window.addEventListener("farmos:nav", h);
    const e = (ev) => openEntry(ev.detail || "animal");
    window.addEventListener("farmos:openEntry", e);
    const tst = (ev) => setToast(ev.detail);
    window.addEventListener("farmos:toast", tst);
    return () => {
      window.removeEventListener("farmos:nav", h);
      window.removeEventListener("farmos:openEntry", e);
      window.removeEventListener("farmos:toast", tst);
    };
  }, []);

  const lang = tweaks.lang;

  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  const routeMeta = {
    dashboard:  { title: t(lang, "dashboard"),  subtitle: lang === "fr" ? "Aperçu global de la ferme" : "Farm-wide overview", breadcrumb: lang === "fr" ? "FERME BELLEVUE · TABLEAU DE BORD" : "BELLEVUE FARM · DASHBOARD" },
    identification: { title: lang === "fr" ? "Identification" : "Identification", subtitle: lang === "fr" ? "Scanner sur le terrain" : "Field scanner", breadcrumb: lang === "fr" ? "FERME · IDENTIFICATION" : "FARM · IDENTIFICATION" },
    animals:    { title: t(lang, "animals"),    subtitle: lang === "fr" ? "Cheptel & fiches" : "Herd & records",              breadcrumb: lang === "fr" ? "FERME · ANIMAUX" : "FARM · ANIMALS" },
    health:     { title: t(lang, "health"),     subtitle: lang === "fr" ? "Traitements & vétérinaire" : "Treatments & vet",   breadcrumb: lang === "fr" ? "FERME · SANTÉ" : "FARM · HEALTH" },
    calendar:   { title: t(lang, "calendar"),   subtitle: lang === "fr" ? "Vaccination & rappels" : "Vaccines & reminders",   breadcrumb: lang === "fr" ? "FERME · CALENDRIER" : "FARM · CALENDAR" },
    stock:      { title: t(lang, "stock"),      subtitle: lang === "fr" ? "Aliments, médicaments, équipement" : "Feed, meds, gear", breadcrumb: lang === "fr" ? "FERME · STOCK" : "FARM · STOCK" },
    feed:       { title: t(lang, "feed"),       subtitle: lang === "fr" ? "Stock d'aliments par espèce" : "Feed inventory by species",     breadcrumb: lang === "fr" ? "FERME · ALIMENTS" : "FARM · FEED" },
    medicines:  { title: t(lang, "medicines"),  subtitle: lang === "fr" ? "Médicaments & traitements" : "Medicines & treatments",          breadcrumb: lang === "fr" ? "FERME · MÉDICAMENTS" : "FARM · MEDICINES" },
    repro:      { title: t(lang, "repro"),      subtitle: lang === "fr" ? "Chaleurs, gestations, mises bas" : "Heats, gestations, births", breadcrumb: lang === "fr" ? "FERME · REPRODUCTION" : "FARM · REPRODUCTION" },
    "semen-bank": { title: lang === "fr" ? "Banque de semence" : "Semen bank", subtitle: lang === "fr" ? "Paillettes IA & historique" : "AI straws & history",       breadcrumb: lang === "fr" ? "FERME · BANQUE SEMENCE" : "FARM · SEMEN BANK" },
    production: { title: t(lang, "production"), subtitle: lang === "fr" ? "Lait, œufs, croissance" : "Milk, eggs, growth",     breadcrumb: lang === "fr" ? "FERME · PRODUCTION" : "FARM · PRODUCTION" },
    alerts:     { title: t(lang, "alerts"),     subtitle: lang === "fr" ? "Alertes intelligentes" : "Smart alerts",            breadcrumb: lang === "fr" ? "FERME · ALERTES" : "FARM · ALERTS" },
    pos:        { title: t(lang, "pos"),        subtitle: lang === "fr" ? "Ventes FarmOS" : "FarmOS sales",                    breadcrumb: lang === "fr" ? "FERME · POS" : "FARM · POS" },
    "sales-management": { title: t(lang, "salesManagement"), subtitle: lang === "fr" ? "Produits vendables et prix POS" : "Sellable products and POS prices", breadcrumb: lang === "fr" ? "FERME · GESTION DE VENTE" : "FARM · SALES MANAGEMENT" },
    finances:   { title: t(lang, "finances"),   subtitle: lang === "fr" ? "Revenus, dépenses, profits" : "Revenue, expenses, profits", breadcrumb: lang === "fr" ? "FERME · FINANCES" : "FARM · FINANCES" },
    forecast:   { title: t(lang, "forecast"),   subtitle: lang === "fr" ? "Ventes élevage & production projetées" : "Projected livestock sales & production", breadcrumb: lang === "fr" ? "FERME · PRÉVISIONNEL" : "FARM · FORECAST" },
    simulator:  { title: t(lang, "simulator"),  subtitle: lang === "fr" ? "Simulation business & projection cheptel" : "Business simulation & herd projection", breadcrumb: lang === "fr" ? "FERME · SIMULATEUR" : "FARM · SIMULATOR" },
    reports:    { title: t(lang, "reports"),    subtitle: lang === "fr" ? "Rapports & exports" : "Reports & exports",          breadcrumb: lang === "fr" ? "FERME · RAPPORTS" : "FARM · REPORTS" },
    tasks:      { title: t(lang, "tasks"),      subtitle: lang === "fr" ? "Tâches assignées à l'équipe" : "Tasks assigned to the team", breadcrumb: lang === "fr" ? "FERME · TÂCHES" : "FARM · TASKS" },
    "field-notes": { title: t(lang, "fieldNotes"), subtitle: lang === "fr" ? "Observations terrain géolocalisées" : "Geolocated field observations", breadcrumb: lang === "fr" ? "FERME · NOTES TERRAIN" : "FARM · FIELD NOTES" },
    employees:  { title: t(lang, "employees"),  subtitle: lang === "fr" ? "Équipe & présences" : "Team & shifts",               breadcrumb: lang === "fr" ? "FERME · ÉQUIPE" : "FARM · TEAM" },
    settings:   { title: t(lang, "settings"),   subtitle: lang === "fr" ? "Paramètres & permissions" : "Settings & permissions", breadcrumb: lang === "fr" ? "FERME · PARAMÈTRES" : "FARM · SETTINGS" },
  };
  const meta = routeMeta[route] || routeMeta.dashboard;

  const renderScreen = () => {
    const props = { lang, speciesFilter, onSpeciesFilter: setSpeciesFilter, onNav: setRoute, density: tweaks.density, enabledSpecies, onEnabledSpeciesChange: setEnabledSpecies };
    switch (route) {
      case "dashboard":  return <Dashboard {...props}/>;
      case "identification": return <Identification {...props}/>;
      case "animals":    return <Animals {...props}/>;
      case "buildings":  return <BuildingsScreen {...props}/>;
      case "health":     return <HealthScreen {...props}/>;
      case "calendar":   return <CalendarScreen {...props}/>;
      case "stock":      return <StockScreen {...props}/>;
      case "feed":       return <StockScreen {...props} kindFilter="feed"/>;
      case "medicines":  return <StockScreen {...props} kindFilter="med"/>;
      case "repro":      return <ReproScreen {...props}/>;
      case "semen-bank": return <SemenBankScreen {...props}/>;
      case "production": return <ProductionScreen {...props}/>;
      case "alerts":     return <AlertsScreen {...props}/>;
      case "pos":        return <PosScreen {...props}/>;
      case "sales-management": return <SalesManagementScreen {...props}/>;
      case "finances":   return <FinancesScreen {...props}/>;
      case "forecast":   return <ForecastScreen {...props}/>;
      case "simulator":  return <SimulatorScreen {...props}/>;
      case "reports":    return <ReportsScreen {...props}/>;
      case "tasks":      return <TasksScreen {...props}/>;
      case "field-notes": return <FieldNotesScreen {...props}/>;
      case "employees":  return <EmployeesScreen {...props}/>;
      case "settings":   return <SettingsScreen {...props} tweaks={tweaks} setTweak={setTweak}/>;
      default:           return <Dashboard {...props}/>;
    }
  };

  const effectiveSidebarStyle = isTablet ? "icons" : tweaks.sidebarStyle;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-app)" }}>
      <div
        data-screen-label="FarmOS Pro"
        data-mobile={isMobile ? "true" : "false"}
        data-layout={layoutMode}
        style={{ display: "flex", flex: 1, overflow: "hidden", background: "var(--bg-app)", position: "relative" }}
      >
        {isMobile && mobileNav && (
          <div onClick={() => setMobileNav(false)} style={{ position: "absolute", inset: 0, background: "rgba(14,36,24,0.5)", zIndex: 70 }}/>
        )}
        <div style={isMobile ? {
          position: "absolute", top: 0, bottom: 0, left: mobileNav ? 0 : -260,
          zIndex: 75, transition: "left 220ms var(--ease-out)",
        } : { flexShrink: 0 }}>
          <Sidebar
            active={route}
            onNav={(r) => { setRoute(r); setMobileNav(false); }}
            lang={lang}
            speciesFilter={speciesFilter}
            onSpeciesFilter={(s) => { setSpeciesFilter(s); if (isMobile) setMobileNav(false); }}
            sidebarStyle={effectiveSidebarStyle}
            enabledSpecies={enabledSpecies}
          />
        </div>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          <Topbar
            title={meta.title}
            subtitle={meta.subtitle}
            breadcrumb={meta.breadcrumb}
            lang={lang}
            onLang={(l) => setTweak("lang", l)}
            isMobile={isMobile}
            isTablet={isTablet}
            onHamburger={() => setMobileNav(true)}
            onQuickEntry={() => openEntry("animal")}
          />
          <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {renderScreen()}
            </div>
          </div>

          {isMobile && <MobileTabBar route={route} onNav={setRoute} onPlus={() => setActionsOpen(true)} lang={lang}/>}
        </main>

        {actionsOpen && (
          <QuickActionsSheet
            lang={lang}
            onClose={() => setActionsOpen(false)}
            onPick={(tab) => { setActionsOpen(false); openEntry(tab); }}
          />
        )}

        <QuickEntryDrawer
          open={entry.open}
          defaultTab={entry.tab}
          context={entry.context}
          lang={lang}
          defaultSpecies={(entry.context && entry.context.species) || speciesFilter}
          enabledSpecies={enabledSpecies}
          onClose={closeEntry}
          onSaved={handleSaved}
        />

        {toast && <Toast message={toast.message} severity={toast.severity} onClose={() => setToast(null)}/>}
      </div>
      {/* Panneau Tweaks (⚙ flottant) désactivé : options visuelles déplacées
          dans l'écran Paramètres (carte « Apparence »). */}
      <PwaUpdateBanner lang={tweaks.lang}/>
      <PwaInstallBanner lang={tweaks.lang}/>
      <AiAssistant/>
    </div>
  );
}

const MobileTabBar = ({ route, onNav, onPlus, lang }) => {
  const items = [
    { id: "dashboard", icon: "dashboard", fr: "Accueil",  en: "Home" },
    { id: "identification", icon: "scanLine", fr: "Scanner", en: "Scan" },
    { id: "_plus",     icon: "plus" },
    { id: "animals",   icon: "layers",    fr: "Animaux",  en: "Animals" },
    { id: "alerts",    icon: "bell",      fr: "Alertes",  en: "Alerts" },
  ];
  return (
    <nav style={{
      flexShrink: 0, display: "flex", borderTop: "1px solid var(--border-1)",
      background: "var(--paper)", padding: "6px 8px 10px", gap: 4,
    }}>
      {items.map((it) => {
        if (it.id === "_plus") {
          return (
            <button key="_plus" onClick={onPlus} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              border: 0, background: "transparent", cursor: "pointer", padding: 0,
            }}>
              <span style={{
                width: 44, height: 44, borderRadius: 999,
                background: "var(--clay-700)", color: "var(--bone-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 18px -4px rgba(168,90,42,0.45)", marginTop: -16,
              }}>
                <Icon name="plus" size={20} color="#FBF8F2"/>
              </span>
            </button>
          );
        }
        const active = route === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            border: 0, background: "transparent", padding: "6px 0", cursor: "pointer",
          }}>
            <Icon name={it.icon} size={18} color={active ? "var(--clay-700)" : "var(--forest-400)"}/>
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? "var(--clay-700)" : "var(--forest-500)" }}>
              {lang === "fr" ? it.fr : it.en}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// Bottom sheet d'actions rapides (ouvert par le bouton + du tab bar mobile).
// Chaque action ouvre le bon onglet de saisie rapide — adapté au travail terrain
// (une main) : grandes cibles tactiles, peu de texte.
const QuickActionsSheet = ({ lang, onClose, onPick }) => {
  const actions = [
    { tab: "animal",     icon: "layers",      fr: "Nouvel animal",  en: "New animal",  bg: "var(--forest-50)",  fg: "var(--forest-700)" },
    { tab: "health",     icon: "pill",        fr: "Traitement",     en: "Treatment",   bg: "var(--clay-50, #f6ece2)", fg: "var(--clay-700)" },
    { tab: "production", icon: "chart",       fr: "Production",     en: "Production",  bg: "var(--bg-sunken)",  fg: "var(--ink-800)" },
    { tab: "repro",      icon: "fingerprint", fr: "Reproduction",   en: "Reproduction",bg: "var(--bg-sunken)",  fg: "var(--ink-800)" },
    { tab: "stock",      icon: "package",     fr: "Stock",          en: "Stock",       bg: "var(--bg-sunken)",  fg: "var(--ink-800)" },
    { tab: "death",      icon: "alert",       fr: "Mortalité",      en: "Mortality",   bg: "var(--rust-50, #f7e9e4)", fg: "var(--oxblood-700)" },
  ];
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.45)", zIndex: 1200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--paper)", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: "14px 16px calc(16px + env(safe-area-inset-bottom))", boxShadow: "0 -8px 30px -8px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--border-2)", margin: "0 auto 14px" }}/>
        <div style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 12 }}>
          {lang === "fr" ? "Action rapide" : "Quick action"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {actions.map((a) => (
            <button key={a.tab} onClick={() => onPick(a.tab)}
              style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, border: "1px solid var(--border-1)", background: a.bg, color: a.fg, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              <Icon name={a.icon} size={20} color={a.fg}/>
              <span>{lang === "fr" ? a.fr : a.en}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FarmTweaks = ({ tweaks, setTweak }) => (
  <TweaksPanel title={tweaks.lang === "fr" ? "Tweaks — FarmOS" : "Tweaks — FarmOS"}>
    <TweakSection title={tweaks.lang === "fr" ? "Apparence" : "Appearance"}>
      <TweakRadio label={tweaks.lang === "fr" ? "Thème" : "Theme"} value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
        options={[{ value: "light", label: tweaks.lang === "fr" ? "Clair" : "Light" }, { value: "dark", label: tweaks.lang === "fr" ? "Sombre" : "Dark" }]}/>
      <TweakRadio label={tweaks.lang === "fr" ? "Densité" : "Density"} value={tweaks.density} onChange={(v) => setTweak("density", v)}
        options={[{ value: "comfortable", label: tweaks.lang === "fr" ? "Confort" : "Comfort" }, { value: "compact", label: "Compact" }]}/>
      <TweakSelect label={tweaks.lang === "fr" ? "Sidebar" : "Sidebar"} value={tweaks.sidebarStyle} onChange={(v) => setTweak("sidebarStyle", v)}
        options={[{ value: "labels", label: tweaks.lang === "fr" ? "Icônes + libellés" : "Icons + labels" }, { value: "icons", label: tweaks.lang === "fr" ? "Icônes seules" : "Icons only" }]}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Langue" : "Language"}>
      <TweakRadio label="" value={tweaks.lang} onChange={(v) => setTweak("lang", v)}
        options={[{ value: "fr", label: "Français" }, { value: "en", label: "English" }]}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Aperçu device" : "Device preview"} description={tweaks.lang === "fr" ? "Voir le rendu mobile / tablette" : "Preview mobile / tablet"}>
      <TweakSelect label={tweaks.lang === "fr" ? "Format" : "Format"} value={tweaks.deviceMode || "auto"} onChange={(v) => setTweak("deviceMode", v)}
        options={[
          { value: "auto",    label: tweaks.lang === "fr" ? "Auto · plein écran" : "Auto · full screen" },
          { value: "mobile",  label: tweaks.lang === "fr" ? "Mobile · iPhone 15 Pro" : "Mobile · iPhone 15 Pro" },
          { value: "tablet",  label: tweaks.lang === "fr" ? "Tablette · iPad Air" : "Tablet · iPad Air" },
          { value: "desktop", label: tweaks.lang === "fr" ? "Desktop · 1440 × 900" : "Desktop · 1440 × 900" },
        ]}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Navigation rapide" : "Quick nav"}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { id: "dashboard", fr: "Tableau de bord", en: "Dashboard" },
          { id: "identification", fr: "Identification", en: "Identification" },
          { id: "animals", fr: "Animaux", en: "Animals" },
          { id: "health", fr: "Santé", en: "Health" },
          { id: "calendar", fr: "Calendrier", en: "Calendar" },
          { id: "stock", fr: "Stock", en: "Stock" },
          { id: "repro", fr: "Reproduction", en: "Repro" },
          { id: "production", fr: "Production", en: "Production" },
          { id: "alerts", fr: "Alertes", en: "Alerts" },
          { id: "sales-management", fr: "Gestion vente", en: "Sales mgmt" },
          { id: "finances", fr: "Finances", en: "Finances" },
          { id: "reports", fr: "Rapports", en: "Reports" },
        ].map((r) => (
          <button key={r.id} type="button"
            style={{ height: 26, border: ".5px solid rgba(0,0,0,.1)", borderRadius: 7, background: "rgba(255,255,255,.6)", color: "#29261b", fontSize: 11.5, cursor: "pointer", textAlign: "left", padding: "0 8px" }}
            onClick={() => window.dispatchEvent(new CustomEvent("farmos:nav", { detail: r.id }))}>
            {tweaks.lang === "fr" ? r.fr : r.en}
          </button>
        ))}
      </div>
    </TweakSection>
  </TweaksPanel>
);

export default AppShell;
