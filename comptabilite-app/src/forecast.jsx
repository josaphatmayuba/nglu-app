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

// Modes = curseur d'hypothèse. Optimiste grisé tant que la couche 3 (IA) n'existe pas.
const MODES = [
  { v: "prudent", label: "Prudent", hint: "engagé seul", enabled: true },
  { v: "realiste", label: "Réaliste", hint: "+ tendance", enabled: true },
  { v: "optimiste", label: "Optimiste", hint: "+ IA (à venir)", enabled: false },
];

// Leviers de simulation "et si ?" (scope backend → libellé).
const SIM_LEVERS = [
  { scope: "domus", label: "Loyers" },
  { scope: "hr", label: "Salaires" },
  { scope: "ventes", label: "Ventes" },
  { scope: "farmos", label: "Ventes élevage" },
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
  const byCur = new Map(); // key -> { currencyId, code, points: [{month, net, cumul, low, high}] }
  for (const m of months) {
    for (const c of m.currencies) {
      const key = String(c.currencyId ?? "null");
      const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
      const entry = byCur.get(key) || { currencyId: c.currencyId ?? null, code, points: [] };
      const last = entry.points.length ? entry.points[entry.points.length - 1] : null;
      const prev = last ? last.cumul : 0;
      const prevLow = last ? last.low : 0;
      const prevHigh = last ? last.high : 0;
      const opening = Number(c.opening || 0);
      const net = Number(c.net || 0);
      const cumul = prev + opening + net;
      const low = prevLow + opening + Number(c.netLow ?? net);
      const high = prevHigh + opening + Number(c.netHigh ?? net);
      entry.points.push({ month: m.month, net, opening, cumul, low, high });
      byCur.set(key, entry);
    }
  }
  return [...byCur.values()];
}

/** Chemin lissé (Catmull-Rom → Bézier) pour des courbes douces façon "area chart". */
function smoothPath(coords) {
  if (coords.length < 2) return "";
  let d = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Graphe unique multi-devises en aires superposées translucides (façon maquette).
 * Compact (hauteur réduite). Le 1er point = solde RÉEL de départ (trait plein),
 * la suite = projection (trait pointillé), séparés par la ligne "aujourd'hui".
 */
function StackedChart({ series, colors }) {
  const W = 720, H = 230, padX = 12, padTop = 16, padBottom = 26;
  const drawn = series.filter((s) => s.points.length >= 2);
  if (drawn.length === 0) return <div className="muted" style={{ fontSize: 13, padding: "12px 0" }}>Pas assez de points pour tracer une courbe.</div>;
  const n = drawn[0].points.length;
  const months = drawn[0].points.map((p) => p.month);
  const allY = drawn.flatMap((s) => s.points.flatMap((p) => [p.cumul, p.low ?? p.cumul, p.high ?? p.cumul]));
  const min = Math.min(0, ...allY), max = Math.max(0, ...allY);
  const span = max - min || 1;
  const x = (i) => padX + (i * (W - 2 * padX)) / (n - 1);
  const y = (v) => H - padBottom - ((v - min) * (H - padTop - padBottom)) / span;
  const zeroY = y(0);
  const x0 = x(0); // "aujourd'hui" = point de départ réel

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label="Trésorerie projetée par devise">
      <defs>
        {drawn.map((s, i) => (
          <linearGradient key={s.code} id={`fc-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity="0.04" />
          </linearGradient>
        ))}
      </defs>

      {/* ligne du zéro */}
      <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="#e2e8f0" />
      {/* repère "aujourd'hui" */}
      <line x1={x0} y1={padTop} x2={x0} y2={H - padBottom} stroke="#cbd5e1" strokeDasharray="2 3" />
      <text x={x0 + 4} y={padTop + 9} fontSize="9" fill="#94a3b8">aujourd'hui</text>

      {drawn.map((s, i) => {
        const color = colors[i % colors.length];
        const coords = s.points.map((p, k) => [x(k), y(p.cumul)]);
        const linePath = smoothPath(coords);
        const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
        return (
          <g key={s.code}>
            <path d={areaPath} fill={`url(#fc-grad-${i})`} stroke="none" />
            {/* projection en pointillé */}
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.4" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
            {/* point de départ réel (plein, marqueur net) */}
            <circle cx={coords[0][0]} cy={coords[0][1]} r="4" fill={color} stroke="#fff" strokeWidth="1.5">
              <title>{`${monthLabel(s.points[0].month)} (réel) : ${fmtSigned(s.points[0].cumul)} ${s.code}`}</title>
            </circle>
            {/* point final projeté */}
            <circle cx={coords[n - 1][0]} cy={coords[n - 1][1]} r="4" fill="#fff" stroke={color} strokeWidth="2.2">
              <title>{`${monthLabel(s.points[n - 1].month)} (projeté) : ${fmtSigned(s.points[n - 1].cumul)} ${s.code}`}</title>
            </circle>
          </g>
        );
      })}

      {/* labels début / fin */}
      <text x={x(0)} y={H - 8} textAnchor="start" fontSize="10" fill="#94a3b8">{monthLabel(months[0])}</text>
      <text x={x(n - 1)} y={H - 8} textAnchor="end" fontSize="10" fill="#94a3b8">{monthLabel(months[n - 1])}</text>
    </svg>
  );
}

const SERIE_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed"];

export function Forecast() {
  const [horizon, setHorizon] = React.useState(3);
  const [mode, setMode] = React.useState("prudent");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showSim, setShowSim] = React.useState(false);
  const [sim, setSim] = React.useState({ domus: 0, hr: 0, ventes: 0, farmos: 0 });

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

  const [prod, setProd] = React.useState(null);
  React.useEffect(() => {
    api.forecastProduction({ horizon }).then(setProd).catch(() => setProd(null));
  }, [horizon]);

  const [variance, setVariance] = React.useState(null);
  const [trackMsg, setTrackMsg] = React.useState("");
  const loadVariance = React.useCallback(() => {
    api.forecastVariance({ scope: "ventes" }).then(setVariance).catch(() => setVariance(null));
  }, []);
  React.useEffect(() => { loadVariance(); }, [loadVariance]);
  const takeSnapshot = async () => {
    setTrackMsg("Enregistrement…");
    try {
      const r = await api.forecastSnapshot({ horizon: 6, mode: "realiste", scope: "ventes" });
      setTrackMsg(`Prévision figée (${r.saved} point${r.saved > 1 ? "s" : ""}).`);
      loadVariance();
    } catch (e) {
      setTrackMsg("Erreur : " + String(e.message || e));
    }
  };

  const series = React.useMemo(() => (data ? buildSeries(data.months) : []), [data]);
  const summary = series.map((s) => {
    const last = s.points[s.points.length - 1];
    return { code: s.code, cumul: last ? last.cumul : 0 };
  });
  const horizonLabel = HORIZONS.find((h) => h.v === horizon)?.label;

  const hasProd = prod && prod.series && prod.series.length > 0;
  const hasVarianceRows = variance && variance.rows && variance.rows.length > 0;

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <h2 className="font-display">Prévisionnel — Trésorerie</h2>
          <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
            Projection consolidée (tous modules), par devise. Aucune conversion entre devises.
          </p>
        </div>
      </div>

      {/* ── Barre de contrôles : horizon + hypothèse + bouton simulation ── */}
      <div className="card pad" style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Horizon</div>
          <div className="segtabs" style={{ margin: 0 }}>
            {HORIZONS.map((h) => (
              <button key={h.v} className={`segtab ${horizon === h.v ? "active" : ""}`} onClick={() => setHorizon(h.v)}>{h.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Hypothèse</div>
          <div className="segtabs" style={{ margin: 0 }}>
            {MODES.map((m) => (
              <button
                key={m.v}
                disabled={!m.enabled}
                title={m.enabled ? m.hint : `${m.hint} — disponible quand l'IA sera activée`}
                onClick={() => m.enabled && setMode(m.v)}
                className={`segtab ${mode === m.v ? "active" : ""}`}
                style={!m.enabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
              >
                {m.label} <span style={{ fontWeight: 400, opacity: 0.75 }}>· {m.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Simulation</div>
          <button className={`btn ${showSim || simActive ? "btn-accent grad-accent" : "btn-ghost"}`} onClick={() => setShowSim((v) => !v)} style={showSim || simActive ? { background: "linear-gradient(135deg,#3b82f6 0%,#2563eb 55%,#1d4ed8 100%)" } : undefined}>
            « Et si ? » {simActive ? `(${Object.values(sim).filter((p) => p !== 0).length})` : ""}
          </button>
        </div>
      </div>

      {/* ── Simulation "et si ?" — sliders repliables ── */}
      {showSim && (
        <div className="card pad info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>Simulation « et si ? »</strong>
            {simActive && (
              <button className="btn-sm" onClick={() => setSim({ domus: 0, hr: 0, ventes: 0, farmos: 0 })}>Réinitialiser</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "6px 24px" }}>
            {SIM_LEVERS.map((lv) => (
              <div key={lv.scope} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <span style={{ width: 96, fontSize: 13 }}>{lv.label}</span>
                <input
                  type="range" min={-50} max={50} step={5}
                  value={sim[lv.scope]}
                  onChange={(e) => setSim((s) => ({ ...s, [lv.scope]: Number(e.target.value) }))}
                  style={{ flex: 1, minWidth: 100, accentColor: "#2563eb" }}
                />
                <span style={{ width: 46, textAlign: "right", fontSize: 13, fontWeight: 700, color: sim[lv.scope] > 0 ? "var(--emerald-600)" : sim[lv.scope] < 0 ? "var(--rose-600)" : "var(--ink-400)" }}>
                  {sim[lv.scope] > 0 ? "+" : ""}{sim[lv.scope]}%
                </span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11, margin: "8px 0 0" }}>
            Ajuste les flux projetés (le solde de départ réel n'est jamais modifié). Les ventes ne s'appliquent qu'en mode Réaliste.
          </p>
        </div>
      )}

      {loading && <div className="card pad muted">Calcul de la projection…</div>}
      {error && <div className="card pad danger">Erreur : {error}</div>}

      {!loading && !error && data && (
        <>
          {summary.length === 0 ? (
            <div className="card pad muted">
              Aucune donnée engagée à projeter sur cet horizon. Ajoutez des baux actifs (Domus), des contrats RH ou des factures pour voir une projection.
            </div>
          ) : (
            <>
              {/* ── Phrase-réponse + cartes KPI par devise ── */}
              <div className="card pad">
                <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                  À ce rythme, votre trésorerie projetée à <strong>{horizonLabel}</strong> serait de{" "}
                  {summary.map((s, i) => (
                    <strong key={s.code} style={{ color: s.cumul >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>
                      {i > 0 ? " et " : ""}{fmtSigned(s.cumul)} {s.code}
                    </strong>
                  ))}.
                </div>
                <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                  {series.map((s, i) => {
                    const last = s.points[s.points.length - 1];
                    const first = s.points[0];
                    const delta = last && first ? last.cumul - (first.opening || first.cumul) : 0;
                    return (
                      <div key={s.code} className="card pad" style={{ borderRadius: 14, background: "var(--ink-50)" }}>
                        <div className="kpi-label">Trésorerie projetée · {s.code}</div>
                        <div className="kpi-value" style={{ color: SERIE_COLORS[i % SERIE_COLORS.length] }}>{fmtSigned(last ? last.cumul : 0)} {s.code}</div>
                        <div className={`kpi-sub ${delta >= 0 ? "up" : "down"}`}>{fmtSigned(delta)} {s.code} sur {horizonLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Graphe unique : toutes les devises en aires superposées ── */}
              <div className="card pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                  <strong className="font-display" style={{ fontSize: 15 }}>Trésorerie projetée</strong>
                  <span className={`chip ${mode === "prudent" ? "accent-soft" : "amber"}`}>{mode === "prudent" ? "certain · engagé" : "engagé + tendance"}</span>
                </div>
                <p className="muted" style={{ fontSize: 11, margin: "0 0 6px" }}>
                  Point plein = solde réel actuel · trait pointillé = projection. Une courbe par devise (sans conversion).
                </p>
                {/* légende devises */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", margin: "0 0 6px" }}>
                  {series.filter((s) => s.points.length >= 2).map((s, i) => (
                    <span key={s.code} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: SERIE_COLORS[i % SERIE_COLORS.length], opacity: 0.85 }} />
                      {s.code}
                    </span>
                  ))}
                </div>
                <StackedChart series={series} colors={SERIE_COLORS} />
              </div>

              {/* ── Détail mensuel repliable ── */}
              {data.months.length > 0 && (
                <details className="card pad">
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }} className="font-display">Détail mensuel</summary>
                  <div style={{ marginTop: 8 }}>
                    {data.months.map((m) => (
                      <div key={m.month} style={{ borderTop: "1px solid var(--ink-100)", padding: "10px 0" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{monthLabel(m.month)}</div>
                        {m.currencies.map((c) => {
                          const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
                          return (
                            <div key={code} style={{ marginLeft: 8, marginBottom: 6 }}>
                              {Number(c.opening || 0) !== 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                  <span className="muted">Solde de départ {code}</span>
                                  <strong>{fmtSigned(c.opening)} {code}</strong>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span className="muted">Variation nette {code}</span>
                                <strong style={{ color: c.net >= 0 ? "var(--emerald-600)" : "var(--rose-600)" }}>{fmtSigned(c.net)} {code}</strong>
                              </div>
                              {c.lines.map((l, idx) => {
                                const isCertain = l.confidence === "certain";
                                const badge = isCertain ? "certain" : (/réf|estimé/i.test(l.basis) ? l.basis : "estimé");
                                return (
                                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--ink-500)", marginLeft: 8, padding: "1px 0" }}>
                                    <span>{l.amount >= 0 ? "+ " : "− "}{l.source} <em style={{ opacity: 0.7 }}>· {l.basis}</em></span>
                                    <span className={`chip ${isCertain ? "emerald-soft" : "ink"}`} style={{ flex: "none" }}>{badge}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}

      {/* ── Projection de production (masquée si vide) ── */}
      {hasProd && (
        <div className="card pad">
          <strong className="font-display" style={{ fontSize: 15 }}>Projection de production</strong>
          {prod.series.map((s) => {
            const total = s.points.reduce((t, p) => t + Number(p.value || 0), 0);
            const label = s.kind === "eggs" ? "Œufs" : "Naissances";
            const isCertain = s.points[0]?.confidence === "certain";
            const color = s.kind === "eggs" ? "var(--amber-500)" : "var(--emerald-500)";
            return (
              <div key={s.kind} style={{ borderTop: "1px solid var(--ink-100)", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <strong>{label}</strong>
                  <span>
                    ~{nf.format(Math.round(total))} {s.unit} sur l'horizon{" "}
                    <span className={`chip ${isCertain ? "emerald-soft" : "ink"}`}>{isCertain ? "certain" : "estimé"}</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "flex-end", height: 44 }}>
                  {s.points.map((p) => {
                    const max = Math.max(...s.points.map((x) => Number(x.value || 0)), 1);
                    const h = Math.max(3, (Number(p.value || 0) / max) * 40);
                    return (
                      <div key={p.month} title={`${monthLabel(p.month)} : ${nf.format(Math.round(p.value))} ${s.unit}`}
                        style={{ flex: 1, height: h, background: color, borderRadius: 3, opacity: 0.85 }} />
                    );
                  })}
                </div>
                <p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{s.points[0]?.basis}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Suivi prévu vs réel (boucle d'apprentissage) ── */}
      <div className={`card pad ${variance && variance.avgBiasPct != null && Math.abs(variance.avgBiasPct) > 10 ? "warn" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong className="font-display" style={{ fontSize: 15 }}>Suivi prévu vs réel — ventes</strong>
          <button className="btn-sm grad-accent" onClick={takeSnapshot}>Figer la prévision du jour</button>
        </div>
        {trackMsg && <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>{trackMsg}</p>}

        {variance && variance.avgBiasPct != null && (
          <div className={`card pad ${Math.abs(variance.avgBiasPct) > 10 ? "warn" : "good"}`} style={{ marginTop: 10, fontSize: 13 }}>
            {variance.avgBiasPct > 10
              ? `⚠ En moyenne, le réel dépasse la prévision de ${variance.avgBiasPct}% (sous-estimation) — la prochaine projection sera ajustée à la hausse.`
              : variance.avgBiasPct < -10
                ? `⚠ En moyenne, le réel est inférieur de ${Math.abs(variance.avgBiasPct)}% à la prévision (surestimation) — projection à ajuster à la baisse.`
                : `✅ Prévisions calibrées : écart moyen de ${variance.avgBiasPct}% (dans la marge).`}
          </div>
        )}

        {hasVarianceRows ? (
          <div style={{ marginTop: 10 }}>
            {variance.rows.map((r, i) => {
              const code = r.currencyCode || "?";
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid var(--ink-100)", padding: "7px 0" }}>
                  <span className="muted">{monthLabel(r.month)} · {code}</span>
                  <span>
                    prévu <strong>{fmtSigned(r.predicted)}</strong> · réel <strong>{fmtSigned(r.actual)}</strong>{" "}
                    <span style={{ color: r.diff >= 0 ? "var(--emerald-600)" : "var(--rose-600)", fontWeight: 600 }}>
                      ({r.pct != null ? `${r.pct > 0 ? "+" : ""}${r.pct}%` : "—"})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
            Aucun historique de prévision encore comparable. Figez la prévision du jour : les mois écoulés seront comparés au réel ici.
          </p>
        )}
      </div>
    </div>
  );
}
