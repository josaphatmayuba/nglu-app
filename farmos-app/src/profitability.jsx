/* eslint-disable */
// Rentabilité (P&L) par animal / lot — Phase 3.
// 3 vues : Synthèse (KPI + coûts), Par lot, Par animal (paginé + drill-down).
// Calcul SQL à la volée côté backend (pas de snapshot pour l'affichage temps
// réel) ; les snapshots (`/profitability/snapshot`) figent une clôture sur
// demande explicite uniquement.
//
// RÈGLE NON NÉGOCIABLE : 3 indicateurs jamais additionnés ensemble :
//  - Profit réalisé (encaissé − décaissé)
//  - Marge incluant production valorisée (+ revenu théorique lait/oeufs/laine)
//  - Valeur latente du cheptel (plus-value non vendue)
import React from "react";
import { Icon } from "./icons";
import { speciesById } from "./data";
import { SpeciesPillBar, KpiCard, EmptyState } from "./shell";
import { api } from "./api";
import { useDataRefresh } from "./use-data-refresh";
import { DateRangeFilter, defaultDateRange } from "./date-range-filter.jsx";
import { defaultCurrencyId, defaultSymbol, formatMoney, symbolFor } from "./currency";
import { SectionLoader, Spinner } from "./loading.jsx";

function useCurrencyCatalogLocal() {
  const [state, setState] = React.useState({ currencies: [], defaultCurrencyId: null, fallbackSymbol: "" });
  React.useEffect(() => {
    let cancel = false;
    Promise.allSettled([api.getAppSetting(), api.listCurrencies()])
      .then(([setting, currencyList]) => {
        if (cancel) return;
        const currencies = currencyList.value?.getAllCurrency || (Array.isArray(currencyList.value) ? currencyList.value : []);
        setState({
          currencies,
          defaultCurrencyId: defaultCurrencyId(setting.value, currencies),
          fallbackSymbol: defaultSymbol(setting.value, currencies),
        });
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);
  return state;
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

// ─── Mini donut SVG (pas de dépendance npm supplémentaire) ────────────────
const DONUT_COLORS = ["var(--oxblood-600)", "var(--clay-600)", "var(--autorite-600)", "var(--pertinence-500)", "var(--solidite-600)", "var(--ink-500)", "var(--rust-500)"];
function CostDonut({ items, lang }) {
  const total = items.reduce((a, b) => a + b.total, 0);
  if (!total) return <EmptyState title={lang === "fr" ? "Aucun coût" : "No cost"} hint={lang === "fr" ? "Aucune dépense sur la période." : "No expense in this period."} icon="coins"/>;
  const R = 46, CX = 60, CY = 60, STROKE = 16;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  const arcs = items.map((it, i) => {
    const frac = it.total / total;
    const dash = frac * circumference;
    const arc = { ...it, color: DONUT_COLORS[i % DONUT_COLORS.length], dash, offset };
    offset += dash;
    return arc;
  });
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 120 120" width={140} height={140} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--ink-100)" strokeWidth={STROKE}/>
        {arcs.map((a, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color} strokeWidth={STROKE}
            strokeDasharray={`${a.dash} ${circumference - a.dash}`} strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${CX} ${CY})`} strokeLinecap="butt"/>
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        {arcs.slice(0, 8).map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: a.color, flexShrink: 0 }}/>
            <span style={{ color: "var(--ink-800)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
            <span className="mono" style={{ color: "var(--fg-3)" }}>{total > 0 ? ((a.total / total) * 100).toFixed(0) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DRIVER_LABELS = {
  feed: { fr: "Aliment", en: "Feed" },
  treatment: { fr: "Traitements", en: "Treatments" },
  vaccination: { fr: "Vaccinations", en: "Vaccinations" },
  operation: { fr: "Opérations", en: "Operations" },
  mortality: { fr: "Mortalité", en: "Mortality" },
};
function driverLabel(d, lang) {
  if (d.label.startsWith("expense:")) return d.label.slice(8);
  const def = DRIVER_LABELS[d.label];
  return def ? (lang === "fr" ? def.fr : def.en) : d.label;
}

// ─── Vue Synthèse ───────────────────────────────────────────────────────
function SummaryView({ lang, summary, drivers, currencyMeta, loading }) {
  if (loading) return <SectionLoader lang={lang} minHeight={140}/>;
  if (!summary.length) return <EmptyState title={lang === "fr" ? "Aucune donnée" : "No data"} hint={lang === "fr" ? "Aucune vente ni dépense sur la période." : "No sale or expense in this period."} icon="coins"/>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {summary.map((block, i) => {
        const symbol = symbolFor(block.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol) || (lang === "fr" ? "devise inconnue" : "unknown currency");
        return (
          <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-900)" }}>{symbol}</span>
              {summary.length > 1 && <span style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{lang === "fr" ? "Bloc séparé par devise — jamais converti" : "Separate block per currency — never converted"}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, padding: 16 }}>
              <KpiCard label={lang === "fr" ? "Profit réalisé" : "Realized profit"} sublabel={lang === "fr" ? "Encaissé − décaissé" : "Cashed − spent"}
                value={formatMoney(block.realizedProfit, block.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)} icon="coins"
                accent={block.realizedProfit >= 0 ? "var(--money-500)" : "var(--oxblood-700)"}/>
              <KpiCard label={lang === "fr" ? "Marge + production valorisée" : "Margin + valued production"} sublabel={lang === "fr" ? "Inclut lait/œufs/laine au tarif catalogue" : "Includes milk/eggs/wool at catalogue price"}
                value={formatMoney(block.marginWithValuedProduction, block.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)} icon="chart"/>
              <KpiCard label={lang === "fr" ? "Valeur latente du cheptel" : "Latent herd value"} sublabel={lang === "fr" ? "Plus-value non vendue — jamais dans le profit" : "Unsold gain — never in profit"}
                value={formatMoney(block.latentHerdValue, block.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)} icon="layers"/>
            </div>
          </div>
        );
      })}
      <div className="card">
        <div className="bilang" style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Postes de coût" : "Cost drivers"}</h3>
          <span className="sec">{lang === "fr" ? "Top 20, toutes devises regroupées à l'affichage" : "Top 20, all currencies grouped for display"}</span>
        </div>
        <CostDonut lang={lang} items={drivers.map((d) => ({ label: driverLabel(d, lang), total: d.total }))}/>
      </div>
    </div>
  );
}

// ─── Vue Par lot ────────────────────────────────────────────────────────
function ByLotView({ lang, rows, currencyMeta, loading, isMobile }) {
  const [sortBy, setSortBy] = React.useState("profit");
  const sorted = React.useMemo(() => {
    const copy = [...rows];
    if (sortBy === "margin_per_head") copy.sort((a, b) => (b.animalCount ? b.profit / b.animalCount : 0) - (a.animalCount ? a.profit / a.animalCount : 0));
    else copy.sort((a, b) => b.profit - a.profit);
    return copy;
  }, [rows, sortBy]);
  if (loading) return <SectionLoader lang={lang} minHeight={140}/>;
  if (!sorted.length) return <EmptyState title={lang === "fr" ? "Aucun lot" : "No lot"} hint={lang === "fr" ? "Aucune donnée liée à un lot sur la période." : "No lot-linked data in this period."} icon="layers"/>;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 17 }}>{lang === "fr" ? "Rentabilité par lot" : "Profitability per lot"}</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "profit", fr: "Trier · profit", en: "Sort · profit" }, { id: "margin_per_head", fr: "Trier · marge/tête", en: "Sort · margin/head" }].map((v) => (
            <button key={v.id} className="btn btn-sm" onClick={() => setSortBy(v.id)}
              style={sortBy === v.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
              {lang === "fr" ? v.fr : v.en}
            </button>
          ))}
        </div>
      </div>
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {sorted.map((r, i) => (
            <div key={i} style={{ padding: "12px 16px", borderBottom: i < sorted.length - 1 ? "1px solid var(--border-1)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-900)" }}>{r.lot}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.profit >= 0 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>
                  {formatMoney(r.profit, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--fg-3)" }}>
                <span>{r.animalCount} {lang === "fr" ? "animaux" : "animals"}</span>
                <span>{lang === "fr" ? "Rev." : "Rev."} {formatMoney(r.revenue, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
                <span>{lang === "fr" ? "Coût" : "Cost"} {formatMoney(r.cost, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-1)" }}>
                {[lang === "fr" ? "Lot" : "Lot", lang === "fr" ? "Espèce" : "Species", lang === "fr" ? "Effectif" : "Head count", lang === "fr" ? "Revenu" : "Revenue", lang === "fr" ? "Coût" : "Cost", lang === "fr" ? "Profit" : "Profit", lang === "fr" ? "Marge/tête" : "Margin/head"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border-1)" : "none" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{r.lot}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--fg-2)" }}>{r.species ? (speciesById(r.species) ? (lang === "fr" ? speciesById(r.species).fr : speciesById(r.species).en) : r.species) : "—"}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5 }}>{r.animalCount}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5 }}>{formatMoney(r.revenue, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--oxblood-700)" }}>{formatMoney(r.cost, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: r.profit >= 0 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>{formatMoney(r.profit, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--fg-2)" }}>{formatMoney(r.animalCount ? r.profit / r.animalCount : 0, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Drill-down animal (timeline) ─────────────────────────────────────────
function AnimalDrilldown({ lang, animalId, currencyMeta, onClose }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.getProfitabilityAnimalTimeline(animalId)
      .then((d) => { if (!cancel) setData(d); })
      .catch(() => { if (!cancel) setData(null); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [animalId]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,20,0.4)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ width: "min(480px, 100%)", height: "100%", background: "var(--paper)", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 19 }}>{data?.animal?.name || `#${animalId}`}</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={14} color="var(--ink-700)"/></button>
        </div>
        {loading ? <SectionLoader lang={lang}/> : !data ? (
          <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Aucune donnée." : "No data."}</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ background: "var(--bg-sunken)", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase" }}>{lang === "fr" ? "Revenu" : "Revenue"}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(data.revenue, null, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</div>
              </div>
              <div style={{ background: "var(--bg-sunken)", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase" }}>{lang === "fr" ? "Coût" : "Cost"}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--oxblood-700)" }}>{formatMoney(data.cost, null, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</div>
              </div>
              <div style={{ background: "var(--bg-sunken)", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase" }}>{lang === "fr" ? "Profit" : "Profit"}</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: data.profit >= 0 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>{formatMoney(data.profit, null, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</div>
              </div>
            </div>
            {data.latentValue != null && (
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginBottom: 14 }}>
                {lang === "fr" ? "Valeur latente (non vendu) : " : "Latent value (unsold): "}
                <strong>{formatMoney(data.latentValue, null, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</strong>
              </div>
            )}
            <div className="overline" style={{ marginBottom: 8 }}>{lang === "fr" ? "Chronologie" : "Timeline"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(data.events || []).length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucun événement financier." : "No financial event."}</div>
              ) : data.events.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px dashed var(--border-1)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--ink-900)" }}>{e.category}{e.estimated ? <span style={{ fontSize: 10, color: "var(--fg-3)" }}> · {lang === "fr" ? "estimé" : "estimated"}</span> : null}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{(e.date || "").slice(0, 10)}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: e.kind === "revenue" ? "var(--solidite-700)" : "var(--oxblood-700)", whiteSpace: "nowrap" }}>
                    {e.kind === "revenue" ? "+" : "-"}{formatMoney(e.amount, e.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Vue Par animal (paginée) ─────────────────────────────────────────────
function ByAnimalView({ lang, params, currencyMeta, isMobile }) {
  const [page, setPage] = React.useState({ rows: [], total: 0 });
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [sort, setSort] = React.useState("profit_desc");
  const [drilldownId, setDrilldownId] = React.useState(null);
  const LIMIT = 30;

  React.useEffect(() => { setOffset(0); }, [params.from, params.to, params.species, sort]);

  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.getProfitabilityByAnimal({ ...params, sort, limit: LIMIT, offset })
      .then((d) => { if (!cancel) setPage((prev) => (offset === 0 ? d : { ...d, rows: [...prev.rows, ...(d.rows || [])] })); })
      .catch(() => { if (!cancel) setPage({ rows: [], total: 0 }); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [params.from, params.to, params.species, sort, offset]);

  const canLoadMore = page.rows.length < page.total;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 17 }}>{lang === "fr" ? "Rentabilité par animal" : "Profitability per animal"}</h3>
        <select className="input" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="profit_desc">{lang === "fr" ? "Profit ↓" : "Profit ↓"}</option>
          <option value="profit_asc">{lang === "fr" ? "Profit ↑" : "Profit ↑"}</option>
          <option value="revenue_desc">{lang === "fr" ? "Revenu ↓" : "Revenue ↓"}</option>
          <option value="cost_desc">{lang === "fr" ? "Coût ↓" : "Cost ↓"}</option>
        </select>
      </div>
      {loading && offset === 0 ? (
        <SectionLoader lang={lang} minHeight={140}/>
      ) : page.rows.length === 0 ? (
        <EmptyState title={lang === "fr" ? "Aucun animal" : "No animal"} hint={lang === "fr" ? "Aucune vente ni dépense liée sur la période." : "No linked sale or expense in this period."} icon="layers"/>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {page.rows.map((r) => (
            <button key={r.animalId} onClick={() => setDrilldownId(r.animalId)} style={{
              textAlign: "left", border: 0, background: "transparent", padding: "12px 16px", borderBottom: "1px solid var(--border-1)", cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-900)" }}>{r.name || `#${r.animalId}`}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: r.profit >= 0 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>
                  {formatMoney(r.profit, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--fg-3)" }}>
                <span>{r.lot || "—"}</span>
                <span>{lang === "fr" ? "Rev." : "Rev."} {formatMoney(r.revenue, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
                <span>{lang === "fr" ? "Coût" : "Cost"} {formatMoney(r.cost, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-1)" }}>
                {[lang === "fr" ? "Animal" : "Animal", lang === "fr" ? "Lot" : "Lot", lang === "fr" ? "Revenu" : "Revenue", lang === "fr" ? "Coût" : "Cost", lang === "fr" ? "Achat (est.)" : "Acquisition (est.)", lang === "fr" ? "Profit" : "Profit"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.rows.map((r) => (
                <tr key={r.animalId} onClick={() => setDrilldownId(r.animalId)} style={{ borderBottom: "1px solid var(--border-1)", cursor: "pointer" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{r.name || `#${r.animalId}`}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--fg-2)" }}>{r.lot || "—"}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5 }}>{formatMoney(r.revenue, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--oxblood-700)" }}>{formatMoney(r.cost, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 12.5, color: "var(--fg-3)" }}>{r.acquisitionCost ? formatMoney(r.acquisitionCost, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol) : "—"}</td>
                  <td className="mono" style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: r.profit >= 0 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>{formatMoney(r.profit, r.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canLoadMore && (
        <div style={{ padding: 14, textAlign: "center", borderTop: "1px solid var(--border-1)" }}>
          <button className="btn btn-sm" disabled={loading} onClick={() => setOffset((o) => o + LIMIT)}>
            {loading ? <Spinner size={13} label={lang === "fr" ? "Chargement…" : "Loading…"}/> : (lang === "fr" ? "Charger plus" : "Load more")}
          </button>
        </div>
      )}
      {drilldownId != null && <AnimalDrilldown lang={lang} animalId={drilldownId} currencyMeta={currencyMeta} onClose={() => setDrilldownId(null)}/>}
    </div>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────
export function ProfitabilityScreen({ lang, speciesFilter, onSpeciesFilter }) {
  const [view, setView] = React.useState("summary"); // summary | lot | animal
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("year"));
  const currencyMeta = useCurrencyCatalogLocal();
  const refresh = useDataRefresh(["sales", "expenses", "animals", "mortalityEvents"]);
  const isMobile = useIsMobile();

  const [summary, setSummary] = React.useState([]);
  const [drivers, setDrivers] = React.useState([]);
  const [lotRows, setLotRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const params = React.useMemo(() => ({ from: dateRange.from || undefined, to: dateRange.to || undefined, species: speciesFilter || undefined }), [dateRange.from, dateRange.to, speciesFilter]);

  // Mobile : le premier rendu n'appelle QUE /summary + /by-lot (payload minuscule).
  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    const calls = [api.getProfitabilitySummary(params), api.getProfitabilityByLot(params)];
    if (!isMobile) calls.push(api.getProfitabilityCostDrivers(params));
    Promise.all(calls)
      .then(([s, l, d]) => {
        if (cancel) return;
        setSummary(Array.isArray(s) ? s : []);
        setLotRows(Array.isArray(l) ? l : []);
        if (d) setDrivers(Array.isArray(d) ? d : []);
      })
      .catch((e) => console.warn("profitability load failed:", e.message))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [params.from, params.to, params.species, refresh, isMobile]);

  // Coûts (desktop différé si besoin, déjà chargé plus haut si !isMobile).
  React.useEffect(() => {
    if (!isMobile) return;
    // Sur mobile on ne charge les cost-drivers que si l'utilisateur ouvre la synthèse.
    if (view !== "summary") return;
    let cancel = false;
    api.getProfitabilityCostDrivers(params).then((d) => { if (!cancel) setDrivers(Array.isArray(d) ? d : []); }).catch(() => {});
    return () => { cancel = true; };
  }, [isMobile, view, params.from, params.to, params.species]);

  const handleExport = async () => {
    setExporting(true);
    try { await api.exportProfitabilityCsv(params); } catch (e) { window.alert(e.message); } finally { setExporting(false); }
  };

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Finances · Rentabilité" : "Finances · Profitability"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? "Rentabilité par animal / lot" : "Profitability per animal / lot"}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
          <button className="btn btn-sm" disabled={exporting} onClick={handleExport}>
            <Icon name="download" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Exporter CSV" : "Export CSV"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {[
          { id: "summary", fr: "Synthèse", en: "Summary" },
          { id: "lot", fr: "Par lot", en: "Per lot" },
          { id: "animal", fr: "Par animal", en: "Per animal" },
        ].map((v) => (
          <button key={v.id} className="btn btn-sm" onClick={() => setView(v.id)}
            style={view === v.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
            {lang === "fr" ? v.fr : v.en}
          </button>
        ))}
      </div>

      {view === "summary" && <SummaryView lang={lang} summary={summary} drivers={drivers} currencyMeta={currencyMeta} loading={loading}/>}
      {view === "lot" && <ByLotView lang={lang} rows={lotRows} currencyMeta={currencyMeta} loading={loading} isMobile={isMobile}/>}
      {view === "animal" && <ByAnimalView lang={lang} params={params} currencyMeta={currencyMeta} isMobile={isMobile}/>}
    </div>
  );
}
