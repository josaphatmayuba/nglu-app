import { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { setAccessToken } from "../../utils/tokenStore";

// Inscription self-service (Avelomi UNIQUEMENT — montée par App.jsx derrière le
// flag VITE_SIGNUP_ENABLED). 3 étapes : compte → organisation → confirmation,
// puis POST /auth/register (backend2 crée org + admin + plan comptable et
// renvoie un JWT). ongdngolu ne build pas ce flag → la route n'existe pas.
const SECTORS = [
  { value: "agri", label: "Agriculture / Élevage" },
  { value: "immo", label: "Immobilier" },
  { value: "btp", label: "Construction / BTP" },
  { value: "commerce", label: "Commerce / Vente" },
  { value: "autre", label: "Autre" },
];

const STEP_LABELS = { 1: "Votre compte", 2: "Votre organisation", 3: "Confirmation" };

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

export default function SaasSignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null); // { firstName, orgName, slug }
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accountType: "org",
    orgName: "",
    slug: "",
    slugTouched: false,
    sector: "agri",
    phone: "",
    acceptedTerms: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const summary = useMemo(() => {
    const who = `${form.firstName} ${form.lastName}`.trim() || "—";
    const org = form.accountType === "org" ? form.orgName || "—" : who;
    return { who, org, url: `${form.slug || "votre-espace"}.nglu.cloud`, email: form.email || "—" };
  }, [form]);

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Indiquez votre prénom.";
    if (!form.lastName.trim()) e.lastName = "Indiquez votre nom.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide.";
    if (form.password.length < 8) e.password = "Au moins 8 caractères.";
    else if (!/^(?=.*[a-zA-Z])(?=.*\d).+$/.test(form.password)) e.password = "Au moins une lettre et un chiffre.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.accountType === "org" && !form.orgName.trim()) e.orgName = "Indiquez un nom.";
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(form.slug) || form.slug.length < 3)
      e.slug = "Adresse invalide (minuscules, chiffres, tirets).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const onOrgName = (v) => {
    set("orgName", v);
    if (!form.slugTouched) set("slug", slugify(v));
  };

  const submit = async () => {
    const e = {};
    if (!form.acceptedTerms) e.acceptedTerms = "Vous devez accepter les conditions.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post("auth/register", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        accountType: form.accountType,
        orgName: form.accountType === "org" ? form.orgName.trim() : undefined,
        slug: form.slug.trim().toLowerCase(),
        sector: form.sector,
        phone: form.phone.trim() || undefined,
        acceptedTerms: form.acceptedTerms,
      });
      // Connexion immédiate : le backend renvoie un access token.
      if (data?.token) setAccessToken(data.token);
      setSuccess({ firstName: form.firstName.trim(), orgName: summary.org, slug: form.slug.trim() });
    } catch (err) {
      const msg = err?.response?.data?.message || "Inscription impossible. Réessayez.";
      if (/email/i.test(msg)) setErrors({ email: msg, _back: 1 });
      else if (/adresse|slug/i.test(msg)) setErrors({ slug: msg, _back: 2 });
      else toast.error(Array.isArray(msg) ? msg[0] : msg);
      if (/email/i.test(msg)) setStep(1);
      else if (/adresse|slug/i.test(msg)) setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "3rem" }}>🎉</div>
            <h2 style={{ margin: "0.5rem 0", color: "#18181b" }}>Bienvenue, {success.firstName} !</h2>
            <p style={{ color: "#52525b" }}>
              Votre espace <strong>{success.orgName}</strong> est prêt.
            </p>
            <div style={styles.workspaceUrl}>{success.slug}.nglu.cloud</div>
            <button style={styles.primaryBtn} onClick={() => navigate("/admin")}>
              Entrer dans mon espace →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: "0.4rem" }}>
          <h1 style={styles.brand}>
            Nglu <span style={{ color: "#4f46e5" }}>Cloud</span>
          </h1>
          <p style={{ color: "#71717a", marginTop: 4 }}>Votre suite de gestion d'entreprise</p>
        </div>

        <div style={styles.stepsBar}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...styles.stepSeg, background: i <= step ? "#4f46e5" : "#e4e4e7" }} />
          ))}
        </div>
        <div style={styles.stepLabel}>Étape {step} sur 3 — {STEP_LABELS[step]}</div>

        {step === 1 && (
          <>
            <Field label="Prénom *" error={errors.firstName}>
              <input style={styles.input} placeholder="Marie" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Nom *" error={errors.lastName}>
              <input style={styles.input} placeholder="Dupont" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input style={styles.input} type="email" placeholder="marie@exemple.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Mot de passe *" error={errors.password}>
              <input style={styles.input} type="password" placeholder="Au moins 8 caractères" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            <button style={styles.primaryBtn} onClick={next}>Continuer →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={styles.typeToggle}>
              <TypeBtn active={form.accountType === "org"} onClick={() => set("accountType", "org")} ico="🏢" title="Une entreprise" desc="Équipe, plusieurs utilisateurs" />
              <TypeBtn active={form.accountType === "solo"} onClick={() => set("accountType", "solo")} ico="👤" title="Moi seul" desc="Usage individuel" />
            </div>
            {form.accountType === "org" && (
              <Field label="Nom de l'entreprise *" error={errors.orgName}>
                <input style={styles.input} placeholder="Ferme du Soleil" value={form.orgName} onChange={(e) => onOrgName(e.target.value)} />
              </Field>
            )}
            <Field label="Adresse de votre espace" error={errors.slug} hint="Identifiant unique de votre espace.">
              <div style={styles.slugRow}>
                <input
                  style={{ ...styles.input, border: "none", boxShadow: "none", flex: 1 }}
                  placeholder="ferme-du-soleil"
                  value={form.slug}
                  onChange={(e) => { set("slug", slugify(e.target.value)); set("slugTouched", true); }}
                />
                <span style={styles.slugPrefix}>.nglu.cloud</span>
              </div>
            </Field>
            <Field label="Secteur d'activité">
              <select style={styles.input} value={form.sector} onChange={(e) => set("sector", e.target.value)}>
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={back}>← Retour</button>
              <button style={styles.primaryBtn} onClick={next}>Continuer →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Téléphone (RDC par défaut)" hint="Pour sécuriser votre compte (optionnel).">
              <input style={styles.input} type="tel" placeholder="+243 ..." value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <div style={styles.summaryBox}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Récapitulatif</div>
              <div style={{ fontSize: "0.88rem", color: "#555", lineHeight: 1.8 }}>
                {summary.who} · {summary.email}<br />
                Espace : <strong>{summary.org}</strong><br />
                {summary.url}
              </div>
            </div>
            <label style={styles.termsLabel}>
              <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => set("acceptedTerms", e.target.checked)} style={{ marginTop: 3 }} />
              <span>J'accepte les conditions d'utilisation et la politique de confidentialité.</span>
            </label>
            {errors.acceptedTerms && <div style={styles.fieldError}>{errors.acceptedTerms}</div>}
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={back} disabled={submitting}>← Retour</button>
              <button style={styles.primaryBtn} onClick={submit} disabled={submitting}>
                {submitting ? "Création…" : "Créer mon espace 🚀"}
              </button>
            </div>
          </>
        )}

        <div style={styles.foot}>
          Déjà un compte ?{" "}
          <a href="/admin/auth/login" style={{ color: "#4f46e5", fontWeight: 600 }}>Se connecter</a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={styles.label}>{label}</label>
      {children}
      {hint && !error && <div style={styles.hint}>{hint}</div>}
      {error && <div style={styles.fieldError}>{error}</div>}
    </div>
  );
}

function TypeBtn({ active, onClick, ico, title, desc }) {
  return (
    <div onClick={onClick} style={{ ...styles.typeBtn, ...(active ? styles.typeBtnActive : {}) }}>
      <div style={{ fontSize: "1.4rem" }}>{ico}</div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "#71717a" }}>{desc}</div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5", padding: "1.5rem" },
  card: { width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.08)", padding: "2rem 2.2rem" },
  brand: { fontSize: "1.8rem", fontWeight: 800, color: "#18181b", margin: 0 },
  stepsBar: { display: "flex", gap: "0.4rem", margin: "1.6rem 0 0.6rem" },
  stepSeg: { flex: 1, height: 4, borderRadius: 99, transition: "background 0.35s ease" },
  stepLabel: { fontSize: "0.8rem", color: "#71717a", fontWeight: 500, marginBottom: "1.2rem" },
  label: { display: "block", fontWeight: 600, marginBottom: 6, color: "#18181b", fontSize: "0.9rem" },
  input: { width: "100%", padding: "0.72rem 0.9rem", border: "1px solid #e4e4e7", borderRadius: 10, fontSize: "0.95rem", outline: "none", boxSizing: "border-box" },
  slugRow: { display: "flex", alignItems: "center", border: "1px solid #e4e4e7", borderRadius: 10, overflow: "hidden" },
  slugPrefix: { padding: "0.72rem 0.9rem", background: "#f4f4f5", color: "#52525b", fontSize: "0.9rem", whiteSpace: "nowrap", borderLeft: "1px solid #e4e4e7" },
  hint: { fontSize: "0.78rem", color: "#a1a1aa", marginTop: 5 },
  fieldError: { fontSize: "0.78rem", color: "#dc2626", marginTop: 5 },
  primaryBtn: { width: "100%", padding: "0.8rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" },
  ghostBtn: { width: "100%", padding: "0.8rem", background: "#f4f4f5", color: "#3f3f46", border: "none", borderRadius: 10, fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" },
  btnRow: { display: "flex", gap: "0.7rem", marginTop: "0.5rem" },
  typeToggle: { display: "flex", gap: "0.7rem", marginBottom: "1.1rem" },
  typeBtn: { flex: 1, textAlign: "center", padding: "0.9rem 0.5rem", border: "1.5px solid #e4e4e7", borderRadius: 12, cursor: "pointer" },
  typeBtnActive: { borderColor: "#4f46e5", background: "#eef2ff" },
  summaryBox: { background: "#f5f3ff", borderRadius: 10, padding: "1rem", marginBottom: "1.2rem" },
  termsLabel: { display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: "#555", marginBottom: "0.6rem", cursor: "pointer" },
  workspaceUrl: { display: "inline-block", margin: "1rem 0", padding: "0.5rem 1rem", background: "#eef2ff", color: "#4f46e5", borderRadius: 8, fontWeight: 600 },
  foot: { textAlign: "center", marginTop: "1.4rem", paddingTop: "1.2rem", borderTop: "1px solid #f4f4f5", fontSize: "0.88rem", color: "#71717a" },
};
