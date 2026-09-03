// Page publique « Enquête de prélocation » (Québec) — propre à Domus, servie
// sous /domus/, URL propre /domus/prescreening/candidature?token=... Aucune
// authentification : le token opaque de l'URL fait autorisation (même pattern
// que TenantOnboardingPublic). Habillage identique (mêmes classes onb-*,
// domus-property-field) — voir onboarding-public.jsx comme référence (lecture
// seule, jamais modifié).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, CheckCircle2, Loader2, User, Briefcase, Users as UsersIcon,
  ShieldCheck, Plus, Trash2, ChevronLeft, ChevronRight, Lock, ScrollText,
} from "lucide-react";
import { publicApi } from "../api.js";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { t, tf } from "../i18n.js";

const EMPLOYMENT_OPTIONS = [
  ["", t("Sélectionnez…")],
  ["employed", t("Salarié(e)")],
  ["self_employed", t("Travailleur autonome")],
  ["student", t("Étudiant(e)")],
  ["retired", t("Retraité(e)")],
  ["other", t("Autre")],
];

const INCOME_PROOF_OPTIONS = [
  ["", t("Sélectionnez…")],
  ["pay_stub", t("Talon de paie")],
  ["employment_letter", t("Lettre d'emploi")],
  ["tax_notice", t("Avis de cotisation")],
  ["none", t("Aucune preuve disponible")],
];

const CONSENT_TEXT_VERSION = "1";
const CONSENT_LOCALE = "fr-CA";

function Field({ label, value, onChange, type = "text", required = false, placeholder = "", disabled = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <input type={type} value={value ?? ""} placeholder={placeholder} disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)} />
    </label>
  );
}
function SelectField({ label, value, options, onChange, required = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <select value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </label>
  );
}
function Card({ icon, tone = "iris", title, subtitle, children }) {
  return (
    <section className="onb-card">
      <div className="onb-card-head">
        <span className={`onb-card-icon tone-${tone}`}>{icon}</span>
        <div className="onb-card-heading">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="onb-card-body">{children}</div>
    </section>
  );
}

const STEP_LABELS = [
  t("Identité & logement"),
  t("Emploi & revenus"),
  t("Références"),
  t("Consentements"),
];

const MAX_REFERENCES = 3;

function emptyReference() {
  return {
    landlordName: "", landlordPhone: "", landlordEmail: "", propertyAddress: "",
    tenancyStartDate: "", tenancyEndDate: "", monthlyRent: "", currencyId: "",
  };
}

export function PrescreeningPublic({ token }) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState({});
  const [references, setReferences] = useState([]);
  const [consents, setConsents] = useState({}); // { credit_check: true|false, data_processing: true|false }
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [creditConsentText, setCreditConsentText] = useState("");
  const [dataConsentText, setDataConsentText] = useState("");
  const [consentTextLoading, setConsentTextLoading] = useState(false);

  const set = (field, v) => setValues((c) => ({ ...c, [field]: v }));

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setFatal(t("Lien invalide ou manquant.")); setLoading(false); return; }
      try {
        const rec = await publicApi.prescreening(token);
        if (!alive) return;
        setRecord(rec);
        setValues({
          firstName: rec?.firstName || "",
          lastName: rec?.lastName || "",
          email: rec?.email || "",
          phone: rec?.phone || "",
          isAdult: !!rec?.isAdult,
          currentAddress: rec?.currentAddress || "",
          currentCity: rec?.currentCity || "",
          currentPostalCode: rec?.currentPostalCode || "",
          desiredMoveInDate: rec?.desiredMoveInDate || "",
          occupantCount: rec?.occupantCount ?? "",
          hasPets: !!rec?.hasPets,
          petsDescription: rec?.petsDescription || "",
          smoker: !!rec?.smoker,
          employmentStatus: rec?.employmentStatus || "",
          employerName: rec?.employerName || "",
          employerContact: rec?.employerContact || "",
          jobTitle: rec?.jobTitle || "",
          employmentStartDate: rec?.employmentStartDate || "",
          monthlyIncome: rec?.monthlyIncome ?? "",
          otherMonthlyIncome: rec?.otherMonthlyIncome ?? "",
          incomeCurrencyId: rec?.incomeCurrencyId ?? rec?.defaultCurrencyId ?? "",
          incomeProofType: rec?.incomeProofType || "",
        });
        setReferences(Array.isArray(rec?.references) && rec.references.length ? rec.references : []);
        if (rec?.status === "submitted") setSubmitted(true);
      } catch (e) {
        if (alive) setFatal(t("Ce lien n'est plus valide ou a expiré."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Textes légaux affichés en clair sur l'étape consentements — fetchés une
  // fois, seulement quand on atteint cette étape.
  useEffect(() => {
    if (step !== 3 || !token) return;
    let alive = true;
    (async () => {
      setConsentTextLoading(true);
      try {
        const [dataText, creditText] = await Promise.all([
          publicApi.prescreeningConsentText(CONSENT_TEXT_VERSION, CONSENT_LOCALE, "data_processing").catch(() => null),
          publicApi.prescreeningConsentText(CONSENT_TEXT_VERSION, CONSENT_LOCALE, "credit_check").catch(() => null),
        ]);
        if (!alive) return;
        if (dataText?.body) setDataConsentText(dataText.body);
        if (creditText?.body) setCreditConsentText(creditText.body);
      } finally {
        if (alive) setConsentTextLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [step, token]);

  const buildPayload = () => ({
    firstName: values.firstName || null,
    lastName: values.lastName || null,
    email: values.email || null,
    phone: values.phone || null,
    isAdult: !!values.isAdult,
    currentAddress: values.currentAddress || null,
    currentCity: values.currentCity || null,
    currentPostalCode: values.currentPostalCode || null,
    desiredMoveInDate: values.desiredMoveInDate || null,
    occupantCount: values.occupantCount !== "" && values.occupantCount != null ? Number(values.occupantCount) : null,
    hasPets: !!values.hasPets,
    petsDescription: values.petsDescription || null,
    smoker: !!values.smoker,
    employmentStatus: values.employmentStatus || null,
    employerName: values.employerName || null,
    employerContact: values.employerContact || null,
    jobTitle: values.jobTitle || null,
    employmentStartDate: values.employmentStartDate || null,
    monthlyIncome: values.monthlyIncome !== "" && values.monthlyIncome != null ? Number(values.monthlyIncome) : null,
    otherMonthlyIncome: values.otherMonthlyIncome !== "" && values.otherMonthlyIncome != null ? Number(values.otherMonthlyIncome) : null,
    incomeCurrencyId: values.incomeCurrencyId ? values.incomeCurrencyId : null,
    incomeProofType: values.incomeProofType || null,
  });

  const saveDraft = async (silent = false) => {
    if (!silent) setSaving(true);
    setError("");
    try {
      const rec = await publicApi.savePrescreening(token, buildPayload());
      setRecord(rec);
      setSavedAt(new Date());
    } catch (e) {
      if (!silent) setError(t("Échec de la sauvegarde. Réessayez."));
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const addReference = () => {
    if (references.length >= MAX_REFERENCES) return;
    setReferences((c) => [...c, emptyReference()]);
  };
  const removeReference = (idx) => setReferences((c) => c.filter((_, i) => i !== idx));
  const setReferenceField = (idx, field, v) =>
    setReferences((c) => c.map((r, i) => (i === idx ? { ...r, [field]: v } : r)));

  // Chaque choix de consentement déclenche immédiatement un appel POST /consent
  // (pas différé à la soumission finale) — exigence légale de traçabilité.
  const handleConsent = async (consentType, granted) => {
    setConsents((c) => ({ ...c, [consentType]: granted }));
    setError("");
    try {
      await publicApi.recordPrescreeningConsent(token, consentType, granted);
    } catch (e) {
      setError(e.message?.replace(/^API \d+[^—]*—\s*/, "") || t("Impossible d'enregistrer votre choix. Réessayez."));
    }
  };

  const goNext = async () => {
    setError("");
    if (step === 0) {
      if (!values.firstName?.trim() || !values.lastName?.trim() || !values.currentAddress?.trim()) {
        setError(t("Veuillez remplir les champs obligatoires."));
        return;
      }
      if (!values.isAdult) {
        setError(t("Vous devez confirmer être majeur(e) pour continuer."));
        return;
      }
    }
    await saveDraft(true);
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo(0, 0);
  };
  const goPrev = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    setError("");
    if (!consents.data_processing) {
      setError(t("Le consentement au traitement des données est requis pour soumettre votre dossier."));
      return;
    }
    setSubmitting(true);
    try {
      await saveDraft(true);
      await publicApi.submitPrescreening(token);
      setSubmitted(true);
    } catch (e) {
      setError(e.message?.replace(/^API \d+[^—]*—\s*/, "") || t("Impossible de soumettre le dossier."));
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(() => Math.round(((step + 1) / STEP_LABELS.length) * 100), [step]);

  const currencyOptions = useMemo(() => {
    const list = Array.isArray(record?.currencies) ? record.currencies : [];
    return [["", t("Devise…")], ...list.map((c) => [String(c.id), `${c.currencyCode}${c.currencySymbol ? ` (${c.currencySymbol})` : ""}`])];
  }, [record]);

  if (loading) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <Loader2 className="domus-spin" size={36} />
          <p className="muted">{t("Chargement de votre dossier…")}</p>
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <DomusMark dark />
          <h1 style={{ marginTop: 18 }}>{t("Lien indisponible")}</h1>
          <p className="muted">{fatal}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="onb-page">
        <div className="onb-state">
          <span className="onb-success-ring"><CheckCircle2 size={48} color="#16a34a" /></span>
          <h1 style={{ marginTop: 16 }}>{t("Merci !")}</h1>
          <p className="muted" style={{ maxWidth: 440 }}>
            {t("Votre enquête de prélocation a bien été transmise. Le gestionnaire va l'examiner et reviendra vers vous très bientôt.")}
          </p>
          <p className="muted" style={{ maxWidth: 440, fontSize: 12.5 }}>
            {t("Conformément à la réglementation québécoise, vos données sont conservées uniquement le temps nécessaire au traitement de votre candidature ; en cas de refus, elles sont conservées pour une durée limitée avant d'être purgées.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="onb-page">
      <div className="onb-shell">
        <header className="onb-hero">
          <DomusMark dark />
          <h1>{t("Enquête de prélocation")}</h1>
          <p>{t("Complétez ce dossier pour votre demande de location. Vos informations restent confidentielles et sont partagées uniquement avec votre gestionnaire.")}</p>
          <div className="onb-progress">
            <div className="onb-progress-track"><div className="onb-progress-fill" style={{ width: `${progress}%` }} /></div>
            <span className="onb-progress-label">{tf(t("Étape {n} sur {total} — {label}"), { n: step + 1, total: STEP_LABELS.length, label: STEP_LABELS[step] })}</span>
          </div>
        </header>

        <div className="onb-body">
          {error && <div ref={errorRef} className="onb-alert">{error}</div>}

          {step === 0 && (
            <Card icon={<User size={18} />} tone="iris" title={t("Identité & logement visé")}
              subtitle={t("Vos coordonnées et le logement recherché")}>
              <div className="domus-property-form-grid">
                <Field label={t("Prénom")} value={values.firstName} onChange={(v) => set("firstName", v)} required />
                <Field label={t("Nom")} value={values.lastName} onChange={(v) => set("lastName", v)} required />
                <Field label={t("Email")} type="email" value={values.email} onChange={(v) => set("email", v)} />
              </div>
              <DomusPhoneField label={t("Téléphone")} value={values.phone} onChange={(v) => set("phone", v)} required />
              <div className="domus-property-form-grid">
                <Field label={t("Adresse actuelle")} value={values.currentAddress} onChange={(v) => set("currentAddress", v)} required />
                <Field label={t("Ville")} value={values.currentCity} onChange={(v) => set("currentCity", v)} />
                <Field label={t("Code postal")} value={values.currentPostalCode} onChange={(v) => set("currentPostalCode", v)} />
                <Field label={t("Date d'emménagement souhaitée")} type="date" value={values.desiredMoveInDate} onChange={(v) => set("desiredMoveInDate", v)} />
                <Field label={t("Nombre d'occupants")} type="number" value={values.occupantCount} onChange={(v) => set("occupantCount", v)} />
              </div>
              <label className="onb-check">
                <input type="checkbox" checked={!!values.hasPets} onChange={(e) => set("hasPets", e.target.checked)} />
                <span>{t("J'ai un ou des animaux de compagnie")}</span>
              </label>
              {values.hasPets && (
                <Field label={t("Description des animaux")} value={values.petsDescription} onChange={(v) => set("petsDescription", v)} />
              )}
              <label className="onb-check">
                <input type="checkbox" checked={!!values.smoker} onChange={(e) => set("smoker", e.target.checked)} />
                <span>{t("Je suis fumeur(euse)")}</span>
              </label>
              <label className="onb-check">
                <input type="checkbox" checked={!!values.isAdult} onChange={(e) => set("isAdult", e.target.checked)} />
                <span>{t("Je suis majeur(e)")}<b> *</b></span>
              </label>
            </Card>
          )}

          {step === 1 && (
            <Card icon={<Briefcase size={18} />} tone="amber" title={t("Emploi et revenus")}
              subtitle={t("Votre situation professionnelle et vos revenus mensuels")}>
              <div className="domus-property-form-grid">
                <SelectField label={t("Statut professionnel")} value={values.employmentStatus} options={EMPLOYMENT_OPTIONS} onChange={(v) => set("employmentStatus", v)} required />
                <Field label={t("Titre du poste")} value={values.jobTitle} onChange={(v) => set("jobTitle", v)} />
                <Field label={t("Nom de l'employeur")} value={values.employerName} onChange={(v) => set("employerName", v)} />
                <Field label={t("Contact de l'employeur")} value={values.employerContact} onChange={(v) => set("employerContact", v)} />
                <Field label={t("Date de début d'emploi")} type="date" value={values.employmentStartDate} onChange={(v) => set("employmentStartDate", v)} />
              </div>
              <div className="domus-property-form-grid">
                <SelectField label={t("Devise du revenu")} value={values.incomeCurrencyId} options={currencyOptions} onChange={(v) => set("incomeCurrencyId", v)} />
                <Field label={t("Revenu mensuel")} type="number" value={values.monthlyIncome} onChange={(v) => set("monthlyIncome", v)} />
                <Field label={t("Autres revenus mensuels")} type="number" value={values.otherMonthlyIncome} onChange={(v) => set("otherMonthlyIncome", v)} />
                <SelectField label={t("Preuve de revenu disponible")} value={values.incomeProofType} options={INCOME_PROOF_OPTIONS} onChange={(v) => set("incomeProofType", v)} />
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card icon={<UsersIcon size={18} />} tone="violet" title={t("Références de locateurs")}
              subtitle={t("Facultatif — jusqu'à 3 anciens propriétaires ou gestionnaires")}>
              {references.length === 0 && (
                <p className="muted">{t("Aucune référence ajoutée. Vous pouvez en ajouter jusqu'à 3, ou passer à l'étape suivante.")}</p>
              )}
              {references.map((ref, idx) => (
                <div key={idx} className="onb-card" style={{ boxShadow: "none", padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong>{tf(t("Référence {n}"), { n: idx + 1 })}</strong>
                    <button type="button" className="btn" onClick={() => removeReference(idx)} title={t("Retirer")}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="domus-property-form-grid">
                    <Field label={t("Nom du locateur")} value={ref.landlordName} onChange={(v) => setReferenceField(idx, "landlordName", v)} />
                    <Field label={t("Adresse du logement loué")} value={ref.propertyAddress} onChange={(v) => setReferenceField(idx, "propertyAddress", v)} />
                    <Field label={t("Date de début de location")} type="date" value={ref.tenancyStartDate} onChange={(v) => setReferenceField(idx, "tenancyStartDate", v)} />
                    <Field label={t("Date de fin de location")} type="date" value={ref.tenancyEndDate} onChange={(v) => setReferenceField(idx, "tenancyEndDate", v)} />
                    <SelectField label={t("Devise du loyer")} value={ref.currencyId} options={currencyOptions} onChange={(v) => setReferenceField(idx, "currencyId", v)} />
                    <Field label={t("Loyer mensuel")} type="number" value={ref.monthlyRent} onChange={(v) => setReferenceField(idx, "monthlyRent", v)} />
                  </div>
                  <DomusPhoneField label={t("Téléphone du locateur")} value={ref.landlordPhone} onChange={(v) => setReferenceField(idx, "landlordPhone", v)} />
                  <Field label={t("Email du locateur")} type="email" value={ref.landlordEmail} onChange={(v) => setReferenceField(idx, "landlordEmail", v)} />
                </div>
              ))}
              {references.length < MAX_REFERENCES && (
                <button type="button" className="btn" onClick={addReference}>
                  <Plus size={15} /> {t("Ajouter une référence")}
                </button>
              )}
            </Card>
          )}

          {step === 3 && (
            <>
              <Card icon={<ScrollText size={18} />} tone="emerald" title={t("Consentement au traitement des données")}
                subtitle={t("Obligatoire pour soumettre votre dossier")}>
                {consentTextLoading ? (
                  <p className="muted">{t("Chargement du texte…")}</p>
                ) : (
                  <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{dataConsentText || t("Texte légal indisponible pour le moment.")}</p>
                )}
                <label className="onb-check">
                  <input
                    type="checkbox"
                    checked={!!consents.data_processing}
                    onChange={(e) => handleConsent("data_processing", e.target.checked)}
                  />
                  <span>{t("J'accepte le traitement de mes données personnelles pour l'évaluation de ma candidature")}<b> *</b></span>
                </label>
              </Card>

              <section className="onb-card" style={{ border: "2px solid #eef2ff" }}>
                <div className="onb-card-head">
                  <span className="onb-card-icon tone-rose"><Lock size={18} /></span>
                  <div className="onb-card-heading">
                    <h3>{t("Vérification de crédit")}</h3>
                    <p>{t("Distinct et facultatif — votre choix n'affecte pas la recevabilité de votre candidature")}</p>
                  </div>
                </div>
                <div className="onb-card-body">
                  {consentTextLoading ? (
                    <p className="muted">{t("Chargement du texte…")}</p>
                  ) : (
                    <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{creditConsentText || t("Texte légal indisponible pour le moment.")}</p>
                  )}
                  <p className="onb-secure" style={{ justifyContent: "flex-start" }}>
                    <ShieldCheck size={14} /> {t("Refuser cette vérification n'empêche pas de soumettre votre candidature.")}
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className={`btn ${consents.credit_check === true ? "btn-primary" : ""}`}
                      onClick={() => handleConsent("credit_check", true)}
                    >
                      {t("J'accepte")}
                    </button>
                    <button
                      type="button"
                      className={`btn ${consents.credit_check === false ? "btn-primary" : ""}`}
                      onClick={() => handleConsent("credit_check", false)}
                    >
                      {t("Je refuse")}
                    </button>
                  </div>
                  {consents.credit_check === true && (
                    <p className="muted" style={{ fontSize: 12.5 }}>{t("Vérification de crédit autorisée.")}</p>
                  )}
                  {consents.credit_check === false && (
                    <p className="muted" style={{ fontSize: 12.5 }}>{t("Vérification de crédit refusée — votre dossier reste soumis normalement.")}</p>
                  )}
                </div>
              </section>
            </>
          )}

          <p className="onb-secure"><ShieldCheck size={14} /> {t("Connexion sécurisée — vos informations restent confidentielles.")}</p>
        </div>

        <footer className="onb-actions">
          <span className="onb-save-status">
            {savedAt ? tf(t("Sauvegardé à {time}"), { time: savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }) : t("Vos réponses ne sont pas encore enregistrées")}
          </span>
          {step > 0 && (
            <button className="btn" onClick={goPrev} disabled={saving || submitting}>
              <ChevronLeft size={16} /> {t("Précédent")}
            </button>
          )}
          <button className="btn" onClick={() => saveDraft(false)} disabled={saving || submitting}>
            {saving ? t("Sauvegarde…") : t("Enregistrer")}
          </button>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={goNext} disabled={saving || submitting}>
              {t("Suivant")} <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={submitting || saving}>
              {submitting ? t("Envoi…") : t("Soumettre mon dossier")}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function DomusMark({ dark = false }) {
  return (
    <div className={`onb-brand ${dark ? "on-dark" : ""}`}>
      <div className="onb-brand-logo"><Building2 size={22} color="#fff" /></div>
      <span className="font-display onb-brand-name">Domus</span>
    </div>
  );
}

export default PrescreeningPublic;
