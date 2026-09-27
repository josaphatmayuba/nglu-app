/* eslint-disable */
import React from "react";
import { Icon } from "./icons";
import { api } from "./api";
import { AutocompleteDB, Autocomplete } from "./quickentry";
import { SectionLoader } from "./loading.jsx";

// ─── Dossier vétérinaire complet (#2) ────────────────────────────────────────
// Examen clinique enrichi + ordonnance (lignes médicament/dose/durée) + signature
// vétérinaire qui verrouille le dossier. Branché depuis l'écran Santé.

const EXAM_TYPES = [
  { id: "routine",    fr: "Visite de routine",  en: "Routine visit" },
  { id: "clinical",   fr: "Examen clinique",    en: "Clinical exam" },
  { id: "emergency",  fr: "Urgence",            en: "Emergency" },
  { id: "followup",   fr: "Suivi",              en: "Follow-up" },
];

const emptyLine = () => ({
  medicine_name: "", dosage: "", frequency: "", duration: "", route: "",
  withdrawal_meat_days: "", withdrawal_milk_hours: "", withdrawal_eggs_days: "",
  dose_per_kg: "",
});

// Pad de signature sur canvas (souris + tactile). Retourne un data-url PNG.
const SignaturePad = ({ lang, onChange }) => {
  const ref = React.useRef(null);
  const drawing = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });

  const pos = (e) => {
    const c = ref.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const c = ref.current; const ctx = c.getContext("2d");
    const p = pos(e);
    ctx.strokeStyle = "#0E2418"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div className="overline">{lang === "fr" ? "Signature vétérinaire" : "Veterinarian signature"}</div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={clear}>
          {lang === "fr" ? "Effacer" : "Clear"}
        </button>
      </div>
      <canvas
        ref={ref} width={520} height={140}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width: "100%", height: 140, background: "var(--bg-sunken)", border: "1px dashed var(--border-1)", borderRadius: 8, touchAction: "none", cursor: "crosshair" }}
      />
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
    <span className="overline" style={{ fontSize: 10 }}>{label}</span>
    {children}
  </label>
);

const VetExamEditor = ({ lang, exam, animals, onClose, onSaved }) => {
  const signed = !!(exam && exam.signedAt);
  const [form, setForm] = React.useState(() => ({
    exam_date: exam?.examDate || new Date().toISOString().slice(0, 10),
    exam_type: exam?.examType || "clinical",
    animal_id: exam?.animalId || "",
    species: exam?.species || "",
    vet: exam?.vet || "",
    temperature: exam?.temperature || "",
    weight: exam?.weight || "",
    reason: exam?.reason || "",
    anamnesis: exam?.anamnesis || "",
    clinical_exam: exam?.clinicalExam || "",
    differential_diagnosis: exam?.differentialDiagnosis || "",
    diagnosis: exam?.diagnosis || "",
    lab_tests: exam?.labTests || "",
    lab_results: exam?.labResults || "",
    protocol: exam?.protocol || "",
    recommendation: exam?.recommendation || "",
    followup: exam?.followup || "",
    notes: exam?.notes || "",
  }));
  const [lines, setLines] = React.useState(() =>
    (exam?.prescriptions && exam.prescriptions.length
      ? exam.prescriptions.map((p) => ({
          medicine_name: p.medicineName || "", dosage: p.dosage || "", frequency: p.frequency || "",
          duration: p.duration || "", route: p.route || "",
          withdrawal_meat_days: p.withdrawalMeatDays ?? "", withdrawal_milk_hours: p.withdrawalMilkHours ?? "",
          withdrawal_eggs_days: p.withdrawalEggsDays ?? "",
        }))
      : [emptyLine()]));
  const [signature, setSignature] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, [k]: e.target.value } : l));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, j) => j !== i));

  const toNum = (v) => (v === "" || v == null ? null : Number(v));

  const buildPayload = () => ({
    ...form,
    animal_id: form.animal_id ? Number(form.animal_id) : null,
    temperature: toNum(form.temperature),
    weight: toNum(form.weight),
    prescriptions: lines
      .filter((l) => l.medicine_name.trim())
      .map((l) => ({
        medicine_name: l.medicine_name.trim(),
        dosage: l.dosage || null, frequency: l.frequency || null, duration: l.duration || null, route: l.route || null,
        withdrawal_meat_days: toNum(l.withdrawal_meat_days),
        withdrawal_milk_hours: toNum(l.withdrawal_milk_hours),
        withdrawal_eggs_days: toNum(l.withdrawal_eggs_days),
      })),
  });

  const save = async (thenSign) => {
    if (!form.exam_date) { setErr(lang === "fr" ? "Date requise." : "Date required."); return; }
    setSaving(true); setErr(null);
    try {
      const payload = buildPayload();
      const saved = exam?._pk || exam?.id
        ? await api.updateVetExam(exam._pk || exam.id, payload)
        : await api.createVetExam(payload);
      if (thenSign) {
        if (!signature) { setErr(lang === "fr" ? "Dessine la signature d'abord." : "Draw the signature first."); setSaving(false); return; }
        await api.signVetExam(saved.id, { signature, signed_by: form.vet || null });
      }
      onSaved && onSaved({ severity: "success", message: lang === "fr" ? "Dossier vétérinaire enregistré" : "Vet dossier saved" });
      onClose();
    } catch (e) {
      setErr((lang === "fr" ? "Échec : " : "Failed: ") + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { padding: "7px 9px", borderRadius: 6, border: "1px solid var(--border-1)", background: signed ? "var(--bg-sunken)" : "var(--paper)", fontSize: 13, width: "100%" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(14,36,24,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 20, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 640, padding: 20, display: "flex", flexDirection: "column", gap: 14, margin: "20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="overline">{lang === "fr" ? "Dossier vétérinaire" : "Vet dossier"}{signed ? (lang === "fr" ? " · signé 🔒" : " · signed 🔒") : ""}</div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}><Icon name="x" size={13} color="var(--ink-700)"/></button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label={lang === "fr" ? "Date" : "Date"}>
            <input type="date" value={form.exam_date} onChange={set("exam_date")} disabled={signed} style={inputStyle}/>
          </Field>
          <Field label={lang === "fr" ? "Type" : "Type"}>
            <select value={form.exam_type} onChange={set("exam_type")} disabled={signed} style={inputStyle}>
              {EXAM_TYPES.map((x) => <option key={x.id} value={x.id}>{lang === "fr" ? x.fr : x.en}</option>)}
            </select>
          </Field>
          <Field label={lang === "fr" ? "Vétérinaire" : "Veterinarian"}>
            {signed
              ? <input value={form.vet || ""} disabled placeholder="Dr…" style={inputStyle}/>
              : <AutocompleteDB
                  value={form.vet || ""}
                  onChange={(v) => setForm((f) => ({ ...f, vet: v }))}
                  useLabel noAdd lang={lang}
                  category="staff:vet"
                  placeholder={lang === "fr" ? "Rechercher un vétérinaire (RH)…" : "Search a vet (HR)…"}
                  customFetch={() => api.listFarmosStaff("vétérinaire").then((rows) =>
                    (rows || []).map((u) => ({
                      id: u.id,
                      valueFr: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`,
                      valueEn: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `#${u.id}`,
                    }))
                  )}
                />}
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label={lang === "fr" ? "Animal / lot" : "Animal / lot"}>
            {signed
              ? <input value={(animals || []).find((a) => String(a._pk || a.id) === String(form.animal_id))?.name || (lang === "fr" ? "— (troupeau)" : "— (herd)")} disabled style={inputStyle}/>
              : <Autocomplete
                  value={form.animal_id || ""}
                  onChange={(v) => setForm((f) => ({ ...f, animal_id: v }))}
                  placeholder={lang === "fr" ? "— (troupeau)" : "— (herd)"}
                  options={(animals || []).map((a) => ({ value: a._pk || a.id, label: a.name || a.id }))}
                />}
          </Field>
          <Field label={lang === "fr" ? "Température °C" : "Temperature °C"}>
            <input type="number" step="0.1" value={form.temperature} onChange={set("temperature")} disabled={signed} style={inputStyle}/>
          </Field>
          <Field label={lang === "fr" ? "Poids kg" : "Weight kg"}>
            <input type="number" step="0.1" value={form.weight} onChange={set("weight")} disabled={signed} style={inputStyle}/>
          </Field>
        </div>

        <Field label={lang === "fr" ? "Motif de consultation" : "Reason for visit"}>
          <input value={form.reason} onChange={set("reason")} disabled={signed} style={inputStyle}/>
        </Field>
        <Field label={lang === "fr" ? "Anamnèse (historique)" : "Anamnesis (history)"}>
          <textarea value={form.anamnesis} onChange={set("anamnesis")} disabled={signed} rows={2} style={inputStyle}/>
        </Field>
        <Field label={lang === "fr" ? "Examen clinique" : "Clinical exam"}>
          <textarea value={form.clinical_exam} onChange={set("clinical_exam")} disabled={signed} rows={2} style={inputStyle}/>
        </Field>
        <Field label={lang === "fr" ? "Diagnostic différentiel" : "Differential diagnosis"}>
          <textarea value={form.differential_diagnosis} onChange={set("differential_diagnosis")} disabled={signed} rows={2} style={inputStyle}/>
        </Field>
        <Field label={lang === "fr" ? "Diagnostic" : "Diagnosis"}>
          <textarea value={form.diagnosis} onChange={set("diagnosis")} disabled={signed} rows={2} style={inputStyle}/>
        </Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label={lang === "fr" ? "Examens labo demandés" : "Lab tests requested"}>
            <textarea value={form.lab_tests} onChange={set("lab_tests")} disabled={signed} rows={2} style={inputStyle}/>
          </Field>
          <Field label={lang === "fr" ? "Résultats labo" : "Lab results"}>
            <textarea value={form.lab_results} onChange={set("lab_results")} disabled={signed} rows={2} style={inputStyle}/>
          </Field>
        </div>
        <Field label={lang === "fr" ? "Protocole / traitement" : "Protocol / treatment"}>
          <textarea value={form.protocol} onChange={set("protocol")} disabled={signed} rows={2} style={inputStyle}/>
        </Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label={lang === "fr" ? "Recommandation" : "Recommendation"}>
            <textarea value={form.recommendation} onChange={set("recommendation")} disabled={signed} rows={2} style={inputStyle}/>
          </Field>
          <Field label={lang === "fr" ? "Suivi" : "Follow-up"}>
            <textarea value={form.followup} onChange={set("followup")} disabled={signed} rows={2} style={inputStyle}/>
          </Field>
        </div>

        {/* Ordonnance */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="overline">{lang === "fr" ? "Ordonnance" : "Prescription"}</div>
            {!signed && <button type="button" className="btn btn-sm" onClick={addLine}><Icon name="plus" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Ligne" : "Line"}</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ border: "1px solid var(--border-1)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input value={l.medicine_name} onChange={setLine(i, "medicine_name")} disabled={signed} placeholder={lang === "fr" ? "Médicament" : "Medicine"} style={{ ...inputStyle, flex: 2 }}/>
                  <input value={l.dosage} onChange={setLine(i, "dosage")} disabled={signed} placeholder={lang === "fr" ? "Dose" : "Dose"} style={{ ...inputStyle, flex: 1 }}/>
                  <input value={l.frequency} onChange={setLine(i, "frequency")} disabled={signed} placeholder={lang === "fr" ? "Fréquence" : "Frequency"} style={{ ...inputStyle, flex: 1 }}/>
                  <input value={l.duration} onChange={setLine(i, "duration")} disabled={signed} placeholder={lang === "fr" ? "Durée" : "Duration"} style={{ ...inputStyle, flex: 1 }}/>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={l.route} onChange={setLine(i, "route")} disabled={signed} placeholder={lang === "fr" ? "Voie" : "Route"} style={{ ...inputStyle, flex: 1 }}/>
                  <input type="number" value={l.withdrawal_meat_days} onChange={setLine(i, "withdrawal_meat_days")} disabled={signed} placeholder={lang === "fr" ? "Retrait viande (j)" : "Meat WD (d)"} style={{ ...inputStyle, flex: 1 }}/>
                  <input type="number" value={l.withdrawal_milk_hours} onChange={setLine(i, "withdrawal_milk_hours")} disabled={signed} placeholder={lang === "fr" ? "Retrait lait (h)" : "Milk WD (h)"} style={{ ...inputStyle, flex: 1 }}/>
                  <input type="number" value={l.withdrawal_eggs_days} onChange={setLine(i, "withdrawal_eggs_days")} disabled={signed} placeholder={lang === "fr" ? "Retrait œufs (j)" : "Eggs WD (d)"} style={{ ...inputStyle, flex: 1 }}/>
                  {!signed && lines.length > 1 && <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeLine(i)}><Icon name="x" size={12} color="var(--ink-700)"/></button>}
                </div>
                {!signed && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--fg-2)" }}>
                    <span>{lang === "fr" ? "Calcul dose :" : "Dose calc:"}</span>
                    <input type="number" step="0.1" value={l.dose_per_kg} onChange={setLine(i, "dose_per_kg")} placeholder="mg/kg" style={{ ...inputStyle, width: 90, flex: "none" }}/>
                    {(() => {
                      const w = Number(form.weight); const perKg = Number(l.dose_per_kg);
                      if (!w || !perKg) return <span style={{ color: "var(--fg-3)" }}>{lang === "fr" ? "× poids animal" : "× animal weight"}</span>;
                      const total = Math.round(w * perKg * 100) / 100;
                      return (
                        <>
                          <span>= <strong>{total} mg</strong> ({w} kg)</span>
                          <button type="button" className="btn btn-sm" onClick={() => setLines((ls) => ls.map((x, j) => j === i ? { ...x, dosage: `${total} mg` } : x))}>
                            {lang === "fr" ? "Utiliser" : "Use"}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {signed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
            {exam.signature && <img src={exam.signature} alt="signature" style={{ height: 48, background: "var(--paper)", borderRadius: 4 }}/>}
            <div style={{ flex: 1, fontSize: 12, color: "var(--fg-2)" }}>
              {lang === "fr" ? "Signé par " : "Signed by "}<strong>{exam.signedBy || exam.vet || "—"}</strong>
              {exam.signedAt ? ` · ${String(exam.signedAt).slice(0, 10)}` : ""}
            </div>
            <button className="btn btn-sm" onClick={() => api.printVetExam(exam._pk || exam.id).catch((e) => setErr(e.message))}>
              <Icon name="download" size={12} color="var(--ink-700)"/>{lang === "fr" ? "Imprimer / PDF" : "Print / PDF"}
            </button>
          </div>
        ) : (
          <SignaturePad lang={lang} onChange={setSignature}/>
        )}

        {err && <div style={{ color: "var(--oxblood-700)", fontSize: 12 }}>{err}</div>}

        {!signed && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn"
              onClick={() => save(false)}
              disabled={saving}
              title={lang === "fr" ? "Enregistrer (brouillon)" : "Save (draft)"}
              aria-label={lang === "fr" ? "Enregistrer (brouillon)" : "Save (draft)"}
              style={{ flex: "0 0 auto", justifyContent: "center", padding: "10px 14px" }}
            >
              <Icon name="save" size={15} color="var(--ink-700)"/>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => save(true)}
              disabled={saving}
              title={lang === "fr" ? "Signer & verrouiller" : "Sign & lock"}
              aria-label={lang === "fr" ? "Signer & verrouiller" : "Sign & lock"}
              style={{ flex: 1, justifyContent: "center", padding: "10px 14px" }}
            >
              <Icon name="check" size={15} color="#FBF8F2"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Section à insérer dans l'écran Santé : liste des dossiers + bouton nouveau.
export const VetDossierSection = ({ lang, animals, exams, onChanged, loading: examsLoading = false }) => {
  const [editing, setEditing] = React.useState(null); // exam object | "new" | null
  const [loading, setLoading] = React.useState(false);

  const openExam = async (row) => {
    setLoading(true);
    try {
      const full = await api.getVetExam(row._pk || row.id);
      setEditing(full);
    } catch (e) {
      console.warn("getVetExam failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const list = Array.isArray(exams) ? exams : [];

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="overline">{lang === "fr" ? "Dossiers vétérinaires" : "Vet dossiers"}</div>
        <button className="btn btn-sm btn-primary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={12} color="#FBF8F2"/>{lang === "fr" ? "Nouveau dossier" : "New dossier"}
        </button>
      </div>

      {examsLoading ? (
        <SectionLoader lang={lang} compact/>
      ) : list.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "8px 0" }}>
          {lang === "fr" ? "Aucun dossier vétérinaire pour l'instant." : "No vet dossiers yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map((e) => (
            <button key={e._pk || e.id} className="row" onClick={() => openExam(e)} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8, textAlign: "left", cursor: "pointer" }}>
              <Icon name="shield" size={14} color="var(--solidite-500)"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.diagnosis || (lang === "fr" ? "Examen" : "Exam")}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{String(e.examDate || "").slice(0, 10)}{e.vet ? ` · ${e.vet}` : ""}</div>
              </div>
              {e.signedAt && <span className="tag" style={{ fontSize: 9.5 }}>🔒 {lang === "fr" ? "Signé" : "Signed"}</span>}
            </button>
          ))}
        </div>
      )}

      {editing && (
        <VetExamEditor
          lang={lang}
          exam={editing === "new" ? null : editing}
          animals={animals}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { onChanged && onChanged(msg); }}
        />
      )}
    </div>
  );
};

// ─── Documents FarmOS (#3) : upload + liste + téléchargement ──────────────────
const DOC_TYPES = [
  { id: "certificate", fr: "Certificat sanitaire", en: "Health certificate" },
  { id: "prescription", fr: "Ordonnance", en: "Prescription" },
  { id: "invoice", fr: "Facture", en: "Invoice" },
  { id: "lab", fr: "Analyse labo", en: "Lab analysis" },
  { id: "other", fr: "Autre", en: "Other" },
];
const docTypeLabel = (id, lang) => { const t = DOC_TYPES.find((d) => d.id === id); return t ? (lang === "fr" ? t.fr : t.en) : id; };

export const FarmosDocumentsSection = ({ lang, animals }) => {
  const [docs, setDocs] = React.useState([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [form, setForm] = React.useState({ title: "", doc_type: "certificate", animal_id: "", issued_date: "" });
  const fileRef = React.useRef(null);

  const load = React.useCallback(() => {
    api.listDocuments()
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch((e) => console.warn("listDocuments:", e.message))
      .finally(() => setDocsLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr(lang === "fr" ? "Choisis un fichier." : "Pick a file."); return; }
    if (!form.title.trim()) { setErr(lang === "fr" ? "Titre requis." : "Title required."); return; }
    if (file.size > 8 * 1024 * 1024) { setErr(lang === "fr" ? "Fichier > 8 Mo." : "File > 8 MB."); return; }
    setBusy(true); setErr(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
      });
      await api.createDocument({
        title: form.title.trim(), doc_type: form.doc_type,
        animal_id: form.animal_id ? Number(form.animal_id) : null,
        issued_date: form.issued_date || null,
        filename: file.name, content_type: file.type, size_bytes: file.size, data_url: dataUrl,
      });
      setForm({ title: "", doc_type: form.doc_type, animal_id: "", issued_date: "" });
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setErr((lang === "fr" ? "Échec : " : "Failed: ") + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try { await api.deleteDocument(id); load(); } catch (e) { setErr(e.message); }
  };

  const inputStyle = { padding: "7px 9px", borderRadius: 6, border: "1px solid var(--border-1)", background: "var(--paper)", fontSize: 13 };

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
      <div className="overline">{lang === "fr" ? "Documents & certificats" : "Documents & certificates"}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={lang === "fr" ? "Titre" : "Title"} style={{ ...inputStyle, flex: 2, minWidth: 140 }}/>
        <select value={form.doc_type} onChange={(e) => setForm((f) => ({ ...f, doc_type: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
          {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{lang === "fr" ? d.fr : d.en}</option>)}
        </select>
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={form.animal_id || ""}
            onChange={(v) => setForm((f) => ({ ...f, animal_id: v }))}
            placeholder={lang === "fr" ? "— animal" : "— animal"}
            options={(animals || []).map((a) => ({ value: a._pk || a.id, label: a.name || a.id }))}
          />
        </div>
        <input type="date" value={form.issued_date} onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))} style={inputStyle}/>
        <input ref={fileRef} type="file" style={{ fontSize: 12, flex: 1, minWidth: 140 }}/>
        <button className="btn btn-sm btn-primary" onClick={upload} disabled={busy}>
          <Icon name="upload" size={12} color="#FBF8F2"/>{lang === "fr" ? "Téléverser" : "Upload"}
        </button>
      </div>
      {err && <div style={{ color: "var(--oxblood-700)", fontSize: 12 }}>{err}</div>}

      {docsLoading ? (
        <SectionLoader lang={lang} compact/>
      ) : docs.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{lang === "fr" ? "Aucun document." : "No documents."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--paper)", border: "1px solid var(--border-1)", borderRadius: 8 }}>
              <Icon name="report" size={14} color="var(--ink-700)"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{docTypeLabel(d.docType, lang)}{d.issuedDate ? ` · ${String(d.issuedDate).slice(0, 10)}` : ""}{d.sizeBytes ? ` · ${Math.round(d.sizeBytes / 1024)} Ko` : ""}</div>
              </div>
              <button className="btn btn-sm" onClick={() => api.downloadDocument(d.id, d.filename)}><Icon name="download" size={12} color="var(--ink-700)"/></button>
              <button className="btn btn-sm btn-ghost" onClick={() => remove(d.id)}><Icon name="x" size={12} color="var(--ink-700)"/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
