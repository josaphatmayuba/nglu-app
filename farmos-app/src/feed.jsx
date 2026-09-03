/* eslint-disable */
// FarmOS — Stock aliment (Phase 1). Fichier exclusif de cette phase : 3 onglets
// (Stock, Mouvements, Distribution). Route "feed" (slug /farmos/aliments,
// deep-link mobile préservé) pointe ici depuis app.jsx au lieu de StockScreen.
import React from "react";
import { Icon } from "./icons";
import { SPECIES } from "./data";
import { SpeciesPillBar, KpiCard, EmptyState } from "./shell";
import { api } from "./api";
import { useDataRefresh } from "./use-data-refresh";
import { defaultCurrencyId, defaultSymbol, formatMoney, symbolFor } from "./currency";
import { AmountCurrencyInput } from "./amount-currency-input.jsx";

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

const STATUS_LABEL = {
  ok: { fr: "OK", en: "OK", color: "var(--health-700)", bg: "var(--health-50)" },
  low: { fr: "Bas", en: "Low", color: "var(--wheat-900)", bg: "var(--wheat-50)" },
  critical: { fr: "Critique", en: "Critical", color: "var(--rust-900)", bg: "var(--rust-50)" },
  expired: { fr: "Périmé", en: "Expired", color: "var(--parchment-50)", bg: "var(--rust-700)" },
};

function StatusPill({ status, lang }) {
  const s = STATUS_LABEL[status] || STATUS_LABEL.ok;
  return (
    <span className="tag" style={{ background: s.bg, color: s.color, fontWeight: 700 }}>
      {lang === "fr" ? s.fr : s.en}
    </span>
  );
}

function fmtQty(v, unit) {
  const n = Number(v || 0);
  return `${n.toLocaleString("fr-CA", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

// ─── Onglet Stock ────────────────────────────────────────────────────────
function FeedStockTab({ lang, speciesFilter, stock, currencyMeta, onCreateReference, onOpenLots }) {
  const [newOpen, setNewOpen] = React.useState(false);
  const activeCurrencyId = currencyMeta.defaultCurrencyId ? String(currencyMeta.defaultCurrencyId) : "";
  const moneyUnit = symbolFor(activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol);
  const visible = stock.filter((s) => !speciesFilter || (Array.isArray(s.species) ? s.species : []).length === 0 || (s.species || []).includes(speciesFilter));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setNewOpen(true)}>
          <Icon name="plus" size={14}/>
          <span>{lang === "fr" ? "Nouvel aliment" : "New feed item"}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="wheat" title={lang === "fr" ? "Aucun aliment référencé" : "No feed item referenced"}/>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((item) => {
            const qty = Number(item.quantity || 0);
            const min = item.minQuantity != null ? Number(item.minQuantity) : null;
            const gaugePct = min ? Math.max(0, Math.min(100, Math.round((qty / (min * 2)) * 100))) : null;
            return (
              <div key={item.id} className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 16, color: "var(--ink-950)" }}>{item.name}</h4>
                      {item.feedType && <span className="tag">{item.feedType}</span>}
                      <StatusPill status={item.status} lang={lang}/>
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                      {fmtQty(qty, item.unit)}
                      {min != null ? ` · ${lang === "fr" ? "seuil" : "min"} ${fmtQty(min, item.unit)}` : ""}
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => onOpenLots(item)} aria-label={lang === "fr" ? "Voir lots" : "View lots"}>
                    <Icon name="package" size={14}/>
                    <span>{lang === "fr" ? "Lots" : "Lots"}</span>
                  </button>
                </div>

                {gaugePct != null && (
                  <div style={{ height: 6, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${gaugePct}%`, borderRadius: 999,
                      background: item.status === "critical" || item.status === "expired" ? "var(--rust-700)" : item.status === "low" ? "var(--wheat-500)" : "var(--health-500)",
                    }}/>
                  </div>
                )}

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--fg-3)" }}>
                  <span><Icon name="clock" size={11}/> {lang === "fr" ? "Couverture" : "Coverage"}: {item.coverageDays != null ? `${item.coverageDays} j` : "—"}</span>
                  <span><Icon name="coins" size={11}/> {item.unitPrice != null ? formatMoney(item.unitPrice, item.currencyId ?? activeCurrencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2) : "—"}/{item.unit || "u"}</span>
                  {item.expiryDate && <span>{lang === "fr" ? "Péremption" : "Expiry"}: {String(item.expiryDate).slice(0, 10)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {newOpen && (
        <NewFeedReferenceModal
          lang={lang}
          currencyMeta={currencyMeta}
          defaultSpecies={speciesFilter ? [speciesFilter] : []}
          onClose={() => setNewOpen(false)}
          onSaved={() => { setNewOpen(false); onCreateReference(); }}
        />
      )}
    </div>
  );
}

function NewFeedReferenceModal({ lang, currencyMeta, defaultSpecies, onClose, onSaved }) {
  const [name, setName] = React.useState("");
  const [feedType, setFeedType] = React.useState("");
  const [unit, setUnit] = React.useState("kg");
  const [minQuantity, setMinQuantity] = React.useState("");
  const [supplier, setSupplier] = React.useState("");
  const [species, setSpecies] = React.useState(defaultSpecies || []);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const toggleSpecies = (sp) => setSpecies((s) => (s.includes(sp) ? s.filter((x) => x !== sp) : [...s, sp]));

  const handleSave = async () => {
    if (!name.trim()) { setError(lang === "fr" ? "Nom requis." : "Name required."); return; }
    setSaving(true); setError("");
    try {
      await api.createMedicine({
        name: name.trim(),
        kind: "feed",
        quantity: 0,
        unit: unit || null,
        min_quantity: minQuantity ? Number(minQuantity) : null,
        supplier: supplier.trim() || null,
        species: species.length ? species : null,
      });
      onSaved();
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 480, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 16 }}>{lang === "fr" ? "Nouvel aliment" : "New feed item"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Nom" : "Name"}
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Catégorie" : "Category"}
            <input value={feedType} onChange={(e) => setFeedType(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }} placeholder={lang === "fr" ? "concentré, fourrage…" : "concentrate, forage…"}/>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Unité" : "Unit"}
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Seuil minimum" : "Min threshold"}
              <input type="number" inputMode="decimal" min="0" step="0.01" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
          </div>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Fournisseur" : "Supplier"}
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
          </label>
          <div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 6 }}>{lang === "fr" ? "Espèces (aucune = toutes)" : "Species (none = all)"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SPECIES.map((s) => (
                <button key={s.id} type="button" className="btn btn-sm" onClick={() => toggleSpecies(s.id)}
                  style={species.includes(s.id) ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}}>
                  {lang === "fr" ? s.fr : s.en}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-sm" onClick={onClose}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "…" : (lang === "fr" ? "Créer" : "Create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal réception de lot ──────────────────────────────────────────────
function ReceiveLotModal({ lang, medicine, currencyMeta, onClose, onSaved }) {
  const [lotCode, setLotCode] = React.useState("");
  const [supplier, setSupplier] = React.useState(medicine?.supplier || "");
  const [receivedDate, setReceivedDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = React.useState("");
  const [quantityIn, setQuantityIn] = React.useState("");
  const [unit, setUnit] = React.useState(medicine?.unit || "kg");
  const [unitCost, setUnitCost] = React.useState("");
  const [currencyId, setCurrencyId] = React.useState(currencyMeta.defaultCurrencyId || "");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSave = async () => {
    if (!quantityIn || Number(quantityIn) <= 0) { setError(lang === "fr" ? "Quantité requise." : "Quantity required."); return; }
    setSaving(true); setError("");
    try {
      await api.createFeedLot({
        medicine_id: medicine.id,
        lot_code: lotCode.trim() || null,
        supplier: supplier.trim() || null,
        received_date: receivedDate,
        expiry_date: expiryDate || null,
        quantity_in: Number(quantityIn),
        unit: unit || null,
        unit_cost: unitCost ? Number(unitCost) : null,
        currency_id: currencyId ? Number(currencyId) : null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 480, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>{lang === "fr" ? "Réception de lot" : "Receive lot"}</h3>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16 }}>{medicine?.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Code de lot" : "Lot code"}
              <input value={lotCode} onChange={(e) => setLotCode(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Fournisseur" : "Supplier"}
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Date de réception" : "Received date"}
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Péremption" : "Expiry"}
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Quantité reçue" : "Quantity received"}
              <input type="number" inputMode="decimal" min="0.001" step="0.01" value={quantityIn} onChange={(e) => setQuantityIn(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Unité" : "Unit"}
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
          </div>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Coût unitaire" : "Unit cost"}
            <AmountCurrencyInput
              amount={unitCost}
              onAmountChange={setUnitCost}
              currencyId={currencyId}
              onCurrencyChange={setCurrencyId}
              currencies={currencyMeta.currencies}
              placeholder="0.00"
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Notes" : "Notes"}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" style={{ width: "100%", marginTop: 4, minHeight: 60 }}/>
          </label>
          {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-sm" onClick={onClose}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "…" : (lang === "fr" ? "Enregistrer" : "Save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LotsDrawer({ lang, medicine, onClose, onChanged }) {
  const [lots, setLots] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const currencyMeta = useCurrencyCatalog();

  const load = React.useCallback(() => {
    setLoading(true);
    api.listFeedLots(medicine.id)
      .then((rows) => setLots(Array.isArray(rows) ? rows : []))
      .catch(() => setLots([]))
      .finally(() => setLoading(false));
  }, [medicine.id]);
  React.useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm(lang === "fr" ? "Supprimer ce lot ?" : "Delete this lot?")) return;
    try {
      await api.deleteFeedLot(id);
      load();
      onChanged && onChanged();
    } catch (e) {
      window.alert(e.message || "Erreur");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div className="card" style={{ width: 620, maxWidth: "100%", maxHeight: "92vh", overflow: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{lang === "fr" ? "Lots" : "Lots"} — {medicine.name}</h3>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setReceiveOpen(true)}>
            <Icon name="truck" size={14}/>
            <span>{lang === "fr" ? "Réceptionner" : "Receive"}</span>
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>…</div>
        ) : lots.length === 0 ? (
          <EmptyState icon="package" title={lang === "fr" ? "Aucun lot" : "No lots"}/>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>{lang === "fr" ? "Lot" : "Lot"}</th>
                  <th>{lang === "fr" ? "Reçu le" : "Received"}</th>
                  <th>{lang === "fr" ? "Péremption" : "Expiry"}</th>
                  <th>{lang === "fr" ? "Restant" : "Remaining"}</th>
                  <th>{lang === "fr" ? "Coût unit." : "Unit cost"}</th>
                  <th/>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={l.id}>
                    <td>{l.lotCode || `#${l.id}`}{l.supplier ? ` · ${l.supplier}` : ""}</td>
                    <td className="mono">{String(l.receivedDate).slice(0, 10)}</td>
                    <td className="mono">{l.expiryDate ? String(l.expiryDate).slice(0, 10) : "—"}</td>
                    <td className="mono">{fmtQty(l.quantityRemaining, l.unit)}</td>
                    <td className="mono">{l.unitCost != null ? formatMoney(l.unitCost, l.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2) : "—"}</td>
                    <td>
                      <button type="button" className="btn btn-sm" aria-label={lang === "fr" ? "Supprimer" : "Delete"} onClick={() => handleDelete(l.id)}>
                        <Icon name="trash" size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn-sm" onClick={onClose}>{lang === "fr" ? "Fermer" : "Close"}</button>
        </div>
      </div>
      {receiveOpen && (
        <ReceiveLotModal
          lang={lang}
          medicine={medicine}
          currencyMeta={currencyMeta}
          onClose={() => setReceiveOpen(false)}
          onSaved={() => { setReceiveOpen(false); load(); onChanged && onChanged(); }}
        />
      )}
    </div>
  );
}

// ─── Onglet Mouvements ───────────────────────────────────────────────────
const MOVEMENT_LABEL = {
  in: { fr: "Entrée", en: "In" },
  out: { fr: "Sortie", en: "Out" },
  adjust: { fr: "Ajustement", en: "Adjust" },
  loss: { fr: "Perte", en: "Loss" },
};

function FeedMovementsTab({ lang, stockItems, buildings, currencyMeta }) {
  const [movements, setMovements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [medicineFilter, setMedicineFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const refresh = useDataRefresh(["feedMovements", "medicines"]);

  const load = React.useCallback(() => {
    setLoading(true);
    api.listFeedMovements({ medicineId: medicineFilter || undefined, from: from || undefined, to: to || undefined })
      .then((rows) => setMovements(Array.isArray(rows) ? rows : []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [medicineFilter, from, to]);
  React.useEffect(() => { load(); }, [load, refresh]);

  const buildingById = new Map((buildings || []).map((b) => [b.id, b.name]));
  const medicineById = new Map((stockItems || []).map((m) => [m.id, m.name]));
  const filtered = movements.filter((m) => !typeFilter || m.movementType === typeFilter);

  const handleDelete = async (id) => {
    if (!window.confirm(lang === "fr" ? "Supprimer ce mouvement ?" : "Delete this movement?")) return;
    try {
      await api.deleteFeedMovement(id);
      load();
    } catch (e) {
      window.alert(e.message || "Erreur");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select className="input" value={medicineFilter} onChange={(e) => setMedicineFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">{lang === "fr" ? "Tous les aliments" : "All feed items"}</option>
          {(stockItems || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ minWidth: 130 }}>
          <option value="">{lang === "fr" ? "Tous types" : "All types"}</option>
          {Object.entries(MOVEMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{lang === "fr" ? v.fr : v.en}</option>)}
        </select>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} style={{ minWidth: 130 }}/>
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} style={{ minWidth: 130 }}/>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--fg-3)" }}>…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="wheat" title={lang === "fr" ? "Aucun mouvement" : "No movement"}/>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>{lang === "fr" ? "Date" : "Date"}</th>
                <th>{lang === "fr" ? "Type" : "Type"}</th>
                <th>{lang === "fr" ? "Aliment" : "Feed"}</th>
                <th>{lang === "fr" ? "Quantité" : "Quantity"}</th>
                <th>{lang === "fr" ? "Bâtiment" : "Building"}</th>
                <th>{lang === "fr" ? "Coût" : "Cost"}</th>
                <th/>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={m._pending ? { opacity: 0.6 } : undefined}>
                  <td className="mono">{String(m.movementDate).slice(0, 10)}{m._pending ? ` (${lang === "fr" ? "en attente" : "pending"})` : ""}</td>
                  <td>{(MOVEMENT_LABEL[m.movementType] || {})[lang] || m.movementType}</td>
                  <td>{medicineById.get(m.medicineId) || `#${m.medicineId}`}</td>
                  <td className="mono">{fmtQty(m.quantity, m.unit)}</td>
                  <td>{m.buildingId ? (buildingById.get(m.buildingId) || `#${m.buildingId}`) : "—"}</td>
                  <td className="mono">{m.totalCost != null ? formatMoney(m.totalCost, m.currencyId, currencyMeta.currencies, currencyMeta.fallbackSymbol, 2) : "—"}</td>
                  <td>
                    {!m._pending && (
                      <button type="button" className="btn btn-sm" aria-label={lang === "fr" ? "Supprimer" : "Delete"} onClick={() => handleDelete(m.id)}>
                        <Icon name="trash" size={13}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Onglet Distribution ─────────────────────────────────────────────────
function FeedDistributionTab({ lang, stockItems, buildings, speciesFilter, onSaved }) {
  const blankRow = () => ({ medicine_id: "", building_id: "", species: speciesFilter || "", animal_count: "", ration_per_animal: "", quantity: "", notes: "" });
  const [movementDate, setMovementDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = React.useState([blankRow()]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [savedCount, setSavedCount] = React.useState(0);

  const updateRow = (idx, patch) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const removeRow = (idx) => setRows((rs) => rs.filter((_, i) => i !== idx));

  // Quantité auto = animal_count * ration_per_animal si les deux sont fournis
  // et que quantity n'a pas été saisie manuellement.
  const effectiveQuantity = (r) => {
    if (r.quantity !== "") return r.quantity;
    if (r.animal_count && r.ration_per_animal) return String(Number(r.animal_count) * Number(r.ration_per_animal));
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    const payloads = rows
      .filter((r) => r.medicine_id && effectiveQuantity(r))
      .map((r) => ({
        medicine_id: Number(r.medicine_id),
        movement_type: "out",
        movement_date: movementDate,
        quantity: Number(effectiveQuantity(r)),
        building_id: r.building_id ? Number(r.building_id) : null,
        species: r.species || null,
        animal_count: r.animal_count ? Number(r.animal_count) : null,
        ration_per_animal: r.ration_per_animal ? Number(r.ration_per_animal) : null,
        notes: r.notes.trim() || null,
      }));
    if (!payloads.length) { setError(lang === "fr" ? "Ajoutez au moins une ligne complète." : "Add at least one complete row."); return; }
    setSaving(true);
    try {
      if (payloads.length === 1) {
        await api.createFeedMovement(payloads[0]);
      } else {
        await api.createFeedMovementsBulk(payloads);
      }
      setSavedCount(payloads.length);
      setRows([blankRow()]);
      onSaved && onSaved();
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ fontSize: 12, color: "var(--fg-2)", maxWidth: 220 }}>{lang === "fr" ? "Date de distribution" : "Distribution date"}
        <input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} className="input" style={{ width: "100%", marginTop: 4 }}/>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r, idx) => (
          <div key={idx} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Aliment" : "Feed"}
              <select className="input" value={r.medicine_id} onChange={(e) => updateRow(idx, { medicine_id: e.target.value })} style={{ width: "100%", marginTop: 4 }}>
                <option value="">{lang === "fr" ? "Choisir…" : "Select…"}</option>
                {(stockItems || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Bâtiment" : "Building"}
              <select className="input" value={r.building_id} onChange={(e) => updateRow(idx, { building_id: e.target.value })} style={{ width: "100%", marginTop: 4 }}>
                <option value="">{lang === "fr" ? "—" : "—"}</option>
                {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Espèce" : "Species"}
              <select className="input" value={r.species} onChange={(e) => updateRow(idx, { species: e.target.value })} style={{ width: "100%", marginTop: 4 }}>
                <option value="">{lang === "fr" ? "—" : "—"}</option>
                {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Nb animaux" : "Animal count"}
              <input type="number" inputMode="numeric" min="0" value={r.animal_count} onChange={(e) => updateRow(idx, { animal_count: e.target.value })} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Ration/animal" : "Ration/animal"}
              <input type="number" inputMode="decimal" min="0" step="0.01" value={r.ration_per_animal} onChange={(e) => updateRow(idx, { ration_per_animal: e.target.value })} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Quantité totale (auto ou saisie)" : "Total quantity (auto or manual)"}
              <input type="number" inputMode="decimal" min="0" step="0.01" value={r.quantity} placeholder={effectiveQuantity(r) || "0"} onChange={(e) => updateRow(idx, { quantity: e.target.value })} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            <label style={{ fontSize: 12, color: "var(--fg-2)" }}>{lang === "fr" ? "Notes" : "Notes"}
              <input value={r.notes} onChange={(e) => updateRow(idx, { notes: e.target.value })} className="input" style={{ width: "100%", marginTop: 4 }}/>
            </label>
            {rows.length > 1 && (
              <button type="button" className="btn btn-sm" onClick={() => removeRow(idx)} aria-label={lang === "fr" ? "Retirer" : "Remove"} style={{ alignSelf: "flex-end" }}>
                <Icon name="x" size={13}/>
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-sm" onClick={addRow}>
        <Icon name="plus" size={14}/>
        <span>{lang === "fr" ? "Ajouter un bâtiment" : "Add a building"}</span>
      </button>

      {error && <div style={{ color: "var(--rust-700)", fontSize: 12 }}>{error}</div>}
      {savedCount > 0 && !error && <div style={{ color: "var(--health-700)", fontSize: 12 }}>{lang === "fr" ? `${savedCount} mouvement(s) enregistré(s).` : `${savedCount} movement(s) saved.`}</div>}

      <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? "…" : (lang === "fr" ? "Enregistrer la distribution" : "Save distribution")}
      </button>
    </div>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────
export function FeedStockScreen({ lang, speciesFilter, onSpeciesFilter }) {
  const [tab, setTab] = React.useState("stock");
  const [stock, setStock] = React.useState([]);
  const [buildings, setBuildings] = React.useState([]);
  const [lotsFor, setLotsFor] = React.useState(null);
  const currencyMeta = useCurrencyCatalog();
  const refresh = useDataRefresh(["medicines", "feedLots", "feedMovements"]);

  const loadStock = React.useCallback(() => {
    api.feedStock()
      .then((rows) => setStock(Array.isArray(rows) ? rows : []))
      .catch(() => setStock([]));
  }, []);
  React.useEffect(() => { loadStock(); }, [loadStock, refresh]);
  React.useEffect(() => {
    api.listBuildings().then((rows) => setBuildings(Array.isArray(rows) ? rows : [])).catch(() => setBuildings([]));
  }, []);

  const lowCount = stock.filter((s) => s.status === "low" || s.status === "critical").length;
  const expiredCount = stock.filter((s) => s.status === "expired").length;
  const totalKg = stock.reduce((a, b) => a + Number(b.quantity || 0), 0);

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Stock aliment · Feed" : "Feed · Stock aliment"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr" ? "Stock d'aliments" : "Feed stock"}
        </h1>
      </div>

      <SpeciesPillBar lang={lang} value={speciesFilter} onChange={onSpeciesFilter} compact/>

      <div style={{ display: "grid", gridTemplateColumns: "var(--cols-3)", gap: 12 }}>
        <KpiCard label={lang === "fr" ? "Stock total" : "Total stock"} value={`${(totalKg / 1000).toFixed(1)} t`} icon="wheat" accent="var(--health-500)"/>
        <KpiCard label={lang === "fr" ? "Stock bas/critique" : "Low/critical stock"} value={lowCount} icon="clock" accent={lowCount ? "var(--rust-700)" : "var(--ink-500)"}/>
        <KpiCard label={lang === "fr" ? "Aliments périmés" : "Expired feed"} value={expiredCount} icon="wheat" accent={expiredCount ? "var(--rust-700)" : "var(--ink-500)"}/>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
        {[
          { id: "stock", fr: "Stock", en: "Stock" },
          { id: "movements", fr: "Mouvements", en: "Movements" },
          { id: "distribution", fr: "Distribution", en: "Distribution" },
        ].map((tb) => (
          <button key={tb.id} type="button" className="btn btn-sm" onClick={() => setTab(tb.id)}
            style={{ flexShrink: 0, whiteSpace: "nowrap", ...(tab === tb.id ? { background: "var(--ink-900)", color: "var(--parchment-50)", borderColor: "var(--ink-900)" } : {}) }}>
            {lang === "fr" ? tb.fr : tb.en}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <FeedStockTab lang={lang} speciesFilter={speciesFilter} stock={stock} currencyMeta={currencyMeta}
          onCreateReference={loadStock} onOpenLots={setLotsFor}/>
      )}
      {tab === "movements" && (
        <FeedMovementsTab lang={lang} stockItems={stock} buildings={buildings} currencyMeta={currencyMeta}/>
      )}
      {tab === "distribution" && (
        <FeedDistributionTab lang={lang} stockItems={stock} buildings={buildings} speciesFilter={speciesFilter} onSaved={loadStock}/>
      )}

      {lotsFor && (
        <LotsDrawer lang={lang} medicine={lotsFor} onClose={() => setLotsFor(null)} onChanged={loadStock}/>
      )}
    </div>
  );
}
