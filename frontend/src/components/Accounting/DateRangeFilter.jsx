const DAY_MS = 86400000;

const isoDate = (d) => d.toISOString().slice(0, 10);

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Compute { from, to } ISO dates for a named preset.
export function presetRange(preset) {
  const today = startOfToday();
  const end = isoDate(today);
  if (preset === "all") return { from: "", to: "" };
  if (preset === "today") return { from: end, to: end };
  if (preset === "7d") return { from: isoDate(new Date(today.getTime() - 6 * DAY_MS)), to: end };
  if (preset === "30d") return { from: isoDate(new Date(today.getTime() - 29 * DAY_MS)), to: end };
  if (preset === "quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    return { from: isoDate(new Date(today.getFullYear(), q, 1)), to: end };
  }
  if (preset === "year") return { from: isoDate(new Date(today.getFullYear(), 0, 1)), to: end };
  return { from: "", to: "" };
}

export function defaultDateRange(preset = "year") {
  return { preset, ...presetRange(preset) };
}

const PRESETS = [
  ["today", "Aujourd'hui"],
  ["7d", "7 j"],
  ["30d", "30 j"],
  ["quarter", "Trim."],
  ["year", "Année"],
  ["all", "Tout"],
];

export default function DateRangeFilter({ value, onChange }) {
  const current = value || defaultDateRange();
  const setPreset = (preset) => onChange({ preset, ...presetRange(preset) });
  const setCustom = (patch) => onChange({ ...current, preset: "custom", ...patch });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-1 bg-ink-50 rounded-lg border border-ink-200">
        {PRESETS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={`text-sm rounded-md px-2.5 py-1 transition font-medium ${
              current.preset === id
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-white hover:text-ink-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={current.from || ""}
        onChange={(e) => setCustom({ from: e.target.value })}
        className="text-sm border border-ink-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
      />
      <span className="text-ink-400 text-sm">→</span>
      <input
        type="date"
        value={current.to || ""}
        onChange={(e) => setCustom({ to: e.target.value })}
        className="text-sm border border-ink-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
      />
    </div>
  );
}
