/* eslint-disable */
import React from "react";
import { Icon, AnimalGlyph } from "./icons";
import { SPECIES, speciesById } from "./data";
import { api } from "./api";
import { nextAnimalExternalId, nextStrawCode, nextInvoiceNumber } from "./id-gen";

// QuickEntryDrawer — slide-in panel from right with adaptive entry forms.
// Tabs: Animal · Production · Santé · Stock · Repro · Mortalité
// Species-aware forms (e.g., milk entry only for milk-producing species).

// Récupère l'ID numérique d'un row, qu'il vienne d'une API brute (id=7) ou
// d'un adapter qui préfixe (id="M-7", _pk=7). Retourne null si aucun.
function toNumericId(row) {
  if (!row) return null;
  if (typeof row._pk === "number") return row._pk;
  if (typeof row.id === "number") return row.id;
  if (typeof row.id === "string") {
    const m = row.id.match(/(\d+)$/);
    if (m) return Number(m[1]);
  }
  return null;
}

// ─── Autocomplete (replaces native <select> across forms) ───────────────
const Autocomplete = ({ value, onChange, options, placeholder, allowClear = true }) => {
  const norm = (options || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label, group: o.group }
  );
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const selected = norm.find((o) => String(o.value) === String(value));
  const display = open ? query : (selected ? selected.label : "");

  const q = query.trim().toLowerCase();
  const filtered = !open
    ? norm
    : (q ? norm.filter((o) => o.label.toLowerCase().includes(q) || (o.group || "").toLowerCase().includes(q)) : norm);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (o) => { onChange(o.value); setOpen(false); setQuery(""); inputRef.current && inputRef.current.blur(); };
  const clear = (e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); };

  let lastGroup = null;
  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="input"
        autoComplete="off"
        placeholder={placeholder || "—"}
        value={display}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setQuery(""); }
          else if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); pick(filtered[0]); }
        }}
      />
      {allowClear && value && !open && (
        <button type="button" onMouseDown={clear} aria-label="clear"
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-500)", padding: 4, lineHeight: 1 }}>
          <Icon name="x" size={11} color="currentColor"/>
        </button>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--bg-card, #fff)", border: "1px solid var(--border-1)",
          borderRadius: 8, boxShadow: "0 8px 24px -8px rgba(14,36,24,0.18)",
          maxHeight: 240, overflowY: "auto", zIndex: 200,
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-500)" }}>—</div>
          )}
          {filtered.map((o) => {
            const showGroup = o.group && o.group !== lastGroup;
            lastGroup = o.group || lastGroup;
            const isSel = String(o.value) === String(value);
            return (
              <React.Fragment key={`${o.group || ""}::${o.value}`}>
                {showGroup && (
                  <div style={{ padding: "6px 12px 2px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: "var(--ink-500)", background: "var(--bg-sunken, #f7f5ef)" }}>
                    {o.group}
                  </div>
                )}
                <div
                  onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                  style={{ padding: "8px 12px", fontSize: 13.5, cursor: "pointer",
                    background: isSel ? "var(--bg-sunken, #f4f3ef)" : "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken, #f4f3ef)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isSel ? "var(--bg-sunken, #f4f3ef)" : "transparent")}
                >
                  {o.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

// AutocompleteDB — same UX as Autocomplete but loads options from the DB
// (`farmos_lookups` for breed/pig_type/vet/route/death_cause OR `farmos_diseases`)
// and exposes a "+ Ajouter" action so the user can add new values on the fly.
const AutocompleteDB = ({ value, onChange, category, scope, lang, placeholder, allowClear = true, customFetch, customCreate, useLabel = false, noAdd = false }) => {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState(null);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const reload = React.useCallback(() => {
    setLoading(true);
    const p = customFetch ? customFetch() : api.listLookups(category, scope || null);
    p.then((res) => {
      const list = Array.isArray(res) ? res : [];
      setRows(list);
    })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, scope, customFetch]);

  React.useEffect(() => { reload(); }, [reload]);

  const norm = rows.map((r) => {
    const lbl = lang === "fr"
      ? (r.valueFr || r.value_fr || r.nameFr || r.name_fr || r.name)
      : (r.valueEn || r.value_en || r.nameEn || r.name_en || r.valueFr || r.value_fr || r.nameFr || r.name_fr || r.name);
    const val = useLabel ? lbl : (r.id != null ? r.id : lbl);
    return { value: val, label: lbl, _row: r };
  });

  const selected = norm.find((o) => String(o.value) === String(value)) || (useLabel && value ? { value, label: value } : null);
  const display = open ? query : (selected ? selected.label : "");
  const q = query.trim().toLowerCase();
  const filtered = !open ? norm : (q ? norm.filter((o) => o.label.toLowerCase().includes(q)) : norm);
  const exact = filtered.some((o) => o.label.toLowerCase() === q);
  const canAdd = !noAdd && open && q.length > 0 && !exact && !adding;

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (o) => { onChange(o.value); setOpen(false); setQuery(""); inputRef.current && inputRef.current.blur(); };
  const clear = (e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); };

  const addNew = async () => {
    const v = query.trim();
    if (!v || adding) return;
    setAdding(true);
    setError(null);
    try {
      const body = customCreate ? customCreate(v) : { category, scope_key: scope || null, value_fr: v, value_en: v };
      const res = customCreate
        ? await api.createDisease(body)
        : await api.createLookup(body);
      reload();
      window.dispatchEvent(new CustomEvent("farmos:lookup-created", { detail: { category, scope } }));
      if (useLabel) onChange(v);
      else if (res && res.id != null) onChange(res.id);
      setOpen(false);
      setQuery("");
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="input"
        autoComplete="off"
        placeholder={placeholder || (loading ? (lang === "fr" ? "Chargement…" : "Loading…") : "—")}
        value={display}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setQuery(""); }
          else if (e.key === "Enter") {
            if (filtered.length > 0 && !canAdd) { e.preventDefault(); pick(filtered[0]); }
            else if (canAdd) { e.preventDefault(); addNew(); }
          }
        }}
      />
      {allowClear && value && !open && (
        <button type="button" onMouseDown={clear} aria-label="clear"
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-500)", padding: 4, lineHeight: 1 }}>
          <Icon name="x" size={11} color="currentColor"/>
        </button>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--bg-card, #fff)", border: "1px solid var(--border-1)",
          borderRadius: 8, boxShadow: "0 8px 24px -8px rgba(14,36,24,0.18)",
          maxHeight: 260, overflowY: "auto", zIndex: 200,
        }}>
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-500)" }}>
              {lang === "fr" ? "Chargement…" : "Loading…"}
            </div>
          )}
          {!loading && filtered.length === 0 && !canAdd && (
            <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-500)" }}>—</div>
          )}
          {filtered.map((o) => {
            const isSel = String(o.value) === String(value);
            return (
              <div key={o.value}
                onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                style={{ padding: "8px 12px", fontSize: 13.5, cursor: "pointer",
                  background: isSel ? "var(--bg-sunken, #f4f3ef)" : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken, #f4f3ef)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = isSel ? "var(--bg-sunken, #f4f3ef)" : "transparent")}
              >
                {o.label}
              </div>
            );
          })}
          {canAdd && (
            <div
              onMouseDown={(e) => { e.preventDefault(); addNew(); }}
              style={{ padding: "10px 12px", fontSize: 13, cursor: "pointer",
                borderTop: filtered.length > 0 ? "1px solid var(--border-1)" : 0,
                color: "var(--clay-700)", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-sunken, #f4f3ef)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon name="plus" size={12} color="currentColor"/>
              {lang === "fr" ? `Ajouter « ${query.trim()} »` : `Add "${query.trim()}"`}
            </div>
          )}
          {error && (
            <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--rust-700)" }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
};

const activeSpeciesList = (enabledSpecies) => {
  const list = Array.isArray(enabledSpecies) && enabledSpecies.length
    ? SPECIES.filter((s) => enabledSpecies.includes(s.id))
    : SPECIES;
  return list.length ? list : SPECIES;
};

const normalizeDefaultSpecies = (defaultSpecies, enabledSpecies, predicate = () => true) => {
  const list = activeSpeciesList(enabledSpecies).filter(predicate);
  if (defaultSpecies && list.some((s) => s.id === defaultSpecies)) return defaultSpecies;
  return (list[0] || SPECIES[0]).id;
};

const animalLabel = (a) => {
  const id = a.external_id || a.externalId;
  const base = a.name || id || `#${a.id}`;
  return id && a.name ? `${base} · ${id}` : base;
};

const QuickEntryDrawer = ({ open, onClose, defaultTab = "animal", lang, defaultSpecies, enabledSpecies, context, onSaved }) => {
  const [tab, setTab] = React.useState(defaultTab);
  React.useEffect(() => { if (open) setTab(defaultTab); }, [open, defaultTab]);

  if (!open) return null;

  const tabs = [
    { id: "animal",     icon: "plus",      fr: "Nouvel animal",   en: "New animal" },
    { id: "production", icon: "droplet",   fr: "Production",      en: "Production" },
    { id: "health",     icon: "syringe",   fr: "Soin / vaccin",   en: "Care / vaccine" },
    { id: "stock",      icon: "package",   fr: "Stock",           en: "Stock" },
    { id: "repro",      icon: "fingerprint", fr: "Reproduction",  en: "Reproduction" },
    { id: "death",      icon: "alert",     fr: "Mortalité",       en: "Mortality" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(14, 36, 24, 0.42)",
        zIndex: 90, animation: "fade-in 200ms var(--ease-out)",
      }}/>
      {/* Drawer */}
      <aside style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 480, maxWidth: "100vw",
        background: "var(--bg-app)", borderLeft: "1px solid var(--border-1)",
        boxShadow: "-20px 0 40px -10px rgba(14,36,24,0.18)",
        zIndex: 100, display: "flex", flexDirection: "column",
        animation: "slide-in-right 240ms var(--ease-out)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border-1)",
        }}>
          <div>
            <div className="overline">{lang === "fr" ? "Saisie rapide · Quick entry" : "Quick entry · Saisie rapide"}</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.025em", marginTop: 4, marginBottom: 14 }}>
              {lang === "fr" ? "Enregistrer une donnée" : "Record an entry"}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }}>
            <Icon name="x" size={16} color="var(--ink-700)"/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", gap: 4, padding: "10px 24px 0", borderBottom: "1px solid var(--border-1)", flexShrink: 0 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 12px", border: 0, background: "transparent",
              fontSize: 12.5, fontWeight: 600,
              color: tab === t.id ? "var(--ink-950)" : "var(--ink-500)",
              borderBottom: tab === t.id ? "2px solid var(--clay-700)" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
            }}>
              <Icon name={t.icon} size={13} color="currentColor"/>
              {lang === "fr" ? t.fr : t.en}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 24px" }}>
          {tab === "animal"     && <AnimalForm     lang={lang} defaultSpecies={defaultSpecies} enabledSpecies={enabledSpecies} onSaved={onSaved} onClose={onClose}/>}
          {tab === "production" && <ProductionForm lang={lang} defaultSpecies={defaultSpecies} enabledSpecies={enabledSpecies} context={context} onSaved={onSaved} onClose={onClose}/>}
          {tab === "health"     && <HealthForm     lang={lang} defaultSpecies={defaultSpecies} enabledSpecies={enabledSpecies} context={context} onSaved={onSaved} onClose={onClose}/>}
          {tab === "stock"      && <StockForm      lang={lang} onSaved={onSaved} onClose={onClose}/>}
          {tab === "repro"      && <ReproForm      lang={lang} defaultSpecies={defaultSpecies} enabledSpecies={enabledSpecies} context={context} onSaved={onSaved} onClose={onClose}/>}
          {tab === "death"      && <DeathForm      lang={lang} defaultSpecies={defaultSpecies} enabledSpecies={enabledSpecies} onSaved={onSaved} onClose={onClose}/>}
        </div>
      </aside>
    </>
  );
};

// ─── Animal form (SPECIES-ADAPTIVE) ──────────────────────────────────────
const AnimalForm = ({ lang, defaultSpecies, enabledSpecies, onSaved, onClose }) => {
  const availableSpecies = activeSpeciesList(enabledSpecies);
  const [species, setSpecies] = React.useState(() => normalizeDefaultSpecies(defaultSpecies, enabledSpecies));
  const [form, setForm] = React.useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const sp = speciesById(species);

  // Auto-génération de l'ID à chaque fois que l'espèce change, tant que
  // l'utilisateur n'a pas modifié manuellement le champ (tagDirty=false).
  const [tagDirty, setTagDirty] = React.useState(false);
  const [animalsForGen, setAnimalsForGen] = React.useState([]);
  React.useEffect(() => {
    let cancel = false;
    api.listAnimals().then((rows) => { if (!cancel && Array.isArray(rows)) setAnimalsForGen(rows); }).catch(() => {});
    return () => { cancel = true; };
  }, []);
  React.useEffect(() => {
    if (tagDirty) return;
    const next = nextAnimalExternalId(species, animalsForGen);
    setForm((f) => ({ ...f, tag: next }));
  }, [species, animalsForGen, tagDirty]);

  // Lots = bandes/groupes existants (pas un référentiel fixe). On suggère les
  // valeurs déjà saisies sur d'autres animaux, tout en laissant la saisie libre.
  const existingLots = React.useMemo(() => {
    const seen = new Set();
    (animalsForGen || []).forEach((a) => {
      const l = (a.lot || "").trim();
      if (l) seen.add(l);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [animalsForGen]);

  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    const payload = {
      species,
      external_id: form.tag || null,
      name: form.name || null,
      race: form.race || null,
      sex: form.sex || null,
      date_of_birth: form.dob || null,
      weight: form.weight ? Number(form.weight) : null,
      count: form.count ? Number(form.count) : null,
      lot: form.lot || null,
      barn: form.barn || null,
      room: form.room || null,
      type: form.type || null,
    };
    try {
      await api.createAnimal(payload);
      window.dispatchEvent(new CustomEvent("farmos:animal-created"));
      onSaved && onSaved({
        kind: "animal",
        severity: "success",
        message: lang === "fr"
          ? `${sp.frSing} ${form.name || form.tag || "nouveau"} enregistré`
          : `New ${sp.enSing.toLowerCase()} ${form.name || form.tag || ""} recorded`,
      });
      onClose();
    } catch (err) {
      onSaved && onSaved({
        kind: "animal",
        severity: "error",
        message: (lang === "fr" ? "Échec : " : "Failed: ") + (err.message || "erreur API"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="entry-form" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormSection label={lang === "fr" ? "Espèce · les champs s'adaptent" : "Species · fields adapt"}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {availableSpecies.map((s) => (
            <button key={s.id} type="button" onClick={() => setSpecies(s.id)}
              className={`species-pill ${species === s.id ? "active" : ""}`}
              style={{ height: 32, fontSize: 12 }}>
              <AnimalGlyph kind={s.glyph} size={14} color={species === s.id ? "var(--bone-50)" : "var(--forest-700)"}/>
              {lang === "fr" ? s.fr : s.en}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection label={lang === "fr" ? "Identification" : "Identification"}>
        <FormGrid>
          <FormField label={species === "chicken" || species === "duck" || species === "turkey" ? (lang === "fr" ? "ID Lot" : "Batch ID") : species === "fish" ? (lang === "fr" ? "ID Bassin" : "Pond ID") : (lang === "fr" ? "ID / Numéro" : "ID / Tag")} required>
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input mono" style={{ flex: 1 }}
                value={form.tag || ""}
                onChange={(e) => { setTagDirty(true); set("tag", e.target.value); }}
                placeholder={lang === "fr" ? "généré automatiquement…" : "auto-generated…"}/>
              <button type="button" className="btn btn-sm"
                title={lang === "fr" ? "Régénérer (revient à l'auto)" : "Regenerate (back to auto)"}
                onClick={() => { setTagDirty(false); set("tag", nextAnimalExternalId(species, animalsForGen)); }}>
                <Icon name="sparkle" size={12} color="var(--clay-700)"/>
                {lang === "fr" ? "Auto" : "Auto"}
              </button>
            </div>
          </FormField>
          {!(species === "chicken" || species === "duck" || species === "turkey" || species === "fish") && (
            <FormField label={lang === "fr" ? "Nom (optionnel)" : "Name (optional)"}>
              <input className="input" placeholder={species === "cow" ? "Marguerite" : species === "pig" ? "Truie A33" : species === "goat" ? "Câline" : species === "sheep" ? "Brebis 12" : "—"} value={form.name || ""} onChange={(e) => set("name", e.target.value)}/>
            </FormField>
          )}
          {(species === "chicken" || species === "duck" || species === "turkey" || species === "fish") && (
            <FormField label={lang === "fr" ? "Nombre" : "Count"} required>
              <input className="input mono" type="number" placeholder="4200" value={form.count || ""} onChange={(e) => set("count", e.target.value)}/>
            </FormField>
          )}
          <FormField label={lang === "fr" ? "Race" : "Breed"}>
            <AutocompleteDB
              value={form.race || ""}
              onChange={(v) => set("race", v)}
              useLabel
              lang={lang}
              category="breed"
              scope={species}
              placeholder={lang === "fr" ? "Rechercher ou ajouter une race…" : "Search or add a breed…"}
            />
          </FormField>
          {!(species === "chicken" || species === "duck" || species === "turkey" || species === "fish") && (
            <FormField label={lang === "fr" ? "Sexe" : "Sex"}>
              <div style={{ display: "flex", gap: 4 }}>
                {["F", "M"].map((s) => (
                  <button key={s} type="button" onClick={() => set("sex", s)}
                    className="btn btn-sm"
                    style={form.sex === s ? { background: "var(--forest-900)", color: "var(--bone-50)", borderColor: "var(--forest-900)", flex: 1, justifyContent: "center" } : { flex: 1, justifyContent: "center" }}>
                    {s === "F" ? (lang === "fr" ? "Femelle" : "Female") : (lang === "fr" ? "Mâle" : "Male")}
                  </button>
                ))}
              </div>
            </FormField>
          )}
          <FormField label={lang === "fr" ? "Date de naissance" : "Date of birth"}>
            <input className="input" type="date" value={form.dob || ""} onChange={(e) => set("dob", e.target.value)}/>
          </FormField>
          <FormField label={lang === "fr" ? "Poids (kg)" : "Weight (kg)"}>
            <input className="input mono" type="number" placeholder="450" value={form.weight || ""} onChange={(e) => set("weight", e.target.value)}/>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label={lang === "fr" ? "Localisation" : "Location"}>
        <FormGrid>
          <FormField label={species === "fish" ? (lang === "fr" ? "Bassin" : "Pond") : (lang === "fr" ? "Bâtiment" : "Barn")}>
            <AutocompleteDB
              value={form.barn || ""}
              onChange={(v) => set("barn", v)}
              useLabel
              lang={lang}
              category="building"
              scope={species}
              placeholder={species === "fish"
                ? (lang === "fr" ? "Rechercher ou ajouter un bassin…" : "Search or add a pond…")
                : (lang === "fr" ? "Rechercher ou ajouter un bâtiment…" : "Search or add a barn…")}
            />
          </FormField>
          <FormField label={lang === "fr" ? "Lot" : "Batch"}>
            <input className="input" placeholder="Lot A" list="farmos-lots-list"
              value={form.lot || ""} onChange={(e) => set("lot", e.target.value)}/>
            <datalist id="farmos-lots-list">
              {existingLots.map((l) => <option key={l} value={l}/>)}
            </datalist>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Species-specific extra fields */}
      {species === "cow" && (
        <FormSection label={lang === "fr" ? "Bovins — champs spécifiques" : "Cattle — specific fields"}>
          <FormGrid>
            <FormField label={lang === "fr" ? "Boucle officielle" : "Official ear tag"}>
              <input className="input mono" placeholder="CAN 0123 4567 8910" value={form.earLoop || ""} onChange={(e) => set("earLoop", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "N° lactation" : "Lactation #"}>
              <input className="input mono" type="number" placeholder="1" value={form.lactation || ""} onChange={(e) => set("lactation", e.target.value)}/>
            </FormField>
          </FormGrid>
        </FormSection>
      )}
      {species === "pig" && (
        <FormSection label={lang === "fr" ? "Porcs — champs spécifiques" : "Pigs — specific fields"}>
          <FormGrid>
            <FormField label={lang === "fr" ? "Type" : "Type"}>
              <AutocompleteDB
                value={form.type || ""}
                onChange={(v) => set("type", v)}
                useLabel
                lang={lang}
                category="pig_type"
                placeholder={lang === "fr" ? "Rechercher ou ajouter un type…" : "Search or add a type…"}
              />
            </FormField>
            <FormField label={lang === "fr" ? "Salle" : "Room"}>
              <AutocompleteDB
                key={form.barn || "_no-barn"}
                value={form.room || ""}
                onChange={(v) => set("room", v)}
                useLabel
                lang={lang}
                category="room"
                scope={form.barn || species}
                placeholder={form.barn
                  ? (lang === "fr" ? "Rechercher ou ajouter une salle…" : "Search or add a room…")
                  : (lang === "fr" ? "Choisir un bâtiment d'abord…" : "Pick a building first…")}
              />
            </FormField>
          </FormGrid>
        </FormSection>
      )}
      {species === "fish" && (
        <FormSection label={lang === "fr" ? "Aquaculture — paramètres eau" : "Aquaculture — water parameters"}>
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Oxygène (mg/L)" : "Oxygen (mg/L)"}>
              <input className="input mono" type="number" step="0.1" placeholder="7.2" value={form.oxygen || ""} onChange={(e) => set("oxygen", e.target.value)}/>
            </FormField>
            <FormField label="pH">
              <input className="input mono" type="number" step="0.1" placeholder="7.4" value={form.ph || ""} onChange={(e) => set("ph", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Temp. eau (°C)" : "Water temp (°C)"}>
              <input className="input mono" type="number" step="0.1" placeholder="15" value={form.tempW || ""} onChange={(e) => set("tempW", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Densité (kg/m³)" : "Density (kg/m³)"}>
              <input className="input mono" type="number" placeholder="30" value={form.density || ""} onChange={(e) => set("density", e.target.value)}/>
            </FormField>
          </FormGrid>
        </FormSection>
      )}
      {(species === "chicken" || species === "duck" || species === "turkey") && (
        <FormSection label={lang === "fr" ? "Volaille — environnement" : "Poultry — environment"}>
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Temp. (°C)" : "Temp (°C)"}>
              <input className="input mono" type="number" step="0.1" placeholder="22" value={form.temp || ""} onChange={(e) => set("temp", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Humidité (%)" : "Humidity (%)"}>
              <input className="input mono" type="number" placeholder="60" value={form.humidity || ""} onChange={(e) => set("humidity", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Âge (j)" : "Age (d)"}>
              <input className="input mono" type="number" placeholder="42" value={form.age || ""} onChange={(e) => set("age", e.target.value)}/>
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      <FormSection label={lang === "fr" ? "Notes" : "Notes"}>
        <textarea className="input" style={{ height: 70, padding: 10, resize: "vertical" }} placeholder={lang === "fr" ? "Observations, origine, condition d'arrivée…" : "Observations, origin, arrival condition…"} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
      </FormSection>

      {/* Adaptive note */}
      <div className="card" style={{ background: "var(--bg-sunken)", display: "flex", gap: 10, alignItems: "flex-start", padding: 12 }}>
        <Icon name="sparkle" size={14} color="var(--clay-700)"/>
        <div style={{ fontSize: 12, color: "var(--ink-700)", lineHeight: 1.5 }}>
          {lang === "fr"
            ? <>Le formulaire affiche <strong>{sp.fields.length} champs</strong> propres aux <strong>{sp.fr.toLowerCase()}</strong>. Changer d'espèce ci-dessus reconfigure tout instantanément.</>
            : <>The form shows <strong>{sp.fields.length} fields</strong> specific to <strong>{sp.en.toLowerCase()}</strong>. Switching species above reconfigures everything instantly.</>
          }
        </div>
      </div>

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Production form (milk / eggs / weight) ──────────────────────────────
const ProductionForm = ({ lang, defaultSpecies, enabledSpecies, context, onSaved, onClose }) => {
  const availableSpecies = activeSpeciesList(enabledSpecies);
  const [species, setSpecies] = React.useState(() => normalizeDefaultSpecies(defaultSpecies, enabledSpecies));
  const sp = speciesById(species);
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    animal: context?.animalId ? String(context.animalId) : "",
    period: "AM",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When context.productKind is provided (e.g. "growth" from the Pesée button),
  // override the species-default kind.
  const productKind = context?.productKind || sp.productPrimary; // milk | eggs | growth | wool
  const [liveAnimals, setLiveAnimals] = React.useState(null);
  React.useEffect(() => {
    api.listAnimals().then((rows) => { if (Array.isArray(rows)) setLiveAnimals(rows); }).catch(() => {});
  }, []);
  const animalsForSpecies = (liveAnimals || []).filter((a) => a.species === species);
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    if (saving) return;
    if (!form.value || !form.date) {
      onSaved && onSaved({ kind: "production", severity: "error", message: lang === "fr" ? "Quantité et date requises." : "Quantity and date are required." });
      return;
    }
    const selectedAnimal = animalsForSpecies.find((a) => String(a.id) === String(form.animal) || String(a.external_id || a.externalId) === String(form.animal));
    const unit = productKind === "milk" ? "L" : productKind === "eggs" ? "œufs" : productKind === "wool" ? "kg" : "kg";
    const flockCount = selectedAnimal?.count ?? selectedAnimal?.animalCount ?? null;
    const eggs = Number(form.value) || 0;
    const broken = Number(form.broken) || 0;
    const autoLayRate = flockCount && flockCount > 0
      ? Math.min(100, ((Math.max(0, eggs - broken)) / flockCount) * 100)
      : null;
    const quality = productKind === "milk"
      ? { fat: form.fat ? Number(form.fat) : null, protein: form.protein ? Number(form.protein) : null, conductivity: form.conductivity ? Number(form.conductivity) : null }
      : productKind === "eggs"
      ? { broken: form.broken ? Number(form.broken) : null, size: form.size ? Number(form.size) : null, lay_rate: autoLayRate != null ? Number(autoLayRate.toFixed(2)) : null }
      : null;
    setSaving(true);
    const payload = {
      animal_id: toNumericId(selectedAnimal),
      species,
      product_type: productKind === "milk" ? "milk" : productKind === "eggs" ? "eggs" : productKind === "wool" ? "wool" : "growth",
      log_date: form.date,
      period: form.period || "AM",
      quantity: Number(form.value),
      unit,
      quality,
      notes: form.notes || null,
    };
    try {
      await api.createProductionLog(payload);
      window.dispatchEvent(new CustomEvent("farmos:production-created"));
      onSaved && onSaved({ kind: "production", severity: "success", message: lang === "fr" ? `Production ${productKind === "milk" ? "lait" : productKind === "eggs" ? "œufs" : "poids"} enregistrée — ${form.value} ${unit}` : `Production saved — ${form.value} ${unit}` });
      onClose();
    } catch (err) {
      onSaved && onSaved({ kind: "production", severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormSection label={lang === "fr" ? "Espèce" : "Species"}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {availableSpecies.map((s) => (
            <button key={s.id} type="button" onClick={() => setSpecies(s.id)}
              className={`species-pill ${species === s.id ? "active" : ""}`}
              style={{ height: 32, fontSize: 12 }}>
              <AnimalGlyph kind={s.glyph} size={14} color={species === s.id ? "var(--bone-50)" : "var(--forest-700)"}/>
              {lang === "fr" ? s.fr : s.en}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection label={lang === "fr" ? `Production ${productKind === "milk" ? "laitière" : productKind === "eggs" ? "d'œufs" : productKind === "wool" ? "laine" : "et croissance"}` : `Production`}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Date" : "Date"} required>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
          </FormField>
          <FormField label={lang === "fr" ? "Période" : "Period"}>
            <Autocomplete
              value={form.period || "AM"}
              onChange={(v) => set("period", v || "AM")}
              allowClear={false}
              options={[
                { value: "AM", label: lang === "fr" ? "Traite matin" : "Morning" },
                { value: "PM", label: lang === "fr" ? "Traite après-midi" : "Afternoon" },
                { value: "day", label: lang === "fr" ? "Total jour" : "Daily total" },
              ]}
            />
          </FormField>
        </FormGrid>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Animal / Lot" : "Animal / Batch"}>
            <Autocomplete
              value={form.animal || ""}
              onChange={(v) => set("animal", v)}
              placeholder={lang === "fr" ? "Rechercher un animal…" : "Search an animal…"}
              options={animalsForSpecies.map((a) => ({ value: a.id, label: animalLabel(a) }))}
            />
          </FormField>
          {productKind === "milk" && (
            <FormField label={lang === "fr" ? "Volume (L)" : "Volume (L)"} required>
              <input className="input mono" type="number" step="0.1" placeholder="22.4" value={form.value || ""} onChange={(e) => set("value", e.target.value)}/>
            </FormField>
          )}
          {productKind === "eggs" && (
            <FormField label={lang === "fr" ? "Œufs collectés" : "Eggs collected"} required>
              <input className="input mono" type="number" placeholder="4200" value={form.value || ""} onChange={(e) => set("value", e.target.value)}/>
            </FormField>
          )}
          {productKind === "growth" && (
            <FormField label={lang === "fr" ? "Poids moyen (kg)" : "Avg weight (kg)"} required>
              <input className="input mono" type="number" step="0.1" placeholder="68" value={form.value || ""} onChange={(e) => set("value", e.target.value)}/>
            </FormField>
          )}
          {productKind === "wool" && (
            <FormField label={lang === "fr" ? "Tonte (kg)" : "Shearing (kg)"} required>
              <input className="input mono" type="number" step="0.1" placeholder="4.8" value={form.value || ""} onChange={(e) => set("value", e.target.value)}/>
            </FormField>
          )}
        </FormGrid>

        {productKind === "milk" && (
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Matière grasse %" : "Fat %"}>
              <input className="input mono" type="number" step="0.01" placeholder="3.8" value={form.fat || ""} onChange={(e) => set("fat", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Protéines %" : "Protein %"}>
              <input className="input mono" type="number" step="0.01" placeholder="3.2" value={form.protein || ""} onChange={(e) => set("protein", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Conductivité (mS)" : "Conductivity (mS)"}>
              <input className="input mono" type="number" step="0.1" placeholder="4.2" value={form.conductivity || ""} onChange={(e) => set("conductivity", e.target.value)}/>
            </FormField>
          </FormGrid>
        )}
        {productKind === "eggs" && (
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Cassés" : "Broken"}>
              <input className="input mono" type="number" placeholder="14" value={form.broken || ""} onChange={(e) => set("broken", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Calibre moyen (g)" : "Avg size (g)"}>
              <input className="input mono" type="number" placeholder="62" value={form.size || ""} onChange={(e) => set("size", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Taux ponte % (auto)" : "Lay rate % (auto)"}>
              {(() => {
                const sel = animalsForSpecies.find((a) => String(a.id) === String(form.animal));
                const flockCount = sel?.count ?? sel?.animalCount ?? null;
                const eggs = Number(form.value) || 0;
                const broken = Number(form.broken) || 0;
                const usable = Math.max(0, eggs - broken);
                const rate = flockCount && flockCount > 0 ? Math.min(100, (usable / flockCount) * 100) : null;
                const display = rate != null ? rate.toFixed(1).replace(".", ",") : "";
                const placeholder = !flockCount
                  ? (lang === "fr" ? "Définir le nb d'animaux du lot" : "Set lot animal count first")
                  : !eggs
                  ? (lang === "fr" ? "Saisir les œufs collectés" : "Enter collected eggs")
                  : "—";
                return (
                  <input className="input mono" readOnly value={display} placeholder={placeholder}
                    style={{ background: "var(--bg-sunken)", color: "var(--ink-700)", cursor: "not-allowed" }}
                    title={lang === "fr"
                      ? `Calcul : (œufs ${eggs} − cassés ${broken}) ÷ ${flockCount || "?"} pondeuses × 100`
                      : `Formula: (eggs ${eggs} − broken ${broken}) ÷ ${flockCount || "?"} hens × 100`}/>
                );
              })()}
            </FormField>
          </FormGrid>
        )}
      </FormSection>

      <FormSection label={lang === "fr" ? "Notes" : "Notes"}>
        <textarea className="input" style={{ height: 64, padding: 10 }} placeholder={lang === "fr" ? "Observations…" : "Observations…"} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Health (treatment / vaccine) ────────────────────────────────────────
const HealthForm = ({ lang, defaultSpecies, enabledSpecies, context, onSaved, onClose }) => {
  const availableSpecies = activeSpeciesList(enabledSpecies);
  const [kind, setKind] = React.useState("treatment");
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    species: normalizeDefaultSpecies(context?.species || defaultSpecies, enabledSpecies),
    animal: context?.animalId != null ? String(context.animalId) : (context?.animalExternalId || ""),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [liveAnimals, setLiveAnimals] = React.useState(null);
  const [liveMeds, setLiveMeds] = React.useState(null);
  const [liveDiseases, setLiveDiseases] = React.useState(null);
  const loadAll = React.useCallback(() => {
    Promise.all([api.listAnimals(), api.listMedicines(), api.listDiseases()])
      .then(([a, m, d]) => {
        if (Array.isArray(a)) setLiveAnimals(a);
        if (Array.isArray(m)) setLiveMeds(m);
        if (Array.isArray(d)) setLiveDiseases(d);
      })
      .catch(() => {});
  }, []);
  React.useEffect(() => {
    loadAll();
    const refetch = (e) => { if (e.detail?.category?.startsWith("disease")) loadAll(); };
    window.addEventListener("farmos:lookup-created", refetch);
    return () => window.removeEventListener("farmos:lookup-created", refetch);
  }, [loadAll]);
  const animalsForSpecies = (liveAnimals || []).filter((a) => a.species === form.species);
  const medsForSpecies = (liveMeds || []).filter((s) => s.kind === "med" && s.species?.includes(form.species));
  const speciesDef = speciesById(form.species) || availableSpecies[0] || SPECIES[0];
  const diseasesForSpecies = liveDiseases ? liveDiseases.filter((d) => d.species === form.species) : [];
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (saving) return;
    if (kind === "vaccine") {
      if (!form.vaccine || !form.date) {
        onSaved && onSaved({ kind, severity: "error", message: lang === "fr" ? "Vaccin et date requis." : "Vaccine and date required." });
        return;
      }
      setSaving(true);
      try {
        await api.createVaccination({
          species: form.species,
          vaccine: form.vaccine,
          due_date: form.date,
          animal_count: form.n ? Number(form.n) : null,
          notes: form.booster ? `Prochain rappel: ${form.booster}` : null,
        });
        onSaved && onSaved({ kind, severity: "success", message: lang === "fr" ? `Vaccin ${form.vaccine} enregistré` : `Vaccine ${form.vaccine} saved` });
        onClose();
      } catch (err) {
        onSaved && onSaved({ kind, severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (kind === "exam") {
      if (!form.date) {
        onSaved && onSaved({ kind, severity: "error", message: lang === "fr" ? "Date requise." : "Date required." });
        return;
      }
      setSaving(true);
      try {
        await api.createVetExam({
          exam_date: form.date,
          species: form.species,
          vet: form.vet || null,
          diagnosis: form.diagnosis || null,
        });
        onSaved && onSaved({ kind, severity: "success", message: lang === "fr" ? "Examen vétérinaire enregistré" : "Vet exam saved" });
        onClose();
      } catch (err) {
        onSaved && onSaved({ kind, severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
      } finally {
        setSaving(false);
      }
      return;
    }
    const selectedAnimal = animalsForSpecies.find((a) => String(a.id) === String(form.animal) || String(a.external_id || a.externalId) === String(form.animal));
    const selectedDisease = diseasesForSpecies.find((d) => d.name_fr === form.reason || d.nameFr === form.reason || String(d.id) === String(form.reason));
    if (!liveAnimals) {
      onSaved && onSaved({ kind, severity: "error", message: lang === "fr" ? "Les animaux ne sont pas charges. Impossible d'enregistrer le traitement." : "Animals are not loaded. Treatment cannot be saved." });
      return;
    }
    if (!selectedAnimal || !toNumericId(selectedAnimal)) {
      onSaved && onSaved({ kind, severity: "error", message: lang === "fr" ? "Choisis un animal ou un lot existant en base avant d'enregistrer." : "Select an existing database animal or batch before saving." });
      return;
    }
    if (!selectedDisease || !selectedDisease.id) {
      onSaved && onSaved({ kind, severity: "error", message: lang === "fr" ? "Choisis ou ajoute une maladie liee a l'espece avant d'enregistrer." : "Select or add a disease linked to the species before saving." });
      return;
    }
    const selectedMed = (liveMeds || []).find((m) => String(m.id) === String(form.med));
    const startDate = form.date;
    const duration = Number(form.duration || 0);
    const endDate = duration > 0 && startDate ? new Date(new Date(startDate).getTime() + duration * 86400000).toISOString().slice(0, 10) : null;
    setSaving(true);
    const payload = {
      animal_id: toNumericId(selectedAnimal),
      disease_id: toNumericId(selectedDisease),
      medicine_id: toNumericId(selectedMed),
      medicine_name: selectedMed?.name || null,
      medicine_quantity: form.medQty ? Number(form.medQty) : null, // décrémente le stock
      dosage: form.dosage || null,
      route: form.route || null,
      start_date: startDate,
      end_date: endDate,
      status: "running",
    };
    try {
      await api.createTreatment(payload);
      window.dispatchEvent(new CustomEvent("farmos:treatment-created"));
      onSaved && onSaved({ kind, severity: "success", message: lang === "fr" ? "Traitement enregistré" : "Treatment saved" });
      onClose();
    } catch (err) {
      onSaved && onSaved({ kind, severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-sunken)", borderRadius: 8, width: "fit-content" }}>
        {[
          { id: "treatment", fr: "Traitement", en: "Treatment", icon: "pill" },
          { id: "vaccine",   fr: "Vaccin",     en: "Vaccine",   icon: "syringe" },
          { id: "exam",      fr: "Examen",     en: "Exam",      icon: "pulse" },
        ].map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className="btn btn-sm"
            style={kind === k.id ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" } : { background: "transparent", border: 0 }}>
            <Icon name={k.icon} size={12} color="currentColor"/>
            {lang === "fr" ? k.fr : k.en}
          </button>
        ))}
      </div>

      <FormSection label={lang === "fr" ? "Cible" : "Target"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Type d'application" : "Application type"}>
            <Autocomplete
              value={form.scope || "individual"}
              onChange={(v) => set("scope", v || "individual")}
              allowClear={false}
              options={[
                { value: "individual", label: lang === "fr" ? "Individuel" : "Individual" },
                { value: "lot", label: lang === "fr" ? "Par lot" : "By batch" },
                { value: "collective", label: lang === "fr" ? "Collectif" : "Collective" },
              ]}
            />
          </FormField>
          <FormField label={lang === "fr" ? "Espèce" : "Species"}>
            <Autocomplete
              value={form.species}
              onChange={(v) => set("species", v || availableSpecies[0]?.id || "cow")}
              allowClear={false}
              options={availableSpecies.map((s) => ({ value: s.id, label: lang === "fr" ? s.fr : s.en }))}
            />
          </FormField>
        </FormGrid>
        <FormField label={lang === "fr" ? "Animal / Lot concerné" : "Animal / Batch concerned"}>
          <Autocomplete
            value={form.animal || ""}
            onChange={(v) => set("animal", v)}
            placeholder={lang === "fr" ? "Rechercher un animal…" : "Search an animal…"}
            options={animalsForSpecies.map((a) => ({ value: a.id, label: animalLabel(a) }))}
          />
        </FormField>
      </FormSection>

      {kind === "treatment" && (
        <FormSection label={lang === "fr" ? "Traitement" : "Treatment"}>
          <FormField label={lang === "fr" ? "Motif / Maladie" : "Reason / Disease"} required>
            <AutocompleteDB
              value={form.reason || ""}
              onChange={(v) => set("reason", v)}
              useLabel
              lang={lang}
              category={`disease:${form.species}`}
              placeholder={lang === "fr" ? "Rechercher ou ajouter une maladie…" : "Search or add a disease…"}
              customFetch={() => api.listDiseases(form.species).then((rows) => rows || [])}
              customCreate={(v) => ({ species: form.species, name_fr: v, name_en: v })}
            />
          </FormField>
          <FormGrid cols={2}>
            <FormField label={lang === "fr" ? "Médicament" : "Medicine"} required>
              <Autocomplete
                value={form.med || ""}
                onChange={(v) => set("med", v)}
                placeholder={lang === "fr" ? "Rechercher un médicament…" : "Search a medicine…"}
                options={medsForSpecies.map((m) => ({ value: m.id, label: m.name }))}
              />
            </FormField>
            <FormField label={lang === "fr" ? "Voie d'administration" : "Route"}>
              <AutocompleteDB
                value={form.route || ""}
                onChange={(v) => set("route", v)}
                useLabel
                lang={lang}
                category="route"
                placeholder={lang === "fr" ? "Rechercher ou ajouter une voie…" : "Search or add a route…"}
              />
            </FormField>
            <FormField label={lang === "fr" ? "Qté prélevée du stock" : "Qty taken from stock"}>
              <input className="input mono" type="number" min="0" step="any" placeholder="0"
                value={form.medQty || ""} onChange={(e) => set("medQty", e.target.value)}/>
            </FormField>
          </FormGrid>
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Dosage" : "Dosage"}>
              <input className="input mono" placeholder="10 mg/kg" value={form.dosage || ""} onChange={(e) => set("dosage", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Date début" : "Start date"}>
              <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Durée (j)" : "Duration (d)"}>
              <input className="input mono" type="number" placeholder="5" value={form.duration || ""} onChange={(e) => set("duration", e.target.value)}/>
            </FormField>
          </FormGrid>

          {/* Withdrawal calculator preview */}
          <div className="withdrawal-banner" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="shield" size={16} color="#ECF1EC"/>
            <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#ECF1EC", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {lang === "fr" ? "Délai de retrait calculé automatiquement" : "Withdrawal period auto-calculated"}
              </div>
              <div style={{ fontSize: 12.5, color: "#F0D6CB", marginTop: 4 }} className="mono">
                {lang === "fr" ? "Lait : 96 h · Viande : 28 j · Œufs : 7 j" : "Milk: 96 h · Meat: 28 d · Eggs: 7 d"}
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {kind === "vaccine" && (
        <FormSection label={lang === "fr" ? "Vaccination" : "Vaccination"}>
          <FormGrid cols={2}>
            <FormField label={lang === "fr" ? "Vaccin" : "Vaccine"} required>
              <input className="input" placeholder={lang === "fr" ? "Mycoplasme, Newcastle, IBR…" : "Mycoplasma, Newcastle, IBR…"} value={form.vaccine || ""} onChange={(e) => set("vaccine", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Date" : "Date"}>
              <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Nombre d'animaux" : "Animal count"}>
              <input className="input mono" type="number" placeholder="124" value={form.n || ""} onChange={(e) => set("n", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Prochain rappel" : "Next booster"}>
              <input className="input" type="date" value={form.booster || ""} onChange={(e) => set("booster", e.target.value)}/>
            </FormField>
          </FormGrid>
        </FormSection>
      )}

      {kind === "exam" && (
        <FormSection label={lang === "fr" ? "Examen vétérinaire" : "Veterinary exam"}>
          <FormGrid cols={2}>
            <FormField label={lang === "fr" ? "Vétérinaire" : "Veterinarian"}>
              <AutocompleteDB
                value={form.vet || ""}
                onChange={(v) => set("vet", v)}
                useLabel
                noAdd
                lang={lang}
                category="staff:vet"
                placeholder={lang === "fr" ? "Rechercher un vétérinaire (RH)…" : "Search a vet (HR)…"}
                customFetch={() => api.listFarmosStaff("vétérinaire").then((rows) =>
                  (rows || []).map((u) => ({
                    id: u.id,
                    valueFr: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`,
                    valueEn: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`,
                  }))
                )}
              />
            </FormField>
            <FormField label={lang === "fr" ? "Date" : "Date"}>
              <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
            </FormField>
          </FormGrid>
          <FormField label={lang === "fr" ? "Diagnostic / Observations" : "Diagnosis / Observations"}>
            <textarea className="input" style={{ height: 80, padding: 10 }} value={form.diagnosis || ""} onChange={(e) => set("diagnosis", e.target.value)}/>
          </FormField>
        </FormSection>
      )}

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Stock entry/exit ────────────────────────────────────────────────────
const StockForm = ({ lang, onSaved, onClose }) => {
  const [mode, setMode] = React.useState("in");
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [liveMeds, setLiveMeds] = React.useState(null);
  const [lots, setLots] = React.useState([]);
  const [invoiceDirty, setInvoiceDirty] = React.useState(false);
  React.useEffect(() => {
    api.listExpenses().then((rows) => {
      if (invoiceDirty) return;
      setForm((f) => f.invoice ? f : { ...f, invoice: nextInvoiceNumber(rows) });
    }).catch(() => {});
  }, [invoiceDirty]);
  React.useEffect(() => {
    api.listMedicines().then((rows) => { if (Array.isArray(rows)) setLiveMeds(rows); }).catch(() => {});
    // Lots disponibles = valeurs distinctes de `lot` parmi les animaux,
    // avec compteur d'animaux et espèce dominante pour le label.
    api.listAnimals().then((rows) => {
      if (!Array.isArray(rows)) return;
      const byLot = new Map();
      rows.forEach((a) => {
        const lot = (a.lot || "").trim();
        if (!lot) return;
        const entry = byLot.get(lot) || { lot, count: 0, species: {} };
        const head = Number(a.count) > 0 ? Number(a.count) : 1;
        entry.count += head;
        if (a.species) entry.species[a.species] = (entry.species[a.species] || 0) + head;
        byLot.set(lot, entry);
      });
      const SPECIES_LBL_FR = { cow: "vaches", pig: "porcs", goat: "chèvres", sheep: "moutons", chicken: "poulets", duck: "canards", turkey: "dindes", rabbit: "lapins", fish: "poissons" };
      const SPECIES_LBL_EN = { cow: "cows", pig: "pigs", goat: "goats", sheep: "sheep", chicken: "chickens", duck: "ducks", turkey: "turkeys", rabbit: "rabbits", fish: "fish" };
      const opts = Array.from(byLot.values()).map((e) => {
        const dominant = Object.entries(e.species).sort((a, b) => b[1] - a[1])[0]?.[0];
        const sp = dominant ? (lang === "fr" ? SPECIES_LBL_FR[dominant] : SPECIES_LBL_EN[dominant]) || dominant : "";
        return { value: e.lot, label: `${e.lot} · ${e.count.toLocaleString("fr-CA")} ${sp}`.trim() };
      }).sort((a, b) => a.value.localeCompare(b.value));
      setLots(opts);
    }).catch(() => {});
  }, [lang]);
  const stockOptions = liveMeds || [];
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    if (saving) return;
    const selectedMed = (liveMeds || []).find((s) => String(s.id) === String(form.item));
    if (mode !== "in") {
      // Sortie / consommation : décrémente directement le stock du produit choisi.
      const medId = toNumericId(selectedMed);
      const qty = Number(form.qty);
      if (!medId || !(qty > 0)) {
        onSaved && onSaved({ kind: "stock", severity: "error", message: lang === "fr" ? "Produit et quantité requis." : "Product and quantity required." });
        return;
      }
      setSaving(true);
      try {
        await api.consumeMedicine(medId, qty);
        window.dispatchEvent(new CustomEvent("farmos:expense-created"));
        onSaved && onSaved({ kind: "stock", severity: "success", message: lang === "fr" ? `Sortie : −${qty} ${selectedMed?.unit || ""} de ${selectedMed?.name}` : `Out: −${qty} ${selectedMed?.unit || ""} of ${selectedMed?.name}` });
        onClose();
      } catch (err) {
        onSaved && onSaved({ kind: "stock", severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
      } finally {
        setSaving(false);
      }
      return;
    }
    const category = selectedMed?.kind === "feed" ? "feed" : "medicine";
    if (!form.cost || !form.date) {
      onSaved && onSaved({ kind: "stock", severity: "error", message: lang === "fr" ? "Coût et date requis." : "Cost and date are required." });
      return;
    }
    setSaving(true);
    const payload = {
      category,
      description: selectedMed ? `${selectedMed.name}${form.qty ? ` · ${form.qty} ${selectedMed.unit || ""}` : ""}${form.invoice ? ` · facture ${form.invoice}` : ""}` : (form.invoice ? `Achat · ${form.invoice}` : "Achat stock"),
      quantity: form.qty ? Number(form.qty) : null,
      unit: selectedMed?.unit || null,
      amount: Number(form.cost),
      supplier: form.supplier || null,
      expense_date: form.date,
      related_medicine_id: toNumericId(selectedMed),
    };
    try {
      await api.createExpense(payload);
      window.dispatchEvent(new CustomEvent("farmos:expense-created"));
      onSaved && onSaved({ kind: "stock", severity: "success", message: lang === "fr" ? "Entrée stock + dépense enregistrées" : "Stock in + expense saved" });
      onClose();
    } catch (err) {
      onSaved && onSaved({ kind: "stock", severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-sunken)", borderRadius: 8, width: "fit-content" }}>
        {[
          { id: "in", fr: "Entrée stock", en: "Stock in", icon: "arrowDown" },
          { id: "out", fr: "Sortie / consommation", en: "Stock out", icon: "arrowUp" },
        ].map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className="btn btn-sm"
            style={mode === m.id ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" } : { background: "transparent", border: 0 }}>
            <Icon name={m.icon} size={12} color="currentColor"/>
            {lang === "fr" ? m.fr : m.en}
          </button>
        ))}
      </div>

      <FormSection label={lang === "fr" ? "Détails" : "Details"}>
        <FormField label={lang === "fr" ? "Produit" : "Product"} required>
          <Autocomplete
            value={form.item || ""}
            onChange={(v) => set("item", v)}
            placeholder={lang === "fr" ? "Rechercher un produit…" : "Search a product…"}
            options={[
              ...stockOptions.filter((s) => s.kind === "feed").map((s) => ({ value: s.id, label: s.name, group: lang === "fr" ? "Aliment" : "Feed" })),
              ...stockOptions.filter((s) => s.kind === "med").map((s) => ({ value: s.id, label: s.name, group: lang === "fr" ? "Médicaments" : "Medicines" })),
            ]}
          />
        </FormField>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Quantité" : "Quantity"} required>
            <input className="input mono" type="number" placeholder="1200" value={form.qty || ""} onChange={(e) => set("qty", e.target.value)}/>
          </FormField>
          <FormField label={lang === "fr" ? "Date" : "Date"}>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
          </FormField>
        </FormGrid>
        {mode === "in" && (
          <FormGrid cols={2}>
            <FormField label={lang === "fr" ? "Fournisseur" : "Supplier"}>
              <input className="input" placeholder="Coop Agri-Pro" value={form.supplier || ""} onChange={(e) => set("supplier", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Coût total ($)" : "Total cost ($)"}>
              <input className="input mono" type="number" placeholder="4320" value={form.cost || ""} onChange={(e) => set("cost", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "N° facture" : "Invoice #"}>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input mono" style={{ flex: 1 }} placeholder={lang === "fr" ? "généré automatiquement…" : "auto-generated…"}
                  value={form.invoice || ""} onChange={(e) => { setInvoiceDirty(true); set("invoice", e.target.value); }}/>
                <button type="button" className="btn btn-sm" title={lang === "fr" ? "Régénérer" : "Regenerate"}
                  onClick={async () => { try { const rows = await api.listExpenses(); setInvoiceDirty(false); set("invoice", nextInvoiceNumber(rows)); } catch {} }}>
                  <Icon name="sparkle" size={12} color="var(--clay-700)"/>Auto
                </button>
              </div>
            </FormField>
            <FormField label={lang === "fr" ? "Date d'expiration" : "Expiry date"}>
              <input className="input" type="date" value={form.expiry || ""} onChange={(e) => set("expiry", e.target.value)}/>
            </FormField>
          </FormGrid>
        )}
        {mode === "out" && (
          <FormField label={lang === "fr" ? "Destination / lot" : "Destination / batch"}>
            <Autocomplete
              value={form.dest || ""}
              onChange={(v) => set("dest", v)}
              placeholder={lang === "fr" ? "Rechercher un lot…" : "Search a batch…"}
              options={lots}
            />
            {lots.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                {lang === "fr" ? "Aucun lot trouvé sur les animaux en base." : "No batch found on existing animals."}
              </div>
            )}
          </FormField>
        )}
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Repro form ──────────────────────────────────────────────────────────
const ReproForm = ({ lang, defaultSpecies, enabledSpecies, context, onSaved, onClose }) => {
  const availableSpecies = activeSpeciesList(enabledSpecies).filter((s) => s.repro.length > 0);
  const [kind, setKind] = React.useState("heat");
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    species: normalizeDefaultSpecies(context?.species || defaultSpecies, enabledSpecies, (s) => s.repro.length > 0),
    animal: context?.animalId != null ? String(context.animalId) : (context?.animalExternalId || ""),
    breeding_type: "ai", // ai | natural | unknown
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [liveAnimals, setLiveAnimals] = React.useState(null);
  const [straws, setStraws] = React.useState([]);
  const [males, setMales] = React.useState([]);
  const [suggesting, setSuggesting] = React.useState(false);
  React.useEffect(() => {
    api.listAnimals().then((rows) => { if (Array.isArray(rows)) setLiveAnimals(rows); }).catch(() => {});
  }, []);
  React.useEffect(() => {
    if (kind !== "ai" || !form.species) { setStraws([]); setMales([]); return; }
    api.listSemenStraws(form.species).then((rows) => setStraws(Array.isArray(rows) ? rows : [])).catch(() => setStraws([]));
    api.listBreedingMales(form.species).then((rows) => setMales(Array.isArray(rows) ? rows : [])).catch(() => setMales([]));
  }, [kind, form.species]);

  const doSuggest = async (mode) => {
    const selected = animalsForSpecies.find((a) => String(a.id) === String(form.animal) || String(a.external_id || a.externalId) === String(form.animal));
    if (!selected || !selected.id) {
      onSaved && onSaved({ kind: "repro", severity: "info", message: lang === "fr" ? "Sélectionne d'abord une femelle." : "Pick a female first." });
      return;
    }
    setSuggesting(true);
    try {
      const res = await api.suggestBreeding(selected.id, mode);
      if (res?.straw?.id) {
        set("sire_straw_id", res.straw.id);
        set("breeding_type", "ai");
        const reasonLabel = {
          last_success_on_female: lang === "fr" ? "dernière IA réussie sur cette femelle" : "last successful AI on this female",
          same_breed: lang === "fr" ? "même race" : "same breed",
          same_species: lang === "fr" ? "même espèce, premier disponible" : "same species, first available",
          genetic_ranked: lang === "fr" ? "meilleur score génétique" : "best genetic score",
        }[res.reason] || res.reason;
        onSaved && onSaved({ kind: "repro", severity: "success", message: (lang === "fr" ? "Suggestion : " : "Suggestion: ") + res.straw.sireName + " (" + reasonLabel + ")" });
      } else {
        onSaved && onSaved({ kind: "repro", severity: "info", message: lang === "fr" ? "Aucune paillette disponible pour cette femelle." : "No straw available for this female." });
      }
    } catch (err) {
      onSaved && onSaved({ kind: "repro", severity: "error", message: err.message });
    } finally {
      setSuggesting(false);
    }
  };
  const animalsForSpecies = (liveAnimals || []).filter((a) => {
    const sp = a.species;
    const sex = a.sex;
    return sp === form.species && (sex === "F" || sex === "Mixte" || !sex);
  });

  // Détection de consanguinité : compare la filiation (mother_id/father_id, qui
  // référencent un external_id ou un nom) de la femelle et du mâle choisi.
  // Retourne une raison FR/EN si apparentés, sinon null. Non bloquant.
  const inbreedingWarning = (female, maleExtId) => {
    if (!female || !maleExtId || !liveAnimals) return null;
    const idOf = (a) => String(a.external_id ?? a.externalId ?? a.id);
    const male = liveAnimals.find((a) => idOf(a) === String(maleExtId) || String(a.id) === String(maleExtId));
    const fMother = female.mother_id ?? female.motherId;
    const fFather = female.father_id ?? female.fatherId;
    const femaleKeys = [idOf(female), female.name].filter(Boolean).map(String);
    // 1) le mâle est le père de la femelle
    if (fFather && male && (idOf(male) === String(fFather) || male.name === fFather)) return lang === "fr" ? "le mâle est le père de la femelle" : "the male is the female's father";
    if (fFather && String(maleExtId) === String(fFather)) return lang === "fr" ? "le mâle est le père de la femelle" : "the male is the female's father";
    // 2) la femelle est la mère du mâle
    if (male) {
      const mMother = male.mother_id ?? male.motherId;
      if (mMother && femaleKeys.includes(String(mMother))) return lang === "fr" ? "la femelle est la mère du mâle" : "the female is the male's mother";
      // 3) même mère ou même père (fratrie)
      const mFather = male.father_id ?? male.fatherId;
      if (fMother && mMother && String(fMother) === String(mMother)) return lang === "fr" ? "même mère (fratrie)" : "same mother (siblings)";
      if (fFather && mFather && String(fFather) === String(mFather)) return lang === "fr" ? "même père (fratrie)" : "same father (siblings)";
    }
    return null;
  };
  const [saving, setSaving] = React.useState(false);
  const submit = async () => {
    if (saving) return;
    const selected = animalsForSpecies.find((a) => String(a.id) === String(form.animal) || String(a.external_id || a.externalId) === String(form.animal));
    if (!selected || !liveAnimals) {
      onSaved && onSaved({ kind: "repro", severity: "error", message: lang === "fr" ? "Selectionne un animal existant en BD." : "Select an animal that exists in the database." });
      return;
    }
    // Anti-consanguinité : pour une saillie/IA naturelle avec un mâle identifié,
    // avertir si la femelle et le mâle sont apparentés (non bloquant).
    if (kind === "ai") {
      const maleRef = form.sire_animal_id || form.male;
      const warn = inbreedingWarning(selected, maleRef);
      if (warn) {
        const msg = (lang === "fr"
          ? `⚠ Risque de consanguinité : ${warn}. Confirmer l'accouplement quand même ?`
          : `⚠ Inbreeding risk: ${warn}. Confirm mating anyway?`);
        if (!window.confirm(msg)) return;
      }
    }
    setSaving(true);
    const eventType = kind === "heat" ? "heat" : kind === "ai" ? "insemination" : "birthing";
    const payload = {
      animal_id: toNumericId(selected),
      event_type: eventType,
      event_date: form.date,
      offspring_count: kind === "birth" ? (form.live ? Number(form.live) : null) : null,
      outcome: kind === "birth" ? "success" : "pending",
      partner_external_id: form.male || null,
      notes: form.notes || null,
      breeding_type: kind === "ai" ? form.breeding_type : null,
      sire_straw_id: kind === "ai" && form.breeding_type === "ai" ? (form.sire_straw_id || null) : null,
      sire_animal_id: kind === "ai" && form.breeding_type === "natural" ? (form.sire_animal_id || null) : null,
    };
    try {
      await api.createReproductionEvent(payload);
      window.dispatchEvent(new CustomEvent("farmos:repro-created"));
      onSaved && onSaved({ kind: "repro", severity: "success", message: lang === "fr" ? (kind === "heat" ? "Chaleur enregistrée" : kind === "ai" ? "IA enregistrée" : "Mise bas enregistrée") : (kind === "heat" ? "Heat saved" : kind === "ai" ? "AI saved" : "Birth saved") });
      onClose();
    } catch (err) {
      onSaved && onSaved({ kind: "repro", severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-sunken)", borderRadius: 8, width: "fit-content", flexWrap: "wrap" }}>
        {[
          { id: "heat",    fr: "Chaleur",    en: "Heat",    icon: "pulse" },
          { id: "ai",      fr: "IA / saillie", en: "AI / mating", icon: "fingerprint" },
          { id: "birth",   fr: "Mise bas",   en: "Birth",   icon: "sparkle" },
        ].map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className="btn btn-sm"
            style={kind === k.id ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" } : { background: "transparent", border: 0 }}>
            <Icon name={k.icon} size={12} color="currentColor"/>
            {lang === "fr" ? k.fr : k.en}
          </button>
        ))}
      </div>

      <FormSection label={lang === "fr" ? "Animal" : "Animal"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Espèce" : "Species"}>
            <Autocomplete
              value={form.species}
              onChange={(v) => set("species", v || availableSpecies[0]?.id || "cow")}
              allowClear={false}
              options={availableSpecies.map((s) => ({ value: s.id, label: lang === "fr" ? s.fr : s.en }))}
            />
          </FormField>
          <FormField label={lang === "fr" ? "Femelle" : "Female"} required>
            <Autocomplete
              value={form.animal || ""}
              onChange={(v) => set("animal", v)}
              placeholder={lang === "fr" ? "Rechercher une femelle…" : "Search a female…"}
              options={animalsForSpecies.map((a) => ({ value: a.id, label: animalLabel(a) }))}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label={lang === "fr" ? "Événement" : "Event"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Date" : "Date"} required>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
          </FormField>
          {kind === "ai" && (
            <FormField label={lang === "fr" ? "Type de saillie" : "Breeding type"}>
              <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg-sunken)", borderRadius: 6, width: "fit-content" }}>
                {[
                  { id: "ai", fr: "IA (paillette)", en: "AI (straw)" },
                  { id: "natural", fr: "Saillie naturelle", en: "Natural" },
                  { id: "unknown", fr: "Inconnu", en: "Unknown" },
                ].map((opt) => (
                  <button key={opt.id} type="button"
                    onClick={() => { set("breeding_type", opt.id); set("sire_straw_id", null); set("sire_animal_id", null); }}
                    className="btn btn-sm"
                    style={form.breeding_type === opt.id
                      ? { background: "var(--clay-700)", color: "var(--bone-50)", borderColor: "var(--clay-700)" }
                      : { background: "transparent", border: 0 }}>
                    {lang === "fr" ? opt.fr : opt.en}
                  </button>
                ))}
              </div>
            </FormField>
          )}
        </FormGrid>
        {kind === "ai" && form.breeding_type === "ai" && (
          <FormGrid cols={1}>
            <FormField label={lang === "fr" ? "Paillette (banque de semence)" : "Straw (semen bank)"}>
              <Autocomplete
                value={form.sire_straw_id || ""}
                onChange={(v) => set("sire_straw_id", v ? Number(v) : null)}
                placeholder={lang === "fr" ? "Rechercher par code, taureau, race…" : "Search by code, sire, breed…"}
                options={straws.map((s) => ({
                  value: s.id,
                  label: `${s.code} — ${s.sireName}${s.breed ? ` · ${s.breed}` : ""} (${s.strawsRemaining}/${s.strawsTotal} paillettes)`,
                }))}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-sm" disabled={suggesting} onClick={() => doSuggest("history")}>
                  <Icon name="sparkle" size={11} color="var(--ink-700)"/>
                  {lang === "fr" ? "Reprendre la dernière" : "Reuse last"}
                </button>
                <button type="button" className="btn btn-sm" disabled={suggesting} onClick={() => doSuggest("genetic")}>
                  <Icon name="sparkle" size={11} color="var(--clay-700)"/>
                  {lang === "fr" ? "Recommandation génétique" : "Genetic recommendation"}
                </button>
                {straws.length === 0 && (
                  <span style={{ fontSize: 11, color: "var(--fg-3)", alignSelf: "center" }}>
                    {lang === "fr" ? "Banque vide — ajoute des paillettes dans Banque de semence." : "Bank empty — add straws in Semen bank."}
                  </span>
                )}
              </div>
            </FormField>
          </FormGrid>
        )}
        {kind === "ai" && form.breeding_type === "natural" && (
          <FormGrid cols={1}>
            <FormField label={lang === "fr" ? "Mâle du troupeau" : "Sire (herd male)"}>
              <Autocomplete
                value={form.sire_animal_id || ""}
                onChange={(v) => set("sire_animal_id", v ? Number(v) : null)}
                placeholder={lang === "fr" ? "Rechercher un mâle…" : "Search a male…"}
                options={males.map((m) => ({
                  value: m.id,
                  label: `${m.externalId || `#${m.id}`}${m.name ? ` — ${m.name}` : ""}${m.race ? ` · ${m.race}` : ""}`,
                }))}
              />
              {males.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                  {lang === "fr" ? "Aucun mâle enregistré pour cette espèce." : "No male recorded for this species."}
                </div>
              )}
            </FormField>
          </FormGrid>
        )}
        {kind === "ai" && form.breeding_type === "unknown" && (
          <FormGrid cols={1}>
            <FormField label={lang === "fr" ? "Réf. mâle / semence (libre)" : "Male / semen ref (free)"}>
              <input className="input mono" placeholder={form.species === "cow" ? "Holstein #2042" : "—"} value={form.male || ""} onChange={(e) => set("male", e.target.value)}/>
            </FormField>
          </FormGrid>
        )}
        <FormGrid cols={2}>
          {kind === "birth" && (
            <FormField label={lang === "fr" ? "Nb. nés vivants" : "Live births"}>
              <input className="input mono" type="number" placeholder={form.species === "pig" ? "11" : "1"} value={form.live || ""} onChange={(e) => set("live", e.target.value)}/>
            </FormField>
          )}
        </FormGrid>
        {kind === "birth" && (
          <FormGrid cols={3}>
            <FormField label={lang === "fr" ? "Mort-nés" : "Stillborn"}>
              <input className="input mono" type="number" placeholder="0" value={form.dead || ""} onChange={(e) => set("dead", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Poids moyen (kg)" : "Avg weight (kg)"}>
              <input className="input mono" type="number" step="0.01" placeholder={form.species === "pig" ? "1.4" : "40"} value={form.weight || ""} onChange={(e) => set("weight", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Difficulté" : "Difficulty"}>
              <Autocomplete
                value={form.difficulty || "easy"}
                onChange={(v) => set("difficulty", v || "easy")}
                allowClear={false}
                options={[
                  { value: "easy", label: lang === "fr" ? "Facile" : "Easy" },
                  { value: "assisted", label: lang === "fr" ? "Assistée" : "Assisted" },
                  { value: "hard", label: lang === "fr" ? "Difficile" : "Hard" },
                  { value: "cesarean", label: lang === "fr" ? "Césarienne" : "Cesarean" },
                ]}
              />
            </FormField>
          </FormGrid>
        )}
        <FormField label={lang === "fr" ? "Notes" : "Notes"}>
          <textarea className="input" style={{ height: 60, padding: 10 }} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
        </FormField>
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Death / mortality ───────────────────────────────────────────────────
const DeathForm = ({ lang, defaultSpecies, enabledSpecies, onSaved, onClose }) => {
  const availableSpecies = activeSpeciesList(enabledSpecies);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), species: normalizeDefaultSpecies(defaultSpecies, enabledSpecies) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [liveAnimals, setLiveAnimals] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    api.listAnimals().then((rows) => { if (Array.isArray(rows)) setLiveAnimals(rows); }).catch(() => {});
  }, []);
  const submit = async () => {
    if (saving) return;
    if (!form.date || !form.cause) {
      onSaved && onSaved({ kind: "death", severity: "error", message: lang === "fr" ? "Date et cause requises." : "Date and cause required." });
      return;
    }
    const selectedAnimal = (liveAnimals || []).find((a) => String(a.id) === String(form.animal) || String(a.externalId || a.external_id) === String(form.animal));
    setSaving(true);
    try {
      await api.createMortalityEvent({
        species: form.species,
        event_date: form.date,
        animal_id: toNumericId(selectedAnimal),
        count: form.count ? Number(form.count) : 1,
        cause: form.cause,
        necropsy_requested: !!form.necropsy,
        notes: form.notes || null,
      });
      onSaved && onSaved({ kind: "death", severity: "high", message: lang === "fr" ? `Mortalité enregistrée — ${form.count || 1} animal·aux` : `Mortality saved — ${form.count || 1} animal(s)` });
      onClose();
    } catch (err) {
      onSaved && onSaved({ kind: "death", severity: "error", message: (lang === "fr" ? "Échec : " : "Failed: ") + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="withdrawal-banner" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="alert" size={16} color="#ECF1EC"/>
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#ECF1EC", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {lang === "fr" ? "Déclaration de mortalité" : "Mortality declaration"}
          </div>
          <div style={{ fontSize: 12.5, color: "#F0D6CB", marginTop: 2 }}>
            {lang === "fr" ? "Une autopsie peut être recommandée pour maladie contagieuse." : "Necropsy may be required for contagious disease."}
          </div>
        </div>
      </div>

      <FormSection label={lang === "fr" ? "Animal" : "Animal"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Espèce" : "Species"}>
            <Autocomplete
              value={form.species}
              onChange={(v) => set("species", v || availableSpecies[0]?.id || "cow")}
              allowClear={false}
              options={availableSpecies.map((s) => ({ value: s.id, label: lang === "fr" ? s.fr : s.en }))}
            />
          </FormField>
          <FormField label={lang === "fr" ? "Animal / Lot" : "Animal / Batch"}>
            <Autocomplete
              value={form.animal || ""}
              onChange={(v) => set("animal", v)}
              placeholder={lang === "fr" ? "Rechercher un animal…" : "Search an animal…"}
              options={(liveAnimals || []).filter((a) => a.species === form.species).map((a) => ({ value: a.id, label: animalLabel(a) }))}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label={lang === "fr" ? "Cause" : "Cause"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Date" : "Date"} required>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
          </FormField>
          <FormField label={lang === "fr" ? "Nombre" : "Count"} required>
            <input className="input mono" type="number" placeholder="1" value={form.count || ""} onChange={(e) => set("count", e.target.value)}/>
          </FormField>
        </FormGrid>
        <FormField label={lang === "fr" ? "Cause présumée" : "Suspected cause"} required>
          <AutocompleteDB
            value={form.cause || ""}
            onChange={(v) => set("cause", v)}
            useLabel
            lang={lang}
            category="death_cause"
            placeholder={lang === "fr" ? "Rechercher ou ajouter une cause…" : "Search or add a cause…"}
          />
        </FormField>
        <FormField label={lang === "fr" ? "Détails" : "Details"}>
          <textarea className="input" style={{ height: 80, padding: 10 }} placeholder={lang === "fr" ? "Symptômes observés, durée…" : "Observed symptoms, duration…"} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
        </FormField>
        <FormField label="">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-800)" }}>
            <input type="checkbox" checked={form.necropsy || false} onChange={(e) => set("necropsy", e.target.checked)}/>
            {lang === "fr" ? "Autopsie / nécropsie demandée" : "Necropsy requested"}
          </label>
        </FormField>
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={submit}/>
    </div>
  );
};

// ─── Form helpers ────────────────────────────────────────────────────────
const FormSection = ({ label, children }) => (
  <div>
    <div className="overline" style={{ marginBottom: 10 }}>{label}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
  </div>
);

const FormGrid = ({ cols = 2, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>{children}</div>
);

const FormField = ({ label, required, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && (
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-2)", letterSpacing: "-0.005em" }}>
        {label}{required && <span style={{ color: "var(--rust-700)", marginLeft: 2 }}>*</span>}
      </span>
    )}
    {children}
  </label>
);

const FormActions = ({ lang, onCancel, onSubmit, submitLabel }) => (
  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 12, marginTop: 4, borderTop: "1px solid var(--border-1)" }}>
    <button className="btn" onClick={onCancel}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
    <button className="btn btn-primary" onClick={onSubmit}>
      <Icon name="check" size={13} color="#FBF8F2"/>
      {submitLabel || (lang === "fr" ? "Enregistrer" : "Save")}
    </button>
  </div>
);

// ─── Toast (success feedback) ────────────────────────────────────────────
const Toast = ({ message, severity, onClose }) => {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = severity === "high" ? "var(--rust-700)" : "var(--forest-900)";
  return (
    <div style={{
      position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "var(--bone-50)",
      padding: "12px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
      boxShadow: "0 12px 32px -8px rgba(14,36,24,0.32)",
      display: "flex", alignItems: "center", gap: 10, zIndex: 200,
      animation: "slide-up 280ms var(--ease-out)",
      letterSpacing: "-0.005em",
    }}>
      <Icon name={severity === "high" ? "alert" : "check"} size={15} color="currentColor"/>
      {message}
    </div>
  );
};

export { QuickEntryDrawer, Toast };
