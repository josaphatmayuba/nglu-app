/* eslint-disable */
// FarmOS Pro — Bâtiments : visualisation de l'organisation spatiale de la ferme.

// ─── Helpers intérieur ───────────────────────────────────────────────────────
// Génère un tableau de boxes pour un couloir donné
const makeBoxes = (rowCount, colCount, statusDist) => {
  // statusDist = { ok, sick, quarantine, empty }  (nombres)
  const total = rowCount * colCount;
  const boxes = [];
  let sick = statusDist.sick || 0;
  let quarantine = statusDist.quarantine || 0;
  let empty = statusDist.empty || 0;
  for (let i = 0; i < total; i++) {
    let s = "ok";
    if (sick > 0) { s = "sick"; sick--; }
    else if (quarantine > 0) { s = "quarantine"; quarantine--; }
    else if (empty > 0) { s = "empty"; empty--; }
    boxes.push({ id: i, row: Math.floor(i / colCount), col: i % colCount, status: s });
  }
  return boxes;
};

// ─── Données de bâtiments (mockup statique) ─────────────────────────────────
const BUILDINGS_DATA = [
  {
    id: "B01", code: "B01",
    fr: "Étable vaches laitières", en: "Dairy cow barn",
    type: "barn",
    species: "cow",
    capacity: 280, occupied: 247, sick: 6, quarantine: 2,
    status: "ok",
    x: 80, y: 60, w: 260, h: 120,
    sections: [
      { id: "B01-L1", fr: "Loge L1 (vaches en lactation)", en: "Stall L1 (lactating)", capacity: 120, occupied: 118, icon: "droplet" },
      { id: "B01-L2", fr: "Loge L2 (vaches taries)", en: "Stall L2 (dry cows)", capacity: 80, occupied: 72, icon: "moon" },
      { id: "B01-M", fr: "Maternité", en: "Maternity", capacity: 40, occupied: 32, icon: "baby" },
      { id: "B01-Q", fr: "Quarantaine", en: "Quarantine", capacity: 40, occupied: 25, icon: "shield", alert: true },
    ],
    interior: {
      fr: "Plan intérieur — Étable", en: "Interior plan — Barn",
      orientation: "landscape",
      areas: [
        {
          id: "A-L1", fr: "Loge L1 · Lactation", en: "Stall L1 · Lactating",
          color: "#E8F5E8", stroke: "#7CB87A",
          x: 20, y: 30, w: 340, h: 110,
          rows: 3, cols: 8,
          boxes: makeBoxes(3, 8, { sick: 4, quarantine: 0, empty: 2 }),
          aisle: { x: 20, y: 145, w: 340, h: 18, fr: "Couloir L1", en: "Aisle L1" },
        },
        {
          id: "A-L2", fr: "Loge L2 · Taries", en: "Stall L2 · Dry cows",
          color: "#EEF3FB", stroke: "#8AACD4",
          x: 20, y: 175, w: 220, h: 90,
          rows: 2, cols: 8,
          boxes: makeBoxes(2, 8, { sick: 0, quarantine: 0, empty: 8 }),
          aisle: null,
        },
        {
          id: "A-M", fr: "Maternité", en: "Maternity",
          color: "#FFF5FA", stroke: "#D4A0C0",
          x: 250, y: 175, w: 110, h: 90,
          rows: 2, cols: 4,
          boxes: makeBoxes(2, 4, { sick: 2, quarantine: 0, empty: 6 }),
          aisle: null,
        },
        {
          id: "A-Q", fr: "Quarantaine", en: "Quarantine",
          color: "rgba(190,82,52,0.06)", stroke: "#D49878",
          x: 370, y: 30, w: 110, h: 235,
          rows: 5, cols: 2,
          boxes: makeBoxes(5, 2, { sick: 0, quarantine: 2, empty: 3 }),
          aisle: null,
          alert: true,
        },
      ],
      infra: [
        { fr: "Salle de traite",  en: "Milking parlour", x: 495, y: 30,  w: 100, h: 80,  color: "#F0EDE4", stroke: "#B0A878", icon: "droplet" },
        { fr: "Couloir principal", en: "Main aisle",     x: 20,  y: 270, w: 575, h: 22,  color: "#E8E4D8", stroke: "#C0B898", isAisle: true },
        { fr: "Stockage aliments", en: "Feed storage",   x: 495, y: 120, w: 100, h: 130, color: "#F5F0E4", stroke: "#C0B090", icon: "package" },
      ],
    },
    kpis: [
      { fr: "Lait / jour", en: "Milk / day", value: "5 412", unit: "L" },
      { fr: "T° moy.", en: "Avg. temp.", value: "38.6", unit: "°C" },
    ],
    alerts: [
      { severity: "warning", fr: "6 vaches avec baisse ingestion", en: "6 cows with low feed intake" },
    ],
  },
  {
    id: "B02", code: "B02",
    fr: "Porcherie Lot Engraissement", en: "Pig fattening unit",
    type: "piggery",
    species: "pig",
    capacity: 1200, occupied: 1098, sick: 18, quarantine: 12,
    status: "warning",
    x: 80, y: 220, w: 200, h: 100,
    sections: [
      { id: "B02-A", fr: "Salle A (sevrage)", en: "Room A (weaning)", capacity: 300, occupied: 298, icon: "baby" },
      { id: "B02-B", fr: "Salle B (croissance)", en: "Room B (growth)", capacity: 400, occupied: 390, icon: "arrowUp" },
      { id: "B02-C", fr: "Salle C (finition)", en: "Room C (finishing)", capacity: 500, occupied: 410, icon: "package" },
    ],
    kpis: [
      { fr: "GMQ moy.", en: "Avg. ADG", value: "856", unit: "g/j" },
      { fr: "Mortalité", en: "Mortality", value: "1.8", unit: "%" },
    ],
    alerts: [
      { severity: "critical", fr: "PRRS détecté Salle B", en: "PRRS detected Room B" },
      { severity: "warning", fr: "Mortalité +0.4 % cette sem.", en: "Mortality +0.4% this week" },
    ],
    interior: {
      fr: "Plan intérieur — Porcherie", en: "Interior plan — Pig unit",
      orientation: "landscape",
      areas: [
        {
          id: "P-A", fr: "Salle A · Sevrage", en: "Room A · Weaning",
          color: "#FDF0F0", stroke: "#D49090",
          x: 20, y: 20, w: 175, h: 110,
          rows: 5, cols: 6,
          boxes: makeBoxes(5, 6, { sick: 2, quarantine: 0, empty: 1 }),
          aisle: { x: 20, y: 135, w: 175, h: 16, fr: "Couloir A", en: "Aisle A" },
        },
        {
          id: "P-B", fr: "Salle B · Croissance", en: "Room B · Growth",
          color: "rgba(190,82,52,0.07)", stroke: "#C07060",
          x: 205, y: 20, w: 175, h: 110,
          rows: 4, cols: 8,
          boxes: makeBoxes(4, 8, { sick: 12, quarantine: 5, empty: 0 }),
          aisle: { x: 205, y: 135, w: 175, h: 16, fr: "Couloir B ⚠ PRRS", en: "Aisle B ⚠ PRRS" },
          alert: true,
        },
        {
          id: "P-C", fr: "Salle C · Finition", en: "Room C · Finishing",
          color: "#FBF5E8", stroke: "#C8A868",
          x: 390, y: 20, w: 205, h: 110,
          rows: 4, cols: 10,
          boxes: makeBoxes(4, 10, { sick: 4, quarantine: 0, empty: 30 }),
          aisle: { x: 390, y: 135, w: 205, h: 16, fr: "Couloir C", en: "Aisle C" },
        },
      ],
      infra: [
        { fr: "Couloir principal", en: "Main aisle", x: 20, y: 155, w: 575, h: 22, color: "#E8E4D8", stroke: "#C0B898", isAisle: true },
        { fr: "Quai chargement",  en: "Loading dock", x: 495, y: 20, w: 100, h: 80, color: "#EEF3FB", stroke: "#90A8C8", icon: "arrowRight" },
        { fr: "Stockage lisier",  en: "Slurry store", x: 495, y: 110, w: 100, h: 45, color: "#F0EDE4", stroke: "#B8B090", icon: "droplet" },
      ],
    },
  },
  {
    id: "B03", code: "B03",
    fr: "Poulailler Chair Lot 09", en: "Broiler house Batch 09",
    type: "poultry",
    species: "chicken",
    capacity: 5000, occupied: 4200, sick: 0, quarantine: 0,
    status: "ok",
    x: 380, y: 60, w: 180, h: 90,
    sections: [
      { id: "B03-1", fr: "Zone 1 (0-3 sem.)", en: "Zone 1 (0-3 wk)", capacity: 2500, occupied: 2200, icon: "baby" },
      { id: "B03-2", fr: "Zone 2 (3-6 sem.)", en: "Zone 2 (3-6 wk)", capacity: 2500, occupied: 2000, icon: "arrowUp" },
    ],
    kpis: [
      { fr: "Indice conv.", en: "FCR", value: "1.68", unit: "" },
      { fr: "Poids moy.", en: "Avg. weight", value: "2.4", unit: "kg" },
    ],
    alerts: [],
  },
  {
    id: "B04", code: "B04",
    fr: "Bâtiment Lapins", en: "Rabbit hutch",
    type: "rabbit",
    species: "rabbit",
    capacity: 800, occupied: 612, sick: 4, quarantine: 0,
    status: "ok",
    x: 380, y: 190, w: 140, h: 80,
    sections: [
      { id: "B04-R", fr: "Reproduction", en: "Breeding", capacity: 300, occupied: 280, icon: "fingerprint" },
      { id: "B04-E", fr: "Engraissement", en: "Fattening", capacity: 500, occupied: 332, icon: "package" },
    ],
    kpis: [
      { fr: "Portées / sem.", en: "Litters / week", value: "14", unit: "" },
      { fr: "Poids abattage", en: "Slaughter weight", value: "2.2", unit: "kg" },
    ],
    alerts: [],
  },
  {
    id: "B05", code: "B05",
    fr: "Hangar Stockage Aliments", en: "Feed storage barn",
    type: "storage",
    species: null,
    capacity: null, occupied: null, sick: 0, quarantine: 0,
    status: "warning",
    x: 580, y: 60, w: 160, h: 80,
    sections: [
      { id: "B05-S1", fr: "Silo maïs", en: "Corn silo", capacity: 100, occupied: 62, icon: "package" },
      { id: "B05-S2", fr: "Silo soja", en: "Soy silo", capacity: 80, occupied: 14, icon: "package", alert: true },
      { id: "B05-F", fr: "Fourrages (balles)", en: "Hay bales", capacity: 200, occupied: 160, icon: "layers" },
    ],
    kpis: [
      { fr: "Stock maïs", en: "Corn stock", value: "62", unit: "%" },
      { fr: "Stock soja", en: "Soy stock", value: "17", unit: "%", alert: true },
    ],
    alerts: [
      { severity: "warning", fr: "Stock soja < 20 % — commander", en: "Soy stock < 20% — reorder" },
    ],
  },
  {
    id: "B06", code: "B06",
    fr: "Infirmerie / Clinique", en: "Sick bay / Clinic",
    type: "clinic",
    species: null,
    capacity: 24, occupied: 14, sick: 14, quarantine: 0,
    status: "critical",
    x: 580, y: 190, w: 160, h: 70,
    sections: [
      { id: "B06-V", fr: "Soins vétérinaires", en: "Vet care", capacity: 12, occupied: 8, icon: "syringe" },
      { id: "B06-O", fr: "Observation", en: "Observation", capacity: 12, occupied: 6, icon: "pulse" },
    ],
    kpis: [
      { fr: "Animaux traités", en: "Animals treated", value: "14", unit: "" },
      { fr: "Durée moy. séjour", en: "Avg. stay", value: "4.2", unit: "j" },
    ],
    alerts: [
      { severity: "critical", fr: "2 animaux en soins intensifs", en: "2 animals in intensive care" },
    ],
  },
];

const BUILDING_TYPE_COLORS = {
  barn:     { bg: "var(--pertinence-100)", border: "var(--pertinence-300)", text: "var(--pertinence-900)", icon: "cow" },
  piggery:  { bg: "var(--oxblood-50)",    border: "var(--oxblood-200)",    text: "var(--oxblood-900)",    icon: "pig" },
  poultry:  { bg: "var(--autorite-50)",   border: "var(--autorite-200)",   text: "var(--autorite-900)",   icon: "bird" },
  rabbit:   { bg: "var(--clay-50)",       border: "var(--clay-200)",       text: "var(--clay-900)",       icon: "rabbit" },
  storage:  { bg: "var(--bone-100)",      border: "var(--border-2)",       text: "var(--ink-700)",        icon: "package" },
  clinic:   { bg: "rgba(190,82,52,0.06)", border: "var(--rust-200)",       text: "var(--rust-800)",       icon: "pulse" },
};

const STATUS_COLOR = {
  ok:       { dot: "var(--solidite-600)", label: { fr: "Normal", en: "Normal" } },
  warning:  { dot: "var(--autorite-600)", label: { fr: "Attention", en: "Warning" } },
  critical: { dot: "var(--rust-700)",     label: { fr: "Critique", en: "Critical" } },
};

// ─── Occupancy bar ───────────────────────────────────────────────────────────
const OccupancyBar = ({ capacity, occupied, sick = 0, compact = false }) => {
  if (!capacity) return null;
  const pct = Math.round((occupied / capacity) * 100);
  const sickPct = Math.round((sick / capacity) * 100);
  const h = compact ? 6 : 8;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
          <span>{occupied.toLocaleString("fr-CA")} / {capacity.toLocaleString("fr-CA")}</span>
          <span className="mono" style={{ fontWeight: 700, color: pct > 90 ? "var(--rust-700)" : "var(--ink-700)" }}>{pct} %</span>
        </div>
      )}
      <div style={{ background: "var(--border-1)", borderRadius: 999, height: h, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: pct > 90 ? "var(--rust-700)" : "var(--solidite-500)", borderRadius: 999, transition: "width 0.4s" }}/>
        {sick > 0 && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${sickPct}%`, background: "var(--oxblood-400)", borderRadius: 999, opacity: 0.55 }}/>}
      </div>
    </div>
  );
};

// ─── Map card (used in the floor plan grid) ──────────────────────────────────
const BuildingMapCard = ({ building, selected, onSelect, lang }) => {
  const tc = BUILDING_TYPE_COLORS[building.type] || BUILDING_TYPE_COLORS.storage;
  const sc = STATUS_COLOR[building.status];
  const alertCount = building.alerts.length;
  return (
    <button
      onClick={() => onSelect(building.id)}
      style={{
        background: selected ? "var(--paper)" : tc.bg,
        border: `2px solid ${selected ? "var(--forest-700)" : tc.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.15s, border-color 0.15s",
        boxShadow: selected ? "0 0 0 3px rgba(14,100,56,0.18)" : "none",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: tc.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={tc.icon} size={17} color={tc.text}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-950)", lineHeight: 1.2 }}>
            {lang === "fr" ? building.fr : building.en}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{building.code}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: sc.dot, display: "inline-block" }}/>
          {alertCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", background: building.status === "critical" ? "var(--rust-700)" : "var(--autorite-700)", color: "#fff", padding: "1px 5px", borderRadius: 999 }}>
              {alertCount}
            </span>
          )}
        </div>
      </div>

      {/* Occupancy */}
      {building.capacity && (
        <OccupancyBar capacity={building.capacity} occupied={building.occupied} sick={building.sick} compact/>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10 }}>
        {building.kpis.slice(0, 2).map((k, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
              {lang === "fr" ? k.fr : k.en}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.alert ? "var(--rust-700)" : "var(--ink-900)", fontFamily: "var(--font-display)" }}>
              {k.value} <span style={{ fontSize: 10, fontWeight: 500, color: "var(--fg-3)" }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert chips */}
      {building.alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {building.alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: a.severity === "critical" ? "var(--rust-800)" : "var(--autorite-800)", background: a.severity === "critical" ? "rgba(190,82,52,0.07)" : "rgba(180,140,40,0.08)", borderRadius: 5, padding: "4px 7px" }}>
              <Icon name={a.severity === "critical" ? "shield" : "bell"} size={10} color="currentColor"/>
              {lang === "fr" ? a.fr : a.en}
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

// ─── SVG floor plan ──────────────────────────────────────────────────────────
const FloorPlan = ({ buildings, selectedId, onSelect, lang }) => {
  const CANVAS_W = 800, CANVAS_H = 340;
  // Paths (roads, fences)
  return (
    <div style={{ background: "var(--bone-100)", borderRadius: 12, border: "1px solid var(--border-1)", overflow: "hidden", position: "relative" }}>
      <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Ground */}
        <rect width={CANVAS_W} height={CANVAS_H} fill="#F3F0E8"/>
        {/* Road horizontal */}
        <rect x={0} y={165} width={CANVAS_W} height={22} fill="#E0DBCD" rx={2}/>
        {/* Road vertical */}
        <rect x={330} y={0} width={22} height={CANVAS_H} fill="#E0DBCD" rx={2}/>
        {/* Road labels */}
        <text x={8} y={178} fontSize="9" fill="#B0A88C" fontFamily="var(--font-mono)" letterSpacing="1">ALLÉE PRINCIPALE</text>
        {/* Green pasture */}
        <rect x={0} y={300} width={CANVAS_W} height={40} fill="#D4E8D0" rx={4}/>
        <text x={16} y={324} fontSize="9" fill="#3A6840" fontFamily="var(--font-mono)" letterSpacing="1">PÂTURAGE</text>

        {/* Fence */}
        {[40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760].map(x => (
          <rect key={x} x={x} y={295} width={8} height={14} fill="#8FA08A" rx={1}/>
        ))}
        <line x1={0} y1={302} x2={CANVAS_W} y2={302} stroke="#8FA08A" strokeWidth={1.5} strokeDasharray="4,2"/>

        {/* Compass */}
        <g transform="translate(755, 28)">
          <circle cx={0} cy={0} r={16} fill="white" stroke="#D0CCBE" strokeWidth={1}/>
          <text x={0} y={-6} textAnchor="middle" fontSize="8" fill="#3A3020" fontWeight="700" fontFamily="var(--font-mono)">N</text>
          <line x1={0} y1={2} x2={0} y2={12} stroke="#B0A88C" strokeWidth={1}/>
          <polygon points="0,-12 -3.5,2 3.5,2" fill="#3A3020"/>
        </g>

        {/* Buildings */}
        {buildings.map((b) => {
          const tc = BUILDING_TYPE_COLORS[b.type] || BUILDING_TYPE_COLORS.storage;
          const sc = STATUS_COLOR[b.status];
          const isSelected = selectedId === b.id;
          // Fill colors based on type with slight transparency
          const fillMap = {
            barn:    "#E8F2E8", piggery: "#FBF0F0", poultry: "#FBF5E6",
            rabbit:  "#FBF2EC", storage: "#F5F3EE", clinic:  "#FCF0EE",
          };
          const strokeMap = {
            barn:    "#9CC09A", piggery: "#D49090", poultry: "#D4B870",
            rabbit:  "#C8A880", storage: "#C8C0B0", clinic:  "#D49880",
          };
          return (
            <g key={b.id} style={{ cursor: "pointer" }} onClick={() => onSelect(b.id)}>
              {/* Shadow */}
              <rect x={b.x + 3} y={b.y + 3} width={b.w} height={b.h} rx={6} fill="rgba(0,0,0,0.06)"/>
              {/* Main body */}
              <rect
                x={b.x} y={b.y} width={b.w} height={b.h} rx={6}
                fill={isSelected ? "white" : (fillMap[b.type] || "#F5F3EE")}
                stroke={isSelected ? "var(--forest-700)" : (strokeMap[b.type] || "#C8C0B0")}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {/* Roof line decoration */}
              <rect x={b.x} y={b.y} width={b.w} height={8} rx={6} fill={strokeMap[b.type] || "#C8C0B0"} opacity={0.4}/>
              {/* Status dot */}
              <circle cx={b.x + b.w - 12} cy={b.y + 12} r={5}
                fill={sc.dot}
                stroke="white" strokeWidth={1.5}/>
              {/* Alert badge */}
              {b.alerts.length > 0 && (
                <text x={b.x + b.w - 11.5} y={b.y + 15.5} textAnchor="middle" fontSize="6" fill="white" fontWeight="800" fontFamily="var(--font-mono)">
                  {b.alerts.length}
                </text>
              )}
              {/* Code label */}
              <text x={b.x + 10} y={b.y + 22} fontSize="10" fontWeight="800" fill={strokeMap[b.type] || "#8A8070"}
                fontFamily="var(--font-mono)" letterSpacing="0.05em">{b.code}</text>
              {/* Name */}
              <text x={b.x + 10} y={b.y + 37} fontSize="9.5" fill="#3A3020" fontFamily="sans-serif" fontWeight="600">
                {lang === "fr" ? b.fr.slice(0, 28) : b.en.slice(0, 28)}
              </text>
              {/* Sections */}
              {b.sections.map((s, si) => {
                const cols = Math.min(b.sections.length, 3);
                const sw = Math.floor((b.w - 20) / cols) - 4;
                const sx = b.x + 10 + (si % cols) * (sw + 4);
                const sy = b.y + 50 + Math.floor(si / cols) * 22;
                const occ = s.capacity ? Math.round((s.occupied / s.capacity) * 100) : 0;
                return (
                  <g key={s.id}>
                    <rect x={sx} y={sy} width={sw} height={16} rx={3}
                      fill={s.alert ? "rgba(190,82,52,0.12)" : "rgba(0,0,0,0.05)"}
                      stroke={s.alert ? "rgba(190,82,52,0.3)" : "rgba(0,0,0,0.08)"}
                      strokeWidth={0.8}/>
                    {/* Occupancy fill */}
                    <rect x={sx} y={sy} width={Math.max(3, (sw * occ) / 100)} height={16} rx={3}
                      fill={s.alert ? "rgba(190,82,52,0.18)" : "rgba(14,100,56,0.12)"}/>
                    <text x={sx + 4} y={sy + 11} fontSize="7.5" fill={s.alert ? "#9A3020" : "#3A3020"}
                      fontFamily="sans-serif" fontWeight="500">
                      {lang === "fr" ? s.fr.slice(0, 20) : s.en.slice(0, 20)}
                    </text>
                  </g>
                );
              })}
              {/* Occupancy mini bar (bottom) */}
              {b.capacity && (
                <>
                  <rect x={b.x + 10} y={b.y + b.h - 14} width={b.w - 20} height={5} rx={999} fill="rgba(0,0,0,0.08)"/>
                  <rect x={b.x + 10} y={b.y + b.h - 14}
                    width={Math.max(4, ((b.w - 20) * b.occupied) / b.capacity)} height={5} rx={999}
                    fill={b.status === "critical" ? "var(--rust-500)" : b.status === "warning" ? "var(--autorite-500)" : "var(--solidite-500)"}/>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend overlay */}
      <div style={{ position: "absolute", bottom: 8, right: 10, display: "flex", gap: 10, background: "rgba(255,255,255,0.88)", padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-1)", backdropFilter: "blur(4px)" }}>
        {Object.entries(STATUS_COLOR).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--ink-700)", fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: v.dot, display: "inline-block" }}/>
            {lang === "fr" ? v.label.fr : v.label.en}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Detail panel ────────────────────────────────────────────────────────────
const BuildingDetail = ({ building, lang, onClose }) => {
  if (!building) return (
    <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 280, color: "var(--fg-3)" }}>
      <Icon name="building" size={32} color="var(--ink-300)"/>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-400)" }}>
        {lang === "fr" ? "Sélectionnez un bâtiment" : "Select a building"}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
        {lang === "fr" ? "Cliquez sur le plan ou sur une carte" : "Click the map or a card"}
      </div>
    </div>
  );

  const tc = BUILDING_TYPE_COLORS[building.type] || BUILDING_TYPE_COLORS.storage;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={tc.icon} size={20} color={tc.text}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--ink-950)", lineHeight: 1.2 }}>
            {lang === "fr" ? building.fr : building.en}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
            {building.code}
            {building.capacity && ` · Capacité ${building.capacity.toLocaleString("fr-CA")}`}
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ padding: "4px 8px", flexShrink: 0 }}>
          <Icon name="x" size={13} color="var(--ink-600)"/>
        </button>
      </div>

      {/* Alerts */}
      {building.alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {building.alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: a.severity === "critical" ? "rgba(190,82,52,0.07)" : "rgba(180,140,40,0.07)", border: `1px solid ${a.severity === "critical" ? "var(--rust-200)" : "var(--autorite-200)"}` }}>
              <Icon name={a.severity === "critical" ? "shield" : "bell"} size={14} color={a.severity === "critical" ? "var(--rust-700)" : "var(--autorite-700)"}/>
              <span style={{ fontSize: 12, fontWeight: 600, color: a.severity === "critical" ? "var(--rust-800)" : "var(--autorite-800)" }}>
                {lang === "fr" ? a.fr : a.en}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Occupancy */}
      {building.capacity && (
        <div>
          <div className="overline" style={{ marginBottom: 8 }}>{lang === "fr" ? "Occupation globale" : "Overall occupancy"}</div>
          <OccupancyBar capacity={building.capacity} occupied={building.occupied} sick={building.sick}/>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--solidite-500)", display: "inline-block" }}/>
              {lang === "fr" ? `${building.occupied} présents` : `${building.occupied} present`}
            </span>
            {building.sick > 0 && (
              <span style={{ fontSize: 11, color: "var(--rust-700)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--oxblood-400)", display: "inline-block" }}/>
                {lang === "fr" ? `${building.sick} malades` : `${building.sick} sick`}
              </span>
            )}
            {building.quarantine > 0 && (
              <span style={{ fontSize: 11, color: "var(--autorite-700)", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="shield" size={10} color="currentColor"/>
                {lang === "fr" ? `${building.quarantine} quarantaine` : `${building.quarantine} quarantine`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 10 }}>
        {building.kpis.map((k, i) => (
          <div key={i} className="card" style={{ padding: "10px 14px", background: "var(--bg-sunken)" }}>
            <div style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>
              {lang === "fr" ? k.fr : k.en}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: k.alert ? "var(--rust-700)" : "var(--ink-950)", marginTop: 4 }}>
              {k.value} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-3)" }}>{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div>
        <div className="overline" style={{ marginBottom: 10 }}>
          {lang === "fr" ? "Sections / Salles" : "Sections / Rooms"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {building.sections.map((s) => (
            <div key={s.id} style={{ background: s.alert ? "rgba(190,82,52,0.04)" : "var(--bg-sunken)", border: `1px solid ${s.alert ? "var(--rust-200)" : "var(--border-1)"}`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: s.capacity ? 8 : 0 }}>
                <Icon name={s.icon || "package"} size={14} color={s.alert ? "var(--rust-700)" : "var(--ink-600)"}/>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)", flex: 1 }}>
                  {lang === "fr" ? s.fr : s.en}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{s.id}</span>
                {s.alert && <Icon name="bell" size={12} color="var(--rust-700)"/>}
              </div>
              {s.capacity && (
                <OccupancyBar capacity={s.capacity} occupied={s.occupied}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button className="btn btn-sm" style={{ flex: 1 }}>
          <Icon name="layers" size={13} color="var(--ink-700)"/>
          {lang === "fr" ? "Voir animaux" : "View animals"}
        </button>
        <button className="btn btn-sm" style={{ flex: 1 }}>
          <Icon name="pulse" size={13} color="var(--ink-700)"/>
          {lang === "fr" ? "Santé section" : "Section health"}
        </button>
        <button className="btn btn-sm btn-primary" style={{ flex: 1 }}>
          <Icon name="plus" size={13} color="#ECF1EC"/>
          {lang === "fr" ? "Saisie" : "Entry"}
        </button>
      </div>
    </div>
  );
};

// ─── Main BuildingsScreen ────────────────────────────────────────────────────
const BuildingsScreen = ({ lang }) => {
  const [selectedId, setSelectedId] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("plan"); // "plan" | "cards"
  const [filterStatus, setFilterStatus] = React.useState(null);

  const selectedBuilding = BUILDINGS_DATA.find(b => b.id === selectedId) || null;
  const filtered = filterStatus ? BUILDINGS_DATA.filter(b => b.status === filterStatus) : BUILDINGS_DATA;

  const totalAnimals = BUILDINGS_DATA.filter(b => b.capacity && b.species).reduce((s, b) => s + b.occupied, 0);
  const criticalCount = BUILDINGS_DATA.filter(b => b.status === "critical").length;
  const warningCount = BUILDINGS_DATA.filter(b => b.status === "warning").length;
  const totalAlerts = BUILDINGS_DATA.reduce((s, b) => s + b.alerts.length, 0);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>
            {lang === "fr" ? "Ferme Bellevue · Bâtiments" : "Bellevue Farm · Buildings"}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
            {lang === "fr"
              ? <>Organisation des <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>bâtiments</span></>
              : <>Building <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>layout</span></>}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[
              { id: "plan", icon: "grid",   fr: "Plan",   en: "Map" },
              { id: "cards", icon: "layers", fr: "Cartes", en: "Cards" },
            ].map((v) => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={viewMode === v.id ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"}
                style={{ gap: 5, padding: "5px 12px" }}>
                <Icon name={v.icon} size={13} color={viewMode === v.id ? "#ECF1EC" : "var(--ink-700)"}/>
                {lang === "fr" ? v.fr : v.en}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-primary">
            <Icon name="plus" size={13} color="#ECF1EC"/>
            {lang === "fr" ? "Nouveau bâtiment" : "New building"}
          </button>
        </div>
      </div>

      {/* KPI summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: { fr: "Bâtiments", en: "Buildings" }, value: BUILDINGS_DATA.length, icon: "building", accent: "var(--forest-700)" },
          { label: { fr: "Animaux logés", en: "Animals housed" }, value: totalAnimals.toLocaleString("fr-CA"), icon: "layers", accent: "var(--pertinence-700)" },
          { label: { fr: "En alerte", en: "With alerts" }, value: totalAlerts, icon: "bell", accent: totalAlerts > 0 ? "var(--rust-700)" : "var(--solidite-600)" },
          { label: { fr: "Bâtiments critiques", en: "Critical buildings" }, value: criticalCount, icon: "shield", accent: criticalCount > 0 ? "var(--rust-700)" : "var(--solidite-600)" },
        ].map((k, i) => (
          <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in oklch, ${k.accent} 10%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={k.icon} size={17} color={k.accent}/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>{lang === "fr" ? k.label.fr : k.label.en}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--ink-950)", lineHeight: 1.1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 600, marginRight: 2 }}>
          {lang === "fr" ? "Filtrer :" : "Filter:"}
        </span>
        {[null, "ok", "warning", "critical"].map((s) => {
          const active = filterStatus === s;
          const label = s ? (lang === "fr" ? STATUS_COLOR[s].label.fr : STATUS_COLOR[s].label.en) : (lang === "fr" ? "Tous" : "All");
          return (
            <button key={String(s)} onClick={() => setFilterStatus(s)}
              className="btn btn-sm"
              style={{ background: active ? "var(--forest-700)" : "var(--paper)", color: active ? "#ECF1EC" : "var(--ink-700)", border: `1px solid ${active ? "transparent" : "var(--border-2)"}` }}>
              {s && <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? "#ECF1EC" : STATUS_COLOR[s].dot, display: "inline-block" }}/>}
              {label}
            </button>
          );
        })}
      </div>

      {/* Main content: plan or cards */}
      {viewMode === "plan" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
            <FloorPlan buildings={filtered} selectedId={selectedId} onSelect={(id) => setSelectedId(id === selectedId ? null : id)} lang={lang}/>
            {/* Card grid below map */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {filtered.map((b) => (
                <BuildingMapCard key={b.id} building={b} selected={selectedId === b.id} onSelect={(id) => setSelectedId(id === selectedId ? null : id)} lang={lang}/>
              ))}
            </div>
          </div>
          {/* Detail panel */}
          <div style={{ overflow: "auto" }}>
            <BuildingDetail building={selectedBuilding} lang={lang} onClose={() => setSelectedId(null)}/>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((b) => (
            <BuildingMapCard key={b.id} building={b} selected={selectedId === b.id} onSelect={(id) => setSelectedId(id === selectedId ? null : id)} lang={lang}/>
          ))}
        </div>
      )}
    </div>
  );
};
