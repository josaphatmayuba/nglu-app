// Domus — Prévisionnel (loyers). Réutilise le moteur forecast backend2 avec
// scope figé "domus" : la projection ne montre que les loyers des baux actifs.
// Composant adapté de comptabilite-app/src/forecast.jsx (pas de code partagé
// entre apps : chaque app est un build Vite isolé → copie ciblée par scope).
import React from "react";
import { api } from "../api.js";
import { cleanCurrencySymbol } from "../data.js";

const HORIZONS = [
  { v: 1, label: "1 mois" }, { v: 3, label: "3 mois" }, { v: 6, label: "6 mois" },
  { v: 12, label: "1 an" }, { v: 24, label: "2 ans" }, { v: 36, label: "3 ans" },
];
const MODES = [
  { v: "prudent", label: "Prudent", hint: "engagé seul", enabled: true },
  { v: "realiste", label: "Réaliste", hint: "+ tendance", enabled: true },
  { v: "optimiste", label: "Optimiste", hint: "+ IA (à venir)", enabled: false },
];

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmtSigned = (v) => (v > 0 ? "+" : "") + nf.format(Math.round(Number(v || 0)));
function monthLabel(key) {
  const [y, m] = key.split("-");
  const names = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  return `${names[Number(m) - 1]} ${y}`;
}

function buildSeries(months) {
  const byCur = new Map();
  for (const m of months) {
    for (const c of m.currencies) {
      const key = String(c.currencyId ?? "null");
      const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
      const entry = byCur.get(key) || { currencyId: c.currencyId ?? null, code, points: [] };
      const last = entry.points.length ? entry.points[entry.points.length - 1] : null;
      const prev = last ? last.cumul : 0, prevLow = last ? last.low : 0, prevHigh = last ? last.high : 0;
      const opening = Number(c.opening || 0), net = Number(c.net || 0);
      const cumul = prev + opening + net;
      const low = prevLow + opening + Number(c.netLow ?? net);
      const high = prevHigh + opening + Number(c.netHigh ?? net);
      entry.points.push({ month: m.month, net, opening, cumul, low, high });
      byCur.set(key, entry);
    }
  }
  return [...byCur.values()];
}

function MiniChart({ serie, color = "#7c3aed" }) {
  const W = 560, H = 170, pad = 30;
  const pts = serie.points;
  if (pts.length < 2) return <div className="muted" style={{ fontSize: 13, padding: "12px 0" }}>Pas assez de points pour tracer une courbe.</div>;
  const ys = pts.flatMap((p) => [p.cumul, p.low ?? p.cumul, p.high ?? p.cumul]);
  const min = Math.min(0, ...ys), max = Math.max(0, ...ys), span = max - min || 1;
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) * (H - 2 * pad)) / span;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumul).toFixed(1)}`).join(" ");
  const areaFill = `${line} L${x(pts.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const hasBand = pts.some((p) => (p.high ?? p.cumul) !== (p.low ?? p.cumul));
  const bandUp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.high ?? p.cumul).toFixed(1)}`).join(" ");
  const bandDown = pts.map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)},${y(pts[pts.length - 1 - i].low ?? pts[pts.length - 1 - i].cumul).toFixed(1)}`).join(" ");
  const zeroY = y(0), gid = `g-${serie.code}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }} role="img" aria-label={`Courbe ${serie.code}`}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#cbd5e1" strokeDasharray="3 3" />
      <path d={areaFill} fill={`url(#${gid})`} stroke="none" />
      {hasBand && <path d={`${bandUp} ${bandDown} Z`} fill={color} opacity="0.10" stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={p.month} cx={x(i)} cy={y(p.cumul)} r="3.5" fill="#fff" stroke={color} strokeWidth="2">
          <title>{`${monthLabel(p.month)} : ${fmtSigned(p.cumul)} ${serie.code}`}</title>
        </circle>
      ))}
      {pts.map((p, i) => (i === 0 || i === pts.length - 1) && (
        <text key={`x-${p.month}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "end"} fontSize="10" fill="#94a3b8">{monthLabel(p.month)}</text>
      ))}
    </svg>
  );
}

// Onglet pilule (Domus n'a pas la classe .segtab → style inline réutilisable).
function Seg({ active, disabled, onClick, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        border: active ? 0 : "1px solid var(--ink-200, #e2e8f0)",
        background: active ? "linear-gradient(135deg,#7c3aed 0%,#6d28d9 55%,#5b21b6 100%)" : "#fff",
        color: active ? "#fff" : "var(--ink-600, #475569)",
      }}>{children}</button>
  );
}

const SERIE_COLORS = ["#7c3aed", "#2563eb", "#059669", "#d97706"];

export function Forecast() {
  const [horizon, setHorizon] = React.useState(3);
  const [mode, setMode] = React.useState("prudent");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showSim, setShowSim] = React.useState(false);
  const [rentPct, setRentPct] = React.useState(0); // levier loyers (scope domus)

  const adjust = rentPct !== 0 ? `domus:${(1 + rentPct / 100).toFixed(2)}` : "";

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    api.forecastCashFlow({ horizon, mode, scope: "domus", adjust })
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [horizon, mode, adjust]);

  const [variance, setVariance] = React.useState(null);
  const [trackMsg, setTrackMsg] = React.useState("");
  const loadVariance = React.useCallback(() => {
    api.forecastVariance({ scope: "domus" }).then(setVariance).catch(() => setVariance(null));
  }, []);
  React.useEffect(() => { loadVariance(); }, [loadVariance]);
  const takeSnapshot = async () => {
    setTrackMsg("Enregistrement…");
    try {
      const r = await api.forecastSnapshot({ horizon: 6, mode: "realiste", scope: "domus" });
      setTrackMsg(`Prévision figée (${r.saved} point${r.saved > 1 ? "s" : ""}).`);
      loadVariance();
    } catch (e) { setTrackMsg("Erreur : " + String(e.message || e)); }
  };

  const series = React.useMemo(() => (data ? buildSeries(data.months) : []), [data]);
  const summary = series.map((s) => { const last = s.points[s.points.length - 1]; return { code: s.code, cumul: last ? last.cumul : 0 }; });
  const horizonLabel = HORIZONS.find((h) => h.v === horizon)?.label;
  const hasVarianceRows = variance && variance.rows && variance.rows.length > 0;

  return (
    <div className="view">
      <div style={{ marginBottom: 14 }}>
        <h2 className="font-display" style={{ margin: 0 }}>Prévisionnel — Loyers</h2>
        <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
          Projection des loyers à venir (baux actifs), par devise. Aucune conversion entre devises.
        </p>
      </div>

      {/* Contrôles */}
      <div className="card" style={{ padding: 18, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Horizon</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HORIZONS.map((h) => <Seg key={h.v} active={horizon === h.v} onClick={() => setHorizon(h.v)}>{h.label}</Seg>)}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Hypothèse</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <Seg key={m.v} active={mode === m.v} disabled={!m.enabled}
                title={m.enabled ? m.hint : `${m.hint} — à venir`} onClick={() => m.enabled && setMode(m.v)}>
                {m.label} <span style={{ fontWeight: 400, opacity: 0.75 }}>· {m.hint}</span>
              </Seg>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Simulation</div>
          <Seg active={showSim || rentPct !== 0} onClick={() => setShowSim((v) => !v)}>« Et si ? »</Seg>
        </div>
      </div>

      {showSim && (
        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>Simulation « et si ? » — loyers</strong>
            {rentPct !== 0 && <button className="btn" style={{ height: 28, fontSize: 12 }} onClick={() => setRentPct(0)}>Réinitialiser</button>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 96, fontSize: 13 }}>Loyers</span>
            <input type="range" min={-50} max={50} step={5} value={rentPct}
              onChange={(e) => setRentPct(Number(e.target.value))} style={{ flex: 1, minWidth: 120, accentColor: "#7c3aed" }} />
            <span style={{ width: 46, textAlign: "right", fontSize: 13, fontWeight: 700, color: rentPct > 0 ? "#059669" : rentPct < 0 ? "#e11d48" : "#94a3b8" }}>
              {rentPct > 0 ? "+" : ""}{rentPct}%
            </span>
          </div>
          <p className="muted" style={{ fontSize: 11, margin: "8px 0 0" }}>Ajuste les loyers projetés (le solde de départ réel n'est jamais modifié).</p>
        </div>
      )}

      {loading && <div className="card" style={{ padding: 18 }}><span className="muted">Calcul de la projection…</span></div>}
      {error && <div className="card" style={{ padding: 18, color: "#e11d48" }}>Erreur : {error}</div>}

      {!loading && !error && data && (
        summary.length === 0 ? (
          <div className="card" style={{ padding: 18 }}><span className="muted">Aucun loyer engagé à projeter sur cet horizon. Activez des baux pour voir une projection.</span></div>
        ) : (
          <>
            <div className="card" style={{ padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                À ce rythme, les loyers projetés à <strong>{horizonLabel}</strong> représentent{" "}
                {summary.map((s, i) => (
                  <strong key={s.code} style={{ color: s.cumul >= 0 ? "#059669" : "#e11d48" }}>
                    {i > 0 ? " et " : ""}{fmtSigned(s.cumul)} {s.code}
                  </strong>
                ))}.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
                {series.map((s, i) => {
                  const last = s.points[s.points.length - 1], first = s.points[0];
                  const delta = last && first ? last.cumul - (first.opening || first.cumul) : 0;
                  return (
                    <div key={s.code} className="card" style={{ padding: 16, borderRadius: 14, background: "var(--ink-50, #f8fafc)" }}>
                      <div className="kpi-label">Loyers projetés · {s.code}</div>
                      <div className="kpi-value" style={{ color: SERIE_COLORS[i % SERIE_COLORS.length] }}>{fmtSigned(last ? last.cumul : 0)} {s.code}</div>
                      <div className="kpi-sub" style={{ color: delta >= 0 ? "#059669" : "#e11d48" }}>{fmtSigned(delta)} {s.code} sur {horizonLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {series.map((s, i) => (
              <div className="card" style={{ padding: 18, marginBottom: 14 }} key={s.code}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <strong className="font-display" style={{ fontSize: 15 }}>Loyers projetés · {s.code}</strong>
                  <span className="chip">{mode === "prudent" ? "certain · engagé" : "engagé + tendance"}</span>
                </div>
                <MiniChart serie={s} color={SERIE_COLORS[i % SERIE_COLORS.length]} />
              </div>
            ))}

            {data.months.length > 0 && (
              <details className="card" style={{ padding: 18, marginBottom: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }} className="font-display">Détail mensuel</summary>
                <div style={{ marginTop: 8 }}>
                  {data.months.map((m) => (
                    <div key={m.month} style={{ borderTop: "1px solid var(--ink-100, #f1f5f9)", padding: "10px 0" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{monthLabel(m.month)}</div>
                      {m.currencies.map((c) => {
                        const code = cleanCurrencySymbol({ currencyCode: c.currencyCode, currencySymbol: c.currencySymbol }) || "?";
                        return (
                          <div key={code} style={{ marginLeft: 8, marginBottom: 6 }}>
                            {Number(c.opening || 0) !== 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                <span className="muted">Solde de départ {code}</span><strong>{fmtSigned(c.opening)} {code}</strong>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                              <span className="muted">Variation nette {code}</span>
                              <strong style={{ color: c.net >= 0 ? "#059669" : "#e11d48" }}>{fmtSigned(c.net)} {code}</strong>
                            </div>
                            {c.lines.map((l, idx) => {
                              const isCertain = l.confidence === "certain";
                              const badge = isCertain ? "certain" : (/réf|estimé/i.test(l.basis) ? l.basis : "estimé");
                              return (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--ink-500, #64748b)", marginLeft: 8, padding: "1px 0" }}>
                                  <span>{l.amount >= 0 ? "+ " : "− "}{l.source} <em style={{ opacity: 0.7 }}>· {l.basis}</em></span>
                                  <span className="chip" style={{ flex: "none" }}>{badge}</span>
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
        )
      )}

      {/* Suivi prévu vs réel */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong className="font-display" style={{ fontSize: 15 }}>Suivi prévu vs réel — loyers</strong>
          <button className="btn" onClick={takeSnapshot}>Figer la prévision du jour</button>
        </div>
        {trackMsg && <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>{trackMsg}</p>}
        {variance && variance.avgBiasPct != null && (
          <div className="card" style={{ padding: 14, marginTop: 10, fontSize: 13, background: Math.abs(variance.avgBiasPct) > 10 ? "rgba(254,243,199,.4)" : "rgba(209,250,229,.4)" }}>
            {variance.avgBiasPct > 10
              ? `⚠ En moyenne, le réel dépasse la prévision de ${variance.avgBiasPct}% — la prochaine projection sera ajustée à la hausse.`
              : variance.avgBiasPct < -10
                ? `⚠ En moyenne, le réel est inférieur de ${Math.abs(variance.avgBiasPct)}% à la prévision — à ajuster à la baisse.`
                : `✅ Prévisions calibrées : écart moyen de ${variance.avgBiasPct}%.`}
          </div>
        )}
        {hasVarianceRows ? (
          <div style={{ marginTop: 10 }}>
            {variance.rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid var(--ink-100, #f1f5f9)", padding: "7px 0" }}>
                <span className="muted">{monthLabel(r.month)} · {r.currencyCode || "?"}</span>
                <span>prévu <strong>{fmtSigned(r.predicted)}</strong> · réel <strong>{fmtSigned(r.actual)}</strong>{" "}
                  <span style={{ color: r.diff >= 0 ? "#059669" : "#e11d48", fontWeight: 600 }}>({r.pct != null ? `${r.pct > 0 ? "+" : ""}${r.pct}%` : "—"})</span>
                </span>
              </div>
            ))}
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
