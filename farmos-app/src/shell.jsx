/* eslint-disable */
// Shell — sidebar, topbar with species switcher, language toggle.
import React from "react";
import { Icon, AnimalGlyph, Brand } from "./icons";
import { SPECIES, t } from "./data";
import { api } from "./api";
import { NetStatusPill } from "./offline-status";

const NAV = [
  { id: "dashboard", icon: "dashboard", labelKey: "dashboard" },
  { id: "identification", icon: "scanLine", labelKey: "identification" },
  { id: "animals",   icon: "layers",    labelKey: "animals" },
  { id: "health",    icon: "pulse",     labelKey: "health" },
  { id: "calendar",  icon: "calendar",  labelKey: "calendar" },
  { id: "stock",     icon: "package",   labelKey: "stock" },
  { id: "repro",     icon: "fingerprint", labelKey: "repro" },
  { id: "semen-bank",icon: "flask",       labelKey: "semenBank" },
  { id: "production",icon: "chart",     labelKey: "production" },
  { id: "alerts",    icon: "bell",      labelKey: "alerts", critical: true },
  { id: "finances",  icon: "coins",     labelKey: "finances" },
  { id: "reports",   icon: "report",    labelKey: "reports" },
];

const NAV_SECONDARY = [
  { id: "employees", icon: "users",     labelKey: "employees" },
  { id: "settings",  icon: "settings",  labelKey: "settings" },
];

function readCurrentUser() {
  try {
    const name = (localStorage.getItem("user") || "").trim();
    const role = (localStorage.getItem("role") || "").trim();
    const email = (localStorage.getItem("email") || "").trim();
    const id = localStorage.getItem("id");
    if (!name && !email && !id) return null;
    const display = name || email || "—";
    const initials = display
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";
    return { display, role, email, initials };
  } catch {
    return null;
  }
}

const UserChip = ({ showLabels, lang }) => {
  const [u, setU] = React.useState(readCurrentUser);
  React.useEffect(() => {
    const onStorage = () => setU(readCurrentUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  if (!u) {
    return (
      <div style={{ padding: 12, borderTop: "1px solid #1F2A44", display: "flex", alignItems: "center", gap: 10, justifyContent: showLabels ? "flex-start" : "center" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#1F2A44",
          color: "rgba(236,241,236,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14, flexShrink: 0,
        }}>?</div>
        {showLabels && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(236,241,236,0.55)" }}>
              {lang === "fr" ? "Non connecté" : "Not signed in"}
            </div>
            <a href="/admin/" style={{ fontSize: 11, color: "#D7AA45", textDecoration: "none" }}>
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </a>
          </div>
        )}
      </div>
    );
  }
  const logout = () => {
    try {
      ["access-token", "role", "roleId", "user", "id", "isLogged", "email"].forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.dispatchEvent(new CustomEvent("farmos:auth-changed"));
  };
  return (
    <div style={{ padding: 12, borderTop: "1px solid #1F2A44", display: "flex", alignItems: "center", gap: 8, justifyContent: showLabels ? "flex-start" : "center" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: "#A85A2A",
        color: "#ECF1EC", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 14, flexShrink: 0,
      }}>{u.initials}</div>
      {showLabels && (
        <>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#ECF1EC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.display}</div>
            {(u.role || u.email) && (
              <div style={{ fontSize: 11, color: "rgba(236,241,236,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.role || u.email}
              </div>
            )}
          </div>
          <button onClick={logout} title={lang === "fr" ? "Se déconnecter" : "Sign out"}
            style={{ background: "transparent", border: 0, color: "rgba(236,241,236,0.55)", cursor: "pointer", padding: 6, flexShrink: 0 }}>
            <Icon name="x" size={14} color="currentColor"/>
          </button>
        </>
      )}
    </div>
  );
};

const Sidebar = ({ active, onNav, lang, speciesFilter, onSpeciesFilter, sidebarStyle }) => {
  const showLabels = sidebarStyle !== "icons";
  const width = showLabels ? 248 : 64;
  const [animals, setAnimals] = React.useState([]);
  React.useEffect(() => {
    let cancel = false;
    const load = () => api.listAnimals().then((rows) => { if (!cancel && Array.isArray(rows)) setAnimals(rows); }).catch(() => {});
    load();
    window.addEventListener("farmos:animal-created", load);
    return () => { cancel = true; window.removeEventListener("farmos:animal-created", load); };
  }, []);
  const { counts, sick, total } = deriveSpeciesCounts(animals);
  // alertCount is now derived in App from live data and shown via badge prop elsewhere.
  const alertCount = 0;
  return (
    <aside style={{
      width, background: "#0E2418", color: "#ECF1EC",
      display: "flex", flexDirection: "column", flexShrink: 0,
      borderRight: "1px solid #1F2A44",
      transition: "width 200ms var(--ease-out)",
      height: "100%", overflowY: "auto", overflowX: "hidden",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: showLabels ? "18px 18px 16px" : "18px 12px 16px", justifyContent: showLabels ? "flex-start" : "center" }}>
        <Brand size={28} color="#ECF1EC" accent="#D7AA45"/>
        {showLabels && (
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 17, letterSpacing: "-0.015em" }}>
              FarmOS<span style={{  color: "#D7AA45" }}> Pro</span>
            </span>
            <span style={{ fontSize: 10, color: "rgba(236,241,236,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>
              {lang === "fr" ? "Élevage intelligent" : "Smart livestock"}
            </span>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav style={{ padding: showLabels ? "8px 10px" : "8px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <button key={n.id} className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => onNav(n.id)}
              style={{ justifyContent: showLabels ? "flex-start" : "center", padding: showLabels ? "8px 10px" : "10px 10px" }}
              title={!showLabels ? t(lang, n.labelKey) : undefined}
            >
              <Icon name={n.icon} size={17} color={isActive ? "#D7AA45" : "rgba(236,241,236,0.55)"}/>
              {showLabels && <span style={{ flex: 1 }}>{t(lang, n.labelKey)}</span>}
              {showLabels && n.critical && alertCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                  background: "#A85A2A", color: "#ECF1EC", padding: "2px 6px", borderRadius: 999,
                  minWidth: 18, textAlign: "center",
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Species filter */}
      {showLabels && (
        <>
          <div style={{ padding: "20px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="overline" style={{ color: "rgba(236,241,236,0.42)" }}>
              {lang === "fr" ? "Espèce active" : "Active species"}
            </div>
            <button style={{ background: "transparent", border: 0, color: "rgba(236,241,236,0.55)", cursor: "pointer", padding: 2, display: "flex" }}>
              <Icon name="plus" size={14} color="rgba(236,241,236,0.55)"/>
            </button>
          </div>
          <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
            <button onClick={() => onSpeciesFilter(null)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                border: 0, borderRadius: 6, cursor: "pointer", textAlign: "left",
                background: speciesFilter === null ? "#163022" : "transparent",
                color: speciesFilter === null ? "#ECF1EC" : "rgba(236,241,236,0.62)",
                fontFamily: "var(--font-sans)", fontSize: 12.5,
              }}>
              <Icon name="grid" size={14} color={speciesFilter === null ? "#D7AA45" : "rgba(236,241,236,0.42)"}/>
              <span style={{ flex: 1 }}>{t(lang, "allSpecies")}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(236,241,236,0.42)" }}>{total.toLocaleString("fr-CA")}</span>
            </button>
            {SPECIES.map((s) => (
              <button key={s.id} onClick={() => onSpeciesFilter(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                  border: 0, borderRadius: 6, cursor: "pointer", textAlign: "left",
                  background: speciesFilter === s.id ? "#163022" : "transparent",
                  color: speciesFilter === s.id ? "#ECF1EC" : "rgba(236,241,236,0.62)",
                  fontFamily: "var(--font-sans)", fontSize: 12.5,
                }}>
                <AnimalGlyph kind={s.glyph} size={16} color={speciesFilter === s.id ? "#D7AA45" : "rgba(236,241,236,0.55)"}/>
                <span style={{ flex: 1 }}>{lang === "fr" ? s.fr : s.en}</span>
                {(sick[s.id] || 0) > 0 && <span style={{ width: 6, height: 6, borderRadius: 999, background: "#BE5234" }}/>}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(236,241,236,0.42)" }}>{(counts[s.id] || 0).toLocaleString("fr-CA")}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Secondary nav */}
      <div style={{ marginTop: "auto", flexShrink: 0 }}>
        <nav style={{ padding: showLabels ? "8px 10px" : "8px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV_SECONDARY.map((n) => {
            const isActive = active === n.id;
            return (
              <button key={n.id} className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => onNav(n.id)}
                style={{ justifyContent: showLabels ? "flex-start" : "center", padding: showLabels ? "8px 10px" : "10px 10px" }}
                title={!showLabels ? t(lang, n.labelKey) : undefined}
              >
                <Icon name={n.icon} size={17} color={isActive ? "#D7AA45" : "rgba(236,241,236,0.55)"}/>
                {showLabels && <span style={{ flex: 1 }}>{t(lang, n.labelKey)}</span>}
              </button>
            );
          })}
          {/* Back to CRM admin app */}
          <button className="nav-item"
            onClick={() => { window.location.href = "/admin/"; }}
            style={{ justifyContent: showLabels ? "flex-start" : "center", padding: showLabels ? "8px 10px" : "10px 10px", marginTop: 4, borderTop: "1px solid #1F2A44" }}
            title={!showLabels ? (lang === "fr" ? "Retour au CRM" : "Back to CRM") : undefined}
          >
            <Icon name="chevLeft" size={17} color="rgba(236,241,236,0.55)"/>
            {showLabels && <span style={{ flex: 1 }}>{lang === "fr" ? "Retour au CRM" : "Back to CRM"}</span>}
          </button>
        </nav>

        {/* User chip — sourced from CRM localStorage (same-origin) */}
        <UserChip showLabels={showLabels} lang={lang}/>
      </div>
    </aside>
  );
};

// ─── Top bar: title + species pills (when filter is null) + actions ──────
const Topbar = ({ title, subtitle, lang, onLang, speciesFilter, onSpeciesFilter, right, breadcrumb, isMobile, isTablet, onHamburger, onQuickEntry }) => {
  const compact = isMobile || isTablet;
  return (
  <header style={{
    height: isMobile ? 56 : 64, borderBottom: "1px solid var(--border-1)",
    background: "var(--bg-app)", padding: isMobile ? "0 14px" : "0 20px",
    display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, flexShrink: 0,
  }}>
    {isMobile && (
      <button onClick={onHamburger} className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, justifyContent: "center", flexShrink: 0 }}>
        <Icon name="list" size={18} color="var(--ink-800)"/>
      </button>
    )}

    <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0, flexShrink: 1, maxWidth: compact ? 200 : 360, flex: compact ? "1 1 auto" : "0 1 auto" }}>
      {breadcrumb && !compact && (
        <div className="overline" style={{ color: "var(--ink-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{breadcrumb}</div>
      )}
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: isMobile ? 18 : 22,
        letterSpacing: "-0.025em", color: "var(--ink-950)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{title}</div>
      {subtitle && !compact && (
        <div style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.005em", fontFamily: "var(--font-sans)", marginTop: 1, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
      )}
    </div>

    {!isMobile && (
      <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}>
        <div className="topbar-search" style={{ minWidth: isTablet ? 0 : 280, maxWidth: 480, flex: 1, height: isTablet ? 36 : 40 }}>
          <Icon name="search" size={15} color="var(--ink-500)"/>
          <input
            placeholder={isTablet
              ? (lang === "fr" ? "Rechercher…" : "Search…")
              : (lang === "fr" ? "Rechercher animal, lot, médicament, alerte…" : "Search animal, batch, medicine, alert…")}
            style={{
              border: 0, background: "transparent", flex: 1, outline: "none", minWidth: 0,
              fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-1)",
            }}
          />
          {!isTablet && (
            <kbd style={{
              fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)",
              background: "var(--bg-sunken)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border-1)",
            }}>⌘K</kbd>
          )}
        </div>
      </div>
    )}

    {/* Language toggle */}
    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 999, padding: 3, height: 32, flexShrink: 0 }}>
      {["fr", "en"].map((l) => (
        <button key={l} onClick={() => onLang(l)} style={{
          height: 24, padding: "0 10px", border: 0, borderRadius: 999,
          background: lang === l ? "var(--ink-900)" : "transparent",
          color: lang === l ? "var(--bone-50)" : "var(--ink-600)",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: "pointer", fontFamily: "var(--font-sans)",
        }}>{l}</button>
      ))}
    </div>

    {right || (
      <>
        {!compact && <NetStatusPill lang={lang}/>}
        {!compact && (
          <button className="btn btn-ghost" style={{ height: 32, width: 32, padding: 0, justifyContent: "center", position: "relative", flexShrink: 0 }}>
            <Icon name="bell" size={16} color="var(--ink-700)"/>
            <span style={{ position: "absolute", top: 4, right: 5, width: 6, height: 6, borderRadius: 999, background: "var(--rust-700)" }}/>
          </button>
        )}
        {isTablet && (
          <button className="btn btn-ghost" style={{ height: 36, width: 36, padding: 0, justifyContent: "center", position: "relative", flexShrink: 0 }}>
            <Icon name="bell" size={18} color="var(--ink-700)"/>
            <span style={{ position: "absolute", top: 6, right: 7, width: 6, height: 6, borderRadius: 999, background: "var(--rust-700)" }}/>
          </button>
        )}
        {!isMobile && (
          <button className="btn btn-primary" onClick={onQuickEntry} style={{ flexShrink: 0, height: isTablet ? 36 : 36 }}>
            <Icon name="plus" size={14} color="#FBF8F2"/>
            {isTablet ? (lang === "fr" ? "Saisie" : "Entry") : (lang === "fr" ? "Saisie rapide" : "Quick entry")}
          </button>
        )}
      </>
    )}
  </header>
  );
};

// ─── Species pill bar (for dashboard / cross-species screens) ────────────
// Counts derived from live animals: each row counts as 1, OR `count` field
// if set (used for lots: chicken/duck/turkey/fish). Sick count = rows with
// status != "healthy".
function deriveSpeciesCounts(animals) {
  const counts = {};
  const sick = {};
  (animals || []).forEach((a) => {
    const sp = a.species;
    if (!sp) return;
    const n = Number(a.count) > 0 ? Number(a.count) : 1;
    counts[sp] = (counts[sp] || 0) + n;
    if (a.status && a.status !== "healthy") sick[sp] = (sick[sp] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, sick, total };
}

const SpeciesPillBar = ({ lang, value, onChange, includeAll = true, compact = false, animals }) => {
  const [fetched, setFetched] = React.useState(null);
  React.useEffect(() => {
    if (animals) return;
    let cancel = false;
    api.listAnimals().then((rows) => { if (!cancel && Array.isArray(rows)) setFetched(rows); }).catch(() => {});
    const reload = () => api.listAnimals().then((rows) => { if (!cancel && Array.isArray(rows)) setFetched(rows); }).catch(() => {});
    window.addEventListener("farmos:animal-created", reload);
    return () => { cancel = true; window.removeEventListener("farmos:animal-created", reload); };
  }, [animals]);
  const source = animals || fetched || [];
  const { counts, sick, total } = deriveSpeciesCounts(source);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {includeAll && (
        <button onClick={() => onChange(null)}
          className={`species-pill ${value === null ? "active" : ""}`}
          style={{ height: compact ? 30 : 36, fontSize: 12.5 }}>
          <Icon name="grid" size={14} color={value === null ? "var(--parchment-50)" : "var(--ink-600)"}/>
          <span>{t(lang, "allSpecies")}</span>
          <span className="mono" style={{ fontSize: 11, opacity: 0.75 }}>{total.toLocaleString("fr-CA")}</span>
        </button>
      )}
      {SPECIES.map((s) => {
        const active = value === s.id;
        const n = counts[s.id] || 0;
        const sickN = sick[s.id] || 0;
        return (
          <button key={s.id} onClick={() => onChange(s.id)}
            className={`species-pill ${active ? "active" : ""}`}
            style={{ height: compact ? 30 : 36, fontSize: 12.5 }}>
            <AnimalGlyph kind={s.glyph} size={16} color={active ? "var(--parchment-50)" : "var(--ink-700)"}/>
            <span>{lang === "fr" ? s.fr : s.en}</span>
            <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{n.toLocaleString("fr-CA")}</span>
            {sickN > 0 && <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--oxblood-700)", marginLeft: 2 }}/>}
          </button>
        );
      })}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, unit, delta, trend, accent, icon, sublabel }) => {
  const positive = delta >= 0;
  const deltaColor = positive ? "var(--solidite-700)" : "var(--oxblood-700)";
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && (
            <div style={{
              width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              background: accent ? `color-mix(in oklch, ${accent} 12%, transparent)` : "var(--ink-50)",
              color: accent || "var(--ink-700)",
            }}>
              <Icon name={icon} size={15} color="currentColor"/>
            </div>
          )}
          <div>
            <div className="overline" style={{ color: "var(--fg-2)" }}>{label}</div>
            {sublabel && <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--clay-700)", letterSpacing: 0 }}>{sublabel}</div>}
          </div>
        </div>
        {delta !== undefined && (
          <span className="mono" style={{ fontSize: 11, color: deltaColor, display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Icon name={positive ? "arrowUp" : "arrowDown"} size={10} color={deltaColor}/>
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="serif tnum" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, color: "var(--ink-950)", letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{unit}</span>}
      </div>
      {trend && <Sparkline data={trend} color={accent || "var(--ink-400)"}/>}
    </div>
  );
};

// ─── Sparkline ──────────────────────────────────────────────────────────
const Sparkline = ({ data, color = "var(--ink-400)", height = 28, fill = true }) => {
  const w = 100, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i/(data.length-1))*w},${h - ((d-min)/range)*(h-4) - 2}`);
  const path = `M${points.join(" L")}`;
  const area = fill ? `${path} L${w},${h} L0,${h} Z` : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} opacity={0.10}/>}
      <path d={path} stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
};

// ─── 3-axis score (Santé · Production · Finances) ─────────────────────────
const FarmScore = ({ sante, prod, finance, size = "md" }) => {
  const small = size === "sm";
  const cell = { display: "flex", flexDirection: "column", alignItems: "center", padding: small ? "5px 9px" : "7px 11px", minWidth: small ? 46 : 56 };
  const lbl = { fontSize: small ? 8.5 : 9.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, opacity: 0.85 };
  const val = { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: small ? 16 : 22, lineHeight: 1, letterSpacing: "-0.02em", marginTop: 2 };
  const rangeColor = (axis, score) => {
    if (axis === "sante") {
      if (score < 60) return { bg: "var(--oxblood-50)", fg: "var(--oxblood-800)" };
      if (score < 80) return { bg: "var(--autorite-50)", fg: "var(--autorite-900)" };
      return { bg: "var(--solidite-50)", fg: "var(--solidite-900)" };
    }
    if (axis === "prod")  return { bg: "var(--pertinence-50)", fg: "var(--pertinence-900)" };
    if (axis === "finance") return { bg: "var(--solidite-50)", fg: "var(--solidite-900)" };
  };
  const a = rangeColor("sante", sante), b = rangeColor("prod", prod), c = rangeColor("finance", finance);
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border-1)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ ...cell, background: a.bg, color: a.fg }}><span style={lbl}>Santé</span><span style={val}>{sante}</span></div>
      <div style={{ ...cell, background: b.bg, color: b.fg }}><span style={lbl}>Prod</span><span style={val}>{prod}</span></div>
      <div style={{ ...cell, background: c.bg, color: c.fg }}><span style={lbl}>$</span><span style={val}>{finance}</span></div>
    </div>
  );
};

// ─── Empty state ─────────────────────────────────────────────────────────
const EmptyState = ({ title, hint, icon = "sparkle" }) => (
  <div className="dot-grid" style={{
    border: "1px dashed var(--border-2)", borderRadius: 12, padding: 40,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--fg-2)",
  }}>
    <Icon name={icon} size={28} color="var(--ink-400)"/>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink-800)",  fontWeight: 500 }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{hint}</div>}
  </div>
);

export { Sidebar, Topbar, SpeciesPillBar, KpiCard, Sparkline, FarmScore, EmptyState };
