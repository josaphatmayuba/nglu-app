/* eslint-disable */
// Animals — list (table) + detail drawer with species-ADAPTIVE form.
// This is the centerpiece of the adaptation system: every species has different fields.

import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { speciesById, SPECIES, t } from "./data";
import { useDataRefresh } from "./use-data-refresh";
import { SpeciesPillBar, FarmScore } from "./shell";
import { api, adaptAnimal } from "./api";
import { AutocompleteDB, Autocomplete } from "./quickentry";
import { DateRangeFilter, defaultDateRange, inDateRange } from "./date-range-filter.jsx";
import { animalStatusColor, animalStatusLabel, isDeceasedStatus, isSaleLockedAnimal, lockedAnimalMessage, saleLockSubtitle, saleLockTitle } from "./animal-lock";
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

const EMPTY_ADVANCED_FILTERS = {
  status: "",
  sex: "",
  lot: "",
  location: "",
  weightMin: "",
  weightMax: "",
  withdrawal: "all",
  lock: "all",
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

function uniqueSorted(values) {
  return Array.from(new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function countAdvancedAnimalFilters(filters) {
  return Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "withdrawal" || key === "lock") return count + (value !== "all" ? 1 : 0);
    return count + (String(value ?? "").trim() ? 1 : 0);
  }, 0);
}

function matchesAdvancedAnimalFilters(animal, filters) {
  if (filters.status && String(animal.status || "healthy") !== filters.status) return false;
  if (filters.sex && String(animal.sex || "") !== filters.sex) return false;

  if (filters.lot && !normalizeText(animal.lot).includes(normalizeText(filters.lot))) return false;

  if (filters.location) {
    const locationText = normalizeText([animal.barn, animal.lot, animal.buildingId, animal.boxId].filter(Boolean).join(" "));
    if (!locationText.includes(normalizeText(filters.location))) return false;
  }

  const weight = Number(animal.weight);
  if (filters.weightMin !== "" && (Number.isNaN(weight) || weight < Number(filters.weightMin))) return false;
  if (filters.weightMax !== "" && (Number.isNaN(weight) || weight > Number(filters.weightMax))) return false;

  const hasWithdrawal = Boolean(animal.withdrawal && (animal.withdrawal.until || Object.keys(animal.withdrawal).length));
  if (filters.withdrawal === "active" && !hasWithdrawal) return false;
  if (filters.withdrawal === "none" && hasWithdrawal) return false;

  const locked = isSaleLockedAnimal(animal);
  if (filters.lock === "locked" && !locked) return false;
  if (filters.lock === "unlocked" && locked) return false;

  return true;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  if (typeof document === "undefined") return;
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Import CSV (COMP-P1-001) ────────────────────────────────────────────────
// Parse un CSV (séparateur ; — même format que l'export ci-dessus). Gère les
// guillemets/échappements et le BOM. Retourne { headers, rows }.
function parseCsv(text) {
  const clean = text.replace(/^﻿/, "");
  const records = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ";") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); records.push(row); field = ""; row = []; }
    else if (c === "\r") { /* ignore, handled by \n */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); records.push(row); }
  const nonEmpty = records.filter((r) => r.some((v) => String(v).trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  return { headers: nonEmpty[0].map((h) => h.trim()), rows: nonEmpty.slice(1) };
}

// Résout un libellé d'espèce (code, fr/en, singulier/pluriel) vers l'id canonique.
function resolveSpecies(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";
  for (const s of SPECIES) {
    const labels = [s.id, s.fr, s.en, s.frSing, s.enSing]
      .filter(Boolean).map((x) => String(x).toLowerCase());
    if (labels.includes(v)) return s.id;
  }
  return v; // laissé tel quel → le backend rejettera si invalide
}

// Mappe un nom d'en-tête CSV (fr/en, accents/casse) vers un champ animal backend.
const IMPORT_HEADER_MAP = {
  nom: "name", name: "name",
  id: "external_id", "external id": "external_id", "id externe": "external_id", tag: "external_id",
  espece: "species", "espèce": "species", species: "species",
  race: "race", breed: "race",
  sexe: "sex", sex: "sex",
  "date de naissance": "date_of_birth", "date of birth": "date_of_birth", dob: "date_of_birth",
  poids: "weight", weight: "weight",
  statut: "status", status: "status",
  lot: "lot", batch: "lot",
  batiment: "barn", "bâtiment": "barn", barn: "barn",
  "dernier evenement": "last_event", "dernier événement": "last_event", "last event": "last_event",
  "valeur estimee": "estimated_value", "valeur estimée": "estimated_value", "estimated value": "estimated_value",
  nombre: "count", count: "count", effectif: "count",
  salle: "room", room: "room", type: "type",
};

function mapCsvToAnimals({ headers, rows }) {
  const fields = headers.map((h) => IMPORT_HEADER_MAP[h.trim().toLowerCase()] || null);
  return rows.map((cells) => {
    const obj = {};
    fields.forEach((f, i) => {
      if (!f) return;
      let val = String(cells[i] ?? "").trim();
      if (val === "") return;
      if (f === "species") val = resolveSpecies(val);
      if (f === "weight" || f === "estimated_value" || f === "count") {
        const num = Number(String(val).replace(/[^\d.,-]/g, "").replace(",", "."));
        if (!Number.isNaN(num)) obj[f] = num;
        return;
      }
      obj[f] = val;
    });
    return obj;
  });
}

const IMPORT_TEMPLATE_HEADERS = ["Nom", "ID", "Espèce", "Race", "Sexe", "Date de naissance", "Poids", "Statut", "Lot", "Bâtiment", "Nombre"];

function ImportAnimalsModal({ lang, onClose, onDone }) {
  const fr = lang === "fr";
  const [parsed, setParsed] = React.useState(null); // { headers, rows }
  const [mapped, setMapped] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [fileName, setFileName] = React.useState("");

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const p = parseCsv(String(reader.result || ""));
      setParsed(p);
      setMapped(mapCsvToAnimals(p));
    };
    reader.readAsText(file);
  };

  const run = async (dryRun) => {
    if (!mapped.length) return;
    setBusy(true);
    try {
      const res = await api.importAnimals(mapped, dryRun);
      setResult(res);
      if (!dryRun && res.inserted > 0) onDone?.();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => downloadCsv("farmos-import-template.csv", [IMPORT_TEMPLATE_HEADERS]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 12, width: "min(640px,100%)", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{fr ? "Importer des animaux (CSV)" : "Import animals (CSV)"}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={14} color="var(--ink-700)"/></button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <label className="btn btn-sm" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={13} color="var(--ink-700)"/>{fr ? "Choisir un fichier" : "Choose file"}
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }}/>
          </label>
          <button className="btn btn-sm btn-ghost" onClick={downloadTemplate}>
            <Icon name="download" size={13} color="var(--ink-700)"/>{fr ? "Modèle CSV" : "CSV template"}
          </button>
          {fileName && <span style={{ fontSize: 12, color: "var(--fg-3)", alignSelf: "center" }}>{fileName}</span>}
        </div>

        {mapped.length > 0 && (
          <div style={{ fontSize: 12.5, marginBottom: 10 }}>
            {fr ? `${mapped.length} ligne(s) détectée(s).` : `${mapped.length} row(s) detected.`}
            {mapped.some((m) => !m.species) && (
              <div style={{ color: "var(--oxblood-700)", marginTop: 4 }}>
                {fr ? "⚠ Certaines lignes n'ont pas d'espèce reconnue — elles seront ignorées." : "⚠ Some rows have no recognized species — they will be skipped."}
              </div>
            )}
          </div>
        )}

        {result && !result.error && (
          <div style={{ fontSize: 13, background: "var(--bg-2)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div><b>{result.dryRun ? (fr ? "Test (rien enregistré)" : "Test (nothing saved)") : (fr ? "Import terminé" : "Import done")}</b></div>
            <div>{fr ? "Total" : "Total"}: {result.total} · {fr ? "Importables" : "Importable"}/{fr ? "importés" : "imported"}: {result.inserted} · {fr ? "Doublons ignorés" : "Duplicates skipped"}: {result.duplicates} · {fr ? "Erreurs" : "Errors"}: {result.errors?.length || 0}</div>
            {result.errors?.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, maxHeight: 160, overflow: "auto" }}>
                {result.errors.map((er, i) => (
                  <li key={i} style={{ color: "var(--oxblood-700)" }}>{fr ? "Ligne" : "Line"} {er.line} · {er.field}: {er.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {result?.error && <div style={{ color: "var(--oxblood-700)", fontSize: 13, marginBottom: 10 }}>{result.error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-sm btn-ghost" disabled={busy || !mapped.length} onClick={() => run(true)}>
            {fr ? "Tester (sans enregistrer)" : "Test (no save)"}
          </button>
          <button className="btn btn-sm btn-primary" disabled={busy || !mapped.length} onClick={() => run(false)}>
            {busy ? "…" : (fr ? "Importer" : "Import")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Import CSV de pesées (COMP-P2-014). Réutilise parseCsv. Colonnes: ID/tag, Date, Poids, Unité, Notes.
const WEIGHING_HEADER_MAP = {
  id: "external_id", "id externe": "external_id", "external id": "external_id", tag: "external_id", nom: "external_id", name: "external_id",
  date: "weigh_date", "date pesee": "weigh_date", "date pesée": "weigh_date", "weigh date": "weigh_date",
  poids: "weight", weight: "weight",
  unite: "weight_unit", "unité": "weight_unit", unit: "weight_unit",
  notes: "notes", note: "notes",
};
const WEIGHING_TEMPLATE_HEADERS = ["ID", "Date", "Poids", "Unité", "Notes"];

function ImportWeighingsModal({ lang, onClose, onDone }) {
  const fr = lang === "fr";
  const [mapped, setMapped] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [fileName, setFileName] = React.useState("");

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result || ""));
      const fields = headers.map((h) => WEIGHING_HEADER_MAP[h.trim().toLowerCase()] || null);
      const out = rows.map((cells) => {
        const obj = {};
        fields.forEach((f, i) => {
          if (!f) return;
          let v = String(cells[i] ?? "").trim();
          if (v === "") return;
          if (f === "weight") { const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", ".")); if (!Number.isNaN(n)) obj[f] = n; return; }
          obj[f] = v;
        });
        return obj;
      });
      setMapped(out);
    };
    reader.readAsText(file);
  };

  const run = async (dryRun) => {
    if (!mapped.length) return;
    setBusy(true);
    try {
      const res = await api.importWeighings(mapped, dryRun);
      setResult(res);
      if (!dryRun && res.inserted > 0) onDone?.();
    } catch (err) { setResult({ error: err.message }); } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 12, width: "min(560px,100%)", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{fr ? "Importer des pesées (CSV)" : "Import weighings (CSV)"}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={14} color="var(--ink-700)"/></button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <label className="btn btn-sm" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={13} color="var(--ink-700)"/>{fr ? "Choisir un fichier" : "Choose file"}
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }}/>
          </label>
          <button className="btn btn-sm btn-ghost" onClick={() => downloadCsv("farmos-pesees-template.csv", [WEIGHING_TEMPLATE_HEADERS])}>
            <Icon name="download" size={13} color="var(--ink-700)"/>{fr ? "Modèle CSV" : "CSV template"}
          </button>
          {fileName && <span style={{ fontSize: 12, color: "var(--fg-3)", alignSelf: "center" }}>{fileName}</span>}
        </div>
        {mapped.length > 0 && <div style={{ fontSize: 12.5, marginBottom: 10 }}>{fr ? `${mapped.length} ligne(s) détectée(s). L'animal est identifié par ID/tag.` : `${mapped.length} row(s) detected. Animal matched by ID/tag.`}</div>}
        {result && !result.error && (
          <div style={{ fontSize: 13, background: "var(--bg-2)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div><b>{result.dryRun ? (fr ? "Test (rien enregistré)" : "Test (nothing saved)") : (fr ? "Import terminé" : "Import done")}</b></div>
            <div>{fr ? "Total" : "Total"}: {result.total} · {fr ? "Importées" : "Imported"}: {result.inserted} · {fr ? "Erreurs" : "Errors"}: {result.errors?.length || 0}</div>
            {result.errors?.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, maxHeight: 160, overflow: "auto" }}>
                {result.errors.map((er, i) => <li key={i} style={{ color: "var(--oxblood-700)" }}>{fr ? "Ligne" : "Line"} {er.line} · {er.field}: {er.message}</li>)}
              </ul>
            )}
          </div>
        )}
        {result?.error && <div style={{ color: "var(--oxblood-700)", fontSize: 13, marginBottom: 10 }}>{result.error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-sm btn-ghost" disabled={busy || !mapped.length} onClick={() => run(true)}>{fr ? "Tester (sans enregistrer)" : "Test (no save)"}</button>
          <button className="btn btn-sm btn-primary" disabled={busy || !mapped.length} onClick={() => run(false)}>{busy ? "…" : (fr ? "Importer" : "Import")}</button>
        </div>
      </div>
    </div>
  );
}

const Animals = ({ lang, speciesFilter, onSpeciesFilter, density }) => {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = React.useState(null);
  const [layout, setLayout] = React.useState("split"); // split | full
  const [animals, setAnimals] = React.useState([]);
  const [loadState, setLoadState] = React.useState("idle"); // idle | loading | ok | error
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("all"));
  const [showFilters, setShowFilters] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [showImportWeighings, setShowImportWeighings] = React.useState(false);
  const [advancedFilters, setAdvancedFilters] = React.useState(() => ({ ...EMPTY_ADVANCED_FILTERS }));

  const [reloadKey, setReloadKey] = React.useState(0);
  const refresh = useDataRefresh(["animals"]);
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
  }, [reloadKey, refresh]);
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

  const filtered = animals.filter((a) => {
    if (speciesFilter && a.species !== speciesFilter) return false;
    if (a.dob && !inDateRange(a.dob, dateRange)) return false;
    if (!matchesAdvancedAnimalFilters(a, advancedFilters)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [a.name, a.id, a.tag, a.externalId, a.lot, a.race, a.breed, a.barn, a.status]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });
  const statusOptions = React.useMemo(() => uniqueSorted(animals.map((a) => a.status || "healthy")), [animals]);
  const sexOptions = React.useMemo(() => uniqueSorted(animals.map((a) => a.sex)), [animals]);
  const activeFilterCount = countAdvancedAnimalFilters(advancedFilters);
  const filterButtonActive = showFilters || activeFilterCount > 0;
  const resetAdvancedFilters = () => setAdvancedFilters({ ...EMPTY_ADVANCED_FILTERS });
  const exportFiltered = () => {
    const fr = lang === "fr";
    const headers = fr
      ? ["Nom", "ID", "Espèce", "Race", "Sexe", "Date de naissance", "Poids", "Statut", "Lot", "Bâtiment", "Dernier événement", "Valeur estimée"]
      : ["Name", "ID", "Species", "Breed", "Sex", "Date of birth", "Weight", "Status", "Batch", "Barn", "Last event", "Estimated value"];
    const rows = filtered.map((a) => {
      const sp = speciesById(a.species);
      return [
        a.name || "",
        a.id || "",
        sp ? (fr ? sp.frSing || sp.fr : sp.enSing || sp.en) : a.species || "",
        a.race || "",
        a.sex || "",
        a.dob || "",
        a.weight != null ? `${a.weight} ${a.weightUnit || "kg"}` : "",
        animalStatusLabel(a.status, lang),
        a.lot || "",
        a.barn || "",
        a.lastEvent || "",
        a.estimatedValue ?? "",
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(fr ? `farmos-animaux-${date}.csv` : `farmos-animals-${date}.csv`, [headers, ...rows]);
  };
  // Desktop: auto-select first animal for split view.
  // Mobile: only show detail after explicit row click — single scroll on the list.
  const selectedInFiltered = selectedId ? filtered.find((a) => a.id === selectedId) : null;
  const selected = isMobile
    ? selectedInFiltered
    : (selectedInFiltered || filtered[0]);

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
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
          <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
        </div>

        {/* Search + toolbar */}
        <div className="toolbar-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", rowGap: 8 }}>
          <div style={{ flex: "1 1 200px", minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "0 10px", height: 34 }}>
            <Icon name="search" size={14} color="var(--ink-500)"/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "fr" ? "Rechercher par nom, ID, lot, race…" : "Search by name, ID, batch, breed…"} style={{ border: 0, background: "transparent", flex: 1, minWidth: 0, outline: "none", fontSize: 13 }}/>
          </div>
          <button className="btn btn-sm" onClick={() => setShowFilters((v) => !v)}
            style={filterButtonActive ? { background: "var(--forest-900)", color: "var(--bone-50)", borderColor: "var(--forest-900)" } : undefined}>
            <Icon name="filter" size={13} color={filterButtonActive ? "var(--bone-50)" : "var(--ink-700)"}/>
            {lang === "fr" ? "Filtres" : "Filters"}
            {activeFilterCount > 0 && <span className="mono" style={{ marginLeft: 2 }}>{activeFilterCount}</span>}
          </button>
          <button className="btn btn-sm" onClick={exportFiltered}>
            <Icon name="download" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Exporter" : "Export"}
          </button>
          <button className="btn btn-sm" onClick={() => setShowImport(true)}>
            <Icon name="upload" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Importer" : "Import"}
          </button>
          <button className="btn btn-sm" onClick={() => setShowImportWeighings(true)}>
            <Icon name="upload" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Importer pesées" : "Import weighings"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "animal" }))}><Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Nouvel animal" : "New animal"}</button>
        </div>

        {showFilters && (
          <AdvancedAnimalFilters
            lang={lang}
            value={advancedFilters}
            onChange={setAdvancedFilters}
            onReset={resetAdvancedFilters}
            statusOptions={statusOptions}
            sexOptions={sexOptions}
            resultCount={filtered.length}
            activeCount={activeFilterCount}
          />
        )}

        {/* Table */}
        <AnimalTable lang={lang} animals={filtered} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setLayout("split"); }} density={density}/>

        {/* Note about adaptation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--fg-3)", }}>
          <Icon name="sparkle" size={12} color="var(--oxblood-700)"/>
          <span>
            {lang === "fr"
              ? `Le formulaire et les champs s'adaptent automatiquement selon l'espèce (${speciesFilter ? speciesById(speciesFilter).fr : "toutes espèces affichées"}).`
              : `The form and fields adapt automatically by species (${speciesFilter ? speciesById(speciesFilter).en : "all species shown"}).`}
          </span>
        </div>

        {showImport && (
          <ImportAnimalsModal
            lang={lang}
            onClose={() => setShowImport(false)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
        )}
        {showImportWeighings && (
          <ImportWeighingsModal
            lang={lang}
            onClose={() => setShowImportWeighings(false)}
            onDone={() => setReloadKey((k) => k + 1)}
          />
        )}
      </div>

      {/* Detail drawer (desktop split only) */}
      {selected && layout === "split" && !isMobile && (
        <AnimalDetail lang={lang} animal={selected} onClose={() => setLayout("full")}/>
      )}
    </div>
  );
};

// ─── Animal table ────────────────────────────────────────────────────────
const AdvancedAnimalFilters = ({ lang, value, onChange, onReset, statusOptions, sexOptions, resultCount, activeCount }) => {
  const fr = lang === "fr";
  const set = (key, next) => onChange({ ...value, [key]: next });
  const locale = fr ? "fr-CA" : "en-CA";
  const labelStyle = { fontSize: 11, color: "var(--fg-2)", display: "flex", flexDirection: "column", gap: 5, minWidth: 0 };
  const inputStyle = { width: "100%", height: 32, fontSize: 12.5 };

  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--border-1)",
      borderRadius: 8,
      padding: 12,
      boxShadow: "var(--shadow-1)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Icon name="filter" size={14} color="var(--forest-700)"/>
          <span className="overline" style={{ margin: 0 }}>{fr ? "Filtres avancés" : "Advanced filters"}</span>
          <span className="tag" style={{ background: "var(--bg-sunken)" }}>
            {resultCount.toLocaleString(locale)} {fr ? "fiche(s)" : "record(s)"}
          </span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onReset} disabled={!activeCount}>
          <Icon name="refresh" size={12} color="var(--ink-700)"/>
          {fr ? "Réinitialiser" : "Reset"}
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10,
        alignItems: "end",
      }}>
        <label style={labelStyle}>
          {fr ? "Statut" : "Status"}
          <select className="input" value={value.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
            <option value="">{fr ? "Tous" : "All"}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{animalStatusLabel(status, lang)}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          {fr ? "Sexe" : "Sex"}
          <select className="input" value={value.sex} onChange={(e) => set("sex", e.target.value)} style={inputStyle}>
            <option value="">{fr ? "Tous" : "All"}</option>
            {sexOptions.map((sex) => (
              <option key={sex} value={sex}>{sex}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          {fr ? "Lot" : "Batch"}
          <input className="input" value={value.lot} onChange={(e) => set("lot", e.target.value)} placeholder={fr ? "Lot ou groupe" : "Batch or group"} style={inputStyle}/>
        </label>

        <label style={labelStyle}>
          {fr ? "Localisation" : "Location"}
          <input className="input" value={value.location} onChange={(e) => set("location", e.target.value)} placeholder={fr ? "Bâtiment, salle..." : "Barn, room..."} style={inputStyle}/>
        </label>

        <label style={labelStyle}>
          {fr ? "Poids min." : "Min weight"}
          <input className="input mono" type="number" value={value.weightMin} onChange={(e) => set("weightMin", e.target.value)} placeholder="kg" style={inputStyle}/>
        </label>

        <label style={labelStyle}>
          {fr ? "Poids max." : "Max weight"}
          <input className="input mono" type="number" value={value.weightMax} onChange={(e) => set("weightMax", e.target.value)} placeholder="kg" style={inputStyle}/>
        </label>

        <label style={labelStyle}>
          {fr ? "Retrait" : "Withdrawal"}
          <select className="input" value={value.withdrawal} onChange={(e) => set("withdrawal", e.target.value)} style={inputStyle}>
            <option value="all">{fr ? "Tous" : "All"}</option>
            <option value="active">{fr ? "En retrait" : "In withdrawal"}</option>
            <option value="none">{fr ? "Sans retrait" : "No withdrawal"}</option>
          </select>
        </label>

        <label style={labelStyle}>
          {fr ? "Dossier" : "Record"}
          <select className="input" value={value.lock} onChange={(e) => set("lock", e.target.value)} style={inputStyle}>
            <option value="all">{fr ? "Tous" : "All"}</option>
            <option value="locked">{fr ? "Verrouillé" : "Locked"}</option>
            <option value="unlocked">{fr ? "Modifiable" : "Editable"}</option>
          </select>
        </label>
      </div>
    </div>
  );
};

const ANIMAL_PAGE_SIZE = 200; // COMP-P1-014 : cap d'affichage pour rester rapide sur gros troupeaux.

const AnimalTable = ({ lang, animals, selectedId, onSelect, density }) => {
  const isMobile = useIsMobile();
  const rowH = density === "compact" ? 38 : 50;
  // Pagination "afficher plus" : on ne rend qu'une tranche, on agrandit a la demande.
  const [shown, setShown] = React.useState(ANIMAL_PAGE_SIZE);
  // Reset du cap quand la liste filtree change de taille (recherche/filtre/tri).
  React.useEffect(() => { setShown(ANIMAL_PAGE_SIZE); }, [animals.length]);
  const visible = animals.slice(0, shown);
  const hasMore = animals.length > shown;
  const remaining = animals.length - shown;
  const moreLabel = lang === "fr"
    ? `Afficher plus (${Math.min(ANIMAL_PAGE_SIZE, remaining)} / ${remaining} restants)`
    : `Show more (${Math.min(ANIMAL_PAGE_SIZE, remaining)} / ${remaining} left)`;

  // Mobile: stacked cards, no inner scroll, the page scrolls naturally.
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((a) => {
          const sp = speciesById(a.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--ink-50)" };
          const sel = selectedId === a.id;
          const locked = isSaleLockedAnimal(a);
          const statusColor = animalStatusColor(a.status);
          const statusLbl = animalStatusLabel(a.status, lang);
          return (
            <div key={a.id} onClick={() => onSelect(a.id)} style={{
              background: locked || a.withdrawal ? "rgba(122, 31, 43, 0.04)" : "var(--paper)",
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
                  {(locked || a.withdrawal) && (
                    <span className="tag tag-danger" style={{ fontSize: 9.5, padding: "1px 6px" }}>
                      <Icon name="shield" size={9} color="var(--oxblood-700)"/>
                      {locked ? animalStatusLabel(a.status, lang) : (lang === "fr" ? "Retrait" : "Withdrawal")}
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
                  {(Math.floor(Number(a.count ?? 0)) || 0) > 1 && (
                    <span className="mono tnum" title={lang === "fr" ? "Nombre d'animaux dans le lot" : "Animals in batch"} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Icon name="layers" size={10} color="var(--fg-3)"/>
                      {(Math.floor(Number(a.count)) || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                    </span>
                  )}
                </div>
              </div>
              <Icon name="chevRight" size={14} color="var(--fg-3)"/>
            </div>
          );
        })}
        {hasMore && (
          <button className="btn btn-sm" style={{ alignSelf: "center", marginTop: 4 }} onClick={() => setShown((n) => n + ANIMAL_PAGE_SIZE)}>
            {moreLabel}
          </button>
        )}
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
      {visible.map((a) => {
        const sp = speciesById(a.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--ink-50)" };
        const sel = selectedId === a.id;
        const locked = isSaleLockedAnimal(a);
        const statusColor = animalStatusColor(a.status);
        const statusLbl = animalStatusLabel(a.status, lang);
        return (
          <div key={a.id} onClick={() => onSelect(a.id)} style={{
            display: "grid", gridTemplateColumns: "32px 1fr 130px 80px 100px 130px 120px 80px",
            padding: `${(rowH-28)/2}px 14px`, alignItems: "center",
            borderBottom: "1px solid var(--border-1)",
            background: sel ? "var(--bg-sunken)" : locked || a.withdrawal ? "rgba(122, 31, 43, 0.03)" : "var(--paper)",
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
                {(locked || a.withdrawal) && <span className="tag tag-danger" style={{ fontSize: 9.5, padding: "1px 6px" }}>
                  <Icon name="shield" size={9} color="var(--oxblood-700)"/>
                  {locked ? animalStatusLabel(a.status, lang) : (lang === "fr" ? "Retrait" : "Withdrawal")}
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
      {hasMore && (
        <div style={{ padding: "12px 14px", textAlign: "center", borderTop: "1px solid var(--border-1)" }}>
          <button className="btn btn-sm" onClick={() => setShown((n) => n + ANIMAL_PAGE_SIZE)}>{moreLabel}</button>
        </div>
      )}
      </div>
    </div>
  );
};

// ─── Animal detail drawer (species-adaptive) ─────────────────────────────
// Déclaration de décès depuis la fiche animal. Verrouille le dossier (le backend
// passe l'animal en statut « deceased » sur createMortalityEvent). Le commentaire
// saisi ici est stocké dans notes et réaffiché dans la fiche.
const DeathDeclareModal = ({ lang, animal, onClose, onSaved }) => {
  const fr = lang === "fr";
  const availableCount = Math.max(1, Math.floor(Number(animal.count ?? 0)) || 1);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), count: 1, cause: "", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const typedCount = Number(form.count);
  const previewCount = Number.isInteger(typedCount) && typedCount > 0 ? typedCount : 0;
  const remainingCount = Math.max(0, availableCount - previewCount);
  const isPartialLotDeath = availableCount > 1 && previewCount > 0 && previewCount < availableCount;
  const submit = async () => {
    if (saving) return;
    if (!form.date || !form.cause.trim()) {
      setError(fr ? "Date et cause requises." : "Date and cause required.");
      return;
    }
    if (!Number.isInteger(typedCount) || typedCount < 1 || typedCount > availableCount) {
      setError(fr ? `Nombre décédés requis entre 1 et ${availableCount}.` : `Death count must be between 1 and ${availableCount}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createMortalityEvent({
        species: animal.species || null,
        event_date: form.date,
        animal_id: animal._pk,
        count: typedCount,
        cause: form.cause.trim(),
        notes: form.notes.trim() || null,
      });
      onSaved && onSaved();
    } catch (e) {
      setError((fr ? "Échec : " : "Failed: ") + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };
  const lbl = { fontSize: 12, color: "var(--fg-2)", display: "block" };
  const title = animal.name || animal.id || `#${animal._pk}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--oxblood-50, #f6e7e2)", color: "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="skull" size={20} color="currentColor"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{fr ? "Déclarer le décès" : "Declare death"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--oxblood-700)", background: "var(--oxblood-50, #f6e7e2)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
          {isPartialLotDeath
            ? (fr ? `Le lot restera actif avec ${remainingCount} ${remainingCount > 1 ? "animaux" : "animal"}.` : `The batch will stay active with ${remainingCount} animal${remainingCount > 1 ? "s" : ""}.`)
            : (fr ? "Le dossier sera verrouillé en lecture seule après la déclaration." : "The record will become read-only after declaration.")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={lbl}>{fr ? "Date du décès" : "Date of death"}
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          {availableCount > 1 && (
            <label style={lbl}>{fr ? "Nombre décédés" : "Deaths"}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input className="input mono" type="number" min="1" max={availableCount} step="1" value={form.count} onChange={(e) => set("count", e.target.value)} style={{ width: 120 }}/>
                <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>/ {availableCount}</span>
              </div>
            </label>
          )}
          <label style={lbl}>{fr ? "Cause présumée" : "Suspected cause"}
            <input className="input" type="text" value={form.cause} onChange={(e) => set("cause", e.target.value)} placeholder={fr ? "Maladie, accident…" : "Disease, accident…"} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Commentaire" : "Comment"}
            <textarea className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder={fr ? "Note affichée dans la fiche…" : "Note shown on the record…"} style={{ width: "100%", marginTop: 4, resize: "vertical" }}/>
          </label>
        </div>

        {error && <div style={{ color: "var(--oxblood-700)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>{fr ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-sm" onClick={submit} disabled={saving} style={{ background: "var(--oxblood-700)", color: "#fff", borderColor: "var(--oxblood-700)" }}>
            {saving ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Confirmer le décès" : "Confirm death")}
          </button>
        </div>
      </div>
    </div>
  );
};

// Ajustement manuel d'un lot existant : achat de porcelets externes, transfert
// entre lots, correction d'inventaire. Complète le décès (DeathDeclareModal)
// et la vente avec un mécanisme d'ajout/retrait tracé (motif + notes).
const BATCH_ADJUSTMENT_REASONS = [
  { value: "purchase", fr: "Achat externe", en: "External purchase" },
  { value: "transfer_in", fr: "Transfert entrant", en: "Transfer in" },
  { value: "transfer_out", fr: "Transfert sortant", en: "Transfer out" },
  { value: "inventory_correction", fr: "Correction d'inventaire", en: "Inventory correction" },
  { value: "other", fr: "Autre", en: "Other" },
];

const BatchAdjustModal = ({ lang, animal, onClose, onSaved }) => {
  const fr = lang === "fr";
  const currentCount = Math.max(0, Math.floor(Number(animal.count ?? 0)) || 0);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), delta: "", reason: "purchase", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const typedDelta = Number(form.delta);
  const hasValidDelta = Number.isInteger(typedDelta) && typedDelta !== 0;
  const previewAfter = hasValidDelta ? Math.max(0, currentCount + typedDelta) : currentCount;
  const submit = async () => {
    if (saving) return;
    if (!form.date) {
      setError(fr ? "Date requise." : "Date required.");
      return;
    }
    if (!hasValidDelta) {
      setError(fr ? "Quantité requise (positive pour un ajout, négative pour un retrait)." : "Amount required (positive to add, negative to remove).");
      return;
    }
    if (typedDelta < 0 && Math.abs(typedDelta) > currentCount) {
      setError(fr ? `Retrait supérieur au nombre disponible. Maximum : ${currentCount}.` : `Removal exceeds available count. Maximum: ${currentCount}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createBatchAdjustment({
        animal_id: animal._pk,
        adjustment_date: form.date,
        delta: typedDelta,
        reason: form.reason,
        notes: form.notes.trim() || null,
      });
      onSaved && onSaved();
    } catch (e) {
      setError((fr ? "Échec : " : "Failed: ") + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };
  const lbl = { fontSize: 12, color: "var(--fg-2)", display: "block" };
  const title = animal.name || animal.id || `#${animal._pk}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--ink-50)", color: "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="layers" size={20} color="currentColor"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{fr ? "Ajuster le lot" : "Adjust batch"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--ink-700)", background: "var(--ink-50)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
          {fr
            ? `Effectif actuel : ${currentCount}. Après ajustement : ${previewAfter}.`
            : `Current count: ${currentCount}. After adjustment: ${previewAfter}.`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={lbl}>{fr ? "Date de l'ajustement" : "Adjustment date"}
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Quantité (+ ajout / − retrait)" : "Amount (+ add / − remove)"}
            <input className="input mono" type="number" step="1" value={form.delta} onChange={(e) => set("delta", e.target.value)} placeholder={fr ? "ex. 5 ou -3" : "e.g. 5 or -3"} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Motif" : "Reason"}
            <select className="input" value={form.reason} onChange={(e) => set("reason", e.target.value)} style={{ width: "100%", marginTop: 4 }}>
              {BATCH_ADJUSTMENT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{fr ? r.fr : r.en}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>{fr ? "Commentaire" : "Comment"}
            <textarea className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder={fr ? "Note affichée dans l'historique…" : "Note shown in history…"} style={{ width: "100%", marginTop: 4, resize: "vertical" }}/>
          </label>
        </div>

        {error && <div style={{ color: "var(--oxblood-700)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>{fr ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-sm" onClick={submit} disabled={saving} style={{ background: "var(--ink-700)", color: "#fff", borderColor: "var(--ink-700)" }}>
            {saving ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Confirmer l'ajustement" : "Confirm adjustment")}
          </button>
        </div>
      </div>
    </div>
  );
};

// Transfert atomique de N tetes du lot courant vers un autre lot existant de
// meme espece (ex. deplacement d'un batiment/box a un autre deja suivi comme
// lot separe). Distinct de BatchAdjustModal (ajout/retrait isole, sans lot
// destination) : ici les 2 mouvements sont lies et tracables des 2 cotes.
const BatchTransferModal = ({ lang, animal, onClose, onSaved }) => {
  const fr = lang === "fr";
  const currentCount = Math.max(0, Math.floor(Number(animal.count ?? 0)) || 0);
  const [candidates, setCandidates] = React.useState([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(true);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), toAnimalId: "", count: "", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const refresh = useDataRefresh(["animals"]);
  const speciesMeta = speciesById(animal.species);
  const speciesLabel = ((fr ? speciesMeta?.fr : speciesMeta?.en) || animal.species || "").toLowerCase();

  React.useEffect(() => {
    let cancel = false;
    setLoadingCandidates(true);
    // listAnimals() sert d'abord le cache local (stale-while-revalidate) : ce
    // modal a besoin de la liste fraîche des lots, donc on force un fetch
    // réseau direct plutôt que de risquer d'afficher un cache périmé.
    api.listAnimalsFresh().then((rows) => {
      if (cancel) return;
      const list = (rows || []).filter((a) =>
        a._pk !== animal._pk
        && String(a.species) === String(animal.species)
        && (Math.floor(Number(a.count ?? 0)) || 0) > 1
        && !isSaleLockedAnimal(a),
      );
      setCandidates(list);
    }).catch(() => { if (!cancel) setCandidates([]); }).finally(() => { if (!cancel) setLoadingCandidates(false); });
    return () => { cancel = true; };
  }, [animal._pk, animal.species, refresh]);

  const typedCount = Number(form.count);
  const hasValidCount = Number.isInteger(typedCount) && typedCount > 0;
  const targetAnimal = candidates.find((a) => String(a._pk) === String(form.toAnimalId));
  const previewFromAfter = hasValidCount ? Math.max(0, currentCount - typedCount) : currentCount;
  const previewToAfter = hasValidCount && targetAnimal ? Math.max(0, Number(targetAnimal.count ?? 0) + typedCount) : (targetAnimal ? Number(targetAnimal.count ?? 0) : null);

  const submit = async () => {
    if (saving) return;
    if (!form.date) {
      setError(fr ? "Date requise." : "Date required.");
      return;
    }
    if (!targetAnimal) {
      setError(fr ? "Sélectionnez un lot destination." : "Select a destination batch.");
      return;
    }
    if (!hasValidCount) {
      setError(fr ? "Quantité requise (entier positif)." : "Amount required (positive integer).");
      return;
    }
    if (typedCount > currentCount) {
      setError(fr ? `Transfert supérieur au nombre disponible. Maximum : ${currentCount}.` : `Transfer exceeds available count. Maximum: ${currentCount}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createBatchTransfer({
        from_animal_id: animal._pk,
        to_animal_id: targetAnimal._pk,
        count: typedCount,
        transfer_date: form.date,
        notes: form.notes.trim() || null,
      });
      onSaved && onSaved();
    } catch (e) {
      setError((fr ? "Échec : " : "Failed: ") + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };
  const lbl = { fontSize: 12, color: "var(--fg-2)", display: "block" };
  const title = animal.name || animal.id || `#${animal._pk}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--ink-50)", color: "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="layers" size={20} color="currentColor"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{fr ? "Transférer vers un autre lot" : "Transfer to another batch"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--ink-700)", background: "var(--ink-50)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
          {fr
            ? `Lot source : ${currentCount} → ${previewFromAfter}.${targetAnimal ? ` Lot destination : ${Number(targetAnimal.count ?? 0)} → ${previewToAfter}.` : ""}`
            : `Source batch: ${currentCount} → ${previewFromAfter}.${targetAnimal ? ` Destination batch: ${Number(targetAnimal.count ?? 0)} → ${previewToAfter}.` : ""}`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={lbl}>{fr ? "Date du transfert" : "Transfer date"}
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Lot destination" : "Destination batch"}
            <div style={{ marginTop: 4 }}>
              <Autocomplete
                value={form.toAnimalId}
                onChange={(v) => set("toAnimalId", v)}
                placeholder={loadingCandidates ? (fr ? "Chargement…" : "Loading…") : (fr ? "Rechercher un lot…" : "Search a batch…")}
                options={candidates.map((a) => ({
                  value: String(a._pk),
                  label: (a.name || a.id || `#${a._pk}`) + " — " + (a.lot ? a.lot + " · " : "") + (fr ? "effectif " : "count ") + Math.max(0, Math.floor(Number(a.count ?? 0)) || 0),
                }))}
              />
            </div>
            {/* Le transfert n'est possible qu'entre lots de la MEME espece : on
                affiche explicitement l'espece et le nombre de lots trouves, sinon
                une liste courte (ex. 2 lots de vaches) passe pour un bug. */}
            {!loadingCandidates && (
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
                {candidates.length === 0
                  ? (fr ? `Aucun autre lot de ${speciesLabel} disponible (un transfert ne peut se faire qu'entre lots de la même espèce).`
                        : `No other ${speciesLabel} batch available (transfers only happen between batches of the same species).`)
                  : (fr ? `${candidates.length} lot${candidates.length > 1 ? "s" : ""} de ${speciesLabel} disponible${candidates.length > 1 ? "s" : ""} (même espèce uniquement).`
                        : `${candidates.length} ${speciesLabel} batch${candidates.length > 1 ? "es" : ""} available (same species only).`)}
              </div>
            )}
          </label>
          <label style={lbl}>{fr ? "Quantité à transférer" : "Amount to transfer"}
            <input className="input mono" type="number" step="1" min="1" value={form.count} onChange={(e) => set("count", e.target.value)} placeholder={fr ? "ex. 10" : "e.g. 10"} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Commentaire" : "Comment"}
            <textarea className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder={fr ? "Note affichée dans l'historique…" : "Note shown in history…"} style={{ width: "100%", marginTop: 4, resize: "vertical" }}/>
          </label>
        </div>

        {error && <div style={{ color: "var(--oxblood-700)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>{fr ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-sm" onClick={submit} disabled={saving} style={{ background: "var(--ink-700)", color: "#fff", borderColor: "var(--ink-700)" }}>
            {saving ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Confirmer le transfert" : "Confirm transfer")}
          </button>
        </div>
      </div>
    </div>
  );
};

// Scission d'un lot : extrait N tetes du lot courant pour en faire N fiches
// individuelles distinctes, avec suivi propre (nom, poids, sante), tout en
// conservant filiation (mere/pere) et localisation heritees du lot source.
// Distinct de BatchTransferModal (destination = lot deja existant) : ici les
// nouvelles fiches sont creees a la volee, il n'y a pas de destination au prealable.
const BatchSplitModal = ({ lang, animal, onClose, onSaved }) => {
  const fr = lang === "fr";
  const currentCount = Math.max(0, Math.floor(Number(animal.count ?? 0)) || 0);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), count: "1", name: "", externalId: "", sex: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const typedCount = Number(form.count);
  const hasValidCount = Number.isInteger(typedCount) && typedCount > 0;
  const previewAfter = hasValidCount ? Math.max(0, currentCount - typedCount) : currentCount;

  const submit = async () => {
    if (saving) return;
    if (!form.date) {
      setError(fr ? "Date requise." : "Date required.");
      return;
    }
    if (!hasValidCount) {
      setError(fr ? "Nombre à extraire requis (entier positif)." : "Amount to extract required (positive integer).");
      return;
    }
    if (typedCount > currentCount) {
      setError(fr ? `Extraction supérieure au nombre disponible. Maximum : ${currentCount}.` : `Extraction exceeds available count. Maximum: ${currentCount}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.createBatchSplit({
        from_animal_id: animal._pk,
        count: typedCount,
        split_date: form.date,
        name: typedCount === 1 ? (form.name.trim() || null) : (form.name.trim() || null),
        external_id: form.externalId.trim() || null,
        sex: form.sex || null,
      });
      onSaved && onSaved();
    } catch (e) {
      setError((fr ? "Échec : " : "Failed: ") + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };
  const lbl = { fontSize: 12, color: "var(--fg-2)", display: "block" };
  const title = animal.name || animal.id || `#${animal._pk}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 460, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--ink-50)", color: "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="user" size={20} color="currentColor"/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{fr ? "Sortir un individu du lot" : "Split individual from batch"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--ink-700)", background: "var(--ink-50)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
          {fr
            ? `Lot source : ${currentCount} → ${previewAfter}. Chaque tête extraite devient une fiche animale individuelle à part entière (suivi poids/santé propre), avec la même filiation et localisation que le lot.`
            : `Source batch: ${currentCount} → ${previewAfter}. Each extracted head becomes its own individual animal record (own weight/health tracking), inheriting the batch's parentage and location.`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={lbl}>{fr ? "Date de la scission" : "Split date"}
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Nombre d'individus à extraire" : "Number of individuals to extract"}
            <input className="input mono" type="number" step="1" min="1" max={currentCount || undefined} value={form.count} onChange={(e) => set("count", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          {hasValidCount && typedCount > 1 && (
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
              {fr
                ? `${typedCount} fiches individuelles distinctes seront créées (pas un mini-lot).`
                : `${typedCount} separate individual records will be created (not a mini-batch).`}
            </div>
          )}
          <label style={lbl}>{fr ? "Nom (optionnel)" : "Name (optional)"}
            <input className="input" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={fr ? "ex. Bella" : "e.g. Bella"} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={lbl}>{fr ? "Identifiant / tag (optionnel)" : "Tag / ID (optional)"}
            <input className="input" type="text" value={form.externalId} onChange={(e) => set("externalId", e.target.value)} disabled={hasValidCount && typedCount > 1} placeholder={fr ? "généré automatiquement si vide" : "auto-generated if empty"} style={{ width: "100%", marginTop: 4 }}/>
            {hasValidCount && typedCount > 1 && (
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
                {fr ? "Non disponible pour plusieurs individus (généré automatiquement avec suffixes)." : "Not available for multiple individuals (auto-generated with suffixes)."}
              </div>
            )}
          </label>
          <label style={lbl}>{fr ? "Sexe (optionnel)" : "Sex (optional)"}
            <select className="input" value={form.sex} onChange={(e) => set("sex", e.target.value)} style={{ width: "100%", marginTop: 4 }}>
              <option value="">{fr ? "Non précisé" : "Not specified"}</option>
              <option value="F">{fr ? "Femelle" : "Female"}</option>
              <option value="M">{fr ? "Mâle" : "Male"}</option>
            </select>
          </label>
        </div>

        {error && <div style={{ color: "var(--oxblood-700)", fontSize: 12.5, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>{fr ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-sm" onClick={submit} disabled={saving} style={{ background: "var(--ink-700)", color: "#fff", borderColor: "var(--ink-700)" }}>
            {saving ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Confirmer la scission" : "Confirm split")}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnimalDetail = ({ lang, animal, onClose, embedded = false }) => {
  const sp = speciesById(animal.species) || { glyph: null, accent: "var(--ink-700)", accentBg: "var(--ink-50)", frSing: animal.species, enSing: animal.species, fields: [] };
  const groups = groupFields(sp.fields);
  const readOnly = isSaleLockedAnimal(animal);
  const [tab, setTab] = React.useState("details");
  const [editing, setEditing] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const [declaringDeath, setDeclaringDeath] = React.useState(false);
  const [adjustingBatch, setAdjustingBatch] = React.useState(false);
  const [transferringBatch, setTransferringBatch] = React.useState(false);
  const [splittingBatch, setSplittingBatch] = React.useState(false);
  const [batchAdjustments, setBatchAdjustments] = React.useState([]);
  const [deathEvent, setDeathEvent] = React.useState(null);
  const deceased = isDeceasedStatus(animal.status);
  const [related, setRelated] = React.useState({ treatments: [], repro: [], production: [], documents: [], alerts: [], weighings: [], finance: null, loading: true });
  const [photos, setPhotos] = React.useState([]);
  React.useEffect(() => {
    if (readOnly && editing) setEditing(false);
  }, [readOnly, editing]);
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
  // Retrouver le dernier événement de mortalité lié pour afficher le commentaire
  // saisi lors de la déclaration, même si le lot reste vivant après un décès partiel.
  React.useEffect(() => {
    if (!animal._pk) { setDeathEvent(null); return; }
    let cancel = false;
    api.listMortalityEvents()
      .then((rows) => {
        if (cancel || !Array.isArray(rows)) return;
        const ev = rows
          .filter((r) => Number(r.animalId ?? r.animal_id) === Number(animal._pk))
          .sort((a, b) => String(b.eventDate || b.event_date || "").localeCompare(String(a.eventDate || a.event_date || "")))[0];
        setDeathEvent(ev || null);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [animal._pk, animal.status, animal.count]);
  const reloadBatchAdjustments = React.useCallback(() => {
    if (!animal._pk) { setBatchAdjustments([]); return; }
    api.listBatchAdjustments(animal._pk).then((rows) => setBatchAdjustments(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, [animal._pk]);
  React.useEffect(() => {
    reloadBatchAdjustments();
  }, [reloadBatchAdjustments]);
  React.useEffect(() => {
    if (!animal._pk) { setRelated({ treatments: [], repro: [], production: [], documents: [], alerts: [], weighings: [], finance: null, loading: false }); return; }
    let cancel = false;
    Promise.all([
      api.listTreatments(),
      api.listReproductionEvents(),
      api.listProductionLogs(),
      api.listDocuments(animal._pk).catch(() => []),
      api.getProfitability().catch(() => null),
      api.listWeighings(animal._pk).catch(() => []),
    ])
      .then(([t, r, p, docs, prof, weighings]) => {
        if (cancel) return;
        const matchAnimal = (row) => (row.animalId ?? row.animal_id) === animal._pk;
        const finance = prof && Array.isArray(prof.byAnimal)
          ? prof.byAnimal.find((x) => Number(x.animalId) === Number(animal._pk)) || null
          : null;
        // Alertes par animal : délai de retrait en cours (date calculée par le backend, portée par l'animal).
        const today = new Date().toISOString().slice(0, 10);
        const myTreatments = (Array.isArray(t) ? t : []).filter(matchAnimal);
        const alerts = [];
        const wd = animal.withdrawal;
        if (wd && wd.until && String(wd.until).slice(0, 10) >= today) {
          const kindLabel = wd.kind === "meat" ? (lang === "fr" ? "Retrait viande" : "Meat withdrawal")
            : wd.kind === "milk" ? (lang === "fr" ? "Retrait lait" : "Milk withdrawal")
            : wd.kind === "eggs" ? (lang === "fr" ? "Retrait œufs" : "Eggs withdrawal")
            : (lang === "fr" ? "Délai de retrait" : "Withdrawal period");
          alerts.push({ type: wd.kind || "withdrawal", until: wd.until, label: kindLabel });
        }
        setRelated({
          treatments: myTreatments,
          repro:      (Array.isArray(r) ? r : []).filter(matchAnimal),
          production: (Array.isArray(p) ? p : []).filter(matchAnimal),
          documents:  (Array.isArray(docs) ? docs : []),
          alerts,
          weighings:  (Array.isArray(weighings) ? weighings : []),
          finance,
          loading: false,
        });
      })
      .catch(() => setRelated((s) => ({ ...s, loading: false })));
    return () => { cancel = true; };
  }, [animal._pk, lang]);
  const onDelete = async () => {
    if (!animal._pk) return;
    if (readOnly) {
      window.alert(lockedAnimalMessage(lang));
      return;
    }
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
      {declaringDeath && (
        <DeathDeclareModal
          lang={lang}
          animal={animal}
          onClose={() => setDeclaringDeath(false)}
          onSaved={() => { setDeclaringDeath(false); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}
        />
      )}
      {adjustingBatch && (
        <BatchAdjustModal
          lang={lang}
          animal={animal}
          onClose={() => setAdjustingBatch(false)}
          onSaved={() => { setAdjustingBatch(false); reloadBatchAdjustments(); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}
        />
      )}
      {transferringBatch && (
        <BatchTransferModal
          lang={lang}
          animal={animal}
          onClose={() => setTransferringBatch(false)}
          onSaved={() => { setTransferringBatch(false); reloadBatchAdjustments(); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}
        />
      )}
      {splittingBatch && (
        <BatchSplitModal
          lang={lang}
          animal={animal}
          onClose={() => setSplittingBatch(false)}
          onSaved={() => { setSplittingBatch(false); reloadBatchAdjustments(); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}
        />
      )}

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
            {!readOnly && (
              <>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowQr(true)} title={lang === "fr" ? "Générer QR" : "Generate QR"}>
              <Icon name="qr" size={13} color="var(--ink-700)"/>
            </button>
            {animal._pk && (
              <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)} title={lang === "fr" ? "Modifier" : "Edit"}>
                <Icon name="edit" size={13} color="var(--ink-700)"/>
              </button>
            )}
            {animal._pk && (Math.floor(Number(animal.count ?? 0)) || 0) >= 1 && (
              <button className="btn btn-sm btn-ghost" onClick={() => setAdjustingBatch(true)} title={lang === "fr" ? "Ajuster le lot" : "Adjust batch"}>
                <Icon name="layers" size={13} color="var(--ink-700)"/>
              </button>
            )}
            {animal._pk && (Math.floor(Number(animal.count ?? 0)) || 0) >= 1 && (
              <button className="btn btn-sm btn-ghost" onClick={() => setTransferringBatch(true)} title={lang === "fr" ? "Transférer vers un autre lot" : "Transfer to another batch"}>
                <Icon name="arrowRight" size={13} color="var(--ink-700)"/>
              </button>
            )}
            {animal._pk && (Math.floor(Number(animal.count ?? 0)) || 0) >= 1 && (
              <button className="btn btn-sm btn-ghost" onClick={() => setSplittingBatch(true)} title={lang === "fr" ? "Sortir un individu du lot" : "Split individual from batch"}>
                <Icon name="user" size={13} color="var(--ink-700)"/>
              </button>
            )}
            {animal._pk && (
              <button className="btn btn-sm btn-ghost" onClick={() => setDeclaringDeath(true)} title={lang === "fr" ? "Déclarer le décès" : "Declare death"}>
                <Icon name="skull" size={13} color="var(--oxblood-700)"/>
              </button>
            )}
            {animal._pk && (
              <button className="btn btn-sm btn-ghost" onClick={onDelete} title={lang === "fr" ? "Supprimer" : "Delete"}>
                <Icon name="trash" size={13} color="var(--oxblood-700)"/>
              </button>
            )}
              </>
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
        {readOnly ? <SaleLockChip lang={lang} status={animal.status}/> : animal.withdrawal && <WithdrawalChip lang={lang} w={animal.withdrawal}/>}

        {/* Mortalité : commentaire saisi lors de la déclaration */}
        {deathEvent && (deathEvent.cause || deathEvent.notes) && (
          <div style={{ marginTop: 12, background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Icon name="skull" size={13} color="var(--oxblood-700)"/>
              <span style={{ fontSize: 10.5, color: "var(--oxblood-700)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
                {deceased ? (lang === "fr" ? "Décès déclaré" : "Death declared") : (lang === "fr" ? "Mortalité déclarée" : "Mortality declared")}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                {(() => {
                  const n = Number(deathEvent.count ?? 1) || 1;
                  return `${n} ${lang === "fr" ? (n > 1 ? "morts" : "mort") : (n > 1 ? "deaths" : "death")}`;
                })()}
              </span>
              {(deathEvent.eventDate || deathEvent.event_date) && (
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>{deathEvent.eventDate || deathEvent.event_date}</span>
              )}
            </div>
            {deathEvent.cause && (
              <div style={{ fontSize: 13, color: "var(--ink-900)", marginBottom: deathEvent.notes ? 4 : 0 }}>
                <span style={{ color: "var(--fg-3)" }}>{lang === "fr" ? "Cause : " : "Cause: "}</span>{deathEvent.cause}
              </div>
            )}
            {deathEvent.notes && (
              <div style={{ fontSize: 13, color: "var(--ink-900)", whiteSpace: "pre-wrap" }}>{deathEvent.notes}</div>
            )}
          </div>
        )}

        {/* Tabs — wrap sur plusieurs lignes : tous les onglets restent visibles
            sans scroll horizontal caché (peu découvrable sur panneau étroit). */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 4px", rowGap: 2, marginTop: 16, borderBottom: "1px solid var(--border-1)", marginLeft: -22, marginRight: -22, paddingLeft: 22, paddingRight: 22 }}>
          {[
            { id: "details",  fr: "Détails",       en: "Details",     count: null },
            { id: "health",   fr: "Santé",         en: "Health",      count: related.treatments.length },
            { id: "repro",    fr: "Reproduction",  en: "Reproduction", count: related.repro.length },
            { id: "prod",     fr: "Production",    en: "Production",  count: related.production.length },
            { id: "weight",   fr: "Poids",         en: "Weight",      count: related.weighings.length },
            { id: "finance",  fr: "Finances",      en: "Finance",     count: null },
            { id: "documents", fr: "Documents",    en: "Documents",   count: related.documents.length },
            { id: "history",  fr: "Historique",    en: "History",     count: related.treatments.length + related.repro.length + related.production.length },
            { id: "alerts",   fr: "Alertes",       en: "Alerts",      count: related.alerts.length },
          ].map((tb) => {
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                padding: "10px 14px", border: 0, background: "transparent", fontSize: 12.5, fontWeight: 500,
                color: active ? "var(--ink-950)" : "var(--ink-500)",
                borderBottom: active ? "2px solid var(--oxblood-700)" : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 5,
                flexShrink: 0, whiteSpace: "nowrap",
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
        {!readOnly && editing && (
          <AnimalEditCard lang={lang} animal={animal} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); window.dispatchEvent(new CustomEvent("farmos:animal-created")); }}/>
        )}
        {!editing && tab === "details" && (
          <>
            {(animal.motherId || animal.fatherId || animal.estimatedValue != null || (Math.floor(Number(animal.count ?? 0)) || 0) > 1) && (
              <div>
                <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Filiation & valeur" : "Lineage & value"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 12 }}>
                  {[
                    { fr: "Effectif du lot", en: "Batch size", icon: "layers", val: (Math.floor(Number(animal.count ?? 0)) || 0) > 1 ? `${(Math.floor(Number(animal.count)) || 0).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} ${lang === "fr" ? "animaux" : "animals"}` : null, mono: true },
                    { fr: "Mère", en: "Mother", icon: "fingerprint", val: animal.motherId },
                    { fr: "Père", en: "Father", icon: "fingerprint", val: animal.fatherId },
                    { fr: "Valeur estimée", en: "Estimated value", icon: "coins", val: animal.estimatedValue != null ? `${Number(animal.estimatedValue).toLocaleString("fr-CA")} $` : null, mono: true },
                  ].filter((f) => f.val != null && f.val !== "").map((f) => (
                    <div key={f.fr} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Icon name={f.icon} size={12} color="var(--fg-3)"/>
                        <span style={{ fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{lang === "fr" ? f.fr : f.en}</span>
                      </div>
                      <div className={f.mono ? "mono" : ""} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {batchAdjustments.length > 0 && (
              <div>
                <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Ajustements du lot" : "Batch adjustments"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {batchAdjustments.map((adj) => {
                    const delta = Number(adj.delta ?? 0);
                    const reasonDef = BATCH_ADJUSTMENT_REASONS.find((r) => r.value === (adj.reason || ""));
                    const reasonLabel = reasonDef ? (lang === "fr" ? reasonDef.fr : reasonDef.en) : (adj.reason || "");
                    return (
                      <div key={adj.id} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: delta >= 0 ? "var(--forest-700, #2f7a4d)" : "var(--oxblood-700)", minWidth: 42 }}>
                          {delta >= 0 ? `+${delta}` : delta}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: "var(--ink-900)" }}>{reasonLabel}</div>
                          {adj.notes && <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{adj.notes}</div>}
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                          {(adj.adjustmentDate || adj.adjustment_date || "").slice(0, 10)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
        {!editing && !readOnly && (tab === "health" || tab === "repro" || tab === "prod") && (
          <AddForAnimalButton lang={lang} tab={tab} animal={animal}/>
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
        {!editing && tab === "weight" && (
          <WeightTab lang={lang} animal={animal} weighings={related.weighings} loading={related.loading} readOnly={readOnly}
            onChanged={() => window.dispatchEvent(new CustomEvent("farmos:animal-created"))}/>
        )}
        {!editing && tab === "finance" && (() => {
          if (related.loading) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;
          const f = related.finance;
          if (!f) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Aucune donnée financière pour cet animal (ni vente ni dépense liée)." : "No financial data for this animal (no linked sale or expense)."}</div>;
          const money = (n) => `${Number(n || 0).toLocaleString("fr-CA")} $`;
          const cards = [
            { fr: "Revenus", en: "Revenue", val: f.revenue, color: "var(--money-500)" },
            { fr: "Coûts", en: "Costs", val: f.cost, color: "var(--rust-700)" },
            { fr: "Profit", en: "Profit", val: f.profit, color: f.profit >= 0 ? "var(--health-700)" : "var(--oxblood-700)" },
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {cards.map((c) => (
                  <div key={c.fr} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>{lang === "fr" ? c.fr : c.en}</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: c.color }}>{money(c.val)}</div>
                  </div>
                ))}
              </div>
              {f.costByCategory && Object.keys(f.costByCategory).length > 0 && (
                <div>
                  <div className="overline" style={{ marginBottom: 8 }}>{lang === "fr" ? "Coûts par catégorie" : "Costs by category"}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {Object.entries(f.costByCategory).map(([cat, amount], i, arr) => (
                      <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--border-1)" : "none" }}>
                        <span style={{ fontSize: 13, color: "var(--ink-900)" }}>{cat}</span>
                        <span className="mono" style={{ fontSize: 13 }}>{money(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {!editing && tab === "documents" && (() => {
          if (related.loading) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;
          if (related.documents.length === 0) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Aucun document pour cet animal." : "No document for this animal."}</div>;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {related.documents.map((d, i, arr) => (
                <button key={d.id} onClick={() => api.downloadDocument(d.id, d.fileName || d.file_name || d.title)}
                  style={{ textAlign: "left", border: 0, background: "transparent", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--border-1)" : "none", alignItems: "center", cursor: "pointer" }}>
                  <Icon name="report" size={14} color="var(--ink-700)"/>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--ink-900)" }}>{d.title || d.fileName || d.file_name || `#${d.id}`}</div>
                    {(d.docType || d.doc_type) && <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{d.docType || d.doc_type}</div>}
                  </div>
                  <Icon name="download" size={13} color="var(--ink-500)"/>
                </button>
              ))}
            </div>
          );
        })()}
        {!editing && tab === "alerts" && (() => {
          if (related.loading) return <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>;
          if (related.alerts.length === 0) return <div style={{ color: "var(--health-700)", fontSize: 13 }}>{lang === "fr" ? "Aucune alerte active (pas de délai de retrait en cours)." : "No active alert (no ongoing withdrawal period)."}</div>;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {related.alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--rust-50)", border: "1px solid var(--rust-200, var(--border-1))", borderRadius: 8 }}>
                  <Icon name="bell" size={15} color="var(--oxblood-700)"/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--oxblood-900, var(--ink-900))" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-2)" }}>{lang === "fr" ? "Jusqu'au" : "Until"} <span className="mono">{String(a.until).slice(0, 10)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
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

// Onglet Poids / croissance : courbe d'évolution + historique + saisie d'une pesée.
const WeightTab = ({ lang, animal, weighings, loading, onChanged, readOnly = false }) => {
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), weight: "" });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const rows = (weighings || []).slice().sort((a, b) => String(a.weighDate || a.weigh_date).localeCompare(String(b.weighDate || b.weigh_date)));
  const points = rows.map((w) => Number(w.weight)).filter((n) => !Number.isNaN(n));
  const submit = async () => {
    if (readOnly || saving || !animal._pk) return;
    if (form.weight === "" || Number(form.weight) <= 0) { setErr(lang === "fr" ? "Poids requis." : "Weight required."); return; }
    setSaving(true); setErr(null);
    try {
      await api.createWeighing({ animal_id: animal._pk, weigh_date: form.date, weight: Number(form.weight), weight_unit: "kg" });
      setForm({ date: new Date().toISOString().slice(0, 10), weight: "" });
      onChanged && onChanged();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const del = async (id) => {
    if (readOnly) return;
    if (!window.confirm(lang === "fr" ? "Supprimer cette pesée ?" : "Delete this weighing?")) return;
    try { await api.deleteWeighing(id); onChanged && onChanged(); } catch (e) { window.alert(e.message); }
  };
  // Mini-courbe SVG.
  const Curve = () => {
    if (points.length < 2) return null;
    const w = 280, h = 70, pad = 4;
    const min = Math.min(...points), max = Math.max(...points);
    const span = max - min || 1;
    const dx = (w - pad * 2) / (points.length - 1);
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * dx} ${h - pad - ((p - min) / span) * (h - pad * 2)}`).join(" ");
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--forest-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Saisie rapide */}
      {!readOnly && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 120px" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Date" : "Date"}</span>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 100px" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Poids (kg)" : "Weight (kg)"}</span>
          <input className="input mono" type="number" step="0.1" min="0" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}/>
        </label>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          <Icon name="plus" size={13} color="#ECF1EC"/>{saving ? "…" : (lang === "fr" ? "Pesée" : "Weigh-in")}
        </button>
        </div>
      )}
      {err && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{err}</div>}

      {loading && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>}
      {!loading && rows.length === 0 && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Aucune pesée enregistrée." : "No weighing recorded."}</div>}
      {!loading && rows.length > 0 && (
        <>
          {points.length >= 2 && (
            <div style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>{lang === "fr" ? "Courbe de croissance" : "Growth curve"}</div>
              <Curve/>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                <span className="mono">{Math.min(...points)} kg</span>
                <span className="mono">{Math.max(...points)} kg</span>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {rows.slice().reverse().map((w, i, arr) => (
              <div key={w.id} style={{ display: "grid", gridTemplateColumns: readOnly ? "auto 1fr auto" : "auto 1fr auto auto", gap: 10, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px dashed var(--border-1)" : "none", alignItems: "center" }}>
                <Icon name="weight" size={14} color="var(--ink-700)"/>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(w.weighDate || w.weigh_date).slice(0, 10)}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{Number(w.weight)} {w.weightUnit || w.weight_unit || "kg"}</span>
                {!readOnly && <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }} onClick={() => del(w.id)}><Icon name="trash" size={13} color="var(--oxblood-700)"/></button>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
    motherId: animal.motherId || "",
    fatherId: animal.fatherId || "",
    estimatedValue: animal.estimatedValue ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (saving || !animal._pk) return;
    if (!form.dob) { setErr(lang === "fr" ? "La date de naissance est obligatoire." : "Date of birth is required."); return; }
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
        mother_id: form.motherId || null,
        father_id: form.fatherId || null,
        estimated_value: form.estimatedValue === "" ? null : Number(form.estimatedValue),
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Race" : "Breed"}</span>
          <AutocompleteDB
            value={form.race || ""}
            onChange={(v) => set("race", v)}
            useLabel
            lang={lang}
            category="breed"
            scope={animal.species || animal.glyph}
            placeholder={lang === "fr" ? "Rechercher ou ajouter une race…" : "Search or add a breed…"}
          />
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Sexe" : "Sex"}</span>
          <input className="input" value={form.sex} onChange={(e) => set("sex", e.target.value)} placeholder="F / M"/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Date naissance" : "DOB"} <span style={{ color: "var(--oxblood-700)" }}>*</span></span>
          <input className="input" type="date" required value={form.dob || ""} onChange={(e) => set("dob", e.target.value)}/>
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
          <input className="input" value={form.lot} onChange={(e) => set("lot", e.target.value)} list="all-lots"
            placeholder={lang === "fr" ? "Choisir ou créer un lot…" : "Pick or create a lot…"}/>
          <AllLotsDataList/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Bâtiment" : "Barn"}</span>
          <input className="input" value={form.barn} onChange={(e) => set("barn", e.target.value)} list="all-barns"
            placeholder={lang === "fr" ? "Choisir un bâtiment…" : "Pick a building…"}/>
          <AllBarnsDataList/>
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
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Mère (ID / nom)" : "Mother (ID / name)"}</span>
          <input className="input" value={form.motherId} onChange={(e) => set("motherId", e.target.value)} placeholder={lang === "fr" ? "ex. BQ-2022-0007" : "e.g. BQ-2022-0007"}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Père (ID / nom)" : "Father (ID / name)"}</span>
          <input className="input" value={form.fatherId} onChange={(e) => set("fatherId", e.target.value)} placeholder={lang === "fr" ? "ex. BQ-2021-0003" : "e.g. BQ-2021-0003"}/>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Valeur estimée ($)" : "Estimated value ($)"}</span>
          <input className="input mono" type="number" step="0.01" min="0" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)}/>
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

const AllLotsDataList = () => {
  const [lots, setLots] = React.useState([]);
  React.useEffect(() => {
    api.listAnimals().then((rows) => {
      const set = new Set();
      (rows || []).forEach((a) => { const l = (a.lot || "").trim(); if (l) set.add(l); });
      setLots(Array.from(set).sort());
    }).catch(() => {});
  }, []);
  return (
    <datalist id="all-lots">
      {lots.map((l) => <option key={l} value={l}/>)}
    </datalist>
  );
};

const AllBarnsDataList = () => {
  const [barns, setBarns] = React.useState([]);
  React.useEffect(() => {
    api.listBuildings().then((rows) => {
      const seen = new Map();
      (rows || []).forEach((b) => {
        const name = (b.name || "").trim();
        if (name && !seen.has(name)) seen.set(name, b.zone?.name || "");
      });
      setBarns(Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0])));
    }).catch(() => {});
  }, []);
  return (
    <datalist id="all-barns">
      {barns.map(([name, zone]) => <option key={name} value={name} label={zone || undefined}/>)}
    </datalist>
  );
};

const AddForAnimalButton = ({ lang, tab, animal }) => {
  if (isSaleLockedAnimal(animal)) return null;
  const tabMap = { health: "health", repro: "repro", prod: "production" };
  const labels = {
    health:  { fr: "Ajouter un traitement / soin", en: "Add treatment / care" },
    repro:   { fr: "Ajouter un événement de repro", en: "Add reproduction event" },
    prod:    { fr: "Ajouter une production",        en: "Add production record" },
  };
  const onClick = () => {
    window.dispatchEvent(new CustomEvent("farmos:openEntry", {
      detail: {
        tab: tabMap[tab],
        species: animal.species,
        animalId: animal._pk,
        animalExternalId: animal.id,
      },
    }));
  };
  return (
    <button className="btn btn-sm btn-primary" onClick={onClick} style={{ alignSelf: "flex-start" }}>
      <Icon name="plus" size={13} color="#ECF1EC"/>
      {lang === "fr" ? labels[tab].fr : labels[tab].en}
    </button>
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

const SaleLockChip = ({ lang, status }) => (
  <div className="withdrawal-banner pulse-critical" style={{ marginTop: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
    <Icon name="shield" size={16} color="#ECF1EC"/>
    <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#ECF1EC" }}>
        {saleLockTitle(status, lang)}
      </div>
      <div style={{ fontSize: 11, color: "#F0D6CB", marginTop: 1 }}>
        {saleLockSubtitle(status, lang)}
      </div>
    </div>
  </div>
);

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
