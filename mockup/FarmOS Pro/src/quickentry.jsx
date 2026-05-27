/* eslint-disable */
// QuickEntryDrawer — slide-in panel from right with adaptive entry forms.
// Tabs: Animal · Production · Santé · Stock · Repro · Mortalité
// Species-aware forms (e.g., milk entry only for milk-producing species).

const QuickEntryDrawer = ({ open, onClose, defaultTab = "animal", lang, defaultSpecies, onSaved }) => {
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
          {tab === "animal"     && <AnimalForm     lang={lang} defaultSpecies={defaultSpecies} onSaved={onSaved} onClose={onClose}/>}
          {tab === "production" && <ProductionForm lang={lang} defaultSpecies={defaultSpecies} onSaved={onSaved} onClose={onClose}/>}
          {tab === "health"     && <HealthForm     lang={lang} defaultSpecies={defaultSpecies} onSaved={onSaved} onClose={onClose}/>}
          {tab === "stock"      && <StockForm      lang={lang} onSaved={onSaved} onClose={onClose}/>}
          {tab === "repro"      && <ReproForm      lang={lang} defaultSpecies={defaultSpecies} onSaved={onSaved} onClose={onClose}/>}
          {tab === "death"      && <DeathForm      lang={lang} defaultSpecies={defaultSpecies} onSaved={onSaved} onClose={onClose}/>}
        </div>
      </aside>
    </>
  );
};

// ─── Animal form (SPECIES-ADAPTIVE) ──────────────────────────────────────
const AnimalForm = ({ lang, defaultSpecies, onSaved, onClose }) => {
  const [species, setSpecies] = React.useState(defaultSpecies || "cow");
  const [form, setForm] = React.useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const sp = speciesById(species);

  const submit = () => {
    onSaved && onSaved({
      kind: "animal",
      message: lang === "fr"
        ? `${sp.frSing} ${form.name || form.tag || "nouveau"} enregistré`
        : `New ${sp.enSing.toLowerCase()} ${form.name || form.tag || ""} recorded`,
    });
    onClose();
  };

  return (
    <div className="entry-form" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormSection label={lang === "fr" ? "Espèce · les champs s'adaptent" : "Species · fields adapt"}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SPECIES.map((s) => (
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
            <input className="input mono" placeholder={`${sp.id.toUpperCase()}-2026-${Math.floor(Math.random() * 900 + 100)}`} value={form.tag || ""} onChange={(e) => set("tag", e.target.value)}/>
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
            <select className="input" value={form.race || ""} onChange={(e) => set("race", e.target.value)}>
              <option value="">—</option>
              {{
                cow: ["Holstein", "Jersey", "Ayrshire", "Brown Swiss"],
                pig: ["Large White", "Landrace", "Duroc", "Duroc × LW"],
                chicken: ["Lohmann Brown", "Ross 308", "Cobb 500"],
                fish: ["Truite arc-en-ciel", "Tilapia du Nil", "Saumon atlantique"],
                goat: ["Saanen", "Alpine", "Toggenburg"],
                sheep: ["Mérinos", "Suffolk", "Dorset"],
                rabbit: ["Néo-Zélandais", "Californien"],
                duck: ["Canard de Pékin", "Canard de Barbarie"],
                turkey: ["Bronze des Prés", "Blanc de Beltsville"],
              }[species]?.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
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
            <input className="input" placeholder={species === "fish" ? "Bassin 7 · Circuit B" : "Étable 1"} value={form.barn || ""} onChange={(e) => set("barn", e.target.value)}/>
          </FormField>
          <FormField label={lang === "fr" ? "Lot" : "Batch"}>
            <input className="input" placeholder={"Lot A"} value={form.lot || ""} onChange={(e) => set("lot", e.target.value)}/>
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
              <select className="input" value={form.type || ""} onChange={(e) => set("type", e.target.value)}>
                <option value="">—</option>
                <option>Verrat</option><option>Truie</option><option>Cochette</option>
                <option>Porcelet</option><option>Sevré</option><option>Engraissement</option>
              </select>
            </FormField>
            <FormField label={lang === "fr" ? "Salle" : "Room"}>
              <input className="input" placeholder="Salle 3" value={form.room || ""} onChange={(e) => set("room", e.target.value)}/>
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
const ProductionForm = ({ lang, defaultSpecies, onSaved, onClose }) => {
  const [species, setSpecies] = React.useState(defaultSpecies || "cow");
  const sp = speciesById(species);
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const productKind = sp.productPrimary; // milk | eggs | growth | wool

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FormSection label={lang === "fr" ? "Espèce" : "Species"}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SPECIES.map((s) => (
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
            <select className="input" value={form.period || "AM"} onChange={(e) => set("period", e.target.value)}>
              <option value="AM">{lang === "fr" ? "Traite matin" : "Morning"}</option>
              <option value="PM">{lang === "fr" ? "Traite après-midi" : "Afternoon"}</option>
              <option value="day">{lang === "fr" ? "Total jour" : "Daily total"}</option>
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Animal / Lot" : "Animal / Batch"}>
            <select className="input" value={form.animal || ""} onChange={(e) => set("animal", e.target.value)}>
              <option value="">{lang === "fr" ? "Sélectionner…" : "Select…"}</option>
              {ANIMALS.filter(a => a.species === species).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.id}</option>
              ))}
            </select>
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
            <FormField label={lang === "fr" ? "Taux ponte %" : "Lay rate %"}>
              <input className="input mono" type="number" placeholder="92" value={form.layRate || ""} onChange={(e) => set("layRate", e.target.value)}/>
            </FormField>
          </FormGrid>
        )}
      </FormSection>

      <FormSection label={lang === "fr" ? "Notes" : "Notes"}>
        <textarea className="input" style={{ height: 64, padding: 10 }} placeholder={lang === "fr" ? "Observations…" : "Observations…"} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={() => { onSaved && onSaved({ kind: "production", message: lang === "fr" ? `Production ${productKind === "milk" ? "lait" : productKind === "eggs" ? "œufs" : "poids"} enregistrée — ${form.value || "—"}` : `Production saved — ${form.value || "—"}` }); onClose(); }}/>
    </div>
  );
};

// ─── Health (treatment / vaccine) ────────────────────────────────────────
const HealthForm = ({ lang, defaultSpecies, onSaved, onClose }) => {
  const [kind, setKind] = React.useState("treatment");
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), species: defaultSpecies || "cow" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
            <select className="input" value={form.scope || "individual"} onChange={(e) => set("scope", e.target.value)}>
              <option value="individual">{lang === "fr" ? "Individuel" : "Individual"}</option>
              <option value="lot">{lang === "fr" ? "Par lot" : "By batch"}</option>
              <option value="collective">{lang === "fr" ? "Collectif" : "Collective"}</option>
            </select>
          </FormField>
          <FormField label={lang === "fr" ? "Espèce" : "Species"}>
            <select className="input" value={form.species} onChange={(e) => set("species", e.target.value)}>
              {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
        </FormGrid>
        <FormField label={lang === "fr" ? "Animal / Lot concerné" : "Animal / Batch concerned"}>
          <select className="input" value={form.animal || ""} onChange={(e) => set("animal", e.target.value)}>
            <option value="">{lang === "fr" ? "Sélectionner…" : "Select…"}</option>
            {ANIMALS.filter(a => a.species === form.species).map((a) => (
              <option key={a.id} value={a.id}>{a.name} · {a.id}</option>
            ))}
          </select>
        </FormField>
      </FormSection>

      {kind === "treatment" && (
        <FormSection label={lang === "fr" ? "Traitement" : "Treatment"}>
          <FormField label={lang === "fr" ? "Motif / Maladie" : "Reason / Disease"} required>
            <select className="input" value={form.reason || ""} onChange={(e) => set("reason", e.target.value)}>
              <option value="">—</option>
              {speciesById(form.species).diseases.map((d, i) => (
                <option key={i} value={d}>{lang === "fr" ? d : speciesById(form.species).diseasesEn[i]}</option>
              ))}
            </select>
          </FormField>
          <FormGrid cols={2}>
            <FormField label={lang === "fr" ? "Médicament" : "Medicine"} required>
              <select className="input" value={form.med || ""} onChange={(e) => set("med", e.target.value)}>
                <option value="">—</option>
                {STOCK.filter(s => s.kind === "med" && s.species.includes(form.species)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label={lang === "fr" ? "Voie d'administration" : "Route"}>
              <select className="input" value={form.route || ""} onChange={(e) => set("route", e.target.value)}>
                <option value="injection">{lang === "fr" ? "Injection" : "Injection"}</option>
                <option value="oral">{lang === "fr" ? "Voie orale" : "Oral"}</option>
                <option value="water">{lang === "fr" ? "Eau de boisson" : "Drinking water"}</option>
                <option value="feed">{lang === "fr" ? "Alimentation" : "Feed"}</option>
                <option value="pond">{lang === "fr" ? "Bassin" : "Pond"}</option>
                <option value="spray">{lang === "fr" ? "Aérosol" : "Spray"}</option>
              </select>
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
              <select className="input" value={form.vet || ""} onChange={(e) => set("vet", e.target.value)}>
                <option value="">—</option>
                <option>Dr. Émilie Boucher</option>
                <option>Dr. Marc Lavoie</option>
                <option>Dr. Anne Tremblay</option>
              </select>
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

      <FormActions lang={lang} onCancel={onClose} onSubmit={() => { onSaved && onSaved({ kind, message: lang === "fr" ? (kind === "treatment" ? "Traitement enregistré" : kind === "vaccine" ? "Vaccin enregistré" : "Examen enregistré") : (kind === "treatment" ? "Treatment saved" : kind === "vaccine" ? "Vaccine saved" : "Exam saved") }); onClose(); }}/>
    </div>
  );
};

// ─── Stock entry/exit ────────────────────────────────────────────────────
const StockForm = ({ lang, onSaved, onClose }) => {
  const [mode, setMode] = React.useState("in");
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
          <select className="input" value={form.item || ""} onChange={(e) => set("item", e.target.value)}>
            <option value="">{lang === "fr" ? "Sélectionner…" : "Select…"}</option>
            <optgroup label={lang === "fr" ? "Aliment" : "Feed"}>
              {STOCK.filter(s => s.kind === "feed").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
            <optgroup label={lang === "fr" ? "Médicaments" : "Medicines"}>
              {STOCK.filter(s => s.kind === "med").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          </select>
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
              <input className="input mono" placeholder="INV-2026-0824" value={form.invoice || ""} onChange={(e) => set("invoice", e.target.value)}/>
            </FormField>
            <FormField label={lang === "fr" ? "Date d'expiration" : "Expiry date"}>
              <input className="input" type="date" value={form.expiry || ""} onChange={(e) => set("expiry", e.target.value)}/>
            </FormField>
          </FormGrid>
        )}
        {mode === "out" && (
          <FormField label={lang === "fr" ? "Destination / lot" : "Destination / batch"}>
            <input className="input" placeholder={lang === "fr" ? "Lot Engr. 77 · 198 porcs" : "Finishing 77 · 198 pigs"} value={form.dest || ""} onChange={(e) => set("dest", e.target.value)}/>
          </FormField>
        )}
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={() => { onSaved && onSaved({ kind: "stock", message: lang === "fr" ? `${mode === "in" ? "Entrée" : "Sortie"} stock enregistrée` : `Stock ${mode === "in" ? "in" : "out"} saved` }); onClose(); }}/>
    </div>
  );
};

// ─── Repro form ──────────────────────────────────────────────────────────
const ReproForm = ({ lang, defaultSpecies, onSaved, onClose }) => {
  const [kind, setKind] = React.useState("heat");
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), species: defaultSpecies || "cow" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
            <select className="input" value={form.species} onChange={(e) => set("species", e.target.value)}>
              {SPECIES.filter(s => s.repro.length > 0).map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
          <FormField label={lang === "fr" ? "Femelle" : "Female"} required>
            <select className="input" value={form.animal || ""} onChange={(e) => set("animal", e.target.value)}>
              <option value="">—</option>
              {ANIMALS.filter(a => a.species === form.species && (a.sex === "F" || a.sex === "Mixte")).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.id}</option>
              ))}
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label={lang === "fr" ? "Événement" : "Event"}>
        <FormGrid cols={2}>
          <FormField label={lang === "fr" ? "Date" : "Date"} required>
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)}/>
          </FormField>
          {kind === "ai" && (
            <FormField label={lang === "fr" ? "Mâle / Semence" : "Male / Semen"}>
              <input className="input mono" placeholder={form.species === "cow" ? "Holstein #2042" : "—"} value={form.male || ""} onChange={(e) => set("male", e.target.value)}/>
            </FormField>
          )}
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
              <select className="input" value={form.difficulty || "easy"} onChange={(e) => set("difficulty", e.target.value)}>
                <option value="easy">{lang === "fr" ? "Facile" : "Easy"}</option>
                <option value="assisted">{lang === "fr" ? "Assistée" : "Assisted"}</option>
                <option value="hard">{lang === "fr" ? "Difficile" : "Hard"}</option>
                <option value="cesarean">{lang === "fr" ? "Césarienne" : "Cesarean"}</option>
              </select>
            </FormField>
          </FormGrid>
        )}
        <FormField label={lang === "fr" ? "Notes" : "Notes"}>
          <textarea className="input" style={{ height: 60, padding: 10 }} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}/>
        </FormField>
      </FormSection>

      <FormActions lang={lang} onCancel={onClose} onSubmit={() => { onSaved && onSaved({ kind: "repro", message: lang === "fr" ? (kind === "heat" ? "Chaleur enregistrée" : kind === "ai" ? "IA enregistrée" : "Mise bas enregistrée") : (kind === "heat" ? "Heat saved" : kind === "ai" ? "AI saved" : "Birth saved") }); onClose(); }}/>
    </div>
  );
};

// ─── Death / mortality ───────────────────────────────────────────────────
const DeathForm = ({ lang, defaultSpecies, onSaved, onClose }) => {
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0, 10), species: defaultSpecies || "cow" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
            <select className="input" value={form.species} onChange={(e) => set("species", e.target.value)}>
              {SPECIES.map((s) => <option key={s.id} value={s.id}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
          <FormField label={lang === "fr" ? "Animal / Lot" : "Animal / Batch"}>
            <select className="input" value={form.animal || ""} onChange={(e) => set("animal", e.target.value)}>
              <option value="">—</option>
              {ANIMALS.filter(a => a.species === form.species).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.id}</option>
              ))}
            </select>
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
          <select className="input" value={form.cause || ""} onChange={(e) => set("cause", e.target.value)}>
            <option value="">—</option>
            <option>{lang === "fr" ? "Maladie" : "Disease"}</option>
            <option>{lang === "fr" ? "Accident" : "Accident"}</option>
            <option>{lang === "fr" ? "Vêlage / mise bas" : "Birthing"}</option>
            <option>{lang === "fr" ? "Stress thermique" : "Heat stress"}</option>
            <option>{lang === "fr" ? "Prédation" : "Predation"}</option>
            <option>{lang === "fr" ? "Inconnu" : "Unknown"}</option>
            <option>{lang === "fr" ? "Abattage sanitaire" : "Sanitary cull"}</option>
          </select>
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

      <FormActions lang={lang} onCancel={onClose} onSubmit={() => { onSaved && onSaved({ kind: "death", severity: "high", message: lang === "fr" ? `Mortalité enregistrée — ${form.count || 1} animal·aux` : `Mortality saved — ${form.count || 1} animal(s)` }); onClose(); }}/>
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

Object.assign(window, { QuickEntryDrawer, Toast });
