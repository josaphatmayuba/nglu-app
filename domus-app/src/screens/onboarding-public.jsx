// Page publique d'inscription locataire — propre à Domus (servie sous /domus/,
// URL propre /domus/onboarding/tenant?token=...). Aucune authentification : le
// token suffit. Mêmes endpoints publics que la page tenant du CRM
// (/tenant-onboarding), mais habillage Domus moderne (hero iris, progression,
// sections en cartes, barre d'action collante).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2, CheckCircle2, Loader2, User, IdCard, Phone, Briefcase, Home, ShieldCheck,
} from "lucide-react";
import { publicApi } from "../api.js";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { t, tf } from "../i18n.js";

// On stocke un CODE neutre (i18n-ready) et on affiche le libellé traduit ; voir migration 0207.
const MARITAL_OPTIONS = [
  ["", t("Sélectionnez…")],
  ["single", t("Célibataire")],
  ["married", t("Marié(e)")],
  ["common_law", t("Conjoint de fait")],
  ["divorced", t("Divorcé(e)")],
  ["widowed", t("Veuf / Veuve")],
];
const COUPLE_STATUSES = ["married", "common_law"];

const PRO_OPTIONS = [
  ["", t("Sélectionnez…")],
  ["salarie", t("Salarié(e)")],
  ["entrepreneur", t("Entrepreneur")],
  ["commercant", t("Commerçant(e)")],
  ["independant", t("Travailleur autonome / Indépendant")],
  ["pigiste", t("Pigiste")],
  ["etudiant", t("Étudiant(e)")],
  ["sans_emploi", t("Sans emploi")],
  ["retraite", t("Retraité(e)")],
  ["stagiaire", t("Stagiaire")],
];

const SEX_OPTIONS = [["", t("Sélectionnez…")], ["M", t("Masculin")], ["F", t("Féminin")]];

// Champs simples (réutilisent les classes Domus existantes).
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
// Section = carte avec badge icône coloré + titre + sous-titre.
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

const REQUIRED_FIELDS = [
  ["firstName", t("Prénom")], ["lastName", t("Nom")], ["address", t("Adresse actuelle")],
  ["birth_date", t("Date de naissance")], ["sex", t("Sexe")], ["nationality", t("Nationalité")],
  ["marital_status", t("État civil")], ["contacted_person", t("Contact d'urgence")],
  ["contacted_person_phone_number", t("Téléphone du contact d'urgence")],
  ["prossional_status", t("Statut professionnel")], ["main_activity", t("Domaine / Fonction")],
  ["entity_name", t("Nom de l'entité")], ["occupant_number", t("Nombre d'occupants")],
];

export function TenantOnboardingPublic({ token }) {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState({ child_number: 0, first_rental: false });
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

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
        const rec = await publicApi.onboarding(token);
        if (!alive) return;
        setRecord(rec);
        setValues({
          child_number: 0,
          salary_currency_id: rec?.defaultCurrencyId ?? "",
          ...(rec?.data || {}),
          phone: rec?.phone,
        });
        if (rec?.status === "submitted") setSubmitted(true);
      } catch (e) {
        if (alive) setFatal(t("Ce lien n'est plus valide ou a expiré."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const isCouple = useMemo(
    () => COUPLE_STATUSES.includes(String(values.marital_status || "").toLowerCase()),
    [values.marital_status],
  );
  const childNumber = Math.max(0, Number(values.child_number || 0));
  const firstRental = Boolean(values.first_rental);

  const currencyOptions = useMemo(() => {
    const list = Array.isArray(record?.currencies) ? record.currencies : [];
    return [["", "Devise"], ...list.map((c) => [String(c.id), `${c.currencyCode}${c.currencySymbol ? ` (${c.currencySymbol})` : ""}`])];
  }, [record]);

  // Clés obligatoires effectives (selon état civil / primo-location) → progression.
  const requiredKeys = useMemo(() => {
    const keys = REQUIRED_FIELDS.map(([k]) => k);
    if (isCouple) keys.push("partenair_name", "partenair_number");
    if (!firstRental) keys.push("old_address", "old_lessor", "moving_reason");
    return keys;
  }, [isCouple, firstRental]);
  const progress = useMemo(() => {
    const filled = requiredKeys.filter((k) => String(values[k] ?? "").trim() !== "").length;
    return Math.round((filled / Math.max(1, requiredKeys.length)) * 100);
  }, [requiredKeys, values]);

  const buildPayload = () => {
    const child_age = childNumber > 0
      ? Array.from({ length: childNumber }).map((_, i) => Number(values.child_age?.[i]) || 0)
      : [];
    return {
      ...values,
      occupant_number: values.occupant_number != null && values.occupant_number !== "" ? Number(values.occupant_number) : undefined,
      child_number: childNumber,
      monthly_pay: values.monthly_pay !== "" && values.monthly_pay != null ? Number(values.monthly_pay) : null,
      other_monthly_income: values.other_monthly_income !== "" && values.other_monthly_income != null ? Number(values.other_monthly_income) : null,
      salary_currency_id: values.salary_currency_id ? Number(values.salary_currency_id) : null,
      child_age,
    };
  };

  const saveDraft = async () => {
    setSaving(true); setError("");
    try {
      const rec = await publicApi.saveOnboarding(token, buildPayload());
      setRecord(rec);
      setSavedAt(new Date());
    } catch (e) {
      setError(t("Échec de la sauvegarde. Réessayez."));
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError("");
    const missing = REQUIRED_FIELDS.filter(([k]) => {
      const v = values[k];
      return v == null || String(v).trim() === "";
    });
    if (isCouple && (!String(values.partenair_name || "").trim() || !String(values.partenair_number || "").trim())) {
      missing.push(["partenair_name", "Informations du partenaire"]);
    }
    if (!firstRental) {
      ["old_address", "old_lessor", "moving_reason"].forEach((k) => {
        if (!String(values[k] || "").trim()) missing.push([k, k]);
      });
    }
    if (missing.length) {
      setError(t("Veuillez remplir les champs obligatoires : ") + [...new Set(missing.map(([, l]) => l))].slice(0, 6).join(", ") + "…");
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.submitOnboarding(token, buildPayload());
      setSubmitted(true);
    } catch (e) {
      setError(e.message?.replace(/^API \d+[^—]*—\s*/, "") || t("Impossible de soumettre le dossier."));
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="muted" style={{ maxWidth: 400 }}>
            {t("Votre dossier a bien été transmis. Le gestionnaire va le vérifier et reviendra vers vous très bientôt. Vous pouvez fermer cette page.")}
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
          <h1>{t("Dossier locataire")}</h1>
          <p>{t("Complétez vos informations pour finaliser votre inscription. Vos données sont sécurisées et partagées uniquement avec votre gestionnaire.")}</p>
          <div className="onb-progress">
            <div className="onb-progress-track"><div className="onb-progress-fill" style={{ width: `${progress}%` }} /></div>
            <span className="onb-progress-label">{progress}% {t("complété")}</span>
          </div>
        </header>

        <div className="onb-body">
          {error && <div ref={errorRef} className="onb-alert">{error}</div>}

          <Card icon={<User size={18} />} tone="iris" title={t("Identité")}
            subtitle={t("Vos informations de base et de contact")}>
            <div className="domus-property-form-grid">
              <Field label={t("Prénom")} value={values.firstName} onChange={(v) => set("firstName", v)} required />
              <Field label={t("Nom")} value={values.lastName} onChange={(v) => set("lastName", v)} required />
              <Field label={t("Email")} type="email" value={values.email} onChange={(v) => set("email", v)} />
              <Field label={t("Téléphone")} value={values.phone} disabled placeholder={t("Fourni par le gestionnaire")} />
            </div>
            <DomusPhoneField label={t("Téléphone secondaire")} value={values.phone2} onChange={(v) => set("phone2", v)} />
            <Field label={t("Adresse actuelle")} value={values.address} onChange={(v) => set("address", v)} required />
          </Card>

          <Card icon={<IdCard size={18} />} tone="violet" title={t("Profil personnel & civil")}
            subtitle={t("État civil et nationalité")}>
            <div className="domus-property-form-grid">
              <Field label={t("Date de naissance")} type="date" value={values.birth_date} onChange={(v) => set("birth_date", v)} required />
              <SelectField label={t("Sexe")} value={values.sex} options={SEX_OPTIONS} onChange={(v) => set("sex", v)} required />
              <Field label={t("Nationalité")} value={values.nationality} onChange={(v) => set("nationality", v)} required />
              <SelectField label={t("État civil")} value={values.marital_status} options={MARITAL_OPTIONS} onChange={(v) => set("marital_status", v)} required />
            </div>
            {isCouple && (
              <div className="domus-property-form-grid">
                <Field label={t("Nom du partenaire")} value={values.partenair_name} onChange={(v) => set("partenair_name", v)} required />
                <DomusPhoneField label={t("Téléphone du partenaire")} value={values.partenair_number} onChange={(v) => set("partenair_number", v)} required />
              </div>
            )}
          </Card>

          <Card icon={<Phone size={18} />} tone="rose" title={t("Contact d'urgence")}
            subtitle={t("Une personne à joindre en cas de besoin")}>
            <div className="domus-property-form-grid">
              <Field label={t("Personne à contacter")} value={values.contacted_person} onChange={(v) => set("contacted_person", v)} required />
              <DomusPhoneField label={t("Téléphone du contact")} value={values.contacted_person_phone_number} onChange={(v) => set("contacted_person_phone_number", v)} required />
            </div>
          </Card>

          <Card icon={<Briefcase size={18} />} tone="amber" title={t("Situation professionnelle & revenus")}
            subtitle={t("Votre activité et vos revenus mensuels")}>
            <div className="domus-property-form-grid">
              <SelectField label={t("Statut professionnel")} value={values.prossional_status} options={PRO_OPTIONS} onChange={(v) => set("prossional_status", v)} required />
              <Field label={t("Domaine / Fonction")} value={values.main_activity} onChange={(v) => set("main_activity", v)} required />
              <Field label={t("Nom de l'entité (employeur)")} value={values.entity_name} onChange={(v) => set("entity_name", v)} required />
              <SelectField label={t("Devise du salaire")} value={values.salary_currency_id} options={currencyOptions} onChange={(v) => set("salary_currency_id", v)} />
              <Field label={t("Salaire mensuel")} type="number" value={values.monthly_pay} onChange={(v) => set("monthly_pay", v)} />
              <Field label={t("Autres revenus mensuels")} type="number" value={values.other_monthly_income} onChange={(v) => set("other_monthly_income", v)} />
            </div>
          </Card>

          <Card icon={<Home size={18} />} tone="emerald" title={t("Historique & ménage")}
            subtitle={t("Votre logement actuel et votre foyer")}>
            <label className="onb-check">
              <input type="checkbox" checked={firstRental} onChange={(e) => set("first_rental", e.target.checked)} />
              <span>{t("Première location (je n'ai jamais loué auparavant)")}</span>
            </label>
            <div className="domus-property-form-grid">
              {!firstRental && (
                <>
                  <Field label={t("Ancienne adresse")} value={values.old_address} onChange={(v) => set("old_address", v)} required />
                  <Field label={t("Ancien bailleur")} value={values.old_lessor} onChange={(v) => set("old_lessor", v)} required />
                  <Field label={t("Motif du déménagement")} value={values.moving_reason} onChange={(v) => set("moving_reason", v)} required />
                </>
              )}
              <Field label={t("Nombre d'occupants")} type="number" value={values.occupant_number} onChange={(v) => set("occupant_number", v)} required />
              <Field label={t("Nombre d'enfants")} type="number" value={values.child_number} onChange={(v) => set("child_number", v)} />
            </div>
            {childNumber > 0 && (
              <div className="domus-property-form-grid">
                {Array.from({ length: childNumber }).map((_, i) => (
                  <Field key={i} label={tf("Âge enfant {n}", {n: i + 1})} type="number"
                    value={values.child_age?.[i] ?? ""}
                    onChange={(v) => set("child_age", Object.assign([], values.child_age, { [i]: v }))} />
                ))}
              </div>
            )}
          </Card>

          <p className="onb-secure"><ShieldCheck size={14} /> {t("Connexion sécurisée — vos informations restent confidentielles.")}</p>
        </div>

        <footer className="onb-actions">
          <span className="onb-save-status">
            {savedAt ? tf(t("Sauvegardé à {time}"), {time: savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) : t("Vos réponses ne sont pas encore enregistrées")}
          </span>
          <button className="btn" onClick={saveDraft} disabled={saving || submitting}>
            {saving ? t("Sauvegarde…") : t("Enregistrer")}
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting || saving}>
            {submitting ? t("Envoi…") : t("Soumettre mon dossier")}
          </button>
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

export default TenantOnboardingPublic;
