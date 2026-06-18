import React from "react";
import { api } from "./api.js";
import { cleanCurrencySymbol } from "./currency.js";

const HORIZONS = [
  { v: 1, label: "1 mois" },
  { v: 3, label: "3 mois" },
  { v: 6, label: "6 mois" },
  { v: 12, label: "1 an" },
  { v: 24, label: "2 ans" },
  { v: 36, label: "3 ans" },
];

// Modes = curseur d'hypothèse. Réaliste/Optimiste grisés tant que les couches
// 2/3 (tendance, IA) n'existent pas côté backend (cf design : producteurs N1 seuls).
const MODES = [
  { v: "prudent", label: "Prudent", hint: "engagé seulement", enabled: true },
  { v: "realiste", label: "Réaliste", hint: "+ tendance", enabled: true },
  { v: "optimiste", label: "Optimiste", hint: "+ IA (à venir)", enabled: false },
];

// Leviers de simulation "et si ?" (scope backend → libellé).
const SIM_LEVERS = [
  { scope: "domus", label: "Loyers" },
  { scope: "hr", label: "Salaires" },
  { scope: "ventes", label: "Ventes" },
];

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmtSigned = (v) => (v > 0 ? "+" : "") + nf.format(Math.round(Number(v || 0)));

function monthLabel(key) {
  const [y, m] = key.split("-");
  const names = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  return `${names[Number(m) - 1]} ${y}`;
}

/**
 * Regroupe les mois renvoyés par l'API en séries cumulées PAR DEVISE.
 * Aucune conversion : chaque devise est une courbe indépendante (règle SIFA).
 */
function buildSeries(months) {
  const byCur = new Map(); // key -> { currencyId, code, points: [{month, net, cumul}] }
  for (const m of months) {
    for (const c of m.currencies) {
      const key = String(c.currencyId ?? "null");
      const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
      const entry = byCur.get(key) || { currencyId: c.currencyId ?? null, code, points: [] };
      const prev = entry.points.length ? entry.points[entry.points.length - 1].cumul : 0;
      // Le solde d'ouverture (opening) pose le point de départ ; net = flux du mois.
      const opening = Number(c.opening || 0);
      const cumul = prev + opening + Number(c.net || 0);
      entry.points.push({ month: m.month, net: c.net, opening, cumul });
      byCur.set(key, entry);
    }
  }
  return [...byCur.values()];
}

/** Mini-graphe SVG (cumul par devise) — pas de dépendance, tactile-friendly. */
function MiniChart({ serie }) {
  const W = 520, H = 160, pad = 28;
  const pts = serie.points;
  if (pts.length < 2) return <div className="muted" style={{ fontSize: 13 }}>Pas assez de points pour tracer une courbe.</div>;
  const ys = pts.map((p) => p.cumul);
  const min = Math.min(0, ...ys), max = Math.max(0, ...ys);
  const span = max - min || 1;
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) * (H - 2 * pad)) / span;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumul).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`Courbe ${serie.code}`}>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#cbd5e1" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={p.month} cx={x(i)} cy={y(p.cumul)} r="3.5" fill="#6366f1">
          <title>{`${monthLabel(p.month)} : ${fmtSigned(p.cumul)} ${serie.code}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function Forecast() {
  const [horizon, setHorizon] = React.useState(3);
  const [mode, setMode] = React.useState("prudent");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  // Simulation "et si ?" : pourcentage d'ajustement par scope (0 = inchangé).
  const [sim, setSim] = React.useState({ domus: 0, hr: 0, ventes: 0 });

  // Chaîne "domus:1.1,hr:0.9,compta:1" pour le backend (facteur = 1 + %/100).
  const adjust = React.useMemo(() => {
    const parts = Object.entries(sim)
      .filter(([, pct]) => pct !== 0)
      .map(([scope, pct]) => `${scope}:${(1 + pct / 100).toFixed(2)}`);
    return parts.join(",");
  }, [sim]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api.forecastCashFlow({ horizon, mode, scope: "all", adjust })
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [horizon, mode, adjust]);

  const simActive = adjust !== "";

  const series = React.useMemo(() => (data ? buildSeries(data.months) : []), [data]);

  // Phrase-réponse : net total projeté par devise sur l'horizon.
  const summary = series.map((s) => {
    const last = s.points[s.points.length - 1];
    return { code: s.code, cumul: last ? last.cumul : 0 };
  });

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h2 className="font-display">Prévisionnel — Trésorerie</h2>
          <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
            Projection consolidée (tous modules), par devise. Aucune conversion entre devises.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted" style={{ fontSize: 12 }}>Horizon</label>
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="input">
            {HORIZONS.map((h) => <option key={h.v} value={h.v}>{h.label}</option>)}
          </select>
        </div>
      </div>

      {/* Curseur d'hypothèse */}
      <div className="card pad" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>Hypothèse :</span>
        {MODES.map((m) => (
          <button
            key={m.v}
            disabled={!m.enabled}
            title={m.enabled ? m.hint : `${m.hint} — disponible quand la tendance sera activée`}
            onClick={() => m.enabled && setMode(m.v)}
            className={`chip ${mode === m.v ? "active" : ""}`}
            style={{ opacity: m.enabled ? 1 : 0.45, cursor: m.enabled ? "pointer" : "not-allowed", padding: "6px 12px", borderRadius: 999 }}
          >
            {m.label} <span style={{ fontSize: 11, opacity: 0.7 }}>· {m.hint}</span>
          </button>
        ))}
      </div>

      {/* Simulation "et si ?" — sliders qui recalculent la courbe en direct */}
      <div className="card pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 14 }}>Simulation « et si ? »</strong>
          {simActive && (
            <button className="chip" style={{ padding: "4px 10px", borderRadius: 999 }} onClick={() => setSim({ domus: 0, hr: 0, ventes: 0 })}>
              Réinitialiser
            </button>
          )}
        </div>
        {SIM_LEVERS.map((lv) => (
          <div key={lv.scope} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <span style={{ width: 90, fontSize: 13 }}>{lv.label}</span>
            <input
              type="range" min={-50} max={50} step={5}
              value={sim[lv.scope]}
              onChange={(e) => setSim((s) => ({ ...s, [lv.scope]: Number(e.target.value) }))}
              style={{ flex: 1, minWidth: 120 }}
            />
            <span style={{ width: 48, textAlign: "right", fontSize: 13, fontWeight: 600, color: sim[lv.scope] > 0 ? "#16a34a" : sim[lv.scope] < 0 ? "#dc2626" : "#64748b" }}>
              {sim[lv.scope] > 0 ? "+" : ""}{sim[lv.scope]}%
            </span>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 11, margin: "6px 0 0" }}>
          Ajuste les flux projetés (le solde de départ réel n'est jamais modifié). Les ventes ne s'appliquent qu'en mode Réaliste.
        </p>
      </div>

      {loading && <div className="card pad muted">Calcul de la projection…</div>}
      {error && <div className="card pad danger">Erreur : {error}</div>}

      {!loading && !error && data && (
        <>
          {/* Phrase-réponse en langage clair */}
          <div className="card pad">
            {summary.length === 0 ? (
              <span className="muted">Aucune donnée engagée à projeter sur cet horizon. Ajoutez des baux actifs (Domus) pour voir une projection.</span>
            ) : (
              <span>
                À ce rythme, votre trésorerie projetée à {HORIZONS.find((h) => h.v === horizon)?.label} serait de{" "}
                {summary.map((s, i) => (
                  <strong key={s.code} style={{ color: s.cumul >= 0 ? "#16a34a" : "#dc2626" }}>
                    {i > 0 ? " et " : ""}{fmtSigned(s.cumul)} {s.code}
                  </strong>
                ))}.
              </span>
            )}
          </div>

          {/* Une courbe par devise */}
          {series.map((s) => (
            <div className="card pad" key={s.code}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <strong>{s.code}</strong>
                <span className="chip" style={{ fontSize: 11 }}>{mode === "prudent" ? "certain · engagé" : "engagé + tendance"}</span>
              </div>
              <MiniChart serie={s} />
            </div>
          ))}

          {/* Détail mois par mois */}
          {data.months.length > 0 && (
            <div className="card pad">
              <h3 className="font-display" style={{ fontSize: 15, marginTop: 0 }}>Détail mensuel</h3>
              {data.months.map((m) => (
                <div key={m.month} style={{ borderTop: "1px solid #eef2f7", padding: "8px 0" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{monthLabel(m.month)}</div>
                  {m.currencies.map((c) => {
                    const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
                    return (
                      <div key={code} style={{ marginLeft: 8 }}>
                        {Number(c.opening || 0) !== 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span className="muted">Solde de départ {code}</span>
                            <strong>{fmtSigned(c.opening)} {code}</strong>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span className="muted">Variation nette {code}</span>
                          <strong style={{ color: c.net >= 0 ? "#16a34a" : "#dc2626" }}>{fmtSigned(c.net)} {code}</strong>
                        </div>
                        {c.lines.map((l, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginLeft: 8 }}>
                            <span>{l.amount >= 0 ? "+ " : "− "}{l.source} <em style={{ opacity: 0.7 }}>· {l.basis}</em></span>
                            <span>[{l.confidence === "certain" ? "certain" : "estimé"}]</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
