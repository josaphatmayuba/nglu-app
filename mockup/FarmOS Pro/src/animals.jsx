/* eslint-disable */
// Animals — list (table) + detail drawer with species-ADAPTIVE form.
// This is the centerpiece of the adaptation system: every species has different fields.

const FIELD_DEFS = {
  // generic
  tag:       { fr: "ID / Numéro",       en: "ID / Tag",          icon: "qr",     type: "text"   },
  qr:        { fr: "QR code",           en: "QR code",           icon: "qr",     type: "qr"     },
  race:      { fr: "Race",              en: "Breed",             icon: "book",   type: "select" },
  sex:       { fr: "Sexe",              en: "Sex",               icon: "user",   type: "select", options: ["F", "M", "Mixte"] },
  dob:       { fr: "Date de naissance", en: "Date of birth",     icon: "calendar", type: "date" },
  weight:    { fr: "Poids",             en: "Weight",            icon: "weight", type: "number", unit: "kg" },
  color:     { fr: "Couleur",           en: "Color",             icon: "edit",   type: "text"   },
  status:    { fr: "Statut",            en: "Status",            icon: "pulse",  type: "select" },
  lot:       { fr: "Lot",               en: "Batch",             icon: "layers", type: "text"   },
  // Cow-specific
  "ear-loop":   { fr: "Boucle officielle",   en: "Official ear tag",   icon: "pin", type: "text", mono: true, group: "id" },
  lactation:    { fr: "N° lactation",        en: "Lactation #",        icon: "droplet", type: "number", group: "prod" },
  rumination:   { fr: "Rumination · min/j",  en: "Rumination · min/d", icon: "activity", type: "number", group: "health" },
  temp:         { fr: "Température °C",      en: "Temperature °C",     icon: "thermometer", type: "number", group: "health" },
  "ai-history": { fr: "Historique IA",       en: "AI history",         icon: "fingerprint", type: "list", group: "repro" },
  barn:         { fr: "Bâtiment",            en: "Barn",               icon: "barn", type: "text", group: "housing" },
  // Pig-specific
  type:         { fr: "Type",                en: "Type",               icon: "user", type: "select", options: ["Verrat", "Truie", "Cochette", "Porcelet", "Sevré", "Engraissement"], group: "id" },
  room:         { fr: "Salle",               en: "Room",               icon: "barn", type: "text", group: "housing" },
  fcr:          { fr: "Conv. alim. (FCR)",   en: "Feed conv. ratio",   icon: "wheat", type: "number", group: "prod" },
  "weaning-w":  { fr: "Poids sevrage",       en: "Weaning weight",     icon: "weight", type: "number", unit: "kg", group: "prod" },
  "litter-id":  { fr: "ID portée",           en: "Litter ID",          icon: "layers", type: "text", mono: true, group: "repro" },
  // Chicken / duck / turkey (poultry)
  "batch-id":   { fr: "ID lot",              en: "Batch ID",           icon: "qr", type: "text", mono: true, group: "id" },
  count:        { fr: "Nombre d'oiseaux",    en: "Bird count",         icon: "layers", type: "number", group: "id" },
  age:          { fr: "Âge (jours)",         en: "Age (days)",         icon: "calendar", type: "number", group: "id" },
  "weight-avg": { fr: "Poids moyen",         en: "Average weight",     icon: "weight", type: "number", unit: "kg", group: "prod" },
  house:        { fr: "Bâtiment",            en: "House",              icon: "barn", type: "text", group: "housing" },
  humidity:     { fr: "Humidité %",          en: "Humidity %",         icon: "drop2", type: "number", group: "env" },
  "lay-rate":   { fr: "Taux de ponte %",     en: "Lay rate %",         icon: "egg", type: "number", group: "prod" },
  // Fish
  "pond-id":    { fr: "ID bassin",           en: "Pond ID",            icon: "qr", type: "text", mono: true, group: "id" },
  species:      { fr: "Espèce",              en: "Species",            icon: "fish", type: "select", group: "id" },
  density:      { fr: "Densité · kg/m³",     en: "Density · kg/m³",    icon: "layers", type: "number", group: "env" },
  oxygen:       { fr: "Oxygène · mg/L",      en: "Oxygen · mg/L",      icon: "drop2", type: "number", group: "env" },
  ph:           { fr: "pH",                  en: "pH",                 icon: "flask", type: "number", group: "env" },
  "temp-water": { fr: "Temp. eau · °C",      en: "Water temp · °C",    icon: "thermometer", type: "number", group: "env" },
  biomass:      { fr: "Biomasse · kg",       en: "Biomass · kg",       icon: "weight", type: "number", group: "prod" },
  // Sheep / Goat / Rabbit
  pasture:      { fr: "Pâturage",            en: "Pasture",            icon: "leaf", type: "text", group: "housing" },
  "wool-quality": { fr: "Qualité laine",     en: "Wool quality",       icon: "star", type: "select", options: ["A", "B", "C"], group: "prod" },
  cage:         { fr: "Cage",                en: "Cage",               icon: "grid", type: "text", group: "housing" },
  pond:         { fr: "Bassin",              en: "Pond",               icon: "drop2", type: "text", group: "housing" },
};

const Animals = ({ lang, speciesFilter, onSpeciesFilter, density }) => {
  const [selectedId, setSelectedId] = React.useState("BQ-2024-0119");
  const [layout, setLayout] = React.useState("split"); // split | full
  const filtered = ANIMALS.filter(a => !speciesFilter || a.species === speciesFilter);
  const selected = ANIMALS.find(a => a.id === selectedId) || filtered[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected && layout === "split" ? "var(--cols-main-detail)" : "1fr", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
        {/* Header */}
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Cheptel · Herd" : "Herd · Cheptel"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
            {lang === "fr" ? <>Animaux, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length.toLocaleString("fr-CA")} fiches</span></> : <>Animals, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length.toLocaleString("en-CA")} records</span></>}
          </h1>
        </div>

        {/* Filter bar */}
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

        {/* Search + toolbar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "0 10px", height: 34 }}>
            <Icon name="search" size={14} color="var(--ink-500)"/>
            <input placeholder={lang === "fr" ? "Rechercher par nom, ID, lot, race…" : "Search by name, ID, batch, breed…"} style={{ border: 0, background: "transparent", flex: 1, outline: "none", fontSize: 13 }}/>
          </div>
          <button className="btn btn-sm"><Icon name="filter" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Filtres" : "Filters"}</button>
          <button className="btn btn-sm"><Icon name="download" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Exporter" : "Export"}</button>
          <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "animal" }))}><Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Nouvel animal" : "New animal"}</button>
        </div>

        {/* Table */}
        <AnimalTable lang={lang} animals={filtered} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} density={density}/>

        {/* Note about adaptation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--fg-3)", }}>
          <Icon name="sparkle" size={12} color="var(--oxblood-700)"/>
          <span>
            {lang === "fr"
              ? `Le formulaire et les champs s'adaptent automatiquement selon l'espèce (${speciesFilter ? speciesById(speciesFilter).fr : "toutes espèces affichées"}).`
              : `The form and fields adapt automatically by species (${speciesFilter ? speciesById(speciesFilter).en : "all species shown"}).`}
          </span>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && layout === "split" && (
        <AnimalDetail lang={lang} animal={selected} onClose={() => setLayout("full")}/>
      )}
    </div>
  );
};

// ─── Animal table ────────────────────────────────────────────────────────
const AnimalTable = ({ lang, animals, selectedId, onSelect, density }) => {
  const rowH = density === "compact" ? 38 : 50;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 10, overflow: "auto", boxShadow: "var(--shadow-1)" }}>
      <div style={{ minWidth: 880 }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "32px 1fr 130px 80px 100px 130px 120px 80px",
        padding: "10px 14px", borderBottom: "1px solid var(--border-1)",
        background: "var(--bg-sunken)", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-2)",
      }}>
        <span/>
        <span>{lang === "fr" ? "Animal" : "Animal"}</span>
        <span>{lang === "fr" ? "Race" : "Breed"}</span>
        <span style={{ textAlign: "right" }}>{lang === "fr" ? "Poids" : "Weight"}</span>
        <span>{lang === "fr" ? "Statut" : "Status"}</span>
        <span>{lang === "fr" ? "Localisation" : "Location"}</span>
        <span>{lang === "fr" ? "Dernier évent." : "Last event"}</span>
        <span style={{ textAlign: "right" }}>{lang === "fr" ? "Prod." : "Prod."}</span>
      </div>
      {animals.map((a) => {
        const sp = speciesById(a.species);
        const sel = selectedId === a.id;
        const statusColor = a.status === "healthy" ? "var(--solidite-500)" : a.status === "treatment" ? "var(--autorite-500)" : a.status === "alert" ? "var(--oxblood-700)" : "var(--ink-400)";
        const statusLbl = { healthy: lang==="fr"?"Sain":"Healthy", treatment: lang==="fr"?"Traitement":"Treatment", alert: lang==="fr"?"Alerte":"Alert" }[a.status] || a.status;
        return (
          <div key={a.id} onClick={() => onSelect(a.id)} style={{
            display: "grid", gridTemplateColumns: "32px 1fr 130px 80px 100px 130px 120px 80px",
            padding: `${(rowH-28)/2}px 14px`, alignItems: "center",
            borderBottom: "1px solid var(--border-1)",
            background: sel ? "var(--bg-sunken)" : a.withdrawal ? "rgba(122, 31, 43, 0.03)" : "var(--paper)",
            cursor: "pointer", transition: "background 80ms",
            position: "relative",
          }}>
            {sel && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--oxblood-700)" }}/>}
            <div style={{ width: 24, height: 24, borderRadius: 6, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AnimalGlyph kind={sp.glyph} size={15} color="currentColor"/>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="italic-serif" style={{ fontSize: 14.5, color: "var(--ink-950)" }}>{a.name}</span>
                {a.withdrawal && <span className="tag tag-danger" style={{ fontSize: 9.5, padding: "1px 6px" }}>
                  <Icon name="shield" size={9} color="var(--oxblood-700)"/>
                  {lang === "fr" ? "Retrait" : "Withdrawal"}
                </span>}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 1 }}>{a.id}</div>
            </div>
            <span style={{ fontSize: 12.5, color: "var(--ink-700)" }}>{a.race}</span>
            <span className="mono tnum" style={{ fontSize: 12.5, color: "var(--ink-800)", textAlign: "right" }}>
              {a.weight}<span style={{ color: "var(--fg-3)", marginLeft: 2 }}>{typeof a.weight === "number" && a.weight > 50 ? "kg" : a.species === "fish" ? "g" : "kg"}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor }}/>
              <span style={{ color: "var(--ink-700)" }}>{statusLbl}</span>
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-700)" }}>{a.lot}</span>
            <span style={{ fontSize: 11.5, color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.lastEvent}</span>
            <span className="mono tnum" style={{ fontSize: 12, color: a.milk ? "var(--pertinence-700)" : "var(--fg-3)", textAlign: "right" }}>
              {a.milk ? `${a.milk} L` : "—"}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
};

// ─── Animal detail drawer (species-adaptive) ─────────────────────────────
const AnimalDetail = ({ lang, animal, onClose }) => {
  const sp = speciesById(animal.species);
  const groups = groupFields(sp.fields);
  const groupTitles = {
    id:       { fr: "Identification",       en: "Identification" },
    health:   { fr: "Santé",                 en: "Health" },
    prod:     { fr: "Production",            en: "Production" },
    repro:    { fr: "Reproduction",          en: "Reproduction" },
    housing:  { fr: "Localisation",          en: "Location" },
    env:      { fr: "Environnement",         en: "Environment" },
    other:    { fr: "Autres",                en: "Other" },
  };

  return (
    <aside style={{ background: "var(--bg-sunken)", borderLeft: "1px solid var(--border-1)", overflow: "auto", display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <div style={{ background: "var(--paper)", borderBottom: "1px solid var(--border-1)", padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="tag" style={{ background: sp.accentBg, color: sp.accent }}>
              <AnimalGlyph kind={sp.glyph} size={11} color="currentColor"/>
              {lang === "fr" ? sp.frSing : sp.enSing}
            </span>
            <span className="tag">{animal.lot}</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-sm btn-ghost"><Icon name="edit" size={13} color="var(--ink-700)"/></button>
            <button className="btn btn-sm btn-ghost"><Icon name="moreH" size={13} color="var(--ink-700)"/></button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12, background: sp.accentBg, color: sp.accent,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid var(--border-1)",
          }}>
            <AnimalGlyph kind={sp.glyph} size={40} color="currentColor"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26,  color: "var(--ink-950)", letterSpacing: "-0.015em", margin: 0 }}>{animal.name}</h2>
            <div className="mono" style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>{animal.id} · {animal.race}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <FarmScore sante={84} prod={92} finance={78} size="sm"/>
            </div>
          </div>
        </div>

        {/* Withdrawal warning right at the top */}
        {animal.withdrawal && <WithdrawalChip lang={lang} w={animal.withdrawal}/>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid var(--border-1)", marginLeft: -22, marginRight: -22, paddingLeft: 22, paddingRight: 22 }}>
          {[
            { id: "details",  fr: "Détails",       en: "Details" },
            { id: "health",   fr: "Santé",         en: "Health" },
            { id: "repro",    fr: "Reproduction",  en: "Reproduction" },
            { id: "prod",     fr: "Production",    en: "Production" },
            { id: "history",  fr: "Historique",    en: "History" },
          ].map((t, i) => (
            <button key={t.id} style={{
              padding: "10px 14px", border: 0, background: "transparent", fontSize: 12.5, fontWeight: 500,
              color: i === 0 ? "var(--ink-950)" : "var(--ink-500)",
              borderBottom: i === 0 ? "2px solid var(--oxblood-700)" : "2px solid transparent",
              cursor: "pointer", marginBottom: -1,
            }}>
              {lang === "fr" ? t.fr : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {Object.entries(groups).map(([gkey, fkeys]) => (
          <div key={gkey}>
            <div className="overline" style={{ marginBottom: 10 }}>
              {groupTitles[gkey] ? (lang === "fr" ? groupTitles[gkey].fr : groupTitles[gkey].en) : gkey}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 12 }}>
              {fkeys.map((fkey) => {
                const def = FIELD_DEFS[fkey];
                if (!def) return null;
                const val = sampleValue(fkey, animal);
                return (
                  <div key={fkey} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Icon name={def.icon} size={12} color="var(--fg-3)"/>
                      <span style={{ fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                        {lang === "fr" ? def.fr : def.en}
                      </span>
                    </div>
                    <div className={def.mono ? "mono" : ""} style={{ fontSize: 14, fontWeight: def.mono ? 500 : 600, color: "var(--ink-900)" }}>
                      {val}{def.unit && <span style={{ color: "var(--fg-3)", fontSize: 11.5, marginLeft: 3, fontWeight: 400 }}>{def.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Adaptive callout */}
        <div className="dot-grid" style={{ background: "var(--paper)", border: "1px dashed var(--border-2)", borderRadius: 8, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="sparkle" size={13} color="var(--oxblood-700)"/>
            <span className="overline" style={{ color: "var(--oxblood-800)" }}>{lang === "fr" ? "Champs adaptés à l'espèce" : "Species-adapted fields"}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-700)", lineHeight: 1.5 }}>
            {lang === "fr"
              ? `Cette fiche affiche les ${sp.fields.length} champs propres aux ${sp.fr.toLowerCase()}. Pour un porc, on verrait FCR, salle, ID portée ; pour un poisson, oxygène, pH, densité.`
              : `This sheet shows the ${sp.fields.length} fields specific to ${sp.en.toLowerCase()}. For a pig, you'd see FCR, room, litter ID; for a fish, oxygen, pH, density.`}
          </div>
        </div>
      </div>
    </aside>
  );
};

function groupFields(fields) {
  const groups = { id: [], housing: [], prod: [], health: [], repro: [], env: [], other: [] };
  fields.forEach((f) => {
    const g = FIELD_DEFS[f]?.group || (["tag", "ear-loop", "race", "sex", "dob", "color", "type", "batch-id", "count", "age", "pond-id", "species"].includes(f) ? "id" : ["weight", "weight-avg", "lay-rate", "fcr", "weaning-w", "biomass", "wool-quality"].includes(f) ? "prod" : ["barn", "lot", "room", "house", "pasture", "cage", "pond"].includes(f) ? "housing" : ["lactation", "rumination", "temp"].includes(f) ? "health" : ["ai-history", "litter-id"].includes(f) ? "repro" : ["density", "oxygen", "ph", "temp-water", "humidity"].includes(f) ? "env" : "other");
    if (groups[g]) groups[g].push(f);
    else groups.other.push(f);
  });
  return Object.fromEntries(Object.entries(groups).filter(([_, v]) => v.length > 0));
}

function sampleValue(fkey, a) {
  switch (fkey) {
    case "tag": case "ear-loop": case "batch-id": case "pond-id": return a.id;
    case "race": case "species": return a.race;
    case "sex": return a.sex;
    case "dob": return a.dob;
    case "weight": case "weight-avg": return a.weight;
    case "color": return "Pie noir";
    case "lot": return a.lot;
    case "barn": case "house": case "room": case "pasture": case "cage": case "pond": return a.barn || a.lot;
    case "lactation": return a.repro ? "4ᵉ" : "—";
    case "rumination": return 487;
    case "temp": return "38,6";
    case "ai-history": return "3 IA · ✓ ✓ ✗";
    case "type": return "Truie · 4ᵉ portée";
    case "fcr": return "2,38";
    case "weaning-w": return 6.8;
    case "litter-id": return "L-2026-A03";
    case "count": return 4200;
    case "age": return "84 j";
    case "lay-rate": return "92 %";
    case "humidity": return "62 %";
    case "density": return "32";
    case "oxygen": return "6,1";
    case "ph": return "7,4";
    case "temp-water": return "14,8";
    case "biomass": return "1 240";
    case "wool-quality": return "A";
    default: return "—";
  }
}

const WithdrawalChip = ({ lang, w }) => (
  <div className="withdrawal-banner pulse-critical" style={{ marginTop: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
    <Icon name="shield" size={16} color="#ECF1EC"/>
    <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#ECF1EC" }}>
        {lang === "fr" ? "Délai de retrait — " : "Withdrawal period — "}
        <span style={{ fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--clay-700)" }}>{w.med}</span>
      </div>
      <div style={{ fontSize: 11, color: "#F0D6CB", marginTop: 1 }}>
        {lang === "fr"
          ? `${w.kind === "milk" ? "Lait" : w.kind === "meat" ? "Viande" : "Œufs"} bloqué jusqu'au `
          : `${w.kind === "milk" ? "Milk" : w.kind === "meat" ? "Meat" : "Eggs"} blocked until `}
        <span className="mono">{w.until}</span>
      </div>
    </div>
  </div>
);

Object.assign(window, { Animals });
