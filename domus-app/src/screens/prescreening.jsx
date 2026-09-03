// Écran interne « Enquête de prélocation » (Québec) — vue gestionnaire.
// Liste des candidatures, fiche détail (consentements, références), panneau
// de décision avec liste fermée de motifs (aucun champ libre comme motif
// principal — exigence légale CDPDJ), conversion en onboarding, purge (soft).
// Réutilise l'API authentifiée existante (../api.js) et les patterns de
// onboarding.jsx (useApi, useConfirm, useToast, ImmoHeader/Metric).
import { useMemo, useState } from "react";
import {
  ShieldCheck, User, Phone, Mail, Home, ScrollText, AlertTriangle, CheckCircle2,
  XCircle, Clock, ArrowRightCircle, Trash2, Users as UsersIcon, Lock, ChevronLeft,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useApi, normalizeCurrencyModule, money } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { useConfirm, useToast } from "../components/Dialog.jsx";
import { ApiError, Loading } from "./dashboard.jsx";
import { ImmoHeader, Metric, MetricsGrid } from "./ui.jsx";

const DECISION_REASON_OPTIONS = [
  ["", t("Sélectionnez un motif…")],
  ["insufficient_income", t("Revenu insuffisant")],
  ["income_unverifiable", t("Revenu non vérifiable")],
  ["negative_landlord_reference", t("Référence de locateur négative")],
  ["reference_unreachable", t("Référence injoignable")],
  ["adverse_credit_report", t("Rapport de crédit défavorable")],
  ["credit_consent_refused", t("Consentement de vérification de crédit refusé")],
  ["incomplete_application", t("Dossier incomplet")],
  ["unit_no_longer_available", t("Logement n'est plus disponible")],
  ["other_applicant_selected", t("Autre candidat retenu")],
  ["withdrawn_by_applicant", t("Candidature retirée par le candidat")],
];

const FEEDBACK_OPTIONS = [
  ["", t("Sélectionnez…")],
  ["positive", t("Positif")],
  ["neutral", t("Neutre")],
  ["negative", t("Négatif")],
  ["no_comment", t("Sans commentaire")],
];

const STATUS_META = {
  sent: { label: t("Envoyé"), tone: "neutral" },
  opened: { label: t("Ouvert"), tone: "neutral" },
  draft: { label: t("Brouillon"), tone: "neutral" },
  submitted: { label: t("Soumis"), tone: "warning" },
  under_review: { label: t("En vérification"), tone: "warning" },
  accepted: { label: t("Accepté"), tone: "success" },
  rejected: { label: t("Refusé"), tone: "danger" },
  withdrawn: { label: t("Retiré"), tone: "neutral" },
  expired: { label: t("Expiré"), tone: "neutral" },
  purged: { label: t("Purgé"), tone: "neutral" },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "—", tone: "neutral" };
}

function candidateName(record) {
  return [record?.firstName, record?.lastName].filter(Boolean).join(" ").trim() ||
    record?.email || record?.phone || t("Candidat sans nom");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function loadPrescreeningModule() {
  const [list, properties, units, currenciesRaw, setting] = await Promise.all([
    api.prescreenings().catch(() => []),
    api.properties().catch(() => []),
    api.units().catch(() => []),
    api.currencies().catch(() => []),
    api.setting().catch(() => null),
  ]);
  return {
    list: Array.isArray(list) ? list : [],
    properties: Array.isArray(properties) ? properties : [],
    units: Array.isArray(units) ? units : [],
    currency: normalizeCurrencyModule(currenciesRaw, setting),
  };
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`domus-onboarding-badge ${meta.tone === "neutral" ? "" : meta.tone}`}>{meta.label}</span>;
}

function propertyLabel(record, properties, units) {
  const unit = record?.unitId ? units.find((u) => String(u.id) === String(record.unitId)) : null;
  const property = record?.propertyId ? properties.find((p) => String(p.id) === String(record.propertyId)) : null;
  return [property?.name, unit?.name || unit?.label].filter(Boolean).join(" · ") || t("Non précisé");
}

function rentToIncomeLabel(record, currencySymbol) {
  const ratio = record?.rentToIncomeRatio;
  if (ratio == null || ratio === "") return "—";
  return `${Number(ratio).toFixed(0)} %${currencySymbol ? ` (${currencySymbol})` : ""}`;
}

// ── Liste ──
function PrescreeningListCard({ record, properties, units, active, onClick }) {
  const meta = statusMeta(record.status);
  return (
    <button type="button" className={`card domus-prescreening-row${active ? " active" : ""}`} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <strong>{candidateName(record)}</strong>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{propertyLabel(record, properties, units)}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 8, display: "flex", gap: 12 }}>
        <span>{t("Ratio loyer/revenu")} : {rentToIncomeLabel(record)}</span>
      </div>
    </button>
  );
}

// ── Fiche détail ──
function ConsentBadge({ consents, consentType, label }) {
  const c = (consents || []).find((row) => row.consentType === consentType);
  if (!c) return <span className="domus-onboarding-badge">{label} : {t("Non renseigné")}</span>;
  if (!c.granted) return <span className="domus-onboarding-badge danger">{label} : {t("Non consenti")}</span>;
  return <span className="domus-onboarding-badge success">{label} : {tf(t("Consenti le {date}"), { date: formatDate(c.grantedAt) })}</span>;
}

function ReferenceRow({ reference, onContact, busy }) {
  const [outcome, setOutcome] = useState(reference.feedbackOutcome || "");
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div>
          <strong>{reference.landlordName || t("Locateur sans nom")}</strong>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>{reference.propertyAddress || "—"}</p>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 12 }}>
            {reference.landlordPhone || "—"} · {reference.landlordEmail || "—"}
          </p>
        </div>
        <span className="domus-onboarding-badge">{t("Statut")} : {reference.contactStatus || "not_contacted"}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          {FEEDBACK_OPTIONS.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
        </select>
        <button
          type="button"
          className="immo-btn"
          disabled={busy}
          onClick={() => onContact(reference.id, { contactStatus: "contacted", feedbackOutcome: outcome || null })}
        >
          {t("Marquer contacté")}
        </button>
      </div>
    </div>
  );
}

function DecisionPanel({ record, onDecide, busy }) {
  const [decision, setDecision] = useState(record.decision || "");
  const [reasonCode, setReasonCode] = useState(record.decisionReasonCode || "");
  const [note, setNote] = useState(record.decisionNote || "");

  const submit = () => {
    if (!decision) return;
    if (decision === "rejected" && !reasonCode) return;
    onDecide({ decision, decisionReasonCode: reasonCode || null, decisionNote: note || null });
  };

  return (
    <section className="card domus-prescreening-decision">
      <h3><ScrollText size={16} /> {t("Décision")}</h3>
      <div className="domus-alert-banner">
        <AlertTriangle size={16} />
        <span>
          {t("Un refus fondé sur la situation familiale, la grossesse ou l'origine est illégal au Québec (Charte des droits et libertés de la personne, art. 10 ; art. 1899 du Code civil du Québec). Le motif retenu doit obligatoirement provenir de la liste ci-dessous.")}
        </span>
      </div>
      <div className="domus-property-form-grid">
        <label className="domus-property-field">
          <span>{t("Décision")}</span>
          <select value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">{t("Sélectionnez…")}</option>
            <option value="accepted">{t("Accepté")}</option>
            <option value="rejected">{t("Refusé")}</option>
          </select>
        </label>
        <label className="domus-property-field">
          <span>{t("Motif")}{decision === "rejected" ? <b> *</b> : null}</span>
          <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
            {DECISION_REASON_OPTIONS.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
          </select>
        </label>
      </div>
      <label className="domus-property-field">
        <span>{t("Note (optionnelle)")}</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button
        type="button"
        className="immo-btn primary"
        disabled={busy || !decision || (decision === "rejected" && !reasonCode)}
        onClick={submit}
      >
        {busy ? t("Enregistrement…") : t("Enregistrer la décision")}
      </button>
    </section>
  );
}

function PrescreeningDetail({ record, properties, units, onBack, onReload }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [contactBusyId, setContactBusyId] = useState(null);

  const decide = async (payload) => {
    setBusy(true);
    try {
      await api.decidePrescreening(record.id, payload);
      await onReload();
      toast.success(t("Décision enregistrée."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const markContacted = async (refId, payload) => {
    setContactBusyId(refId);
    try {
      await api.updatePrescreeningReferenceContact(record.id, refId, payload);
      await onReload();
      toast.success(t("Référence mise à jour."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setContactBusyId(null);
    }
  };

  const convert = async () => {
    if (!(await confirm({
      title: t("Convertir en dossier locataire"),
      message: t("Créer un dossier d'onboarding locataire à partir de cette candidature acceptée ?"),
      confirmLabel: t("Convertir"),
    }))) return;
    setBusy(true);
    try {
      await api.convertPrescreeningToOnboarding(record.id);
      await onReload();
      toast.success(t("Dossier converti en onboarding locataire."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const purge = async () => {
    if (!(await confirm({
      title: t("Purger les données"),
      message: t("Cette action efface les données personnelles sensibles de ce dossier (nom, coordonnées, revenus). Cette action est irréversible côté affichage. Continuer ?"),
      confirmLabel: t("Purger"),
      danger: true,
    }))) return;
    setBusy(true);
    try {
      await api.purgePrescreening(record.id);
      await onReload();
      toast.success(t("Données purgées."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="domus-prescreening-detail">
      <button type="button" className="immo-btn" onClick={onBack}><ChevronLeft size={15} /> {t("Retour à la liste")}</button>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>{candidateName(record)}</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}><Home size={13} /> {propertyLabel(record, properties, units)}</p>
          </div>
          <StatusBadge status={record.status} />
        </div>
        <div className="domus-property-form-grid" style={{ marginTop: 14 }}>
          <div><Phone size={13} /> {record.phone || "—"}</div>
          <div><Mail size={13} /> {record.email || "—"}</div>
          <div>{t("Emménagement souhaité")} : {formatDate(record.desiredMoveInDate)}</div>
          <div>{t("Ratio loyer/revenu")} : {rentToIncomeLabel(record)}</div>
          <div>{t("Statut d'emploi")} : {record.employmentStatus || "—"}</div>
          <div>{t("Revenu mensuel")} : {record.monthlyIncome != null ? money(record.monthlyIncome, "$") : "—"}</div>
        </div>
      </section>

      <section className="card">
        <h3><Lock size={16} /> {t("Consentements")}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ConsentBadge consents={record.consents} consentType="data_processing" label={t("Traitement des données")} />
          <ConsentBadge consents={record.consents} consentType="credit_check" label={t("Crédit")} />
          <ConsentBadge consents={record.consents} consentType="landlord_reference_check" label={t("Vérification de références")} />
          <ConsentBadge consents={record.consents} consentType="employment_verification" label={t("Vérification d'emploi")} />
        </div>
      </section>

      <section className="card">
        <h3><UsersIcon size={16} /> {t("Références de locateurs")}</h3>
        {!record.references?.length ? (
          <p className="muted">{t("Aucune référence fournie.")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {record.references.map((ref) => (
              <ReferenceRow key={ref.id} reference={ref} onContact={markContacted} busy={contactBusyId === ref.id} />
            ))}
          </div>
        )}
      </section>

      <DecisionPanel record={record} onDecide={decide} busy={busy} />

      <section className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {record.decision === "accepted" && !record.onboardingId && (
          <button type="button" className="immo-btn primary" disabled={busy} onClick={convert}>
            <ArrowRightCircle size={15} /> {t("Convertir en dossier locataire")}
          </button>
        )}
        {record.onboardingId && (
          <span className="domus-onboarding-badge success">{t("Déjà converti en onboarding locataire")}</span>
        )}
        {record.status !== "purged" && (
          <button type="button" className="immo-btn domus-btn-danger" disabled={busy} onClick={purge}>
            <Trash2 size={15} /> {t("Purger les données")}
          </button>
        )}
      </section>
    </div>
  );
}

export function Prescreening({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadPrescreeningModule, []);
  useRealtimeReload(reload, ["prescreenings"]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const list = data?.list || [];
  const properties = data?.properties || [];
  const units = data?.units || [];

  const stats = useMemo(() => {
    const submitted = list.filter((r) => r.status === "submitted" || r.status === "under_review").length;
    const accepted = list.filter((r) => r.status === "accepted").length;
    const rejected = list.filter((r) => r.status === "rejected").length;
    return { total: list.length, submitted, accepted, rejected };
  }, [list]);

  // Détail (consents/references) chargé à part : la liste n'a que le résumé.
  const loadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const record = await api.prescreening(id);
      setDetail(record);
    } finally {
      setDetailLoading(false);
    }
  };
  const openDetail = (record) => { setSelectedId(record.id); loadDetail(record.id); };
  const reloadDetail = async () => {
    await reload();
    if (selectedId) await loadDetail(selectedId);
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  if (selectedId) {
    if (detailLoading && !detail) return <Loading />;
    if (!detail) return <ApiError error={new Error(t("Impossible de charger le dossier."))} />;
    return (
      <PrescreeningDetail
        record={detail}
        properties={properties}
        units={units}
        onBack={() => { setSelectedId(null); setDetail(null); }}
        onReload={reloadDetail}
      />
    );
  }

  return (
    <>
      <ImmoHeader
        title={t("Enquête de prélocation")}
        subtitle={t("Suivez les candidatures reçues, vérifiez les références et statuez sur chaque dossier.")}
      />
      <MetricsGrid>
        <Metric icon={<ShieldCheck size={18} />} label={t("Dossiers")} value={stats.total} tone="brand" />
        <Metric icon={<Clock size={18} />} label={t("À examiner")} value={stats.submitted} tone="amber" />
        <Metric icon={<CheckCircle2 size={18} />} label={t("Acceptés")} value={stats.accepted} tone="green" />
        <Metric icon={<XCircle size={18} />} label={t("Refusés")} value={stats.rejected} tone="red" />
      </MetricsGrid>

      {list.length === 0 ? (
        <div className="domus-empty">
          <ShieldCheck size={28} />
          <p>{t("Aucune candidature reçue pour le moment.")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {list.map((record) => (
            <PrescreeningListCard
              key={record.id}
              record={record}
              properties={properties}
              units={units}
              active={false}
              onClick={() => openDetail(record)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default Prescreening;
