// Écran « Propriétaires » — annuaire des propriétaires immobiliers (owner),
// distinct du gestionnaire mandaté (réglages appSettings.landlordName/...).
// Patron repris de locataires.jsx (recherche + cartes + modal CRUD).
import { useMemo, useState } from "react";
import {
  Search, UserPlus, Phone, MapPin, IdCard, Building2, UserRound,
  Pencil, Trash2, FileSignature, Info,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Modal, FormSection, DomusPropertyField, DomusPropertySelect, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { SignaturePad } from "../components/SignaturePad.jsx";
import { useConfirm, useToast } from "../components/Dialog.jsx";

const OWNER_TYPE_OPTIONS = [["individual", "Individuel"], ["company", "Société"]];

async function loadOwnersModule() {
  const [owners, properties] = await Promise.all([
    api.owners(),
    api.properties().catch(() => []),
  ]);
  return { owners, properties };
}

function ownerInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

const emptyOwner = {
  ownerType: "individual",
  displayName: "",
  firstName: "",
  lastName: "",
  companyName: "",
  representativeName: "",
  phone: "",
  phone2: "",
  email: "",
  address: "",
  city: "",
  country: "RDC",
  idDocumentType: "",
  idNumber: "",
  taxId: "",
  signature: null,
  notes: "",
};

function ownerToForm(owner) {
  return {
    ...emptyOwner,
    id: owner.id,
    ownerType: owner.ownerType || "individual",
    displayName: owner.displayName || "",
    firstName: owner.firstName || "",
    lastName: owner.lastName || "",
    companyName: owner.companyName || "",
    representativeName: owner.representativeName || "",
    phone: owner.phone || "",
    phone2: owner.phone2 || "",
    email: owner.email || "",
    address: owner.address || "",
    city: owner.city || "",
    country: owner.country || "RDC",
    idDocumentType: owner.idDocumentType || "",
    idNumber: owner.idNumber || "",
    taxId: owner.taxId || "",
    signature: owner.signature || null,
    notes: owner.notes || "",
  };
}

function ownerPayload(f) {
  return {
    ownerType: f.ownerType,
    displayName: f.displayName.trim(),
    firstName: f.firstName.trim() || null,
    lastName: f.lastName.trim() || null,
    companyName: f.companyName.trim() || null,
    representativeName: f.representativeName.trim() || null,
    phone: f.phone.trim() || null,
    phone2: f.phone2.trim() || null,
    email: f.email.trim() || null,
    address: f.address.trim() || null,
    city: f.city.trim() || null,
    country: f.country.trim() || null,
    idDocumentType: f.idDocumentType.trim() || null,
    idNumber: f.idNumber.trim() || null,
    taxId: f.taxId.trim() || null,
    signature: f.signature || null,
    notes: f.notes.trim() || null,
  };
}

function canSaveOwner(f) {
  if (!f.displayName?.trim()) return false;
  return true;
}

export function Proprietaires({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadOwnersModule, []);
  const confirm = useConfirm();
  const toast = useToast();
  useRealtimeReload(reload, ["owners", "properties"]);

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const owners = useMemo(() => (Array.isArray(data?.owners) ? data.owners : []), [data?.owners]);
  const properties = useMemo(() => (Array.isArray(data?.properties) ? data.properties : []), [data?.properties]);

  const propertyCountByOwner = useMemo(() => {
    const map = new Map();
    properties.forEach((p) => {
      if (p.ownerId == null) return;
      const key = Number(p.ownerId);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [properties]);

  const propertiesWithoutOwner = useMemo(
    () => properties.filter((p) => p.ownerId == null).length,
    [properties],
  );

  const view = useMemo(
    () => owners.map((o) => ({ ...o, _name: o.displayName || o.companyName || `Propriétaire #${o.id}`, _propertyCount: propertyCountByOwner.get(Number(o.id)) || 0 })),
    [owners, propertyCountByOwner],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return view;
    return view.filter((o) => [o._name, o.phone, o.email, o.city, o.companyName]
      .some((v) => String(v || "").toLowerCase().includes(q)));
  }, [view, query]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  async function saveOwner(form) {
    setSaving(true);
    setActionError("");
    try {
      if (form.id) await api.updateOwner(form.id, ownerPayload(form));
      else await api.createOwner(ownerPayload(form));
      setModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeOwner(owner) {
    if (!(await confirm({
      title: t("Supprimer le propriétaire"),
      message: tf(t("Supprimer le propriétaire « {name} » ?"), { name: owner._name }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    try {
      await api.deleteOwner(owner.id);
      await reload();
      toast.success(t("Propriétaire supprimé."));
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Propriétaires")}</h1>
          <p>{t("Annuaire des propriétaires immobiliers")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Nom, telephone, ville...")} />
          </label>
          <button className="immo-btn primary" onClick={() => { setActionError(""); setModal({ ...emptyOwner }); }}>
            <UserPlus size={16} /> {t("Nouveau propriétaire")}
          </button>
        </div>
      </div>

      <MetricsGrid>
        <Metric tone="brand" icon={<UserRound size={20} />} label={t("Propriétaires")} value={view.length} />
        <Metric tone="amber" icon={<Building2 size={20} />} label={t("Biens sans propriétaire")} value={propertiesWithoutOwner}
          valueColor={propertiesWithoutOwner > 0 ? "#d97706" : undefined} helper={t("assignation depuis la fiche du bien")} />
      </MetricsGrid>

      {view.length === 0 ? (
        <div className="immo-empty">
          <UserRound size={28} />
          <h3>{t("Aucun propriétaire")}</h3>
          <p>{t("Cliquez « Nouveau propriétaire » pour creer la premiere fiche.")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="immo-empty">
          <Search size={26} />
          <h3>{t("Aucun resultat")}</h3>
          <p>{tf(t("Aucun propriétaire ne correspond a « {q} »."), { q: query })}</p>
        </div>
      ) : (
        <div className="immo-tenant-grid">
          {filtered.map((owner) => (
            <article key={owner.id} className="immo-tenant-card">
              <div className="immo-letter-avatar iris">{ownerInitials(owner._name)}</div>
              <div className="immo-tenant-main">
                <h3>{owner._name}</h3>
                <p>{owner.email || t("email non renseigne")}</p>
                <p>{owner.phone || t("telephone non renseigne")}</p>
                <span className="immo-mini-badge success">
                  {tf(t("{n} bien(s) rattaché(s)"), { n: owner._propertyCount })}
                </span>
              </div>
              <div className="immo-tenant-divider" />
              <div className="immo-tenant-lease" style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <button type="button" className="btn btn-sm" onClick={() => { setActionError(""); setModal(ownerToForm(owner)); }}>
                  <Pencil size={14} /> {t("Modifier")}
                </button>
                <button type="button" className="btn btn-sm" style={{ color: "#be123c" }} onClick={() => removeOwner(owner)}>
                  <Trash2 size={14} /> {t("Supprimer")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <OwnerModal
          value={modal}
          busy={saving}
          error={actionError}
          onClose={() => { setModal(null); setActionError(""); }}
          onSave={saveOwner}
        />
      )}
    </>
  );
}

function OwnerModal({ value, busy, error, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((cur) => ({ ...cur, ...patch }));
  const isCompany = form.ownerType === "company";

  return (
    <Modal
      title={form.id ? t("Modifier le propriétaire") : t("Nouveau propriétaire")}
      subtitle={t("Fiche propriétaire immobilier (distincte du gestionnaire mandaté)")}
      icon={form.id ? <Pencil size={20} /> : <UserPlus size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Info size={14} />} title={t("Identité")}>
          <div className="domus-property-field">
            <span>{t("Type")}</span>
            <div className="domus-radio-cards">
              {OWNER_TYPE_OPTIONS.map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={form.ownerType === val ? "active" : ""}
                  onClick={() => set({ ownerType: val })}
                >
                  <i /> {t(label)}
                </button>
              ))}
            </div>
          </div>
          <DomusPropertyField label={t("Nom affiché")} value={form.displayName} onChange={(v) => set({ displayName: v })} required placeholder={t("ex. Jean Tshisekedi ou SARL Ngolu")} />
          {isCompany ? (
            <div className="domus-property-form-grid">
              <DomusPropertyField label={t("Nom de la société")} value={form.companyName} onChange={(v) => set({ companyName: v })} placeholder={t("ex. SARL Ngolu")} />
              <DomusPropertyField label={t("Représentant")} value={form.representativeName} onChange={(v) => set({ representativeName: v })} placeholder={t("ex. Gérant, mandataire")} />
            </div>
          ) : (
            <div className="domus-property-form-grid">
              <DomusPropertyField label={t("Prénom")} value={form.firstName} onChange={(v) => set({ firstName: v })} placeholder={t("ex. Jean")} />
              <DomusPropertyField label={t("Nom")} value={form.lastName} onChange={(v) => set({ lastName: v })} placeholder={t("ex. Tshisekedi")} />
            </div>
          )}
        </FormSection>

        <FormSection icon={<Phone size={14} />} title={t("Contact")}>
          <div className="domus-property-form-grid">
            <DomusPhoneField label={t("Telephone")} value={form.phone} onChange={(v) => set({ phone: v })} />
            <DomusPhoneField label={t("Telephone 2")} value={form.phone2} onChange={(v) => set({ phone2: v })} />
          </div>
          <DomusPropertyField label={t("Email")} type="email" value={form.email} onChange={(v) => set({ email: v })} placeholder={t("Optionnel")} />
        </FormSection>

        <FormSection icon={<MapPin size={14} />} title={t("Adresse")}>
          <DomusPropertyField label={t("Adresse")} value={form.address} onChange={(v) => set({ address: v })} placeholder={t("ex. 12 Av. des Palmiers")} />
          <div className="domus-property-form-grid">
            <DomusPropertyField label={t("Ville")} value={form.city} onChange={(v) => set({ city: v })} placeholder="Kinshasa" />
            <DomusPropertyField label={t("Pays")} value={form.country} onChange={(v) => set({ country: v })} placeholder="RDC" />
          </div>
        </FormSection>

        <FormSection icon={<IdCard size={14} />} title={t("Identification")}>
          <div className="domus-property-form-grid">
            <DomusPropertyField label={t("Piece d'identite (type)")} value={form.idDocumentType} onChange={(v) => set({ idDocumentType: v })} placeholder={t("ex. Carte d'electeur, Passeport")} />
            <DomusPropertyField label={t("N° de la piece")} value={form.idNumber} onChange={(v) => set({ idNumber: v })} placeholder={t("ex. CNI-0123456")} />
          </div>
          <DomusPropertyField label={t("N° impôt / RCCM")} value={form.taxId} onChange={(v) => set({ taxId: v })} placeholder={t("Optionnel")} />
        </FormSection>

        <FormSection icon={<FileSignature size={14} />} title={t("Signature")}>
          <SignaturePad value={form.signature} onChange={(v) => set({ signature: v })} />
        </FormSection>

        <FormSection icon={<Info size={14} />} title={t("Notes")}>
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(v) => set({ notes: v })} placeholder={t("Optionnel")} textarea />
        </FormSection>
      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!canSaveOwner(form)} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}
