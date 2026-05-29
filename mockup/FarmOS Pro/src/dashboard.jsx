/* eslint-disable */
// Dashboard — adapts entirely based on speciesFilter.

const Dashboard = ({ lang, speciesFilter, onSpeciesFilter, onNav }) => {
  const species = speciesFilter ? speciesById(speciesFilter) : null;
  const isAll = !species;

  // KPI set (adapts)
  const kpis = isAll ? [
    { label: t(lang, "kTotal"),       value: TOTALS.count.toLocaleString("fr-CA"), unit: lang==="fr"?"têtes":"head", delta: 2.4, trend: [220, 230, 245, 250, 255, 260, 268, 272, 275, 278, 280, 281], icon: "layers" },
    { label: t(lang, "kSick"),        value: TOTALS.sick,   unit: lang==="fr"?"animaux":"animals", delta: -8, trend: [12, 14, 11, 10, 9, 11, 9, 8, 7, 6, 5, TOTALS.sick], icon: "pulse", accent: "var(--health-500)" },
    { label: t(lang, "kMortality"),   value: "1,2", unit: "%", delta: -0.3, trend: [1.8, 1.7, 1.6, 1.5, 1.4, 1.5, 1.4, 1.3, 1.3, 1.2, 1.2, 1.2], icon: "activity" },
    { label: t(lang, "kAlerts"),      value: ALERTS.length, unit: lang==="fr"?"actives":"active", delta: 12, trend: [3, 4, 4, 5, 4, 6, 5, 7, 6, 6, 7, 6], icon: "bell", accent: "var(--critical)" },
    { label: t(lang, "kRevenue"),     value: "94 200", unit: "$", delta: 8.2, trend: FINANCE.revenue, icon: "coins", accent: "var(--money-500)" },
    { label: t(lang, "kExpense"),     value: "55 100", unit: "$", delta: 3.6, trend: FINANCE.expense, icon: "wallet" },
    { label: t(lang, "kFeedStock"),   value: "62", unit: "%", delta: -4, trend: [85, 82, 78, 75, 73, 70, 68, 66, 64, 63, 62, 62], icon: "wheat", accent: "var(--health-500)" },
    { label: t(lang, "kVaccinesLate"), value: 1, unit: lang==="fr"?"en retard":"overdue", delta: -50, trend: [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1], icon: "syringe", accent: "var(--health-500)" },
  ] : [
    { label: lang === "fr" ? `Cheptel · ${species.fr}` : `Herd · ${species.en}`, value: species.count.toLocaleString("fr-CA"), unit: species.countingUnit, delta: 1.8, trend: [species.count-30, species.count-25, species.count-20, species.count-15, species.count-10, species.count-8, species.count-5, species.count-3, species.count-2, species.count-1, species.count, species.count], icon: "layers", accent: species.accent },
    { label: t(lang, "kSick"),      value: species.sick,  unit: lang==="fr"?"animaux":"animals", delta: -2, trend: [4, 5, 5, 6, 6, 5, 5, 4, 4, 3, species.sick, species.sick], icon: "pulse", accent: "var(--health-500)" },
    { label: t(lang, "kMortality"), value: species.mortality.toString().replace(".", ","), unit: "%", delta: -0.2, trend: [2.5, 2.4, 2.3, 2.2, 2.1, 2.1, 2.0, 1.9, 1.8, species.mortality, species.mortality, species.mortality], icon: "activity" },
    { label: lang === "fr" ? species.productLabel.fr : species.productLabel.en, value: species.productValue, unit: species.productUnit, delta: 4.1, trend: species.productTrend, icon: species.productPrimary === "milk" ? "droplet" : species.productPrimary === "eggs" ? "egg" : species.productPrimary === "wool" ? "leaf" : "chart", accent: species.accent },
    { label: lang === "fr" ? "Traitements actifs" : "Active treatments", value: TREATMENTS.filter(t=>t.species===species.id && t.status==="running").length, unit: "", delta: 0, trend: [1,2,2,2,2,2,1,1,1,1,1,1], icon: "pill", accent: "var(--health-500)" },
    { label: lang === "fr" ? "Vaccins à venir (7 j)" : "Vaccines (7 d)", value: VACCINES.filter(v=>v.species===species.id).length, unit: "", delta: 0, trend: [0,0,1,1,2,2,2,2,3,3,3,3], icon: "syringe", accent: "var(--health-500)" },
    { label: lang === "fr" ? "Stock aliment" : "Feed stock", value: STOCK.filter(s=>s.kind==="feed" && s.species.includes(species.id)).reduce((a,b)=>a+b.qty,0).toLocaleString("fr-CA"), unit: "kg", delta: -3.1, trend: [9000, 8800, 8500, 8200, 8000, 7700, 7500, 7300, 7100, 6900, 6800, 6700], icon: "wheat", accent: "var(--money-500)" },
    { label: lang === "fr" ? "Revenu mensuel" : "Monthly revenue", value: speciesRevenue(species.id), unit: "$", delta: 6.4, trend: FINANCE.revenue.map(v => Math.round(v * 0.3)), icon: "coins", accent: "var(--money-500)" },
  ];

  // Species-aware filtered lists
  const alertsFiltered = isAll ? ALERTS : ALERTS.filter(a => a.species === species.id);
  const aiFiltered = AI_INSIGHTS;
  const vaccinesUpcoming = isAll ? VACCINES.slice(0, 5) : VACCINES.filter(v => v.species === species.id).slice(0, 5);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 20, overflow: "auto", height: "100%" }}>
      {/* Header strip with species switcher */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="overline" style={{ marginBottom: 4 }}>
              {lang === "fr" ? "Vue d'ensemble · Overview" : "Overview · Vue d'ensemble"}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 32, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
              {isAll
                ? (lang === "fr" ? <>Ferme Bellevue, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>jeudi 26 mai</span></> : <>Bellevue Farm, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>Thursday, May 26</span></>)
                : (lang === "fr" ? <>{species.fr}, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>aperçu détaillé</span></> : <>{species.en}, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>detailed overview</span></>)
              }
            </h1>
          </div>
          <FarmScore sante={isAll ? 82 : speciesScore(species.id, "sante")} prod={isAll ? 91 : speciesScore(species.id, "prod")} finance={isAll ? 78 : speciesScore(species.id, "finance")}/>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter}/>
        </div>
      </div>

      {/* Withdrawal banner when on cow / any species with active withdrawal */}
      {alertsFiltered.some(a => a.kind === "withdrawal") && (
        <WithdrawalBanner lang={lang} alerts={alertsFiltered.filter(a => a.kind === "withdrawal")}/>
      )}

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k}/>)}
      </div>

      {/* Two-column main area */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main)", gap: 16, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Production chart */}
          <ProductionPanel lang={lang} species={species}/>

          {/* Per-species breakdown (only when all) OR Diseases (when species) */}
          {isAll ? <SpeciesBreakdown lang={lang} onSelect={onSpeciesFilter}/> : <SpeciesDetailPanel lang={lang} species={species}/>}

          {/* AI Insights */}
          <AIPanel lang={lang} insights={aiFiltered}/>
        </div>

        {/* Right column: alerts + upcoming */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AlertsPanel lang={lang} alerts={alertsFiltered} onAll={() => onNav("alerts")}/>
          <UpcomingPanel lang={lang} vaccines={vaccinesUpcoming} onAll={() => onNav("calendar")}/>
        </div>
      </div>
    </div>
  );
};

// helpers
function speciesRevenue(id) {
  const map = { cow: "28 400", pig: "18 900", chicken: "21 100", fish: "4 200", goat: "3 200", sheep: "1 800", rabbit: "1 600", duck: "2 800", turkey: "12 200" };
  return map[id] || "0";
}
function speciesScore(id, axis) {
  const map = {
    cow:    { sante: 84, prod: 92, finance: 81 },
    pig:    { sante: 72, prod: 88, finance: 76 },
    chicken:{ sante: 89, prod: 94, finance: 84 },
    fish:   { sante: 66, prod: 78, finance: 70 },
    goat:   { sante: 86, prod: 81, finance: 68 },
    sheep:  { sante: 79, prod: 72, finance: 62 },
    rabbit: { sante: 81, prod: 85, finance: 71 },
    duck:   { sante: 88, prod: 86, finance: 74 },
    turkey: { sante: 84, prod: 79, finance: 73 },
  };
  return (map[id] || { sante: 80, prod: 80, finance: 80 })[axis];
}

// ─── Withdrawal banner ───────────────────────────────────────────────────
const WithdrawalBanner = ({ lang, alerts }) => (
  <div className="withdrawal-banner" style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
    <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
      <Icon name="shield" size={20} color="#ECF1EC"/>
    </div>
    <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="overline" style={{ color: "rgba(251, 248, 242, 0.85)" }}>{lang === "fr" ? "Délai de retrait · obligatoire" : "Withdrawal period · mandatory"}</span>
        {alerts.map((a, i) => (
          <span key={i} className="italic-serif" style={{ fontSize: 13, color: "#F0D6CB" }}>{a.animal}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {lang === "fr" ? "Vente, abattage et collecte bloqués" : "Sale, slaughter and collection blocked"}
        </span>
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {alerts.map((a, i) => (
          <span key={i} className="mono" style={{ fontSize: 11.5, color: "#F0D6CB", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "#F0D6CB" }}/>
            {a.subtitle}
          </span>
        ))}
      </div>
    </div>
    <button className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#ECF1EC", borderColor: "rgba(255,255,255,0.2)", position: "relative", zIndex: 1 }}>
      {lang === "fr" ? "Détails" : "Details"}
      <Icon name="arrowRight" size={14} color="#ECF1EC"/>
    </button>
  </div>
);

// ─── Production panel with chart ─────────────────────────────────────────
const ProductionPanel = ({ lang, species }) => {
  const isAll = !species;
  const series = isAll ? [
    { name: lang === "fr" ? "Lait (×1000 L)" : "Milk (×1000 L)", color: "var(--pertinence-500)", data: [4.2, 4.4, 4.5, 4.7, 4.8, 5.0, 5.1, 5.2, 5.3, 5.3, 5.4, 5.41] },
    { name: lang === "fr" ? "Œufs (×1000)" : "Eggs (×1000)",     color: "var(--autorite-500)",   data: [14.5, 14.8, 15.1, 15.4, 15.7, 16.0, 15.8, 16.1, 16.2, 16.1, 16.3, 16.25] },
  ] : [
    { name: lang === "fr" ? species.productLabel.fr : species.productLabel.en, color: species.accent, data: species.productTrend },
  ];
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div className="bilang">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>
              {lang === "fr" ? "Production" : "Production"}
            </h3>
            <span className="sec">{lang === "fr" ? "production" : "production"} · 12 derniers jours</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[t(lang, "week"), t(lang, "month"), t(lang, "quarter"), t(lang, "year")].map((p, i) => (
            <button key={i} className="btn btn-sm" style={i === 1 ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>{p}</button>
          ))}
        </div>
      </div>
      <ProdChart series={series} lang={lang}/>
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {series.map((s, i) => (
          <span key={i} style={{ fontSize: 12, color: "var(--fg-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}/> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
};

const ProdChart = ({ series, lang }) => {
  const W = 720, H = 200, PAD_L = 36, PAD_B = 24, PAD_R = 12, PAD_T = 8;
  const days = ["15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26"];
  const seriesMaxes = series.map(s => Math.max(...s.data));
  const seriesMins  = series.map(s => Math.min(...s.data));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W-PAD_R} y1={PAD_T + (H-PAD_T-PAD_B)*g} y2={PAD_T + (H-PAD_T-PAD_B)*g} stroke="var(--border-1)" strokeDasharray="2 4"/>
          <text x={PAD_L - 6} y={PAD_T + (H-PAD_T-PAD_B)*g + 4} textAnchor="end" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{Math.round((1-g) * 100)}</text>
        </g>
      ))}
      {/* x labels */}
      {days.map((d, i) => (
        <text key={i} x={PAD_L + (i/(days.length-1)) * (W-PAD_L-PAD_R)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{d}</text>
      ))}
      {/* series */}
      {series.map((s, si) => {
        const min = seriesMins[si], max = seriesMaxes[si], range = max - min || 1;
        const pts = s.data.map((d, i) => ({
          x: PAD_L + (i/(s.data.length-1)) * (W-PAD_L-PAD_R),
          y: PAD_T + (H-PAD_T-PAD_B) * (1 - (d - min) / range),
        }));
        const path = "M" + pts.map(p => `${p.x},${p.y}`).join(" L");
        const area = path + ` L${pts[pts.length-1].x},${H-PAD_B} L${pts[0].x},${H-PAD_B} Z`;
        return (
          <g key={si}>
            <path d={area} fill={s.color} opacity={0.12}/>
            <path d={path} stroke={s.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p, i) => i === pts.length-1 && (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill={s.color} stroke="var(--paper)" strokeWidth="2"/>
                <text x={p.x + 8} y={p.y - 6} fontSize="11" fontFamily="var(--font-mono)" fill={s.color}>{s.data[i].toLocaleString("fr-CA")}</text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Species breakdown grid (when "all") ─────────────────────────────────
const SpeciesBreakdown = ({ lang, onSelect }) => (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Par espèce" : "By species"}</h3>
        <span className="sec">{lang === "fr" ? "by species" : "par espèce"}</span>
      </div>
      <button className="btn btn-sm btn-ghost">
        {lang === "fr" ? "Tout voir" : "View all"}
        <Icon name="arrowRight" size={12} color="var(--ink-600)"/>
      </button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "var(--cols-5)", gap: 8 }}>
      {SPECIES.map((s) => (
        <button key={s.id} onClick={() => onSelect(s.id)} style={{
          background: "var(--bg-sunken)", border: "1px solid var(--border-1)", borderRadius: 10,
          padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 6, cursor: "pointer",
          textAlign: "left", transition: "all 120ms var(--ease-out)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink-300)"; e.currentTarget.style.background = "var(--paper)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-1)"; e.currentTarget.style.background = "var(--bg-sunken)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: s.accentBg, color: s.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AnimalGlyph kind={s.glyph} size={18} color="currentColor"/>
            </div>
            {s.sick > 0 && (
              <span className="tag tag-danger" style={{ fontSize: 10, padding: "1px 6px" }}>
                {s.sick} {lang==="fr"?"malades":"sick"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="tnum serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-950)" }}>{s.count.toLocaleString("fr-CA")}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{s.countingUnit === "lot" ? (lang==="fr"?"oiseaux":"birds") : s.countingUnit === "bassin" ? "kg" : ""}</span>
          </div>
          <Sparkline data={s.productTrend} color={s.accent}/>
        </button>
      ))}
    </div>
  </div>
);

// ─── Species detail panel (when one species selected) ────────────────────
const SpeciesDetailPanel = ({ lang, species }) => (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>
          {lang === "fr" ? "Module spécifique" : "Species module"} · <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{lang === "fr" ? species.fr : species.en}</span>
        </h3>
        <span className="sec">{species.modules.length} {lang === "fr" ? "modules adaptés" : "adapted modules"}</span>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 24 }}>
      {/* Diseases */}
      <div>
        <div className="overline" style={{ color: "var(--health-700)", marginBottom: 8 }}>
          {lang === "fr" ? "Maladies surveillées" : "Monitored diseases"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(lang === "fr" ? species.diseases : species.diseasesEn).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: i === 0 ? "var(--rust-700)" : i === 1 ? "var(--wheat-500)" : "var(--ink-300)" }}/>
              <span style={{ color: "var(--ink-800)" }}>{d}</span>
              {i === 0 && <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>{Math.floor(species.sick * 0.6)} cas</span>}
            </div>
          ))}
        </div>
      </div>
      {/* Alerts surveilled */}
      <div>
        <div className="overline" style={{ color: "var(--pertinence-700)", marginBottom: 8 }}>
          {lang === "fr" ? "Alertes surveillées" : "Monitored alerts"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(lang === "fr" ? species.alerts : species.alertsEn).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <Icon name={i === 0 ? "chart" : i === 1 ? "pulse" : i === 2 ? "calendar" : "thermometer"} size={13} color="var(--pertinence-500)"/>
              <span style={{ color: "var(--ink-800)" }}>{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="hairline" style={{ marginTop: 14, paddingTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div className="overline" style={{ width: "100%", marginBottom: 2 }}>{lang === "fr" ? "Champs du dossier animal" : "Animal sheet fields"}</div>
      {species.fields.map((f, i) => (
        <span key={i} className="tag" style={{ background: "var(--bg-sunken)" }}>{f}</span>
      ))}
    </div>
  </div>
);

// ─── AI Insights ─────────────────────────────────────────────────────────
const AIPanel = ({ lang, insights }) => (
  <div className="card" style={{ padding: "16px 18px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ink-900)", color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" size={16} color="#D7AA45"/>
        </div>
        <div className="bilang">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Recommandations IA" : "AI recommendations"}</h3>
          <span className="sec">{lang === "fr" ? "AI insights" : "recommandations"}</span>
        </div>
      </div>
      <span className="tag" style={{ background: "var(--ink-900)", color: "var(--parchment-50)" }}>Claude Haiku · 4.5</span>
    </div>
    <div className="rule-lines" style={{ background: "var(--parchment-50)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {insights.map((ins) => (
          <div key={ins.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--paper)", border: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={ins.icon} size={14} color="var(--oxblood-700)"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-800)" }}>{lang === "fr" ? ins.fr : ins.en}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>confiance {ins.confidence}%</span>
                <span style={{ width: 60, height: 3, borderRadius: 2, background: "var(--ink-100)", overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${ins.confidence}%`, height: "100%", background: "var(--oxblood-700)" }}/>
                </span>
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", color: "var(--oxblood-700)" }}>
                  {ins.action}
                  <Icon name="arrowRight" size={11} color="var(--oxblood-700)"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 10, }}>
      {lang === "fr"
        ? "L'assistant cite ses sources. Vérifiez chaque recommandation avant action vétérinaire."
        : "The assistant cites its sources. Verify every recommendation before veterinary action."}
    </div>
  </div>
);

// ─── Alerts panel ────────────────────────────────────────────────────────
const AlertsPanel = ({ lang, alerts, onAll }) => (
  <div className="card" style={{ padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Alertes critiques" : "Critical alerts"}</h3>
        <span className="sec">{alerts.length}</span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onAll}>
        {lang === "fr" ? "Voir tout" : "View all"}
        <Icon name="arrowRight" size={11} color="var(--ink-600)"/>
      </button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {alerts.slice(0, 6).map((a, i, arr) => {
        const sevColor = a.severity === "critical" ? "var(--rust-700)" : a.severity === "high" ? "var(--wheat-500)" : "var(--sky-500)";
        return (
          <div key={a.id} style={{
            display: "grid", gridTemplateColumns: "8px 1fr auto", columnGap: 10, rowGap: 2,
            padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--border-1)" : "none",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: sevColor, marginTop: 6 }}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{a.title}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 2 }}>
                <span className="italic-serif" style={{ fontSize: 12 }}>{a.animal}</span>
                <span style={{ color: "var(--fg-3)" }}> · {a.subtitle}</span>
              </div>
            </div>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", whiteSpace: "nowrap", alignSelf: "center" }}>{a.date}</span>
          </div>
        );
      })}
      {alerts.length === 0 && (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
          {lang === "fr" ? "Aucune alerte active 🌱" : "No active alerts"}
        </div>
      )}
    </div>
  </div>
);

// ─── Upcoming actions panel ──────────────────────────────────────────────
const UpcomingPanel = ({ lang, vaccines, onAll }) => (
  <div className="card" style={{ padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "À venir cette semaine" : "Upcoming this week"}</h3>
        <span className="sec">{lang === "fr" ? "calendrier" : "schedule"}</span>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onAll}>
        <Icon name="calendar" size={12} color="var(--ink-600)"/>
        {lang === "fr" ? "Calendrier" : "Calendar"}
      </button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {vaccines.map((v) => {
        const sp = speciesById(v.species);
        const dot = v.status === "overdue" ? "var(--rust-700)" : v.status === "today" ? "var(--wheat-500)" : "var(--ink-300)";
        return (
          <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="syringe" size={15} color="currentColor"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{v.vaccine}</div>
              <div style={{ fontSize: 11, color: "var(--fg-2)" }}>
                <AnimalGlyph kind={sp.glyph} size={11} color="var(--fg-2)"/>
                <span style={{ marginLeft: 4 }}>{v.target}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: dot, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: dot }}/>
                {v.status === "overdue" ? (lang==="fr"?"retard":"overdue") : v.status === "today" ? (lang==="fr"?"aujourd'hui":"today") : v.due.split("-").slice(1).join("-")}
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{v.n.toLocaleString("fr-CA")} {lang==="fr"?"animaux":"animals"}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

Object.assign(window, { Dashboard });
