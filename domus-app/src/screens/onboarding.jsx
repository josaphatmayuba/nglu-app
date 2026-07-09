// Écran interne « Onboarding locataire » (SCRUM-246) — parcours d'admission d'un
// futur locataire : génération d'un lien sécurisé, suivi des dossiers en ligne,
// validation (crée le locataire + prépare le bail). Réutilise l'API et les
// composants d'onboarding déjà éprouvés dans l'écran Locataires — aucune
// logique dupliquée. La « validation » d'un dossier ouvre la fiche locataire
// pré-remplie ; comme cette modale vit dans l'écran Locataires, on y renvoie via
// la navigation (même principe que les raccourcis du tableau de bord).
import { useMemo, useState } from "react";
import {
  Link2, Link, User, FileText, ShieldCheck, CheckCircle2, Info, UserPlus,
  LayoutGrid, Rows3, List, ExternalLink, Copy,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { useDateRange } from "../dateRange.jsx";
import { useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import {
  OnboardingCard, OnboardingLinkModal, isPendingOnboarding, onboardingUrl,
  onboardingStatusMeta, onboardingDisplayName, parseOnboardingData, formatShortDate,
} from "./locataires.jsx";

const avatarTones = ["iris", "orange", "purple", "emerald", "ink"];
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// Progression du dossier (0→4) dérivée du statut et des champs remplis, faute
// d'un suivi d'étapes dédié côté backend : identité → pièces → garant → validation.
function onboardingProgress(record) {
  if (record.status === "validated") return 4;
  if (record.status === "submitted") return 4;
  const d = parseOnboardingData(record);
  let steps = 0;
  if (d.firstName || d.lastName || d.email || d.phone || record.phone) steps = 1; // Identité
  if (d.idDocumentUrl || d.documents?.length || d.pieces?.length) steps = 2;       // Pièces
  if (d.guarantorName || d.guarantor || d.garant) steps = 3;                       // Garant
  return steps;
}

// Sous-titre « Immeuble · Unité » quand l'info est présente dans le dossier.
function onboardingLocation(record) {
  const d = parseOnboardingData(record);
  const building = d.buildingName || d.propertyName || d.building;
  const unit = d.unitName || d.unitLabel || d.apartment || d.apt;
  return [building, unit].filter(Boolean).join(" · ");
}

async function loadOnboardingModule() {
  const onboarding = await api.onboardingList().catch(() => []);
  return { onboarding: Array.isArray(onboarding) ? onboarding : [] };
}

// Les 4 étapes du parcours (identité → pièces → garant → validation), affichées
// sous le lien comme dans la maquette.
const STEPS = [
  { icon: <User size={16} />, label: t("Identité") },
  { icon: <FileText size={16} />, label: t("Pièces") },
  { icon: <ShieldCheck size={16} />, label: t("Garant") },
  { icon: <CheckCircle2 size={16} />, label: t("Validation") },
];

const VIEW_MODES = [
  { id: "cards", icon: <LayoutGrid size={15} />, label: t("Cartes") },
  { id: "grid", icon: <Rows3 size={15} />, label: t("Grille détaillée") },
  { id: "list", icon: <List size={15} />, label: t("Liste") },
];

// Barre de progression 4 segments (maquette).
function ProgressBar({ steps }) {
  return (
    <div className="domus-onboarding-progress">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < steps ? "done" : ""} />
      ))}
    </div>
  );
}

// Carte compacte (vue par défaut, comme la maquette) : avatar, localisation,
// barre de progression, bouton « Valider le dossier » si prêt.
function OnboardingSummaryCard({ record, index, onCopy, onOpen, onValidate }) {
  const name = onboardingDisplayName(record);
  const status = onboardingStatusMeta[record.status] || onboardingStatusMeta.sent;
  const tone = avatarTones[index % avatarTones.length];
  const steps = onboardingProgress(record);
  const location = onboardingLocation(record);
  const ready = record.status === "submitted";
  return (
    <article className={`domus-onboarding-summary${ready ? " ready" : ""}`}>
      <div className="domus-onboarding-summary-head">
        <div className={`tenant-avatar ${tone}`}>{initials(name)}</div>
        <div className="domus-onboarding-summary-id">
          <h3>{name}</h3>
          <p>{location || t("Localisation non renseignée")}</p>
        </div>
        <span className={`domus-onboarding-badge ${status.className}`}>{status.label}</span>
      </div>
      <ProgressBar steps={steps} />
      {ready ? (
        <button type="button" className="domus-onboarding-validate" onClick={() => onValidate(record)}>
          <CheckCircle2 size={16} /> {t("Valider le dossier")}
        </button>
      ) : (
        <div className="domus-onboarding-summary-foot">
          <span className="muted">{status.label}</span>
          <div className="domus-onboarding-summary-quick">
            <button type="button" title={t("Copier")} onClick={() => onCopy(record)}><Copy size={14} /></button>
            <button type="button" title={t("Ouvrir")} onClick={() => onOpen(record)}><ExternalLink size={14} /></button>
          </div>
        </div>
      )}
    </article>
  );
}

// Ligne de tableau (vue liste).
function OnboardingListRow({ record, index, onCopy, onOpen, onValidate }) {
  const name = onboardingDisplayName(record);
  const status = onboardingStatusMeta[record.status] || onboardingStatusMeta.sent;
  const tone = avatarTones[index % avatarTones.length];
  const steps = onboardingProgress(record);
  return (
    <tr>
      <td>
        <div className="domus-onboarding-list-name">
          <div className={`tenant-avatar sm ${tone}`}>{initials(name)}</div>
          <div>
            <strong>{name}</strong>
            <small>{onboardingLocation(record) || "—"}</small>
          </div>
        </div>
      </td>
      <td><span className={`domus-onboarding-badge ${status.className}`}>{status.label}</span></td>
      <td><ProgressBar steps={steps} /></td>
      <td>{formatShortDate(record.expiresAt)}</td>
      <td className="domus-onboarding-list-actions">
        <button type="button" title={t("Copier")} onClick={() => onCopy(record)}><Copy size={14} /></button>
        <button type="button" title={t("Ouvrir")} onClick={() => onOpen(record)}><ExternalLink size={14} /></button>
        {record.status === "submitted" && (
          <button type="button" className="primary" onClick={() => onValidate(record)}>
            <CheckCircle2 size={14} /> {t("Valider")}
          </button>
        )}
      </td>
    </tr>
  );
}

export function Onboarding({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadOnboardingModule, []);
  useRealtimeReload(reload, ["onboarding", "tenants"]);
  const dateRange = useDateRange();

  const onboarding = useMemo(() => {
    const list = Array.isArray(data?.onboarding) ? data.onboarding : [];
    if (!dateRange.active) return list;
    return list.filter((o) => dateRange.inRange(o.createdAt || o.submittedAt || o.updatedAt));
  }, [data?.onboarding, dateRange]);

  const [linkModal, setLinkModal] = useState(null);
  const [refreshOnLinkClose, setRefreshOnLinkClose] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [viewMode, setViewMode] = useState("cards");

  // Dossiers encore « en ligne » (ni validés, ni expirés).
  const pending = useMemo(() => onboarding.filter(isPendingOnboarding), [onboarding]);

  // Statistiques du panneau latéral (maquette : envoyé / en cours / à valider / validés ce mois).
  const stats = useMemo(() => {
    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const sent = onboarding.filter((o) => o.smsSentAt || o.emailSentAt).length;
    const inProgress = pending.filter((o) => o.status !== "submitted").length;
    const toValidate = pending.filter((o) => o.status === "submitted").length;
    const validatedThisMonth = onboarding.filter(
      (o) => o.status === "validated" && o.validatedAt && new Date(o.validatedAt).getTime() >= startOfMonth.getTime() && new Date(o.validatedAt).getTime() <= now,
    ).length;
    return { sent, inProgress, toValidate, validatedThisMonth };
  }, [onboarding, pending]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  const openLinkModal = () => {
    setRefreshOnLinkClose(false);
    setLinkModal({ phone: "", firstName: "", lastName: "", email: "" });
  };
  const closeLinkModal = () => {
    setLinkModal(null);
    if (refreshOnLinkClose) { setRefreshOnLinkClose(false); reload(); }
  };

  const copyText = async (value) => { if (value) await navigator.clipboard?.writeText(value); };
  const openLink = (value) => { if (value) window.open(value, "_blank", "noopener,noreferrer"); };
  const resendSms = async (record) => {
    setSendingId(`${record.id}:sms`);
    try { await api.sendOnboardingSms(record.id); await reload(); window.alert("SMS envoye."); }
    catch (e) { window.alert(e.message || String(e)); }
    finally { setSendingId(null); }
  };
  const resendEmail = async (record) => {
    setSendingId(`${record.id}:email`);
    try { await api.sendOnboardingEmail(record.id); await reload(); window.alert("Email envoye."); }
    catch (e) { window.alert(e.message || String(e)); }
    finally { setSendingId(null); }
  };
  const deleteOnboarding = async (record) => {
    if (!window.confirm("Supprimer ce dossier d'inscription ?")) return;
    await api.deleteOnboarding(record.id); await reload();
  };
  // La validation crée le locataire via la fiche pré-remplie, qui vit dans
  // l'écran Locataires : on y renvoie (le gestionnaire clique « Valider » là-bas).
  const goValidate = () => go?.("locataires");

  return (
    <>
      <div className="immo-header">
        <div>
          <p className="immo-eyebrow">{t("Entrée d'un locataire")}</p>
          <h1>{t("Onboarding locataire")}</h1>
          <p>{t("Invitez un futur locataire à compléter son dossier, puis validez-le pour créer sa fiche.")}</p>
        </div>
        <div className="immo-header-actions">
          <button className="immo-btn primary" onClick={openLinkModal}>
            <Link size={16} /> {t("Générer un lien")}
          </button>
        </div>
      </div>

      <div className="domus-onboarding-top">
        {/* Bloc lien sécurisé + étapes du parcours */}
        <section className="card domus-onboarding-invite">
          <h3><Link2 size={16} /> {t("Lien d'onboarding sécurisé")}</h3>
          <p className="muted">
            {t("Le candidat remplit ses informations et téléverse ses pièces. À réception, vous validez le dossier — le locataire et son bail sont créés.")}
          </p>
          <div className="domus-onboarding-steps">
            {STEPS.map((s) => (
              <div key={s.label} className="domus-onboarding-step">
                <span>{s.icon}</span>{s.label}
              </div>
            ))}
          </div>
          <div className="domus-onboarding-invite-actions">
            <button className="immo-btn primary" onClick={openLinkModal}>
              <Link size={16} /> {t("Générer un lien")}
            </button>
            <span className="muted">{tf("{n} dossier(s) en ligne", { n: pending.length })}</span>
          </div>
        </section>

        {/* Statistiques */}
        <section className="card domus-onboarding-stats">
          <h3><Info size={16} /> {t("Statistiques")}</h3>
          <ul>
            <li><span>{t("Lien envoyé")}</span><strong>{stats.sent}</strong></li>
            <li><span>{t("En cours")}</span><strong>{stats.inProgress}</strong></li>
            <li><span>{t("À valider")}</span><strong className="amber">{stats.toValidate}</strong></li>
            <li><span>{t("Validés ce mois")}</span><strong className="green">{stats.validatedThisMonth}</strong></li>
          </ul>
        </section>
      </div>

      <div className="domus-onboarding-section-head">
        <h3 className="domus-onboarding-section-title">{t("Dossiers en cours")}</h3>
        {pending.length > 0 && (
          <div className="domus-view-switch" role="group" aria-label={t("Vue")}>
            {VIEW_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={viewMode === v.id ? "active" : ""}
                onClick={() => setViewMode(v.id)}
                title={v.label}
              >
                {v.icon}<span>{v.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {pending.length === 0 ? (
        <div className="domus-empty">
          <UserPlus size={28} />
          <p>{t("Aucun dossier en cours.")}</p>
          <button className="immo-btn primary" onClick={openLinkModal}>
            <Link size={16} /> {t("Générer un lien")}
          </button>
        </div>
      ) : viewMode === "cards" ? (
        <div className="domus-onboarding-summary-grid">
          {pending.map((record, index) => (
            <OnboardingSummaryCard
              key={`onboarding-${record.id}`}
              record={record}
              index={index}
              onCopy={() => copyText(onboardingUrl(record))}
              onOpen={() => openLink(onboardingUrl(record))}
              onValidate={goValidate}
            />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="card domus-onboarding-list-wrap">
          <table className="domus-onboarding-list">
            <thead>
              <tr>
                <th>{t("Candidat")}</th>
                <th>{t("Statut")}</th>
                <th>{t("Progression")}</th>
                <th>{t("Expire")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((record, index) => (
                <OnboardingListRow
                  key={`onboarding-${record.id}`}
                  record={record}
                  index={index}
                  onCopy={() => copyText(onboardingUrl(record))}
                  onOpen={() => openLink(onboardingUrl(record))}
                  onValidate={goValidate}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="domus-onboarding-strip">
          {pending.map((record, index) => (
            <OnboardingCard
              key={`onboarding-${record.id}`}
              record={record}
              index={index}
              sendingId={sendingId}
              onEdit={goValidate}
              onValidate={goValidate}
              onDelete={deleteOnboarding}
              onCopy={() => copyText(onboardingUrl(record))}
              onOpen={() => openLink(onboardingUrl(record))}
              onResendSms={resendSms}
              onResendEmail={resendEmail}
            />
          ))}
        </div>
      )}

      {linkModal && (
        <OnboardingLinkModal
          value={linkModal}
          onClose={closeLinkModal}
          onGenerated={() => setRefreshOnLinkClose(true)}
        />
      )}
    </>
  );
}

export default Onboarding;
