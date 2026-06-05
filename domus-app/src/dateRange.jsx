// Filtre de période global Domus — presets + plage personnalisée, partagé sur toutes les pages.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

const STORAGE_KEY = "domus-date-range";
const STORAGE_VERSION = 2;

export const DATE_PRESETS = [
  { id: "today", label: "Aujourd'hui" },
  { id: "7d", label: "7 j" },
  { id: "30d", label: "30 j" },
  { id: "quarter", label: "Trim." },
  { id: "year", label: "Année" },
  { id: "all", label: "Tout" },
];

const DateRangeContext = createContext(null);

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfQuarter(d) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}

export function parseDomusDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rangeForPreset(presetId) {
  const now = new Date();
  const end = todayISO();
  switch (presetId) {
    case "today":
      return { from: end, to: end };
    case "7d":
      return { from: addDaysISO(end, -6), to: end };
    case "30d":
      return { from: addDaysISO(end, -29), to: end };
    case "quarter": {
      const start = startOfQuarter(now);
      return { from: start.toISOString().slice(0, 10), to: end };
    }
    case "year": {
      const start = startOfYear(now);
      return { from: start.toISOString().slice(0, 10), to: end };
    }
    case "all":
    default:
      return { from: null, to: null };
  }
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === STORAGE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function saveStored(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: STORAGE_VERSION }));
  } catch {}
}

export function DateRangeProvider({ children }) {
  const stored = loadStored();
  const [preset, setPresetState] = useState(() => {
    const id = stored?.preset;
    // Par défaut : « Année » (filtre annuel) si aucune préférence stockée.
    return DATE_PRESETS.some((p) => p.id === id) ? id : "year";
  });
  const [customFrom, setCustomFrom] = useState(() => stored?.customFrom || todayISO());
  const [customTo, setCustomTo] = useState(() => stored?.customTo || todayISO());
  const [useCustom, setUseCustom] = useState(() => Boolean(stored?.useCustom));

  const persist = useCallback((next) => {
    saveStored(next);
  }, []);

  const setPreset = useCallback((id) => {
    if (!DATE_PRESETS.some((p) => p.id === id)) return;
    setPresetState(id);
    setUseCustom(false);
    const next = { preset: id, customFrom, customTo, useCustom: false };
    persist(next);
  }, [customFrom, customTo, persist]);

  const setCustomRange = useCallback((from, to) => {
    const f = from || todayISO();
    const t = to || f;
    const fromNorm = f <= t ? f : t;
    const toNorm = f <= t ? t : f;
    setCustomFrom(fromNorm);
    setCustomTo(toNorm);
    setUseCustom(true);
    persist({ preset, customFrom: fromNorm, customTo: toNorm, useCustom: true });
  }, [preset, persist]);

  const value = useMemo(() => {
    const presetRange = rangeForPreset(preset);
    const from = useCustom ? customFrom : presetRange.from;
    const to = useCustom ? customTo : presetRange.to;
    const active = preset !== "all" || useCustom;

    const inRange = (dateLike) => {
      if (!active) return true;
      const d = parseDomusDate(dateLike);
      if (!d) return false;
      const day = d.toISOString().slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    };

    const overlaps = (startLike, endLike) => {
      if (!active) return true;
      const start = parseDomusDate(startLike);
      const end = parseDomusDate(endLike) || start;
      if (!start && !end) return true;
      const s = (start || end).toISOString().slice(0, 10);
      const e = (end || start).toISOString().slice(0, 10);
      if (to && s > to) return false;
      if (from && e < from) return false;
      return true;
    };

    return {
      preset,
      useCustom,
      from,
      to,
      active,
      setPreset,
      setCustomRange,
      inRange,
      overlaps,
      label: active && from && to
        ? (from === to ? from : `${from} → ${to}`)
        : "Toute la période",
    };
  }, [preset, useCustom, customFrom, customTo]);

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

export function filterPayments(payments, range) {
  const list = (Array.isArray(payments) ? payments : []).filter(isVisibleRecord);
  if (!range?.active) return list;
  return list.filter((p) => range.inRange(p.paymentDate));
}

export function filterLeases(leases, range) {
  const list = (Array.isArray(leases) ? leases : []).filter((lease) => isVisibleRecord(lease) && lease.status !== "cancelled");
  if (!range?.active) return list;
  return list.filter((l) => range.overlaps(l.startDate, l.endDate));
}

export function filterTenants(tenants, range) {
  const list = (Array.isArray(tenants) ? tenants : []).filter(isVisibleRecord);
  return list;
}

export function tenantAnchorDate(t) {
  return t?.createdAt || t?.updatedAt;
}

export function filterProperties(properties) {
  return (Array.isArray(properties) ? properties : []).filter(isVisibleRecord);
}

export function filterUnits(units, properties = []) {
  const propertyIds = new Set(filterProperties(properties).map((property) => property.id));
  return (Array.isArray(units) ? units : []).filter((unit) => {
    if (!isVisibleRecord(unit)) return false;
    if (!propertyIds.size) return true;
    return propertyIds.has(unit.propertyId);
  });
}

export function isActiveFlag(value) {
  return value === undefined ||
    value === null ||
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true";
}

export function isVisibleRecord(record) {
  return Boolean(record) &&
    record.status !== "false" &&
    record.status !== false &&
    isActiveFlag(record.isActive);
}

export function DateRangeBar() {
  const { preset, from, to, useCustom, setPreset, setCustomRange } = useDateRange();

  return (
    <div className="domus-period-bar" role="group" aria-label="Filtrer par période">
      <div className="domus-period-presets">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`domus-period-preset ${!useCustom && preset === p.id ? "active" : ""}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="domus-period-custom">
        <input
          type="date"
          className="domus-period-date"
          value={from || todayISO()}
          max={to || undefined}
          onChange={(e) => setCustomRange(e.target.value, to || e.target.value)}
          aria-label="Date de début"
        />
        <ArrowRight size={14} className="domus-period-arrow" aria-hidden />
        <input
          type="date"
          className="domus-period-date"
          value={to || todayISO()}
          min={from || undefined}
          onChange={(e) => setCustomRange(from || e.target.value, e.target.value)}
          aria-label="Date de fin"
        />
      </div>
    </div>
  );
}
