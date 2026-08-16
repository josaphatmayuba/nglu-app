/* eslint-disable */
// Opérations zootechniques (Phase 2) — castration, tonte, écornage, boucle,
// taille des onglons, épointage des dents, caudectomie, ébecquage.
// Liste filtrable + formulaire (individuel ou lot) dont les champs s'adaptent
// au type choisi (le catalogue backend pilote le rendu : defaultUnit, espèces
// autorisées). Saisie terrain optimiste (offline-outbox), comme les pesées.
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { SPECIES, speciesById, t } from "./data";
import { SpeciesPillBar, KpiCard, EmptyState } from "./shell";
import { api, adaptAnimal } from "./api";
import { useDataRefresh } from "./use-data-refresh";
import { DateRangeFilter, defaultDateRange, inDateRange, rangeLabel } from "./date-range-filter.jsx";
import { currencyOptions, defaultCurrencyId, defaultSymbol, formatMoney, rowCurrencyId } from "./currency";
import { AmountCurrencyInput } from "./amount-currency-input.jsx";

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

const RESULT_OPTIONS = [
  { value: "success", fr: "Réussi", en: "Success" },
  { value: "partial", fr: "Partiel", en: "Partial" },
  { value: "complication", fr: "Complication", en: "Complication" },
];

function labelForType(t, lang) {
  if (!t) return "";
  return (lang === "fr" ? t.labelFr : t.labelEn) || t.labelFr || t.labelEn || t.code;
}

export function OperationsScreen({ lang, speciesFilter, onSpeciesFilter }) {
  const refresh = useDataRefresh(["operations", "operationTypes", "animals"]);
  const [types, setTypes] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [animals, setAnimals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("month"));
  const [codeFilter, setCodeFilter] = React.useState("");
  const [lotFilter, setLotFilter] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const { currencies, defaultCurrencyId: defCur } = useCurrencyCatalogLocal();

  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([api.listOperationTypes(), api.listOperations(), api.listAnimalsFresh().catch(() => [])])
      .then(([ty, ops, an]) => {
        if (cancel) return;
        setTypes(Array.isArray(ty) ? ty : []);
        setRows(Array.isArray(ops) ? ops : []);
        setAnimals(Array.isArray(an) ? an.map(adaptAnimal) : []);
      })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [refresh]);

  const bootstrap = async () => {
    try {
      await api.bootstrapOperationTypes();
      const ty = await api.listOperationTypes();
      setTypes(Array.isArray(ty) ? ty : []);
    } catch (e) { window.alert(e.message); }
  };

  const typeByCode = React.useMemo(() => Object.fromEntries(types.map((t) => [t.code, t])), [types]);

  const filtered = rows.filter((r) => {
    if (speciesFilter && r.species && r.species !== speciesFilter) return false;
    if (codeFilter && r.operationCode !== codeFilter) return false;
    if (lotFilter && String(r.lot || "").toLowerCase().indexOf(lotFilter.toLowerCase()) === -1) return false;
    const date = r.operationDate || r.operation_date;
    if (!inDateRange(date, dateRange)) return false;
    return true;
  }).sort((a, b) => String(b.operationDate || b.operation_date).localeCompare(String(a.operationDate || a.operation_date)));

  const totalCost = filtered.reduce((sum, r) => sum + (r.cost != null ? Number(r.cost) : 0), 0);
  const woolCount = filtered.filter((r) => r.operationCode === "shearing").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Nouvel acte" : "New operation"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-3)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Interventions" : "Operations"} sublabel={rangeLabel(dateRange, lang)} value={filtered.length} unit="" icon="scissors"/>
        <KpiCard label={lang === "fr" ? "Coût · période" : "Cost · period"} value={totalCost > 0 ? totalCost.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA") : "—"} unit={currencies.length ? "" : ""} icon="coins"/>
        <KpiCard label={lang === "fr" ? "Tontes (laine)" : "Shearings (wool)"} value={woolCount} unit="" icon="scissors"/>
      </div>

      {types.length === 0 && !loading && (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14 }}>
          <div style={{ fontSize: 13, color: "var(--fg-2)" }}>
            {lang === "fr" ? "Aucun type d'opération configuré." : "No operation type configured."}
          </div>
          <button className="btn" onClick={bootstrap}>{lang === "fr" ? "Initialiser les types standards" : "Initialize standard types"}</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="input" style={{ maxWidth: 220 }} value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)}>
          <option value="">{lang === "fr" ? "Tous les types" : "All types"}</option>
          {types.map((tp) => <option key={tp.id} value={tp.code}>{labelForType(tp, lang)}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 180 }} placeholder={lang === "fr" ? "Filtrer par lot" : "Filter by lot"}
          value={lotFilter} onChange={(e) => setLotFilter(e.target.value)}/>
      </div>

      {loading && <div style={{ color: "var(--fg-3)", fontSize: 13 }}>{lang === "fr" ? "Chargement…" : "Loading…"}</div>}
      {!loading && filtered.length === 0 && (
        <EmptyState title={lang === "fr" ? "Aucune intervention enregistrée" : "No operation recorded"}
          hint={lang === "fr" ? "Utilisez « Nouvel acte » pour enregistrer une castration, tonte, écornage…" : "Use “New operation” to record a castration, shearing, dehorning…"}/>
      )}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.map((r, i) => {
            const tp = typeByCode[r.operationCode];
            const a = animals.find((x) => x._pk === (r.animalId ?? r.animal_id));
            return (
              <div key={r.id} className="card" style={{ padding: 12, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", marginBottom: i < filtered.length - 1 ? 4 : 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink-50)" }}>
                  <Icon name="scissors" size={15} color="var(--ink-700)"/>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{labelForType(tp, lang) || r.operationCode}</span>
                    {r.result && <span className="mono" style={{ fontSize: 11, color: r.result === "complication" ? "var(--oxblood-700)" : "var(--fg-3)" }}>{r.result}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                    {a ? (a.name || a.id) : (r.lot ? `${lang === "fr" ? "Lot" : "Batch"} ${r.lot} · ${r.animalCount || 1} ${lang === "fr" ? "têtes" : "head"}` : "—")}
                    {r.species ? ` · ${speciesById(r.species) ? (lang === "fr" ? speciesById(r.species).fr : speciesById(r.species).en) : r.species}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(r.operationDate || r.operation_date || "").slice(0, 10)}</div>
                  {r.cost != null && Number(r.cost) > 0 && (
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{formatMoney(r.cost, rowCurrencyId(r), currencies)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <OperationFormModal lang={lang} types={types} animals={animals} currencies={currencies} defaultCurrencyId={defCur}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); }}/>
      )}
    </div>
  );
}

function OperationFormModal({ lang, types, animals, currencies, defaultCurrencyId, onClose, onSaved }) {
  const [mode, setMode] = React.useState("single"); // single | bulk
  const [code, setCode] = React.useState(types[0]?.code || "");
  const [animalId, setAnimalId] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [lot, setLot] = React.useState("");
  const [species, setSpecies] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = React.useState("success");
  const [quantity, setQuantity] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [currencyId, setCurrencyId] = React.useState(defaultCurrencyId || "");
  const [performedByName, setPerformedByName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [animalQuery, setAnimalQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const selectedType = types.find((t) => t.code === code) || null;
  React.useEffect(() => {
    if (selectedType?.defaultUnit && !unit) setUnit(selectedType.defaultUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const allowedSpecies = selectedType?.species || null; // null = toutes espèces
  const animalOptions = animals.filter((a) => !allowedSpecies || allowedSpecies.includes(a.species));
  const filteredForPicker = animalOptions.filter((a) => {
    if (!animalQuery) return true;
    const q = animalQuery.toLowerCase();
    return String(a.name || "").toLowerCase().includes(q) || String(a.id || "").toLowerCase().includes(q);
  });

  const toggleSelect = (id) => {
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const submit = async () => {
    if (saving) return;
    if (!code) { setErr(lang === "fr" ? "Type d'opération requis." : "Operation type required."); return; }
    setSaving(true); setErr(null);
    try {
      if (mode === "bulk") {
        if (selectedIds.length === 0) { setErr(lang === "fr" ? "Sélectionnez au moins un animal." : "Select at least one animal."); setSaving(false); return; }
        await api.bulkCreateOperations({
          animal_ids: selectedIds,
          operation_code: code,
          operation_date: date,
          lot: lot || null,
          result,
          quantity: quantity !== "" ? Number(quantity) : null,
          unit: unit || null,
          cost: cost !== "" ? Number(cost) : null,
          currency_id: currencyId || null,
          performed_by_name: performedByName || null,
          notes: notes || null,
        });
      } else {
        const a = animals.find((x) => x._pk === Number(animalId));
        await api.createOperation({
          operation_code: code,
          animal_id: animalId ? Number(animalId) : null,
          lot: lot || null,
          species: species || a?.species || null,
          operation_date: date,
          result,
          quantity: quantity !== "" ? Number(quantity) : null,
          unit: unit || null,
          cost: cost !== "" ? Number(cost) : null,
          currency_id: currencyId || null,
          performed_by_name: performedByName || null,
          notes: notes || null,
        });
      }
      onSaved && onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,20,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 12 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>{lang === "fr" ? "Nouvel acte" : "New operation"}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button className={`btn btn-sm ${mode === "single" ? "btn-primary" : ""}`} onClick={() => setMode("single")}>{lang === "fr" ? "Animal unique" : "Single animal"}</button>
          <button className={`btn btn-sm ${mode === "bulk" ? "btn-primary" : ""}`} onClick={() => setMode("bulk")}>{lang === "fr" ? "Acte de lot" : "Batch operation"}</button>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Type d'opération" : "Operation type"}</span>
          <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>
            {types.length === 0 && <option value="">{lang === "fr" ? "Aucun type — allez dans Paramètres" : "No type — go to Settings"}</option>}
            {types.map((tp) => <option key={tp.id} value={tp.code}>{labelForType(tp, lang)}</option>)}
          </select>
        </label>

        {mode === "single" ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Animal" : "Animal"}</span>
              <input className="input" placeholder={lang === "fr" ? "Rechercher un animal…" : "Search an animal…"} value={animalQuery} onChange={(e) => setAnimalQuery(e.target.value)}/>
              <select className="input" size={Math.min(6, Math.max(3, filteredForPicker.length))} value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
                <option value="">{lang === "fr" ? "— ou saisir un lot ci-dessous —" : "— or enter a batch below —"}</option>
                {filteredForPicker.map((a) => <option key={a._pk} value={a._pk}>{a.name || a.id} ({a.species})</option>)}
              </select>
            </label>
            {!animalId && (
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Lot (si pas d'animal individuel)" : "Batch (if no individual animal)"}</span>
                  <input className="input" value={lot} onChange={(e) => setLot(e.target.value)}/>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Espèce" : "Species"}</span>
                  <select className="input" value={species} onChange={(e) => setSpecies(e.target.value)}>
                    <option value="">—</option>
                    {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
                  </select>
                </label>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Animaux sélectionnés" : "Selected animals"} ({selectedIds.length})</span>
              <input className="input" style={{ maxWidth: 180 }} placeholder={lang === "fr" ? "Rechercher…" : "Search…"} value={animalQuery} onChange={(e) => setAnimalQuery(e.target.value)}/>
            </div>
            <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid var(--border-1)", borderRadius: 8 }}>
              {filteredForPicker.map((a) => (
                <label key={a._pk} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: "1px solid var(--border-1)", fontSize: 12.5 }}>
                  <input type="checkbox" checked={selectedIds.includes(a._pk)} onChange={() => toggleSelect(a._pk)}/>
                  <AnimalGlyph kind={a.species} size={14}/>
                  <span>{a.name || a.id}</span>
                </label>
              ))}
              {filteredForPicker.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucun animal." : "No animal."}</div>}
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Lot (optionnel, étiquette)" : "Batch (optional, label)"}</span>
              <input className="input" value={lot} onChange={(e) => setLot(e.target.value)}/>
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Date" : "Date"}</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Résultat" : "Result"}</span>
            <select className="input" value={result} onChange={(e) => setResult(e.target.value)}>
              {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{lang === "fr" ? o.fr : o.en}</option>)}
            </select>
          </label>
        </div>

        {selectedType?.defaultUnit && (
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                {lang === "fr" ? `Quantité${mode === "bulk" ? " (par animal)" : ""}` : `Quantity${mode === "bulk" ? " (per animal)" : ""}`}
              </span>
              <input className="input mono" type="number" step="0.01" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}/>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Unité" : "Unit"}</span>
              <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)}/>
            </label>
          </div>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
            {lang === "fr" ? `Coût${mode === "bulk" ? " total du lot" : ""} (optionnel)` : `Cost${mode === "bulk" ? " (batch total)" : ""} (optional)`}
          </span>
          <AmountCurrencyInput amount={cost} onAmountChange={setCost} currencyId={currencyId} onCurrencyChange={setCurrencyId} currencies={currencies}/>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Prestataire (optionnel, ex: tondeur externe)" : "Provider (optional, e.g. external shearer)"}</span>
          <input className="input" value={performedByName} onChange={(e) => setPerformedByName(e.target.value)}/>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{lang === "fr" ? "Notes" : "Notes"}</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}/>
        </label>

        {err && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{err}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onClose} disabled={saving}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || types.length === 0}>
            {saving ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
