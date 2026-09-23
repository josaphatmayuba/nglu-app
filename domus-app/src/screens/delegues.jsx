// Écran « Délégués » — mandataires chargés du suivi de loyer.
//
// Un délégué n'est pas le bailleur : il suit un périmètre pour le compte du
// propriétaire et reçoit les mêmes SMS (bail créé, fin de bail, loyer en
// retard). Deux natures coexistent : un contact externe joint uniquement par
// téléphone, et un employé interne disposant déjà d'un compte.
//
// Le périmètre suivi a deux portées : tout le portefeuille d'un propriétaire
// (les biens acquis plus tard sont couverts sans réaffectation) ou un bien
// précis. Les trois cases à cocher sont des abonnements par événement, pour
// ne pas inonder un mandataire engagé seulement sur les retards.
//
// Patron repris de proprietaires.jsx (recherche + cartes + modal CRUD).
import { useMemo, useState } from "react";
import {
  Search, UserPlus, Phone, Pencil, Trash2, Info, UserRound,
  Building2, BellRing, Plus, X,
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

async function loadDelegatesModule() {
  const [delegates, owners, properties] = await Promise.all([
    api.delegates(),
    api.owners().catch(() => []),
    api.properties().catch(() => []),
  ]);
  return { delegates, owners, properties };
}

function delegateInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

const emptyDelegate = {
  displayName: "",
  phone: "",
  phone2: "",
  email: "",
  notes: "",
};

function delegateToForm(delegate) {
  return {
    ...emptyDelegate,
    id: delegate.id,
    displayName: delegate.displayName || "",
    phone: delegate.phone || "",
    phone2: delegate.phone2 || "",
    email: delegate.email || "",
    notes: delegate.notes || "",
  };
}

function delegatePayload(f) {
  return {
    displayName: f.displayName.trim(),
    phone: f.phone.trim() || null,
    phone2: f.phone2.trim() || null,
    email: f.email.trim() || null,
    notes: f.notes.trim() || null,
  };
}

// Sans téléphone, aucun SMS ne part : la fiche n'aurait pas d'effet.
function canSaveDelegate(f) {
  return Boolean(f.displayName?.trim()) && Boolean(f.phone?.trim());
}

export function Delegues({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadDelegatesModule, []);
  const confirm = useConfirm();
  const toast = useToast();
  useRealtimeReload(reload, ["delegates", "owners", "properties"]);

  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [scopeModal, setScopeModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const delegates = useMemo(() => (Array.isArray(data?.delegates) ? data.delegates : []), [data?.delegates]);
  const owners = useMemo(() => (Array.isArray(data?.owners) ? data.owners : []), [data?.owners]);
  const properties = useMemo(() => (Array.isArray(data?.properties) ? data.properties : []), [data?.properties]);

  const unassigned = useMemo(
    () => delegates.filter((d) => !Number(d.assignmentsCount)).length,
    [delegates],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return delegates;
    return delegates.filter((d) => [d.displayName, d.phone, d.email]
      .some((v) => String(v || "").toLowerCase().includes(q)));
  }, [delegates, query]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  async function saveDelegate(form) {
    setSaving(true);
    setActionError("");
    try {
      if (form.id) await api.updateDelegate(form.id, delegatePayload(form));
      else await api.createDelegate(delegatePayload(form));
      setModal(null);
      await reload();
    } catch (e) {
      setActionError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeDelegate(delegate) {
    if (!(await confirm({
      title: t("Supprimer le délégué"),
      message: tf(t("Supprimer le délégué « {name} » ? Il ne recevra plus aucune notification."), { name: delegate.displayName }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    try {
      await api.deleteDelegate(delegate.id);
      await reload();
      toast.success(t("Délégué supprimé."));
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  async function openScopes(delegate) {
    setActionError("");
    try {
      const full = await api.delegate(delegate.id);
      setScopeModal(full);
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Délégués")}</h1>
          <p>{t("Mandataires chargés du suivi de loyer")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Nom, telephone, email...")} />
          </label>
          <button className="immo-btn primary" onClick={() => { setActionError(""); setModal({ ...emptyDelegate }); }}>
            <UserPlus size={16} /> {t("Nouveau délégué")}
          </button>
        </div>
      </div>

      <MetricsGrid>
        <Metric tone="brand" icon={<UserRound size={20} />} label={t("Délégués")} value={delegates.length} />
        <Metric tone="amber" icon={<BellRing size={20} />} label={t("Sans périmètre")} value={unassigned}
          valueColor={unassigned > 0 ? "#d97706" : undefined} helper={t("ne reçoivent aucune notification")} />
      </MetricsGrid>

      {delegates.length === 0 ? (
        <div className="immo-empty">
          <UserRound size={28} />
          <h3>{t("Aucun délégué")}</h3>
          <p>{t("Cliquez « Nouveau délégué » pour confier le suivi d'un portefeuille.")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="immo-empty">
          <Search size={26} />
          <h3>{t("Aucun resultat")}</h3>
          <p>{tf(t("Aucun délégué ne correspond a « {q} »."), { q: query })}</p>
        </div>
      ) : (
        <div className="immo-tenant-grid">
          {filtered.map((delegate) => (
            <article key={delegate.id} className="immo-tenant-card">
              <div className="immo-letter-avatar iris">{delegateInitials(delegate.displayName)}</div>
              <div className="immo-tenant-main">
                <h3>{delegate.displayName}</h3>
                <p>{delegate.phone || t("telephone non renseigne")}</p>
                <p>{delegate.email || t("email non renseigne")}</p>
                <span className={`immo-mini-badge ${Number(delegate.assignmentsCount) ? "success" : "warn"}`}>
                  {tf(t("{n} périmètre(s) suivi(s)"), { n: Number(delegate.assignmentsCount) || 0 })}
                </span>
              </div>
              <div className="immo-tenant-divider" />
              <div className="immo-tenant-lease" style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <button type="button" className="btn btn-sm" onClick={() => openScopes(delegate)}>
                  <Building2 size={14} /> {t("Périmètre")}
                </button>
                <button type="button" className="btn btn-sm" onClick={() => { setActionError(""); setModal(delegateToForm(delegate)); }}>
                  <Pencil size={14} /> {t("Modifier")}
                </button>
                <button type="button" className="btn btn-sm" style={{ color: "#be123c" }} onClick={() => removeDelegate(delegate)}>
                  <Trash2 size={14} /> {t("Supprimer")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <DelegateModal
          value={modal}
          busy={saving}
          error={actionError}
          onClose={() => { setModal(null); setActionError(""); }}
          onSave={saveDelegate}
        />
      )}

      {scopeModal && (
        <DelegateScopeModal
          delegate={scopeModal}
          owners={owners}
          properties={properties}
          onClose={() => setScopeModal(null)}
          onChanged={async (id) => {
            const full = await api.delegate(id);
            setScopeModal(full);
            await reload();
          }}
        />
      )}
    </>
  );
}

function DelegateModal({ value, busy, error, onClose, onSave }) {
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((cur) => ({ ...cur, ...patch }));

  return (
    <Modal
      title={form.id ? t("Modifier le délégué") : t("Nouveau délégué")}
      subtitle={t("Mandataire chargé du suivi de loyer (distinct du propriétaire)")}
      icon={form.id ? <Pencil size={20} /> : <UserPlus size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Info size={14} />} title={t("Identité")}>
          <DomusPropertyField label={t("Nom affiché")} value={form.displayName} onChange={(v) => set({ displayName: v })} required placeholder={t("ex. Patrick Ilunga")} />
        </FormSection>

        <FormSection icon={<Phone size={14} />} title={t("Contact")}>
          <div className="domus-property-form-grid">
            <DomusPhoneField label={t("Telephone")} value={form.phone} onChange={(v) => set({ phone: v })} required />
            <DomusPhoneField label={t("Telephone 2")} value={form.phone2} onChange={(v) => set({ phone2: v })} />
          </div>
          <DomusPropertyField
            label={t("Email")}
            type="email"
            value={form.email}
            onChange={(v) => set({ email: v })}
            placeholder={t("Optionnel")}
            helper={t("Le telephone porte les notifications : sans numero, aucun SMS ne part.")}
          />
        </FormSection>

        <FormSection icon={<Info size={14} />} title={t("Notes")}>
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(v) => set({ notes: v })} placeholder={t("Optionnel")} textarea />
        </FormSection>
      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!canSaveDelegate(form)} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

const EVENT_FLAGS = [
  ["notifyLease", "Bail créé et fin de bail"],
  ["notifyOverdue", "Loyer en retard"],
  ["notifyPayment", "Loyer encaissé"],
];

// Périmètre suivi : la liste des affectations, plus un formulaire d'ajout.
// Chaque ligne porte ses propres abonnements, modifiables sans la recréer.
function DelegateScopeModal({ delegate, owners, properties, onClose, onChanged }) {
  const [scopeType, setScopeType] = useState("property");
  const [scopeId, setScopeId] = useState("");
  const [flags, setFlags] = useState({ notifyLease: true, notifyOverdue: true, notifyPayment: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const assignments = Array.isArray(delegate.assignments) ? delegate.assignments : [];
  const options = scopeType === "owner" ? owners : properties;

  async function addScope() {
    if (!scopeId) return;
    setBusy(true);
    setError("");
    try {
      await api.addDelegateAssignment(delegate.id, { scopeType, scopeId: Number(scopeId), ...flags });
      setScopeId("");
      await onChanged(delegate.id);
      toast.success(t("Périmètre ajouté."));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleFlag(assignment, key) {
    try {
      await api.updateDelegateAssignment(delegate.id, assignment.id, { [key]: !assignment[key] });
      await onChanged(delegate.id);
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  async function removeScope(assignment) {
    try {
      await api.removeDelegateAssignment(delegate.id, assignment.id);
      await onChanged(delegate.id);
      toast.success(t("Périmètre retiré."));
    } catch (e) {
      toast.error(e.message || String(e));
    }
  }

  return (
    <Modal
      title={tf(t("Périmètre de {name}"), { name: delegate.displayName })}
      subtitle={t("Ce que le délégué suit, et ce qu'il reçoit")}
      icon={<Building2 size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Plus size={14} />} title={t("Ajouter un périmètre")}>
          <div className="domus-property-field">
            <span>{t("Portée")}</span>
            <div className="domus-radio-cards">
              <button type="button" className={scopeType === "property" ? "active" : ""} onClick={() => { setScopeType("property"); setScopeId(""); }}>
                <i /> {t("Un bien")}
              </button>
              <button type="button" className={scopeType === "owner" ? "active" : ""} onClick={() => { setScopeType("owner"); setScopeId(""); }}>
                <i /> {t("Tout un propriétaire")}
              </button>
            </div>
          </div>
          <DomusPropertySelect
            label={scopeType === "owner" ? t("Propriétaire") : t("Bien")}
            value={scopeId}
            onChange={(v) => setScopeId(v)}
            options={[
              ["", t("Choisir...")],
              ...options.map((o) => [String(o.id), o.displayName || o.name || `#${o.id}`]),
            ]}
          />
          <div className="domus-property-field">
            <span>{t("Notifications")}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {EVENT_FLAGS.map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={flags[key]} onChange={(e) => setFlags((c) => ({ ...c, [key]: e.target.checked }))} />
                  {t(label)}
                </label>
              ))}
            </div>
          </div>
          <button type="button" className="immo-btn primary" disabled={busy || !scopeId} onClick={addScope}>
            <Plus size={16} /> {t("Ajouter")}
          </button>
        </FormSection>

        <FormSection icon={<BellRing size={14} />} title={t("Périmètres suivis")}>
          {assignments.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
              {t("Aucun périmètre : ce délégué ne reçoit aucune notification.")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {assignments.map((a) => (
                <div key={a.id} style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <strong>
                      {a.scopeType === "owner" ? t("Portefeuille") : t("Bien")} — {a.scopeLabel || `#${a.scopeId}`}
                    </strong>
                    <button type="button" className="btn btn-sm" style={{ color: "#be123c" }} onClick={() => removeScope(a)}>
                      <X size={14} /> {t("Retirer")}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                    {EVENT_FLAGS.map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={Boolean(a[key])} onChange={() => toggleFlag(a, key)} />
                        {t(label)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      {/* Chaque ajout/retrait/case est enregistre immediatement : il n'y a pas
          de bouton Enregistrer global a proposer ici. */}
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>{t("Fermer")}</button>
      </div>
    </Modal>
  );
}
