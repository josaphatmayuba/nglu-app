/* eslint-disable */
// SemenBankScreen — banque de semence (paillettes IA) avec stock + historique.
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { SPECIES, speciesById } from "./data";
import { api } from "./api";
import { nextStrawCode } from "./id-gen";
import { useDataRefresh } from "./use-data-refresh";
import { DateRangeFilter, defaultDateRange, inDateRange } from "./date-range-filter.jsx";
import { Autocomplete } from "./quickentry";
import { SectionLoader } from "./loading.jsx";

const STATUS_LABEL = {
  active: { fr: "Active", en: "Active" },
  archived: { fr: "Archivée", en: "Archived" },
};

const SemenBankScreen = ({ lang, speciesFilter, onSpeciesFilter }) => {
  const [straws, setStraws] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState(() => defaultDateRange("all"));
  const refresh = useDataRefresh(["semenStraws"]);

  const reload = React.useCallback(() => {
    setLoading(true);
    api.listSemenStraws(speciesFilter || null)
      .then((rows) => { setStraws(Array.isArray(rows) ? rows : []); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [speciesFilter]);

  React.useEffect(() => { reload(); }, [reload, refresh]);
  React.useEffect(() => {
    const h = () => reload();
    window.addEventListener("farmos:semen-changed", h);
    return () => window.removeEventListener("farmos:semen-changed", h);
  }, [reload]);

  const filtered = straws.filter((s) => {
    if (s.collectionDate && !inDateRange(s.collectionDate, dateRange)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (s.code || "").toLowerCase().includes(q) ||
      (s.sireName || "").toLowerCase().includes(q) ||
      (s.breed || "").toLowerCase().includes(q) ||
      (s.supplierName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "var(--pad-page)", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      <div>
        <div className="overline" style={{ marginBottom: 4 }}>{lang === "fr" ? "Reproduction · IA" : "Reproduction · AI"}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.015em", color: "var(--ink-950)" }}>
          {lang === "fr"
            ? <>Banque de semence, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length.toLocaleString("fr-CA")} paillettes</span></>
            : <>Semen bank, <span style={{ color: "var(--clay-700)", fontWeight: 700 }}>{filtered.length.toLocaleString("en-CA")} straws</span></>}
        </h1>
      </div>

      <div className="toolbar-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--border-2)", borderRadius: 6, padding: "0 10px", height: 34 }}>
          <Icon name="search" size={14} color="var(--ink-500)"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "fr" ? "Code, taureau, race, fournisseur…" : "Code, sire, breed, supplier…"}
            style={{ border: 0, background: "transparent", flex: 1, minWidth: 0, outline: "none", fontSize: 13 }}/>
        </div>
        <SpeciesPicker lang={lang} value={speciesFilter} onChange={onSpeciesFilter}/>
        <DateRangeFilter lang={lang} value={dateRange} onChange={setDateRange}/>
        <button className="btn btn-sm btn-primary" onClick={() => { setSelected(null); setShowForm(true); }}>
          <Icon name="plus" size={13} color="#ECF1EC"/>{lang === "fr" ? "Nouvelle paillette" : "New straw"}
        </button>
      </div>

      {err && <div className="card" style={{ background: "var(--oxblood-50)", color: "var(--oxblood-800)" }}>{err}</div>}
      {loading ? (
        <div className="card"><SectionLoader lang={lang}/></div>
      ) : filtered.length === 0 ? (
        <EmptyBank lang={lang} onAdd={() => { setSelected(null); setShowForm(true); }}/>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <StrawTable lang={lang} straws={filtered} onPick={(s) => setSelected(s)} />
        </div>
      )}

      {selected && <StrawDetail lang={lang} straw={selected} onClose={() => setSelected(null)} onEdit={() => setShowForm(true)} onChanged={reload}/>}
      {showForm && <StrawForm lang={lang} straw={selected} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }}/>}
    </div>
  );
};

const SpeciesPicker = ({ lang, value, onChange }) => (
  <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-sunken)", borderRadius: 6 }}>
    <button className="btn btn-sm" onClick={() => onChange(null)}
      style={value === null ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" } : { background: "transparent", border: 0 }}>
      {lang === "fr" ? "Toutes" : "All"}
    </button>
    {SPECIES.filter((s) => ["cow", "pig", "goat", "sheep"].includes(s.id)).map((s) => (
      <button key={s.id} className="btn btn-sm" onClick={() => onChange(s.id)}
        style={value === s.id ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" } : { background: "transparent", border: 0 }}>
        <AnimalGlyph kind={s.glyph} size={12} color="currentColor"/>
        {lang === "fr" ? s.fr : s.en}
      </button>
    ))}
  </div>
);

const StrawTable = ({ lang, straws, onPick }) => (
  <div style={{ overflowX: "auto" }}>
    <div style={{ minWidth: 860 }}>
      <div style={{
        display: "grid", gridTemplateColumns: "140px 1fr 110px 130px 100px 100px 110px",
        padding: "10px 14px", borderBottom: "1px solid var(--border-1)", background: "var(--bg-sunken)",
        fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-2)",
      }}>
        <span>{lang === "fr" ? "Code" : "Code"}</span>
        <span>{lang === "fr" ? "Taureau / Verrat" : "Sire"}</span>
        <span>{lang === "fr" ? "Race" : "Breed"}</span>
        <span>{lang === "fr" ? "Fournisseur" : "Supplier"}</span>
        <span style={{ textAlign: "right" }}>{lang === "fr" ? "Stock" : "Stock"}</span>
        <span style={{ textAlign: "right" }}>{lang === "fr" ? "Motilité" : "Motility"}</span>
        <span>{lang === "fr" ? "Origine" : "Origin"}</span>
      </div>
      {straws.map((s) => {
        const sp = speciesById(s.species);
        const low = s.strawsRemaining < 5;
        return (
          <div key={s.id} onClick={() => onPick(s)} style={{
            display: "grid", gridTemplateColumns: "140px 1fr 110px 130px 100px 100px 110px",
            padding: "10px 14px", alignItems: "center", borderBottom: "1px solid var(--border-1)",
            cursor: "pointer", transition: "background 80ms",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-sunken)"}
          onMouseLeave={(e) => e.currentTarget.style.background = ""}>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-900)" }}>{s.code}</span>
            <div>
              <div style={{ fontSize: 13, color: "var(--ink-950)" }}>{s.sireName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {sp && <AnimalGlyph kind={sp.glyph} size={11} color="var(--fg-3)"/>}
                <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{s.sireRegistration || "—"}</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-700)" }}>{s.breed || "—"}</span>
            <span style={{ fontSize: 12, color: "var(--ink-700)" }}>{s.supplierName || "—"}</span>
            <span className="mono tnum" style={{ fontSize: 12, textAlign: "right", color: low ? "var(--oxblood-700)" : "var(--ink-800)", fontWeight: low ? 700 : 400 }}>
              {s.strawsRemaining}<span style={{ color: "var(--fg-3)", marginLeft: 2 }}>/{s.strawsTotal}</span>
            </span>
            <span className="mono tnum" style={{ fontSize: 12, textAlign: "right", color: "var(--ink-700)" }}>
              {s.motilityPct != null ? `${s.motilityPct}%` : "—"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--fg-2)" }}>{s.country || s.region || "—"}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const EmptyBank = ({ lang, onAdd }) => (
  <div className="dot-grid" style={{ border: "1px dashed var(--border-2)", borderRadius: 12, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--fg-2)" }}>
    <Icon name="flask" size={28} color="var(--ink-400)"/>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink-800)", fontWeight: 500 }}>
      {lang === "fr" ? "Banque de semence vide" : "Semen bank empty"}
    </div>
    <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
      {lang === "fr" ? "Ajoute des paillettes pour activer l'autocomplete IA dans le formulaire reproduction." : "Add straws to enable AI autocomplete in the reproduction form."}
    </div>
    <button className="btn btn-sm btn-primary" onClick={onAdd} style={{ marginTop: 6 }}>
      <Icon name="plus" size={12} color="#ECF1EC"/>{lang === "fr" ? "Nouvelle paillette" : "New straw"}
    </button>
  </div>
);

const StrawDetail = ({ lang, straw, onClose, onEdit, onChanged }) => {
  const [full, setFull] = React.useState(null);
  React.useEffect(() => {
    api.getSemenStraw(straw.id).then(setFull).catch(() => setFull(null));
  }, [straw.id]);

  const archive = async () => {
    if (!window.confirm(lang === "fr" ? "Archiver cette paillette ?" : "Archive this straw?")) return;
    try { await api.deleteSemenStraw(straw.id); onChanged(); onClose(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.55)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--paper)", width: "min(520px, 100vw)", height: "100%", overflow: "auto",
        borderLeft: "1px solid var(--border-1)", padding: 24, display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div className="overline" style={{ color: "var(--fg-2)" }}>{straw.code}</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, color: "var(--ink-950)", margin: "2px 0 0" }}>
              {straw.sireName}
            </h2>
            <div style={{ fontSize: 12, color: "var(--fg-2)" }}>{straw.breed}{straw.sireRegistration ? ` · ${straw.sireRegistration}` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-sm btn-ghost" onClick={onEdit}><Icon name="edit" size={13} color="var(--ink-700)"/></button>
            <button className="btn btn-sm btn-ghost" onClick={archive}><Icon name="trash" size={13} color="var(--oxblood-700)"/></button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <KV lang={lang} k={lang === "fr" ? "Stock" : "Stock"} v={`${straw.strawsRemaining} / ${straw.strawsTotal} paillettes`}/>
          <KV lang={lang} k={lang === "fr" ? "Motilité" : "Motility"} v={straw.motilityPct != null ? `${straw.motilityPct} %` : "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Concentration" : "Concentration"} v={straw.concentrationMillionPerMl != null ? `${straw.concentrationMillionPerMl} M/mL` : "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Lot" : "Batch"} v={straw.batchNumber || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Cuve / position" : "Tank / position"} v={straw.tankLocation || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Date collecte" : "Collection date"} v={straw.collectionDate || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Origine" : "Origin"} v={[straw.region, straw.country].filter(Boolean).join(", ") || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Fournisseur" : "Supplier"} v={straw.supplierName || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Centre" : "Center"} v={straw.collectionCenter || "—"}/>
          <KV lang={lang} k={lang === "fr" ? "Prix / dose" : "Price / dose"} v={straw.pricePerDose != null ? `${straw.pricePerDose}` : "—"}/>
        </div>

        {straw.geneticTraits && Object.keys(straw.geneticTraits).length > 0 && (
          <div>
            <div className="overline" style={{ marginBottom: 6, color: "var(--fg-2)" }}>{lang === "fr" ? "Traits génétiques" : "Genetic traits"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(straw.geneticTraits).map(([k, v]) => (
                <span key={k} className="tag" style={{ background: "var(--bg-sunken)" }}>
                  <span style={{ color: "var(--fg-2)" }}>{k}:</span> <strong className="mono">{String(v)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {straw.notes && (
          <div>
            <div className="overline" style={{ marginBottom: 6, color: "var(--fg-2)" }}>Notes</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-800)", whiteSpace: "pre-wrap" }}>{straw.notes}</div>
          </div>
        )}

        {full && (
          <div>
            <div className="overline" style={{ marginBottom: 6, color: "var(--fg-2)" }}>
              {lang === "fr" ? "Historique" : "History"} · {full.totalUses ?? 0} IA
              {full.successRate != null && <> · <span style={{ color: full.successRate >= 60 ? "var(--solidite-700)" : "var(--oxblood-700)" }}>{full.successRate}% {lang === "fr" ? "réussite" : "success"}</span></>}
            </div>
            {(!full.events || full.events.length === 0) ? (
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucune utilisation enregistrée." : "No use recorded."}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {full.events.slice(0, 10).map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "var(--bg-sunken)", borderRadius: 4, fontSize: 12 }}>
                    <span className="mono">{String(e.eventDate).slice(0, 10)}</span>
                    <span style={{ color: "var(--fg-2)" }}>animal #{e.animalId}</span>
                    <span style={{ color: e.outcome === "success" || e.outcome === "confirmed" || e.outcome === "pregnant" ? "var(--solidite-700)" : "var(--fg-3)" }}>
                      {e.outcome || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const KV = ({ k, v }) => (
  <div>
    <div className="overline" style={{ color: "var(--fg-3)", marginBottom: 2 }}>{k}</div>
    <div style={{ fontSize: 12.5, color: "var(--ink-900)" }}>{v}</div>
  </div>
);

const StrawForm = ({ lang, straw, onClose, onSaved }) => {
  const editing = !!straw?.id;
  const [form, setForm] = React.useState(() => editing ? { ...straw, traits_text: straw.geneticTraits ? JSON.stringify(straw.geneticTraits) : "" } : {
    code: "", sire_name: "", species: "cow", straws_total: 25,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [codeDirty, setCodeDirty] = React.useState(editing);
  React.useEffect(() => {
    if (codeDirty || editing) return;
    api.listSemenStraws().then((rows) => {
      setForm((f) => ({ ...f, code: nextStrawCode(f.species || "cow", Array.isArray(rows) ? rows : []) }));
    }).catch(() => {});
  }, [codeDirty, editing, form.species]);
  const [suppliers, setSuppliers] = React.useState([]);
  React.useEffect(() => {
    // Use the supplier names already joined in listSemenStraws as a shallow cache;
    // a fuller picker would hit a /suppliers endpoint — keep it simple for now.
    api.listSemenStraws().then((rows) => {
      const seen = new Map();
      (Array.isArray(rows) ? rows : []).forEach((r) => { if (r.supplierId && r.supplierName) seen.set(r.supplierId, r.supplierName); });
      setSuppliers(Array.from(seen, ([id, name]) => ({ id, name })));
    }).catch(() => {});
  }, []);

  // Mâles du cheptel (même espèce) éligibles pour lier la paillette à une
  // fiche animal réelle — la saisie libre du nom reste possible/prioritaire
  // pour la semence importée sans fiche (ex. taureau étranger).
  const [sires, setSires] = React.useState([]);
  React.useEffect(() => {
    api.listAnimals().then((rows) => {
      setSires((Array.isArray(rows) ? rows : []).filter((a) => a.sex === "M" && (!form.species || a.species === form.species)));
    }).catch(() => {});
  }, [form.species]);

  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let traits = null;
      if (form.traits_text && form.traits_text.trim()) {
        try { traits = JSON.parse(form.traits_text); }
        catch { throw new Error(lang === "fr" ? "Traits génétiques: JSON invalide" : "Genetic traits: invalid JSON"); }
      }
      const payload = {
        code: form.code, sire_name: form.sire_name || form.sireName, sire_registration: form.sire_registration || form.sireRegistration || null,
        sire_animal_id: form.sire_animal_id ? Number(form.sire_animal_id) : (form.sireAnimalId || null),
        species: form.species, breed: form.breed || null, country: form.country || null, region: form.region || null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : (form.supplierId || null),
        collection_center: form.collection_center || form.collectionCenter || null,
        collection_date: form.collection_date || form.collectionDate || null,
        batch_number: form.batch_number || form.batchNumber || null,
        motility_pct: form.motility_pct != null ? Number(form.motility_pct) : (form.motilityPct ?? null),
        concentration_million_per_ml: form.concentration_million_per_ml != null ? Number(form.concentration_million_per_ml) : (form.concentrationMillionPerMl ?? null),
        straws_per_dose: form.straws_per_dose ? Number(form.straws_per_dose) : (form.strawsPerDose ?? 1),
        genetic_traits: traits,
        notes: form.notes || null,
        straws_total: Number(form.straws_total ?? form.strawsTotal),
        straws_remaining: form.straws_remaining != null ? Number(form.straws_remaining) : (form.strawsRemaining ?? Number(form.straws_total ?? form.strawsTotal)),
        tank_location: form.tank_location || form.tankLocation || null,
        price_per_dose: form.price_per_dose ? Number(form.price_per_dose) : (form.pricePerDose ?? null),
      };
      if (editing) await api.updateSemenStraw(straw.id, payload);
      else await api.createSemenStraw(payload);
      window.dispatchEvent(new CustomEvent("farmos:semen-changed"));
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.55)", zIndex: 250, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 40 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--paper)", borderRadius: 12, padding: 24, width: "min(680px, 100vw)", maxHeight: "calc(100vh - 80px)", overflow: "auto",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, color: "var(--ink-950)" }}>
            {editing ? (lang === "fr" ? "Modifier paillette" : "Edit straw") : (lang === "fr" ? "Nouvelle paillette" : "New straw")}
          </h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
        </div>

        <Row><Field label={lang === "fr" ? "Code (unique)" : "Code (unique)"} req>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="input mono" style={{ flex: 1 }} value={form.code || ""} disabled={editing}
              onChange={(e) => { setCodeDirty(true); set("code", e.target.value); }}
              placeholder={lang === "fr" ? "généré automatiquement…" : "auto-generated…"}/>
            {!editing && (
              <button type="button" className="btn btn-sm" title={lang === "fr" ? "Régénérer" : "Regenerate"}
                onClick={async () => { try { const rows = await api.listSemenStraws(); setCodeDirty(false); set("code", nextStrawCode(form.species || "cow", Array.isArray(rows) ? rows : [])); } catch {} }}>
                <Icon name="sparkle" size={12} color="var(--clay-700)"/>Auto
              </button>
            )}
          </div>
        </Field>
        <Field label={lang === "fr" ? "Espèce" : "Species"} req>
          <select className="input" value={form.species} onChange={(e) => set("species", e.target.value)}>
            {SPECIES.filter((s) => ["cow", "pig", "goat", "sheep"].includes(s.id)).map((s) => (
              <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>
            ))}
          </select>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Animal du cheptel (optionnel)" : "Herd animal (optional)"}>
          <Autocomplete
            value={form.sire_animal_id || ""}
            onChange={(v) => {
              set("sire_animal_id", v || null);
              const picked = sires.find((a) => String(a.id) === String(v));
              if (picked) {
                setForm((f) => ({
                  ...f,
                  sire_animal_id: v || null,
                  sire_name: picked.name || picked.externalId || f.sire_name,
                  breed: picked.race || f.breed,
                }));
              }
            }}
            placeholder={lang === "fr" ? "— saisie libre ci-dessous —" : "— free text below —"}
            options={sires.map((a) => ({ value: a.id, label: a.name || a.externalId || `#${a.id}` }))}
          />
        </Field>
        <Field label={lang === "fr" ? "Nom taureau / verrat" : "Sire name"} req>
          <input className="input" value={form.sire_name || form.sireName || ""} onChange={(e) => set("sire_name", e.target.value)} placeholder="Holm Honest"/>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "N° registre" : "Registration #"}>
          <input className="input mono" value={form.sire_registration || form.sireRegistration || ""} onChange={(e) => set("sire_registration", e.target.value)}/>
        </Field>
        <div/></Row>

        <Row><Field label={lang === "fr" ? "Race" : "Breed"}>
          <input className="input" value={form.breed || ""} onChange={(e) => set("breed", e.target.value)} placeholder="Holstein"/>
        </Field>
        <Field label={lang === "fr" ? "Fournisseur" : "Supplier"}>
          <Autocomplete
            value={form.supplier_id || form.supplierId || ""}
            onChange={(v) => set("supplier_id", v)}
            placeholder="—"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Pays" : "Country"}>
          <input className="input" value={form.country || ""} onChange={(e) => set("country", e.target.value)} placeholder="Canada"/>
        </Field>
        <Field label={lang === "fr" ? "Région" : "Region"}>
          <input className="input" value={form.region || ""} onChange={(e) => set("region", e.target.value)} placeholder="Québec"/>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Centre de collecte" : "Collection center"}>
          <input className="input" value={form.collection_center || form.collectionCenter || ""} onChange={(e) => set("collection_center", e.target.value)}/>
        </Field>
        <Field label={lang === "fr" ? "Date collecte" : "Collection date"}>
          <input className="input" type="date" value={form.collection_date || form.collectionDate || ""} onChange={(e) => set("collection_date", e.target.value)}/>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Lot" : "Batch"}>
          <input className="input mono" value={form.batch_number || form.batchNumber || ""} onChange={(e) => set("batch_number", e.target.value)}/>
        </Field>
        <Field label={lang === "fr" ? "Cuve / position" : "Tank / position"}>
          <input className="input mono" value={form.tank_location || form.tankLocation || ""} onChange={(e) => set("tank_location", e.target.value)} placeholder="T2/C4/G3"/>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Motilité (%)" : "Motility (%)"}>
          <input className="input mono" type="number" min="0" max="100" value={form.motility_pct ?? form.motilityPct ?? ""} onChange={(e) => set("motility_pct", e.target.value)}/>
        </Field>
        <Field label={lang === "fr" ? "Concentration (M/mL)" : "Concentration (M/mL)"}>
          <input className="input mono" type="number" min="0" value={form.concentration_million_per_ml ?? form.concentrationMillionPerMl ?? ""} onChange={(e) => set("concentration_million_per_ml", e.target.value)}/>
        </Field></Row>

        <Row><Field label={lang === "fr" ? "Paillettes — total" : "Straws — total"} req>
          <input className="input mono" type="number" min="0" value={form.straws_total ?? form.strawsTotal ?? 0} onChange={(e) => set("straws_total", e.target.value)}/>
        </Field>
        <Field label={lang === "fr" ? "Paillettes — restantes" : "Straws — remaining"}>
          <input className="input mono" type="number" min="0" value={form.straws_remaining ?? form.strawsRemaining ?? ""} onChange={(e) => set("straws_remaining", e.target.value)} placeholder={String(form.straws_total ?? form.strawsTotal ?? "")}/>
        </Field></Row>

        <Field label={lang === "fr" ? "Traits génétiques (JSON)" : "Genetic traits (JSON)"}>
          <textarea className="input mono" style={{ height: 60, padding: 10, fontSize: 11.5 }} value={form.traits_text || ""} onChange={(e) => set("traits_text", e.target.value)} placeholder='{"milk_kg":1200,"longevity":105,"calving_ease":6}'/>
        </Field>

        <Field label="Notes">
          <textarea className="input" style={{ height: 50, padding: 10 }} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
        </Field>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-sm" onClick={onClose}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
          <button className="btn btn-sm btn-primary" disabled={saving} onClick={submit}>
            <Icon name="check" size={12} color="#ECF1EC"/>
            {saving ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>
);
const Field = ({ label, req, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}{req && <span style={{ color: "var(--oxblood-700)" }}> *</span>}
    </div>
    {children}
  </div>
);

export { SemenBankScreen };
