/* eslint-disable */
// Animals — list (table) + detail drawer with species-ADAPTIVE form.
// This is the centerpiece of the adaptation system: every species has different fields.

import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { speciesById, t } from "./data";
import { SpeciesPillBar, FarmScore } from "./shell";
import { api, adaptAnimal } from "./api";
import QRCode from "qrcode";

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

function useIsMobile(breakpoint = 768) {
  const get = () => typeof window !== "undefined" && window.innerWidth < breakpoint;
  const [m, setM] = React.useState(get);
  React.useEffect(() => {
    const onR = () => setM(get());
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return m;
}

const Animals = ({ lang, speciesFilter, onSpeciesFilter, density }) => {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = React.useState(null);
  const [layout, setLayout] = React.useState("split"); // split | full
  const [animals, setAnimals] = React.useState([]);
  const [loadState, setLoadState] = React.useState("idle"); // idle | loading | ok | error

  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    api.listAnimals()
      .then((rows) => {
        if (cancelled) return;
        const mapped = (Array.isArray(rows) ? rows : []).map(adaptAnimal);
        setAnimals(mapped);
        setLoadState("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("listAnimals failed:", err.message);
        setAnimals([]);
        setLoadState("error");
      });
    return () => { cancelled = true; };
  }, [reloadKey]);
  // Récupère une éventuelle sélection en attente (posée par l'écran
  // Identification → "Voir fiche"). On essaie après chaque chargement
  // d'animaux pour matcher l'external_id quand la liste est prête.
  React.useEffect(() => {
    const pending = (typeof window !== "undefined" && window.__farmosSelectAnimal) || null;
    if (!pending || animals.length === 0) return;
    const match = animals.find((a) => a.id === pending || a._pk === pending);
    if (match) {
      setSelectedId(match.id);
      try { delete window.__farmosSelectAnimal; } catch {}
    }
  }, [animals]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:animal-created", onCreated);
    return () => window.removeEventListener("farmos:animal-created", onCreated);
  }, []);

  const filtered = animals.filter(a => !speciesFilter || a.species === speciesFilter);
  // Desktop: auto-select first animal for split view.
  // Mobile: only show detail after explicit row click — single scroll on the list.
  const selected = isMobile
    ? (selectedId ? animals.find(a => a.id === selectedId) : null)
    : (animals.find(a => a.id === selectedId) || filtered[0]);

  // Mobile + selected: render detail full-screen with a back button (single scroll).
  if (isMobile && selected) {
    return (
      <div style={{ height: "100%", overflow: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-1)", background: "var(--paper)", flexShrink: 0 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedId(null)}>
            <Icon name="chevLeft" size={13} color="var(--ink-700)"/>
            {lang === "fr" ? "Retour à la liste" : "Back to list"}
          </button>
        </div>
        <AnimalDetail lang={lang} animal={selected} onClose={() => setSelectedId(null)} embedded/>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected && layout === "split" && !isMobile ? "var(--cols-main-detail)" : "1fr", height: "100%", overflow: "hidden" }}>
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
        <div className="toolbar-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", rowGap: 8 }}>
          <div style={{ flex: "1 1 200px", minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "0 10px", height: 34 }}>
            <Icon name="search" size={14} color="var(--ink-500)"/>
            <input placeholder={lang === "fr" ? "Rechercher par nom, ID, lot, race…" : "Search by name, ID, batch, breed…"} style={{ border: 0, background: "transparent", flex: 1, minWidth: 0, outline: "none", fontSize: 13 }}/>
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

      {/* Detail drawer (desktop split only) */}
      {selected && layout === "split" && !isMobile && (
        <AnimalDetail lang={lang} animal={selected} onClose={() => setLayout("full")}/>
      )}
    </div>
  );
};

// ─── Animal table ────────────────────────────────────────────────────────
const AnimalTable = ({ lang, animals, selectedId, onSelect, density }) => {
  const isMobile = useIsMobile();
  const rowH = density === "compact" ? 38 : 50;

  // Mobile: stacked cards, no inner scroll, the page scrolls naturally.
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {animals.map((a) => {
          const sp = speciesById(a.species);
          const sel = selectedId === a.id;
          const statusColor = a.status === "healthy" ? "var(--solidite-500)" : a.status === "treatment" ? "var(--autorite-500)" : a.status === "alert" ? "var(--oxblood-700)" : "var(--ink-400)";
          const statusLbl = { healthy: lang === "fr" ? "Sain" : "Healthy", treatment: lang === "fr" ? "Traitement" : "Treatment", alert: lang === "fr" ? "Alerte" : "Alert" }[a.status] || a.status;
          return (
            <div key={a.id} onClick={() => onSelect(a.id)} style={{
              background: a.withdrawal ? "rgba(122, 31, 43, 0.04)" : "var(--paper)",
              border: `1px solid ${sel ? "var(--oxblood-700)" : "var(--border-1)"}`,
              borderRadius: 10, padding: "10px 12px", cursor: "pointer",
              display: "flex", gap: 10, alignItems: "center", boxShadow: "var(--shadow-1)",
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AnimalGlyph kind={sp.glyph} size={18} color="currentColor"/>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span className="italic-serif" style={{ fontSize: 14.5, color: "var(--ink-950)" }}>{a.name}</span>
                  {a.withdrawal && (
                    <span className="tag tag-danger" style={{ fontSize: 9.5, padding: "1px 6px" }}>
                      <Icon name="shield" size={9} color="var(--oxblood-700)"/>
                      {lang === "fr" ? "Retrait" : "Withdrawal"}
                    </span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.id}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4, fontSize: 11.5, color: "var(--fg-2)", flexWrap: "wrap" }}>
                  {a.race && <span>{a.race}</span>}
                  {a.weight != null && <span className="mono tnum">{a.weight} kg</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor }}/>
                    <span>{statusLbl}</span>
                  </span>
                  {a.lot && <span>· {a.lot}</span>}
                </div>
              </div>
              <Icon name="chevRight" size={14} color="var(--fg-3)"/>
            </div>
          );
        })}
      </div>
    );
  }

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
const AnimalDetail = ({ lang, animal, onClose, embedded = false }) => {
  const sp = speciesById(animal.species);
  const groups = groupFields(sp.fields);
  const [tab, setTab] = React.useState("details");
  const [editing, setEditing] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [related, setRelated] = React.useState({ treatments: [], repro: [], production: [], loading: true });
  const [photos, setPhotos] = React.useState([]);
  const reloadPhotos = React.useCallback(() => {
    if (!animal._pk) { setPhotos([]); return; }
    api.listAnimalPhotos(animal._pk).then((rows) => setPhotos(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, [animal._pk]);
  React.useEffect(() => {
    reloadPhotos();
    const h = (e) => { if (e.detail?.animalId === animal._pk) reloadPhotos(); };
    window.addEventListener("farmos:photo-uploaded", h);
    return () => window.removeEventListener("farmos:photo-uploaded", h);
  }, [reloadPhotos, animal._pk]);
  React.useEffect(() => {
    if (!animal._pk) { setRelated({ treatments: [], repro: [], production: [], loading: false }); return; }
    let cancel = false;
    Promise.all([api.listTreatments(), api.listReproductionEvents(), api.listProductionLogs()])
      .then(([t, r, p]) => {
        if (cancel) return;
        const matchAnimal = (row) => (row.animalId ?? row.animal_id) === animal._pk;
        setRelated({
          treatments: (Array.isArray(t) ? t : []).filter(matchAnimal),
          repro:      (Array.isArray(r) ? r : []).filter(matchAnimal),
          production: (Array.isArray(p) ? p : []).filter(matchAnimal),
          loading: false,
        });
      })
      .catch(() => setRelated((s) => ({ ...s, loading: false })));
    return () => { cancel = true; };
  }, [animal._pk]);
  const onDelete = async () => {
    if (!animal._pk) return;
    if (!window.confirm(lang === "fr" ? `Supprimer ${animal.name || animal.id} ?` : `Delete ${animal.name || animal.id}?`)) return;
    try {
      await api.deleteAnimal(animal._pk);
      window.dispatchEvent(new CustomEvent("farmos:animal-created"));
      onClose();
    } catch (e) {
      window.alert((lang === "fr" ? "Échec : " : "Failed: ") + e.message);
    }
  };
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
    <aside style={{
      background: "var(--bg-sunken)",
      borderLeft: embedded ? 0 : "1px solid var(--border-1)",
      overflow: embedded ? "visible" : "auto",
      display: "flex", flexDirection: "column",
      flex: embedded ? "1 1 auto" : undefined,
    }}>
      {showQr && <QrPrintModal lang={lang} animal={animal} sp={sp} onClose={() => setShowQr(false)}/>}

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
            <button className="btn btn-sm btn-ghost" onClick={() => setShowQr(true)} title={lang === "fr" ? "Générer QR" : "Generate QR"}>
              <Icon name="qr" size={13} color="var(--ink-700)"/>
            </button>
            {animal._pk && (
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)} title={lang === "fr" ? "Modifier" : "Edit"}>
                <Icon name="edit" size={13} color="var(--ink-700)"/>
              </button>
            )}
            {animal._pk && (
              <button className="btn btn-sm btn-ghost" onClick={onDelete} title={lang === "fr" ? "Supprimer" : "Delete"}>
                <Icon name="trash" size={13} color="var(--oxblood-700)"/>
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: photos[0]?.dataUrl ? `center/cover no-repeat url(${photos[0].dataUrl}), ${sp.accentBg}` : sp.accentBg,
            color: sp.accent,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: "1px solid var(--border-1)", overflow: "hidden",
          }}>
            {!photos[0] && <AnimalGlyph kind={sp.glyph} size={40} color="currentColor"/>}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26,  color: "var(--ink-950)", letterSpacing: "-0.015em", margin: 0 }}>{animal.name}</h2>
            <div className="mono" style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>{animal.id} · {animal.race}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {(() => {
                const sick = animal.status && animal.status !== "healthy";
                const hasActiveTreatment = related.treatments.some((t) => t.status === "running");
                const sante = sick ? 50 : hasActiveTreatment ? 72 : 88;
                const prod = related.production.length > 0 ? Math.min(95, 70 + related.production.length * 2) : 75;
                const finance = 80;
                return <FarmScore sante={sante} prod={prod} finance={finance} size="sm"/>;
              })()}
            </div>
          </div>
        </div>

        {/* Withdrawal warning right at the top */}
        {animal.withdrawal && <WithdrawalChip lang={lang} w={animal.withdrawal}/>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid var(--border-1)", marginLeft: -22, marginRight: -22, paddingLeft: 22, paddingRight: 22 }}>
          {[
            { id: "details",  fr: "Détails",       en: "Details",     count: null },
            { id: "health",   fr: "Santé",         en: "Health",      count: related.treatments.length },
            { id: "repro",    fr: "Reproduction",  en: "Reproduction", count: related.repro.length },
            { id: "prod",     fr: "Production",    en: "Production",  count: related.production.length },
            { id: "history",  fr: "Historique",    en: "History",     count: related.treatments.length + related.repro.length + related.production.length },
          ].map((tb) => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                padding: "10px 14px", border: 0, background: "transparent", fontSize: 12.5, fontWeight: 500,
                color: active ? "var(--ink-950)" : "var(--ink-500)",
                borderBottom: active ? "2px solid var(--oxblood-700)" : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                {lang === "fr" ? tb.fr : tb.en}
                {tb.count != null && tb.count > 0 && (
                  <span className="mono" style={{ fontSize: 10.5, color: active ? "var(--oxblood-700)" : "var(--fg-3)" }}>{tb.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {editing && (
          <AnimalEditCard lang={lang} animal={animal} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}/>
        )}
        {!editing && tab === "details" && (
          <>
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
          </>
        )}
        {!editing && tab === "health" && (
          <RelatedList lang={lang} loading={related.loading} items={related.treatments} kind="health" emptyFr="Aucun traitement enregistré pour cet animal." emptyEn="No treatment recorded for this animal."/>
        )}
        {!editing && tab === "repro" && (
          <RelatedList lang={lang} loading={related.loading} items={related.repro} kind="repro" emptyFr="Aucun événement de reproduction." emptyEn="No reproduction event."/>
        )}
        {!editing && tab === "prod" && (
          <RelatedList lang={lang} loading={related.loading} items={related.production} kind="prod" emptyFr="Aucune production enregistrée." emptyEn="No production recorded."/>
        )}
        {!editing && tab === "history" && (() => {
          const events = [
            ...related.treatments.map((t) => ({ kind: "health", date: t.startDate || t.start_date, label: `${lang === "fr" ? "Traitement" : "Treatment"} · ${t.medicineName || t.medicine_name || "—"}`, sub: t.status })),
            ...related.repro.map((r) => ({ kind: "repro", date: r.eventDate || r.event_date, label: `${lang === "fr" ? "Repro" : "Repro"} · ${r.eventType || r.event_type}`, sub: r.outcome })),
            ...related.production.map((p) => ({ kind: "prod", date: p.logDate || p.log_date, label: `${lang === "fr" ? "Production" : "Production"} · ${p.quantity} ${p.unit || ""}`, sub: p.productType || p.product_type })),
          ].filter((e) => e.date).sort((a, b) => String(b.date).localeCompare(String(a.date)));
          if (related.loading) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;
          if (events.length === 0) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Aucun historique." : "No history."}</div>;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {events.map((e, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, padding: "10px 0", borderBottom: i < events.length - 1 ? "1px dashed var(--border-1)" : "none", alignItems: "center" }}>
                  <Icon name={e.kind === "health" ? "pill" : e.kind === "repro" ? "fingerprint" : "chart"} size={14} color="var(--ink-700)"/>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--ink-900)" }}>{e.label}</div>
                    {e.sub && <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{e.sub}</div>}
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(e.date).slice(0, 10)}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </aside>
  );
};

// Inline edit card — patch only the fields editable from FarmOS (the rest
// lives in CRM screens). Sends PATCH /api/farmos/animals/:id.
const AnimalEditCard = ({ lang, animal, onCancel, onSaved }) => {
  const [form, setForm] = React.useState({
    name: animal.name || "",
    race: animal.race || "",
    sex: animal.sex || "",
    dob: animal.dob || "",
    weight: animal.weight ?? "",
    count: animal.count ?? "",
    lot: animal.lot || "",
    barn: animal.barn || "",
    status: animal.status || "healthy",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (saving || !animal._pk) return;
    setSaving(true);
    setErr(null);
    try {
      await api.updateAnimal(animal._pk, {
        name: form.name || null,
        race: form.race || null,
        sex: form.sex || null,
        date_of_birth: form.dob || null,
        weight: form.weight === "" ? null : Number(form.weight),
        count: form.count === "" ? null : Number(form.count),
        lot: form.lot || null,
        barn: form.barn || null,
        status: form.status || null,
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="overline">{lang === "fr" ? "Modifier la fiche" : "Edit sheet"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Nom" : "Name"}</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Race" : "Breed"}</span>
          <input className="input" value={form.race} onChange={(e) => set("race", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Sexe" : "Sex"}</span>
          <input className="input" value={form.sex} onChange={(e) => set("sex", e.target.value)} placeholder="F / M"/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Date naissance" : "DOB"}</span>
          <input className="input" type="date" value={form.dob || ""} onChange={(e) => set("dob", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Poids (kg)" : "Weight (kg)"}</span>
          <input className="input mono" type="number" step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Nombre (lot)" : "Count (lot)"}</span>
          <input className="input mono" type="number" value={form.count} onChange={(e) => set("count", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Lot" : "Lot"}</span>
          <input className="input" value={form.lot} onChange={(e) => set("lot", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Bâtiment" : "Barn"}</span>
          <input className="input" value={form.barn} onChange={(e) => set("barn", e.target.value)}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Statut" : "Status"}</span>
          <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="healthy">{lang === "fr" ? "Sain" : "Healthy"}</option>
            <option value="sick">{lang === "fr" ? "Malade" : "Sick"}</option>
            <option value="quarantine">{lang === "fr" ? "Quarantaine" : "Quarantine"}</option>
            <option value="withdrawal">{lang === "fr" ? "Délai retrait" : "Withdrawal"}</option>
          </select>
        </label>
      </div>
      {err && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
        <button className="btn" onClick={onCancel} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer" : "Save")}
        </button>
      </div>
    </div>
  );
};

const RelatedList = ({ lang, loading, items, kind, emptyFr, emptyEn }) => {
  if (loading) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;
  if (!items || items.length === 0) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? emptyFr : emptyEn}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => {
        if (kind === "health") {
          const start = it.startDate || it.start_date;
          const end = it.endDate || it.end_date;
          return (
            <div key={it.id} className="card" style={{ padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{it.medicineName || it.medicine_name || (lang === "fr" ? "Traitement" : "Treatment")}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{it.status}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-2)" }}>{(it.dosage || "") + (it.route ? " · " + it.route : "")}</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                {start ? String(start).slice(0, 10) : "—"}{end ? ` → ${String(end).slice(0, 10)}` : ""}
              </div>
            </div>
          );
        }
        if (kind === "repro") {
          const date = it.eventDate || it.event_date;
          const due = it.expectedDueDate || it.expected_due_date;
          return (
            <div key={it.id} className="card" style={{ padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{it.eventType || it.event_type}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{it.outcome}</span>
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>
                {date ? String(date).slice(0, 10) : "—"}{due ? ` · ${lang === "fr" ? "prévu" : "due"} ${String(due).slice(0, 10)}` : ""}
              </div>
              {it.notes && <div style={{ fontSize: 11, color: "var(--ink-700)", marginTop: 2 }}>{it.notes}</div>}
            </div>
          );
        }
        // prod
        const date = it.logDate || it.log_date;
        return (
          <div key={it.id} className="card" style={{ padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{it.productType || it.product_type}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{Number(it.quantity).toLocaleString("fr-CA")} {it.unit || ""}</span>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{date ? String(date).slice(0, 10) : "—"}{it.period ? ` · ${it.period}` : ""}</div>
          </div>
        );
      })}
    </div>
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

// QR code modal — generates a printable label (QR + name + species + ID).
// Encodes the animal's external_id so the identification scanner can read it back.
const QrPrintModal = ({ lang, animal, sp, onClose }) => {
  const [dataUrl, setDataUrl] = React.useState(null);
  const [size, setSize] = React.useState("medium"); // small | medium | large
  const code = animal.id || animal.externalId || `farmos-${animal._pk}`;
  const sizes = { small: { mm: 30, px: 320 }, medium: { mm: 50, px: 480 }, large: { mm: 80, px: 640 } };

  React.useEffect(() => {
    let cancel = false;
    QRCode.toDataURL(code, { errorCorrectionLevel: "H", margin: 1, width: 600, color: { dark: "#0E2418", light: "#FBF8F2" } })
      .then((url) => { if (!cancel) setDataUrl(url); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [code]);

  const doPrint = () => {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=400,height=520");
    if (!w) return;
    const mm = sizes[size].mm;
    const speciesLabel = lang === "fr" ? sp.frSing : sp.enSing;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${code}</title>
      <style>
        @page { size: ${mm + 20}mm ${mm + 30}mm; margin: 5mm; }
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 8mm; text-align: center; color: #0E2418; background: #FBF8F2; }
        .name { font-size: ${Math.max(10, mm / 4)}pt; font-weight: 700; margin-bottom: 2mm; }
        .species { font-size: ${Math.max(8, mm / 6)}pt; color: #4a5944; margin-bottom: 4mm; }
        img { width: ${mm}mm; height: ${mm}mm; display: block; margin: 0 auto; }
        .code { font-family: ui-monospace, Menlo, monospace; font-size: ${Math.max(8, mm / 5)}pt; margin-top: 3mm; letter-spacing: 0.5px; }
      </style></head><body>
      <div class="name">${(animal.name || code).replace(/[<>&]/g, "")}</div>
      <div class="species">${speciesLabel}${animal.race ? " · " + animal.race : ""}</div>
      <img src="${dataUrl}" alt="QR ${code}"/>
      <div class="code">${code}</div>
      <script>window.onload=()=>{setTimeout(()=>{window.print();},150);};</script>
      </body></html>`);
    w.document.close();
  };

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${code}.png`;
    a.click();
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(14,36,24,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 380, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="overline">{lang === "fr" ? "Étiquette QR · imprimable" : "QR label · printable"}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          {dataUrl ? (
            <img src={dataUrl} alt={`QR ${code}`} style={{ width: 220, height: 220, background: "#FBF8F2", borderRadius: 8, border: "1px solid var(--border-1)" }}/>
          ) : (
            <div style={{ width: 220, height: 220, background: "var(--bg-sunken)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)", fontSize: 12 }}>
              {lang === "fr" ? "Génération…" : "Generating…"}
            </div>
          )}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginTop: 8 }}>{animal.name || code}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{code}</div>
        </div>
        <div>
          <div className="overline" style={{ marginBottom: 6 }}>{lang === "fr" ? "Taille d'impression" : "Print size"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "small",  fr: "Petit · 30mm",  en: "Small · 30mm" },
              { id: "medium", fr: "Moyen · 50mm",  en: "Medium · 50mm" },
              { id: "large",  fr: "Grand · 80mm",  en: "Large · 80mm" },
            ].map((s) => (
              <button key={s.id} onClick={() => setSize(s.id)} className="btn btn-sm" style={size === s.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)", flex: 1, justifyContent: "center" } : { flex: 1, justifyContent: "center" }}>
                {lang === "fr" ? s.fr : s.en}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={downloadPng} disabled={!dataUrl} style={{ flex: 1, justifyContent: "center" }}>
            <Icon name="download" size={13} color="var(--ink-700)"/>PNG
          </button>
          <button className="btn btn-primary" onClick={doPrint} disabled={!dataUrl} style={{ flex: 2, justifyContent: "center" }}>
            <Icon name="check" size={13} color="#FBF8F2"/>
            {lang === "fr" ? "Imprimer" : "Print"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center" }}>
          {lang === "fr"
            ? "Scanne ce QR avec l'écran Identification pour ouvrir la fiche."
            : "Scan this QR from the Identification screen to open the sheet."}
        </div>
      </div>
    </div>
  );
};

export { Animals };
