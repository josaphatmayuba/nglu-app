// Écran « Sous-traitants » — les entreprises et artisans qui exécutent les
// travaux sur les biens (plomberie, électricité, maçonnerie, peinture...).
//
// À ne pas confondre avec un délégué (delegues.jsx), qui suit un portefeuille
// pour le compte du propriétaire et reçoit les notifications de loyer. Un
// sous-traitant ne suit rien : il intervient sur un chantier et facture.
//
// Le carnet n'est pas propre à Domus : c'est le référentiel central des tiers
// (/api/supplier). Un sous-traitant porte plusieurs domaines, donc le même
// artisan saisi ici peut aussi apparaître dans BâtiPro sans double saisie et
// sans historique de facturation dupliqué.
//
// Patron repris de delegues.jsx (recherche + cartes + modal CRUD).
import { useMemo, useState } from "react";
import {
  Search, UserPlus, Phone, Pencil, Trash2, Info, Wrench, HardHat, MapPin,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Modal, FormSection, DomusPropertyField, DomusPropertySelect, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { useConfirm, useToast } from "../components/Dialog.jsx";

// Seuls les tiers qui travaillent sur place nous intéressent ici : un
// fournisseur de matériaux (nature "goods") n'exécute pas de travaux.
function loadSubcontractors() {
  return api.suppliers("subcontractor");
}

function subcontractorInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// Metiers proposes a la saisie. La liste guide la saisie pour que « plomberie »
// ne s ecrive pas de trois facons, mais elle n est pas fermee : allowCustom
// laisse taper un metier absent d ici sans passer par une migration.
export const SUBCONTRACTOR_TRADES = [
  "Plomberie", "Électricité", "Maçonnerie", "Peinture",
  "Menuiserie", "Climatisation", "Toiture", "Autre",
];

const emptySubcontractor = {
  name: "",
  phone: "",
  email: "",
  address: "",
  partyType: "company",
  contactPerson: "",
  trade: "",
  notes: "",
  alsoConstruction: false,
  wasConstruction: false,
};

function subcontractorToForm(s) {
  return {
    ...emptySubcontractor,
    id: s.id,
    name: s.name || "",
    phone: s.phone || "",
    email: s.email || "",
    address: s.address || "",
    partyType: s.partyType || "company",
    contactPerson: s.contactPerson || "",
    trade: s.trade || "",
    notes: s.notes || "",
    alsoConstruction: Array.isArray(s.domains) && s.domains.includes("construction"),
    wasConstruction: Array.isArray(s.domains) && s.domains.includes("construction"),
  };
}

// Le même artisan travaille souvent sur les chantiers BâtiPro et sur les biens
// Domus. On garde donc UN seul enregistrement portant les deux domaines, plutôt
// que deux fiches avec deux historiques de facturation séparés.
function subcontractorPayload(f) {
  return {
    name: f.name.trim(),
    phone: f.phone.trim(),
    email: f.email.trim() || null,
    address: f.address.trim() || null,
    partyType: f.partyType || "company",
    contactPerson: f.contactPerson.trim() || null,
    trade: f.trade.trim() || null,
    notes: f.notes.trim() || null,
    supplierType: "real_estate",
    domains: f.alsoConstruction ? ["real_estate", "construction"] : ["real_estate"],
    natures: ["subcontractor"],
  };
}

// Le téléphone est obligatoire côté backend : sans lui on ne peut pas appeler
// l'artisan le jour où le ticket de travaux part.
function canSaveSubcontractor(f) {
  return Boolean(f.name?.trim()) && Boolean(f.phone?.trim());
}

export function SousTraitants() {
  const { data, loading, error, reload } = useApi(loadSubcontractors, []);
  const confirm = useConfirm();
  const toast = useToast();
  useRealtimeReload(reload, ["suppliers"]);

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // `query=all` renvoie aussi les fiches retirees : le soft delete passe
  // status=false sans les sortir de la reponse. Meme filtre que la maintenance.
  const subcontractors = useMemo(
    () => (Array.isArray(data) ? data : []).filter((s) => String(s.status) === "true"),
    [data],
  );

  const companies = useMemo(
    () => subcontractors.filter((s) => (s.partyType || "company") === "company").length,
    [subcontractors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subcontractors;
    return subcontractors.filter((s) => [s.name, s.phone, s.email, s.contactPerson, s.trade]
      .some((v) => String(v || "").toLowerCase().includes(q)));
  }, [subcontractors, query]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  // Cocher « aussi BâtiPro » doit rendre l'artisan utilisable tel quel sur un
  // chantier, pas seulement visible dans les listes de tiers : BâtiPro tient son
  // propre carnet (batipro_subcontractors), qui porte le marché, le métier et la
  // note. On y inscrit donc la fiche, sans projet ni montant — c'est BâtiPro qui
  // les renseigne au moment de l'affecter. L'appel est tolérant à l'échec : le
  // sous-traitant Domus est enregistré, le reste est un confort inter-app.
  async function saveSubcontractor(form) {
    setSaving(true);
    setActionError("");
    try {
      const alreadyThere = Boolean(form.id) && form.wasConstruction;
      if (form.id) await api.updateSupplier(form.id, subcontractorPayload(form));
      else await api.createSupplier(subcontractorPayload(form));
      if (form.alsoConstruction && !alreadyThere) {
        try {
          await api.registerBatiproSubcontractor({ name: form.name.trim(), trade: form.trade?.trim() || undefined });
        } catch {
          toast.info(t("Fiche enregistrée. Inscription au carnet BâtiPro à refaire depuis BâtiPro."));
        }
      }
      setModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  // Soft delete : la fiche passe status=false et sort des listes, mais
  // l'historique de facturation qui la référence reste lisible.
  async function removeSubcontractor(s) {
    if (!(await confirm({
      title: t("Retirer le sous-traitant"),
      message: tf(t("Retirer « {name} » du carnet ? Il ne sera plus proposé pour les travaux."), { name: s.name }),
      confirmLabel: t("Retirer"),
      danger: true,
    }))) return;
    try {
      await api.setSupplierStatus(s.id, "false");
      await reload();
      toast.success(t("Sous-traitant retiré."));
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Sous-traitants")}</h1>
          <p>{t("Entreprises et artisans qui exécutent les travaux")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Nom, telephone, email...")} />
          </label>
          <button className="immo-btn primary" onClick={() => { setActionError(""); setModal({ ...emptySubcontractor }); }}>
            <UserPlus size={16} /> {t("Nouveau sous-traitant")}
          </button>
        </div>
      </div>

      <MetricsGrid>
        <Metric tone="brand" icon={<HardHat size={20} />} label={t("Sous-traitants")} value={subcontractors.length} />
        <Metric tone="iris" icon={<Wrench size={20} />} label={t("Entreprises")} value={companies}
          helper={t("le reste sont des artisans indépendants")} />
      </MetricsGrid>

      {subcontractors.length === 0 ? (
        <div className="immo-empty">
          <HardHat size={28} />
          <h3>{t("Aucun sous-traitant")}</h3>
          <p>{t("Cliquez « Nouveau sous-traitant » pour constituer votre carnet d'artisans.")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="immo-empty">
          <Search size={26} />
          <h3>{t("Aucun resultat")}</h3>
          <p>{tf(t("Aucun sous-traitant ne correspond a « {q} »."), { q: query })}</p>
        </div>
      ) : (
        <div className="immo-tenant-grid">
          {filtered.map((s) => (
            <article key={s.id} className="immo-tenant-card">
              <div className="immo-letter-avatar iris">{subcontractorInitials(s.name)}</div>
              <div className="immo-tenant-main">
                <h3>{s.name}</h3>
                <p>{s.phone || t("telephone non renseigne")}</p>
                <p>{s.email || t("email non renseigne")}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.trade && <span className="immo-mini-badge">{s.trade}</span>}
                  <span className="immo-mini-badge success">
                    {(s.partyType || "company") === "company" ? t("Entreprise") : t("Artisan indépendant")}
                  </span>
                  {Array.isArray(s.domains) && s.domains.includes("construction") && (
                    <span className="immo-mini-badge">{t("Aussi BâtiPro")}</span>
                  )}
                </div>
              </div>
              <div className="immo-tenant-divider" />
              <div className="immo-tenant-actions">
                <button className="immo-btn ghost" onClick={() => { setActionError(""); setModal(subcontractorToForm(s)); }}>
                  <Pencil size={15} /> {t("Modifier")}
                </button>
                <button className="immo-btn ghost danger" onClick={() => removeSubcontractor(s)}>
                  <Trash2 size={15} /> {t("Retirer")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <SubcontractorModal
          value={modal}
          busy={saving}
          error={actionError}
          onClose={() => setModal(null)}
          onSave={saveSubcontractor}
        />
      )}
    </>
  );
}

function SubcontractorModal({ value, busy, error, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((cur) => ({ ...cur, ...patch }));

  return (
    <Modal
      title={form.id ? t("Modifier le sous-traitant") : t("Nouveau sous-traitant")}
      subtitle={t("Artisan ou entreprise chargé d'exécuter les travaux")}
      icon={form.id ? <Pencil size={20} /> : <UserPlus size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Info size={14} />} title={t("Identité")}>
          <DomusPropertyField label={t("Nom")} value={form.name} onChange={(v) => set({ name: v })} required placeholder={t("ex. Plomberie Kasa")} />
          <div className="domus-property-form-grid">
            <DomusPropertySelect label={t("Type")} value={form.partyType} onChange={(v) => set({ partyType: v })} options={[
              ["company", t("Entreprise")],
              ["individual", t("Artisan indépendant")],
            ]} />
            <DomusPropertyField label={t("Personne de contact")} value={form.contactPerson} onChange={(v) => set({ contactPerson: v })} placeholder={t("Optionnel")} />
          </div>
          <DomusPropertySelect
            label={t("Profession")}
            value={form.trade}
            onChange={(v) => set({ trade: v })}
            options={SUBCONTRACTOR_TRADES.map((m) => [m, t(m)])}
            allowCustom
            placeholder={t("ex. Plomberie — ou saisir un autre métier")}
          />
        </FormSection>

        <FormSection icon={<Phone size={14} />} title={t("Contact")}>
          <DomusPhoneField label={t("Telephone")} value={form.phone} onChange={(v) => set({ phone: v })} required />
          <DomusPropertyField
            label={t("Email")}
            type="email"
            value={form.email}
            onChange={(v) => set({ email: v })}
            placeholder={t("Optionnel")}
          />
        </FormSection>

        <FormSection icon={<HardHat size={14} />} title={t("Domaines")}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(form.alsoConstruction)}
              onChange={(e) => set({ alsoConstruction: e.target.checked })}
            />
            {t("Travaille aussi sur les chantiers BâtiPro")}
          </label>
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
            {t("Il apparaitra dans le carnet BatiPro, pret a etre affecte a un chantier. Une seule fiche, un seul historique de facturation.")}
          </p>
        </FormSection>

        <FormSection icon={<MapPin size={14} />} title={t("Localisation")}>
          <DomusPropertyField label={t("Adresse")} value={form.address} onChange={(v) => set({ address: v })} placeholder={t("Optionnel")} />
        </FormSection>

        <FormSection icon={<Info size={14} />} title={t("Notes")}>
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(v) => set({ notes: v })} placeholder={t("ex. specialite, tarifs, delais")} textarea />
        </FormSection>
      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!canSaveSubcontractor(form)} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}
