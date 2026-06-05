import React from "react";

const DAY_MS = 86400000;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function presetRange(preset) {
  const today = startOfToday();
  const end = isoDate(today);
  if (preset === "all") return { from: "", to: "" };
  if (preset === "today") return { from: end, to: end };
  if (preset === "7d") return { from: isoDate(new Date(today.getTime() - 6 * DAY_MS)), to: end };
  if (preset === "30d") return { from: isoDate(new Date(today.getTime() - 29 * DAY_MS)), to: end };
  if (preset === "month") return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: end };
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    return { from: isoDate(new Date(today.getFullYear(), q, 1)), to: end };
  }
  if (preset === "year") return { from: isoDate(new Date(today.getFullYear(), 0, 1)), to: end };
  return { from: "", to: "" };
}

export function defaultDateRange(preset = "today") {
  return { preset, ...presetRange(preset) };
}

export function rangeLabel(range, lang = "fr") {
  const p = range?.preset || "today";
  const labels = {
    today: lang === "fr" ? "aujourd'hui" : "today",
    "7d": lang === "fr" ? "7 j" : "7d",
    "30d": lang === "fr" ? "30 j" : "30d",
    month: lang === "fr" ? "mois" : "month",
    quarter: lang === "fr" ? "trimestre" : "quarter",
    year: lang === "fr" ? "année" : "year",
    all: lang === "fr" ? "tout" : "all",
    custom: `${range?.from || "…"} → ${range?.to || "…"}`,
  };
  return labels[p] || labels.today;
}

export function inDateRange(value, range) {
  if (!value) return false;
  const iso = String(value).slice(0, 10);
  if (range?.from && iso < range.from) return false;
  if (range?.to && iso > range.to) return false;
  return true;
}

export function DateRangeFilter({ lang = "fr", value, onChange }) {
  const current = value || defaultDateRange();
  const setPreset = (preset) => onChange({ preset, ...presetRange(preset) });
  const setCustom = (patch) => onChange({ ...current, preset: "custom", ...patch });
  const presets = [
    ["today", lang === "fr" ? "Aujourd'hui" : "Today"],
    ["7d", "7 j"],
    ["30d", "30 j"],
    ["quarter", lang === "fr" ? "Trim." : "Qtr"],
    ["year", lang === "fr" ? "Année" : "Year"],
    ["all", lang === "fr" ? "Tout" : "All"],
  ];

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-sunken)", borderRadius: 6 }}>
        {presets.map(([id, label]) => (
          <button key={id} className="btn btn-sm" onClick={() => setPreset(id)}
            style={current.preset === id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : { background: "transparent", border: 0 }}>
            {label}
          </button>
        ))}
      </div>
      <input className="input" type="date" value={current.from || ""} onChange={(e) => setCustom({ from: e.target.value })}
        style={{ width: 138, height: 32, fontSize: 12 }}/>
      <span style={{ color: "var(--fg-3)", fontSize: 12 }}>→</span>
      <input className="input" type="date" value={current.to || ""} onChange={(e) => setCustom({ to: e.target.value })}
        style={{ width: 138, height: 32, fontSize: 12 }}/>
    </div>
  );
}
