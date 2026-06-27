/* eslint-disable */
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { SPECIES, speciesById, t } from "./data";
import { SpeciesPillBar, KpiCard, Sparkline, FarmScore, EmptyState } from "./shell";
import { api, adaptMedicine, adaptTreatment, adaptReproEvent, adaptSaleAsTransaction, adaptExpenseAsTransaction } from "./api";
import { useDataRefresh } from "./use-data-refresh";
import { DateRangeFilter, defaultDateRange, inDateRange, rangeLabel } from "./date-range-filter.jsx";
import { VetDossierSection, FarmosDocumentsSection } from "./vetdossier.jsx";
import { Autocomplete } from "./quickentry";
import { currencyOptions, defaultCurrencyId, defaultSymbol, formatMoney, rowCurrencyId, symbolFor } from "./currency";
import { isSaleLockedAnimal, isSaleLockedStatus } from "./animal-lock";
import { animalQty, isActiveLivestock, isAdultAnimal, animalCategory, categoryBreakdownByGroup, sexBreakdownByGroup, CATEGORY_LABELS, slaughterStats, slaughterReadiness, BREEDING_RATIO } from "./animal-category";
import { AmountCurrencyInput } from "./amount-currency-input.jsx";
import { MaterialDriverBarChart, MaterialForecastHeadChart, MaterialLineChart } from "./material-charts.jsx";

// All remaining screens: Health, Calendar, Stock, Repro, Production, Alerts, Finances, Reports.

function useCurrencyCatalog() {
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

function CurrencySelect({ lang, value, onChange, currencies }) {
  return (
    <select className="input" value={value || ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}>
      <option value="">{lang === "fr" ? "Choisir" : "Select"}</option>
      {currencyOptions(currencies).map((currency) => (
        <option key={currency.id} value={currency.id}>{currency.label}</option>
      ))}
    </select>
  );
}

// ─── HEALTH & TREATMENTS ─────────────────────────────────────────────────
const HealthScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allTreatments, setAllTreatments] = React.useState([]);
  const [allAnimals, setAllAnimals] = React.useState([]);
  const [allExpenses, setAllExpenses] = React.useState([]);
  const [vetExams, setVetExams] = React.useState([]);
  const [allDiseases, setAllDiseases] = React.useState([]);
  const [editingDisease, setEditingDisease] = React.useState(null); // null=fermé, {}=nouveau, row=édition
  const [reloadKey, setReloadKey] = React.useState(0);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("today"));
  const currencyMeta = useCurrencyCatalog();
  const activeCurrencyId = currencyMeta.defaultCurrencyId ? String(currencyMeta.defaultCurrencyId) : "";
  const moneyUnit = symbolFor(activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const refresh = useDataRefresh(["treatments", "animals", "diseases", "expenses", "vetExams"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listTreatments(), api.listAnimals(), api.listDiseases(), api.listExpenses(), api.listVetExams()])
      .then(([trs, animals, diseases, expenses, exams]) => {
        if (cancel) return;
        const animalsArr = Array.isArray(animals) ? animals : [];
        const aMap = new Map(animalsArr.map((a) => [a.id, a]));
        const dMap = new Map((Array.isArray(diseases) ? diseases : []).map((d) => [d.id, d]));
        const mapped = (Array.isArray(trs) ? trs : []).map((t) => adaptTreatment(t, aMap, dMap));
        setAllTreatments(mapped);
        setAllDiseases(Array.isArray(diseases) ? diseases : []);
        setAllAnimals(animalsArr);
        setAllExpenses(Array.isArray(expenses) ? expenses : []);
        setVetExams(Array.isArray(exams) ? exams : []);
      })
      .catch((e) => console.warn("listTreatments failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:treatment-created", onCreated);
    return () => window.removeEventListener("farmos:treatment-created", onCreated);
  }, []);
  const treatments = allTreatments.filter(t => (!speciesFilter || t.species === speciesFilter) && inDateRange(t.start || t.end, dateRange));
  const running = treatments.filter(t => t.status === "running");
  const completed = treatments.filter(t => t.status === "completed");

  // KPIs dérivés des vraies données + filtrés par espèce.
  const animalsFiltered = allAnimals.filter((a) => isActiveLivestock(a) && (!speciesFilter || a.species === speciesFilter));
  const quarantineCount = animalsFiltered.filter((a) => {
    const s = String(a.status || "").toLowerCase();
    return s === "quarantine" || s === "quarantaine" || s === "isolated";
  }).length;
  const today = new Date().toISOString().slice(0, 10);
  const withdrawalCount = animalsFiltered.filter((a) => {
    const w = a.withdrawalUntil || a.withdrawal_until;
    return w && String(w).slice(0, 10) >= today;
  }).length;
  // Coût médicaments du mois en cours. Si un filtre espèce est actif on tente
  // de relier l'expense au médicament via related_medicine_id, sinon on
  // compte tout (cas data legacy sans liaison).
  const speciesMedicineIds = speciesFilter
    ? new Set(allAnimals
        .filter((a) => a.species === speciesFilter)
        .map((a) => a.id)) // placeholder set, not actually used
    : null;
  const medExpenses = allExpenses.filter((e) => {
    const cat = String(e.category || "").toLowerCase();
    if (cat !== "medicine" && cat !== "médicament" && cat !== "med") return false;
    const d = e.expenseDate || e.expense_date;
    if (!inDateRange(d, dateRange)) return false;
    if (activeCurrencyId && String(rowCurrencyId(e) ?? currencyMeta.defaultCurrencyId ?? "") !== activeCurrencyId) return false;
    return true;
  });
  const medCostMonth = medExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const activeBySpecies = SPECIES.map((s) => {
    const rows = allAnimals.filter((a) => isActiveLivestock(a) && (!speciesFilter || a.species === speciesFilter) && a.species === s.id && a.status && a.status !== "healthy");
    return { ...s, activeCount: rows.length, statuses: [...new Set(rows.map((a) => a.status).filter(Boolean))] };
  }).filter((s) => s.activeCount > 0);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Santé · Health" : "Health · Santé"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Traitements & médicaments, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).fr.toLowerCase() : "cheptel complet"}</span></>
            : <>Treatments & medicine, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).en.toLowerCase() : "full herd"}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
      </div>

      {/* KPI row — dérivés des vraies données + filtrés par espèce. */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Traitements actifs" : "Active treatments"} value={running.length} unit="" icon="pill" accent="var(--health-500)"/>
        <KpiCard label={lang === "fr" ? "Animaux en quarantaine" : "Animals in quarantine"} value={quarantineCount} unit="" icon="shield" accent={quarantineCount > 0 ? "var(--rust-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Délais de retrait actifs" : "Active withdrawals"} value={withdrawalCount} unit="" icon="clock" accent={withdrawalCount > 0 ? "var(--rust-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Coût médicaments · période" : "Medicine cost · period"} sublabel={rangeLabel(dateRange, lang)} value={medCostMonth.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} unit={moneyUnit} icon="coins"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-15)", gap: 16 }}>
        {/* Treatments list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px" }}>
            <div className="bilang">
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Traitements en cours" : "Active treatments"}</h3>
              <span className="sec">{running.length}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: { tab: "health", scope: "individual" } }))}><Icon name="plus" size={13} color="var(--ink-700)"/>{lang === "fr" ? "Individuel" : "Individual"}</button>
              <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: { tab: "health", scope: "lot" } }))}><Icon name="layers" size={13} color="#ECF1EC"/>{lang === "fr" ? "Lot" : "Batch"}</button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-1)" }}>
            {treatments.map((tr, i) => {
              const sp = speciesById(tr.species);
              const ongoing = tr.status === "running";
              const locked = isSaleLockedStatus(tr.animalStatus);
              return (
                <div key={tr.id} style={{
                  display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 14, padding: "14px 18px",
                  borderBottom: i < treatments.length - 1 ? "1px solid var(--border-1)" : "none",
                  background: ongoing && tr.withdrawal ? "rgba(122,31,43,0.02)" : "transparent",
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AnimalGlyph kind={sp.glyph} size={16} color="currentColor"/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span className="italic-serif" style={{ fontSize: 16, color: "var(--ink-950)" }}>{tr.animal}</span>
                      <span style={{ fontSize: 13, color: "var(--ink-700)" }}>· {tr.reason}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{tr.id}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12, color: "var(--fg-2)", flexWrap: "wrap" }}>
                      <span><Icon name="pill" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.med}</span></span>
                      <span><Icon name="syringe" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.dosage} · {tr.route}</span></span>
                      <span><Icon name="calendar" size={11} color="var(--fg-3)"/> <span className="mono" style={{ marginLeft: 4 }}>{tr.start} → {tr.end}</span></span>
                      <span><Icon name="user" size={11} color="var(--fg-3)"/> <span style={{ marginLeft: 4 }}>{tr.vet}</span></span>
                    </div>
                    {tr.withdrawal && Object.entries(tr.withdrawal).some(([k, v]) => v > 0) && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(tr.withdrawal).map(([k, v]) => v > 0 && (
                          <span key={k} className="tag tag-danger" style={{ fontSize: 11 }}>
                            <Icon name="shield" size={10} color="var(--rust-700)"/>
                            {lang === "fr"
                              ? `Retrait ${k === "milk" ? "lait" : k === "meat" ? "viande" : "œufs"} · ${v} j`
                              : `${k === "milk" ? "Milk" : k === "meat" ? "Meat" : "Eggs"} withdrawal · ${v} d`
                            }
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span className="tag" style={{ background: ongoing ? "var(--autorite-50)" : "var(--solidite-50)", color: ongoing ? "var(--autorite-900)" : "var(--solidite-900)" }}>
                      {ongoing ? (lang === "fr" ? "En cours" : "Running") : (lang === "fr" ? "Terminé" : "Completed")}
                    </span>
                    {tr._pk && !locked && (
                      <button className="btn btn-sm btn-ghost" style={{ padding: "0 6px" }} title={lang === "fr" ? "Supprimer" : "Delete"}
                        onClick={async () => {
                          if (!window.confirm(lang === "fr" ? `Supprimer le traitement ${tr.id} ?` : `Delete treatment ${tr.id}?`)) return;
                          try { await api.deleteTreatment(tr._pk); window.dispatchEvent(new CustomEvent("farmos:treatment-created")); } catch (e) { window.alert(e.message); }
                        }}>
                        <Icon name="trash" size={13} color="var(--oxblood-700)"/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diseases card (adaptive) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="bilang">
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Statuts sanitaires actifs" : "Active health statuses"}</h3>
                <span className="sec">{activeBySpecies.reduce((sum, s) => sum + s.activeCount, 0)} {lang === "fr" ? "cas en base" : "DB cases"}</span>
              </div>
              <button className="btn btn-sm btn-ghost"><Icon name="filter" size={12} color="var(--ink-700)"/></button>
            </div>
            {activeBySpecies.length === 0 && <EmptyState title={lang === "fr" ? "Aucun statut sanitaire actif en base" : "No active health status in database"} />}
            {activeBySpecies.map((s) => (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AnimalGlyph kind={s.glyph} size={14} color="var(--ink-700)"/>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-3)" }} className="mono">{s.activeCount}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {s.statuses.map((status, i) => (
                    <span key={i} className="tag" style={{ background: i === 0 ? "var(--rust-50)" : "var(--bg-sunken)", color: i === 0 ? "var(--rust-900)" : "var(--ink-700)" }}>
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Disease library editor (bibliothèque maladies enrichie) */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="bilang">
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Bibliothèque maladies" : "Disease library"}</h3>
                <span className="sec">{allDiseases.length} {lang === "fr" ? "maladies référencées" : "diseases referenced"}</span>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => setEditingDisease({})}>
                <Icon name="plus" size={12} color="var(--paper)"/>{lang === "fr" ? "Ajouter" : "Add"}
              </button>
            </div>
            {allDiseases.length === 0 && <EmptyState title={lang === "fr" ? "Aucune maladie référencée" : "No disease referenced"} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }}>
              {allDiseases
                .filter((d) => !speciesFilter || d.species === speciesFilter)
                .map((d) => {
                  const urg = (d.urgencyLevel || d.urgency_level || "").toLowerCase();
                  const urgColor = urg === "critical" ? "var(--oxblood-700)" : urg === "high" ? "var(--rust-700)" : urg === "medium" ? "var(--clay-700)" : "var(--ink-500)";
                  return (
                    <button key={d.id} onClick={() => setEditingDisease(d)}
                      style={{ textAlign: "left", border: "1px solid var(--border-1)", background: "var(--paper)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang === "fr" ? (d.nameFr || d.name_fr) : (d.nameEn || d.name_en || d.nameFr || d.name_fr)}</div>
                        <div style={{ fontSize: 10.5, color: "var(--fg-3)" }}>
                          {(d.contagious ? (lang === "fr" ? "Contagieuse · " : "Contagious · ") : "")}
                          {(d.vaccineAvailable ?? d.vaccine_available) ? (lang === "fr" ? "vaccin dispo" : "vaccine available") : (lang === "fr" ? "pas de vaccin" : "no vaccine")}
                        </div>
                      </div>
                      {urg && <span className="tag" style={{ background: "var(--bg-sunken)", color: urgColor, fontSize: 10 }}>{urg}</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Vet card */}
          <div className="card" style={{ background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-800)" }}>
            <div className="overline" style={{ color: "rgba(251,248,242,0.6)", marginBottom: 8 }}>{lang === "fr" ? "Vétérinaire de garde" : "On-call veterinarian"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>EB</div>
              <div>
                <div className="italic-serif" style={{ fontSize: 17, color: "var(--parchment-50)" }}>Dr. Émilie Boucher</div>
                <div style={{ fontSize: 12, color: "var(--ink-300)" }}>Clinique Vétérinaire des Laurentides</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 2 }}>+1 450 555 0124 · disponible 24/7</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.15)", flex: 1 }}>{lang === "fr" ? "Appeler" : "Call"}</button>
              <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.1)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.15)", flex: 1 }}>{lang === "fr" ? "Visite" : "Schedule"}</button>
            </div>
          </div>
        </div>
      </div>

      <VetDossierSection
        lang={lang}
        animals={animalsFiltered}
        exams={vetExams.filter((e) => !speciesFilter || e.species === speciesFilter)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <MortalityStatsSection lang={lang} speciesFilter={speciesFilter}/>

      <FarmosDocumentsSection lang={lang} animals={animalsFiltered}/>

      {editingDisease && (
        <DiseaseFormModal
          lang={lang}
          defaultSpecies={speciesFilter || undefined}
          disease={Object.keys(editingDisease).length ? editingDisease : null}
          onClose={() => setEditingDisease(null)}
          onSaved={() => { setEditingDisease(null); setReloadKey((k) => k + 1); }}
        />
      )}
    </div>
  );
};

// ─── MORTALITÉ — statistiques (prompt design : décès par mois/espèce/cause) ──
const MortalityStatsSection = ({ lang, speciesFilter }) => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const currencyMeta = useCurrencyCatalog();
  const moneyUnit = symbolFor(currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const refresh = useDataRefresh(["mortalityEvents"]);
  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.getMortalityStats()
      .then((s) => { if (!cancel) setStats(s); })
      .catch(() => { if (!cancel) setStats(null); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [refresh]);

  const money = (n) => `${Number(n || 0).toLocaleString("fr-CA")} ${moneyUnit}`;
  const speciesLabel = (id) => { const s = speciesById(id); return s ? (lang === "fr" ? s.fr : s.en) : id; };
  const maxOf = (arr) => Math.max(1, ...(arr || []).map((x) => x.value));

  const Bars = ({ title, items, labelFn }) => {
    if (!items || items.length === 0) return null;
    const max = maxOf(items);
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.slice(0, 6).map((it) => (
            <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--ink-800)", width: 96, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{labelFn ? labelFn(it.key) : it.key}</span>
              <div style={{ flex: 1, height: 8, background: "var(--bg-sunken)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", background: "var(--oxblood-700)", borderRadius: 999 }}/>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-2)", width: 28, textAlign: "right" }}>{it.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="bilang">
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Mortalité — statistiques" : "Mortality — statistics"}</h3>
        <span className="sec">{lang === "fr" ? "Décès enregistrés, par cause/espèce/mois" : "Recorded deaths, by cause/species/month"}</span>
      </div>
      {loading && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>}
      {!loading && (!stats || stats.eventsCount === 0) && (
        <EmptyState title={lang === "fr" ? "Aucun décès enregistré" : "No death recorded"} />
      )}
      {!loading && stats && stats.eventsCount > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Total décès" : "Total deaths"}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--oxblood-700)" }}>{stats.totalDeaths}</div>
            </div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Perte estimée" : "Estimated loss"}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-900)" }}>{money(stats.totalLoss)}</div>
            </div>
          </div>
          <Bars title={lang === "fr" ? "Par espèce" : "By species"} items={stats.bySpecies} labelFn={speciesLabel}/>
          <Bars title={lang === "fr" ? "Par cause" : "By cause"} items={stats.byCause}/>
          <Bars title={lang === "fr" ? "Par mois" : "By month"} items={stats.byMonth}/>
        </>
      )}
    </div>
  );
};

// ─── VACCINATION CALENDAR ────────────────────────────────────────────────
const CalendarScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allEvents, setAllEvents] = React.useState([]);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("today"));
  const refresh = useDataRefresh(["animals", "treatments", "reproductionEvents", "vaccinations"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listAnimals(), api.listTreatments(), api.listReproductionEvents(), api.listVaccinations()])
      .then(([animals, trs, repro, vaccs]) => {
        if (cancel) return;
        const aMap = new Map((animals || []).map((a) => [a.id, a]));
        const today = new Date().toISOString().slice(0, 10);
        // Statut dérivé de l'échéance : retard (passée), aujourd'hui, à venir.
        const dueStatus = (due, fallback) => {
          if (!due) return fallback || "scheduled";
          if (due < today) return "overdue";
          if (due === today) return "today";
          return fallback || "scheduled";
        };
        const events = [];
        (vaccs || []).forEach((v) => {
          const due = String(v.dueDate).slice(0, 10);
          events.push({
            id: `v-${v.id}`, species: v.species, kind: "vaccine",
            vaccine: v.vaccine, target: v.target, n: v.animalCount,
            due, status: v.status === "done" ? "done" : dueStatus(due, v.status),
          });
        });
        (trs || []).forEach((t) => {
          if (t.endDate) {
            const a = aMap.get(t.animalId);
            events.push({
              id: `tr-end-${t.id}`, species: a?.species || "cow", kind: "withdrawal",
              vaccine: (lang === "fr" ? "Fin retrait · " : "Withdrawal end · ") + (t.medicineName || ""),
              target: a?.name || a?.externalId || "—", n: 1,
              due: t.endDate, status: dueStatus(t.endDate),
            });
          }
        });
        (repro || []).forEach((e) => {
          const due = e.expectedDueDate;
          if (due) {
            const a = aMap.get(e.animalId);
            events.push({
              id: `repro-${e.id}`, species: a?.species || "cow", kind: "repro",
              vaccine: (lang === "fr" ? "Mise bas attendue · " : "Birthing due · ") + (a?.name || a?.externalId || "—"),
              target: a?.name || "—", n: 1,
              due, status: dueStatus(due),
            });
          }
        });
        setAllEvents(events);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [lang, refresh]);
  const filtered = allEvents.filter(v => (!speciesFilter || v.species === speciesFilter) && inDateRange(v.due, dateRange));
  // Build the grid for the current month (Monday-first), driven by today's date.
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth(); // 0-based
  const todayDate = now.getDate();
  const monthLabel = now.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "long", year: "numeric" });
  const calYm = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
  const leadOffset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // 0=Mon … 6=Sun
  const cellCount = Math.ceil((leadOffset + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, i) => i - leadOffset); // value + 1 = day number
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Vaccination · Vaccines" : "Vaccines · Vaccination"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Calendrier vaccinal, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{monthLabel}</span></> : <>Vaccination calendar, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{monthLabel}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-cal)", gap: 16 }}>
        {/* Month grid */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border-1)" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn btn-sm btn-ghost"><Icon name="chevLeft" size={13} color="var(--ink-700)"/></button>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, textTransform: "capitalize" }}>{monthLabel}</h3>
              <button className="btn btn-sm btn-ghost"><Icon name="chevRight" size={13} color="var(--ink-700)"/></button>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn btn-sm" style={{ background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" }}>{lang === "fr" ? "Mois" : "Month"}</button>
              <button className="btn btn-sm">{lang === "fr" ? "Semaine" : "Week"}</button>
              <button className="btn btn-sm">{lang === "fr" ? "Liste" : "List"}</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border-1)" }}>
            {[lang==="fr"?"Lun":"Mon", lang==="fr"?"Mar":"Tue", lang==="fr"?"Mer":"Wed", lang==="fr"?"Jeu":"Thu", lang==="fr"?"Ven":"Fri", lang==="fr"?"Sam":"Sat", lang==="fr"?"Dim":"Sun"].map((d) => (
              <div key={d} style={{ padding: "8px 10px", fontSize: 10.5, fontWeight: 600, color: "var(--fg-2)", letterSpacing: "0.1em", textTransform: "uppercase", borderRight: "1px solid var(--border-1)" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "100px" }}>
            {days.map((d, i) => {
              const day = d + 1;
              const inMonth = day >= 1 && day <= daysInMonth;
              const isToday = inMonth && day === todayDate;
              const dayVacc = filtered.filter(v => v.due.startsWith(calYm) && parseInt(v.due.split("-")[2], 10) === day);
              return (
                <div key={i} style={{
                  borderRight: (i % 7) < 6 ? "1px solid var(--border-1)" : "none",
                  borderBottom: i < days.length - 7 ? "1px solid var(--border-1)" : "none",
                  padding: 6, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden",
                  background: isToday ? "rgba(122,31,43,0.04)" : "transparent",
                  opacity: inMonth ? 1 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 11, color: isToday ? "var(--oxblood-700)" : "var(--ink-700)", fontWeight: isToday ? 600 : 400 }}>{inMonth ? day : (day < 1 ? daysInPrevMonth + day : day - daysInMonth)}</span>
                    {isToday && <span style={{ fontSize: 9, fontWeight: 600, color: "var(--oxblood-700)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{lang === "fr" ? "Auj." : "Today"}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayVacc.slice(0, 2).map((v) => {
                      const sp = speciesById(v.species);
                      return (
                        <div key={v.id} style={{
                          fontSize: 10.5, padding: "2px 5px", borderRadius: 4,
                          background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", gap: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          <AnimalGlyph kind={sp.glyph} size={10} color="currentColor"/>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{v.vaccine}</span>
                        </div>
                      );
                    })}
                    {dayVacc.length > 2 && <span style={{ fontSize: 10, color: "var(--fg-3)" }}>+{dayVacc.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side: today + overdue + legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(() => {
            const todayEvents = allEvents.filter(v => v.status === "today");
            if (todayEvents.length === 0) return null;
            return (
              <div className="card">
                <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "À faire aujourd'hui" : "Due today"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {todayEvents.map((v) => {
                    const sp = speciesById(v.species);
                    return (
                      <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px dashed var(--border-1)" }}>
                        <AnimalGlyph kind={sp.glyph} size={12} color="var(--ink-500)"/>
                        <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.vaccine}</span>
                        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{v.target}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className="card">
            <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "En retard" : "Overdue"}</div>
            {allEvents.filter(v => v.status === "overdue").length === 0 && (
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucun rappel en retard." : "No overdue reminders."}</div>
            )}
            {allEvents.filter(v => v.status === "overdue").map((v) => {
              const sp = speciesById(v.species);
              return (
                <div key={v.id} className="pulse-critical" style={{ background: "var(--critical-bg)", border: "1px solid var(--rust-300)", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="alert" size={14} color="var(--rust-700)"/>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--rust-900)" }}>{v.vaccine}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-700)", marginTop: 6 }}>{v.target} · {v.n} {lang === "fr" ? "animaux" : "animals"}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--rust-700)", marginTop: 4 }}>{lang === "fr" ? "Échéance " : "Due "}{v.due}</div>
                  <button className="btn btn-sm btn-primary" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "health" }))}>{lang === "fr" ? "Programmer maintenant" : "Schedule now"}</button>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="overline" style={{ marginBottom: 10 }}>{lang === "fr" ? "Vaccins obligatoires · Québec" : "Mandatory vaccines · Québec"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "Rage · Bovins", freq: "Annuel", icon: "syringe" },
                { name: "Brucellose", freq: "Génisses 4–12 mois", icon: "syringe" },
                { name: "Tuberculose · test", freq: "Annuel", icon: "flask" },
                { name: "Grippe aviaire H5", freq: "Programme MAPAQ", icon: "shield" },
              ].map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 3 ? "1px dashed var(--border-1)" : "none" }}>
                  <Icon name={v.icon} size={13} color="var(--ink-500)"/>
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-800)" }}>{v.name}</span>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{v.freq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── STOCK & FEED ────────────────────────────────────────────────────────
const StockScreen = ({ lang, speciesFilter, onSpeciesFilter, kindFilter }) => {
  const [stock, setStock] = React.useState([]);
  const [allExpenses, setAllExpenses] = React.useState([]);
  const [allAnimals, setAllAnimals] = React.useState([]);
  const [forecasts, setForecasts] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("today"));
  const [addOpen, setAddOpen] = React.useState(null); // null | "feed" | "med"
  const [editing, setEditing] = React.useState(null); // medicine row in edit mode
  const currencyMeta = useCurrencyCatalog();
  const activeCurrencyId = currencyMeta.defaultCurrencyId ? String(currencyMeta.defaultCurrencyId) : "";
  const moneyUnit = symbolFor(activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const refresh = useDataRefresh(["medicines", "expenses", "animals", "feedForecasts"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listMedicines(), api.listExpenses(), api.listAnimals(), api.listFeedForecasts().catch(() => [])])
      .then(([meds, expenses, animals, fcs]) => {
        if (cancel) return;
        const mapped = (Array.isArray(meds) ? meds : []).map(adaptMedicine);
        setStock(mapped);
        setAllExpenses(Array.isArray(expenses) ? expenses : []);
        setAllAnimals(Array.isArray(animals) ? animals : []);
        setForecasts(Array.isArray(fcs) ? fcs : []);
      })
      .catch((e) => console.warn("StockScreen load failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:expense-created", onCreated);
    return () => window.removeEventListener("farmos:expense-created", onCreated);
  }, []);
  // species: tableau vide = produit large spectre (visible pour toutes les espèces).
  const matchesSpecies = (s) => !speciesFilter || (s.species || []).length === 0 || (s.species || []).includes(speciesFilter);
  const filteredFeed = stock.filter(s => s.kind === "feed" && matchesSpecies(s));
  const filteredMed = stock.filter(s => s.kind === "med" && matchesSpecies(s));
  const visible = [...filteredFeed, ...filteredMed];

  // KPI Coût alimentation · mois : somme des dépenses catégorie 'feed' pour
  // le mois courant. Pas de filtre espèce sur les expenses (pas relié).
  const feedCostMonth = allExpenses.reduce((s, e) => {
    const cat = String(e.category || "").toLowerCase();
    const d = e.expenseDate || e.expense_date;
    if ((cat === "feed" || cat === "alimentation") && inDateRange(d, dateRange)
      && (!activeCurrencyId || String(rowCurrencyId(e) ?? currencyMeta.defaultCurrencyId ?? "") === activeCurrencyId)) {
      return s + Number(e.amount || 0);
    }
    return s;
  }, 0);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Stock · Inventory" : "Inventory · Stock"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Stock & alimentation, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).fr.toLowerCase() : "magasin central"}</span></>
            : <>Stock & feed, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).en.toLowerCase() : "central storage"}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {kindFilter !== "med" && <KpiCard label={lang === "fr" ? "Stock aliment" : "Feed stock"} value={`${(filteredFeed.reduce((a,b)=>a+b.qty,0)/1000).toFixed(1)} t`} icon="wheat" accent="var(--health-500)"/>}
        {kindFilter !== "feed" && <KpiCard label={lang === "fr" ? "Médicaments" : "Medicines"} value={filteredMed.length} unit="réf." icon="pill"/>}
        <KpiCard label={lang === "fr" ? "Stock faible" : "Low stock"} value={visible.filter(s => s.lowStock).length} unit="" icon="alert" accent={visible.some(s => s.lowStock) ? "var(--rust-700)" : "var(--ink-500)"}/>
        {kindFilter !== "med" && <KpiCard label={lang === "fr" ? "Coût alimentation · période" : "Feed cost · period"} sublabel={rangeLabel(dateRange, lang)} value={feedCostMonth > 0 ? feedCostMonth.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA") : "—"} unit={moneyUnit} icon="coins" accent="var(--money-500)"/>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: kindFilter ? "1fr" : "var(--cols-2)", gap: 16 }}>
        {kindFilter !== "med" && <StockTable lang={lang} kind="feed" items={filteredFeed} title={lang === "fr" ? "Aliments" : "Feed"} accent="var(--health-500)" onAdd={() => setAddOpen("feed")} onRowClick={setEditing}/>}
        {kindFilter !== "feed" && <StockTable lang={lang} kind="med" items={filteredMed} title={lang === "fr" ? "Médicaments" : "Medicines"} accent="var(--oxblood-700)" onAdd={() => setAddOpen("med")} onRowClick={setEditing}/>}
      </div>

      {kindFilter !== "med" && (
        <FeedForecastBlock lang={lang} forecasts={forecasts.filter(f => !speciesFilter || f.species === speciesFilter)}/>
      )}

      {addOpen && (
        <MedicineFormModal
          lang={lang}
          kind={addOpen}
          defaultSpecies={speciesFilter ? [speciesFilter] : []}
          onClose={() => setAddOpen(null)}
          onSaved={() => { setAddOpen(null); setReloadKey(k => k + 1); }}
        />
      )}
      {editing && (
        <MedicineFormModal
          lang={lang}
          medicine={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReloadKey(k => k + 1); }}
        />
      )}
    </div>
  );
};

function FeedForecastBlock({ lang, forecasts }) {
  return (
    <div className="card rule-lines" style={{ background: "var(--parchment-50)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ink-900)", color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" size={15} color="#D7AA45"/>
        </div>
        <div className="bilang">
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Prédiction des besoins · 14 j" : "Needs forecast · 14 d"}</h3>
          <span className="sec">{lang === "fr" ? "IA — généré côté serveur" : "AI — server-generated"}</span>
        </div>
      </div>
      {forecasts.length === 0 ? (
        <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--fg-3)", fontSize: 13, fontStyle: "italic" }}>
          {lang === "fr"
            ? "Aucune prédiction disponible. L'IA publiera ses estimations dans cette zone dès qu'elle sera connectée."
            : "No forecast available. The AI will publish its estimates here once connected."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
          {forecasts.map((p) => {
            const sp = speciesById(p.species);
            return (
              <div key={p.id} style={{ background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <AnimalGlyph kind={sp.glyph} size={16} color={sp.accent}/>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? sp.fr : sp.en}</span>
                  {!!p.urgent && <span className="tag tag-danger" style={{ marginLeft: "auto", fontSize: 10 }}>{lang === "fr" ? "Urgent" : "Urgent"}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{p.item}</div>
                <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-950)", letterSpacing: "-0.01em", marginTop: 4 }}>
                  {Number(p.neededKg).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} kg
                </div>
                {p.confidence != null && (
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{lang === "fr" ? "confiance" : "confidence"} {p.confidence}%</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MedicineFormModal({ lang, kind, defaultSpecies, medicine, onClose, onSaved }) {
  const isEdit = !!medicine;
  const effectiveKind = medicine?.kind || kind;
  const [name, setName] = React.useState(medicine?.name || "");
  const [quantity, setQuantity] = React.useState(medicine?.qty != null ? String(medicine.qty) : "");
  const [unit, setUnit] = React.useState(medicine?.unit || (effectiveKind === "feed" ? "kg" : "doses"));
  const [minQuantity, setMinQuantity] = React.useState(medicine?.min != null ? String(medicine.min) : "");
  const [supplier, setSupplier] = React.useState(medicine?.supplier || "");
  const [supplierId, setSupplierId] = React.useState(medicine?.supplierId != null ? String(medicine.supplierId) : "");
  const [suppliers, setSuppliers] = React.useState([]);
  React.useEffect(() => {
    api.listSuppliers().then((r) => {
      const arr = Array.isArray(r) ? r : (r?.getAllSupplier || r?.data || []);
      setSuppliers((arr || []).filter((s) => String(s.status) === "true"));
    }).catch(() => setSuppliers([]));
  }, []);
  const [expiryDate, setExpiryDate] = React.useState(medicine && medicine.expiry && medicine.expiry !== "—" ? medicine.expiry : "");
  const [notes, setNotes] = React.useState(medicine?.notes || "");
  const [species, setSpecies] = React.useState(medicine?.species?.length ? medicine.species : (defaultSpecies || []));
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState("");
  const toggleSpecies = (sp) => setSpecies(s => s.includes(sp) ? s.filter(x => x !== sp) : [...s, sp]);
  const handleSave = async () => {
    if (!name.trim() || quantity === "" || quantity == null) { setError(lang === "fr" ? "Nom et quantité requis." : "Name and quantity required."); return; }
    setSaving(true); setError("");
    const payload = {
      name: name.trim(),
      kind: effectiveKind,
      quantity: Number(quantity),
      unit: unit || null,
      min_quantity: minQuantity ? Number(minQuantity) : null,
      supplier: supplier.trim() || null,
      supplier_id: supplierId ? Number(supplierId) : null,
      expiry_date: expiryDate || null,
      notes: notes.trim() || null,
      species: species.length ? species : null,
    };
    try {
      if (isEdit) await api.updateMedicine(medicine._pk, payload);
      else await api.createMedicine(payload);
      onSaved();
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!isEdit) return;
    if (!window.confirm(lang === "fr" ? `Supprimer définitivement "${name}" ?` : `Permanently delete "${name}"?`)) return;
    setDeleting(true); setError("");
    try {
      await api.deleteMedicine(medicine._pk);
      onSaved();
    } catch (e) {
      setError(e.message || "Erreur");
      setDeleting(false);
    }
  };
  const titleNew = effectiveKind === "feed"
    ? (lang === "fr" ? "Nouvel aliment" : "New feed")
    : (lang === "fr" ? "Nouveau médicament" : "New medicine");
  const titleEdit = effectiveKind === "feed"
    ? (lang === "fr" ? "Détails / modifier — aliment" : "Details / edit — feed")
    : (lang === "fr" ? "Détails / modifier — médicament" : "Details / edit — medicine");
  const title = isEdit ? titleEdit : titleNew;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 520, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>{title}</h3>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>
          {lang === "fr" ? "Coche les espèces concernées. Aucune coche = produit large spectre (visible pour toutes)." : "Check applicable species. None = broad-spectrum (visible to all)."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Nom" : "Name"}
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Quantité" : "Quantity"}
              <input type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Unité" : "Unit"}
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }} placeholder="kg, doses, ml…"/>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Seuil minimum" : "Min threshold"}
              <input type="number" min="0" step="0.01" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Expiration" : "Expiry"}
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
          </div>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Fournisseur" : "Supplier"}
            <select value={supplierId} onChange={(e) => {
              const id = e.target.value;
              setSupplierId(id);
              const s = suppliers.find((x) => String(x.id) === id);
              if (s) setSupplier(s.name);
            }} className="input" style={{ width: "100%", marginTop: 4 }}>
              <option value="">{lang === "fr" ? "— Aucun / saisir ci-dessous —" : "— None / type below —"}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.partyType === "individual" ? (lang === "fr" ? " (personne)" : " (person)") : ""}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Fournisseur (texte libre)" : "Supplier (free text)"}
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 6 }}>{lang === "fr" ? "Espèces concernées" : "Applicable species"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SPECIES.map((sp) => {
                const checked = species.includes(sp.id);
                return (
                  <button key={sp.id} type="button" onClick={() => toggleSpecies(sp.id)}
                    className={`tag ${checked ? "tag-success" : ""}`}
                    style={{ cursor: "pointer", border: "1px solid var(--border-1)", background: checked ? "var(--health-100)" : "var(--paper)", color: "var(--ink-900)", fontSize: 11.5, padding: "4px 10px" }}>
                    {lang === "fr" ? sp.fr : sp.en}
                  </button>
                );
              })}
            </div>
          </div>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Notes" : "Notes"}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          {isEdit && (
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", display: "flex", gap: 12, paddingTop: 4, borderTop: "1px dashed var(--border-1)" }}>
              <span>ID: {medicine.id}</span>
              {medicine.lowStock && <span style={{ color: "var(--rust-700)" }}>{lang === "fr" ? "⚠ Stock sous le seuil" : "⚠ Below threshold"}</span>}
            </div>
          )}
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            {isEdit && (
              <button className="btn" style={{ color: "var(--rust-700)", borderColor: "var(--rust-700)", marginRight: "auto" }} onClick={handleDelete} disabled={saving || deleting}>
                {deleting ? "…" : (lang === "fr" ? "Supprimer" : "Delete")}
              </button>
            )}
            <button className="btn" onClick={onClose} disabled={saving || deleting}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || deleting}>{saving ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DISEASE LIBRARY EDITOR (bibliothèque maladies enrichie) ──────────────
const URGENCY_OPTS = [
  { id: "", fr: "—", en: "—" },
  { id: "low", fr: "Faible", en: "Low" },
  { id: "medium", fr: "Moyenne", en: "Medium" },
  { id: "high", fr: "Élevée", en: "High" },
  { id: "critical", fr: "Critique", en: "Critical" },
];
const MORTALITY_OPTS = [
  { id: "", fr: "—", en: "—" },
  { id: "low", fr: "Faible", en: "Low" },
  { id: "medium", fr: "Moyen", en: "Medium" },
  { id: "high", fr: "Élevé", en: "High" },
];

function DiseaseFormModal({ lang, defaultSpecies, disease, onClose, onSaved }) {
  const isEdit = !!disease;
  const [nameFr, setNameFr] = React.useState(disease?.nameFr || disease?.name_fr || "");
  const [nameEn, setNameEn] = React.useState(disease?.nameEn || disease?.name_en || "");
  const [species, setSpecies] = React.useState(disease?.species || defaultSpecies || (SPECIES[0] && SPECIES[0].id) || "");
  const [contagious, setContagious] = React.useState(!!(disease?.contagious));
  const [severity, setSeverity] = React.useState(disease?.severityDefault || disease?.severity_default || "");
  const [commonRoute, setCommonRoute] = React.useState(disease?.commonRoute || disease?.common_route || "");
  const [urgency, setUrgency] = React.useState(disease?.urgencyLevel || disease?.urgency_level || "");
  const [symptoms, setSymptoms] = React.useState(disease?.symptoms || "");
  const [prevention, setPrevention] = React.useState(disease?.prevention || "");
  const [vaccine, setVaccine] = React.useState(!!(disease?.vaccineAvailable ?? disease?.vaccine_available));
  const [mortality, setMortality] = React.useState(disease?.mortalityRisk || disease?.mortality_risk || "");
  const [protocol, setProtocol] = React.useState(disease?.recommendedProtocol || disease?.recommended_protocol || "");
  const [causes, setCauses] = React.useState(disease?.possibleCauses || disease?.possible_causes || "");
  const [exams, setExams] = React.useState(disease?.recommendedExams || disease?.recommended_exams || "");
  const [notes, setNotes] = React.useState(disease?.notes || "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSave = async () => {
    if (!nameFr.trim() || !species) { setError(lang === "fr" ? "Nom (FR) et espèce requis." : "Name (FR) and species required."); return; }
    setSaving(true); setError("");
    const payload = {
      species,
      name_fr: nameFr.trim(),
      name_en: nameEn.trim() || null,
      contagious: contagious ? 1 : 0,
      severity_default: severity || null,
      common_route: commonRoute.trim() || null,
      urgency_level: urgency || null,
      symptoms: symptoms.trim() || null,
      prevention: prevention.trim() || null,
      vaccine_available: vaccine ? 1 : 0,
      mortality_risk: mortality || null,
      recommended_protocol: protocol.trim() || null,
      possible_causes: causes.trim() || null,
      recommended_exams: exams.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit) await api.updateDisease(disease.id, payload);
      else await api.createDisease(payload);
      onSaved();
    } catch (e) {
      setError(e.message || "Erreur"); setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!isEdit) return;
    if (!window.confirm(lang === "fr" ? `Retirer "${nameFr}" de la bibliothèque ?` : `Remove "${nameFr}" from library?`)) return;
    setDeleting(true); setError("");
    try { await api.deleteDisease(disease.id); onSaved(); }
    catch (e) { setError(e.message || "Erreur"); setDeleting(false); }
  };

  const title = isEdit
    ? (lang === "fr" ? "Modifier la maladie" : "Edit disease")
    : (lang === "fr" ? "Nouvelle maladie" : "New disease");
  const lbl = { fontSize: 12, color: "var(--fg-2)" };
  const inputStyle = { width: "100%", marginTop: 4 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 560, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 16 }}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lbl}>{lang === "fr" ? "Nom (FR)" : "Name (FR)"}
              <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="input" style={inputStyle}/>
            </label>
            <label style={lbl}>{lang === "fr" ? "Nom (EN)" : "Name (EN)"}
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="input" style={inputStyle}/>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lbl}>{lang === "fr" ? "Espèce" : "Species"}
              <select value={species} onChange={(e) => setSpecies(e.target.value)} className="input" style={inputStyle}>
                {SPECIES.map((sp) => <option key={sp.id} value={sp.id}>{lang === "fr" ? sp.fr : sp.en}</option>)}
              </select>
            </label>
            <label style={lbl}>{lang === "fr" ? "Niveau d'urgence" : "Urgency level"}
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="input" style={inputStyle}>
                {URGENCY_OPTS.map((o) => <option key={o.id} value={o.id}>{lang === "fr" ? o.fr : o.en}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lbl}>{lang === "fr" ? "Sévérité par défaut" : "Default severity"}
              <input value={severity} onChange={(e) => setSeverity(e.target.value)} className="input" style={inputStyle} placeholder={lang === "fr" ? "légère, modérée…" : "mild, moderate…"}/>
            </label>
            <label style={lbl}>{lang === "fr" ? "Risque de mortalité" : "Mortality risk"}
              <select value={mortality} onChange={(e) => setMortality(e.target.value)} className="input" style={inputStyle}>
                {MORTALITY_OPTS.map((o) => <option key={o.id} value={o.id}>{lang === "fr" ? o.fr : o.en}</option>)}
              </select>
            </label>
          </div>
          <label style={lbl}>{lang === "fr" ? "Voie de transmission courante" : "Common route"}
            <input value={commonRoute} onChange={(e) => setCommonRoute(e.target.value)} className="input" style={inputStyle} placeholder={lang === "fr" ? "respiratoire, fécale-orale…" : "respiratory, faecal-oral…"}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Symptômes" : "Symptoms"}
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Prévention" : "Prevention"}
            <textarea value={prevention} onChange={(e) => setPrevention(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Causes possibles" : "Possible causes"}
            <textarea value={causes} onChange={(e) => setCauses(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Examens recommandés" : "Recommended exams"}
            <textarea value={exams} onChange={(e) => setExams(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Protocole recommandé" : "Recommended protocol"}
            <textarea value={protocol} onChange={(e) => setProtocol(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={contagious} onChange={(e) => setContagious(e.target.checked)}/>{lang === "fr" ? "Contagieuse" : "Contagious"}
            </label>
            <label style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={vaccine} onChange={(e) => setVaccine(e.target.checked)}/>{lang === "fr" ? "Vaccin disponible" : "Vaccine available"}
            </label>
          </div>
          <label style={lbl}>{lang === "fr" ? "Notes" : "Notes"}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} style={inputStyle}/>
          </label>
          {isEdit && <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", paddingTop: 4, borderTop: "1px dashed var(--border-1)" }}>ID: {disease.id}</div>}
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            {isEdit && (
              <button className="btn" style={{ color: "var(--rust-700)", borderColor: "var(--rust-700)", marginRight: "auto" }} onClick={handleDelete} disabled={saving || deleting}>
                {deleting ? "…" : (lang === "fr" ? "Retirer" : "Remove")}
              </button>
            )}
            <button className="btn" onClick={onClose} disabled={saving || deleting}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || deleting}>{saving ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const StockTable = ({ lang, kind, items, title, accent, onAdd, onRowClick }) => (
  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{title}</h3>
      <div style={{ display: "flex", gap: 6 }}>
        {onAdd && (
          <button className="btn btn-sm btn-primary" onClick={onAdd}>
            <Icon name="plus" size={12} color="var(--paper)"/>{lang === "fr" ? "Ajouter" : "Add"}
          </button>
        )}
        <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "stock" }))}><Icon name="plus" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Entrée" : "Entry"}</button>
      </div>
    </div>
    {items.map((s, i) => {
      const pct = Math.min(100, (s.qty / (s.min * 3)) * 100);
      const low = s.qty < s.min;
      return (
        <div key={s.id} onClick={() => onRowClick && onRowClick(s)} style={{ padding: "12px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--border-1)" : "none", display: "flex", flexDirection: "column", gap: 6, cursor: onRowClick ? "pointer" : "default" }}
          onMouseEnter={onRowClick ? (e) => e.currentTarget.style.background = "var(--bg-sunken)" : undefined}
          onMouseLeave={onRowClick ? (e) => e.currentTarget.style.background = "transparent" : undefined}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{s.id} · {s.supplier}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span className="tnum serif" style={{ fontSize: 18, fontWeight: 500, color: low ? "var(--rust-700)" : "var(--ink-950)" }}>{s.qty.toLocaleString("fr-CA")}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 3 }}>{s.unit}</span>
              <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>min {s.min} · exp {s.expiry}</div>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--ink-100)", borderRadius: 2, overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: low ? "var(--rust-700)" : accent, transition: "width 200ms" }}/>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(s.min / (s.min * 3)) * 100}%`, width: 1, background: "var(--ink-400)" }}/>
          </div>
          {low && <div style={{ fontSize: 11, color: "var(--rust-700)", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="alert" size={11} color="var(--rust-700)"/>
            {lang === "fr" ? "Stock sous le seuil minimum — commande recommandée" : "Below minimum threshold — order recommended"}
          </div>}
        </div>
      );
    })}
  </div>
);

// ─── REPRODUCTION ────────────────────────────────────────────────────────
const ReproScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [allGestations, setAllGestations] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("quarter"));
  const refresh = useDataRefresh(["reproductionEvents", "animals"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listReproductionEvents(), api.listAnimals()])
      .then(([evs, animals]) => {
        if (cancel) return;
        const aMap = new Map((Array.isArray(animals) ? animals : []).map((a) => [a.id, a]));
        const mapped = (Array.isArray(evs) ? evs : []).map((e) => adaptReproEvent(e, aMap));
        setAllGestations(mapped);
      })
      .catch((e) => console.warn("listReproductionEvents failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:repro-created", onCreated);
    return () => window.removeEventListener("farmos:repro-created", onCreated);
  }, []);
  const gestations = allGestations.filter(g => (!speciesFilter || g.species === speciesFilter) && inDateRange(g.start, dateRange));

  // KPIs dérivés des events repro réels + filtrés par espèce.
  // - Chaleurs sem. = events de type 'heat' dans les 7 derniers jours.
  // - Mises bas 30 j = events 'birthing' (somme offspring si dispo, sinon 1)
  //   dans les 30 derniers jours.
  // - Taux fertilité = % inséminations confirmées (success/pregnant) parmi
  //   les inséminations des 90 derniers jours pour cette espèce.
  const now = Date.now();
  const DAY = 86400000;
  const eventsForSpecies = allGestations; // déjà filtrés via adapt → species
  const inWindow = (raw, days) => {
    if (!raw) return false;
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) return false;
    return now - d.getTime() <= days * DAY;
  };
  const filteredEvents = eventsForSpecies.filter((g) => (!speciesFilter || g.species === speciesFilter) && inDateRange(g.start, dateRange));
  const heatsWeek = filteredEvents.filter((g) => /heat|chaleur/i.test(String(g.ai || g.eventType || "")) && inWindow(g.start, 7)).length;
  const birthsMonth = filteredEvents.reduce((s, g) => {
    if (!g.complete || !inWindow(g.start, 30)) return s;
    return s + (Number(g.offspring) > 0 ? Number(g.offspring) : 1);
  }, 0);
  const ai90 = filteredEvents.filter((g) => /insemin|ai|saill/i.test(String(g.ai || g.eventType || "")) && inWindow(g.start, 90));
  const ok90 = ai90.filter((g) => g.complete || /success|confirmed|pregnant/i.test(String(g.outcome || ""))).length;
  const fertilityRate = ai90.length > 0 ? Math.round((ok90 / ai90.length) * 100) : null;
  const heatChartData = Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    const d = new Date(now - daysAgo * DAY).toISOString().slice(0, 10);
    const count = allGestations.filter((g) =>
      (!speciesFilter || g.species === speciesFilter) &&
      g.start === d &&
      /heat|chaleur/i.test(String(g.ai || g.eventType || ""))
    ).length;
    return { daysAgo, count };
  });
  const heatChartMax = Math.max(1, ...heatChartData.map((x) => x.count));

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Reproduction · Repro" : "Reproduction · Reproduction"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Reproduction, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).fr.toLowerCase() : "cycles & gestations"}</span></>
            : <>Reproduction, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).en.toLowerCase() : "cycles & gestations"}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Gestations actives" : "Active gestations"} value={gestations.filter(g=>!g.complete).length} icon="fingerprint" accent="var(--pertinence-700)"/>
        <KpiCard label={lang === "fr" ? "Chaleurs détectées · sem." : "Heats detected · week"} value={heatsWeek} icon="pulse" accent={heatsWeek > 0 ? "var(--oxblood-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Taux fertilité" : "Fertility rate"} value={fertilityRate != null ? fertilityRate : "—"} unit={fertilityRate != null ? "%" : ""} icon="chart" accent={fertilityRate != null && fertilityRate >= 60 ? "var(--solidite-500)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Mises bas · 30 j" : "Births · 30 d"} value={birthsMonth} icon="sparkle"/>
      </div>

      {/* Gestation timeline */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="bilang">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Gestations en cours" : "Active gestations"}</h3>
            <span className="sec">{lang === "fr" ? "timeline" : "timeline"}</span>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("farmos:openEntry", { detail: "repro" }))}><Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Saillie / IA" : "Mating / AI"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {gestations.map((g) => {
            const sp = speciesById(g.species);
            const pct = (g.day / g.total) * 100;
            const locked = isSaleLockedStatus(g.animalStatus);
            return (
              <div key={g.id} style={{ display: "grid", gridTemplateColumns: "32px 160px 1fr 120px 32px", gap: 14, alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AnimalGlyph kind={sp.glyph} size={16} color="currentColor"/>
                </div>
                <div>
                  <div className="italic-serif" style={{ fontSize: 15, color: "var(--ink-950)" }}>{g.animal}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{g.ai}</div>
                </div>
                <div>
                  <div style={{ height: 8, background: "var(--ink-100)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: g.complete ? "var(--sage-500)" : g.soon ? "var(--rust-700)" : sp.accent, transition: "width 200ms" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--fg-3)" }} className="mono">
                    <span>J{g.day} / {g.total}</span>
                    <span>{g.start}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {g.complete ? (
                    <span className="tag" style={{ background: "var(--solidite-50)", color: "var(--solidite-900)" }}>{lang === "fr" ? "Mise bas ✓" : "Birthed ✓"}</span>
                  ) : g.soon ? (
                    <>
                      <span className="tag tag-danger" style={{ fontSize: 11 }}>{lang === "fr" ? "Imminent" : "Imminent"}</span>
                      <div className="mono" style={{ fontSize: 11, color: "var(--rust-700)", marginTop: 4 }}>{g.due}</div>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-800)" }}>{Math.round(g.total - g.day)} j</span>
                      <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{g.due}</div>
                    </>
                  )}
                </div>
                {g._pk && !locked ? (
                  <button className="btn btn-sm btn-ghost" title={lang === "fr" ? "Supprimer" : "Delete"}
                    onClick={async () => {
                      if (!window.confirm(lang === "fr" ? `Supprimer l'événement ${g.animal} ?` : `Delete event ${g.animal}?`)) return;
                      try { await api.deleteReproductionEvent(g._pk); window.dispatchEvent(new CustomEvent("farmos:repro-created")); } catch (e) { window.alert(e.message); }
                    }}>
                    <Icon name="trash" size={13} color="var(--oxblood-700)"/>
                  </button>
                ) : <span/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heat detection chart */}
      <div className="card">
        <div className="bilang" style={{ marginBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, letterSpacing: "-0.01em" }}>{lang === "fr" ? "Détection des chaleurs · 14 jours" : "Heat detection · 14 days"}</h3>
          <span className="sec">{lang === "fr" ? "événements enregistrés" : "recorded events"}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 4, alignItems: "end", height: 100 }}>
          {heatChartData.map((v, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div title={`${v.count}`} style={{ width: "100%", height: `${v.count > 0 ? Math.max(4, (v.count / heatChartMax) * 86) : 0}px`, background: i >= 11 ? "var(--oxblood-700)" : "var(--pertinence-500)", borderRadius: "2px 2px 0 0" }}/>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>{v.daysAgo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── PRODUCTION ──────────────────────────────────────────────────────────
const ProductionScreen = ({ lang, speciesFilter, onSpeciesFilter, enabledSpecies }) => {
  const [logs, setLogs] = React.useState([]);
  const [live, setLive] = React.useState({ animals: [], treatments: [], sales: [], expenses: [] });
  const [reloadKey, setReloadKey] = React.useState(0);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("7d"));
  const refresh = useDataRefresh(["animals", "productionLogs", "sales", "expenses", "treatments"]);

  // ── Egg section state ──
  const [eggStock, setEggStock] = React.useState({ produced: 0, sold: 0, available: 0 });
  const [buildings, setBuildings] = React.useState([]);
  const currencyMeta = useCurrencyCatalog();
  const [eggHarvestForm, setEggHarvestForm] = React.useState({ open: false, date: new Date().toISOString().slice(0, 10), building_id: "", quantity: "", broken: "", notes: "" });
  const [eggSaleForm, setEggSaleForm] = React.useState({ open: false, date: new Date().toISOString().slice(0, 10), quantity: "", unit: "oeufs", unit_price: "", buyer: "", currency_id: "", notes: "" });
  const [eggSubmitting, setEggSubmitting] = React.useState(false);
  const [eggError, setEggError] = React.useState("");

  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listProductionLogs(), api.getDashboardSnapshot(), api.getEggStock(), api.listBuildings("chicken")])
      .then(([rows, snapshot, stock, bldgs]) => {
        if (cancel) return;
        setLogs(Array.isArray(rows) ? rows : []);
        setLive({
          animals: Array.isArray(snapshot?.animals) ? snapshot.animals : [],
          treatments: Array.isArray(snapshot?.treatments) ? snapshot.treatments : [],
          sales: Array.isArray(snapshot?.sales) ? snapshot.sales : [],
          expenses: Array.isArray(snapshot?.expenses) ? snapshot.expenses : [],
        });
        if (stock && typeof stock.available === "number") setEggStock(stock);
        setBuildings(Array.isArray(bldgs) ? bldgs : []);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:production-created", onCreated);
    return () => window.removeEventListener("farmos:production-created", onCreated);
  }, []);
  const productTypeOf = (l) => l.productType || l.product_type || "";
  const logDateOf = (l) => l.logDate || l.log_date || "";
  const animalIdOf = (l) => l.animalId ?? l.animal_id ?? "all";
  const periodLogs = logs.filter((l) => (!speciesFilter || l.species === speciesFilter) && inDateRange(logDateOf(l), dateRange));
  const filteredLogs = periodLogs.slice(0, 12);
  const visibleSpecies = enabledSpecies && enabledSpecies.length ? SPECIES.filter((s) => enabledSpecies.includes(s.id)) : SPECIES;
  const productTypesForSpecies = (s) => {
    if (s.productPrimary === "growth") return s.id === "fish" ? ["biomass", "fish", "growth", "weight"] : ["growth", "weight"];
    return [s.productPrimary];
  };
  const deriveSpeciesProduction = (s) => {
    const wanted = productTypesForSpecies(s);
    const rows = periodLogs.filter((l) => l.species === s.id && wanted.includes(productTypeOf(l)));
    const sourceRows = rows.length ? rows : periodLogs.filter((l) => l.species === s.id);
    const byDate = new Map();
    sourceRows.forEach((l) => {
      const d = String(logDateOf(l) || "").slice(0, 10) || "—";
      byDate.set(d, (byDate.get(d) || 0) + Number(l.quantity || 0));
    });
    const values = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-12);
    const trend = values.length ? values : [0, 0, 0, 0, 0, 0];
    const total = sourceRows.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
    const lastUnit = [...sourceRows].reverse().find((l) => l.unit)?.unit || "";
    return {
      total,
      unit: lastUnit,
      trend,
      hasData: sourceRows.length > 0,
      delta: trend.length > 1 && trend[0] > 0 ? ((trend[trend.length - 1] - trend[0]) / trend[0]) * 100 : null,
    };
  };
  const deriveSpeciesScore = (s, production) => {
    const animals = live.animals.filter((a) => a.species === s.id && isActiveLivestock(a));
    const total = animals.reduce((sum, a) => sum + animalQty(a), 0) || 1;
    const sick = animals.filter((a) => a.status && a.status !== "healthy").reduce((sum, a) => sum + animalQty(a), 0);
    const sante = animals.length ? Math.max(0, Math.round(((total - sick) / total) * 100)) : 0;
    const prod = production.hasData ? Math.max(0, Math.min(100, Math.round(60 + Math.min(40, production.trend.filter((v) => v > 0).length * 6)))) : 0;
    const sales = live.sales.filter((x) => x.species === s.id && inDateRange(x.saleDate || x.sale_date, dateRange));
    const expenses = live.expenses.filter((x) => (x.species === s.id || !x.species) && inDateRange(x.expenseDate || x.expense_date, dateRange));
    const rev = sales.reduce((sum, x) => sum + Number(x.totalAmount ?? x.total_amount ?? 0), 0);
    const exp = expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const finance = rev > 0 ? Math.max(0, Math.min(100, Math.round(((rev - exp) / rev) * 100))) : 0;
    return { sante, prod, finance };
  };

  // KPIs production : agrégats live des production_logs (date la plus récente
  // disponible). Pas de delta (pas d'historique mois-1 facile à comparer ici).
  const sumProduct = (productType, speciesId) => periodLogs
    .filter((l) => productTypeOf(l) === productType && (!speciesId || l.species === speciesId))
    .reduce((s, l) => s + Number(l.quantity || 0), 0);
  // Lait: somme du jour (AM+PM) ou hier si rien aujourd'hui.
  const milkToday = sumProduct("milk", "cow");
  // Œufs idem
  const eggsToday = sumProduct("eggs", "chicken");
  // GMQ porcs (g/j): moyenne des derniers logs growth/weight pour porc.
  const growthLogs = periodLogs.filter((l) => ["growth", "weight"].includes(productTypeOf(l)) && l.species === "pig").slice(0, 20);
  const gmqAvg = growthLogs.length
    ? Math.round(growthLogs.reduce((s, l) => s + Number(l.quantity || 0), 0) / growthLogs.length)
    : 0;
  // Biomasse poisson: dernière valeur connue par bassin sommée
  const fishBiomass = (() => {
    const byPond = new Map();
    periodLogs
      .filter((l) => l.species === "fish" && productTypeOf(l) === "biomass")
      .forEach((l) => {
        const key = animalIdOf(l);
        const prev = byPond.get(key);
        const d = logDateOf(l);
        if (!prev || (d && String(d) > String(prev.d || ""))) byPond.set(key, { qty: Number(l.quantity || 0), d });
      });
    return Array.from(byPond.values()).reduce((s, x) => s + x.qty, 0);
  })();
  const fmt = (n) => n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Production · Output" : "Output · Production"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Production journalière, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).fr.toLowerCase() : "lait, œufs, croissance"}</span></>
            : <>Daily production, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesFilter ? speciesById(speciesFilter).en.toLowerCase() : "milk, eggs, growth"}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} enabledSpecies={enabledSpecies} compact/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Lait · période" : "Milk · period"} sublabel={rangeLabel(dateRange, lang)} value={milkToday > 0 ? fmt(Math.round(milkToday)) : "—"} unit="L" icon="droplet" accent="var(--pertinence-500)"/>
        <KpiCard label={lang === "fr" ? "Œufs · période" : "Eggs · period"} sublabel={rangeLabel(dateRange, lang)} value={eggsToday > 0 ? fmt(Math.round(eggsToday)) : "—"} unit="" icon="egg" accent="var(--autorite-500)"/>
        <KpiCard label={lang === "fr" ? "GMQ porcs" : "Pig ADG"} value={gmqAvg > 0 ? fmt(gmqAvg) : "—"} unit="g/j" icon="weight" accent="var(--oxblood-700)"/>
        <KpiCard label={lang === "fr" ? "Biomasse poisson" : "Fish biomass"} value={fishBiomass > 0 ? fmt(Math.round(fishBiomass)) : "—"} unit="kg" icon="fish" accent="var(--pertinence-700)"/>
      </div>

      {/* Per-species production cards */}
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 16 }}>
        {visibleSpecies.filter(s => !speciesFilter || s.id === speciesFilter).slice(0, 6).map((s) => {
          const production = deriveSpeciesProduction(s);
          const score = deriveSpeciesScore(s, production);
          const liveCount = live.animals.filter((a) => a.species === s.id && isActiveLivestock(a)).reduce((sum, a) => sum + animalQty(a), 0);
          return (
          <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.accentBg, color: s.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AnimalGlyph kind={s.glyph} size={20} color="currentColor"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{lang === "fr" ? s.fr : s.en}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{liveCount.toLocaleString("fr-CA")} {s.countingUnit}</div>
              </div>
              <FarmScore {...score} size="sm"/>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="serif tnum" style={{ fontSize: 30, fontWeight: 500, color: "var(--ink-950)", letterSpacing: "-0.02em" }}>{production.hasData ? fmt(Math.round(production.total)) : "—"}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{production.unit || (lang === "fr" ? "aucune donnée" : "no data")}</span>
              {production.delta != null && (
                <span className="mono" style={{ fontSize: 11, color: production.delta >= 0 ? "var(--solidite-700)" : "var(--rust-700)", marginLeft: "auto" }}>
                  {production.delta >= 0 ? "+" : ""}{production.delta.toFixed(1)}%
                </span>
              )}
            </div>
            <Sparkline data={production.trend} color={s.accent} height={48}/>
          </div>
        );})}
      </div>

      {filteredLogs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Derniers enregistrements" : "Recent records"}</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{filteredLogs.length}</span>
          </div>
          {filteredLogs.map((l, i) => {
            const sp = speciesById(l.species);
            return (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "70px 32px 1fr 90px 70px", gap: 14, padding: "10px 18px", alignItems: "center", borderBottom: i < filteredLogs.length - 1 ? "1px solid var(--border-1)" : "none" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(l.logDate || l.log_date || "").slice(0, 10)}</span>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: sp?.accentBg, color: sp?.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AnimalGlyph kind={sp?.glyph} size={12} color="currentColor"/>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink-900)", fontWeight: 500 }}>{l.productType || l.product_type} {l.period ? `· ${l.period}` : ""}</div>
                  {l.notes && <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{l.notes}</div>}
                </div>
                <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{Number(l.quantity).toLocaleString("fr-CA")}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{l.unit || ""}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SECTION ŒUFS ─────────────────────────────────────────── */}
      {(!speciesFilter || speciesFilter === "chicken") && (
        <EggSection
          lang={lang}
          eggStock={eggStock}
          buildings={buildings}
          currencyMeta={currencyMeta}
          harvestForm={eggHarvestForm}
          setHarvestForm={setEggHarvestForm}
          saleForm={eggSaleForm}
          setSaleForm={setEggSaleForm}
          submitting={eggSubmitting}
          setSubmitting={setEggSubmitting}
          error={eggError}
          setError={setEggError}
          onRefresh={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

// ─── EGG SECTION ─────────────────────────────────────────────────────────
function EggSection({ lang, eggStock, buildings, currencyMeta, harvestForm, setHarvestForm, saleForm, setSaleForm, submitting, setSubmitting, error, setError, onRefresh }) {
  const fmt = (n) => Number(n).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
  const moneySymbol = currencyMeta.fallbackSymbol || "CDF";

  async function submitHarvest(e) {
    e.preventDefault();
    setError("");
    const qty = Number(harvestForm.quantity);
    if (!qty || qty <= 0) { setError(lang === "fr" ? "Quantité requise." : "Quantity required."); return; }
    setSubmitting(true);
    try {
      const quality = {};
      if (harvestForm.broken) quality.broken = Number(harvestForm.broken);
      await api.createProductionLog({
        species: "chicken",
        product_type: "eggs",
        log_date: harvestForm.date,
        quantity: qty,
        unit: "oeufs",
        building_id: harvestForm.building_id ? Number(harvestForm.building_id) : null,
        quality: Object.keys(quality).length ? quality : null,
        notes: harvestForm.notes || null,
      });
      setHarvestForm((f) => ({ ...f, open: false, quantity: "", broken: "", notes: "" }));
      onRefresh();
    } catch (err) {
      setError(err.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSale(e) {
    e.preventDefault();
    setError("");
    const qty = Number(saleForm.quantity);
    const unitPrice = saleForm.unit_price ? Number(saleForm.unit_price) : null;
    const total = unitPrice != null ? qty * unitPrice : 0;
    if (!qty || qty <= 0) { setError(lang === "fr" ? "Quantité requise." : "Quantity required."); return; }
    if (qty > eggStock.available) {
      setError(lang === "fr" ? `Stock insuffisant. Disponible: ${fmt(eggStock.available)} œufs.` : `Insufficient stock. Available: ${fmt(eggStock.available)} eggs.`);
      return;
    }
    if (!total) { setError(lang === "fr" ? "Montant total requis." : "Total amount required."); return; }
    setSubmitting(true);
    try {
      await api.createSale({
        species: "chicken",
        product_type: "eggs",
        sale_source: "production",
        quantity: qty,
        unit: saleForm.unit || "oeufs",
        unit_price: unitPrice,
        total_amount: total,
        currency_id: saleForm.currency_id ? Number(saleForm.currency_id) : (currencyMeta.defaultCurrencyId || null),
        buyer: saleForm.buyer || null,
        sale_date: saleForm.date,
        notes: saleForm.notes || null,
      });
      setSaleForm((f) => ({ ...f, open: false, quantity: "", unit_price: "", buyer: "", notes: "" }));
      onRefresh();
    } catch (err) {
      setError(err.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const stockColor = eggStock.available > 0 ? "var(--solidite-700)" : "var(--fg-3)";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>
          {lang === "fr" ? "🥚 Gestion des œufs" : "🥚 Egg management"}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 12px" }}
            onClick={() => { setError(""); setHarvestForm((f) => ({ ...f, open: !f.open })); setSaleForm((f) => ({ ...f, open: false })); }}>
            {lang === "fr" ? "+ Récolte" : "+ Harvest"}
          </button>
          <button className="btn" style={{ fontSize: 12, padding: "4px 12px" }}
            onClick={() => { setError(""); setSaleForm((f) => ({ ...f, open: !f.open })); setHarvestForm((f) => ({ ...f, open: false })); }}>
            {lang === "fr" ? "Vendre" : "Sell"}
          </button>
        </div>
      </div>

      {/* KPIs stock */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border-1)" }}>
        {[
          { label: lang === "fr" ? "Produits" : "Collected", value: fmt(Math.round(eggStock.produced)), color: "var(--ink-700)" },
          { label: lang === "fr" ? "Vendus" : "Sold", value: fmt(Math.round(eggStock.sold)), color: "var(--clay-700)" },
          { label: lang === "fr" ? "Disponibles" : "Available", value: fmt(Math.round(eggStock.available)), color: stockColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg-page)", padding: "12px 16px", textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 4 }}>{label}</div>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{lang === "fr" ? "œufs" : "eggs"}</div>
          </div>
        ))}
      </div>

      {/* Formulaire Récolte */}
      {harvestForm.open && (
        <form onSubmit={submitHarvest} style={{ padding: "16px 18px", borderTop: "1px solid var(--border-1)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="overline" style={{ fontSize: 11 }}>{lang === "fr" ? "Enregistrer une récolte" : "Record harvest"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">{lang === "fr" ? "Date" : "Date"}</label>
              <input type="date" className="input" value={harvestForm.date} onChange={(e) => setHarvestForm((f) => ({ ...f, date: e.target.value }))} required/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Poulailler" : "Henhouse"}</label>
              <select className="input" value={harvestForm.building_id} onChange={(e) => setHarvestForm((f) => ({ ...f, building_id: e.target.value }))}>
                <option value="">{lang === "fr" ? "Tous / non précisé" : "All / unspecified"}</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Quantité récoltée" : "Quantity collected"}</label>
              <input type="number" className="input" min="1" placeholder="ex: 850" value={harvestForm.quantity}
                onChange={(e) => setHarvestForm((f) => ({ ...f, quantity: e.target.value }))} required/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Œufs cassés" : "Broken eggs"}</label>
              <input type="number" className="input" min="0" placeholder="0" value={harvestForm.broken}
                onChange={(e) => setHarvestForm((f) => ({ ...f, broken: e.target.value }))}/>
            </div>
          </div>
          <div>
            <label className="label">{lang === "fr" ? "Notes" : "Notes"}</label>
            <input type="text" className="input" value={harvestForm.notes} onChange={(e) => setHarvestForm((f) => ({ ...f, notes: e.target.value }))}/>
          </div>
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setHarvestForm((f) => ({ ...f, open: false }))}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button type="submit" className="btn" disabled={submitting}>{submitting ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}</button>
          </div>
        </form>
      )}

      {/* Formulaire Vente */}
      {saleForm.open && (
        <form onSubmit={submitSale} style={{ padding: "16px 18px", borderTop: "1px solid var(--border-1)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="overline" style={{ fontSize: 11 }}>{lang === "fr" ? "Enregistrer une vente d'œufs" : "Record egg sale"}</div>
          {eggStock.available <= 0 && (
            <div style={{ background: "var(--rust-50)", border: "1px solid var(--rust-200)", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--rust-700)" }}>
              {lang === "fr" ? "Aucun stock disponible. Enregistrez d'abord une récolte." : "No stock available. Record a harvest first."}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">{lang === "fr" ? "Date" : "Date"}</label>
              <input type="date" className="input" value={saleForm.date} onChange={(e) => setSaleForm((f) => ({ ...f, date: e.target.value }))} required/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Acheteur" : "Buyer"}</label>
              <input type="text" className="input" placeholder={lang === "fr" ? "Nom / marché" : "Name / market"} value={saleForm.buyer}
                onChange={(e) => setSaleForm((f) => ({ ...f, buyer: e.target.value }))}/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? `Quantité (dispo: ${fmt(Math.round(eggStock.available))})` : `Quantity (avail: ${fmt(Math.round(eggStock.available))})`}</label>
              <input type="number" className="input" min="1" max={eggStock.available} placeholder="ex: 300" value={saleForm.quantity}
                onChange={(e) => setSaleForm((f) => ({ ...f, quantity: e.target.value }))} required/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? `Prix unitaire (${moneySymbol})` : `Unit price (${moneySymbol})`}</label>
              <input type="number" className="input" min="0" step="any" placeholder="ex: 150" value={saleForm.unit_price}
                onChange={(e) => setSaleForm((f) => ({ ...f, unit_price: e.target.value }))} required/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Devise" : "Currency"}</label>
              <CurrencySelect lang={lang} value={saleForm.currency_id} onChange={(v) => setSaleForm((f) => ({ ...f, currency_id: v }))} currencies={currencyMeta.currencies}/>
            </div>
            <div>
              <label className="label">{lang === "fr" ? "Total estimé" : "Estimated total"}</label>
              <div className="input" style={{ background: "var(--bg-sunken)", color: "var(--fg-3)", userSelect: "none" }}>
                {saleForm.quantity && saleForm.unit_price
                  ? `${(Number(saleForm.quantity) * Number(saleForm.unit_price)).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} ${moneySymbol}`
                  : "—"}
              </div>
            </div>
          </div>
          <div>
            <label className="label">{lang === "fr" ? "Notes" : "Notes"}</label>
            <input type="text" className="input" value={saleForm.notes} onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}/>
          </div>
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setSaleForm((f) => ({ ...f, open: false }))}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button type="submit" className="btn" disabled={submitting || eggStock.available <= 0}>{submitting ? "…" : (lang === "fr" ? "Vendre" : "Sell")}</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── ALERTS ──────────────────────────────────────────────────────────────
function deriveAlerts(animals, medicines, treatments, repro, diseases, lang) {
  const out = [];
  const activeAnimals = (animals || []).filter(isActiveLivestock);
  const aMap = new Map(activeAnimals.map((a) => [a.id, a]));
  const dMap = new Map(diseases.map((d) => [d.id, d]));
  // Low stock
  medicines.forEach((m) => {
    const qty = Number(m.quantity);
    const min = m.minQuantity != null ? Number(m.minQuantity) : null;
    if (min != null && qty < min) {
      out.push({
        id: `low-${m.id}`, kind: "stock", severity: qty < min / 2 ? "critical" : "high",
        animal: m.name, animalId: m.kind === "feed" ? "Aliment" : "Médicament",
        species: null, title: lang === "fr" ? `Stock faible · ${m.name}` : `Low stock · ${m.name}`,
        subtitle: `${qty} ${m.unit || ""} restant · seuil ${min}`, date: "—", icon: "wheat",
      });
    }
  });
  // Active treatments with future withdrawal
  const today = new Date().toISOString().slice(0, 10);
  treatments.forEach((t) => {
    const animal = aMap.get(t.animalId);
    if (!animal) return;
    const disease = dMap.get(t.diseaseId);
    const milkH = t.withdrawalMilkHours;
    const meat = t.withdrawalMeatDays;
    const eggs = t.withdrawalEggsDays;
    const end = t.endDate;
    const wd = milkH || meat || eggs;
    if (t.status === "running" && wd && end && end >= today) {
      out.push({
        id: `wd-${t.id}`, kind: "withdrawal", severity: "critical",
        animal: animal?.name || animal?.externalId || "—",
        animalId: animal?.externalId || `#${animal?.id}`,
        species: animal?.species, title: lang === "fr" ? "Délai de retrait actif" : "Withdrawal active",
        subtitle: `${t.medicineName || disease?.nameFr || "Traitement"}${milkH ? ` · lait ${Math.round(milkH/24)} j` : ""}${meat ? ` · viande ${meat} j` : ""}${eggs ? ` · œufs ${eggs} j` : ""}`,
        date: end, icon: "shield",
      });
    }
  });
  // Imminent gestations (no due date check possible without a calc)
  const GESTATION = { cow: 283, pig: 114, goat: 152, sheep: 152, rabbit: 31, duck: 28, turkey: 28, chicken: 21, fish: 30 };
  repro.forEach((e) => {
    const animal = aMap.get(e.animalId);
    if (!animal) return;
    const total = GESTATION[animal.species] || 0;
    if (!total || e.outcome === "success" || e.eventType === "birthing") return;
    const start = new Date(e.eventDate);
    const day = Math.round((Date.now() - start.getTime()) / 86400000);
    if (day >= total * 0.92 && day <= total + 7) {
      out.push({
        id: `repro-${e.id}`, kind: "repro", severity: "high",
        animal: animal.name || animal.externalId || "—",
        animalId: animal.externalId || `#${animal.id}`,
        species: animal.species,
        title: lang === "fr" ? "Mise bas imminente" : "Imminent birthing",
        subtitle: `J${day}/${total} · ${e.expectedDueDate || "—"}`,
        date: e.expectedDueDate || "—", icon: "calendar",
      });
    }
  });
  // Prêt à abattre / vente : engraissement prêt ou en retard, groupé par bâtiment.
  const slByBarn = new Map();
  activeAnimals.forEach((a) => {
    if (animalCategory(a) !== "engraissement") return;
    const st = slaughterReadiness(a);
    if (st !== "pret" && st !== "retard") return;
    const barn = a.barn || (lang === "fr" ? "Sans bâtiment" : "No building");
    if (!slByBarn.has(barn)) slByBarn.set(barn, { ready: 0, overdue: 0, species: a.species });
    slByBarn.get(barn)[st === "pret" ? "ready" : "overdue"] += animalQty(a);
  });
  slByBarn.forEach((g, barn) => {
    const tot = g.ready + g.overdue;
    if (tot <= 0) return;
    out.push({
      id: `slaughter-${barn}`, kind: "slaughter", severity: g.overdue > 0 ? "critical" : "high",
      animal: barn, animalId: lang === "fr" ? "Engraissement" : "Fattening", species: g.species,
      title: lang === "fr" ? `${tot} animal(aux) à abattre/vendre` : `${tot} animal(s) to slaughter/sell`,
      subtitle: [
        g.ready > 0 ? (lang === "fr" ? `${g.ready} prêt(s)` : `${g.ready} ready`) : null,
        g.overdue > 0 ? (lang === "fr" ? `${g.overdue} en retard (coût net)` : `${g.overdue} overdue (net cost)`) : null,
        barn,
      ].filter(Boolean).join(" · "),
      date: "—", icon: "cart",
    });
  });
  return out;
}

const AlertsScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [liveAlerts, setLiveAlerts] = React.useState(null);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([
      api.listAnimals(), api.listMedicines(), api.listTreatments(),
      api.listReproductionEvents(), api.listDiseases(),
    ])
      .then(([a, m, t, r, d]) => {
        if (cancel) return;
        const all = [a, m, t, r, d].every((x) => Array.isArray(x));
        if (all) setLiveAlerts(deriveAlerts(a, m, t, r, d, lang));
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [lang]);
  const source = liveAlerts || [];
  const [tab, setTab] = React.useState("all");
  const speciesFiltered = source.filter(a => !speciesFilter || a.species === speciesFilter);
  const filtered = speciesFiltered.filter(a => tab === "all" ? true : tab === "withdrawal" ? a.kind === "withdrawal" : a.severity === tab);
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Alertes · Alerts" : "Alerts · Alertes"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Alertes intelligentes, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length} actives</span></> : <>Smart alerts, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length} active</span></>}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
        {[
          { id: "all", fr: "Toutes", en: "All", count: speciesFiltered.length },
          { id: "critical", fr: "Critique", en: "Critical", count: speciesFiltered.filter(a=>a.severity==="critical").length, color: "var(--rust-700)" },
          { id: "high", fr: "Élevée", en: "High", count: speciesFiltered.filter(a=>a.severity==="high").length, color: "var(--autorite-500)" },
          { id: "medium", fr: "Moyenne", en: "Medium", count: speciesFiltered.filter(a=>a.severity==="medium").length, color: "var(--pertinence-500)" },
          { id: "withdrawal", fr: "Délai retrait", en: "Withdrawal", count: speciesFiltered.filter(a=>a.kind==="withdrawal").length, color: "var(--rust-700)" },
        ].map((tb) => (
          <button key={tb.id} className="btn btn-sm" onClick={() => setTab(tb.id)}
            style={{ flexShrink: 0, whiteSpace: "nowrap", ...(tab === tb.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}) }}>
            {tb.color && <span style={{ width: 6, height: 6, borderRadius: 999, background: tb.color }}/>}
            {lang === "fr" ? tb.fr : tb.en}
            <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{tb.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((a) => {
          const sp = speciesById(a.species) || { glyph: null, fr: "—", en: "—" };
          const sevColor = a.severity === "critical" ? "var(--rust-700)" : a.severity === "high" ? "var(--wheat-500)" : "var(--sky-500)";
          const isCritical = a.kind === "withdrawal" || a.severity === "critical";
          return (
            <div key={a.id} className={isCritical ? "withdrawal-banner" : "card"} style={{ display: "flex", gap: 16, alignItems: "stretch", padding: "16px 20px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: isCritical ? "rgba(255,255,255,0.12)" : a.kind === "env" ? "var(--pertinence-50)" : "var(--autorite-50)", color: isCritical ? "var(--parchment-50)" : sevColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", zIndex: 1 }}>
                <Icon name={a.icon} size={20} color="currentColor"/>
              </div>
              <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: isCritical ? "var(--parchment-50)" : "var(--ink-950)", letterSpacing: "-0.01em" }}>{a.title}</h4>
                  <span className="italic-serif" style={{ fontSize: 14, color: isCritical ? "#F0D6CB" : "var(--ink-700)" }}>{a.animal}</span>
                  <span className="mono" style={{ fontSize: 11, color: isCritical ? "#F0D6CB" : "var(--fg-3)" }}>{a.animalId}</span>
                </div>
                <div style={{ fontSize: 13, color: isCritical ? "#F0D6CB" : "var(--ink-700)", marginTop: 4 }}>{a.subtitle}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 11, color: isCritical ? "rgba(251,248,242,0.7)" : "var(--fg-3)" }}>{a.date}</span>
                  <span style={{ fontSize: 11, color: isCritical ? "rgba(251,248,242,0.7)" : "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <AnimalGlyph kind={sp.glyph} size={11} color={isCritical ? "#F0D6CB" : "var(--fg-3)"}/>
                    {lang === "fr" ? sp.fr : sp.en}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0, position: "relative", zIndex: 1 }}>
                <span className="tag" style={{
                  background: isCritical ? "rgba(255,255,255,0.18)" : a.severity === "critical" ? "var(--rust-50)" : a.severity === "high" ? "var(--wheat-50)" : "var(--sky-50)",
                  color: isCritical ? "var(--bone-50)" : a.severity === "critical" ? "var(--rust-900)" : a.severity === "high" ? "var(--wheat-900)" : "var(--sky-900)",
                  fontWeight: 600,
                }}>
                  {a.severity}
                </span>
                <button className="btn btn-sm" style={isCritical ? { background: "rgba(255,255,255,0.15)", color: "var(--parchment-50)", borderColor: "rgba(255,255,255,0.2)" } : {}}>{lang === "fr" ? "Voir" : "View"}<Icon name="arrowRight" size={11} color={isCritical ? "#ECF1EC" : "var(--ink-700)"}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SALE_PRODUCT_LABELS = {
  eggs: { fr: "Oeufs", en: "Eggs", unit: "oeufs" },
  milk: { fr: "Lait", en: "Milk", unit: "L" },
  meat: { fr: "Viande", en: "Meat", unit: "kg" },
  wool: { fr: "Laine", en: "Wool", unit: "kg" },
  fish: { fr: "Poisson", en: "Fish", unit: "kg" },
  animal: { fr: "Animal", en: "Animal", unit: "tete" },
};

const SELLABLE_PRODUCTION_TYPES = new Set(["eggs", "milk", "meat", "wool", "fish"]);

function saleProductLabel(productType, lang) {
  const row = SALE_PRODUCT_LABELS[productType];
  return row ? row[lang] : productType || (lang === "fr" ? "Produit" : "Product");
}

function normalizeSaleUnit(unit) {
  return String(unit || "")
    .trim()
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("å“", "oe");
}

function isWeightSaleUnit(unit) {
  return ["kg", "kilo", "kilos", "kilogram", "kilograms", "kilogramme", "kilogrammes", "g", "gram", "grams", "gramme", "grammes", "lb", "lbs", "livre", "livres", "t", "tonne", "tonnes"].includes(normalizeSaleUnit(unit));
}

function weightAsKg(value, unit) {
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight <= 0) return null;
  const normalized = normalizeSaleUnit(unit || "kg");
  if (["g", "gram", "grams", "gramme", "grammes"].includes(normalized)) return weight / 1000;
  if (["lb", "lbs", "livre", "livres"].includes(normalized)) return weight * 0.45359237;
  if (["t", "tonne", "tonnes"].includes(normalized)) return weight * 1000;
  return weight;
}

function weightInSaleUnit(weight, fromUnit, saleUnit) {
  const kg = weightAsKg(weight, fromUnit);
  if (kg == null) return null;
  const normalized = normalizeSaleUnit(saleUnit || "kg");
  if (["g", "gram", "grams", "gramme", "grammes"].includes(normalized)) return kg * 1000;
  if (["lb", "lbs", "livre", "livres"].includes(normalized)) return kg / 0.45359237;
  if (["t", "tonne", "tonnes"].includes(normalized)) return kg / 1000;
  return kg;
}

function animalAvailableForUnit(animal, unit) {
  if (normalizeSaleUnit(unit) === "lot") return 1;
  if (isWeightSaleUnit(unit)) {
    return weightInSaleUnit(animal?.weight, animal?.weightUnit || animal?.weight_unit || "kg", unit) || 0;
  }
  return Number(animal?.count) > 0 ? Number(animal.count) : 1;
}

function formatSaleQuantity(value) {
  const n = Number(value || 0);
  return n.toLocaleString("fr-CA", { maximumFractionDigits: n >= 10 ? 1 : 2 });
}

function saleUnitFor(productType, fallback) {
  return fallback || SALE_PRODUCT_LABELS[productType]?.unit || "";
}

// Conditionnements œufs : à l'unité ou par plateau. `eggs` = nb d'œufs par
// conditionnement (sert à décrémenter le stock en œufs). `unitTokens` = libellés
// d'unité reconnus dans la liste de prix (Gestion de vente) pour ce plateau.
const EGG_PACKAGINGS = [
  { key: "unit",   eggs: 1,  fr: "À l'unité",  en: "Per egg",     unitTokens: ["oeufs", "oeuf"] },
  { key: "tray12", eggs: 12, fr: "Plateau 12", en: "Tray of 12",  unitTokens: ["plateau 12", "plateau12", "plateau de 12"] },
  { key: "tray30", eggs: 30, fr: "Plateau 30", en: "Tray of 30",  unitTokens: ["plateau 30", "plateau30", "plateau de 30"] },
];

// Cherche un prix configuré pour un conditionnement donné (par tokens d'unité).
function packagingPriceRow(prices, item, pk) {
  const tokens = pk.unitTokens.map(normalizeSaleUnit);
  const candidates = (prices || []).filter((p) => {
    const saleSource = p.saleSource || p.sale_source || "production";
    const productType = p.productType || p.product_type;
    if (saleSource !== "production" || productType !== "eggs") return false;
    return tokens.includes(normalizeSaleUnit(p.unit));
  });
  const row = candidates.find((p) => p.species === item.species) || candidates.find((p) => !p.species);
  return row || null;
}

// Liste des conditionnements applicables à un article, avec prix résolu.
// Pour les œufs : à l'unité + plateaux. Sinon : un seul conditionnement « unité ».
function packagingsFor(item, prices, lang) {
  if (item.productType === "eggs" && item.source !== "animal") {
    const perEgg = item.unitPrice !== "" && item.unitPrice != null && Number.isFinite(Number(item.unitPrice))
      ? Number(item.unitPrice) : null;
    return EGG_PACKAGINGS.map((pk) => {
      const configuredRow = pk.key === "unit" ? null : packagingPriceRow(prices, item, pk);
      const configured = pk.key === "unit" ? perEgg : (configuredRow ? priceValue(configuredRow) : null);
      const currencyId = pk.key === "unit" ? item.currencyId : (priceCurrencyId(configuredRow) ?? item.currencyId ?? null);
      // Repli : si pas de prix plateau configuré, on dérive du prix à l'unité.
      const price = configured != null ? configured : (perEgg != null ? perEgg * pk.eggs : null);
      return { key: pk.key, eggs: pk.eggs, label: lang === "fr" ? pk.fr : pk.en, price, currencyId, isConfigured: configured != null };
    });
  }
  const p = item.unitPrice !== "" && item.unitPrice != null && Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : null;
  return [{ key: "unit", eggs: 1, label: item.unit || "", price: p, currencyId: item.currencyId ?? null, isConfigured: p != null, generic: true }];
}

function buildPosProductionItems(logs, sales, speciesFilter) {
  const groups = new Map();
  const keyFor = (species, productType, unit) => `${species || "all"}:${productType}:${normalizeSaleUnit(unit)}`;
  (logs || []).forEach((log) => {
    const species = log.species;
    const productType = log.productType || log.product_type;
    if (!SELLABLE_PRODUCTION_TYPES.has(productType)) return;
    if (speciesFilter && species !== speciesFilter) return;
    const unit = saleUnitFor(productType, log.unit);
    const key = keyFor(species, productType, unit);
    const qty = Number(log.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const current = groups.get(key) || {
      id: key,
      source: "production",
      species,
      productType,
      unit,
      available: 0,
      latestDate: "",
      notes: null,
    };
    current.available += qty;
    const d = String(log.logDate || log.log_date || "").slice(0, 10);
    if (d > current.latestDate) current.latestDate = d;
    groups.set(key, current);
  });
  (sales || []).forEach((sale) => {
    const productType = sale.productType || sale.product_type;
    if (!SELLABLE_PRODUCTION_TYPES.has(productType)) return;
    const species = sale.species;
    if (speciesFilter && species !== speciesFilter) return;
    const unit = saleUnitFor(productType, sale.unit);
    const key = keyFor(species, productType, unit);
    const current = groups.get(key);
    if (!current) return;
    const qty = Number(sale.quantity || 0);
    if (Number.isFinite(qty) && qty > 0) current.available -= qty;
  });
  return Array.from(groups.values())
    .map((item) => ({ ...item, available: Math.max(0, item.available) }))
    .filter((item) => item.available > 0)
    .sort((a, b) => String(b.latestDate).localeCompare(String(a.latestDate)));
}

function priceValue(row) {
  return Number(row?.unitPrice ?? row?.unit_price ?? 0);
}

function priceCurrencyId(row) {
  return row?.currencyId ?? row?.currency_id ?? null;
}

function findPosPrice(prices, item) {
  const source = item.source || "production";
  const unit = normalizeSaleUnit(item.unit);
  const candidates = (prices || []).filter((p) => {
    const saleSource = p.saleSource || p.sale_source || "production";
    const productType = p.productType || p.product_type;
    if (saleSource !== source) return false;
    if (productType !== item.productType) return false;
    if (p.unit && normalizeSaleUnit(p.unit) !== unit) return false;
    return true;
  });
  return candidates.find((p) => p.species === item.species)
    || candidates.find((p) => !p.species)
    || null;
}

function animalListingNote(animalId) {
  return `animal:${animalId}`;
}

function findLinkedAnimalListingPrice(prices, animalId) {
  return (prices || []).filter((p) => {
    const saleSource = p.saleSource || p.sale_source || "production";
    const productType = p.productType || p.product_type;
    return saleSource === "animal" && productType === "animal" && String(p.notes || "").includes(animalListingNote(animalId));
  }).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0] || null;
}

function findAnimalListingPrice(prices, item) {
  const linked = findLinkedAnimalListingPrice(prices, item.animalId);
  if (linked) return linked;
  return (prices || []).find((p) => {
    const saleSource = p.saleSource || p.sale_source || "production";
    const productType = p.productType || p.product_type;
    return saleSource === "animal" && productType === "animal" && p.species === item.species && !String(p.notes || "").includes("animal:");
  }) || null;
}

function buildSaleItems({ animals, logs, sales, prices, speciesFilter, lang }) {
  const animalRows = (animals || []).filter((a) => {
    const status = String(a.status || "").toLowerCase();
    if (!["available_sale", "for_sale", "a_vendre"].includes(status)) return false;
    if (speciesFilter && a.species !== speciesFilter) return false;
    return true;
  }).map((a) => {
    const sp = speciesById(a.species);
    const item = {
      id: `animal-${a.id}`,
      source: "animal",
      animalId: a.id,
      species: a.species,
      productType: "animal",
      title: a.name || a.externalId || a.external_id || a.lot || `#${a.id}`,
      subtitle: [a.lot, a.race, a.barn].filter(Boolean).join(" - "),
      unit: "tete",
      weight: a.weight,
      weightUnit: a.weightUnit || a.weight_unit || "kg",
      speciesLabel: sp ? (lang === "fr" ? sp.fr : sp.en) : a.species,
    };
    const price = findAnimalListingPrice(prices, item);
    const unit = price?.unit || "tete";
    const available = animalAvailableForUnit(a, unit);
    return { ...item, unit, available, unitPrice: price ? priceValue(price) : "", currencyId: priceCurrencyId(price) };
  });

  const productionRows = buildPosProductionItems(logs, sales, speciesFilter)
    .map((it) => {
      const sp = it.species ? speciesById(it.species) : null;
      return {
        ...it,
        speciesLabel: sp ? (lang === "fr" ? sp.fr : sp.en) : it.species,
        title: `${saleProductLabel(it.productType, lang)}${sp ? ` - ${lang === "fr" ? sp.fr : sp.en}` : ""}`,
        subtitle: it.latestDate ? `${lang === "fr" ? "Production recente" : "Recent production"} - ${it.latestDate}` : "",
      };
    })
    .map((item) => {
      const price = findPosPrice(prices, item);
      return { ...item, unitPrice: price ? priceValue(price) : "", currencyId: priceCurrencyId(price) };
    });

  return [...animalRows, ...productionRows];
}

function matchesSaleQuery(item, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [
    item.title,
    item.subtitle,
    item.species,
    item.speciesLabel,
    item.productType,
    item.unit,
    item.source,
  ].filter(Boolean).join(" ").toLowerCase().includes(q);
}

function PosSaleModal({ lang, item, prices, currencyMeta, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const packagings = React.useMemo(() => packagingsFor(item || {}, prices, lang), [item, prices, lang]);
  const [packKey, setPackKey] = React.useState(packagings[0]?.key || "unit");
  const pack = packagings.find((p) => p.key === packKey) || packagings[0];
  const eggsPerPack = pack?.eggs || 1;
  const [quantity, setQuantity] = React.useState(item?.source === "animal" ? String(isWeightSaleUnit(item.unit) ? (item.available || "") : Math.min(1, item.available || 1)) : "");
  const [buyer, setBuyer] = React.useState("");
  const [saleDate, setSaleDate] = React.useState(today);
  const [notes, setNotes] = React.useState("");
  const [currencyId, setCurrencyId] = React.useState(pack?.currencyId ?? item?.currencyId ?? currencyMeta?.defaultCurrencyId ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setCurrencyId(pack?.currencyId ?? item?.currencyId ?? currencyMeta?.defaultCurrencyId ?? "");
  }, [pack?.currencyId, item?.currencyId, currencyMeta?.defaultCurrencyId]);
  if (!item) return null;

  const configuredPrice = pack && pack.price != null && Number.isFinite(Number(pack.price));
  const packs = Number(quantity || 0);                 // nb de conditionnements (plateaux ou unités)
  const stockQty = packs * eggsPerPack;                // quantité décrémentée du stock (en œufs/unités)
  const price = Number(pack?.price || 0);              // prix par conditionnement
  const total = Number.isFinite(packs) && Number.isFinite(price) ? packs * price : 0;
  const isPack = eggsPerPack > 1;                       // conditionnement plateau
  const maxSaleQty = Number(item.available ?? 0);
  const hasSaleMax = Number.isFinite(maxSaleQty) && maxSaleQty >= 0;
  const inputMaxQty = hasSaleMax && isPack ? Math.floor(maxSaleQty / eggsPerPack) : maxSaleQty;
  const sp = speciesById(item.species);
  const activeCurrencyId = currencyId || pack?.currencyId || item.currencyId || currencyMeta?.defaultCurrencyId || "";
  const activeSymbol = symbolFor(activeCurrencyId, currencyMeta?.currencies || [], currencyMeta?.fallbackSymbol || "");

  const save = async () => {
    if (!configuredPrice) {
      setError(lang === "fr" ? "Prix non configure. Va dans Gestion de vente pour fixer le prix avant de vendre." : "Price is not configured. Set it in Sales management before selling.");
      return;
    }
    if (!packs || packs <= 0 || !price || price < 0) {
      setError(lang === "fr" ? "Quantite et prix requis." : "Quantity and price required.");
      return;
    }
    if (hasSaleMax && stockQty > maxSaleQty + 0.000001) {
      setError(lang === "fr"
        ? `Quantite superieure au maximum: ${formatSaleQuantity(maxSaleQty)} ${item.unit || ""}.`
        : `Quantity exceeds maximum: ${formatSaleQuantity(maxSaleQty)} ${item.unit || ""}.`);
      return;
    }
    if ((currencyMeta?.currencies || []).length && !activeCurrencyId) {
      setError(lang === "fr" ? "Devise requise." : "Currency is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // On enregistre la vente en œufs (stock) avec un prix unitaire effectif,
      // pour que le stock se décrémente correctement et que le total reste juste.
      const effectiveUnitPrice = isPack ? (total / stockQty) : price;
      const packNote = isPack ? `${packs} × ${pack.label} (${stockQty} ${item.unit || "oeufs"})` : null;
      const salePayload = {
        sale_source: item.source,
        animal_id: item.animalId || null,
        species: item.species || null,
        product_type: item.productType,
        quantity: stockQty,
        unit: item.unit || null,
        unit_price: effectiveUnitPrice,
        total_amount: total,
        currency_id: activeCurrencyId ? Number(activeCurrencyId) : null,
        buyer: buyer.trim() || null,
        sale_date: saleDate,
        notes: [notes.trim() || null, packNote].filter(Boolean).join(" · ") || null,
      };
      const result = await api.createSale(salePayload);
      window.dispatchEvent(new CustomEvent("farmos:sale-created"));
      window.dispatchEvent(new CustomEvent("farmos:animal-created"));
      onSaved && onSaved({ ...salePayload, id: result?.id || `local-${Date.now()}` });
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 520, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: sp?.accentBg || "var(--ink-50)", color: sp?.accent || "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sp ? <AnimalGlyph kind={sp.glyph} size={20} color="currentColor"/> : <Icon name="cart" size={18} color="currentColor"/>}
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{lang === "fr" ? "Vendre" : "Sell"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{item.title}</div>
          </div>
        </div>

        {packagings.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 6 }}>{lang === "fr" ? "Conditionnement" : "Packaging"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {packagings.map((pk) => {
                const on = pk.key === packKey;
                return (
                  <button key={pk.key} type="button" onClick={() => setPackKey(pk.key)}
                    style={{
                      flex: "1 1 0", minWidth: 96, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: on ? "1.5px solid var(--forest-600)" : "1px solid var(--border-1)",
                      background: on ? "var(--forest-50)" : "var(--paper)",
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-950)" }}>{pk.label}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                      {pk.price != null ? formatMoney(pk.price, pk.currencyId || activeCurrencyId, currencyMeta?.currencies || [], activeSymbol, 2) : (lang === "fr" ? "prix à définir" : "set price")}
                      {pk.eggs > 1 ? ` · ${pk.eggs} ${item.unit || "oeufs"}` : ""}
                      {pk.price != null && !pk.isConfigured ? (lang === "fr" ? " · auto" : " · auto") : ""}
                    </div>
                  </button>
                );
              })}
            </div>
            {pack && !pack.isConfigured && isPack && (
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
                {lang === "fr"
                  ? "Prix dérivé du prix à l'unité. Pour un prix de plateau dédié, ajoute une ligne « Plateau 12/30 » dans Gestion de vente."
                  : "Price derived from per-egg price. Add a \"Tray 12/30\" line in Sales management for a dedicated tray price."}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{isPack ? (lang === "fr" ? "Nombre de plateaux" : "Number of trays") : (lang === "fr" ? "Quantite" : "Quantity")}
            <input className="input" type="number" min="0" max={hasSaleMax ? inputMaxQty : undefined} step={isPack || ["tete", "unite", "lot"].includes(normalizeSaleUnit(item.unit)) ? "1" : "0.01"} value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
            {isPack && packs > 0 && (
              <span style={{ display: "block", fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>= {stockQty} {item.unit || "oeufs"}</span>
            )}
            {item.source === "animal" && hasSaleMax && (
              <span style={{ display: "block", fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
                {lang === "fr" ? "Maximum" : "Maximum"}: {formatSaleQuantity(maxSaleQty)} {item.unit || ""}
              </span>
            )}
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{isPack ? (lang === "fr" ? "Prix par plateau" : "Price per tray") : (lang === "fr" ? "Prix unitaire configure" : "Configured unit price")}
            <AmountCurrencyInput
              amount={pack?.price != null ? pack.price : ""}
              onAmountChange={() => {}}
              currencyId={activeCurrencyId}
              onCurrencyChange={setCurrencyId}
              currencies={currencyMeta?.currencies || []}
              amountDisabled
              amountReadOnly
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Acheteur" : "Buyer"}
            <input className="input" value={buyer} onChange={(e) => setBuyer(e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Date" : "Date"}
            <input className="input" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)", gridColumn: "1 / -1" }}>{lang === "fr" ? "Notes" : "Notes"}
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", marginTop: 4, minHeight: 72, resize: "vertical" }}/>
          </label>
        </div>

        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "var(--bg-sunken)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Total a encaisser" : "Total to collect"}</span>
          <span className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-950)" }}>{formatMoney(total, activeCurrencyId, currencyMeta?.currencies || [], activeSymbol, 2)}</span>
        </div>
        {error && <div style={{ color: "var(--rust-700)", fontSize: 12, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <Icon name="cart" size={13} color="currentColor"/>
            {saving ? "..." : (lang === "fr" ? "Enregistrer la vente" : "Save sale")}
          </button>
        </div>
      </div>
    </div>
  );
}

const PosScreen = ({ lang, speciesFilter, onSpeciesFilter, enabledSpecies }) => {
  const [animals, setAnimals] = React.useState([]);
  const [logs, setLogs] = React.useState([]);
  const [sales, setSales] = React.useState([]);
  const [prices, setPrices] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [modalItem, setModalItem] = React.useState(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const refresh = useDataRefresh(["animals", "productionLogs", "sales", "priceList"]);
  const currencyMeta = useCurrencyCatalog();

  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listAnimals(), api.listProductionLogs(), api.listSales(), api.listPrices()])
      .then(([a, p, s, pr]) => {
        if (cancel) return;
        setAnimals(Array.isArray(a) ? a : []);
        setLogs(Array.isArray(p) ? p : []);
        setSales(Array.isArray(s) ? s : []);
        setPrices(Array.isArray(pr) ? pr : []);
      })
      .catch((e) => console.warn("POS load failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey, refresh]);

  React.useEffect(() => {
    const reload = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:sale-created", reload);
    window.addEventListener("farmos:animal-created", reload);
    window.addEventListener("farmos:production-created", reload);
    return () => {
      window.removeEventListener("farmos:sale-created", reload);
      window.removeEventListener("farmos:animal-created", reload);
      window.removeEventListener("farmos:production-created", reload);
    };
  }, []);

  const allItems = buildSaleItems({ animals, logs, sales, prices, speciesFilter, lang });
  const availableRowsAll = allItems.filter((item) => {
    if (sourceFilter === "animal") return item.source === "animal";
    if (sourceFilter === "production") return item.source !== "animal";
    return true;
  }).filter((item) => matchesSaleQuery(item, query));
  const suggestions = availableRowsAll.slice(0, 14);

  const handleSaleSaved = (sale) => {
    if (sale?.sale_source === "production") {
      setSales((prev) => [{ ...sale, productType: sale.product_type, animalId: sale.animal_id }, ...prev]);
    }
    if (sale?.sale_source === "animal" && sale.animal_id) {
      const soldQty = Number(sale.quantity || 0);
      setAnimals((prev) => prev.map((animal) => {
        if (animal.id !== sale.animal_id) return animal;
        if (isWeightSaleUnit(sale.unit)) return { ...animal, count: Number(animal.count || 0) > 0 ? 0 : animal.count, status: "sold" };
        const current = Number(animal.count || 0);
        if (current > soldQty) return { ...animal, count: Math.max(0, current - soldQty) };
        return { ...animal, count: current > 0 ? 0 : animal.count, status: "sold" };
      }));
    }
    setModalItem(null);
    setSelectedItem(null);
    setQuery("");
    setReloadKey((k) => k + 1);
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setQuery(item.title);
  };

  const openSale = (item) => {
    if (!item) return;
    setModalItem(item);
  };

  const renderSuggestion = (item) => {
    const sp = speciesById(item.species);
    return (
      <button key={item.id} type="button" onClick={() => selectItem(item)}
        style={{ border: "1px solid var(--border-1)", background: selectedItem?.id === item.id ? "var(--forest-50)" : "var(--paper)", borderRadius: 8, padding: 12, display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", width: "100%", minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: sp?.accentBg || "var(--ink-50)", color: sp?.accent || "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {sp ? <AnimalGlyph kind={sp.glyph} size={20} color="currentColor"/> : <Icon name="cart" size={18} color="currentColor"/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-950)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle || item.speciesLabel || ""}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span className="tag">{item.source === "animal" ? (lang === "fr" ? "Animal" : "Animal") : saleProductLabel(item.productType, lang)}</span>
            <span className="tag">{Number(item.available || 0).toLocaleString("fr-CA")} {item.unit}</span>
            {item.unitPrice !== "" && <span className="tag">{formatMoney(item.unitPrice, item.currencyId || currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2)}/{item.unit}</span>}
          </div>
        </div>
      </button>
    );
  };

  const sourceOptions = [
    { id: "all", fr: "Tous", en: "All" },
    { id: "production", fr: "Productions", en: "Production" },
    { id: "animal", fr: "Animaux", en: "Animals" },
  ];

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Point de vente" : "Point of sale"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
            {lang === "fr" ? <>Caisse FarmOS, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>vente uniquement</span></> : <>FarmOS register, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>sales only</span></>}
          </h1>
        </div>
      </div>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 980 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto", gap: 10, alignItems: "end" }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)", minWidth: 0 }}>
            {lang === "fr" ? "Scanner ou rechercher un produit" : "Scan or search product"}
            <input className="input" value={query} onChange={(e) => { setQuery(e.target.value); setSelectedItem(null); }}
              placeholder={lang === "fr" ? "Nom, lot, espece, oeufs, lait..." : "Name, batch, species, eggs, milk..."}
              autoComplete="off"
              style={{ width: "100%", marginTop: 4, fontSize: 16, height: 44 }}/>
          </label>
          <button className="btn btn-primary" disabled={!selectedItem} onClick={() => openSale(selectedItem)} style={{ minHeight: 44 }}>
            <Icon name="cart" size={14} color="currentColor"/>
            {lang === "fr" ? "Vendre" : "Sell"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} enabledSpecies={enabledSpecies} compact/>
          {sourceOptions.map((option) => (
            <button
              key={option.id}
              className={`btn btn-sm ${sourceFilter === option.id ? "btn-primary" : ""}`}
              onClick={() => setSourceFilter(option.id)}
            >
              {lang === "fr" ? option.fr : option.en}
            </button>
          ))}
          {query && (
            <button className="btn btn-sm" onClick={() => setQuery("")}>
              {lang === "fr" ? "Effacer" : "Clear"}
            </button>
          )}
        </div>

        {selectedItem && (
          <div style={{ border: "1px solid var(--forest-200)", background: "var(--forest-50)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--fg-2)" }}>{lang === "fr" ? "Produit selectionne" : "Selected product"}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-950)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedItem.title}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span className="tag">{Number(selectedItem.available || 0).toLocaleString("fr-CA")} {selectedItem.unit}</span>
                {selectedItem.unitPrice !== "" && <span className="tag">{formatMoney(selectedItem.unitPrice, selectedItem.currencyId || currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2)}/{selectedItem.unit}</span>}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => openSale(selectedItem)}>
              <Icon name="cart" size={13} color="currentColor"/>
              {lang === "fr" ? "Encaisser" : "Checkout"}
            </button>
          </div>
        )}

        {/* Accès rapide productions : œufs et autres si dispo */}
        {(() => {
          const prodItems = allItems.filter((it) => it.source !== "animal");
          if (!prodItems.length) return null;
          return (
            <div>
              <div className="overline" style={{ fontSize: 11, marginBottom: 8 }}>{lang === "fr" ? "Productions disponibles" : "Available production"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                {prodItems.map((item) => {
                  const sp = speciesById(item.species);
                  const sym = item.unitPrice && currencyMeta.currencies?.length
                    ? formatMoney(item.unitPrice, item.currencyId || currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2)
                    : null;
                  return (
                    <button key={item.id} type="button" onClick={() => { selectItem(item); openSale(item); }}
                      style={{ border: "2px solid var(--autorite-200)", background: "var(--autorite-50)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", width: "100%" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: sp?.accentBg || "var(--autorite-100)", color: sp?.accent || "var(--autorite-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                        {item.productType === "eggs" ? "🥚" : <Icon name="droplet" size={20} color="currentColor"/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-950)" }}>{saleProductLabel(item.productType, lang)}</div>
                        <div style={{ fontSize: 12, color: "var(--autorite-700)", fontWeight: 600 }}>
                          {Number(item.available).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")} {item.unit}
                          {sym ? ` · ${sym}/${item.unit}` : ""}
                        </div>
                      </div>
                      <div style={{ background: "var(--autorite-600)", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {lang === "fr" ? "Vendre" : "Sell"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Resultats" : "Results"}</h3>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{availableRowsAll.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
          {availableRowsAll.length === 0 ? (
            <EmptyState icon="cart" title={lang === "fr" ? "Aucun produit a vendre" : "No product to sell"} hint={lang === "fr" ? "Enregistrez une recolte dans Production, ou marquez des animaux a vendre dans Parametres." : "Record a harvest in Production, or mark animals for sale in Settings."}/>
          ) : (
            suggestions.map(renderSuggestion)
          )}
        </div>
      </section>

      {modalItem && <PosSaleModal lang={lang} item={modalItem} prices={prices} currencyMeta={currencyMeta} onClose={() => setModalItem(null)} onSaved={handleSaleSaved}/>}
    </div>
  );
};

// ─── FINANCES ────────────────────────────────────────────────────────────
// Rentabilité par animal / lot (#4) — tableau revenu / coût / profit.
const ProfitabilitySection = ({ lang, data, currencySymbol = "" }) => {
  const [view, setView] = React.useState("animal"); // animal | lot | building
  const money = (n) => Number(n || 0).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
  const rows = view === "animal" ? data.byAnimal : view === "lot" ? data.byLot : (data.byBuilding || []);
  const profitColor = (p) => (p > 0 ? "var(--solidite-700)" : p < 0 ? "var(--oxblood-700)" : "var(--fg-3)");
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Rentabilité par animal / lot" : "Profitability per animal / lot"}</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "animal", fr: "Par animal", en: "Per animal" }, { id: "lot", fr: "Par lot", en: "Per lot" }, { id: "building", fr: "Par bâtiment", en: "Per building" }].map((v) => (
            <button key={v.id} className="btn btn-sm" onClick={() => setView(v.id)}
              style={view === v.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
              {lang === "fr" ? v.fr : v.en}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 18px", display: "flex", gap: 18, fontSize: 12, color: "var(--fg-2)", borderBottom: "1px solid var(--border-1)" }}>
        <span>{lang === "fr" ? "Revenu total" : "Total revenue"} : <strong>{money(data.totals.revenue)} {currencySymbol}</strong></span>
        <span>{lang === "fr" ? "Coût total" : "Total cost"} : <strong>{money(data.totals.cost)} {currencySymbol}</strong></span>
        <span>{lang === "fr" ? "Profit" : "Profit"} : <strong style={{ color: profitColor(data.totals.profit) }}>{money(data.totals.profit)} {currencySymbol}</strong></span>
      </div>
      <div style={{ maxHeight: 320, overflow: "auto" }}>
        {rows.length === 0 ? (
          <div style={{ padding: 18, fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucune donnée liée à un animal/lot/bâtiment." : "No data linked to an animal/lot/building."}</div>
        ) : rows.map((r, i) => {
          const groupKey = view === "lot" ? r.lot : r.building;
          const noneLabel = view === "lot" ? (lang === "fr" ? "Sans lot" : "No lot") : (lang === "fr" ? "Sans bâtiment" : "No building");
          const title = view === "animal" ? (r.name || `#${r.animalId}`) : (groupKey === "—" ? noneLabel : groupKey);
          return (
          <div key={(view === "animal" ? r.animalId : groupKey) || i} style={{
            display: "grid", gridTemplateColumns: "1fr 100px 100px 100px", gap: 10, padding: "10px 18px", alignItems: "center",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border-1)" : "none",
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{view === "animal" ? r.species : `${r.count} ${lang === "fr" ? "animaux" : "animals"}`}</div>
            </div>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>{money(r.revenue)} {currencySymbol}</span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right", color: "var(--oxblood-700)" }}>{money(r.cost)} {currencySymbol}</span>
            <span className="mono" style={{ fontSize: 13, textAlign: "right", fontWeight: 700, color: profitColor(r.profit) }}>{money(r.profit)} {currencySymbol}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
};

function buildFinanceSummaryByCurrency(sales, expenses) {
  const now = new Date();
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const buckets = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1));
    buckets.push({ key: d.toISOString().slice(0, 7), revenue: 0, expense: 0 });
  }
  const idxFor = (iso) => buckets.findIndex((b) => b.key === String(iso || "").slice(0, 7));
  (sales || []).forEach((sale) => {
    const i = idxFor(sale.saleDate || sale.sale_date);
    if (i >= 0) buckets[i].revenue += Number(sale.totalAmount ?? sale.total_amount ?? 0);
  });
  (expenses || []).forEach((expense) => {
    const i = idxFor(expense.expenseDate || expense.expense_date);
    if (i >= 0) buckets[i].expense += Number(expense.amount ?? 0);
  });
  const colors = {
    milk: "var(--pertinence-500)",
    eggs: "var(--autorite-500)",
    meat: "var(--oxblood-500)",
    wool: "var(--solidite-500)",
    fish: "var(--pertinence-300)",
  };
  const byCategoryMap = new Map();
  (sales || []).forEach((sale) => {
    const key = sale.productType || sale.product_type || sale.species || "other";
    byCategoryMap.set(key, (byCategoryMap.get(key) || 0) + Number(sale.totalAmount ?? sale.total_amount ?? 0));
  });
  const byCategory = Array.from(byCategoryMap.entries()).map(([cat, amount]) => ({
    cat,
    amount,
    fr: saleProductLabel(cat, "fr") || cat,
    en: saleProductLabel(cat, "en") || cat,
    color: colors[cat] || "var(--ink-400)",
  }));
  return {
    months: buckets.map((b) => b.key),
    revenue: buckets.map((b) => Math.round(b.revenue)),
    expense: buckets.map((b) => Math.round(b.expense)),
    byCategory,
  };
}

const FinancesScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [summary, setSummary] = React.useState({ months: [], revenue: [], expense: [], byCategory: [] });
  const totalRev = summary.byCategory.reduce((a,b)=>a+b.amount,0);
  const [profitability, setProfitability] = React.useState({ byAnimal: [], byLot: [], totals: { revenue: 0, cost: 0, profit: 0 } });
  const [transactions, setTransactions] = React.useState([]);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("today"));
  const currencyMeta = useCurrencyCatalog();
  const [currencyFilter, setCurrencyFilter] = React.useState("");
  React.useEffect(() => {
    if (!currencyFilter && currencyMeta.defaultCurrencyId) setCurrencyFilter(String(currencyMeta.defaultCurrencyId));
  }, [currencyFilter, currencyMeta.defaultCurrencyId]);
  const activeCurrencyId = currencyFilter || (currencyMeta.defaultCurrencyId ? String(currencyMeta.defaultCurrencyId) : "");
  const moneyUnit = symbolFor(activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const monthLabel = new Date().toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "long", year: "numeric" });
  const refresh = useDataRefresh(["sales", "expenses"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listSales(), api.listExpenses(), api.getProfitability()])
      .then(([sales, expenses, prof]) => {
        if (cancel) return;
        const saleRows = Array.isArray(sales) ? sales : [];
        const expenseRows = Array.isArray(expenses) ? expenses : [];
        const keepCurrency = (row) => !activeCurrencyId || String(rowCurrencyId(row) ?? currencyMeta.defaultCurrencyId ?? "") === String(activeCurrencyId);
        const filteredSales = saleRows.filter(keepCurrency);
        const filteredExpenses = expenseRows.filter(keepCurrency);
        const merged = [
          ...filteredSales.map((s) => adaptSaleAsTransaction(s, lang)),
          ...filteredExpenses.map((e) => adaptExpenseAsTransaction(e, lang)),
        ].filter((t) => inDateRange(t.isoDate, dateRange))
          .sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
        setTransactions(merged.slice(0, 12));
        setSummary(buildFinanceSummaryByCurrency(filteredSales, filteredExpenses));
        if (prof && typeof prof === "object") setProfitability(prof);
      })
      .catch((e) => console.warn("listSales/Expenses failed:", e.message));
    return () => { cancel = true; };
  }, [lang, reloadKey, refresh, dateRange, activeCurrencyId, currencyMeta.defaultCurrencyId]);
  React.useEffect(() => {
    const onCreated = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:expense-created", onCreated);
    window.addEventListener("farmos:sale-created", onCreated);
    return () => {
      window.removeEventListener("farmos:expense-created", onCreated);
      window.removeEventListener("farmos:sale-created", onCreated);
    };
  }, []);
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Finances · Finances" : "Finances · Finances"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? <>Finances de la ferme, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{monthLabel}</span></> : <>Farm finances, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{monthLabel}</span></>}
        </h1>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <CurrencySelect lang={lang} value={activeCurrencyId} onChange={(v) => setCurrencyFilter(v ? String(v) : "")} currencies={currencyMeta.currencies}/>
          <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {(() => {
          const totalR = transactions.filter((t) => t.kind === "rev").reduce((a, b) => a + Number(b.rawAmount || 0), 0);
          const totalE = Math.abs(transactions.filter((t) => t.kind === "exp").reduce((a, b) => a + Number(b.rawAmount || 0), 0));
          const profit = totalR - totalE;
          const margin = totalR > 0 ? (profit / totalR) * 100 : 0;
          return <>
            <KpiCard label={t(lang, "revenue")} sublabel={rangeLabel(dateRange, lang)} value={totalR.toLocaleString("fr-CA")} unit={moneyUnit} trend={summary.revenue.length ? summary.revenue : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="coins" accent="var(--money-500)"/>
            <KpiCard label={t(lang, "expense")} sublabel={rangeLabel(dateRange, lang)} value={totalE.toLocaleString("fr-CA")} unit={moneyUnit} trend={summary.expense.length ? summary.expense : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="wallet"/>
            <KpiCard label={t(lang, "profit")} sublabel={rangeLabel(dateRange, lang)} value={profit.toLocaleString("fr-CA")} unit={moneyUnit} trend={summary.revenue.length ? summary.revenue.map((v, i) => v - (summary.expense[i] || 0)) : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="chart" accent="var(--money-500)"/>
            <KpiCard label={t(lang, "margin")} sublabel={rangeLabel(dateRange, lang)} value={margin.toFixed(1).replace(".", ",")} unit="%" trend={summary.revenue.length ? summary.revenue.map((v, i) => { const e = summary.expense[i] || 0; return v > 0 ? ((v - e) / v) * 100 : 0; }) : [0,0,0,0,0,0,0,0,0,0,0,0]} icon="chartPie" accent="var(--money-500)"/>
          </>;
        })()}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-main-15)", gap: 16 }}>
        <div className="card">
          <div className="bilang" style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20 }}>{lang === "fr" ? "Revenus vs dépenses · 12 mois" : "Revenue vs expenses · 12 months"}</h3>
            <span className="sec">{lang === "fr" ? `en milliers ${moneyUnit}` : `in thousands ${moneyUnit}`}</span>
          </div>
          <RevExpChart lang={lang} summary={summary}/>
        </div>
        <div className="card">
          <div className="bilang" style={{ marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20 }}>{lang === "fr" ? "Sources de revenus" : "Revenue sources"}</h3>
            <span className="sec">{formatMoney(totalRev, activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.byCategory.map((c, i) => {
              const pct = totalRev > 0 ? (c.amount / totalRev) * 100 : 0;
              return (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--ink-800)", fontWeight: 500 }}>{lang === "fr" ? c.fr : c.en}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-900)" }}>{formatMoney(c.amount, activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rentabilité par animal / lot (#4) */}
      {(profitability.byAnimal.length > 0 || profitability.byLot.length > 0) && (
        <ProfitabilitySection lang={lang} data={profitability} currencySymbol={moneyUnit}/>
      )}

      {/* Recent transactions */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Transactions récentes" : "Recent transactions"}</h3>
          <button className="btn btn-sm" onClick={() => api.downloadFinancePdf().catch((e) => console.warn(e.message))}><Icon name="download" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Exporter PDF" : "Export PDF"}</button>
        </div>
        {transactions.map((tr, i) => (
          <div key={tr.id || i} style={{
            display: "grid", gridTemplateColumns: "70px 32px 1fr 110px 100px", gap: 14, padding: "12px 18px", alignItems: "center",
            borderBottom: i < transactions.length - 1 ? "1px solid var(--border-1)" : "none",
          }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{tr.date}</span>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: tr.kind === "rev" ? "var(--solidite-50)" : "var(--oxblood-50)", color: tr.kind === "rev" ? "var(--solidite-700)" : "var(--oxblood-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={tr.kind === "rev" ? "arrowDown" : "arrowUp"} size={12} color="currentColor"/>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink-900)", fontWeight: 500 }}>{tr.label}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                <span className="tag" style={{ fontSize: 10 }}>{tr.category}</span>
                {tr.species && speciesById(tr.species) && (
                  <span className="tag" style={{ background: speciesById(tr.species).accentBg, color: speciesById(tr.species).accent, fontSize: 10 }}>
                    <AnimalGlyph kind={speciesById(tr.species).glyph} size={10} color="currentColor"/>
                    {lang === "fr" ? speciesById(tr.species).fr : speciesById(tr.species).en}
                  </span>
                )}
              </div>
            </div>
            <span className="mono tnum" style={{ fontSize: 14, fontWeight: 600, color: tr.kind === "rev" ? "var(--solidite-700)" : "var(--oxblood-700)", textAlign: "right" }}>{tr.amount} {symbolFor(tr.currencyId || activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol)}</span>
            {tr._pk && tr._kind ? (
              <button className="btn btn-sm btn-ghost" style={{ justifySelf: "end" }} title={lang === "fr" ? "Supprimer" : "Delete"}
                onClick={async () => {
                  if (!window.confirm(lang === "fr" ? `Supprimer cette transaction ?` : `Delete this transaction?`)) return;
                  try {
                    if (tr._kind === "sale") await api.deleteSale(tr._pk);
                    else if (tr._kind === "expense") await api.deleteExpense(tr._pk);
                    window.dispatchEvent(new CustomEvent(tr._kind === "sale" ? "farmos:sale-created" : "farmos:expense-created"));
                  } catch (e) { window.alert(e.message); }
                }}>
                <Icon name="trash" size={13} color="var(--oxblood-700)"/>
              </button>
            ) : <button className="btn btn-sm btn-ghost" style={{ justifySelf: "end" }}><Icon name="moreH" size={13} color="var(--ink-600)"/></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

const RevExpChart = ({ lang, summary }) => {
  const W = 720, H = 200, PAD_L = 32, PAD_B = 24, PAD_R = 12, PAD_T = 8;
  const SHORT = lang === "fr" ? ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = (summary?.months || []).map((m) => { const i = Number(m.slice(5, 7)) - 1; return SHORT[i] || m; });
  const rev = summary?.revenue || [];
  const exp = summary?.expense || [];
  const max = Math.max(1, ...rev, ...exp) * 1.1;
  const bw = (W - PAD_L - PAD_R) / Math.max(1, rev.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
      {[0, 0.5, 1].map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W-PAD_R} y1={PAD_T + (H-PAD_T-PAD_B)*g} y2={PAD_T + (H-PAD_T-PAD_B)*g} stroke="var(--border-1)" strokeDasharray="2 4"/>
          <text x={PAD_L - 6} y={PAD_T + (H-PAD_T-PAD_B)*g + 4} textAnchor="end" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{Math.round((1-g) * max)}</text>
        </g>
      ))}
      {rev.map((r, i) => {
        const e = exp[i] || 0;
        const x = PAD_L + i * bw + bw * 0.15;
        const hR = (r / max) * (H - PAD_T - PAD_B);
        const hE = (e / max) * (H - PAD_T - PAD_B);
        return (
          <g key={i}>
            <rect x={x} y={H - PAD_B - hR} width={bw * 0.32} height={hR} fill="var(--solidite-500)" rx="2"/>
            <rect x={x + bw * 0.38} y={H - PAD_B - hE} width={bw * 0.32} height={hE} fill="var(--oxblood-500)" rx="2"/>
            <text x={x + bw * 0.35} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">{months[i]}</text>
          </g>
        );
      })}
      {/* legend */}
      <g transform={`translate(${W - 200}, 0)`}>
        <rect x="0" y="2" width="10" height="10" fill="var(--solidite-500)" rx="2"/>
        <text x="14" y="11" fontSize="11" fill="var(--ink-700)" fontFamily="var(--font-sans)">{lang === "fr" ? "Revenus" : "Revenue"}</text>
        <rect x="80" y="2" width="10" height="10" fill="var(--oxblood-500)" rx="2"/>
        <text x="94" y="11" fontSize="11" fill="var(--ink-700)" fontFamily="var(--font-sans)">{lang === "fr" ? "Dépenses" : "Expenses"}</text>
      </g>
    </svg>
  );
};

// ─── REPORTS ─────────────────────────────────────────────────────────────
// Imprime un rapport d'effectif GLOBAL : tous les bâtiments + total par catégorie.
const printHeadcountReport = (buildings, animals, lang, speciesLabel = null) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const spSuffix = speciesLabel ? ` · ${esc(speciesLabel)}` : ` · ${L("toutes espèces", "all species")}`;
  const grand = { adulte: 0, cochette: 0, engraissement: 0, jeune: 0, inconnu: 0 };
  let grandTotal = 0, grandReady = 0, grandOverdue = 0;
  const rows = (buildings || []).map((b) => {
    const bAnimals = (animals || []).filter((a) => isActiveLivestock(a) && a.barn === b.name);
    const cats = categoryBreakdownByGroup(bAnimals);
    const sl = slaughterStats(bAnimals, { onlyFattening: true });
    const aw = slaughterStats(bAnimals).avgWeight;
    const total = bAnimals.reduce((s, a) => s + animalQty(a), 0);
    CATEGORY_ORDER.forEach((c) => { grand[c] += cats[c]; });
    grandTotal += total; grandReady += sl.pret; grandOverdue += sl.retard;
    return `<tr><td>${esc(b.name)}</td><td class="num">${total}</td>${CATEGORY_ORDER.map((c) => `<td class="num">${cats[c] || 0}</td>`).join("")}<td class="num">${sl.pret || ""}</td><td class="num">${sl.retard || ""}</td><td class="num">${aw != null ? aw.toFixed(1) : ""}</td></tr>`;
  }).join("");
  const head = `<th>${L("Bâtiment", "Building")}</th><th class="num">${L("Total", "Total")}</th>${CATEGORY_ORDER.map((c) => `<th class="num">${esc(lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en)}</th>`).join("")}<th class="num">${L("Prêts", "Ready")}</th><th class="num">${L("Retard", "Overdue")}</th><th class="num">${L("Poids moy.", "Avg kg")}</th>`;
  const foot = `<tr class="tot"><td>${L("TOTAL", "TOTAL")}</td><td class="num">${grandTotal}</td>${CATEGORY_ORDER.map((c) => `<td class="num">${grand[c]}</td>`).join("")}<td class="num">${grandReady}</td><td class="num">${grandOverdue}</td><td class="num"></td></tr>`;
  const catLbl = (c) => esc(lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en);
  const topCat = CATEGORY_ORDER.slice().sort((a, b) => grand[b] - grand[a])[0];
  const nlText = L(
    `En clair : la ferme compte aujourd'hui <b>${grandTotal}</b> animaux vivants répartis sur <b>${(buildings || []).length}</b> bâtiment(s). La catégorie la plus nombreuse est <b>${catLbl(topCat)}</b> (${grand[topCat] || 0} têtes). ${grandReady > 0 ? `<b>${grandReady}</b> animal(aux) à l'engraissement ont atteint le poids d'abattage (prêts à vendre)` : "Aucun animal n'est encore prêt pour l'abattage"}${grandOverdue > 0 ? `, dont <b>${grandOverdue}</b> en retard (déjà au-delà du poids cible : à vendre en priorité pour éviter de gaspiller de l'aliment)` : ""}. Chaque ligne du tableau correspond à un bâtiment ; les colonnes détaillent combien d'adultes, cochettes, animaux à l'engraissement et jeunes s'y trouvent.`,
    `In plain words: the farm currently holds <b>${grandTotal}</b> live animals across <b>${(buildings || []).length}</b> building(s). The largest category is <b>${catLbl(topCat)}</b> (${grand[topCat] || 0} head). ${grandReady > 0 ? `<b>${grandReady}</b> fattening animal(s) have reached slaughter weight (ready to sell)` : "No animal is ready for slaughter yet"}${grandOverdue > 0 ? `, of which <b>${grandOverdue}</b> are overdue (past target weight: sell first to avoid wasting feed)` : ""}. Each table row is a building; the columns break down how many adults, gilts, fattening and young animals it holds.`
  );
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Rapport d'effectif global", "Global headcount report")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td { font-weight: 700; background: #eef5ef; }
  .nl { border: 1px solid #d7e3da; background: #f3f8f4; border-radius: 6px; padding: 11px 13px; margin-top: 14px; font-size: 12px; color: #243; line-height: 1.55; }
  .nl h2 { font-size: 12px; margin: 0 0 4px; color: #15603a; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>${L("Rapport d'effectif global", "Global headcount report")}</h1>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)} · ${(buildings || []).length} ${L("bâtiments", "buildings")}${spSuffix}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${rows}${foot}</tbody></table>
  <div class="nl"><h2>${L("Ce que disent ces données", "What this data says")}</h2>${nlText}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(html); w.document.close();
};

// Imprime un rapport de STRUCTURE du cheptel : par bâtiment, mâles / femelles (M/F)
// dans chaque catégorie (adultes, cochettes, engraissement, jeunes), + total M, total F
// et total général (M+F) par bâtiment.
const printSexStructureReport = (buildings, animals, lang, speciesLabel = null) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const spSuffix = speciesLabel ? ` · ${esc(speciesLabel)}` : ` · ${L("toutes espèces", "all species")}`;
  const grand = {}; CATEGORY_ORDER.forEach((c) => { grand[c] = { M: 0, F: 0, inconnu: 0 }; });
  let gM = 0, gF = 0, gU = 0;
  const cell = (sb, c) => {
    const s = sb[c];
    if (!s || (s.M + s.F + s.inconnu) === 0) return `<td class="num"></td>`;
    return `<td class="num">${s.M ? `<b>${s.M}</b>M` : ""}${s.M && s.F ? " " : ""}${s.F ? `<b>${s.F}</b>F` : ""}${s.inconnu ? ` ${s.inconnu}?` : ""}</td>`;
  };
  const rows = (buildings || []).map((b) => {
    const bAnimals = (animals || []).filter((a) => isActiveLivestock(a) && a.barn === b.name);
    const sb = sexBreakdownByGroup(bAnimals);
    let m = 0, f = 0, u = 0;
    CATEGORY_ORDER.forEach((c) => { grand[c].M += sb[c].M; grand[c].F += sb[c].F; grand[c].inconnu += sb[c].inconnu; m += sb[c].M; f += sb[c].F; u += sb[c].inconnu; });
    gM += m; gF += f; gU += u;
    return `<tr><td>${esc(b.name)}</td>${CATEGORY_ORDER.map((c) => cell(sb, c)).join("")}<td class="num"><b>${m}</b></td><td class="num"><b>${f}</b></td><td class="num"><b>${m + f + u}</b></td></tr>`;
  }).join("");
  const head = `<th>${L("Bâtiment", "Building")}</th>${CATEGORY_ORDER.map((c) => `<th class="num">${esc(lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en)}</th>`).join("")}<th class="num">${L("Total M", "Total M")}</th><th class="num">${L("Total F", "Total F")}</th><th class="num">${L("Total", "Total")}</th>`;
  const foot = `<tr class="tot"><td>${L("TOTAL", "TOTAL")}</td>${CATEGORY_ORDER.map((c) => cell(grand, c)).join("")}<td class="num">${gM}</td><td class="num">${gF}</td><td class="num">${gM + gF + gU}</td></tr>`;
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Structure du cheptel (M/F)", "Herd structure (M/F)")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td { font-weight: 700; background: #eef5ef; }
  .lgd { color: #666; font-size: 11px; margin-top: 10px; }
  .nl { border: 1px solid #d7e3da; background: #f3f8f4; border-radius: 6px; padding: 11px 13px; margin-top: 14px; font-size: 12px; color: #243; line-height: 1.55; }
  .nl h2 { font-size: 12px; margin: 0 0 4px; color: #15603a; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>${L("Structure du cheptel — répartition mâles / femelles", "Herd structure — male / female breakdown")}</h1>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)} · ${(buildings || []).length} ${L("bâtiments", "buildings")}${spSuffix}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${rows}${foot}</tbody></table>
  <div class="lgd">${L("M = mâles · F = femelles · ? = sexe non renseigné. La colonne Total = M + F (+ sexe non renseigné).", "M = males · F = females · ? = sex not set. The Total column = M + F (+ sex not set).")}</div>
  <div class="nl"><h2>${L("Ce que disent ces données", "What this data says")}</h2>${L(
    `En clair : sur l'ensemble de la ferme on dénombre <b>${gM}</b> mâles et <b>${gF}</b> femelles${gU ? ` (et ${gU} animal(aux) au sexe non renseigné)` : ""}. ${gF > gM ? "Les femelles dominent, ce qui est sain pour la reproduction (les femelles produisent la descendance, le lait, les œufs)." : gM > gF ? "Les mâles sont plus nombreux que les femelles : un surplus de mâles non reproducteurs coûte de l'aliment sans rapporter — pensez à les orienter vers l'engraissement / la vente." : "Mâles et femelles sont à l'équilibre."}${gU ? ` Renseigner le sexe des <b>${gU}</b> animal(aux) manquant(s) fiabilisera ce suivi.` : ""} Le tableau montre, bâtiment par bâtiment et catégorie par catégorie, combien de mâles et de femelles sont présents.`,
    `In plain words: across the whole farm there are <b>${gM}</b> males and <b>${gF}</b> females${gU ? ` (plus ${gU} animal(s) with no sex recorded)` : ""}. ${gF > gM ? "Females dominate, which is healthy for breeding (females produce offspring, milk, eggs)." : gM > gF ? "Males outnumber females: a surplus of non-breeding males eats feed without return — consider moving them to fattening / sale." : "Males and females are balanced."}${gU ? ` Recording the sex of the <b>${gU}</b> missing animal(s) will make this tracking more reliable.` : ""} The table shows, building by building and category by category, how many males and females are present.`
  )}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(html); w.document.close();
};

// Imprime un rapport RATIO REPRODUCTEUR : par bâtiment, total mâles / femelles et le
// ratio M:F, + encadré expliquant comment lire le ratio.
const printBreedingRatioReport = (buildings, animals, lang, speciesLabel = null) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const spSuffix = speciesLabel ? ` · ${esc(speciesLabel)}` : ` · ${L("toutes espèces", "all species")}`;
  const ratio = (m, f) => (f > 0 ? `1:${(m / f).toFixed(2).replace(/\.?0+$/, "")}` : (m > 0 ? "—" : ""));
  // Espèce dominante d'un bâtiment (la plus représentée), pour choisir le ratio idéal.
  const dominantSpecies = (list) => {
    const cnt = {};
    (list || []).forEach((a) => { if (a?.species) cnt[a.species] = (cnt[a.species] || 0) + animalQty(a); });
    return Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
  };
  // Diagnostic auto : compare les femelles/mâle réelles au ratio idéal de l'espèce
  // dominante (tolérance ±20 %). Renvoie { txt, color }.
  const diagnose = (m, f, sp) => {
    const ideal = BREEDING_RATIO[sp] ?? 20; // femelles par mâle visées
    if (m === 0 && f === 0) return { txt: L("Aucun adulte", "No adults"), color: "#888" };
    if (m === 0) return { txt: L(`Aucun mâle reproducteur (idéal ~1 pour ${ideal} ♀)`, `No breeding male (ideal ~1 per ${ideal} ♀)`), color: "#b91c1c" };
    if (f === 0) return { txt: L("Que des mâles : à orienter vers l'engraissement", "Only males: redirect to fattening"), color: "#b45309" };
    const perMale = f / m; // femelles par mâle
    if (perMale > ideal * 1.2) return { txt: L(`Pas assez de mâles (${perMale.toFixed(0)} ♀/mâle, idéal ~${ideal}) → fécondation insuffisante`, `Too few males (${perMale.toFixed(0)} ♀/male, ideal ~${ideal}) → insufficient breeding`), color: "#b91c1c" };
    if (perMale < ideal * 0.8) return { txt: L(`Trop de mâles (${perMale.toFixed(1)} ♀/mâle, idéal ~${ideal}) → surplus à engraisser`, `Too many males (${perMale.toFixed(1)} ♀/male, ideal ~${ideal}) → fatten the surplus`), color: "#b45309" };
    return { txt: L(`Équilibré (${perMale.toFixed(0)} ♀/mâle ≈ idéal ~${ideal})`, `Balanced (${perMale.toFixed(0)} ♀/male ≈ ideal ~${ideal})`), color: "#15803d" };
  };
  let gM = 0, gF = 0;
  const rows = (buildings || []).map((b) => {
    const bAnimals = (animals || []).filter((a) => isActiveLivestock(a) && a.barn === b.name);
    const sb = sexBreakdownByGroup(bAnimals);
    let m = 0, f = 0;
    CATEGORY_ORDER.forEach((c) => { m += sb[c].M; f += sb[c].F; });
    gM += m; gF += f;
    const dg = diagnose(m, f, dominantSpecies(bAnimals));
    return `<tr><td>${esc(b.name)}</td><td class="num">${m}</td><td class="num">${f}</td><td class="num"><b>${ratio(m, f)}</b></td><td style="color:${dg.color}">${esc(dg.txt)}</td></tr>`;
  }).join("");
  const head = `<th>${L("Bâtiment", "Building")}</th><th class="num">${L("Mâles (M)", "Males (M)")}</th><th class="num">${L("Femelles (F)", "Females (F)")}</th><th class="num">${L("Ratio M:F", "Ratio M:F")}</th><th>${L("Interprétation", "Interpretation")}</th>`;
  const foot = `<tr class="tot"><td>${L("TOTAL", "TOTAL")}</td><td class="num">${gM}</td><td class="num">${gF}</td><td class="num">${ratio(gM, gF)}</td><td></td></tr>`;
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Ratio reproducteur (M:F)", "Breeding ratio (M:F)")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td { font-weight: 700; background: #eef5ef; }
  .note { border: 1px solid #ddd; background: #fafaf8; border-radius: 6px; padding: 10px 12px; margin-top: 12px; font-size: 11px; color: #333; line-height: 1.5; }
  .note h2 { font-size: 12px; margin: 0 0 4px; }
  .note ul { margin: 4px 0 0; padding-left: 18px; } .note li { margin: 2px 0; }
  .nl { border: 1px solid #d7e3da; background: #f3f8f4; border-radius: 6px; padding: 11px 13px; margin-top: 14px; font-size: 12px; color: #243; line-height: 1.55; }
  .nl h2 { font-size: 12px; margin: 0 0 4px; color: #15603a; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>${L("Ratio reproducteur — mâles / femelles", "Breeding ratio — males / females")}</h1>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)} · ${(buildings || []).length} ${L("bâtiments", "buildings")}${spSuffix}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${rows}${foot}</tbody></table>
  <div class="nl"><h2>${L("Ce que disent ces données", "What this data says")}</h2>${L(
    `En clair : la ferme compte au total <b>${gM}</b> mâles pour <b>${gF}</b> femelles, soit un ratio global de <b>${ratio(gM, gF)}</b>${gF > 0 ? ` (environ ${(gF / Math.max(gM, 1)).toFixed(0)} femelle(s) par mâle)` : ""}. ${gM === 0 ? "Sans mâle reproducteur, aucune saillie naturelle n'est possible : il faut introduire au moins un mâle ou recourir à l'insémination." : (gF / gM) > 30 ? "Il y a relativement peu de mâles pour beaucoup de femelles : surveillez que toutes les femelles soient bien fécondées." : (gF / gM) < 5 && gM > 1 ? "Il y a beaucoup de mâles par rapport aux femelles : un mâle peut couvrir plusieurs femelles, le surplus de mâles peut être engraissé pour la vente." : "L'équilibre mâles / femelles est globalement cohérent pour la reproduction."} La colonne <b>Interprétation</b> précise, bâtiment par bâtiment, si ce ratio est bon (vert), s'il manque des mâles (rouge) ou s'il y en a trop (orange).`,
    `In plain words: the farm has a total of <b>${gM}</b> males for <b>${gF}</b> females, i.e. an overall ratio of <b>${ratio(gM, gF)}</b>${gF > 0 ? ` (about ${(gF / Math.max(gM, 1)).toFixed(0)} female(s) per male)` : ""}. ${gM === 0 ? "With no breeding male, no natural mating is possible: add at least one male or use insemination." : (gF / gM) > 30 ? "There are relatively few males for many females: make sure all females actually get bred." : (gF / gM) < 5 && gM > 1 ? "There are many males relative to females: one male can serve several females, so the surplus males can be fattened for sale." : "The male / female balance is broadly sound for breeding."} The <b>Interpretation</b> column says, building by building, whether this ratio is good (green), short of males (red) or has too many (orange).`
  )}</div>
  <div class="note">
    <h2>${L("Comment lire le ratio M:F et l'interprétation", "How to read the M:F ratio and interpretation")}</h2>
    ${L(
      "La colonne <b>Interprétation</b> compare automatiquement le nombre de femelles par mâle de chaque bâtiment au ratio idéal de l'espèce dominante (tolérance ±20 %) : <span style=\"color:#15803d\">vert</span> = équilibré, <span style=\"color:#b45309\">orange</span> = trop de mâles (surplus à engraisser), <span style=\"color:#b91c1c\">rouge</span> = pas assez de mâles (fécondation insuffisante). Le ratio indique combien de mâles pour combien de femelles, sous la forme « 1:X ». Exemples : <b>1:20</b> = 1 mâle pour 20 femelles ; <b>1:0,5</b> = 2 mâles pour 1 femelle (plus de mâles que de femelles).",
      "The <b>Interpretation</b> column automatically compares each building's females per male to the ideal ratio of the dominant species (±20% tolerance): <span style=\"color:#15803d\">green</span> = balanced, <span style=\"color:#b45309\">orange</span> = too many males (fatten the surplus), <span style=\"color:#b91c1c\">red</span> = too few males (insufficient breeding). The ratio shows how many males per females, as “1:X”. Examples: <b>1:20</b> = 1 male per 20 females; <b>1:0.5</b> = 2 males per 1 female (more males than females)."
    )}
    <ul>
      <li>${L("Chaque espèce a un ratio reproducteur idéal (1 mâle peut féconder N femelles) : porc ~1:20, bovin ~1:25, caprin/ovin ~1:25, volaille ~1:10.", "Each species has an ideal breeding ratio (1 male can serve N females): pig ~1:20, cattle ~1:25, goat/sheep ~1:25, poultry ~1:10.")}</li>
      <li>${L("Trop de femelles par mâle (ex. 1:40 chez le porc) → pas assez de reproducteurs, fécondation insuffisante.", "Too many females per male (e.g. 1:40 for pigs) → not enough breeders, insufficient breeding.")}</li>
      <li>${L("Trop de mâles (ex. 1:0,5) → mâles nourris sans utilité reproductive : à orienter vers l'engraissement / l'abattage.", "Too many males (e.g. 1:0.5) → males fed without breeding use: redirect them to fattening / slaughter.")}</li>
    </ul>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(html); w.document.close();
};

// Imprime un rapport de PRÉVISION (forecast) : projette trésorerie, cheptel et
// production sur un horizon donné en réutilisant le moteur forecast backend2
// (scope "farmos"), puis ajoute une explication en langage naturel.
const printForecastReport = async (lang, horizon = 6, species = null) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 });
  const horizonLabel = horizon >= 12 ? L(`${horizon / 12} an(s)`, `${horizon / 12} year(s)`) : L(`${horizon} mois`, `${horizon} months`);
  const spDef = species ? speciesById(species) : null;
  const speciesLabel = spDef ? (lang === "fr" ? spDef.fr : spDef.en) : null;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(`<!DOCTYPE html><html lang="${lang}"><body style="font-family:Arial,sans-serif;color:#666;margin:40px">${L("Génération de la prévision…", "Generating forecast…")}</body></html>`);
  w.document.close();
  const [cash, herd] = await Promise.all([
    api.forecastCashFlow({ horizon, mode: "realiste", scope: "farmos", species }).catch(() => null),
    api.forecastLivestock({ horizon, species }).catch(() => null),
  ]);

  // Trésorerie : cumul net final par devise
  const cashRows = [];
  let netLine = L("Données de trésorerie insuffisantes.", "Not enough cash-flow data.");
  if (cash && Array.isArray(cash.months) && cash.months.length) {
    const byCur = new Map();
    for (const mo of cash.months) {
      for (const c of (mo.currencies || [])) {
        const code = c.currencyCode || c.currencySymbol || "?";
        byCur.set(code, (byCur.get(code) || 0) + Number(c.net || 0));
      }
    }
    const parts = [];
    for (const [code, net] of byCur.entries()) {
      cashRows.push(`<tr><td>${esc(code)}</td><td class="num">${nf.format(Math.round(net))}</td></tr>`);
      parts.push(`<b>${nf.format(Math.round(net))} ${esc(code)}</b>`);
    }
    if (parts.length) netLine = L(`Sur ${horizonLabel}, le flux net cumulé projeté est de ${parts.join(", ")} (entrées de ventes moins dépenses prévues).`, `Over ${horizonLabel}, the projected cumulative net flow is ${parts.join(", ")} (sales inflows minus expected expenses).`);
  }
  const cashTable = cashRows.length
    ? `<table><thead><tr><th>${L("Devise", "Currency")}</th><th class="num">${L("Flux net cumulé prévu", "Projected cumulative net flow")}</th></tr></thead><tbody>${cashRows.join("")}</tbody></table>`
    : `<p class="empty">${L("Pas encore assez d'historique de ventes/dépenses pour projeter la trésorerie.", "Not enough sales/expense history yet to project cash flow.")}</p>`;

  // Cheptel : effectif actuel → effectif projeté (+ fourchette)
  let herdTable = `<p class="empty">${L("Pas encore assez d'historique pour projeter le cheptel.", "Not enough history yet to project livestock.")}</p>`;
  let herdLine = "";
  if (herd && Array.isArray(herd.points) && herd.points.length) {
    const end = herd.points[herd.points.length - 1];
    const current = Number(herd.current || 0);
    const proj = Number(end.head || 0);
    const low = Number(end.headLow || proj), high = Number(end.headHigh || proj);
    const delta = proj - current;
    const totals = herd.points.reduce((a, p) => ({ births: a.births + Number(p.births || 0), deaths: a.deaths + Number(p.deaths || 0), exits: a.exits + Number(p.exits || 0) }), { births: 0, deaths: 0, exits: 0 });
    herdTable = `<table><thead><tr><th>${L("Indicateur", "Indicator")}</th><th class="num">${L("Valeur", "Value")}</th></tr></thead><tbody>`
      + `<tr><td>${L("Effectif actuel", "Current headcount")}</td><td class="num">${nf.format(current)}</td></tr>`
      + `<tr class="tot"><td>${L("Effectif prévu dans", "Headcount projected in")} ${horizonLabel}</td><td class="num">${nf.format(Math.round(proj))} <span style="color:#888">(${nf.format(Math.round(low))}–${nf.format(Math.round(high))})</span></td></tr>`
      + `<tr><td>${L("Naissances cumulées prévues", "Projected cumulative births")}</td><td class="num">+${nf.format(Math.round(totals.births))}</td></tr>`
      + `<tr><td>${L("Mortalités cumulées prévues", "Projected cumulative deaths")}</td><td class="num">−${nf.format(Math.round(totals.deaths))}</td></tr>`
      + `<tr><td>${L("Sorties cumulées prévues (ventes/abattage)", "Projected cumulative exits (sales/slaughter)")}</td><td class="num">−${nf.format(Math.round(totals.exits))}</td></tr>`
      + `</tbody></table>`;
    herdLine = L(
      `Le cheptel passerait de <b>${nf.format(current)}</b> à environ <b>${nf.format(Math.round(proj))}</b> têtes (${delta >= 0 ? "+" : ""}${nf.format(Math.round(delta))}), avec une fourchette plausible de ${nf.format(Math.round(low))} à ${nf.format(Math.round(high))}. Cette projection tient compte des naissances attendues (+${nf.format(Math.round(totals.births))}), des mortalités (−${nf.format(Math.round(totals.deaths))}) et des sorties prévues (−${nf.format(Math.round(totals.exits))}).`,
      `The herd would move from <b>${nf.format(current)}</b> to about <b>${nf.format(Math.round(proj))}</b> head (${delta >= 0 ? "+" : ""}${nf.format(Math.round(delta))}), within a plausible range of ${nf.format(Math.round(low))} to ${nf.format(Math.round(high))}. This projection factors in expected births (+${nf.format(Math.round(totals.births))}), deaths (−${nf.format(Math.round(totals.deaths))}) and planned exits (−${nf.format(Math.round(totals.exits))}).`
    );
  }

  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Rapport de prévision", "Forecast report")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 20px 0 6px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 4px; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td { font-weight: 700; background: #eef5ef; }
  .empty { color: #888; font-size: 12px; }
  .nl { border: 1px solid #d7e3da; background: #f3f8f4; border-radius: 6px; padding: 11px 13px; margin-top: 18px; font-size: 12px; color: #243; line-height: 1.55; }
  .nl h2 { font-size: 12px; margin: 0 0 4px; color: #15603a; }
  .disc { color: #888; font-size: 10.5px; margin-top: 10px; line-height: 1.5; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>${L("Rapport de prévision", "Forecast report")}${speciesLabel ? ` — ${esc(speciesLabel)}` : ""}</h1>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)} · ${L("horizon", "horizon")} ${horizonLabel} · ${L("scénario réaliste", "realistic scenario")}${speciesLabel ? ` · ${esc(speciesLabel)}` : ` · ${L("toutes espèces", "all species")}`}</div>
  <h2>${L("Trésorerie projetée", "Projected cash flow")}</h2>
  ${cashTable}
  <h2>${L("Cheptel projeté", "Projected livestock")}</h2>
  ${herdTable}
  <div class="nl"><h2>${L("Ce que disent ces données", "What this data says")}</h2>
    ${netLine}${herdLine ? " " + herdLine : ""}
    <div class="disc">${L("Une prévision n'est pas une certitude : elle prolonge les tendances passées de la ferme. Plus l'horizon est lointain, plus la fourchette s'élargit. Mettez à jour vos saisies (ventes, naissances, mortalités) pour fiabiliser ces projections.", "A forecast is not a certainty: it extends the farm's past trends. The further the horizon, the wider the range. Keep your entries up to date (sales, births, deaths) to make these projections more reliable.")}</div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
};

// Imprime un rapport de MORTALITÉ : liste chaque événement de décès (date, espèce,
// nombre, cause présumée / confirmée, lieu, perte estimée, symptômes, notes), avec
// totaux par cause / espèce et une explication en langage naturel.
const printMortalityReport = (events, lang, moneyUnit = "", speciesLabel = null) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const spSuffix = speciesLabel ? ` · ${esc(speciesLabel)}` : "";
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 });
  const cur = moneyUnit ? " " + esc(moneyUnit) : "";
  const money = (v) => nf.format(Math.round(Number(v || 0))) + cur;
  const list = Array.isArray(events) ? events.slice().sort((a, b) => String(b.eventDate ?? "").localeCompare(String(a.eventDate ?? ""))) : [];
  const spLabel = (id) => { const s = speciesById(id); return s ? (lang === "fr" ? s.fr : s.en) : (id || "—"); };
  let totalDeaths = 0, totalLoss = 0, confirmedCount = 0;
  const byCause = {}, bySpecies = {};
  const rows = list.map((e) => {
    const n = Number(e.count ?? 1);
    totalDeaths += n;
    totalLoss += Number(e.estimatedLoss ?? 0);
    const confirmed = e.confirmedCause && String(e.confirmedCause).trim();
    if (confirmed) confirmedCount += n;
    const cause = (e.cause && String(e.cause).trim()) || L("Non renseignée", "Not recorded");
    byCause[cause] = (byCause[cause] || 0) + n;
    bySpecies[e.species || "?"] = (bySpecies[e.species || "?"] || 0) + n;
    const place = [e.barn, e.lot].filter(Boolean).map(esc).join(" · ") || "—";
    const extras = [
      e.preDeathSymptoms ? `${L("Symptômes", "Symptoms")}: ${esc(e.preDeathSymptoms)}` : "",
      Number(e.vetConsulted) ? L("Vétérinaire consulté", "Vet consulted") : "",
      Number(e.necropsyDone) ? L("Nécropsie réalisée", "Necropsy done") : (Number(e.necropsyRequested) ? L("Nécropsie demandée", "Necropsy requested") : ""),
    ].filter(Boolean).join(" · ");
    const notes = [esc(e.notes || ""), extras].filter(Boolean).join(extras && e.notes ? " — " : "");
    return `<tr>`
      + `<td>${esc(e.eventDate || "—")}</td>`
      + `<td>${esc(spLabel(e.species))}</td>`
      + `<td class="num">${n}</td>`
      + `<td>${esc(cause)}</td>`
      + `<td>${confirmed ? `<b>${esc(e.confirmedCause)}</b>` : `<span style="color:#999">${L("présumée", "presumed")}</span>`}</td>`
      + `<td>${place}</td>`
      + `<td class="num">${e.estimatedLoss != null && e.estimatedLoss !== "" ? money(e.estimatedLoss) : ""}</td>`
      + `<td style="max-width:280px">${notes || "—"}</td>`
      + `</tr>`;
  }).join("");
  const head = `<th>${L("Date", "Date")}</th><th>${L("Espèce", "Species")}</th><th class="num">${L("Nb", "Qty")}</th>`
    + `<th>${L("Cause", "Cause")}</th><th>${L("Confirmée ?", "Confirmed?")}</th><th>${L("Lieu", "Location")}</th>`
    + `<th class="num">${L("Perte est.", "Est. loss")}${moneyUnit ? ` (${esc(moneyUnit)})` : ""}</th><th>${L("Notes / symptômes", "Notes / symptoms")}</th>`;
  const foot = `<tr class="tot"><td colspan="2">${L("TOTAL", "TOTAL")}</td><td class="num">${totalDeaths}</td><td colspan="3"></td><td class="num">${totalLoss ? money(totalLoss) : ""}</td><td></td></tr>`;
  const topCause = Object.entries(byCause).sort((a, b) => b[1] - a[1])[0];
  const topSpecies = Object.entries(bySpecies).sort((a, b) => b[1] - a[1])[0];
  const confirmedPct = totalDeaths > 0 ? Math.round((confirmedCount / totalDeaths) * 100) : 0;
  const nlText = list.length === 0
    ? L("Aucun décès n'a été enregistré. Continuez à saisir les mortalités au fur et à mesure : c'est ce qui permet de détecter tôt une maladie ou un problème d'élevage.", "No deaths have been recorded. Keep logging mortalities as they happen: this is what lets you spot a disease or husbandry problem early.")
    : L(
      `En clair : <b>${totalDeaths}</b> animal(aux) sont décédés sur <b>${list.length}</b> événement(s) enregistré(s)${totalLoss ? `, pour une perte estimée d'environ <b>${money(totalLoss)}</b>` : ""}. La cause la plus fréquente est <b>${esc(topCause[0])}</b> (${topCause[1]} décès) et l'espèce la plus touchée est <b>${esc(spLabel(topSpecies[0]))}</b> (${topSpecies[1]} décès). Seulement <b>${confirmedPct}%</b> des décès ont une cause confirmée (examen / nécropsie) : les autres reposent sur une cause présumée par l'éleveur. Confirmer la cause (faire examiner les carcasses) aide à savoir s'il s'agit d'une maladie contagieuse à enrayer. Chaque ligne décrit un décès : quand, quelle espèce, combien d'animaux, la cause, le lieu et les observations.`,
      `In plain words: <b>${totalDeaths}</b> animal(s) died across <b>${list.length}</b> recorded event(s)${totalLoss ? `, for an estimated loss of about <b>${money(totalLoss)}</b>` : ""}. The most frequent cause is <b>${esc(topCause[0])}</b> (${topCause[1]} deaths) and the most affected species is <b>${esc(spLabel(topSpecies[0]))}</b> (${topSpecies[1]} deaths). Only <b>${confirmedPct}%</b> of deaths have a confirmed cause (exam / necropsy): the rest rely on a cause presumed by the farmer. Confirming the cause (having carcasses examined) helps tell whether it is a contagious disease to contain. Each row describes one death event: when, which species, how many animals, the cause, the location and the observations.`
    );
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Rapport de mortalité", "Mortality report")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; vertical-align: top; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.tot td { font-weight: 700; background: #fbecec; }
  .nl { border: 1px solid #e3d7d7; background: #fdf4f4; border-radius: 6px; padding: 11px 13px; margin-top: 14px; font-size: 12px; color: #432; line-height: 1.55; }
  .nl h2 { font-size: 12px; margin: 0 0 4px; color: #9a3030; }
  @media print { body { margin: 12mm; } }
</style></head><body>
  <h1>${L("Rapport de mortalité — animaux décédés", "Mortality report — deceased animals")}</h1>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)} · ${list.length} ${L("événement(s)", "event(s)")} · ${totalDeaths} ${L("décès", "deaths")}${spSuffix}</div>
  ${list.length ? `<table><thead><tr>${head}</tr></thead><tbody>${rows}${foot}</tbody></table>` : `<p style="color:#888;font-size:12px">${L("Aucun décès enregistré.", "No deaths recorded.")}</p>`}
  <div class="nl"><h2>${L("Ce que disent ces données", "What this data says")}</h2>${nlText}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(html); w.document.close();
};

// Export CSV (COMP-P1-007) — même format que l'export animaux (séparateur ;, BOM).
function reportCsvCell(value) {
  const text = value == null ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function downloadReportCsv(filename, rows) {
  if (typeof document === "undefined") return;
  const csv = rows.map((row) => row.map(reportCsvCell).join(";")).join("\r\n");
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ReportsScreen = ({ lang, speciesFilter, onSpeciesFilter, enabledSpecies }) => {
  const currencyMeta = useCurrencyCatalog();
  const moneyUnit = symbolFor(currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const [hcData, setHcData] = React.useState({ buildings: [], animals: [], mortality: [], loading: true });
  // Données restreintes à l'espèce sélectionnée (null = toutes espèces).
  const fAnimals = React.useMemo(() => (speciesFilter ? hcData.animals.filter((a) => a.species === speciesFilter) : hcData.animals), [hcData.animals, speciesFilter]);
  const fMortality = React.useMemo(() => (speciesFilter ? hcData.mortality.filter((m) => m.species === speciesFilter) : hcData.mortality), [hcData.mortality, speciesFilter]);
  const speciesLabel = speciesFilter ? (lang === "fr" ? speciesById(speciesFilter)?.fr : speciesById(speciesFilter)?.en) : null;
  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listBuildings().catch(() => []), api.listAnimals().catch(() => []), api.listMortalityEvents().catch(() => [])])
      .then(([b, a, m]) => { if (!cancel) setHcData({ buildings: Array.isArray(b) ? b : [], animals: Array.isArray(a) ? a : [], mortality: Array.isArray(m) ? m : [], loading: false }); });
    return () => { cancel = true; };
  }, []);
  const reports = [
    { fr: "Rapport sanitaire mensuel", en: "Monthly health report", icon: "pulse", color: "var(--health-500)", date: "26 mai 2026", size: "12 p." },
    { fr: "Production laitière · trimestre", en: "Milk production · quarter", icon: "droplet", color: "var(--pertinence-500)", date: "1ᵉʳ avril 2026", size: "18 p." },
    { fr: "Bilan reproduction Q1", en: "Q1 reproduction report", icon: "fingerprint", color: "var(--oxblood-500)", date: "31 mars 2026", size: "9 p." },
    { fr: "Mortalité par espèce", en: "Mortality by species", icon: "activity", color: "var(--oxblood-700)", date: "20 mai 2026", size: "6 p." },
    { fr: "Bilan financier mensuel", en: "Monthly financial report", icon: "coins", color: "var(--money-500)", date: "1ᵉʳ mai 2026", size: "14 p." },
    { fr: "Consommation alimentaire", en: "Feed consumption", icon: "wheat", color: "var(--autorite-700)", date: "25 mai 2026", size: "8 p." },
    { fr: "Inventaire médicaments", en: "Medicine inventory", icon: "pill", color: "var(--health-500)", date: "20 mai 2026", size: "11 p." },
    { fr: "Traçabilité MAPAQ", en: "MAPAQ traceability", icon: "shield", color: "var(--ink-700)", date: "Trimestriel", size: "—" },
  ];
  // Rapports générés en direct : lisent les données réelles et finissent par une
  // explication en langage naturel à l'impression. cta "pdf" = bouton PDF, sinon Imprimer.
  const liveReports = [
    // Rentabilité = PDF financier global (ne sait pas filtrer par espèce) → désactivé si une espèce est sélectionnée.
    { fr: "Rentabilité", en: "Profitability", descFr: "Revenus, dépenses, profit + ventes/dépenses récentes", descEn: "Revenue, expenses, profit + recent sales/expenses", icon: "coins", color: "var(--money-500)", cta: "pdf", disabled: !!speciesFilter, disabledHint: lang === "fr" ? "Rapport global ferme — retirer le filtre espèce" : "Farm-wide report — clear the species filter", action: () => api.downloadFinancePdf().catch((e) => console.warn(e.message)) },
    { fr: "Effectif par bâtiment", en: "Headcount by building", descFr: "Total et catégories (adultes, cochettes, engraissement, jeunes) par bâtiment", descEn: "Total and categories per building", icon: "layers", color: "var(--forest-700)", needsData: true, action: () => printHeadcountReport(hcData.buildings, fAnimals, lang, speciesLabel) },
    { fr: "Structure du cheptel ♂/♀", en: "Herd structure ♂/♀", descFr: "Mâles / femelles par catégorie et par bâtiment, + ratio ♂:♀", descEn: "Males / females per category and building, + ♂:♀ ratio", icon: "fingerprint", color: "var(--pertinence-500)", needsData: true, action: () => printSexStructureReport(hcData.buildings, fAnimals, lang, speciesLabel) },
    { fr: "Ratio reproducteur M:F", en: "Breeding ratio M:F", descFr: "Mâles / femelles et ratio M:F par bâtiment, avec guide de lecture", descEn: "Males / females and M:F ratio per building, with reading guide", icon: "activity", color: "var(--oxblood-500)", needsData: true, action: () => printBreedingRatioReport(hcData.buildings, fAnimals, lang, speciesLabel) },
    { fr: "Prévision (6 mois)", en: "Forecast (6 months)", descFr: "Trésorerie et cheptel projetés sur 6 mois, avec fourchette et explication", descEn: "Cash flow and livestock projected over 6 months, with range and explanation", icon: "pulse", color: "var(--pertinence-500)", action: () => printForecastReport(lang, 6, speciesFilter) },
    { fr: "Mortalité (animaux décédés)", en: "Mortality (deceased animals)", descFr: "Décès enregistrés : date, espèce, cause présumée/confirmée, lieu, perte estimée, notes", descEn: "Recorded deaths: date, species, presumed/confirmed cause, location, estimated loss, notes", icon: "activity", color: "var(--oxblood-700)", needsData: true, action: () => printMortalityReport(fMortality, lang, moneyUnit, speciesLabel) },
  ];
  // Exports CSV (COMP-P1-007) — données réelles, filtrées par l'espèce sélectionnée.
  const today = new Date().toISOString().slice(0, 10);
  const speciesName = (id) => { const s = speciesById(id); return s ? (lang === "fr" ? s.frSing || s.fr : s.enSing || s.en) : (id || ""); };
  const exportInventoryCsv = () => {
    const headers = lang === "fr"
      ? ["Nom", "ID", "Espèce", "Race", "Sexe", "Date de naissance", "Poids", "Statut", "Lot", "Bâtiment", "Effectif"]
      : ["Name", "ID", "Species", "Breed", "Sex", "Date of birth", "Weight", "Status", "Batch", "Barn", "Count"];
    const rows = fAnimals.map((a) => [
      a.name || "", a.externalId || a.id || "", speciesName(a.species), a.race || "", a.sex || "",
      a.dateOfBirth || a.dob || "", a.weight != null ? `${a.weight} ${a.weightUnit || "kg"}` : "",
      a.status || "", a.lot || "", a.barn || "", a.count ?? "",
    ]);
    downloadReportCsv(`farmos-inventaire-${speciesFilter || "tous"}-${today}.csv`, [headers, ...rows]);
  };
  const exportMortalityCsv = () => {
    const headers = lang === "fr"
      ? ["Date", "Espèce", "Cause", "Lieu", "Nombre", "Perte estimée", "Notes"]
      : ["Date", "Species", "Cause", "Location", "Count", "Estimated loss", "Notes"];
    const rows = fMortality.map((m) => [
      (m.eventDate || m.date || "").slice(0, 10), speciesName(m.species),
      m.cause || m.confirmedCause || m.presumedCause || "", m.location || m.barn || "",
      m.count ?? 1, m.estimatedLoss ?? m.estimated_loss ?? "", m.notes || "",
    ]);
    downloadReportCsv(`farmos-mortalite-${speciesFilter || "tous"}-${today}.csv`, [headers, ...rows]);
  };
  const csvExports = [
    { fr: "Inventaire animaux (CSV)", en: "Animal inventory (CSV)", descFr: `${fAnimals.length} animal(aux)`, descEn: `${fAnimals.length} animal(s)`, action: exportInventoryCsv, disabled: fAnimals.length === 0 },
    { fr: "Mortalité (CSV)", en: "Mortality (CSV)", descFr: `${fMortality.length} décès`, descEn: `${fMortality.length} death(s)`, action: exportMortalityCsv, disabled: fMortality.length === 0 },
  ];
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Rapports · Reports" : "Reports · Rapports"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Rapports & analytics, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesLabel ? speciesLabel.toLowerCase() : "bibliothèque"}</span></>
            : <>Reports & analytics, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{speciesLabel ? speciesLabel.toLowerCase() : "library"}</span></>}
        </h1>
      </div>
      {/* Filtre espèce : restreint les rapports générés en direct à une espèce. */}
      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} animals={hcData.animals} enabledSpecies={enabledSpecies} compact/>
      {/* Rapports générés en direct — chacun lit les données réelles et se
          termine, à l'impression, par une explication en langage naturel. */}
      <div>
        <div className="overline" style={{ marginBottom: 8, color: "var(--clay-700)" }}>
          {lang === "fr" ? "Générés en direct · données réelles" : "Live generated · real data"}
          {speciesLabel ? <span style={{ color: "var(--fg-3)" }}> · {speciesLabel}</span> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
          {liveReports.map((r, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in oklch, ${r.color} 12%, transparent)`, color: r.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Icon name={r.icon} size={18} color="currentColor"/>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-950)", fontWeight: 500, lineHeight: 1.25 }}>{lang === "fr" ? r.fr : r.en}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, flex: 1 }}>{lang === "fr" ? r.descFr : r.descEn}</div>
              {r.disabled ? <div style={{ fontSize: 10.5, color: "var(--oxblood-500)", marginTop: 6 }}>{r.disabledHint}</div> : null}
              <button className="btn btn-primary btn-sm" disabled={r.disabled || (r.needsData && hcData.loading)} title={r.disabled ? r.disabledHint : undefined} style={{ marginTop: r.disabled ? 6 : 12, justifyContent: "center" }} onClick={r.action}>
                <Icon name={r.cta === "pdf" ? "download" : "report"} size={12} color="#FBF8F2"/>{r.cta === "pdf" ? "PDF" : (lang === "fr" ? "Imprimer" : "Print")}
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Exports CSV — données réelles exploitables (tableur), filtrées par espèce. */}
      <div>
        <div className="overline" style={{ marginBottom: 8, color: "var(--clay-700)" }}>
          {lang === "fr" ? "Exports CSV · données réelles" : "CSV exports · real data"}
          {speciesLabel ? <span style={{ color: "var(--fg-3)" }}> · {speciesLabel}</span> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
          {csvExports.map((r, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "color-mix(in oklch, var(--forest-700) 12%, transparent)", color: "var(--forest-700)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Icon name="download" size={18} color="currentColor"/>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-950)", fontWeight: 500, lineHeight: 1.25 }}>{lang === "fr" ? r.fr : r.en}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, flex: 1 }}>{lang === "fr" ? r.descFr : r.descEn}</div>
              <button className="btn btn-sm" disabled={r.disabled || hcData.loading} style={{ marginTop: 12, justifyContent: "center" }} onClick={r.action}>
                <Icon name="download" size={12} color="var(--ink-700)"/>CSV
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="overline" style={{ marginTop: 4, color: "var(--fg-3)" }}>{lang === "fr" ? "Bibliothèque · archives" : "Library · archives"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-4)", gap: 12 }}>
        {reports.map((r, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in oklch, ${r.color} 12%, transparent)`, color: r.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Icon name={r.icon} size={18} color="currentColor"/>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16,  color: "var(--ink-950)", fontWeight: 500, lineHeight: 1.25 }}>{lang === "fr" ? r.fr : r.en}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>{r.date} · {r.size}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}><Icon name="download" size={11} color="var(--ink-700)"/>PDF</button>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}><Icon name="download" size={11} color="var(--ink-700)"/>Excel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── EMPLOYEES (équipe FarmOS depuis RH du CRM) ──────────────────────────
const FARM_DESIGNATIONS = [
  "Gérant ferme", "Vétérinaire", "Technicien agricole", "Éleveur",
  "Ouvrier agricole", "Trayeur", "Berger", "Aviculteur", "Apiculteur",
  "Inséminateur", "Maréchal-ferrant", "Mécanicien agricole", "Conducteur d'engins",
  "Responsable nutrition", "Responsable reproduction", "Comptable ferme", "Stagiaire",
];

function FarmosStaffModal({ lang, onClose, onSaved }) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [generated, setGenerated] = React.useState(null);
  const handleSave = async () => {
    if (!email.trim() || !designation.trim()) {
      setError(lang === "fr" ? "Email et poste requis." : "Email and role required.");
      return;
    }
    if (password && password.length < 12) {
      setError(lang === "fr" ? "Le mot de passe doit avoir au moins 12 caractères." : "Password must have at least 12 characters.");
      return;
    }
    setSaving(true); setError("");
    try {
      const res = await api.createFarmosStaff({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        designation: designation.trim(),
        password: password || undefined,
      });
      if (res?.generatedPassword) {
        setGenerated(res.generatedPassword);
      } else {
        onSaved();
      }
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 520, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>
          {lang === "fr" ? "Nouvel employé" : "New employee"}
        </h3>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>
          {lang === "fr" ? "Sera créé dans le RH du CRM et visible côté FarmOS." : "Will be created in CRM HR and visible in FarmOS."}
        </div>
        {generated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 12, background: "var(--health-100)", borderRadius: 8, fontSize: 13 }}>
              {lang === "fr" ? "Employé créé. Mot de passe temporaire (à transmettre une fois) :" : "Employee created. Temporary password (share once):"}
              <div className="mono" style={{ fontSize: 16, fontWeight: 600, marginTop: 8, padding: "8px 12px", background: "var(--paper)", borderRadius: 6, userSelect: "all" }}>{generated}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={onSaved}>{lang === "fr" ? "Terminé" : "Done"}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Prénom" : "First name"}
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
              </label>
              <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Nom" : "Last name"}
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
              </label>
            </div>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Email *" : "Email *"}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Téléphone" : "Phone"}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Poste *" : "Role *"}
              <input list="farm-designations" value={designation} onChange={(e) => setDesignation(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}
                placeholder={lang === "fr" ? "ex. Gérant ferme, Trayeur, Berger…" : "e.g. Farm manager, Milker…"}/>
              <datalist id="farm-designations">
                {FARM_DESIGNATIONS.map((d) => <option key={d} value={d}/>)}
              </datalist>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Mot de passe (optionnel)" : "Password (optional)"}
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}
                placeholder={lang === "fr" ? "Laisser vide pour génération auto (min 12 car.)" : "Leave blank to auto-generate (min 12 chars)"}/>
            </label>
            {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" onClick={onClose} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "…" : (lang === "fr" ? "Créer" : "Create")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EmployeesScreen = ({ lang }) => {
  const [staff, setStaff] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editStaff, setEditStaff] = React.useState(null);

  const refresh = useDataRefresh(["staff"]);
  const reload = React.useCallback(() => {
    setLoading(true);
    api.listFarmosStaff().then((rows) => { setStaff(Array.isArray(rows) ? rows : []); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { reload(); }, [reload, refresh]);

  const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`;
  const initials = (u) => fullName(u).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const onLeave = (u) => u.leaveDate && new Date(u.leaveDate) <= new Date();

  const roles = Array.from(new Set(staff.map((u) => u.designation).filter(Boolean))).sort();
  const q = search.trim().toLowerCase();
  const filtered = staff.filter((u) => {
    if (roleFilter && u.designation !== roleFilter) return false;
    if (!q) return true;
    return fullName(u).toLowerCase().includes(q)
      || (u.designation || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q);
  });

  const ROLE_COLOR = {
    "Vétérinaire": "var(--solidite-500)",
    "Gérant ferme": "var(--clay-700)",
    "Technicien agricole": "var(--pertinence-500)",
    "Éleveur": "var(--oxblood-500)",
  };
  const colorFor = (role) => ROLE_COLOR[role] || "var(--ink-700)";

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Équipe · Team" : "Team · Équipe"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em" }}>
            {lang === "fr"
              ? <>Employés ferme, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>synchronisés avec le RH du CRM</span></>
              : <>Farm staff, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>synced with CRM HR</span></>}
          </h1>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}
           style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} color="#FBF8F2"/>
          {lang === "fr" ? "Ajouter un employé" : "Add employee"}
        </button>
      </div>
      {addOpen && (
        <FarmosStaffModal lang={lang} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); reload(); }}/>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "1 1 240px", maxWidth: 320 }}
          placeholder={lang === "fr" ? "Rechercher un nom, rôle, email…" : "Search name, role, email…"}
          value={search} onChange={(e) => setSearch(e.target.value)}/>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => setRoleFilter("")}
            style={!roleFilter ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
            {lang === "fr" ? "Tous" : "All"} ({staff.length})
          </button>
          {roles.map((r) => (
            <button key={r} className="btn btn-sm" onClick={() => setRoleFilter(r === roleFilter ? "" : r)}
              style={roleFilter === r ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>}
      {err && <div style={{ color: "var(--rust-700)", fontSize: 13 }}>{err}</div>}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="users"
          title={lang === "fr" ? "Aucun employé ferme" : "No farm staff"}
          hint={lang === "fr"
            ? "Crée un département nommé \"FarmOS\" dans le CRM, puis assigne tes employés à ce département."
            : "Create a department named \"FarmOS\" in the CRM, then assign employees to that department."}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-3)", gap: 12 }}>
        {filtered.map((u) => {
          const color = colorFor(u.designation);
          const leave = onLeave(u);
          return (
            <button key={u.id} className="card" onClick={() => setEditStaff(u)}
              style={{ display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", border: "1px solid var(--border-1)", background: "var(--paper)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: color, color: "var(--parchment-50)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, flexShrink: 0 }}>
                {initials(u)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{fullName(u)}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{u.designation || (lang === "fr" ? "(sans rôle)" : "(no role)")}</div>
                {(u.email || u.phone) && (
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {u.email && <span>📧 {u.email}</span>}
                    {u.phone && <span>📞 {u.phone}</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span className="tag" style={{ background: leave ? "var(--bg-sunken)" : "var(--solidite-50)", color: leave ? "var(--ink-700)" : "var(--solidite-900)" }}>
                    {leave ? (lang === "fr" ? "Inactif" : "Inactive") : (lang === "fr" ? "Actif" : "Active")}
                  </span>
                  {u.department && <span className="tag">{u.department}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {editStaff && (
        <StaffEditModal lang={lang} staff={editStaff}
          onClose={() => setEditStaff(null)}
          onSaved={() => { setEditStaff(null); reload(); }}/>
      )}
    </div>
  );
};

// Modal voir / modifier un employé + changer son statut (actif / parti / démissionné).
function StaffEditModal({ lang, staff, onClose, onSaved }) {
  const [firstName, setFirstName] = React.useState(staff.firstName || "");
  const [lastName, setLastName] = React.useState(staff.lastName || "");
  const [phone, setPhone] = React.useState(staff.phone || "");
  const [designation, setDesignation] = React.useState(staff.designation || "");
  const [roleId, setRoleId] = React.useState(staff.roleId != null ? String(staff.roleId) : "");
  const [assignableRoles, setAssignableRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    api.listAssignableRoles().then((r) => setAssignableRoles(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  const lbl = { fontSize: 12, color: "var(--fg-2)" };
  const inputStyle = { width: "100%", marginTop: 4 };
  const isActive = !staff.leaveDate || new Date(staff.leaveDate) > new Date();

  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.updateFarmosStaff(staff.id, {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        designation: designation.trim() || null,
        role_id: roleId ? Number(roleId) : null,
      });
      onSaved();
    } catch (e) { setError(e.message || "Erreur"); setSaving(false); }
  };
  const setStatus = async (status) => {
    const labels = { active: lang === "fr" ? "réactiver" : "reactivate", left: lang === "fr" ? "marquer comme parti" : "mark as left", resigned: lang === "fr" ? "marquer comme démissionné" : "mark as resigned" };
    if (!window.confirm(`${lang === "fr" ? "Confirmer :" : "Confirm:"} ${labels[status]} ${[firstName, lastName].filter(Boolean).join(" ")} ?`)) return;
    setStatusBusy(true); setError("");
    try {
      const body = { status };
      if (status !== "active") {
        const reason = window.prompt(lang === "fr" ? "Motif (optionnel) :" : "Reason (optional):", status === "resigned" ? (lang === "fr" ? "Démission" : "Resignation") : (lang === "fr" ? "Départ" : "Departure"));
        if (reason != null) body.leave_reason = reason;
      }
      await api.setFarmosStaffStatus(staff.id, body);
      onSaved();
    } catch (e) { setError(e.message || "Erreur"); setStatusBusy(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 480, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>{lang === "fr" ? "Employé" : "Employee"}</h3>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>{staff.email || `#${staff.id}`} · {staff.department || "—"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lbl}>{lang === "fr" ? "Prénom" : "First name"}
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" style={inputStyle}/>
            </label>
            <label style={lbl}>{lang === "fr" ? "Nom" : "Last name"}
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" style={inputStyle}/>
            </label>
          </div>
          <label style={lbl}>{lang === "fr" ? "Téléphone" : "Phone"}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" style={inputStyle}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Désignation (métier)" : "Designation (job)"}
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="input" style={inputStyle} placeholder={lang === "fr" ? "Vétérinaire, Éleveur…" : "Vet, Breeder…"}/>
          </label>
          <label style={lbl}>{lang === "fr" ? "Rôle & permissions" : "Role & permissions"}
            <Autocomplete
              value={roleId || ""}
              onChange={(v) => setRoleId(v)}
              placeholder={lang === "fr" ? "— Aucun rôle —" : "— No role —"}
              options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))}
            />
            <span style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{lang === "fr" ? "Détermine les permissions de l'employé (ex. Lecture Ferme, Vétérinaire, Admin Ferme)." : "Determines the employee's permissions."}</span>
          </label>

          <div style={{ borderTop: "1px dashed var(--border-1)", paddingTop: 12 }}>
            <div style={{ ...lbl, marginBottom: 8 }}>{lang === "fr" ? "Statut" : "Status"} : <strong style={{ color: isActive ? "var(--health-700)" : "var(--oxblood-700)" }}>{isActive ? (lang === "fr" ? "Actif" : "Active") : (lang === "fr" ? "Inactif" : "Inactive")}</strong>{staff.leaveDate && <span style={{ color: "var(--fg-3)" }}> · {String(staff.leaveDate).slice(0, 10)}{staff.leaveReason ? ` (${staff.leaveReason})` : ""}</span>}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {isActive ? (
                <>
                  <button className="btn btn-sm" style={{ color: "var(--clay-700)", borderColor: "var(--clay-700)" }} onClick={() => setStatus("left")} disabled={statusBusy}>{lang === "fr" ? "Parti" : "Left"}</button>
                  <button className="btn btn-sm" style={{ color: "var(--oxblood-700)", borderColor: "var(--oxblood-700)" }} onClick={() => setStatus("resigned")} disabled={statusBusy}>{lang === "fr" ? "Démissionné" : "Resigned"}</button>
                </>
              ) : (
                <button className="btn btn-sm" style={{ color: "var(--health-700)", borderColor: "var(--health-700)" }} onClick={() => setStatus("active")} disabled={statusBusy}>{lang === "fr" ? "Réactiver" : "Reactivate"}</button>
              )}
            </div>
          </div>

          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn" onClick={onClose} disabled={saving || statusBusy}>{lang === "fr" ? "Fermer" : "Close"}</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || statusBusy}>{saving ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS (placeholder) ──────────────────────────────────────────────
// ─── Localisations manager (bâtiments + salles) ──────────────────────────
// Bâtiments = référentiel par espèce (scopeKey = espèce). Salles = référentiel
// par bâtiment (scopeKey = nom du bâtiment). Réutilise farmos_lookups.
const RoomManager = ({ lang, building }) => {
  const [rooms, setRooms] = React.useState([]);
  const [val, setVal] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(() => {
    api.listLookups("room", building).then((r) => setRooms(Array.isArray(r) ? r : [])).catch(() => {});
  }, [building]);
  React.useEffect(() => { load(); }, [load]);
  const add = async () => {
    const v = val.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await api.createLookup({ category: "room", scope_key: building, value_fr: v, value_en: v }); setVal(""); load(); }
    finally { setBusy(false); }
  };
  const remove = async (id) => { try { await api.deleteLookup(id); } catch {} load(); };
  return (
    <div style={{ marginTop: 8, paddingLeft: 14, borderLeft: "2px solid var(--border-1)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="overline" style={{ fontSize: 10 }}>{lang === "fr" ? "Salles" : "Rooms"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {rooms.length === 0 && <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucune salle" : "No rooms"}</span>}
        {rooms.map((r) => (
          <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-sunken)", borderRadius: 999, padding: "4px 6px 4px 10px", fontSize: 12.5 }}>
            {r.valueFr || r.value_fr}
            <button type="button" onClick={() => remove(r.id)} aria-label="delete"
              style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-500)", padding: 2, lineHeight: 1 }}>
              <Icon name="x" size={11} color="currentColor"/>
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="input" style={{ height: 32, fontSize: 12.5, maxWidth: 220 }}
          placeholder={lang === "fr" ? "Ajouter une salle…" : "Add a room…"}
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}/>
        <button type="button" className="btn btn-sm" onClick={add} disabled={busy || !val.trim()}>
          <Icon name="plus" size={12} color="currentColor"/>{lang === "fr" ? "Ajouter" : "Add"}
        </button>
      </div>
    </div>
  );
};

const LocationsManager = ({ lang, enabledSpecies }) => {
  const list = (enabledSpecies && enabledSpecies.length) ? SPECIES.filter((s) => enabledSpecies.includes(s.id)) : SPECIES;
  const [species, setSpecies] = React.useState(list[0]?.id || SPECIES[0].id);
  const [buildings, setBuildings] = React.useState([]);
  const [val, setVal] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [openId, setOpenId] = React.useState(null);
  const load = React.useCallback(() => {
    api.listLookups("building", species).then((r) => setBuildings(Array.isArray(r) ? r : [])).catch(() => {});
  }, [species]);
  React.useEffect(() => { load(); }, [load]);
  const add = async () => {
    const v = val.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await api.createLookup({ category: "building", scope_key: species, value_fr: v, value_en: v }); setVal(""); load(); }
    finally { setBusy(false); }
  };
  const remove = async (id) => { try { await api.deleteLookup(id); } catch {} if (openId === id) setOpenId(null); load(); };
  return (
    <section className="card" style={{ marginTop: 20, maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="overline">{lang === "fr" ? "Bâtiments & salles" : "Buildings & rooms"}</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
          {lang === "fr"
            ? "Référentiel de localisation par espèce, proposé en autocomplétion à la création d'un animal."
            : "Per-species location reference, offered as autocomplete when creating an animal."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {list.map((s) => (
          <button key={s.id} type="button" onClick={() => { setSpecies(s.id); setOpenId(null); }}
            className={`species-pill ${species === s.id ? "active" : ""}`} style={{ height: 32, fontSize: 12 }}>
            <AnimalGlyph kind={s.glyph} size={14} color={species === s.id ? "var(--bone-50)" : "var(--forest-700)"}/>
            {lang === "fr" ? s.fr : s.en}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {buildings.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucun bâtiment pour cette espèce." : "No building for this species."}</div>
        )}
        {buildings.map((b) => {
          const name = b.valueFr || b.value_fr;
          const open = openId === b.id;
          return (
            <div key={b.id} style={{ border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="layers" size={15} color="var(--forest-700)"/>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{name}</span>
                <button type="button" className="btn btn-sm" onClick={() => setOpenId(open ? null : b.id)}>
                  <Icon name={open ? "chevDown" : "chevRight"} size={12} color="currentColor"/>
                  {lang === "fr" ? "Salles" : "Rooms"}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => remove(b.id)} title={lang === "fr" ? "Supprimer" : "Delete"}>
                  <Icon name="x" size={12} color="currentColor"/>
                </button>
              </div>
              {open && <RoomManager lang={lang} building={name}/>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border-1)", paddingTop: 14 }}>
        <input className="input" style={{ maxWidth: 280 }}
          placeholder={species === "fish" ? (lang === "fr" ? "Ajouter un bassin…" : "Add a pond…") : (lang === "fr" ? "Ajouter un bâtiment…" : "Add a building…")}
          value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}/>
        <button type="button" className="btn btn-primary" onClick={add} disabled={busy || !val.trim()}>
          <Icon name="plus" size={13} color="currentColor"/>{lang === "fr" ? "Ajouter" : "Add"}
        </button>
      </div>
    </section>
  );
};

const PRICE_PRODUCT_OPTIONS = [
  { product_type: "eggs", sale_source: "production", unit: "oeufs", fr: "Oeufs", en: "Eggs" },
  { product_type: "milk", sale_source: "production", unit: "L", fr: "Lait", en: "Milk" },
  { product_type: "fish", sale_source: "production", unit: "kg", fr: "Poisson", en: "Fish" },
  { product_type: "meat", sale_source: "production", unit: "kg", fr: "Viande", en: "Meat" },
  { product_type: "wool", sale_source: "production", unit: "kg", fr: "Laine", en: "Wool" },
  { product_type: "animal", sale_source: "animal", unit: "tete", fr: "Animal / lot", en: "Animal / batch" },
];

function SaleListingModal({ lang, animal, prices, currencyMeta, onClose, onSaved }) {
  const linkedPrice = React.useMemo(() => animal ? findLinkedAnimalListingPrice(prices, animal.id) : null, [animal, prices]);
  const defaultPrice = React.useMemo(() => {
    if (!animal) return null;
    return findAnimalListingPrice(prices, {
      animalId: animal.id,
      species: animal.species,
      productType: "animal",
      source: "animal",
      unit: "tete",
    });
  }, [animal, prices]);
  const [unit, setUnit] = React.useState((linkedPrice || defaultPrice)?.unit || (Number(animal?.count || 0) > 1 ? "tete" : "tete"));
  const [unitPrice, setUnitPrice] = React.useState((linkedPrice || defaultPrice) ? String(priceValue(linkedPrice || defaultPrice)) : "");
  const [currencyId, setCurrencyId] = React.useState(priceCurrencyId(linkedPrice || defaultPrice) ?? currencyMeta?.defaultCurrencyId ?? "");
  const [notes, setNotes] = React.useState(linkedPrice?.notes ? String(linkedPrice.notes).replace(animalListingNote(animal?.id), "").replace(/^ · /, "") : "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setCurrencyId(priceCurrencyId(linkedPrice || defaultPrice) ?? currencyMeta?.defaultCurrencyId ?? "");
  }, [linkedPrice?.id, defaultPrice?.id, currencyMeta?.defaultCurrencyId]);
  if (!animal) return null;
  const sp = speciesById(animal.species);
  const title = animal.name || animal.externalId || animal.external_id || animal.lot || `#${animal.id}`;
  const listingNote = [animalListingNote(animal.id), notes.trim()].filter(Boolean).join(" · ");
  const weightLimit = isWeightSaleUnit(unit) ? animalAvailableForUnit(animal, unit) : null;
  const unitOptions = [
    { id: "tete", fr: "Par tete", en: "Per head" },
    { id: "lot", fr: "Par lot complet", en: "Whole batch" },
    { id: "kg", fr: "Par kg", en: "Per kg" },
    { id: "unite", fr: "Par unite", en: "Per unit" },
  ];

  const save = async () => {
    const price = Number(unitPrice);
    if (!unit || !Number.isFinite(price) || price < 0) {
      setError(lang === "fr" ? "Methode et prix unitaire requis." : "Method and unit price required.");
      return;
    }
    if ((currencyMeta?.currencies || []).length && !currencyId) {
      setError(lang === "fr" ? "Devise requise." : "Currency is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        sale_source: "animal",
        species: animal.species || null,
        product_type: "animal",
        unit,
        unit_price: price,
        currency_id: currencyId ? Number(currencyId) : null,
        notes: listingNote,
      };
      const savedPrice = linkedPrice?.id ? await api.updatePrice(linkedPrice.id, payload) : await api.createPrice(payload);
      if (!isSaleLockedAnimal(animal)) {
        await api.updateAnimal(animal.id, { status: "available_sale" });
      }
      onSaved && onSaved(savedPrice);
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 520, maxWidth: "100%", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: sp?.accentBg || "var(--ink-50)", color: sp?.accent || "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {sp ? <AnimalGlyph kind={sp.glyph} size={20} color="currentColor"/> : <Icon name="cart" size={18} color="currentColor"/>}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: 0 }}>{lang === "fr" ? "Configurer la mise en vente" : "Configure listing"}</h3>
            <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Methode de vente" : "Sale method"}
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
              {unitOptions.map((o) => <option key={o.id} value={o.id}>{lang === "fr" ? o.fr : o.en}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Prix unitaire" : "Unit price"}
            <AmountCurrencyInput
              amount={unitPrice}
              onAmountChange={setUnitPrice}
              currencyId={currencyId}
              onCurrencyChange={setCurrencyId}
              currencies={currencyMeta?.currencies || []}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)", gridColumn: "1 / -1" }}>{lang === "fr" ? "Notes de vente" : "Sale notes"}
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", marginTop: 4, minHeight: 70, resize: "vertical" }}/>
          </label>
        </div>

        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "var(--bg-sunken)", fontSize: 12, color: "var(--fg-2)" }}>
          {isWeightSaleUnit(unit)
            ? (lang === "fr"
              ? `Vente au poids: maximum vendable ${formatSaleQuantity(weightLimit || 0)} ${unit}.`
              : `Weight sale: maximum sellable ${formatSaleQuantity(weightLimit || 0)} ${unit}.`)
            : (lang === "fr"
              ? "Cette configuration sera utilisee automatiquement par la caisse POS pour cet animal ou ce lot."
              : "This configuration will be used automatically by the POS register for this animal or batch.")}
        </div>
        {error && <div style={{ color: "var(--rust-700)", fontSize: 12, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !unit || !unitPrice}>
            <Icon name="check" size={13} color="currentColor"/>
            {saving ? "..." : (lang === "fr" ? "Mettre en vente" : "List for sale")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SaleInventorySettings({ lang, speciesFilter }) {
  const [animals, setAnimals] = React.useState([]);
  const [logs, setLogs] = React.useState([]);
  const [sales, setSales] = React.useState([]);
  const [prices, setPrices] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [availableLimit, setAvailableLimit] = React.useState(24);
  const [candidateLimit, setCandidateLimit] = React.useState(24);
  const [listingAnimal, setListingAnimal] = React.useState(null);
  const [unlistingId, setUnlistingId] = React.useState(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const refresh = useDataRefresh(["animals", "productionLogs", "sales", "priceList"]);
  const currencyMeta = useCurrencyCatalog();

  React.useEffect(() => {
    let cancel = false;
    Promise.all([api.listAnimals(), api.listProductionLogs(), api.listSales(), api.listPrices()])
      .then(([a, p, s, pr]) => {
        if (cancel) return;
        setAnimals(Array.isArray(a) ? a : []);
        setLogs(Array.isArray(p) ? p : []);
        setSales(Array.isArray(s) ? s : []);
        setPrices(Array.isArray(pr) ? pr : []);
      })
      .catch((e) => console.warn("Sale management load failed:", e.message));
    return () => { cancel = true; };
  }, [reloadKey, refresh]);

  React.useEffect(() => {
    setAvailableLimit(24);
    setCandidateLimit(24);
  }, [query, sourceFilter, speciesFilter]);

  React.useEffect(() => {
    const reload = () => setReloadKey((k) => k + 1);
    window.addEventListener("farmos:sale-created", reload);
    window.addEventListener("farmos:animal-created", reload);
    window.addEventListener("farmos:production-created", reload);
    return () => {
      window.removeEventListener("farmos:sale-created", reload);
      window.removeEventListener("farmos:animal-created", reload);
      window.removeEventListener("farmos:production-created", reload);
    };
  }, []);

  const allItems = buildSaleItems({ animals, logs, sales, prices, speciesFilter, lang });
  const availableRowsAll = allItems.filter((item) => {
    if (sourceFilter === "animal") return item.source === "animal";
    if (sourceFilter === "production") return item.source !== "animal";
    return true;
  }).filter((item) => matchesSaleQuery(item, query));
  const visibleAvailableRows = availableRowsAll.slice(0, availableLimit);

  const candidates = animals.filter((a) => {
    if (isSaleLockedAnimal(a)) return false;
    if (speciesFilter && a.species !== speciesFilter) return false;
    if (!query.trim()) return true;
    return [a.name, a.externalId, a.external_id, a.lot, a.species, a.status, a.race, a.barn].filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase());
  });
  const visibleCandidates = candidates.slice(0, candidateLimit);

  const handleListingSaved = (savedPrice) => {
    if (listingAnimal?.id) {
      setAnimals((prev) => prev.map((a) => (a.id === listingAnimal.id ? { ...a, status: "available_sale" } : a)));
    }
    if (savedPrice?.id) {
      setPrices((prev) => [savedPrice, ...prev.filter((p) => p.id !== savedPrice.id)]);
    }
    setListingAnimal(null);
    window.dispatchEvent(new CustomEvent("farmos:animal-created"));
    setReloadKey((k) => k + 1);
  };

  const handleListingRemoved = async (item) => {
    if (!item?.animalId) return;
    const ok = window.confirm(lang === "fr"
      ? "Retirer cet animal de la vente ? Cette action est possible seulement si aucune vente n'a été enregistrée."
      : "Remove this animal from sale? This is only possible if no sale has been recorded.");
    if (!ok) return;
    setUnlistingId(item.animalId);
    try {
      const res = await api.unlistAnimalFromSale(item.animalId);
      const marker = animalListingNote(item.animalId);
      const isLinkedListing = (price) => {
        const notes = String(price.notes || "");
        const saleSource = price.saleSource || price.sale_source || "production";
        const productType = price.productType || price.product_type;
        return saleSource === "animal" && productType === "animal" && (notes === marker || notes.startsWith(`${marker} `));
      };
      setAnimals((prev) => prev.map((a) => (a.id === item.animalId ? { ...a, status: res?.animal?.status || "healthy" } : a)));
      setPrices((prev) => prev.filter((p) => !isLinkedListing(p)));
      window.dispatchEvent(new CustomEvent("farmos:animal-created"));
      setReloadKey((k) => k + 1);
    } catch (e) {
      window.alert(e.message || (lang === "fr" ? "Retrait impossible." : "Unable to remove listing."));
    } finally {
      setUnlistingId(null);
    }
  };

  const sourceOptions = [
    { id: "all", fr: "Tous", en: "All" },
    { id: "production", fr: "Productions", en: "Production" },
    { id: "animal", fr: "Animaux", en: "Animals" },
  ];

  const renderManagedItem = (item) => {
    const sp = speciesById(item.species);
    return (
      <div key={item.id} style={{ border: "1px solid var(--border-1)", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: sp?.accentBg || "var(--ink-50)", color: sp?.accent || "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {sp ? <AnimalGlyph kind={sp.glyph} size={19} color="currentColor"/> : <Icon name="cart" size={16} color="currentColor"/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-950)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle || item.speciesLabel || ""}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
            <span className="tag">{item.source === "animal" ? (lang === "fr" ? "Animal" : "Animal") : saleProductLabel(item.productType, lang)}</span>
            <span className="tag">{Number(item.available || 0).toLocaleString("fr-CA")} {item.unit}</span>
            {item.unitPrice !== "" && <span className="tag">{formatMoney(item.unitPrice, item.currencyId || currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2)}/{item.unit}</span>}
          </div>
        </div>
        {item.source === "animal" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-sm" onClick={() => {
              const animal = animals.find((a) => a.id === item.animalId);
              if (animal) setListingAnimal(animal);
            }}>
              <Icon name="edit" size={12} color="currentColor"/>
              {lang === "fr" ? "Modifier prix" : "Edit price"}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => handleListingRemoved(item)}
              disabled={unlistingId === item.animalId}
              style={{ color: "var(--oxblood-700)" }}
            >
              <Icon name="x" size={12} color="currentColor"/>
              {unlistingId === item.animalId ? "..." : (lang === "fr" ? "Retirer" : "Remove")}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="card" style={{ marginTop: 20, maxWidth: 1100, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="overline">{lang === "fr" ? "Gestion de vente" : "Sales management"}</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
          {lang === "fr" ? "Prepare les produits vendables et retrouve les lots par recherche." : "Prepare sellable products and find batches by search."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "fr" ? "Rechercher animal, lot, espece, produit..." : "Search animal, batch, species, product..."}
          style={{ width: 360, maxWidth: "100%" }}/>
        {sourceOptions.map((option) => (
          <button key={option.id} className={`btn btn-sm ${sourceFilter === option.id ? "btn-primary" : ""}`} onClick={() => setSourceFilter(option.id)}>
            {lang === "fr" ? option.fr : option.en}
          </button>
        ))}
        {query && <button className="btn btn-sm" onClick={() => setQuery("")}>{lang === "fr" ? "Effacer" : "Clear"}</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-2)", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Au POS maintenant" : "Currently in POS"}</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{availableRowsAll.length}</span>
          </div>
          {availableRowsAll.length === 0 ? (
            <EmptyState icon="cart" title={lang === "fr" ? "Rien a vendre" : "Nothing to sell"} hint={lang === "fr" ? "Marque un animal a vendre, ou enregistre une recolte dans l'onglet Production (oeufs, lait...)." : "Mark an animal for sale, or record a harvest in the Production tab (eggs, milk...)."}/>
          ) : visibleAvailableRows.map(renderManagedItem)}
          {availableRowsAll.length > visibleAvailableRows.length && (
            <button className="btn" onClick={() => setAvailableLimit((n) => n + 24)}>
              {lang === "fr" ? `Afficher plus (${availableRowsAll.length - visibleAvailableRows.length})` : `Show more (${availableRowsAll.length - visibleAvailableRows.length})`}
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18 }}>{lang === "fr" ? "Marquer a vendre" : "Mark for sale"}</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{candidates.length}</span>
          </div>
          {candidates.length === 0 ? (
            <EmptyState icon="layers" title={lang === "fr" ? "Aucun animal a preparer" : "No animal to prepare"} hint={lang === "fr" ? "Les animaux deja vendus ou deja a vendre sont exclus." : "Already sold or for-sale animals are hidden."}/>
          ) : visibleCandidates.map((a) => {
            const sp = speciesById(a.species);
            const title = a.name || a.externalId || a.external_id || a.lot || `#${a.id}`;
            return (
              <div key={a.id} style={{ border: "1px solid var(--border-1)", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: sp?.accentBg || "var(--ink-50)", color: sp?.accent || "var(--ink-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {sp && <AnimalGlyph kind={sp.glyph} size={19} color="currentColor"/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-950)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[a.lot, a.race, a.status].filter(Boolean).join(" - ")}</div>
                </div>
                <button className="btn btn-sm" onClick={() => setListingAnimal(a)}>
                  <Icon name="plus" size={12} color="currentColor"/>
                  {lang === "fr" ? "Configurer" : "Configure"}
                </button>
              </div>
            );
          })}
          {candidates.length > visibleCandidates.length && (
            <button className="btn" onClick={() => setCandidateLimit((n) => n + 24)}>
              {lang === "fr" ? `Afficher plus (${candidates.length - visibleCandidates.length})` : `Show more (${candidates.length - visibleCandidates.length})`}
            </button>
          )}
        </div>
      </div>
      {listingAnimal && (
        <SaleListingModal
          lang={lang}
          animal={listingAnimal}
          prices={prices}
          currencyMeta={currencyMeta}
          onClose={() => setListingAnimal(null)}
          onSaved={handleListingSaved}
        />
      )}
    </section>
  );
}

function PriceListSettings({ lang }) {
  const currencyMeta = useCurrencyCatalog();
  const empty = React.useMemo(() => ({ id: null, sale_source: "production", species: "", product_type: "eggs", unit: "oeufs", unit_price: "", currency_id: currencyMeta.defaultCurrencyId || "", notes: "" }), [currencyMeta.defaultCurrencyId]);
  const [prices, setPrices] = React.useState([]);
  const [form, setForm] = React.useState(empty);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState(null);
  const load = React.useCallback(() => {
    api.listPrices().then((rows) => setPrices(Array.isArray(rows) ? rows : [])).catch((e) => setMessage({ type: "err", text: e.message }));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    setForm((prev) => prev.currency_id || !currencyMeta.defaultCurrencyId ? prev : { ...prev, currency_id: currencyMeta.defaultCurrencyId });
  }, [currencyMeta.defaultCurrencyId]);
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const chooseProduct = (productType) => {
    const opt = PRICE_PRODUCT_OPTIONS.find((o) => o.product_type === productType) || PRICE_PRODUCT_OPTIONS[0];
    setForm((prev) => ({ ...prev, product_type: opt.product_type, sale_source: opt.sale_source, unit: opt.unit }));
  };
  const save = async () => {
    const price = Number(form.unit_price);
    if (!form.product_type || !Number.isFinite(price) || price < 0) {
      setMessage({ type: "err", text: lang === "fr" ? "Produit et prix requis." : "Product and price required." });
      return;
    }
    if (currencyMeta.currencies.length && !form.currency_id) {
      setMessage({ type: "err", text: lang === "fr" ? "Devise requise." : "Currency is required." });
      return;
    }
    setSaving(true); setMessage(null);
    const payload = {
      sale_source: form.sale_source || "production",
      species: form.species || null,
      product_type: form.product_type,
      unit: form.unit || null,
      unit_price: price,
      currency_id: form.currency_id ? Number(form.currency_id) : null,
      notes: form.notes || null,
    };
    try {
      if (form.id) await api.updatePrice(form.id, payload);
      else await api.createPrice(payload);
      setForm(empty);
      load();
      setMessage({ type: "ok", text: lang === "fr" ? "Prix enregistre." : "Price saved." });
    } catch (e) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };
  const edit = (row) => setForm({
    id: row.id,
    sale_source: row.saleSource || row.sale_source || "production",
    species: row.species || "",
    product_type: row.productType || row.product_type || "eggs",
    unit: row.unit || "",
    unit_price: String(row.unitPrice ?? row.unit_price ?? ""),
    currency_id: row.currencyId ?? row.currency_id ?? currencyMeta.defaultCurrencyId ?? "",
    notes: row.notes || "",
  });
  const remove = async (row) => {
    if (!window.confirm(lang === "fr" ? "Supprimer ce prix ?" : "Delete this price?")) return;
    await api.deletePrice(row.id);
    load();
  };

  return (
    <section className="card" style={{ marginTop: 20, maxWidth: 980, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div className="overline">{lang === "fr" ? "Prix de vente POS" : "POS sale prices"}</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
          {lang === "fr" ? "Configuration des prix utilises automatiquement par la caisse." : "Price configuration used automatically by the register."}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr .75fr 1.2fr auto", gap: 8, alignItems: "end" }}>
        <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Produit" : "Product"}
          <select className="input" value={form.product_type} onChange={(e) => chooseProduct(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
            {PRICE_PRODUCT_OPTIONS.map((o) => <option key={o.product_type} value={o.product_type}>{lang === "fr" ? o.fr : o.en}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Espece" : "Species"}
          <select className="input" value={form.species} onChange={(e) => set("species", e.target.value)} style={{ width: "100%", marginTop: 4 }}>
            <option value="">{lang === "fr" ? "Generique" : "Generic"}</option>
            {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Unite" : "Unit"}
          <input className="input" value={form.unit} onChange={(e) => set("unit", e.target.value)} style={{ width: "100%", marginTop: 4 }}/>
        </label>
        <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Prix" : "Price"}
          <AmountCurrencyInput
            amount={form.unit_price}
            onAmountChange={(value) => set("unit_price", value)}
            currencyId={form.currency_id}
            onCurrencyChange={(value) => set("currency_id", value)}
            currencies={currencyMeta.currencies}
          />
        </label>
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          <Icon name="check" size={13} color="currentColor"/>
          {form.id ? (lang === "fr" ? "Modifier" : "Update") : (lang === "fr" ? "Ajouter" : "Add")}
        </button>
      </div>
      {form.product_type === "eggs" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Conditionnement :" : "Packaging:"}</span>
          {[
            { unit: "oeufs", label: lang === "fr" ? "À l'unité" : "Per egg" },
            { unit: "Plateau 12", label: "Plateau 12" },
            { unit: "Plateau 30", label: "Plateau 30" },
          ].map((p) => (
            <button key={p.unit} type="button" className="btn btn-sm"
              onClick={() => set("unit", p.unit)}
              style={form.unit === p.unit ? { borderColor: "var(--forest-600)", background: "var(--forest-50)" } : undefined}>
              {p.label}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
            {lang === "fr" ? "→ le prix « Plateau » s'applique à la caisse." : "→ the \"Tray\" price applies at the register."}
          </span>
        </div>
      )}
      {message && <div style={{ fontSize: 12, color: message.type === "err" ? "var(--rust-700)" : "var(--solidite-700)" }}>{message.text}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        {prices.map((row) => {
          const product = row.productType || row.product_type;
          const sp = row.species ? speciesById(row.species) : null;
          return (
            <div key={row.id} style={{ border: "1px solid var(--border-1)", borderRadius: 8, padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)" }}>{saleProductLabel(product, lang)}{sp ? ` - ${lang === "fr" ? sp.fr : sp.en}` : ""}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{formatMoney(row.unitPrice ?? row.unit_price ?? 0, row.currencyId ?? row.currency_id ?? currencyMeta.defaultCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2)} / {row.unit || "-"}</div>
              </div>
              <button className="btn btn-sm" onClick={() => edit(row)}><Icon name="edit" size={12} color="currentColor"/></button>
              <button className="btn btn-sm btn-ghost" onClick={() => remove(row)}><Icon name="trash" size={12} color="var(--oxblood-700)"/></button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const SalesManagementScreen = ({ lang, speciesFilter }) => (
  <div style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%" }}>
    <div>
      <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Gestion de vente" : "Sales management"}</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em" }}>
        {lang === "fr" ? <>Gestion de vente, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>produits et prix</span></> : <>Sales management, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>products and prices</span></>}
      </h1>
    </div>
    <SaleInventorySettings lang={lang} speciesFilter={speciesFilter}/>
    <PriceListSettings lang={lang}/>
  </div>
);

const SettingsScreen = ({ lang, enabledSpecies, onEnabledSpeciesChange, speciesFilter, onSpeciesFilter, tweaks, setTweak }) => {
  const [selected, setSelected] = React.useState(enabledSpecies && enabledSpecies.length ? enabledSpecies : SPECIES.map((s) => s.id));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  React.useEffect(() => {
    if (enabledSpecies && enabledSpecies.length) setSelected(enabledSpecies);
  }, [enabledSpecies]);

  const toggle = (id) => {
    setMessage(null);
    setSelected((prev) => {
      const has = prev.includes(id);
      if (has && prev.length === 1) return prev;
      return has ? prev.filter((x) => x !== id) : [...prev, id];
    });
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateSpeciesSettings(selected);
      const next = Array.isArray(res?.enabled_species) && res.enabled_species.length ? res.enabled_species : selected;
      onEnabledSpeciesChange && onEnabledSpeciesChange(next);
      if (speciesFilter && !next.includes(speciesFilter)) onSpeciesFilter && onSpeciesFilter(null);
      window.dispatchEvent(new CustomEvent("farmos:settings-updated"));
      setMessage({ type: "ok", text: lang === "fr" ? "Especes actives enregistrees." : "Enabled species saved." });
    } catch (err) {
      setMessage({ type: "err", text: (lang === "fr" ? "Echec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  const allSelected = selected.length === SPECIES.length;

  return (
    <div style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Parametres - Settings" : "Settings"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em" }}>
          {lang === "fr" ? <>Parametres, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>especes et ventes</span></> : <>Settings, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>species and sales</span></>}
        </h1>
      </div>
      <section className="card" style={{ marginTop: 20, maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="overline">{lang === "fr" ? "Especes utilisees" : "Enabled species"}</div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
              {lang === "fr" ? "Ces choix filtrent la barre d'especes, la navigation et la saisie rapide." : "These choices filter species bars, navigation and quick entry."}
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setSelected(allSelected ? [SPECIES[0].id] : SPECIES.map((s) => s.id))}>
            <Icon name={allSelected ? "x" : "grid"} size={13} color="currentColor"/>
            {allSelected ? (lang === "fr" ? "Reduire" : "Reduce") : (lang === "fr" ? "Tout activer" : "Enable all")}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          {SPECIES.map((s) => {
            const active = selected.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggle(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, minHeight: 44,
                  border: `1px solid ${active ? "var(--forest-700)" : "var(--border-1)"}`,
                  background: active ? "var(--forest-50)" : "var(--paper)",
                  color: active ? "var(--forest-900)" : "var(--ink-700)",
                  borderRadius: 8, padding: "9px 10px", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-sans)", fontWeight: 700,
                }}>
                <AnimalGlyph kind={s.glyph} size={17} color="currentColor"/>
                <span style={{ flex: 1 }}>{lang === "fr" ? s.fr : s.en}</span>
                <Icon name={active ? "check" : "plus"} size={13} color="currentColor"/>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--border-1)", paddingTop: 14 }}>
          <div style={{ fontSize: 12.5, color: message?.type === "err" ? "var(--rust-700)" : "var(--fg-2)" }}>
            {message ? message.text : `${selected.length} / ${SPECIES.length} ${lang === "fr" ? "especes actives" : "species enabled"}`}
          </div>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <Icon name="check" size={13} color="currentColor"/>
            {saving ? (lang === "fr" ? "Enregistrement..." : "Saving...") : (lang === "fr" ? "Enregistrer" : "Save")}
          </button>
        </div>
      </section>
      {tweaks && setTweak && <AppearanceCard lang={lang} tweaks={tweaks} setTweak={setTweak}/>}
      <LocationsManager lang={lang} enabledSpecies={enabledSpecies}/>
      <AboutCard lang={lang}/>
    </div>
  );
};

// Carte « Apparence » — options visuelles déplacées depuis l'ancien panneau
// Tweaks (désactivé). Thème, densité, style de barre latérale, langue.
const AppearanceCard = ({ lang, tweaks, setTweak }) => {
  const Seg = ({ label, value, options }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button key={o.value} type="button" onClick={() => setTweak(o.key, o.value)}
              style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${on ? "var(--forest-700)" : "var(--border-1)"}`,
                background: on ? "var(--forest-50)" : "var(--paper)",
                color: on ? "var(--forest-900)" : "var(--ink-700)" }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <section className="card" style={{ marginTop: 20, maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="overline">{lang === "fr" ? "Apparence" : "Appearance"}</div>
        <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
          {lang === "fr" ? "Préférences visuelles de l'application." : "Application visual preferences."}
        </div>
      </div>
      <Seg label={lang === "fr" ? "Thème" : "Theme"} value={tweaks.theme}
        options={[
          { key: "theme", value: "light", label: lang === "fr" ? "Clair" : "Light" },
          { key: "theme", value: "dark", label: lang === "fr" ? "Sombre" : "Dark" },
        ]}/>
      <Seg label={lang === "fr" ? "Densité" : "Density"} value={tweaks.density}
        options={[
          { key: "density", value: "comfortable", label: lang === "fr" ? "Confort" : "Comfort" },
          { key: "density", value: "compact", label: "Compact" },
        ]}/>
      <Seg label={lang === "fr" ? "Barre latérale" : "Sidebar"} value={tweaks.sidebarStyle}
        options={[
          { key: "sidebarStyle", value: "labels", label: lang === "fr" ? "Icônes + libellés" : "Icons + labels" },
          { key: "sidebarStyle", value: "icons", label: lang === "fr" ? "Icônes seules" : "Icons only" },
        ]}/>
      <Seg label={lang === "fr" ? "Langue" : "Language"} value={tweaks.lang}
        options={[
          { key: "lang", value: "fr", label: "Français" },
          { key: "lang", value: "en", label: "English" },
        ]}/>
    </section>
  );
};

// Carte « À propos » — version applicative (source unique du monorepo) + environnement.
const AboutCard = ({ lang }) => {
  const base = import.meta.env.VITE_APP_BASE_VERSION || "—";
  const build = import.meta.env.VITE_APP_BUILD_VERSION || base;
  const commit = import.meta.env.VITE_APP_COMMIT || "—";
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const env = /dev\.|localhost|127\.0\.0\.1/.test(host) ? "dev" : "prod";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE;
  const lastUpdate = buildDate
    ? new Date(buildDate).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { dateStyle: "long", timeStyle: "short" })
    : "—";
  const row = (k, v) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-1)" }}>
      <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{k}</span>
      <span className="mono" style={{ fontSize: 13, color: "var(--ink-900)" }}>{v}</span>
    </div>
  );
  return (
    <section className="card" style={{ marginTop: 20, maxWidth: 860, display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="overline" style={{ marginBottom: 6 }}>{lang === "fr" ? "À propos" : "About"}</div>
      {row(lang === "fr" ? "Version" : "Version", `v${base}`)}
      {row(lang === "fr" ? "Build" : "Build", build)}
      {row(lang === "fr" ? "Commit" : "Commit", commit)}
      {row(lang === "fr" ? "Dernière mise à jour" : "Last update", lastUpdate)}
      {row(lang === "fr" ? "Environnement" : "Environment", env)}
    </section>
  );
};

// ─── BÂTIMENTS ───────────────────────────────────────────────────────────
const BLANK_BUILDING = { name: "", species: "", type: "", capacity: "", temperature: "", humidity: "", manager: "", hygiene_status: "" };

// Type → couleur
const BLDG_TYPE_META = {
  barn:     { bg: "#EAF2EA", border: "#9CC09A", text: "#2A5A2A", icon: "barn" },
  piggery:  { bg: "#FBF0F0", border: "#D49090", text: "#7A2A2A", icon: "pig" },
  poultry:  { bg: "#FBF5E6", border: "#D4B870", text: "#7A5010", icon: "bird" },
  rabbit:   { bg: "#FBF2EC", border: "#C8A880", text: "#7A4810", icon: "package" },
  storage:  { bg: "#F5F3EE", border: "#C8C0B0", text: "#5A5040", icon: "package" },
  clinic:   { bg: "#FCF0EE", border: "#D49880", text: "#7A3010", icon: "pulse" },
};
const bldgMeta = (type) => BLDG_TYPE_META[type] || BLDG_TYPE_META.storage;

// Barre d'occupation
const BldgOccBar = ({ rate, overCapacity, compact }) => {
  const color = overCapacity ? "var(--oxblood-700)" : rate > 85 ? "var(--autorite-500)" : "var(--solidite-500)";
  return (
    <div style={{ height: compact ? 5 : 7, background: "var(--ink-100)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, rate ?? 0)}%`, background: color, transition: "width 0.3s" }}/>
    </div>
  );
};

// ─── Plan du terrain déplaçable (positions DB pos_x/pos_y, par zone) ─────────
// Décor (champ/eau/route) = farmos_land_features. Mode édition = drag souris/tactile,
// persistance via api.updateBuilding / api.updateLandFeature (pourcentage 0–100).
const LAND_FEATURE_META = {
  field:   { label: "Champ",   emoji: "🌾", w: 26, h: 22, style: { background: "repeating-linear-gradient(90deg, rgba(101,143,53,.35) 0 10px, rgba(255,255,255,.22) 10px 17px), #9fcb68", border: "2px solid rgba(76,105,44,.45)", color: "#31501c", borderRadius: 14 } },
  pasture: { label: "Pâturage", emoji: "🌱", w: 28, h: 22, style: { background: "#bfe3a0", border: "2px solid rgba(76,105,44,.4)", color: "#2c4a1c", borderRadius: 18 } },
  water:   { label: "Point d'eau", emoji: "💧", w: 16, h: 16, style: { background: "linear-gradient(135deg, #80cdf0, #3f9bc7)", border: "3px solid rgba(255,255,255,0.55)", color: "white", borderRadius: "55% 45% 50% 40%", display: "grid", placeItems: "center", fontWeight: 900 } },
  road:    { label: "Route",   emoji: "", w: 40, h: 5, style: { background: "rgba(121,93,47,.3)", border: "2px dashed rgba(84,61,30,.4)", borderRadius: 999 } },
};
const landMeta = (t) => LAND_FEATURE_META[t] || LAND_FEATURE_META.field;

const FarmLandPlan = ({ buildings, features, selectedId, onSelect, editMode, onPersist, display = "occupation", lang }) => {
  const mapRef = React.useRef(null);
  const dragRef = React.useRef(null); // { kind, id, offX, offY, el }
  // Positions locales (live pendant le drag) : id → {x,y} en %
  const [pos, setPos] = React.useState({});

  // Auto-grille pour les bâtiments sans position (pos_x null)
  const placed = React.useMemo(() => {
    let auto = 0;
    return buildings.map((b) => {
      const hasPos = b.posX != null && b.posY != null;
      if (hasPos) return { ...b, _x: Number(b.posX), _y: Number(b.posY) };
      const col = auto % 4, row = Math.floor(auto / 4); auto++;
      return { ...b, _x: 6 + col * 23, _y: 8 + row * 26 };
    });
  }, [buildings]);

  const liveXY = (kind, item, fx, fy) => {
    const p = pos[`${kind}:${item.id}`];
    return p || { x: fx, y: fy };
  };

  const onDown = (e, kind, item) => {
    onSelect(item.id);
    if (!editMode) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const r = e.currentTarget.getBoundingClientRect();
    dragRef.current = { kind, id: item.id, offX: pt.clientX - r.left, offY: pt.clientY - r.top };
  };
  const onMove = (e) => {
    const d = dragRef.current; if (!d || !editMode) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const m = mapRef.current.getBoundingClientRect();
    let x = ((pt.clientX - m.left - d.offX) / m.width) * 100;
    let y = ((pt.clientY - m.top - d.offY) / m.height) * 100;
    x = Math.max(0, Math.min(x, 96)); y = Math.max(0, Math.min(y, 94));
    setPos((s) => ({ ...s, [`${d.kind}:${d.id}`]: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }));
  };
  const onUp = () => {
    const d = dragRef.current; if (!d) return;
    dragRef.current = null;
    const p = pos[`${d.kind}:${d.id}`];
    if (p) onPersist(d.kind, d.id, p.x, p.y);
  };
  React.useEffect(() => {
    if (!editMode) return;
    window.addEventListener("mousemove", onMove); window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp); window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp); window.removeEventListener("touchend", onUp);
    };
  }); // deps volontairement larges : pos/editMode capturés à chaque rendu

  return (
    <div ref={mapRef}
      style={{ position: "relative", height: 640, minHeight: 640, flexShrink: 0, borderRadius: 16, overflow: "hidden", border: "2px solid #cbdcc5", touchAction: "none",
        background: "linear-gradient(135deg, #cbe8b8, #e4f0c8 45%, #c7df9f)",
        backgroundImage: editMode ? "linear-gradient(rgba(55,80,55,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(55,80,55,.07) 1px, transparent 1px)" : undefined,
        backgroundSize: editMode ? "40px 40px" : undefined }}>
      {/* Décor : land features */}
      {features.map((f) => {
        const m = landMeta(f.type);
        const { x, y } = liveXY("feature", f, Number(f.posX), Number(f.posY));
        const w = f.width != null ? Number(f.width) : m.w, h = f.height != null ? Number(f.height) : m.h;
        return (
          <div key={`f${f.id}`} onMouseDown={(e) => onDown(e, "feature", f)} onTouchStart={(e) => onDown(e, "feature", f)}
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`,
              cursor: editMode ? "grab" : "default", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, padding: 8, userSelect: "none", ...m.style,
              outline: selectedId === f.id && editMode ? "2px solid #2f7d32" : "none", outlineOffset: 2 }}>
            {m.emoji} {f.label || m.label}
          </div>
        );
      })}
      {/* Bâtiments */}
      {placed.map((b) => {
        const meta = bldgMeta(b.type);
        const { x, y } = liveXY("building", b, b._x, b._y);
        const isSel = selectedId === b.id;
        const rate = b.occupancyRate ?? 0;
        return (
          <div key={b.id} onMouseDown={(e) => onDown(e, "building", b)} onTouchStart={(e) => onDown(e, "building", b)}
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 172, borderRadius: 14, padding: 13,
              background: isSel ? "#fff" : meta.bg, border: `2px solid ${isSel ? "var(--forest-700)" : meta.border}`,
              boxShadow: isSel ? "0 0 0 3px rgba(14,100,56,.18)" : "0 6px 14px rgba(44,65,36,.18)",
              cursor: editMode ? "grab" : "pointer", userSelect: "none", touchAction: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <Icon name={meta.icon} size={13} color={meta.text}/>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
            </div>
            {b.species && <div style={{ fontSize: 10, color: "var(--fg-3)", marginBottom: 4 }}>{b.species}</div>}
            {display === "occupation" && b.capacity != null && <>
              <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)", marginBottom: 3 }}>{b.occupancy} / {b.capacity} · {rate}%</div>
              <BldgOccBar rate={rate} overCapacity={b.overCapacity} compact/>
            </>}
          </div>
        );
      })}
    </div>
  );
};

// Plan SVG auto-layout (grille) depuis les vrais bâtiments
const BuildingFloorPlan = ({ buildings, selectedId, onSelect, lang }) => {
  const COLS = 3;
  const CELL_W = 220, CELL_H = 110, GAP = 18, PAD = 20;
  const rows = Math.ceil(buildings.length / COLS);
  const W = PAD * 2 + COLS * CELL_W + (COLS - 1) * GAP;
  const H = PAD * 2 + rows * CELL_H + (rows - 1) * GAP + 28;

  return (
    <div style={{ background: "#F3F0E8", borderRadius: 12, border: "1px solid var(--border-1)", overflow: "hidden", position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Ground */}
        <rect width={W} height={H} fill="#F3F0E8"/>
        {/* Allée horizontale entre rangées */}
        {Array.from({ length: rows - 1 }, (_, ri) => {
          const y = PAD + (ri + 1) * CELL_H + ri * GAP - GAP / 2 - 7;
          return <rect key={ri} x={0} y={y} width={W} height={14} fill="#E0DBCD" rx={2}/>;
        })}
        {/* Allée verticale entre colonnes */}
        {Array.from({ length: COLS - 1 }, (_, ci) => {
          const x = PAD + (ci + 1) * CELL_W + ci * GAP - GAP / 2 - 7;
          return <rect key={ci} x={x} y={0} width={14} height={H} fill="#E0DBCD" rx={2}/>;
        })}
        {/* Compass */}
        <g transform={`translate(${W - 26}, 22)`}>
          <circle cx={0} cy={0} r={14} fill="white" stroke="#D0CCBE" strokeWidth={1}/>
          <text x={0} y={-5} textAnchor="middle" fontSize="7" fill="#3A3020" fontWeight="700" fontFamily="monospace">N</text>
          <polygon points="0,-10 -3,2 3,2" fill="#3A3020"/>
        </g>
        {/* Buildings */}
        {buildings.map((b, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = PAD + col * (CELL_W + GAP);
          const y = PAD + row * (CELL_H + GAP);
          const meta = bldgMeta(b.type);
          const isSelected = selectedId === b.id;
          const rate = b.occupancyRate ?? 0;
          const overCap = b.overCapacity;
          const barColor = overCap ? "#A82020" : rate > 85 ? "#B08020" : "#3A8040";
          return (
            <g key={b.id} style={{ cursor: "pointer" }} onClick={() => onSelect(b.id)}>
              {/* Shadow */}
              <rect x={x + 3} y={y + 3} width={CELL_W} height={CELL_H} rx={6} fill="rgba(0,0,0,0.07)"/>
              {/* Body */}
              <rect x={x} y={y} width={CELL_W} height={CELL_H} rx={6}
                fill={isSelected ? "white" : meta.bg}
                stroke={isSelected ? "var(--forest-700)" : meta.border}
                strokeWidth={isSelected ? 2.5 : 1.5}/>
              {/* Roof strip */}
              <rect x={x} y={y} width={CELL_W} height={7} rx={6} fill={meta.border} opacity={0.5}/>
              {/* Status dot */}
              <circle cx={x + CELL_W - 12} cy={y + 13} r={5}
                fill={overCap ? "#BE5234" : rate > 85 ? "#B08020" : "#3A8040"}
                stroke="white" strokeWidth={1.5}/>
              {/* Name */}
              <text x={x + 10} y={y + 20} fontSize="9.5" fontWeight="800" fill={meta.border} fontFamily="monospace" letterSpacing="0.05em">
                {b.type ? b.type.toUpperCase().slice(0, 8) : "BLDG"}
              </text>
              <text x={x + 10} y={y + 35} fontSize="10" fill="#3A3020" fontFamily="sans-serif" fontWeight="600">
                {b.name.slice(0, 26)}
              </text>
              {/* Species */}
              {b.species && (
                <text x={x + 10} y={y + 49} fontSize="9" fill="#6A5A40" fontFamily="sans-serif">{b.species}</text>
              )}
              {/* Env info */}
              {b.temperature != null && (
                <text x={x + 10} y={y + 63} fontSize="9" fill="#7A7060" fontFamily="monospace">{b.temperature}°C {b.humidity != null ? `· ${b.humidity}%H` : ""}</text>
              )}
              {/* Occupancy bar */}
              {b.capacity && (
                <>
                  <text x={x + 10} y={y + CELL_H - 22} fontSize="8.5" fill="#7A7060" fontFamily="monospace">
                    {b.occupancy ?? 0} / {b.capacity} · {rate}%
                  </text>
                  <rect x={x + 10} y={y + CELL_H - 14} width={CELL_W - 20} height={6} rx={999} fill="rgba(0,0,0,0.09)"/>
                  <rect x={x + 10} y={y + CELL_H - 14}
                    width={Math.max(4, ((CELL_W - 20) * Math.min(100, rate)) / 100)} height={6} rx={999}
                    fill={barColor}/>
                </>
              )}
              {/* Manager */}
              {b.manager && !b.capacity && (
                <text x={x + 10} y={y + CELL_H - 12} fontSize="8.5" fill="#9A8A70" fontFamily="sans-serif">{b.manager}</text>
              )}
            </g>
          );
        })}
        {/* Legend */}
        <g transform={`translate(${PAD}, ${H - 18})`}>
          {[
            { color: "#3A8040", label: lang === "fr" ? "Normal" : "Normal" },
            { color: "#B08020", label: lang === "fr" ? "> 85%" : "> 85%" },
            { color: "#BE5234", label: lang === "fr" ? "Surcap." : "Over cap." },
          ].map((l, i) => (
            <g key={i} transform={`translate(${i * 90}, 0)`}>
              <circle cx={5} cy={-3} r={4} fill={l.color}/>
              <text x={13} y={0} fontSize="8.5" fill="#7A7060" fontFamily="sans-serif">{l.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

// ─── Plan intérieur générique (basé sur capacity et sections statiques) ──────
const INTERIOR_BOX_FILL   = { ok: "#A8D8A0", sick: "#E08080", quarantine: "#F0C060", empty: "#E8E4DC" };
const INTERIOR_BOX_STROKE = { ok: "#5A9A58", sick: "#B84040", quarantine: "#C89020", empty: "#B8B4A8" };
// Fonds doux pour les cartes de box (plan moderne)
const INTERIOR_CARD_BG    = { ok: "#E7F1E6", sick: "#FBE9E7", quarantine: "#FBF1DC", empty: "#F6F3EC" };

// Plan intérieur RÉEL : box = entités farmos_boxes rattachées au bâtiment.
// Box libre : on assigne N animaux (de n'importe quel lot, ou sans lot) à un box,
// avec capacité max par box (blocage + possibilité de forcer). Cliquer un box ouvre
// le panneau d'affectation ; bouton "Générer les box" si le bâtiment n'en a aucun.
const BldgInteriorPlan = ({ building, animals = [], lang, onClose }) => {
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const [boxes, setBoxes] = React.useState(null); // null = chargement
  const [selBoxId, setSelBoxId] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [genOpen, setGenOpen] = React.useState(false); // modal "Générer les box"
  const [selectMode, setSelectMode] = React.useState(false); // mode suppression en lot
  const [checked, setChecked] = React.useState(() => new Set()); // ids de box cochés

  const reload = React.useCallback(() => {
    if (!building) return;
    setBoxes(null);
    api.listBoxes(building.id).then((b) => setBoxes(Array.isArray(b) ? b : [])).catch(() => setBoxes([]));
  }, [building]);
  React.useEffect(() => { reload(); }, [reload]);

  if (!building) return null;
  const meta = bldgMeta(building.type);

  // Animaux de ce bâtiment (par building_id, fallback barn == nom) — base de l'affectation.
  // On exclut les animaux décédés / vendus : ils ne s'affectent pas à un box.
  const bldgAnimals = animals.filter((a) => isActiveLivestock(a) && (
    (a.buildingId != null && a.buildingId === building.id) ||
    (a.buildingId == null && a.barn && a.barn === building.name)));
  const animalsByBox = new Map();
  for (const a of bldgAnimals) {
    if (a.boxId == null) continue;
    if (!animalsByBox.has(a.boxId)) animalsByBox.set(a.boxId, []);
    animalsByBox.get(a.boxId).push(a);
  }
  const headsIn = (boxId) => (animalsByBox.get(boxId) || []).reduce((s, a) => s + animalQty(a), 0);
  const boxStatus = (box) => {
    const list = animalsByBox.get(box.id) || [];
    if (list.length === 0) return "empty";
    if (list.some((a) => a.status === "sick")) return "sick";
    if (list.some((a) => a.status === "quarantine")) return "quarantine";
    return "ok";
  };

  const loading = boxes === null;
  const hasBoxes = !loading && boxes.length > 0;
  const selBox = hasBoxes ? boxes.find((b) => b.id === selBoxId) || null : null;

  // Génération en masse (via modal GenerateBoxesModal)
  const onGenerate = () => setGenOpen(true);
  const doGenerate = async ({ count, capacity }) => {
    setBusy(true);
    try {
      await api.generateBoxes({ building_id: building.id, count, capacity });
      setGenOpen(false);
      reload();
    } catch (e) { window.alert(String(e.message || e)); }
    setBusy(false);
  };

  // Affectation d'animaux au box sélectionné (avec gestion BOX_FULL → confirmer Forcer)
  const assign = async (animalIds, force = false) => {
    if (!selBox || animalIds.length === 0) return;
    setBusy(true);
    try {
      await api.assignAnimalsToBox({ box_id: selBox.id, animal_ids: animalIds, force });
      window.dispatchEvent(new CustomEvent("farmos:data-changed", { detail: { kind: "assignBox", tables: ["animals"] } }));
      reload();
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes("BOX_FULL")) {
        if (window.confirm(L("Box plein : la capacité sera dépassée. Forcer quand même ?", "Box full: capacity will be exceeded. Force anyway?"))) {
          setBusy(false);
          return assign(animalIds, true);
        }
      } else window.alert(msg);
    }
    setBusy(false);
  };
  const unassign = async (animalId) => {
    setBusy(true);
    try {
      await api.assignAnimalsToBox({ box_id: null, animal_ids: [animalId] });
      window.dispatchEvent(new CustomEvent("farmos:data-changed", { detail: { kind: "assignBox", tables: ["animals"] } }));
      reload();
    } catch (e) { window.alert(String(e.message || e)); }
    setBusy(false);
  };

  // Suppression d'un box (individuel). Désassigne ses animaux côté backend (soft delete).
  const deleteOne = async (box) => {
    const n = headsIn(box.id);
    const warn = n > 0
      ? L(`Le box ${box.name} contient ${n} tête(s) : elles seront retirées du box. Supprimer ?`, `Box ${box.name} holds ${n} head(s): they will be removed from the box. Delete?`)
      : L(`Supprimer le box ${box.name} ?`, `Delete box ${box.name}?`);
    if (!window.confirm(warn)) return;
    setBusy(true);
    try {
      await api.deleteBox(box.id);
      window.dispatchEvent(new CustomEvent("farmos:data-changed", { detail: { kind: "deleteBox", tables: ["boxes", "animals"] } }));
      setSelBoxId(null);
      reload();
    } catch (e) { window.alert(String(e.message || e)); }
    setBusy(false);
  };

  // Suppression en lot des box cochés.
  const deleteChecked = async () => {
    const ids = [...checked];
    if (ids.length === 0) return;
    if (!window.confirm(L(`Supprimer ${ids.length} box ? Les animaux concernés seront retirés de leur box.`, `Delete ${ids.length} boxes? Affected animals will be removed from their box.`))) return;
    setBusy(true);
    try {
      await api.deleteBoxes(ids);
      window.dispatchEvent(new CustomEvent("farmos:data-changed", { detail: { kind: "deleteBoxes", tables: ["boxes", "animals"] } }));
      setChecked(new Set());
      setSelectMode(false);
      reload();
    } catch (e) { window.alert(String(e.message || e)); }
    setBusy(false);
  };
  const toggleCheck = (id) => setChecked((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // Animaux du bâtiment non encore placés dans un box (candidats à l'ajout).
  const candidates = bldgAnimals.filter((a) => a.boxId == null);
  const lotsAvailable = [...new Set(candidates.map((a) => a.lot).filter(Boolean))];

  const statusLabels = {
    ok: L("Occupée", "Occupied"), sick: L("Malade", "Sick"),
    quarantine: L("Quarantaine", "Quarantine"), empty: L("Vide", "Empty"),
  };
  const counts = hasBoxes ? boxes.reduce((a, b) => { const s = boxStatus(b); a[s] = (a[s] || 0) + 1; return a; }, {}) : {};

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,16,12,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}>
      <div style={{ background: "var(--paper)", borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.25)", maxWidth: 720, width: "96vw", maxHeight: "92vh", overflow: "auto", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: meta.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={meta.icon} size={16} color={meta.text}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink-950)" }}>{building.name}</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 1 }}>
              {L("Plan intérieur · Affectation des box", "Interior plan · Box assignment")}
            </div>
          </div>
          {hasBoxes && !selBox && (
            <button className="btn btn-sm btn-ghost" disabled={busy}
              onClick={() => { setSelectMode((v) => !v); setChecked(new Set()); }}
              style={{ marginRight: 6 }}>
              <Icon name={selectMode ? "x" : "trash"} size={12} color={selectMode ? "var(--ink-600)" : "var(--oxblood-700)"}/>
              {selectMode ? L("Annuler", "Cancel") : L("Sélectionner", "Select")}
            </button>
          )}
          {hasBoxes && <button className="btn btn-sm" disabled={busy} onClick={onGenerate} style={{ marginRight: 6 }}>
            <Icon name="plus" size={12} color="var(--ink-700)"/>{L("Box", "Box")}
          </button>}
          <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ padding: "4px 8px" }}>
            <Icon name="x" size={14} color="var(--ink-600)"/>
          </button>
        </div>

        {loading && <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>{L("Chargement…", "Loading…")}</div>}

        {!loading && !hasBoxes && (
          <div style={{ padding: "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--ink-700)", marginBottom: 4, fontWeight: 600 }}>{L("Aucun box configuré", "No box configured")}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>
              {L("Génère les box de ce bâtiment pour y placer des animaux.", "Generate this building's boxes to place animals in them.")}
            </div>
            <button className="btn" disabled={busy} onClick={onGenerate}>
              <Icon name="plus" size={13} color="#fff"/>{L("Générer les box", "Generate boxes")}
            </button>
          </div>
        )}

        {hasBoxes && !selBox && <>
          {/* Legend */}
          <div style={{ display: "flex", gap: 18, padding: "11px 20px", borderBottom: "1px solid var(--border-1)", flexWrap: "wrap" }}>
            {Object.entries(statusLabels).map(([k, lbl]) => counts[k] ? (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-700)", fontWeight: 600 }}>
                <span style={{ width: 13, height: 13, borderRadius: 4, background: INTERIOR_CARD_BG[k], border: `1.5px solid ${INTERIOR_BOX_STROKE[k]}`, display: "inline-block" }}/>
                {lbl}<span style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "monospace" }}>({counts[k]})</span>
              </div>
            ) : null)}
          </div>

          {/* Grille de cartes box (tactile, lisible) */}
          <div style={{ padding: "16px 20px", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 10 }}>
              {boxes.map((box) => {
                const status = boxStatus(box);
                const heads = headsIn(box.id);
                const cap = box.capacity != null ? box.capacity : null;
                const over = cap != null && heads > cap;
                const full = cap != null && heads >= cap;
                const pct = cap != null ? Math.min(100, Math.round((heads / cap) * 100)) : (heads > 0 ? 100 : 0);
                const barColor = over ? "#B84040" : (full ? "#C89020" : "#5A9A58");
                const isEmpty = status === "empty";
                const isChecked = checked.has(box.id);
                return (
                  <button key={box.id} type="button"
                    onClick={() => selectMode ? toggleCheck(box.id) : setSelBoxId(box.id)}
                    style={{
                      position: "relative",
                      textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "10px 11px",
                      minHeight: 74, display: "flex", flexDirection: "column", justifyContent: "space-between",
                      background: isEmpty ? "var(--surface-1, #F6F3EC)" : INTERIOR_CARD_BG[status],
                      border: `1.5px ${isEmpty ? "dashed" : "solid"} ${selectMode && isChecked ? "var(--oxblood-700)" : (over ? "#B84040" : INTERIOR_BOX_STROKE[status])}`,
                      boxShadow: selectMode && isChecked ? "0 0 0 2px var(--oxblood-700) inset" : "none",
                      transition: "transform .12s, box-shadow .12s", font: "inherit",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = selectMode && isChecked ? "0 0 0 2px var(--oxblood-700) inset" : "none"; }}>
                    {selectMode && (
                      <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                        background: isChecked ? "var(--oxblood-700)" : "var(--paper)", border: `1.5px solid ${isChecked ? "var(--oxblood-700)" : "var(--border-2)"}` }}>
                        {isChecked && <Icon name="check" size={12} color="#fff"/>}
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 14, color: isEmpty ? "var(--fg-2)" : "var(--ink-950)" }}>
                      {!isEmpty && <span style={{ width: 8, height: 8, borderRadius: "50%", background: INTERIOR_BOX_STROKE[status], flexShrink: 0 }}/>}
                      Box {box.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: over ? "#B84040" : "var(--fg-2)" }}>
                      {cap != null ? `${heads}/${cap}` : `${heads}`}{!isEmpty ? ` ${L("têtes", "heads")}` : ""}{over ? ` ${L("dépassé", "over")}` : (full && !isEmpty ? ` ${L("plein", "full")}` : "")}
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--border-1)", overflow: "hidden", marginTop: 4 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3 }}/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>}

        {/* Panneau d'affectation du box sélectionné (remplace la grille, avec retour) */}
        {hasBoxes && selBox && (
          <div style={{ padding: "16px 20px" }}>
            {(() => {
              const inBox = animalsByBox.get(selBox.id) || [];
              const heads = headsIn(selBox.id);
              const cap = selBox.capacity != null ? selBox.capacity : null;
              const full = cap != null && heads >= cap;
              const over = cap != null && heads > cap;
              const pct = cap != null ? Math.min(100, Math.round((heads / cap) * 100)) : 0;
              const barColor = over ? "#B84040" : (full ? "#C89020" : "#5A9A58");
              const stColor = { ok: "#5A9A58", sick: "#B84040", quarantine: "#C89020", empty: "#B8B4A8" };
              return (
                <div style={{ border: "1px solid var(--border-1)", borderRadius: 12, overflow: "hidden", background: "var(--paper)" }}>
                  {/* En-tête sticky du box : retour + nom + remplissage */}
                  <div style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--surface-1, #F6F3EC)", padding: "11px 13px 9px", borderBottom: "1px solid var(--border-1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: cap != null ? 7 : 0 }}>
                      <button type="button" title={L("Retour aux box", "Back to boxes")} onClick={() => setSelBoxId(null)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Icon name="chevron-left" size={16} color="var(--ink-700)"/>
                      </button>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-950)" }}>Box {selBox.name}</div>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: over ? "#B84040" : "var(--fg-2)", marginLeft: "auto" }}>
                        {cap != null ? `${heads}/${cap}` : heads} {L("têtes", "heads")}{over ? ` · ${L("dépassé", "over")}` : (full ? ` · ${L("plein", "full")}` : "")}
                      </span>
                      <button type="button" title={L("Supprimer ce box", "Delete this box")} disabled={busy} onClick={() => deleteOne(selBox)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--oxblood-300)", background: "var(--oxblood-50)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                        <Icon name="trash" size={15} color="var(--oxblood-700)"/>
                      </button>
                    </div>
                    {cap != null && (
                      <div style={{ height: 6, borderRadius: 4, background: "var(--border-1)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width .2s" }}/>
                      </div>
                    )}
                  </div>

                  {/* Animaux présents — liste scrollable (le plan reste visible au-dessus) */}
                  <div style={{ maxHeight: 230, overflowY: "auto", padding: inBox.length ? "6px 7px" : "0" }}>
                    {inBox.length === 0
                      ? <div style={{ fontSize: 12.5, color: "var(--fg-3)", padding: "16px 13px", textAlign: "center" }}>{L("Box vide — ajoute des animaux ci-dessous.", "Empty box — add animals below.")}</div>
                      : inBox.map((a) => (
                          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 8, fontSize: 12.5 }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2, #F3F0E9)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: stColor[a.status === "sick" ? "sick" : a.status === "quarantine" ? "quarantine" : "ok"], flexShrink: 0 }}/>
                            <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{a.name || a.id}{a.count > 1 ? ` ×${a.count}` : ""}</span>
                            {a.lot && <span style={{ fontSize: 10.5, color: "var(--fg-2)", background: "var(--border-1)", padding: "1px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>{a.lot}</span>}
                            <button className="btn btn-sm btn-ghost" disabled={busy} title={L("Retirer du box", "Remove from box")}
                              onClick={() => unassign(a.id)} style={{ marginLeft: "auto", padding: "3px 6px" }}>
                              <Icon name="trash" size={13} color="var(--oxblood-700)"/>
                            </button>
                          </div>
                        ))}
                  </div>

                  {/* Ajout : par lot entier ou animal individuel (box libre) */}
                  <div style={{ borderTop: "1px solid var(--border-1)", padding: "10px 13px", background: "var(--surface-1, #FAF8F3)" }}>
                    {candidates.length === 0
                      ? <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{L("Aucun autre animal du bâtiment à placer.", "No other building animal to place.")}</div>
                      : <>
                          {lotsAvailable.length > 0 && (
                            <div style={{ marginBottom: 9 }}>
                              <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 5 }}>{L("Placer tout un lot :", "Place a whole lot:")}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {lotsAvailable.map((lot) => (
                                  <button key={lot} className="btn btn-sm" disabled={busy}
                                    onClick={() => assign(candidates.filter((a) => a.lot === lot).map((a) => a.id))}>
                                    <Icon name="plus" size={11} color="var(--ink-700)"/>{L("Lot", "Lot")} {lot}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 5 }}>{L("Ajouter un animal :", "Add an animal:")}</div>
                          <select className="input" disabled={busy} defaultValue=""
                            onChange={(e) => { if (e.target.value) { assign([Number(e.target.value)]); e.target.value = ""; } }}>
                            <option value="">{L("— choisir —", "— choose —")}</option>
                            {candidates.map((a) => (
                              <option key={a.id} value={a.id}>
                                {(a.name || a.id)}{a.lot ? ` (lot ${a.lot})` : ""}{a.count > 1 ? ` ×${a.count}` : ""}
                              </option>
                            ))}
                          </select>
                        </>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "10px 18px", borderTop: "1px solid var(--border-1)" }}>
          {selectMode && !selBox ? (
            <>
              <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => { setSelectMode(false); setChecked(new Set()); }} style={{ flex: 1 }}>
                {L("Annuler", "Cancel")}
              </button>
              <button className="btn btn-sm" disabled={busy || checked.size === 0} onClick={deleteChecked}
                style={{ flex: 1, background: "var(--oxblood-700)", borderColor: "var(--oxblood-700)", color: "#fff" }}>
                <Icon name="trash" size={12} color="#fff"/>{L(`Supprimer (${checked.size})`, `Delete (${checked.size})`)}
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ flex: 1 }}>
              {L("Fermer", "Close")}
            </button>
          )}
        </div>
      </div>

      {genOpen && (
        <GenerateBoxesModal
          lang={lang}
          building={building}
          existingCount={hasBoxes ? boxes.length : 0}
          busy={busy}
          onCancel={() => setGenOpen(false)}
          onConfirm={doGenerate}/>
      )}
    </div>
  );
};

// Modal de génération des box (remplace les window.prompt nombre + capacité)
const GenerateBoxesModal = ({ lang, building, existingCount = 0, busy, onCancel, onConfirm }) => {
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const [count, setCount] = React.useState(String(building?.capacity || 20));
  const [capacity, setCapacity] = React.useState("");
  const nCount = parseInt(count, 10);
  const valid = Number.isFinite(nCount) && nCount >= 1;
  const submit = (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    const cap = capacity.trim() ? parseInt(capacity, 10) : null;
    onConfirm({ count: nCount, capacity: Number.isFinite(cap) && cap > 0 ? cap : null });
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,16,12,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        style={{ background: "var(--paper)", borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.25)", width: "92vw", maxWidth: 380, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--border-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={15} color="var(--ink-700)"/>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink-950)" }}>
            {L("Générer les box", "Generate boxes")}
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-700)", marginBottom: 5 }}>
              {L("Nombre de box", "Number of boxes")}
            </label>
            <input className="input" type="number" min="1" inputMode="numeric" autoFocus
              value={count} onChange={(e) => setCount(e.target.value)}/>
            {existingCount > 0 && (
              <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 4 }}>
                {L(`${existingCount} box déjà présents dans ce bâtiment.`, `${existingCount} boxes already in this building.`)}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-700)", marginBottom: 5 }}>
              {L("Capacité par box (têtes)", "Capacity per box (heads)")}
            </label>
            <input className="input" type="number" min="1" inputMode="numeric"
              placeholder={L("Laisser vide = sans limite", "Empty = unlimited")}
              value={capacity} onChange={(e) => setCapacity(e.target.value)}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border-1)" }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel} disabled={busy} style={{ flex: 1 }}>
            {L("Annuler", "Cancel")}
          </button>
          <button type="submit" className="btn btn-sm" disabled={!valid || busy} style={{ flex: 1 }}>
            {busy ? L("Génération…", "Generating…") : L("Générer", "Generate")}
          </button>
        </div>
      </form>
    </div>
  );
};

// Panneau de détail d'un bâtiment sélectionné
// Stats animaux d'un bâtiment (par nom de barn). Quantité = champ `count` (1 ligne peut
// représenter plusieurs têtes), aligné sur le calcul d'occupation backend (somme des count).
// Catégorisation (adulte / cochette / engraissement / jeune) partagée via animal-category.js.
const bldgAnimalStats = (building, animals) => {
  if (!building) return { female: 0, male: 0, total: 0, sick: 0, lots: [], lotTotal: 0, femaleAdult: 0, maleAdult: 0, categories: {}, slaughter: { pret: 0, retard: 0, enCroissance: 0, avgWeight: null }, avgWeight: null };
  const bldgAnimals = animals.filter((a) => isActiveLivestock(a) && a.barn === building.name);
  const lotGroups = new Map(); // nom -> [animaux]
  let female = 0, male = 0, total = 0, sick = 0, femaleAdult = 0, maleAdult = 0;
  bldgAnimals.forEach((a) => {
    const n = animalQty(a);
    total += n;
    const adult = isAdultAnimal(a);
    if (a.sex === "F") { female += n; if (adult) femaleAdult += n; }
    else if (a.sex === "M") { male += n; if (adult) maleAdult += n; }
    if (a.status && a.status !== "healthy") sick += n;
    if (a.lot) { if (!lotGroups.has(a.lot)) lotGroups.set(a.lot, []); lotGroups.get(a.lot).push(a); }
  });
  // Catégories (avec ratio reproducteur) calculées par groupe : le bâtiment entier,
  // puis chaque lot indépendamment (le ratio mâle/femelle s'applique au sein du groupe).
  const categories = categoryBreakdownByGroup(bldgAnimals);
  // Abattage : sur les animaux destinés à l'engraissement ; poids moyen sur tout le bâtiment.
  const slaughter = slaughterStats(bldgAnimals, { onlyFattening: true });
  const avgWeight = slaughterStats(bldgAnimals).avgWeight;
  const lots = [...lotGroups.entries()].map(([name, rows]) => {
    const count = rows.reduce((s, a) => s + animalQty(a), 0);
    const f = rows.filter((a) => a.sex === "F").reduce((s, a) => s + animalQty(a), 0);
    const m = rows.filter((a) => a.sex === "M").reduce((s, a) => s + animalQty(a), 0);
    return { name, count, female: f, male: m, categories: categoryBreakdownByGroup(rows) };
  }).sort((x, y) => y.count - x.count);
  return { female, male, total, sick, femaleAdult, maleAdult, categories, slaughter, avgWeight, lots, lotTotal: lots.reduce((s, l) => s + l.count, 0) };
};

// Génère et imprime un rapport d'effectif d'un bâtiment (impression navigateur, sans backend).
const printBuildingReport = (building, stats, lang) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const now = new Date().toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
  const catRows = CATEGORY_ORDER.filter((c) => (stats.categories[c] || 0) > 0).map((c) => {
    const pct = stats.total > 0 ? Math.round((stats.categories[c] / stats.total) * 100) : 0;
    return `<tr><td>${esc(lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en)}</td><td class="num">${stats.categories[c]}</td><td class="num">${pct}%</td></tr>`;
  }).join("");
  const lotRows = stats.lots.map((l) => {
    const cats = CATEGORY_ORDER.filter((c) => (l.categories[c] || 0) > 0).map((c) => `${lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}: ${l.categories[c]}`).join(", ");
    return `<tr><td>${esc(l.name)}</td><td class="num">${l.count}</td><td class="num">${l.female}</td><td class="num">${l.male}</td><td>${esc(cats)}</td></tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Rapport", "Report")} — ${esc(building.name)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 2px solid #0E6438; padding-bottom: 4px; color: #0E6438; }
  .meta { color: #666; font-size: 12px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  th, td { border: 1px solid #ccc; padding: 6px 9px; text-align: left; } th { background: #f2f2f2; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
  .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 8px 14px; min-width: 110px; }
  .kpi .lbl { font-size: 10px; text-transform: uppercase; color: #777; } .kpi .val { font-size: 20px; font-weight: 700; }
  @media print { body { margin: 12mm; } button { display: none; } }
</style></head><body>
  <h1>${L("Rapport d'effectif", "Headcount report")} — ${esc(building.name)}</h1>
  <div class="meta">${esc([building.type, building.species, building.manager].filter(Boolean).join(" · "))}</div>
  <div class="meta">${L("Généré le", "Generated")} ${esc(now)}</div>
  <h2>${L("Synthèse", "Summary")}</h2>
  <div class="kpis">
    <div class="kpi"><div class="lbl">${L("Total animaux", "Total")}</div><div class="val">${stats.total}</div></div>
    ${building.capacity != null ? `<div class="kpi"><div class="lbl">${L("Capacité", "Capacity")}</div><div class="val">${building.capacity}</div></div><div class="kpi"><div class="lbl">${L("Places dispo.", "Available")}</div><div class="val">${Math.max(0, building.capacity - (building.occupancy ?? 0))}</div></div>` : ""}
    <div class="kpi"><div class="lbl">${L("Femelles", "Females")}</div><div class="val">${stats.female}</div><div class="lbl">${L("dont", "incl.")} ${stats.femaleAdult} ${L("adultes", "adults")}</div></div>
    <div class="kpi"><div class="lbl">${L("Mâles", "Males")}</div><div class="val">${stats.male}</div><div class="lbl">${L("dont", "incl.")} ${stats.maleAdult} ${L("adultes", "adults")}</div></div>
    <div class="kpi"><div class="lbl">${L("Malades", "Sick")}</div><div class="val">${stats.sick}</div></div>
    ${stats.avgWeight != null ? `<div class="kpi"><div class="lbl">${L("Poids moyen", "Avg weight")}</div><div class="val">${stats.avgWeight.toFixed(1)} kg</div></div>` : ""}
  </div>
  ${(stats.slaughter.pret > 0 || stats.slaughter.retard > 0) ? `<h2>${L("Abattage / vente", "Slaughter / sale")}</h2>
  <div class="kpis">
    <div class="kpi"><div class="lbl">${L("Prêts à abattre", "Ready")}</div><div class="val">${stats.slaughter.pret}</div></div>
    <div class="kpi"><div class="lbl">${L("En retard (coût net)", "Overdue")}</div><div class="val">${stats.slaughter.retard}</div></div>
  </div>` : ""}
  <h2>${L("Par catégorie", "By category")}</h2>
  <table><thead><tr><th>${L("Catégorie", "Category")}</th><th class="num">${L("Têtes", "Head")}</th><th class="num">%</th></tr></thead><tbody>${catRows}</tbody></table>
  ${stats.lots.length ? `<h2>${L("Lots", "Batches")}</h2>
  <table><thead><tr><th>${L("Lot", "Batch")}</th><th class="num">${L("Total", "Total")}</th><th class="num">♀</th><th class="num">♂</th><th>${L("Catégories", "Categories")}</th></tr></thead><tbody>${lotRows}</tbody></table>` : ""}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer le rapport.", "Allow pop-ups to print the report.")); return; }
  w.document.write(html);
  w.document.close();
};

// Génère et imprime les fiches de terrain hebdomadaires d'un bâtiment (4 fiches, 1 page chacune,
// pré-remplies avec les lots + lignes vierges, à remplir au stylo puis scanner). Impression navigateur, sans backend.
const printFieldSheets = (building, stats, lang) => {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const fr = lang === "fr";
  const lotNames = stats.lots.map((l) => l.name);
  const BLANK_ROWS = 4;
  const bldgMeta = esc([building.name, building.type, building.species].filter(Boolean).join(" · "));

  const header = (title) => `
  <h1>${esc(title)}</h1>
  <div class="meta">${bldgMeta}</div>
  <div class="week-line">${L("Semaine du", "Week of")} <span class="week-blank"></span> ${L("au", "to")} <span class="week-blank"></span> 2026</div>`;

  const sign = () => `<div class="sign">${L("Rempli par","Filled by")}: <span class="sign-line"></span> &nbsp; ${L("Signature","Signature")}: <span class="sign-line"></span></div>`;

  const exTitle = fr ? "Exemple de remplissage :" : "Example:";
  const dayLabels = fr ? ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] : ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  // Fiche Mortalité
  const sheetMortalite = () => {
    const rows = dayLabels.map((day) => `<tr>
        <td class="entity"></td>
        <td class="day-col">${day}</td>
        <td class="hour-col"></td>
        <td class="wide"></td>
        <td class="num"></td>
        <td class="wide"></td>
      </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche mortalité","Mortality sheet"))}
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="day-col">${L("Jour","Day")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="wide">${L("Cause du décès","Cause of death")}</th>
    <th class="num">${L("Nb morts","Deaths")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="day-col">${L("Jour","Day")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="wide">${L("Cause du décès","Cause of death")}</th>
      <th class="num">${L("Nb morts","Deaths")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Lot Poulets A","Batch Hens A")}</td><td class="day-col ex-val">${L("Lundi","Monday")}</td><td class="hour-col ex-val">07h00</td><td class="wide ex-val">${L("Écrasement","Crushing")}</td><td class="num ex-val">2</td><td class="wide ex-val">${L("Retrouvés le matin","Found in the morning")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Poulets A","Batch Hens A")}</td><td class="day-col ex-val">${L("Mercredi","Wednesday")}</td><td class="hour-col ex-val">14h30</td><td class="wide ex-val">${L("Maladie inconnue","Unknown disease")}</td><td class="num ex-val">1</td><td class="wide ex-val">${L("Animal isolé avant mort","Animal was isolated")}</td></tr>
      <tr><td class="entity ex-val">${L("Bessie #001","Bessie #001")}</td><td class="day-col ex-val">${L("Vendredi","Friday")}</td><td class="hour-col ex-val">02h00</td><td class="wide ex-val">${L("Accouchement difficile","Difficult birth")}</td><td class="num ex-val">1</td><td class="wide ex-val"></td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  // Fiche Alimentation
  const sheetAlimentation = () => {
    const rows = dayLabels.map((day) => `<tr>
        <td class="entity"></td>
        <td class="day-col">${day}</td>
        <td class="hour-col"></td>
        <td class="wide"></td>
        <td class="num"></td>
        <td class="wide"></td>
      </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche alimentation","Feeding sheet"))}
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="day-col">${L("Jour","Day")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="wide">${L("Aliment distribué","Feed given")}</th>
    <th class="num">${L("Quantité (kg)","Qty (kg)")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="day-col">${L("Jour","Day")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="wide">${L("Aliment distribué","Feed given")}</th>
      <th class="num">${L("Quantité (kg)","Qty (kg)")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Lot Porcs B","Batch Pigs B")}</td><td class="day-col ex-val">${L("Lundi","Monday")}</td><td class="hour-col ex-val">07h00</td><td class="wide ex-val">${L("Maïs concassé","Crushed corn")}</td><td class="num ex-val">45</td><td class="wide ex-val">${L("Distribution matin","Morning feed")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Porcs B","Batch Pigs B")}</td><td class="day-col ex-val">${L("Lundi","Monday")}</td><td class="hour-col ex-val">17h00</td><td class="wide ex-val">${L("Son de blé","Wheat bran")}</td><td class="num ex-val">12</td><td class="wide ex-val">${L("Distribution soir","Evening feed")}</td></tr>
      <tr><td class="entity ex-val">${L("Bessie #001","Bessie #001")}</td><td class="day-col ex-val">${L("Mardi","Tuesday")}</td><td class="hour-col ex-val">08h00</td><td class="wide ex-val">${L("Herbe + concentré","Grass + concentrate")}</td><td class="num ex-val">8</td><td class="wide ex-val"></td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  // Fiche Production
  const sheetProduction = () => {
    const rows = dayLabels.map((day) => `<tr>
        <td class="entity"></td>
        <td class="day-col">${day}</td>
        <td class="hour-col"></td>
        <td class="wide"></td>
        <td class="num"></td>
        <td class="wide"></td>
      </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche production","Production sheet"))}
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="day-col">${L("Jour","Day")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="wide">${L("Type de production","Production type")}</th>
    <th class="num">${L("Quantité","Quantity")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="day-col">${L("Jour","Day")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="wide">${L("Type de production","Production type")}</th>
      <th class="num">${L("Quantité","Quantity")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Lot Poules","Batch Hens")}</td><td class="day-col ex-val">${L("Lundi","Monday")}</td><td class="hour-col ex-val">06h30</td><td class="wide ex-val">${L("Œufs","Eggs")}</td><td class="num ex-val">184</td><td class="wide ex-val">${L("12 cassés","12 broken")}</td></tr>
      <tr><td class="entity ex-val">${L("Bessie #001","Bessie #001")}</td><td class="day-col ex-val">${L("Lundi","Monday")}</td><td class="hour-col ex-val">05h00</td><td class="wide ex-val">${L("Lait (L)","Milk (L)")}</td><td class="num ex-val">22</td><td class="wide ex-val">${L("Traite matin","Morning milking")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Engraissement","Fattening Batch")}</td><td class="day-col ex-val">${L("Jeudi","Thursday")}</td><td class="hour-col ex-val">08h00</td><td class="wide ex-val">${L("Poids vif (kg)","Live weight (kg)")}</td><td class="num ex-val">87</td><td class="wide ex-val">${L("Pesée hebdomadaire","Weekly weighing")}</td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  // Fiche Soins/Traitements
  const sheetSoins = () => {
    const rows = Array(7).fill("").map(() => `<tr>
      <td class="entity"></td>
      <td class="date-col"></td>
      <td class="hour-col"></td>
      <td class="wide"></td>
      <td class="wide"></td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="wide"></td>
    </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche soins / traitements","Care / treatment sheet"))}
  <p class="hint">${L("Une ligne par traitement. Écrire la date et l'heure exactes.","One row per treatment. Write the exact date and time.")}</p>
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="date-col">${L("Date","Date")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="wide">${L("Raison / Maladie","Reason / Disease")}</th>
    <th class="wide">${L("Médicament / Produit","Medicine / Product")}</th>
    <th class="num">${L("Dose","Dose")}</th>
    <th class="num">${L("Durée (j)","Duration (d)")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="date-col">${L("Date","Date")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="wide">${L("Raison / Maladie","Reason / Disease")}</th>
      <th class="wide">${L("Médicament / Produit","Medicine / Product")}</th>
      <th class="num">${L("Dose","Dose")}</th>
      <th class="num">${L("Durée (j)","Duration (d)")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Bessie #001","Bessie #001")}</td><td class="date-col ex-val">23/06</td><td class="hour-col ex-val">08h00</td><td class="wide ex-val">${L("Diarrhée","Diarrhea")}</td><td class="wide ex-val">Amoxicilline</td><td class="num ex-val">5 ml</td><td class="num ex-val">5</td><td class="wide ex-val">${L("Injection matin","Morning injection")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Porcs B","Batch Pigs B")}</td><td class="date-col ex-val">25/06</td><td class="hour-col ex-val">10h00</td><td class="wide ex-val">${L("Parasites","Parasites")}</td><td class="wide ex-val">Ivermectine</td><td class="num ex-val">2 ml/10kg</td><td class="num ex-val">1</td><td class="wide ex-val">${L("Tout le lot traité","Whole batch treated")}</td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  // Fiche Vaccination
  const sheetVaccination = () => {
    const rows = Array(7).fill("").map(() => `<tr>
      <td class="entity"></td>
      <td class="date-col"></td>
      <td class="hour-col"></td>
      <td class="wide"></td>
      <td class="num"></td>
      <td class="date-col"></td>
      <td class="wide"></td>
    </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche vaccination","Vaccination sheet"))}
  <p class="hint">${L("Une ligne par vaccin administré. Indiquer le nombre d'animaux vaccinés et la date du prochain rappel si connu.","One row per vaccine. Write the number of animals vaccinated and the next booster date if known.")}</p>
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="date-col">${L("Date","Date")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="wide">${L("Nom du vaccin","Vaccine name")}</th>
    <th class="num">${L("Nb animaux","Nb animals")}</th>
    <th class="date-col">${L("Rappel prévu","Next booster")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="date-col">${L("Date","Date")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="wide">${L("Nom du vaccin","Vaccine name")}</th>
      <th class="num">${L("Nb animaux","Nb animals")}</th>
      <th class="date-col">${L("Rappel prévu","Next booster")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Lot Poulets A","Batch Hens A")}</td><td class="date-col ex-val">24/06</td><td class="hour-col ex-val">07h30</td><td class="wide ex-val">Newcastle ND</td><td class="num ex-val">200</td><td class="date-col ex-val">24/09</td><td class="wide ex-val">${L("Eau de boisson","Drinking water")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Porcs B","Batch Pigs B")}</td><td class="date-col ex-val">24/06</td><td class="hour-col ex-val">09h00</td><td class="wide ex-val">PPA (Rouget)</td><td class="num ex-val">18</td><td class="date-col ex-val">24/12</td><td class="wide ex-val">${L("Injection sous-cutanée","Subcutaneous injection")}</td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  // Fiche Naissances
  const sheetNaissances = () => {
    const rows = Array(7).fill("").map(() => `<tr>
      <td class="entity"></td>
      <td class="wide"></td>
      <td class="date-col"></td>
      <td class="hour-col"></td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="wide"></td>
    </tr>`).join("");
    return `<section class="page">
  ${header(L("Fiche naissances","Birth sheet"))}
  <p class="hint">${L("Une ligne par mise bas. Écrire le nom ou le numéro d'oreille de la mère.","One row per birth. Write the mother name or ear tag.")}</p>
  <table><thead><tr>
    <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
    <th class="wide">${L("Mère (nom / N° oreille)","Mother (name / ear tag)")}</th>
    <th class="date-col">${L("Date","Date")}</th>
    <th class="hour-col">${L("Heure","Time")}</th>
    <th class="num">${L("Vivants M","Live M")}</th>
    <th class="num">${L("Vivants F","Live F")}</th>
    <th class="num">${L("Mort-nés","Stillborn")}</th>
    <th class="wide">${L("Observations","Notes")}</th>
  </tr></thead><tbody>${rows}</tbody></table>
  ${sign()}
  <div class="example-box">
    <div class="ex-title">${exTitle}</div>
    <table class="ex-table"><thead><tr>
      <th class="entity">${L("Lot / Animal","Batch / Animal")}</th>
      <th class="wide">${L("Mère (nom / N° oreille)","Mother (name / ear tag)")}</th>
      <th class="date-col">${L("Date","Date")}</th>
      <th class="hour-col">${L("Heure","Time")}</th>
      <th class="num">${L("Vivants M","Live M")}</th>
      <th class="num">${L("Vivants F","Live F")}</th>
      <th class="num">${L("Mort-nés","Stillborn")}</th>
      <th class="wide">${L("Observations","Notes")}</th>
    </tr></thead><tbody>
      <tr><td class="entity ex-val">${L("Lot Truies C","Sow Batch C")}</td><td class="wide ex-val">${L("Rose #042","Rose #042")}</td><td class="date-col ex-val">25/06</td><td class="hour-col ex-val">02h15</td><td class="num ex-val">6</td><td class="num ex-val">5</td><td class="num ex-val">1</td><td class="wide ex-val">${L("Mise bas assistée","Assisted birth")}</td></tr>
      <tr><td class="entity ex-val">${L("Lot Truies C","Sow Batch C")}</td><td class="wide ex-val">${L("Noire #019","Noire #019")}</td><td class="date-col ex-val">27/06</td><td class="hour-col ex-val">10h45</td><td class="num ex-val">4</td><td class="num ex-val">7</td><td class="num ex-val">0</td><td class="wide ex-val">${L("Mise bas normale","Normal birth")}</td></tr>
    </tbody></table>
  </div>
</section>`;
  };

  const pages = [
    sheetMortalite(),
    sheetAlimentation(),
    sheetProduction(),
    sheetSoins(),
    sheetVaccination(),
    sheetNaissances(),
  ].join("");

  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L("Fiches de terrain","Field sheets")} — ${esc(building.name)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 20mm 15mm; font-size: 13px; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 20px; margin: 0 0 3px; color: #0E6438; }
  .meta { color: #555; font-size: 12px; margin-bottom: 6px; }
  .week-line { font-size: 13px; margin-bottom: 10px; font-weight: 600; }
  .week-blank { display: inline-block; width: 90px; border-bottom: 1.5px solid #333; margin: 0 4px; vertical-align: bottom; }
  .hint { font-size: 11px; color: #666; margin: 4px 0 8px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #888; padding: 8px 7px; text-align: left; vertical-align: top; }
  th { background: #ddeedd; font-size: 11px; font-weight: 700; }
  td { min-height: 32px; height: 32px; }
  td.entity, th.entity { width: 18%; }
  td.day-col, th.day-col { width: 12%; }
  td.date-col, th.date-col { width: 12%; }
  td.wide, th.wide { width: 22%; }
  td.num, th.num { width: 7%; text-align: center; }
  td.hour-col, th.hour-col { width: 8%; text-align: center; }
  .sign { margin-top: 18px; font-size: 12px; color: #333; display: flex; gap: 40px; }
  .sign-line { display: inline-block; width: 160px; border-bottom: 1px solid #555; vertical-align: bottom; }
  .example-box { margin-top: 18px; border: 1px dashed #aaa; border-radius: 4px; padding: 8px 10px; background: #f9fdf9; }
  .ex-title { font-size: 11px; font-weight: 700; color: #0E6438; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  table.ex-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.ex-table th { background: #e8f3e8; font-size: 10px; padding: 4px 5px; border: 1px solid #bbb; }
  table.ex-table td { border: 1px solid #bbb; padding: 4px 5px; height: 22px; }
  td.ex-val { color: #1a6e2e; font-style: italic; }
  @media print { body { margin: 12mm 10mm; } .example-box { border-color: #ccc; } }
</style></head><body>
  ${pages}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(L("Autorisez les pop-ups pour imprimer les fiches.", "Allow pop-ups to print the sheets.")); return; }
  w.document.write(html);
  w.document.close();
};

// Ordre et couleurs d'affichage des catégories animales
const CATEGORY_ORDER = ["adulte", "cochette", "engraissement", "jeune", "inconnu"];
const CATEGORY_COLORS = {
  adulte: "var(--forest-700)",
  cochette: "var(--pertinence-700)",
  engraissement: "var(--clay-700)",
  jeune: "var(--autorite-700)",
  inconnu: "var(--fg-3)",
};

// Modal "Visualiser le bâtiment" : KPIs en lecture seule + bouton Modifier
const BuildingViewer = ({ building, lang, stats, onEdit, onClose, onViewInterior }) => {
  if (!building) return null;
  const meta = bldgMeta(building.type);
  const rate = building.occupancyRate ?? 0;
  const cap = building.capacity;
  const occ = building.occupancy ?? 0;
  const available = cap != null ? Math.max(0, cap - occ) : null;
  const sp = building.species ? speciesById(building.species) : null;
  const Kpi = ({ label, value, color, sub }) => (
    <div className="card" style={{ padding: "10px 12px", background: "var(--bg-sunken)" }}>
      <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: color || "var(--ink-950)", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const adultSub = (adult, totalSex) => totalSex > 0
    ? (lang === "fr" ? `dont ${adult} adulte${adult > 1 ? "s" : ""}` : `incl. ${adult} adult${adult > 1 ? "s" : ""}`)
    : null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 16, padding: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: meta.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={meta.icon} size={21} color={meta.text}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="overline" style={{ marginBottom: 2 }}>{lang === "fr" ? "Bâtiment" : "Building"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, color: "var(--ink-950)" }}>{building.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
              {[building.type, sp ? (lang === "fr" ? sp.fr : sp.en) : building.species, building.manager].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ padding: "4px 7px", flexShrink: 0 }}>
            <Icon name="x" size={14} color="var(--ink-600)"/>
          </button>
        </div>

        {/* Occupation */}
        {cap != null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, color: "var(--fg-2)" }}>
              <span>{lang === "fr" ? "Occupation" : "Occupancy"}</span>
              <span className="mono" style={{ fontWeight: 700, color: building.overCapacity ? "var(--oxblood-700)" : "var(--ink-800)" }}>{occ} / {cap} · {rate}%</span>
            </div>
            <BldgOccBar rate={rate} overCapacity={building.overCapacity}/>
            {building.overCapacity && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--oxblood-700)", fontWeight: 600 }}>{lang === "fr" ? "⚠ Surcapacité détectée" : "⚠ Over capacity detected"}</div>
            )}
          </div>
        )}

        {/* KPIs effectif */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
          <Kpi label={lang === "fr" ? "Total animaux" : "Total animals"} value={(stats.total).toLocaleString("fr-CA")}/>
          {available != null && <Kpi label={lang === "fr" ? "Places dispo." : "Available"} value={available.toLocaleString("fr-CA")} color="var(--forest-700)"/>}
          <Kpi label={lang === "fr" ? "Femelles" : "Females"} value={stats.female.toLocaleString("fr-CA")} color="var(--pertinence-700)" sub={adultSub(stats.femaleAdult, stats.female)}/>
          <Kpi label={lang === "fr" ? "Mâles" : "Males"} value={stats.male.toLocaleString("fr-CA")} color="var(--forest-700)" sub={adultSub(stats.maleAdult, stats.male)}/>
          <Kpi label={lang === "fr" ? "Malades" : "Sick"} value={stats.sick.toLocaleString("fr-CA")} color={stats.sick > 0 ? "var(--oxblood-700)" : "var(--ink-950)"}/>
          {stats.avgWeight != null && <Kpi label={lang === "fr" ? "Poids moyen" : "Avg weight"} value={`${stats.avgWeight.toFixed(1)} kg`}/>}
        </div>

        {/* Répartition par catégorie — cartes détaillées (valeur + % + pastille couleur) */}
        {CATEGORY_ORDER.some((c) => (stats.categories[c] || 0) > 0) && (
          <div>
            <div className="overline" style={{ marginBottom: 6 }}>{lang === "fr" ? "Par catégorie" : "By category"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              {CATEGORY_ORDER.filter((c) => (stats.categories[c] || 0) > 0).map((c) => {
                const val = stats.categories[c];
                const pct = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
                const col = CATEGORY_COLORS[c];
                return (
                  <div key={c} className="card" style={{ padding: "10px 12px", background: "var(--bg-sunken)", borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }}/>
                      <span style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, lineHeight: 1.25 }}>{lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: col }}>{val.toLocaleString("fr-CA")}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{pct}%</span>
                    </div>
                    {/* Prêts à abattre / en retard (uniquement sur la carte Engraissement) */}
                    {c === "engraissement" && (stats.slaughter.pret > 0 || stats.slaughter.retard > 0) && (
                      <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                        {stats.slaughter.pret > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--forest-700)" }}>
                            ✓ {stats.slaughter.pret} {lang === "fr" ? "prêt(s) à abattre" : "ready"}
                          </span>
                        )}
                        {stats.slaughter.retard > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--oxblood-700)" }}>
                            ⚠ {stats.slaughter.retard} {lang === "fr" ? "en retard (coût net)" : "overdue"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lots */}
        {stats.lots.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span className="overline">{lang === "fr" ? "Lots" : "Batches"}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
                {stats.lots.length} {lang === "fr" ? "lot(s)" : "batch(es)"} · {stats.lotTotal.toLocaleString("fr-CA")} {lang === "fr" ? "animaux" : "animals"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stats.lots.map((l) => (
                <div key={l.name} className="card" style={{ padding: "8px 11px", background: "var(--bg-sunken)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-800)", flexShrink: 0 }}>
                      {l.count.toLocaleString("fr-CA")} · ♀{l.female} ♂{l.male}
                    </span>
                  </div>
                  {/* Répartition du lot par catégorie */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {["adulte", "cochette", "engraissement", "jeune", "inconnu"].filter((c) => (l.categories[c] || 0) > 0).map((c) => (
                      <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--fg-2)", background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 14, padding: "2px 8px" }}>
                        {lang === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}
                        <strong className="mono" style={{ color: "var(--ink-900)" }}>{l.categories[c]}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs env */}
        {(building.temperature != null || building.humidity != null || building.hygieneStatus) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {building.temperature != null && <Kpi label={lang === "fr" ? "Temp." : "Temp."} value={`${building.temperature}°C`}/>}
            {building.humidity != null && <Kpi label={lang === "fr" ? "Humidité" : "Humidity"} value={`${building.humidity}%`}/>}
            {building.hygieneStatus && (
              <div className="card" style={{ padding: "10px 12px", background: "var(--bg-sunken)" }}>
                <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Hygiène" : "Hygiene"}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-800)", marginTop: 6 }}>{building.hygieneStatus}</div>
              </div>
            )}
          </div>
        )}

        {/* Plan intérieur */}
        {onViewInterior && (
          <button className="btn btn-sm" onClick={() => onViewInterior(building)}
            style={{ background: "rgba(14,100,56,0.06)", border: "1.5px solid rgba(14,100,56,0.2)", color: "var(--forest-800)", fontWeight: 700, gap: 7, justifyContent: "center" }}>
            <Icon name="grid" size={13} color="var(--forest-700)"/>
            {lang === "fr" ? "Plan intérieur" : "Interior layout"}
          </button>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>{lang === "fr" ? "Fermer" : "Close"}</button>
          <button className="btn btn-sm" onClick={() => printBuildingReport(building, stats, lang)} style={{ gap: 6 }}>
            <Icon name="report" size={12} color="var(--ink-700)"/>
            {lang === "fr" ? "Rapport" : "Report"}
          </button>
          <button className="btn btn-sm" onClick={() => printFieldSheets(building, stats, lang)} style={{ gap: 6 }}>
            <Icon name="report" size={12} color="var(--ink-700)"/>
            {lang === "fr" ? "Fiches terrain" : "Field sheets"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={onEdit} style={{ gap: 6 }}>
            <Icon name="edit" size={12} color="#ECF1EC"/>
            {lang === "fr" ? "Modifier" : "Edit"}
          </button>
        </div>
      </div>
    </div>
  );
};

const BldgDetail = ({ building, lang, femaleCount = 0, maleCount = 0, onEdit, onClose, onViewInterior }) => {
  if (!building) return (
    <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 240, color: "var(--fg-3)" }}>
      <Icon name="building" size={28} color="var(--ink-300)"/>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-400)" }}>
        {lang === "fr" ? "Sélectionnez un bâtiment" : "Select a building"}
      </div>
    </div>
  );
  const meta = bldgMeta(building.type);
  const rate = building.occupancyRate ?? 0;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={meta.icon} size={19} color={meta.text}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink-950)" }}>{building.name}</div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
            {[building.type, building.species, building.manager].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ padding: "4px 7px", flexShrink: 0 }}>
          <Icon name="x" size={13} color="var(--ink-600)"/>
        </button>
      </div>

      {/* Occupation */}
      {building.capacity && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, color: "var(--fg-2)" }}>
            <span>{lang === "fr" ? "Occupation" : "Occupancy"}</span>
            <span className="mono" style={{ fontWeight: 700, color: building.overCapacity ? "var(--oxblood-700)" : "var(--ink-800)" }}>
              {building.occupancy ?? 0} / {building.capacity} · {rate}%
            </span>
          </div>
          <BldgOccBar rate={rate} overCapacity={building.overCapacity}/>
          {building.overCapacity && (
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--oxblood-700)", fontWeight: 600 }}>
              {lang === "fr" ? "⚠ Surcapacité détectée" : "⚠ Over capacity detected"}
            </div>
          )}
        </div>
      )}

      {/* Répartition mâle / femelle */}
      {(femaleCount > 0 || maleCount > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="card" style={{ padding: "8px 10px", background: "var(--bg-sunken)" }}>
            <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Femelles" : "Females"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--pertinence-700)", marginTop: 2 }}>{femaleCount.toLocaleString("fr-CA")}</div>
          </div>
          <div className="card" style={{ padding: "8px 10px", background: "var(--bg-sunken)" }}>
            <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Mâles" : "Males"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--forest-700)", marginTop: 2 }}>{maleCount.toLocaleString("fr-CA")}</div>
          </div>
        </div>
      )}

      {/* KPIs env */}
      {(building.temperature != null || building.humidity != null || building.hygieneStatus) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {building.temperature != null && (
            <div className="card" style={{ padding: "8px 10px", background: "var(--bg-sunken)" }}>
              <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Temp." : "Temp."}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--ink-950)", marginTop: 2 }}>{building.temperature}°C</div>
            </div>
          )}
          {building.humidity != null && (
            <div className="card" style={{ padding: "8px 10px", background: "var(--bg-sunken)" }}>
              <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Humidité" : "Humidity"}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--ink-950)", marginTop: 2 }}>{building.humidity}%</div>
            </div>
          )}
          {building.hygieneStatus && (
            <div className="card" style={{ padding: "8px 10px", background: "var(--bg-sunken)" }}>
              <div style={{ fontSize: 9.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{lang === "fr" ? "Hygiène" : "Hygiene"}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-800)", marginTop: 4 }}>{building.hygieneStatus}</div>
            </div>
          )}
        </div>
      )}

      {/* Interior plan button */}
      <button className="btn btn-sm" onClick={() => onViewInterior && onViewInterior(building)}
        style={{ background: "rgba(14,100,56,0.06)", border: "1.5px solid rgba(14,100,56,0.2)", color: "var(--forest-800)", fontWeight: 700, gap: 7, justifyContent: "center" }}>
        <Icon name="grid" size={13} color="var(--forest-700)"/>
        {lang === "fr" ? "Plan intérieur" : "Interior layout"}
      </button>

      {/* Actions */}
      <div style={{ display: "flex", gap: 7 }}>
        <button className="btn btn-sm" style={{ flex: 1 }} onClick={onEdit}>
          <Icon name="edit" size={12} color="var(--ink-700)"/>
          {lang === "fr" ? "Modifier" : "Edit"}
        </button>
        <button className="btn btn-sm" style={{ flex: 1 }}>
          <Icon name="layers" size={12} color="var(--ink-700)"/>
          {lang === "fr" ? "Animaux" : "Animals"}
        </button>
        <button className="btn btn-sm btn-primary" style={{ flex: 1 }}>
          <Icon name="pulse" size={12} color="#ECF1EC"/>
          {lang === "fr" ? "Santé" : "Health"}
        </button>
      </div>
    </div>
  );
};

const BuildingsScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [rows, setRows] = React.useState([]);
  const [zones, setZones] = React.useState([]);
  const [farms, setFarms] = React.useState([]);
  const [animals, setAnimals] = React.useState([]);
  const [farmId, setFarmId] = React.useState(null); // null = toutes les fermes
  const [editing, setEditing] = React.useState(null); // building | "new" | null
  const [reloadKey, setReloadKey] = React.useState(0);
  const [viewMode, setViewMode] = React.useState("zones"); // "zones" | "plan" | "cards"
  const [selectedId, setSelectedId] = React.useState(null);
  const [viewing, setViewing] = React.useState(null); // building en cours de visualisation (modal)
  const [interiorBuilding, setInteriorBuilding] = React.useState(null);
  const [features, setFeatures] = React.useState([]);
  const [planEdit, setPlanEdit] = React.useState(false);
  const [planZoneId, setPlanZoneId] = React.useState(null); // null = sans zone / toutes
  const [planDisplay, setPlanDisplay] = React.useState("occupation"); // "occupation" | "simple"
  const refresh = useDataRefresh(["buildings", "animals", "land-features"]);
  React.useEffect(() => {
    let cancel = false;
    Promise.all([
      api.listBuildings().catch(() => []),
      api.listZones().catch(() => []),
      api.listLandFeatures().catch(() => []),
      api.listFarms().catch(() => []),
      api.listAnimals().catch(() => []),
    ]).then(([b, z, f, fm, an]) => { if (!cancel) { setRows(Array.isArray(b) ? b : []); setZones(Array.isArray(z) ? z : []); setFeatures(Array.isArray(f) ? f : []); setFarms(Array.isArray(fm) ? fm : []); setAnimals(Array.isArray(an) ? an : []); } });
    return () => { cancel = true; };
  }, [reloadKey, refresh]);
  // Persistance d'un déplacement sur le plan (bâtiment ou élément de terrain)
  const persistPlan = React.useCallback((kind, id, x, y) => {
    if (kind === "building") {
      setRows((rs) => rs.map((b) => (b.id === id ? { ...b, posX: x, posY: y } : b)));
      api.updateBuilding(id, { pos_x: x, pos_y: y }).catch(() => {});
    } else {
      setFeatures((fs) => fs.map((f) => (f.id === id ? { ...f, posX: x, posY: y } : f)));
      api.updateLandFeature(id, { pos_x: x, pos_y: y }).catch(() => {});
    }
  }, []);
  // Ajouter un élément de décor au plan (zone courante), centré
  const addFeature = React.useCallback((type) => {
    const labels = { field: "Champ", water: "Point d'eau", road: "Route", pasture: "Pâturage" };
    const body = { zone_id: planZoneId, type, label: labels[type] || type, pos_x: 40, pos_y: 40 };
    api.createLandFeature(body).then((r) => {
      setFeatures((fs) => [...fs, { id: r.id, zoneId: planZoneId, type, label: body.label, posX: 40, posY: 40, width: null, height: null }]);
    }).catch(() => {});
  }, [planZoneId]);
  const removeFeature = React.useCallback((id) => {
    setFeatures((fs) => fs.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
    api.deleteLandFeature(id).catch(() => {});
  }, [selectedId]);
  // Zones de la ferme sélectionnée (null = toutes)
  const farmZoneIds = farmId ? new Set(zones.filter((z) => z.farmId === farmId).map((z) => z.id)) : null;
  const filtered = rows.filter((b) =>
    (!speciesFilter || b.species === speciesFilter) &&
    (!farmZoneIds || (b.zoneId && farmZoneIds.has(b.zoneId))));
  const selectedBuilding = filtered.find(b => b.id === selectedId) || null;
  const bldgAnimalCounts = React.useMemo(() => bldgAnimalStats(selectedBuilding, animals), [selectedBuilding, animals]);
  const viewingStats = React.useMemo(() => bldgAnimalStats(viewing, animals), [viewing, animals]);
  // Compteurs par ferme (bâtiments + occupation animaux)
  const farmStats = (fmId) => {
    const zids = new Set(zones.filter((z) => z.farmId === fmId).map((z) => z.id));
    const bs = rows.filter((b) => b.zoneId && zids.has(b.zoneId));
    return { buildings: bs.length, animals: bs.reduce((s, b) => s + (b.occupancy ?? 0), 0) };
  };
  // Grouper par zone pour la vue zones
  const noZone = filtered.filter((b) => !b.zoneId);
  const byZone = zones.map((z) => ({ zone: z, buildings: filtered.filter((b) => b.zoneId === z.id) })).filter((g) => g.buildings.length > 0);
  if (noZone.length) byZone.push({ zone: null, buildings: noZone });
  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Bâtiments · Buildings" : "Buildings · Bâtiments"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
            {lang === "fr" ? <>Bâtiments & <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>occupation</span></> : <>Buildings & <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>occupancy</span></>}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[
              { id: "zones", icon: "layers", fr: "Zones",  en: "Zones" },
              { id: "plan",  icon: "grid",   fr: "Plan",   en: "Map" },
              { id: "cards", icon: "barn",   fr: "Cartes", en: "Cards" },
            ].map((v) => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={viewMode === v.id ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"}
                style={{ gap: 5, padding: "5px 12px" }}>
                <Icon name={v.icon} size={12} color={viewMode === v.id ? "#ECF1EC" : "var(--ink-700)"}/>
                {lang === "fr" ? v.fr : v.en}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={13} color="#FBF8F2"/>
            {lang === "fr" ? "Nouveau bâtiment" : "New building"}
          </button>
        </div>
      </div>

      {/* Sélecteur de ferme (Mes fermes) — scroll horizontal sur mobile */}
      {farms.length > 0 && (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
          {[{ id: null, name: lang === "fr" ? "Toutes les fermes" : "All farms", all: true }, ...farms].map((f) => {
            const active = farmId === (f.all ? null : f.id);
            const st = f.all ? null : farmStats(f.id);
            const badge = { active: { fr: "Principale", bg: "var(--forest-50)", fg: "var(--forest-700)" }, ok: { fr: "OK", bg: "var(--autorite-50)", fg: "var(--autorite-700)" }, maintenance: { fr: "Suivi", bg: "var(--oxblood-50)", fg: "var(--oxblood-700)" } }[f.status] || null;
            return (
              <button key={f.id ?? "all"} onClick={() => { setFarmId(f.all ? null : f.id); setSelectedId(null); }}
                className="card" style={{ textAlign: "left", padding: f.all ? "10px 14px" : "12px 14px", minWidth: f.all ? 0 : 180, flexShrink: 0, cursor: "pointer", border: active ? "2px solid var(--forest-700)" : "1px solid var(--border-2)", background: active ? "var(--forest-50)" : "var(--paper)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)" }}>{f.name}</span>
                  {badge && <span style={{ fontSize: 9, fontWeight: 700, color: badge.fg, background: badge.bg, borderRadius: 4, padding: "1px 6px" }}>{badge.fr}</span>}
                </div>
                {!f.all && (
                  <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 4 }}>
                    {[f.location, f.hectares ? `${f.hectares} ha` : null].filter(Boolean).join(" · ")}
                    {st && <span style={{ marginLeft: 6, color: "var(--fg-2)" }} className="mono">{st.buildings} {lang === "fr" ? "bât." : "bld."} · {st.animals} {lang === "fr" ? "anim." : "ani."}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Species filter */}
      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      {filtered.length === 0 ? (
        <EmptyState lang={lang} title={lang === "fr" ? "Aucun bâtiment" : "No building"} hint={lang === "fr" ? "Ajoute un bâtiment pour suivre capacité et occupation." : "Add a building to track capacity and occupancy."}/>
      ) : viewMode === "zones" ? (
        /* ── Vue Zones ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {byZone.map(({ zone, buildings: zb }) => (
            <div key={zone?.id ?? "no-zone"}>
              {/* En-tête de zone */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Icon name="layers" size={14} color="var(--forest-700)"/>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>
                  {zone ? zone.name : (lang === "fr" ? "Sans zone" : "No zone")}
                </span>
                {zone?.description && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>— {zone.description}</span>}
                <span style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>{zb.length} {lang === "fr" ? "bâtiment(s)" : "building(s)"}</span>
              </div>
              {/* Bâtiments de cette zone */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                {zb.map((b) => {
                  const rate = b.occupancyRate ?? 0;
                  const meta = bldgMeta(b.type);
                  const sp = speciesById(b.species);
                  return (
                    <div key={b.id} className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer", border: `1px solid ${meta.border}` }}
                      onClick={() => setViewing(b)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {sp && <div style={{ width: 28, height: 28, borderRadius: 7, background: sp.accentBg, color: sp.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <AnimalGlyph kind={sp.glyph} size={15} color="currentColor"/>
                        </div>}
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                        {b.overCapacity && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--oxblood-700)", background: "var(--oxblood-50)", borderRadius: 4, padding: "1px 5px" }}>!</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{[b.type, b.species ? (lang === "fr" ? (speciesById(b.species)?.fr ?? b.species) : (speciesById(b.species)?.en ?? b.species)) : null].filter(Boolean).join(" · ") || "—"}</div>
                      {b.capacity != null && <BldgOccBar rate={rate} overCapacity={b.overCapacity} compact/>}
                      <div style={{ fontSize: 11, color: "var(--fg-2)" }} className="mono">{b.occupancy}{b.capacity ? ` / ${b.capacity}` : ""}  {rate != null && b.capacity ? `· ${rate}%` : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "plan" ? (
        /* ── Vue Plan ── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
            {/* En-tête façon maquette : Ferme — Plan du terrain */}
            {(() => {
              const farm = farmId ? farms.find((f) => f.id === farmId) : null;
              const st = farmId ? farmStats(farmId) : { buildings: filtered.length, animals: filtered.reduce((s, b) => s + (b.occupancy ?? 0), 0) };
              return (
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink-900)" }}>
                      {farm ? `${farm.name} — ` : ""}{lang === "fr" ? "Plan du terrain" : "Land plan"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }} className="mono">
                      {[farm?.hectares ? `${farm.hectares} ha` : null, `${st.buildings} ${lang === "fr" ? "bâtiments" : "buildings"}`, `${st.animals} ${lang === "fr" ? "animaux" : "animals"}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {/* Toggle affichage : occupation / simple */}
                  <div style={{ display: "flex", background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 8, padding: 3, gap: 2 }}>
                    {[{ id: "occupation", fr: "Occupation", en: "Occupancy" }, { id: "simple", fr: "Simple", en: "Simple" }].map((d) => (
                      <button key={d.id} onClick={() => setPlanDisplay(d.id)}
                        className={planDisplay === d.id ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"} style={{ padding: "4px 11px" }}>
                        {lang === "fr" ? d.fr : d.en}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Barre plan : zone + mode édition */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select value={planZoneId ?? ""} onChange={(e) => { setPlanZoneId(e.target.value ? Number(e.target.value) : null); setSelectedId(null); }}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--paper)", fontSize: 13 }}>
                <option value="">{lang === "fr" ? "Sans zone" : "No zone"}</option>
                {zones.filter((z) => !farmZoneIds || farmZoneIds.has(z.id)).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <button className={planEdit ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"} onClick={() => setPlanEdit((v) => !v)} style={{ gap: 5 }}>
                <Icon name={planEdit ? "check" : "edit"} size={12} color={planEdit ? "#ECF1EC" : "var(--ink-700)"}/>
                {planEdit ? (lang === "fr" ? "Terminer" : "Done") : (lang === "fr" ? "Éditer le plan" : "Edit plan")}
              </button>
              {planEdit && <>
                <span style={{ width: 1, height: 18, background: "var(--border-2)" }}/>
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Ajouter :" : "Add:"}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => addFeature("field")}>🌾 {lang === "fr" ? "Champ" : "Field"}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => addFeature("water")}>💧 {lang === "fr" ? "Eau" : "Water"}</button>
                <button className="btn btn-sm btn-ghost" onClick={() => addFeature("road")}>🛤 {lang === "fr" ? "Route" : "Road"}</button>
                {features.some((f) => f.id === selectedId) && (
                  <button className="btn btn-sm btn-ghost" style={{ color: "var(--oxblood-700)" }} onClick={() => removeFeature(selectedId)}>
                    <Icon name="trash" size={12} color="var(--oxblood-700)"/> {lang === "fr" ? "Supprimer" : "Delete"}
                  </button>
                )}
              </>}
            </div>
            <FarmLandPlan
              buildings={filtered.filter((b) => (planZoneId ? b.zoneId === planZoneId : !b.zoneId))}
              features={features.filter((f) => (planZoneId ? f.zoneId === planZoneId : !f.zoneId))}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              editMode={planEdit}
              onPersist={persistPlan}
              display={planDisplay}
              lang={lang}
            />
            {/* Légende par catégorie (espèce / type de bâtiment) */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {(() => {
                const cats = new Map();
                filtered.forEach((b) => {
                  const sp = b.species ? speciesById(b.species) : null;
                  const label = sp ? (lang === "fr" ? sp.fr : sp.en) : (b.buildingKind ? { habitation: lang === "fr" ? "Habitation" : "Housing", stock: "Stock", sante: lang === "fr" ? "Santé" : "Health" }[b.buildingKind] || b.buildingKind : (lang === "fr" ? "Autre" : "Other"));
                  const color = sp ? sp.accent : "var(--fg-3)";
                  if (!cats.has(label)) cats.set(label, color);
                });
                return [...cats.entries()].map(([label, color]) => (
                  <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-2)", background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 20, padding: "3px 11px" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }}/>{label}
                  </span>
                ));
              })()}
            </div>
            {/* Mini cards grid below the map */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {filtered.map((b) => {
                const rate = b.occupancyRate ?? 0;
                const meta = bldgMeta(b.type);
                const isSelected = selectedId === b.id;
                return (
                  <button key={b.id}
                    onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    style={{ background: isSelected ? "var(--paper)" : meta.bg, border: `2px solid ${isSelected ? "var(--forest-700)" : meta.border}`, borderRadius: 9, padding: "12px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, boxShadow: isSelected ? "0 0 0 3px rgba(14,100,56,0.15)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name={meta.icon} size={15} color={meta.text}/>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-900)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      {b.overCapacity && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--oxblood-700)", background: "var(--oxblood-50)", borderRadius: 4, padding: "1px 5px" }}>!</span>}
                    </div>
                    {b.capacity && <BldgOccBar rate={rate} overCapacity={b.overCapacity} compact/>}
                    <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{[b.type, b.species].filter(Boolean).join(" · ") || "—"}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Detail panel */}
          <div style={{ overflow: "auto" }}>
            <BldgDetail
              building={selectedBuilding}
              lang={lang}
              femaleCount={bldgAnimalCounts.female}
              maleCount={bldgAnimalCounts.male}
              onEdit={() => setEditing(selectedBuilding)}
              onClose={() => setSelectedId(null)}
              onViewInterior={setInteriorBuilding}
            />
          </div>
        </div>
      ) : (
        /* ── Vue Cartes ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map((b) => {
            const rate = b.occupancyRate;
            return (
              <div key={b.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }} onClick={() => setViewing(b)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 }}>{b.name}</div>
                  {b.overCapacity && <span className="tag tag-danger" style={{ fontSize: 9.5 }}>{lang === "fr" ? "Surcapacité" : "Over capacity"}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{[b.type, b.species, b.manager].filter(Boolean).join(" · ") || "—"}</div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--fg-2)" }}>{lang === "fr" ? "Occupation" : "Occupancy"}</span>
                    <span className="mono">{b.occupancy}{b.capacity ? ` / ${b.capacity}` : ""}{rate != null ? ` · ${rate}%` : ""}</span>
                  </div>
                  <BldgOccBar rate={rate ?? 0} overCapacity={b.overCapacity}/>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--fg-2)" }}>
                  {b.temperature != null && <span>🌡 {b.temperature}°C</span>}
                  {b.humidity != null && <span>💧 {b.humidity}%</span>}
                  {b.hygieneStatus && <span>{b.hygieneStatus}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {viewing && (
        <BuildingViewer building={viewing} lang={lang} stats={viewingStats}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onClose={() => setViewing(null)}
          onViewInterior={(b) => { setInteriorBuilding(b); setViewing(null); }}/>
      )}
      {editing && (
        <BuildingEditor lang={lang} building={editing === "new" ? null : editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setReloadKey((k) => k + 1); }}/>
      )}
      {interiorBuilding && (
        <BldgInteriorPlan building={interiorBuilding} animals={animals} lang={lang} onClose={() => setInteriorBuilding(null)}/>
      )}
    </div>
  );
};

const BuildingEditorField = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
    <span className="overline" style={{ fontSize: 10 }}>{label}</span>
    {children}
  </label>
);

const BuildingEditor = ({ lang, building, onClose, onSaved }) => {
  const [form, setForm] = React.useState(() => building
    ? { name: building.name || "", zone_id: building.zoneId ? String(building.zoneId) : "", species: building.species || "", type: building.type || "", capacity: building.capacity ?? "", temperature: building.temperature ?? "", humidity: building.humidity ?? "", manager: building.manager || "", hygiene_status: building.hygieneStatus || "" }
    : { name: "", zone_id: "", species: "", type: "", capacity: "", temperature: "", humidity: "", manager: "", hygiene_status: "" });
  const [zones, setZones] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  React.useEffect(() => { api.listZones().then((z) => setZones(Array.isArray(z) ? z : [])).catch(() => {}); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const inputStyle = { padding: "7px 9px", borderRadius: 6, border: "1px solid var(--border-1)", background: "var(--paper)", fontSize: 13, width: "100%" };
  const save = async () => {
    if (!form.name.trim()) { setErr(lang === "fr" ? "Nom requis." : "Name required."); return; }
    setBusy(true); setErr(null);
    try {
      const payload = { name: form.name.trim(), zone_id: form.zone_id ? Number(form.zone_id) : null, species: form.species || null, type: form.type || null, capacity: num(form.capacity), temperature: num(form.temperature), humidity: num(form.humidity), manager: form.manager || null, hygiene_status: form.hygiene_status || null };
      if (building?.id) await api.updateBuilding(building.id, payload);
      else await api.createBuilding(payload);
      onSaved();
    } catch (e) { setErr((lang === "fr" ? "Échec : " : "Failed: ") + (e.message || e)); } finally { setBusy(false); }
  };
  const del = async () => { if (!building?.id) return; try { await api.deleteBuilding(building.id); onSaved(); } catch (e) { setErr(e.message); } };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 20, display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="overline">{building ? (lang === "fr" ? "Modifier le bâtiment" : "Edit building") : (lang === "fr" ? "Nouveau bâtiment" : "New building")}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
        </div>
        <BuildingEditorField label={lang === "fr" ? "Nom" : "Name"}><input value={form.name} onChange={set("name")} style={inputStyle}/></BuildingEditorField>
        <BuildingEditorField label={lang === "fr" ? "Zone (lieu)" : "Zone (location)"}>
          <select value={form.zone_id} onChange={set("zone_id")} style={inputStyle}>
            <option value="">{lang === "fr" ? "— Sans zone —" : "— No zone —"}</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </BuildingEditorField>
        <div style={{ display: "flex", gap: 8 }}>
          <BuildingEditorField label={lang === "fr" ? "Espèce" : "Species"}>
            <select value={form.species} onChange={set("species")} style={inputStyle}>
              <option value="">—</option>
              {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </BuildingEditorField>
          <BuildingEditorField label={lang === "fr" ? "Type" : "Type"}><input value={form.type} onChange={set("type")} placeholder={lang === "fr" ? "Étable, poulailler…" : "Barn, henhouse…"} style={inputStyle}/></BuildingEditorField>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BuildingEditorField label={lang === "fr" ? "Capacité" : "Capacity"}><input type="number" value={form.capacity} onChange={set("capacity")} style={inputStyle}/></BuildingEditorField>
          <BuildingEditorField label={lang === "fr" ? "Température °C" : "Temperature °C"}><input type="number" step="0.1" value={form.temperature} onChange={set("temperature")} style={inputStyle}/></BuildingEditorField>
          <BuildingEditorField label={lang === "fr" ? "Humidité %" : "Humidity %"}><input type="number" step="0.1" value={form.humidity} onChange={set("humidity")} style={inputStyle}/></BuildingEditorField>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <BuildingEditorField label={lang === "fr" ? "Responsable" : "Manager"}><input value={form.manager} onChange={set("manager")} style={inputStyle}/></BuildingEditorField>
          <BuildingEditorField label={lang === "fr" ? "Hygiène" : "Hygiene"}>
            <select value={form.hygiene_status} onChange={set("hygiene_status")} style={inputStyle}>
              <option value="">—</option>
              <option value="clean">{lang === "fr" ? "Propre" : "Clean"}</option>
              <option value="ok">{lang === "fr" ? "Correct" : "OK"}</option>
              <option value="needs_cleaning">{lang === "fr" ? "À nettoyer" : "Needs cleaning"}</option>
            </select>
          </BuildingEditorField>
        </div>
        {err && <div style={{ color: "var(--oxblood-700)", fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 6 }}>
          {building?.id && <button className="btn btn-sm btn-ghost" onClick={del} style={{ color: "var(--oxblood-700)" }}>{lang === "fr" ? "Supprimer" : "Delete"}</button>}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-primary" onClick={save} disabled={busy}><Icon name="check" size={13} color="#FBF8F2"/>{lang === "fr" ? "Enregistrer" : "Save"}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Prévisionnel FarmOS ────────────────────────────────────────────────────
// Réutilise le moteur forecast backend2 avec scope "farmos" : ventes élevage
// (tendance) + projection de production (œufs/naissances). Copie adaptée du
// composant compta/domus (pas de code partagé entre apps : builds Vite isolés).
const FC_HORIZONS = [
  { v: 1, label: "1 mois" }, { v: 3, label: "3 mois" }, { v: 6, label: "6 mois" },
  { v: 12, label: "1 an" }, { v: 24, label: "2 ans" }, { v: 36, label: "3 ans" },
];
const FC_LOOKBACKS = [
  { v: 3, label: "3 mois" }, { v: 6, label: "6 mois" }, { v: 12, label: "12 mois" },
];
const FC_MODES = [
  { v: "prudent", label: "Prudent", hint: "confirmé seulement", enabled: true },
  { v: "realiste", label: "Réaliste", hint: "tendance historique", enabled: true },
  { v: "optimiste", label: "Optimiste", hint: "+ IA (à venir)", enabled: false },
];
const fcNf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fcPctNf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const fcSigned = (v) => (v > 0 ? "+" : "") + fcNf.format(Math.round(Number(v || 0)));
const fcSignedPct = (v) => `${Number(v || 0) > 0 ? "+" : ""}${fcPctNf.format(Number(v || 0))}%`;
function fcMonth(key) {
  const [y, m] = key.split("-");
  const names = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  return `${names[Number(m) - 1]} ${y}`;
}
function fcSeries(months) {
  const byCur = new Map();
  for (const m of months) {
    for (const c of m.currencies) {
      const key = String(c.currencyId ?? "null");
      const code = c.currencyCode || c.currencySymbol || "?";
      const entry = byCur.get(key) || { code, points: [] };
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
function FcChart({ serie }) {
  const pts = serie.points || [];
  if (pts.length < 2) return <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "12px 0" }}>Pas assez de points pour tracer une courbe.</div>;
  const labels = pts.map((p) => fcMonth(p.month));
  const values = pts.map((p) => Number(p.cumul || 0));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return (
    <MaterialLineChart
      type="area"
      height={190}
      labels={labels}
      min={min}
      max={max}
      series={[{ name: serie.code, data: values, color: "var(--forest-700)" }]}
      colors={["var(--forest-700)"]}
      formatter={(v) => `${fcSigned(v)} ${serie.code}`}
    />
  );
}
// Courbe du cheptel projeté (têtes) avec cône d'incertitude (headLow/headHigh).
// `current` = effectif réel, ajouté en point de départ (trait plein → projection).
function FcHeadChart({ points, current, L = (fr, en) => fr }) {
  const chartPoints = (points || []).map((p) => ({ ...p, label: fcMonth(p.month) }));
  if (chartPoints.length < 1) return <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "12px 0" }}>Pas assez de points pour tracer une courbe.</div>;
  const forecastLast = chartPoints[chartPoints.length - 1];
  const forecastHead = Number(forecastLast?.head ?? current ?? 0);
  const forecastLow = Number(forecastLast?.headLow ?? forecastHead);
  const forecastHigh = Number(forecastLast?.headHigh ?? forecastHead);

  return (
    <div style={{ width: "100%", overflowX: "auto", paddingBottom: 2 }}>
      <div style={{ minWidth: 640 }}>
        <div style={{ position: "relative" }}>
          <div className="overline" style={{ color: "var(--fg-3)", marginBottom: 4 }}>{L("EFFECTIF PREVU", "PROJECTED HEADCOUNT")}</div>
          <div style={{
            position: "absolute", top: 16, right: 10, zIndex: 2, minWidth: 134,
            background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8,
            padding: "9px 11px", boxShadow: "0 14px 34px rgba(14,36,24,0.12)", pointerEvents: "none",
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: "var(--fg-3)", textTransform: "uppercase" }}>{L("PREVU", "PROJECTED")}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
              <span className="tnum" style={{ fontSize: 24, lineHeight: 1, fontWeight: 800, color: "var(--ink-950)" }}>{fcNf.format(Math.round(forecastHead))}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)" }}>{L("têtes", "head")}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{fcNf.format(Math.round(forecastLow))}-{fcNf.format(Math.round(forecastHigh))}</div>
          </div>
          <MaterialForecastHeadChart points={chartPoints} current={current} L={L} height={205}/>
        </div>
        <div className="overline" style={{ color: "var(--fg-3)", marginTop: 2, marginBottom: 0 }}>{L("FLUX MENSUELS", "MONTHLY DRIVERS")}</div>
        <MaterialDriverBarChart points={chartPoints} L={L} height={112}/>
      </div>
    </div>
  );

}
function FcSeg({ active, disabled, onClick, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        border: active ? 0 : "1px solid var(--border-1)",
        background: active ? "var(--forest-700)" : "var(--paper)",
        color: active ? "var(--paper)" : "var(--fg-2)",
      }}>{children}</button>
  );
}
function FcMiniMetric({ icon, label, value, sub, tone = "neutral" }) {
  const color =
    tone === "good" ? "var(--forest-700)" :
    tone === "bad" ? "var(--oxblood-700)" :
    tone === "warn" ? "#a85a2a" :
    "var(--ink-950)";
  return (
    <div style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-1)", borderRadius: 8, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--fg-3)", marginBottom: 5 }}>
        {icon && <Icon name={icon} size={13} color="currentColor"/>}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", lineHeight: 1.2 }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}
function FcFormulaStep({ label, value, tone = "neutral" }) {
  const color =
    tone === "plus" ? "var(--forest-700)" :
    tone === "minus" ? "var(--oxblood-700)" :
    "var(--ink-950)";
  return (
    <div style={{ minWidth: 112, flex: "1 1 112px", border: "1px solid var(--border-1)", borderRadius: 8, padding: "9px 10px", background: "var(--paper)" }}>
      <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, lineHeight: 1.25 }}>{label}</div>
      <div className="tnum" style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
function FcHerdRows({ points, L }) {
  const rows = points.length > 12
    ? [...points.slice(0, 6), { gap: true, month: "gap" }, ...points.slice(-3)]
    : points;
  const cell = { padding: "8px 10px", borderBottom: "1px solid var(--border-1)", whiteSpace: "nowrap" };
  const num = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 }}>
        <thead>
          <tr style={{ background: "var(--bg-sunken)", color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10, fontWeight: 700 }}>
            <th style={{ ...cell, textAlign: "left" }}>{L("Mois", "Month")}</th>
            <th style={num}>{L("Naiss.", "Births")}</th>
            <th style={num}>{L("Mortalité", "Mortality")}</th>
            <th style={num}>{L("Sorties", "Exits")}</th>
            <th style={num}>{L("Solde", "Net")}</th>
            <th style={num}>{L("Cheptel prévu", "Projected herd")}</th>
            <th style={num}>{L("Fourchette", "Range")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            if (p.gap) {
              return (
                <tr key="gap">
                  <td colSpan={7} style={{ ...cell, textAlign: "center", color: "var(--fg-3)", fontSize: 11 }}>
                    {L("Mois intermédiaires masqués", "Intermediate months hidden")}
                  </td>
                </tr>
              );
            }
            const net = Number(p.births || 0) - Number(p.deaths || 0) - Number(p.exits || 0);
            return (
              <tr key={`${p.month}-${i}`}>
                <td style={{ ...cell, textAlign: "left", color: "var(--fg-2)", fontWeight: 700 }}>{fcMonth(p.month)}</td>
                <td style={{ ...num, color: "var(--forest-700)" }}>{fcSigned(p.births)}</td>
                <td style={{ ...num, color: Number(p.deaths || 0) > 0 ? "var(--oxblood-700)" : "var(--fg-3)" }}>{Number(p.deaths || 0) > 0 ? "-" : ""}{fcNf.format(Math.round(Number(p.deaths || 0)))}</td>
                <td style={{ ...num, color: Number(p.exits || 0) > 0 ? "var(--oxblood-700)" : "var(--fg-3)" }}>{Number(p.exits || 0) > 0 ? "-" : ""}{fcNf.format(Math.round(Number(p.exits || 0)))}</td>
                <td style={{ ...num, fontWeight: 800, color: net >= 0 ? "var(--forest-700)" : "var(--oxblood-700)" }}>{fcSigned(net)}</td>
                <td style={{ ...num, fontWeight: 800, color: "var(--ink-950)" }}>{fcNf.format(Math.round(Number(p.head || 0)))}</td>
                <td style={{ ...num, color: "var(--fg-3)" }}>{fcNf.format(Math.round(Number(p.headLow || 0)))}-{fcNf.format(Math.round(Number(p.headHigh || 0)))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
const ForecastScreen = ({ lang, speciesFilter, onSpeciesFilter, enabledSpecies }) => {
  const L = (fr, en) => (lang === "fr" ? fr : en);
  const [horizon, setHorizon] = React.useState(3);
  const [lookback, setLookback] = React.useState(6);
  const [mode, setMode] = React.useState("prudent");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showSim, setShowSim] = React.useState(false);
  const [salesPct, setSalesPct] = React.useState(0);
  const adjust = salesPct !== 0 ? `farmos:${(1 + salesPct / 100).toFixed(2)}` : "";
  const selectedSpecies = speciesFilter || null;
  const selectedSpeciesDef = selectedSpecies ? speciesById(selectedSpecies) : null;
  const speciesLabel = selectedSpeciesDef ? (lang === "fr" ? selectedSpeciesDef.fr : selectedSpeciesDef.en) : L("toutes espèces", "all species");

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    api.forecastCashFlow({ horizon, mode, scope: "farmos", adjust, species: selectedSpecies, lookback })
      .then((res) => { if (alive) setData(res); })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [horizon, mode, adjust, selectedSpecies, lookback]);

  const [prod, setProd] = React.useState(null);
  React.useEffect(() => { api.forecastProduction({ horizon, species: selectedSpecies, lookback }).then(setProd).catch(() => setProd(null)); }, [horizon, selectedSpecies, lookback]);

  const [herd, setHerd] = React.useState(null);
  React.useEffect(() => { api.forecastLivestock({ horizon, species: selectedSpecies, lookback }).then(setHerd).catch(() => setHerd(null)); }, [horizon, selectedSpecies, lookback]);

  const series = React.useMemo(() => (data ? fcSeries(data.months) : []), [data]);
  const summary = series.map((s) => { const last = s.points[s.points.length - 1]; return { code: s.code, cumul: last ? last.cumul : 0 }; });
  const horizonLabel = FC_HORIZONS.find((h) => h.v === horizon)?.label;
  const hasProd = prod && prod.series && prod.series.length > 0;
  const hasHerd = herd && Array.isArray(herd.points) && herd.points.length > 0;
  const herdRevenue = React.useMemo(() => {
    if (!herd || !Array.isArray(herd.revenue)) return [];
    const byCur = new Map();
    for (const r of herd.revenue) {
      const code = r.currencyCode || r.currencySymbol || "?";
      byCur.set(code, (byCur.get(code) || 0) + Number(r.amount || 0));
    }
    return [...byCur.entries()];
  }, [herd]);
  const herdEnd = hasHerd ? herd.points[herd.points.length - 1] : null;
  const herdStats = React.useMemo(() => {
    if (!hasHerd || !herdEnd) return null;
    const totals = herd.points.reduce((acc, p) => ({
      births: acc.births + Number(p.births || 0),
      deaths: acc.deaths + Number(p.deaths || 0),
      exits: acc.exits + Number(p.exits || 0),
    }), { births: 0, deaths: 0, exits: 0 });
    const current = Number(herd.current || 0);
    const end = Number(herdEnd.head || 0);
    const delta = end - current;
    const deltaPct = current > 0 ? (delta / current) * 100 : 0;
    const uncertaintyPct = end > 0 ? ((Number(herdEnd.headHigh || end) - Number(herdEnd.headLow || end)) / 2 / end) * 100 : 0;
    return { ...totals, current, end, delta, deltaPct, uncertaintyPct };
  }, [hasHerd, herd, herdEnd]);

  const card = { padding: 18, marginBottom: 14 };
  const upper = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6, color: "var(--fg-3)" };

  return (
    <div style={{ padding: "var(--pad-page)", overflow: "auto", height: "100%", maxWidth: 1050 }}>
      <div className="card" style={{ ...card, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div>
          <div style={upper}>{L("Horizon", "Horizon")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FC_HORIZONS.map((h) => <FcSeg key={h.v} active={horizon === h.v} onClick={() => setHorizon(h.v)}>{h.label}</FcSeg>)}
          </div>
        </div>
        <div style={{ flex: "1 1 100%" }}>
          <div style={upper}>{L("Espèce", "Species")}</div>
          <SpeciesPillBar lang={lang} value={selectedSpecies} onChange={onSpeciesFilter} compact enabledSpecies={enabledSpecies}/>
        </div>
        <div>
          <div style={upper}>{L("Hypothèse", "Scenario")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FC_MODES.map((m) => (
              <FcSeg key={m.v} active={mode === m.v} disabled={!m.enabled}
                title={m.enabled ? m.hint : `${m.hint} — ${L("à venir", "coming")}`} onClick={() => m.enabled && setMode(m.v)}>
                {m.label} <span style={{ fontWeight: 400, opacity: 0.75 }}>· {m.hint}</span>
              </FcSeg>
            ))}
          </div>
        </div>
        <div>
          <div style={upper}>{L("Base tendance", "Trend base")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FC_LOOKBACKS.map((b) => <FcSeg key={b.v} active={lookback === b.v} onClick={() => setLookback(b.v)}>{b.label}</FcSeg>)}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={upper}>{L("Simulation", "Simulation")}</div>
          <FcSeg active={showSim || salesPct !== 0} onClick={() => setShowSim((v) => !v)}>{L("« Et si ? »", "« What if? »")}</FcSeg>
        </div>
      </div>

      <div className="card" style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, alignItems: "stretch" }}>
        <div style={{ borderBottom: "1px solid var(--border-1)", paddingBottom: 12 }}>
          <div style={upper}>{L("Lecture rapide", "Quick read")}</div>
          <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-950)", fontWeight: 700 }}>
            {mode === "prudent"
              ? L("Mode Prudent: seules les données confirmées sont retenues.", "Prudent mode: only confirmed data is included.")
              : L(`Mode Réaliste: les tendances des ${lookback} derniers mois sont prolongées.`, `Realistic mode: trends from the last ${lookback} months are extended.`)}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--fg-3)", marginTop: 6 }}>
            {L("Le cheptel est calculé à part: effectif actuel + naissances attendues - mortalité historique - sorties/ventes.", "The herd is calculated separately: current headcount + expected births - historical mortality - exits/sales.")}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          <FcMiniMetric
            icon="activity"
            label={L("Hypothèse", "Scenario")}
            value={FC_MODES.find((m) => m.v === mode)?.label}
            sub={FC_MODES.find((m) => m.v === mode)?.hint}
          />
          <FcMiniMetric
            icon="layers"
            label={L("Espèce", "Species")}
            value={speciesLabel}
            sub={selectedSpecies ? L("projection filtrée", "filtered forecast") : L("consolidé ferme", "farm total")}
          />
          <FcMiniMetric
            icon="chart"
            label={L("Incertitude", "Uncertainty")}
            value={L("+/-3% / mois", "+/-3% / month")}
            sub={L("plafonnée à 40% sur les horizons longs", "capped at 40% on long horizons")}
            tone="warn"
          />
          <FcMiniMetric
            icon="calendar"
            label={L("Base historique", "History base")}
            value={L(`${lookback} mois`, `${lookback} months`)}
            sub={L("ventes, production, mortalité et sorties", "sales, production, mortality and exits")}
          />
        </div>
      </div>

      {showSim && (
        <div className="card" style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{L("Simulation « et si ? » — ventes élevage", "Simulation — livestock sales")}</strong>
            {salesPct !== 0 && <button onClick={() => setSalesPct(0)} style={{ fontSize: 12, border: "1px solid var(--border-1)", background: "var(--paper)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>{L("Réinitialiser", "Reset")}</button>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 110, fontSize: 13 }}>{L("Ventes élevage", "Livestock sales")}</span>
            <input type="range" min={-50} max={50} step={5} value={salesPct}
              onChange={(e) => setSalesPct(Number(e.target.value))} style={{ flex: 1, minWidth: 120, accentColor: "var(--forest-700)" }} />
            <span style={{ width: 46, textAlign: "right", fontSize: 13, fontWeight: 700, color: salesPct > 0 ? "var(--forest-700)" : salesPct < 0 ? "#c0392b" : "var(--fg-3)" }}>
              {salesPct > 0 ? "+" : ""}{salesPct}%
            </span>
          </div>
          <p style={{ fontSize: 11, margin: "8px 0 0", color: "var(--fg-3)" }}>{L("Ajuste les ventes élevage projetées. S'applique en mode Réaliste.", "Adjusts projected livestock sales. Applies in Realistic mode.")}</p>
        </div>
      )}

      {loading && <div className="card" style={card}><span style={{ color: "var(--fg-3)" }}>{L("Calcul de la projection…", "Computing projection…")}</span></div>}
      {error && <div className="card" style={{ ...card, color: "#c0392b" }}>{L("Erreur", "Error")} : {error}</div>}

      {!loading && !error && data && (summary.length === 0 ? (
        <div className="card" style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--forest-700)", flexShrink: 0 }}>
            <Icon name="cart" size={17} color="currentColor"/>
          </div>
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <strong style={{ fontSize: 15 }}>
              {mode === "prudent"
                ? L("Ventes élevage: rien à afficher en Prudent", "Livestock sales: nothing to show in Prudent")
                : L("Aucune vente élevage à projeter", "No livestock sales to project")}
            </strong>
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--fg-3)" }}>
              {mode === "prudent"
                ? L(`Ce scénario exclut les tendances. Les ventes passées ne deviennent visibles que dans le scénario Réaliste, où la moyenne des ${lookback} derniers mois est prolongée.`, `This scenario excludes trends. Past sales appear in the Realistic scenario, where the last ${lookback}-month average is extended.`)
                : L(`Le système n'a pas assez d'historique de vente sur les ${lookback} derniers mois pour produire une tendance fiable.`, `There is not enough sales history over the last ${lookback} months to produce a reliable trend.`)}
            </p>
          </div>
          {mode === "prudent" && (
            <button className="btn btn-sm" onClick={() => setMode("realiste")} style={{ gap: 7, flexShrink: 0 }}>
              <Icon name="chart" size={13} color="currentColor"/>
              {L("Voir Réaliste", "View Realistic")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card" style={card}>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>
              {L("À ce rythme, les ventes élevage projetées à", "At this pace, projected livestock sales at")} <strong>{horizonLabel}</strong> {L("représentent", "amount to")}{" "}
              {summary.map((s, i) => (
                <strong key={s.code} style={{ color: s.cumul >= 0 ? "var(--forest-700)" : "#c0392b" }}>{i > 0 ? " et " : ""}{fcSigned(s.cumul)} {s.code}</strong>
              ))}.
            </div>
          </div>
          {series.map((s) => (
            <div className="card" style={card} key={s.code}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <strong style={{ fontSize: 15 }}>{L("Ventes élevage projetées", "Projected livestock sales")} · {s.code}</strong>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "var(--forest-50)", color: "var(--forest-700)" }}>{mode === "prudent" ? L("confirmé", "confirmed") : L(`moyenne ${lookback} mois`, `${lookback}-month average`)}</span>
              </div>
              <FcChart serie={s} />
            </div>
          ))}
        </>
      ))}

      {hasProd && (
        <div className="card" style={card}>
          <strong style={{ fontSize: 15 }}>{L("Projection de production", "Production forecast")}</strong>
          {prod.series.map((s) => {
            const total = s.points.reduce((acc, p) => acc + Number(p.value || 0), 0);
            const label = s.kind === "eggs" ? L("Œufs", "Eggs") : L("Naissances", "Births");
            const isCertain = s.points[0]?.confidence === "certain";
            const color = s.kind === "eggs" ? "#d97706" : "var(--forest-700)";
            return (
              <div key={s.kind} style={{ borderTop: "1px solid var(--border-1)", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <strong>{label}</strong>
                  <span>~{fcNf.format(Math.round(total))} {s.unit} {L("sur l'horizon", "over horizon")}{" "}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: isCertain ? "var(--forest-50)" : "var(--ink-100)", color: isCertain ? "var(--forest-700)" : "var(--fg-2)" }}>{isCertain ? L("certain", "certain") : L("estimé", "estimated")}</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "flex-end", height: 44 }}>
                  {s.points.map((p) => {
                    const mx = Math.max(...s.points.map((x) => Number(x.value || 0)), 1);
                    const h = Math.max(3, (Number(p.value || 0) / mx) * 40);
                    return <div key={p.month} title={`${fcMonth(p.month)} : ${fcNf.format(Math.round(p.value))} ${s.unit}`} style={{ flex: 1, height: h, background: color, borderRadius: 3, opacity: 0.85 }} />;
                  })}
                </div>
                <p style={{ fontSize: 11, margin: "4px 0 0", color: "var(--fg-3)" }}>{s.points[0]?.basis}</p>
              </div>
            );
          })}
        </div>
      )}

      {hasHerd && (
        <div className="card" style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
            <div>
              <strong style={{ fontSize: 16 }}>{L("Projection du cheptel", "Livestock forecast")}</strong>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
                {L("Formule: effectif actuel + naissances - mortalité - sorties/ventes.", "Formula: current herd + births - mortality - exits/sales.")}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "var(--forest-50)", color: "var(--forest-700)" }}>{L("naissances · mortalité · ventes", "births · mortality · sales")}</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 8 }}>
            {L("À ce rythme, le cheptel passerait de", "At this pace, the herd would go from")}{" "}
            <strong>{fcNf.format(Math.round(herd.current))}</strong> {L("à", "to")}{" "}
            <strong style={{ color: "var(--forest-700)" }}>~{fcNf.format(Math.round(herdEnd.head))} {L("têtes", "head")}</strong> {L("à", "at")} <strong>{horizonLabel}</strong>{" "}
            <span style={{ color: "var(--fg-3)" }}>({L("fourchette", "range")} {fcNf.format(Math.round(herdEnd.headLow))}-{fcNf.format(Math.round(herdEnd.headHigh))}).</span>
          </div>

          {herdStats && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
                <FcMiniMetric icon="layers" label={L("Départ réel", "Actual start")} value={fcNf.format(Math.round(herdStats.current))} sub={L("têtes vivantes aujourd'hui", "live head today")}/>
                <FcMiniMetric
                  icon={herdStats.delta >= 0 ? "arrowUp" : "arrowDown"}
                  label={L("Variation nette", "Net change")}
                  value={`${fcSigned(herdStats.delta)} ${L("têtes", "head")}`}
                  sub={fcSignedPct(herdStats.deltaPct)}
                  tone={herdStats.delta >= 0 ? "good" : "bad"}
                />
                <FcMiniMetric icon="pulse" label={L("Fourchette finale", "Final range")} value={`${fcNf.format(Math.round(herdEnd.headLow))}-${fcNf.format(Math.round(herdEnd.headHigh))}`} sub={`${L("incertitude env.", "approx. uncertainty")} ${fcPctNf.format(herdStats.uncertaintyPct)}%`} tone="warn"/>
                <FcMiniMetric icon="cart" label={L("Sorties prévues", "Projected exits")} value={fcNf.format(Math.round(herdStats.exits))} sub={L("ventes/abattages sur l'horizon", "sales/slaughter over horizon")}/>
              </div>

              <div style={{ background: "var(--bg-sunken)", border: "1px solid var(--border-1)", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <FcFormulaStep label={L("Départ", "Start")} value={fcNf.format(Math.round(herdStats.current))}/>
                  <FcFormulaStep label={L("+ Naissances", "+ Births")} value={fcSigned(herdStats.births)} tone="plus"/>
                  <FcFormulaStep label={L("- Mortalité", "- Mortality")} value={`-${fcNf.format(Math.round(herdStats.deaths))}`} tone="minus"/>
                  <FcFormulaStep label={L("- Sorties", "- Exits")} value={`-${fcNf.format(Math.round(herdStats.exits))}`} tone="minus"/>
                  <FcFormulaStep label={L("= Prévu", "= Projected")} value={fcNf.format(Math.round(herdStats.end))} tone={herdStats.delta >= 0 ? "plus" : "minus"}/>
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: "var(--fg-3)", marginBottom: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 22, height: 0, borderTop: "3px solid #2f7a4f" }}/>{L("prévu", "projected")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 22, height: 10, background: "rgba(47,122,79,0.12)", borderRadius: 3 }}/>{L("fourchette", "range")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 22, height: 0, borderTop: "2px dashed var(--ink-400)" }}/>{L("départ réel", "actual start")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#2f7a4f", borderRadius: 2 }}/>{L("naissances", "births")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#bc4749", borderRadius: 2 }}/>{L("mortalité", "mortality")}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#c77f42", borderRadius: 2 }}/>{L("sorties/ventes", "exits/sales")}</span>
          </div>
          <FcHeadChart points={herd.points} current={herd.current} L={L} />

          <div style={{ marginTop: 12 }}>
            <div style={{ ...upper, marginBottom: 8 }}>{L("Détail mensuel", "Monthly detail")}</div>
            <FcHerdRows points={herd.points} L={L} />
          </div>

          {herdRevenue.length > 0 && (
            <p style={{ fontSize: 13, margin: "10px 0 0", padding: "10px 0 0", borderTop: "1px solid var(--border-1)" }}>
              {L("Recette de vente déduite du cheptel", "Sales revenue from projected herd")} :{" "}
              {herdRevenue.map(([code, amt], i) => (
                <strong key={code} style={{ color: "var(--forest-700)" }}>{i > 0 ? " et " : ""}{fcNf.format(Math.round(amt))} {code}</strong>
              ))}{" "}
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "var(--ink-100)", color: "var(--fg-2)" }}>{L("estimé", "estimated")}</span>
            </p>
          )}
          <p style={{ fontSize: 11, margin: "6px 0 0", color: "var(--fg-3)" }}>{herd.basis}</p>
        </div>
      )}
    </div>
  );
};

export { HealthScreen, BuildingsScreen, CalendarScreen, StockScreen, ReproScreen, ProductionScreen, AlertsScreen, PosScreen, SalesManagementScreen, FinancesScreen, ReportsScreen, EmployeesScreen, SettingsScreen, ForecastScreen };
