/* eslint-disable */
// FarmOS Pro — App root. Manages route, species filter, language, tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "fr",
  "theme": "light",
  "density": "comfortable",
  "sidebarStyle": "labels",
  "dashboardLayout": "balanced",
  "showMobile": false,
  "accent": "oxblood",
  "deviceMode": "auto"
}/*EDITMODE-END*/;

// ─── useLayoutMode: returns "mobile" | "tablet" | "desktop" ───
// Respects tweaks.deviceMode override (for previewing layouts).
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

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [speciesFilter, setSpeciesFilter] = React.useState(null);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [entry, setEntry] = React.useState({ open: false, tab: "animal" });
  const [toast, setToast] = React.useState(null);
  const [mobileNav, setMobileNav] = React.useState(false);
  const layoutMode = useLayoutMode(tweaks.deviceMode);
  const isMobile = layoutMode === "mobile";
  const isTablet = layoutMode === "tablet";
  const isFramed = tweaks.deviceMode && tweaks.deviceMode !== "auto";

  const openEntry = (tab = "animal") => setEntry({ open: true, tab });
  const closeEntry = () => setEntry((e) => ({ ...e, open: false }));
  const handleSaved = (payload) => setToast(payload);

  // Listen for nav events posted by the Tweaks panel quick-nav buttons
  React.useEffect(() => {
    const h = (e) => { setRoute(e.detail); setMobileNav(false); };
    window.addEventListener("farmos:nav", h);
    const e = (ev) => openEntry(ev.detail || "animal");
    window.addEventListener("farmos:openEntry", e);
    return () => {
      window.removeEventListener("farmos:nav", h);
      window.removeEventListener("farmos:openEntry", e);
    };
  }, []);

  const lang = tweaks.lang;

  // Apply theme & density to root
  React.useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  // Route titles
  const routeMeta = {
    dashboard:  { title: t(lang, "dashboard"),  subtitle: lang === "fr" ? "Aperçu global de la ferme" : "Farm-wide overview", breadcrumb: lang === "fr" ? "FERME BELLEVUE · TABLEAU DE BORD" : "BELLEVUE FARM · DASHBOARD" },
    identification: { title: lang === "fr" ? "Identification" : "Identification", subtitle: lang === "fr" ? "Scanner sur le terrain" : "Field scanner", breadcrumb: lang === "fr" ? "FERME · IDENTIFICATION" : "FARM · IDENTIFICATION" },
    buildings:  { title: t(lang, "buildings"),  subtitle: lang === "fr" ? "Plan & organisation spatiale" : "Layout & spatial organization", breadcrumb: lang === "fr" ? "FERME · BÂTIMENTS" : "FARM · BUILDINGS" },
    animals:    { title: t(lang, "animals"),    subtitle: lang === "fr" ? "Cheptel & fiches" : "Herd & records",              breadcrumb: lang === "fr" ? "FERME · ANIMAUX" : "FARM · ANIMALS" },
    health:     { title: t(lang, "health"),     subtitle: lang === "fr" ? "Traitements & vétérinaire" : "Treatments & vet",   breadcrumb: lang === "fr" ? "FERME · SANTÉ" : "FARM · HEALTH" },
    calendar:   { title: t(lang, "calendar"),   subtitle: lang === "fr" ? "Vaccination & rappels" : "Vaccines & reminders",   breadcrumb: lang === "fr" ? "FERME · CALENDRIER" : "FARM · CALENDAR" },
    stock:      { title: t(lang, "stock"),      subtitle: lang === "fr" ? "Aliments, médicaments, équipement" : "Feed, meds, gear", breadcrumb: lang === "fr" ? "FERME · STOCK" : "FARM · STOCK" },
    repro:      { title: t(lang, "repro"),      subtitle: lang === "fr" ? "Chaleurs, gestations, mises bas" : "Heats, gestations, births", breadcrumb: lang === "fr" ? "FERME · REPRODUCTION" : "FARM · REPRODUCTION" },
    production: { title: t(lang, "production"), subtitle: lang === "fr" ? "Lait, œufs, croissance" : "Milk, eggs, growth",     breadcrumb: lang === "fr" ? "FERME · PRODUCTION" : "FARM · PRODUCTION" },
    alerts:     { title: t(lang, "alerts"),     subtitle: lang === "fr" ? "Alertes intelligentes" : "Smart alerts",            breadcrumb: lang === "fr" ? "FERME · ALERTES" : "FARM · ALERTS" },
    finances:   { title: t(lang, "finances"),   subtitle: lang === "fr" ? "Revenus, dépenses, profits" : "Revenue, expenses, profits", breadcrumb: lang === "fr" ? "FERME · FINANCES" : "FARM · FINANCES" },
    reports:    { title: t(lang, "reports"),    subtitle: lang === "fr" ? "Rapports & exports" : "Reports & exports",          breadcrumb: lang === "fr" ? "FERME · RAPPORTS" : "FARM · REPORTS" },
    employees:  { title: t(lang, "employees"),  subtitle: lang === "fr" ? "Équipe & présences" : "Team & shifts",               breadcrumb: lang === "fr" ? "FERME · ÉQUIPE" : "FARM · TEAM" },
    settings:   { title: t(lang, "settings"),   subtitle: lang === "fr" ? "Paramètres & permissions" : "Settings & permissions", breadcrumb: lang === "fr" ? "FERME · PARAMÈTRES" : "FARM · SETTINGS" },
  };
  const meta = routeMeta[route] || routeMeta.dashboard;

  // Render screen
  const renderScreen = () => {
    const props = { lang, speciesFilter, onSpeciesFilter: setSpeciesFilter, onNav: setRoute, density: tweaks.density };
    switch (route) {
      case "dashboard":  return <Dashboard {...props}/>;
      case "identification": return <Identification {...props}/>;
      case "buildings":  return <BuildingsScreen lang={lang}/>;
      case "animals":    return <Animals {...props}/>;
      case "health":     return <HealthScreen {...props}/>;
      case "calendar":   return <CalendarScreen {...props}/>;
      case "stock":      return <StockScreen {...props}/>;
      case "repro":      return <ReproScreen {...props}/>;
      case "production": return <ProductionScreen {...props}/>;
      case "alerts":     return <AlertsScreen {...props}/>;
      case "finances":   return <FinancesScreen {...props}/>;
      case "reports":    return <ReportsScreen {...props}/>;
      case "employees":  return <EmployeesScreen {...props}/>;
      case "settings":   return <SettingsScreen {...props}/>;
      default:           return <Dashboard {...props}/>;
    }
  };

  // Sidebar style: mobile = drawer, tablet = icons-only, desktop = user choice
  const effectiveSidebarStyle = isTablet ? "icons" : tweaks.sidebarStyle;

  const appShell = (
    <div
      data-screen-label="FarmOS Pro"
      data-mobile={isMobile ? "true" : "false"}
      data-layout={layoutMode}
      className={isFramed ? `layout-force-${layoutMode}` : ""}
      style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--bg-app)", position: "relative" }}
    >
      {/* Sidebar — drawer on mobile */}
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
        <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }} data-screen-label={`${route.charAt(0).toUpperCase()}${route.slice(1)}`}>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {renderScreen()}
          </div>
          {tweaks.showMobile && !isMobile && !isFramed && <MobileCompanion lang={lang} route={route} speciesFilter={speciesFilter}/>}
        </div>

        {/* Mobile bottom tab bar */}
        {isMobile && <MobileTabBar route={route} onNav={setRoute} onPlus={() => openEntry("animal")} lang={lang}/>}
      </main>

      <QuickEntryDrawer
        open={entry.open}
        defaultTab={entry.tab}
        lang={lang}
        defaultSpecies={speciesFilter}
        onClose={closeEntry}
        onSaved={handleSaved}
      />

      {toast && <Toast message={toast.message} severity={toast.severity} onClose={() => setToast(null)}/>}
    </div>
  );

  // If device preview is forced, wrap the app inside a device frame
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-app)" }}>
      {isFramed ? (
        <DevicePreviewStage mode={tweaks.deviceMode} lang={lang} onExit={() => setTweak("deviceMode", "auto")}>
          {appShell}
        </DevicePreviewStage>
      ) : (
        appShell
      )}
      <FarmTweaks tweaks={tweaks} setTweak={setTweak}/>
    </div>
  );
}

// ─── Device Preview Stage — wraps app in a bezel for preview ─────────────
const DevicePreviewStage = ({ mode, children, onExit, lang }) => {
  const cfgs = {
    mobile: { w: 390, h: 844, label: "iPhone 15 Pro · 390 × 844", radius: 56, bezel: 14 },
    tablet: { w: 820, h: 1180, label: "iPad Air · 820 × 1180", radius: 38, bezel: 18 },
    desktop:{ w: 1440, h: 900, label: "Desktop · 1440 × 900", radius: 12, bezel: 8 },
  };
  const cfg = cfgs[mode] || cfgs.mobile;

  // Auto-scale to fit
  const [scale, setScale] = React.useState(1);
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sw = (rect.width - 40) / (cfg.w + cfg.bezel * 2);
      const sh = (rect.height - 60) / (cfg.h + cfg.bezel * 2);
      setScale(Math.min(1, sw, sh));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode]);

  return (
    <div ref={containerRef} style={{
      flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bone-100)",
      backgroundImage: "radial-gradient(circle at 50% 50%, rgba(14,36,24,0.04) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      overflow: "hidden", minHeight: 0,
    }}>
      {/* Exit chip */}
      <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, zIndex: 5 }}>
        <button onClick={onExit} className="btn btn-sm">
          <Icon name="x" size={12} color="var(--ink-700)"/>
          {lang === "fr" ? "Quitter aperçu" : "Exit preview"}
        </button>
        <div className="tag" style={{ background: "var(--paper)" }}>
          <Icon name={mode === "mobile" ? "user" : mode === "tablet" ? "grid" : "dashboard"} size={11} color="var(--ink-700)"/>
          {cfg.label}
        </div>
      </div>

      {/* Bezel */}
      <div style={{
        width: cfg.w + cfg.bezel * 2,
        height: cfg.h + cfg.bezel * 2,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        background: "linear-gradient(180deg, #1A2A20 0%, #0E2418 100%)",
        borderRadius: cfg.radius + cfg.bezel,
        padding: cfg.bezel,
        boxShadow: "0 24px 48px -12px rgba(14,36,24,0.32), 0 0 0 1px rgba(14,36,24,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Notch / camera island */}
        {mode === "mobile" && (
          <div style={{
            position: "absolute", top: cfg.bezel + 8, left: "50%", transform: "translateX(-50%)",
            width: 120, height: 30, borderRadius: 999, background: "#000", zIndex: 10,
          }}/>
        )}
        {mode === "tablet" && (
          <div style={{
            position: "absolute", top: cfg.bezel / 2, left: "50%", transform: "translateX(-50%)",
            width: 8, height: 8, borderRadius: 999, background: "#2A3A30", border: "1px solid #1A2A20",
          }}/>
        )}

        {/* Screen */}
        <div style={{
          width: cfg.w,
          height: cfg.h,
          borderRadius: cfg.radius,
          overflow: "hidden",
          background: "var(--bg-app)",
          position: "relative",
        }}>
          {/* Phone status bar overlay */}
          {mode === "mobile" && <PhoneStatusBar lang={lang}/>}
          <div style={{
            width: "100%",
            height: mode === "mobile" ? `calc(100% - 44px)` : "100%",
            marginTop: mode === "mobile" ? 44 : 0,
            overflow: "hidden",
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// iOS-style status bar
const PhoneStatusBar = ({ lang }) => (
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: 44, zIndex: 8,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 28px 0", pointerEvents: "none",
    color: "var(--ink-950)", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-sans)",
  }}>
    <span>9:41</span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {/* Signal */}
      <svg width="17" height="11" viewBox="0 0 17 11"><g fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="5" y="5" width="3" height="6" rx="0.5"/><rect x="10" y="3" width="3" height="8" rx="0.5"/><rect x="14" y="1" width="3" height="10" rx="0.5"/></g></svg>
      {/* Wifi */}
      <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 5.5a6 6 0 0 1 9 0M0 2.5a10 10 0 0 1 15 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      {/* Battery */}
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3" fill="none" stroke="currentColor"/><rect x="24" y="4" width="2" height="5" rx="0.6" fill="currentColor"/><rect x="2" y="2" width="20" height="9" rx="1.5" fill="currentColor"/></svg>
    </span>
  </div>
);

// ─── Mobile bottom tab bar ───────────────────────────────────────────────
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

// ─── Tweaks panel ────────────────────────────────────────────────────────
const FarmTweaks = ({ tweaks, setTweak }) => (
  <TweaksPanel title={tweaks.lang === "fr" ? "Tweaks — FarmOS" : "Tweaks — FarmOS"}>
    <TweakSection title={tweaks.lang === "fr" ? "Apparence" : "Appearance"}>
      <TweakRadio label={tweaks.lang === "fr" ? "Thème" : "Theme"} value={tweaks.theme} onChange={(v) => setTweak("theme", v)} options={[{value:"light",label:tweaks.lang==="fr"?"Clair":"Light"},{value:"dark",label:tweaks.lang==="fr"?"Sombre":"Dark"}]}/>
      <TweakRadio label={tweaks.lang === "fr" ? "Densité" : "Density"} value={tweaks.density} onChange={(v) => setTweak("density", v)} options={[{value:"comfortable",label:tweaks.lang==="fr"?"Confort":"Comfort"},{value:"compact",label:"Compact"}]}/>
      <TweakSelect label={tweaks.lang === "fr" ? "Sidebar" : "Sidebar"} value={tweaks.sidebarStyle} onChange={(v) => setTweak("sidebarStyle", v)} options={[{value:"labels",label:tweaks.lang==="fr"?"Icônes + libellés":"Icons + labels"},{value:"icons",label:tweaks.lang==="fr"?"Icônes seules":"Icons only"}]}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Langue" : "Language"}>
      <TweakRadio label="" value={tweaks.lang} onChange={(v) => setTweak("lang", v)} options={[{value:"fr",label:"Français"},{value:"en",label:"English"}]}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Aperçu device" : "Device preview"} description={tweaks.lang === "fr" ? "Voir le rendu mobile / tablette" : "Preview mobile / tablet"}>
      <TweakSelect label={tweaks.lang === "fr" ? "Format" : "Format"} value={tweaks.deviceMode || "auto"} onChange={(v) => setTweak("deviceMode", v)}
        options={[
          { value: "auto",    label: tweaks.lang === "fr" ? "Auto · plein écran"          : "Auto · full screen" },
          { value: "mobile",  label: tweaks.lang === "fr" ? "📱 Mobile · iPhone 15 Pro"   : "📱 Mobile · iPhone 15 Pro" },
          { value: "tablet",  label: tweaks.lang === "fr" ? "📲 Tablette · iPad Air"      : "📲 Tablet · iPad Air" },
          { value: "desktop", label: tweaks.lang === "fr" ? "💻 Desktop · 1440 × 900"      : "💻 Desktop · 1440 × 900" },
        ]}/>
      <TweakToggle label={tweaks.lang === "fr" ? "Companion mobile (côte à côte)" : "Mobile companion (side-by-side)"} value={tweaks.showMobile} onChange={(v) => setTweak("showMobile", v)}/>
    </TweakSection>
    <TweakSection title={tweaks.lang === "fr" ? "Navigation rapide" : "Quick nav"} description={tweaks.lang === "fr" ? "Sauter à n'importe quel module" : "Jump to any module"}>
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 6 }}>
        {[
          { id: "dashboard", fr: "Tableau de bord", en: "Dashboard" },
          { id: "identification", fr: "Identification", en: "Identification" },
          { id: "buildings", fr: "Bâtiments", en: "Buildings" },
          { id: "animals", fr: "Animaux", en: "Animals" },
          { id: "health", fr: "Santé", en: "Health" },
          { id: "calendar", fr: "Calendrier", en: "Calendar" },
          { id: "stock", fr: "Stock", en: "Stock" },
          { id: "repro", fr: "Reproduction", en: "Repro" },
          { id: "production", fr: "Production", en: "Production" },
          { id: "alerts", fr: "Alertes", en: "Alerts" },
          { id: "finances", fr: "Finances", en: "Finances" },
          { id: "reports", fr: "Rapports", en: "Reports" },
        ].map((r) => (
          <button key={r.id} className="btn btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}
            onClick={() => { /* triggered via custom event because route lives outside */
              window.dispatchEvent(new CustomEvent("farmos:nav", { detail: r.id }));
            }}
          >{tweaks.lang === "fr" ? r.fr : r.en}</button>
        ))}
      </div>
    </TweakSection>
  </TweaksPanel>
);

// ─── Mobile companion (a phone-frame next to the desktop) ────────────────
const MobileCompanion = ({ lang, route, speciesFilter }) => {
  const species = speciesFilter ? speciesById(speciesFilter) : null;
  const isAll = !species;
  return (
    <div style={{ flexShrink: 0, padding: 16, background: "var(--bg-sunken)", borderLeft: "1px solid var(--border-1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, overflow: "auto" }}>
      <div className="overline" style={{ alignSelf: "flex-start" }}>
        {lang === "fr" ? "Aperçu mobile · sur le terrain" : "Mobile preview · field"}
      </div>
      <div className="phone-frame">
        <div className="phone-screen" style={{ background: "var(--bg-app)", display: "flex", flexDirection: "column" }}>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px 6px", fontSize: 12, color: "var(--ink-900)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            <span>09:24</span>
            <span style={{ display: "inline-flex", gap: 4 }}>
              <Icon name="pulse" size={11} color="var(--ink-700)"/>
              <Icon name="bell" size={11} color="var(--ink-700)"/>
            </span>
          </div>
          {/* Top */}
          <div style={{ padding: "8px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="overline" style={{ fontSize: 9 }}>{lang === "fr" ? "FERME BELLEVUE" : "BELLEVUE FARM"}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, }}>{lang === "fr" ? "Bon matin" : "Morning"}</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--oxblood-700)", color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12 }}>MT</div>
          </div>

          {/* Critical alert chip */}
          <div className="withdrawal-banner pulse-critical" style={{ margin: "8px 14px", padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="shield" size={14} color="#ECF1EC"/>
            <div style={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "#ECF1EC" }}>{lang === "fr" ? "Délai retrait · Clémence" : "Withdrawal · Clémence"}</div>
              <div style={{ fontSize: 9.5, color: "#F0D6CB" }} className="mono">9 j restants</div>
            </div>
          </div>

          {/* KPI tile */}
          <div style={{ margin: "8px 14px", display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 8 }}>
            {[
              { label: lang === "fr" ? "Lait/jour" : "Milk/day", value: "5 412", unit: "L", color: "var(--pertinence-500)", icon: "droplet" },
              { label: lang === "fr" ? "Alertes" : "Alerts", value: "6", unit: "", color: "var(--oxblood-700)", icon: "bell" },
            ].map((k, i) => (
              <div key={i} className="card" style={{ padding: "8px 10px" }}>
                <Icon name={k.icon} size={12} color={k.color}/>
                <div style={{ fontSize: 9.5, color: "var(--fg-2)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span className="serif tnum" style={{ fontSize: 18, fontWeight: 500 }}>{k.value}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{k.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action list */}
          <div style={{ margin: "10px 14px 8px" }}>
            <div className="overline" style={{ fontSize: 9, marginBottom: 6 }}>{lang === "fr" ? "Aujourd'hui" : "Today"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: lang === "fr" ? "Vaccination Newcastle" : "Newcastle vaccine", sub: "Lot Chair 09 · 4 200 oiseaux", icon: "syringe", color: "var(--autorite-500)" },
                { label: lang === "fr" ? "Circovirus porcs" : "Pig Circovirus", sub: "Lot Engr. 77 · 198 porcs", icon: "syringe", color: "var(--oxblood-700)" },
                { label: lang === "fr" ? "Traite 16 h" : "Milking 4 PM", sub: "247 vaches", icon: "droplet", color: "var(--pertinence-500)" },
              ].map((a, i) => (
                <div key={i} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 6, padding: "6px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklch, ${a.color} 14%, transparent)`, color: a.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={a.icon} size={11} color="currentColor"/>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-900)" }}>{a.label}</div>
                    <div style={{ fontSize: 9, color: "var(--fg-3)" }}>{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ marginTop: "auto", display: "flex", borderTop: "1px solid var(--border-1)", padding: "8px 0 14px", background: "var(--paper)" }}>
            {[
              { icon: "dashboard", active: true },
              { icon: "layers" },
              { icon: "syringe" },
              { icon: "bell" },
              { icon: "user" },
            ].map((tab, i) => (
              <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Icon name={tab.icon} size={18} color={tab.active ? "var(--oxblood-700)" : "var(--ink-400)"}/>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>iPhone 15 · 320 × 640</div>
    </div>
  );
};

// Mount the app
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
