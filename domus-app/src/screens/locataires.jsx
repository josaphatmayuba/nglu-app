import { useEffect, useMemo, useState } from "react";
import {
  Phone, Search, UserPlus, Mail, Briefcase, Home, AlertTriangle, CheckCircle2,
  Users, Clock, User, Building2, MapPin, IdCard, Info, UserRound, Copy,
  ExternalLink, FileClock, MessageSquare, Pencil, Trash2, Plus, X, Wallet, FileSignature, Link2, RotateCw,
} from "lucide-react";
import { api, domusOnboardingUrl, domusPortalUrl } from "../api.js";
import { t, tf } from "../i18n.js";
import { filterTenants, useDateRange } from "../dateRange.jsx";
import { normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { tenantBadge, tenantLeaseInfo } from "./tenantBadge.js";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Modal, FormSection, DomusPropertyField, DomusPropertySelect, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { useConfirm, useToast } from "../components/Dialog.jsx";
import { ProofButton } from "../components/ProofModal.jsx";
import { setLeasePrefill } from "./reservationPrefill.js";
import { isValidPhoneNumber } from "react-phone-number-input";

const avatarTones = ["iris", "orange", "purple", "emerald", "ink"];
let tenantCurrencyOptions = [];
let tenantDefaultCurrencyId = "";
// Dégradés des avatars de carte locataire (mêmes teintes que le CRM immobilier).
const LETTER_TONES = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];
export const onboardingStatusMeta = {
  sent: { label: "Non rempli", className: "warning" },
  draft: { label: "En remplissage", className: "warning" },
  submitted: { label: "Soumis", className: "success" },
  validated: { label: "Valide", className: "success" },
  expired: { label: "Expire", className: "danger" },
};

const MARRIED_STATES = ["married", "common_law"];
// État civil : on stocke un CODE neutre en base (i18n-ready) et on affiche le libellé traduit.
// Voir migration 0207. Les libellés FR sont les CLÉS i18n (t(label) traduit en EN).
const MARITAL_LABELS = {
  single: "Célibataire",
  married: "Marié(e)",
  common_law: "Conjoint de fait",
  divorced: "Divorcé(e)",
  widowed: "Veuf / Veuve",
};
// Anciennes valeurs FR/EN libres → code canonique (filet pour les fiches non migrées).
const MARITAL_LEGACY_TO_CODE = {
  "célibataire": "single", "celibataire": "single", "single": "single",
  "marié": "married", "marie": "married", "married": "married",
  "conjoint de fait": "common_law", "union libre": "common_law", "common_law": "common_law",
  "divorcé": "divorced", "divorce": "divorced", "divorced": "divorced",
  "veuf": "widowed", "veuve": "widowed", "widowed": "widowed",
};
function normalizeMaritalStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  return MARITAL_LEGACY_TO_CODE[key] || status;
}
function labelForMarital(status) {
  const code = normalizeMaritalStatus(status);
  return MARITAL_LABELS[code] || status || "";
}

function tenantName(t) {
  const n = [t.firstName, t.lastName].filter(Boolean).join(" ").trim();
  return n || t.entityName || t.username || `Locataire #${t.id}`;
}
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}
function isActive(t) {
  return t.status === "true" || t.status === true || t.status == null;
}
function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
export function parseOnboardingData(record) {
  if (!record?.data) return {};
  if (typeof record.data === "object") return record.data;
  try {
    return JSON.parse(record.data);
  } catch {
    return {};
  }
}
export function isPendingOnboarding(record, now = Date.now()) {
  if (!record || record.status === "validated") return false;
  if (record.status !== "submitted" && record.expiresAt) {
    const expiry = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry < now) return false;
  }
  return true;
}
// Statut EFFECTIF d'un dossier : un record "sent"/"draft" dont expiresAt est
// depasse est en realite "expired" (le backend ne repasse pas toujours le flag).
export function effectiveOnboardingStatus(record, now = Date.now()) {
  if (!record) return "sent";
  if (record.status === "validated") return "validated";
  if (record.status === "submitted") return "submitted";
  if (record.expiresAt) {
    const expiry = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry < now) return "expired";
  }
  return record.status || "sent";
}
export function onboardingUrl(record) {
  // Le backend renvoie le lien CRM ; on le réécrit vers la page publique Domus.
  return domusOnboardingUrl(record?.url || record?.onboardingUrl || "");
}
export function onboardingDisplayName(record) {
  const data = parseOnboardingData(record);
  return [data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
    data.email || data.phone || record?.phone || "Dossier locataire";
}
export function formatShortDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleDateString("fr-CA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function loadTenantsModule() {
  const [tenants, onboarding, leases, units, currencies, setting] = await Promise.all([
    api.tenants(),
    api.onboardingList().catch(() => []),
    api.leases().catch(() => []),
    api.units().catch(() => []),
    api.currencies().catch(() => []),
    api.setting().catch(() => null),
  ]);
  return { tenants, onboarding, leases, units, currencies, setting };
}

function unitKindIcon(kind) {
  const k = String(kind || "").toLowerCase();
  if (/(house|villa|maison|residence)/.test(k)) return <Home size={15} />;
  return <Building2 size={15} />;
}

function leaseDueLabel(activeLease) {
  // En retard : afficher la 1ere echeance impayee (overdueDueDate), pas
  // nextInvoiceDate qui peut deja pointer sur une echeance future (avance par
  // total paye, sans rapprochement mois par mois cote backend).
  const dateStr = activeLease?.isOverdue && activeLease?.overdueDueDate
    ? activeLease.overdueDueDate
    : activeLease?.nextInvoiceDate;
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function leaseRentLabel(activeLease, activeUnit) {
  const amount = activeLease?.rentAmount ?? activeUnit?.monthlyRent;
  if (amount == null || amount === "") return "—";
  const sym = activeLease?.currencySymbol || "";
  return `${sym} ${Number(amount).toLocaleString("fr-FR")}`.trim();
}

function DomusTenantMoneyField({ label, value, currencyId, onAmountChange, onCurrencyChange }) {
  const options = tenantCurrencyOptions.length
    ? tenantCurrencyOptions
    : [{ value: tenantDefaultCurrencyId || "", label: "CDF", symbol: "CDF" }];
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <div className="domus-money-input">
        <input type="number" min="0" step="0.01" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} placeholder="Optionnel" />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)} aria-label="Devise">
          {options.map((option) => (
            <option key={option.value || option.symbol || option.label} value={option.value}>{option.symbol || option.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function Locataires({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadTenantsModule, []);
  const confirm = useConfirm();
  const toast = useToast();
  useRealtimeReload(reload, ["tenants", "onboarding", "leases", "units"]);
  const dateRange = useDateRange();
  const tenants = useMemo(
    () => filterTenants(Array.isArray(data?.tenants) ? data.tenants : [], dateRange),
    [data?.tenants, dateRange],
  );
  const onboarding = useMemo(() => {
    const list = Array.isArray(data?.onboarding) ? data.onboarding : [];
    if (!dateRange.active) return list;
    return list.filter((o) => dateRange.inRange(o.createdAt || o.submittedAt || o.updatedAt));
  }, [data?.onboarding, dateRange]);
  const leases = useMemo(() => (Array.isArray(data?.leases) ? data.leases : []), [data?.leases]);
  const units = useMemo(() => (Array.isArray(data?.units) ? data.units : []), [data?.units]);
  const currency = useMemo(() => normalizeCurrencyModule(data?.currencies, data?.setting), [data]);
  tenantCurrencyOptions = currency.currencyOptions;
  tenantDefaultCurrencyId = currency.defaultCurrencyId;

  const [query, setQuery] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState("online"); // online|expired|validated|all
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [linkModal, setLinkModal] = useState(null);
  const [refreshOnLinkClose, setRefreshOnLinkClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [sendingId, setSendingId] = useState(null); // `${record.id}:sms|email` pendant l'envoi

  const view = useMemo(
    () => tenants.map((t) => ({ ...t, _name: tenantName(t), _initials: initials(tenantName(t)) })),
    [tenants],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return view;
    return view.filter((t) => [t._name, t.phone, t.email, t.address, t.entityName, t.mainActivity]
      .some((v) => String(v || "").toLowerCase().includes(q)));
  }, [view, query]);

  // Dossiers d'onboarding encore "en ligne" (ni validés, ni expirés) : sert au KPI,
  // sinon le compteur affiche 4 alors qu'on ne voit que 3 dossiers en attente.
  const pendingOnboarding = useMemo(() => onboarding.filter(isPendingOnboarding), [onboarding]);

  // Cartes affichees : filtrees par le menu Statut (en ligne / expire / valide / tous),
  // puis par la recherche texte.
  const filteredOnboarding = useMemo(() => {
    const q = normalize(query);
    return onboarding.filter((record) => {
      const eff = effectiveOnboardingStatus(record);
      if (onboardingStatus === "online" && !isPendingOnboarding(record)) return false;
      if (onboardingStatus === "expired" && eff !== "expired") return false;
      if (onboardingStatus === "validated" && eff !== "validated") return false;
      if (!q) return true;
      const d = parseOnboardingData(record);
      return [d.firstName, d.lastName, d.email, d.phone, record.phone, record.status]
        .some((v) => normalize(v).includes(q));
    });
  }, [onboarding, onboardingStatus, query]);

  const activeCount = view.filter(isActive).length;
  const occupants = view.reduce((s, t) => s + Number(t.occupantNumber || 0), 0);
  const salaried = view.filter((t) => /salar|fonction/i.test(String(t.professionalStatus || ""))).length;

  // Bloquer uniquement au PREMIER chargement (data absente). Un reload en
  // arriere-plan (event realtime "onboarding created" apres generation du lien)
  // ne doit pas remonter la page : sinon la modale OnboardingLinkModal est
  // demontee et revient vide -> l'utilisateur croit que le formulaire "se rouvre".
  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  const copyText = async (value) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
  };
  const openLink = (value) => {
    if (!value) return;
    window.open(value, "_blank", "noopener,noreferrer");
  };
  const resendSms = async (record) => {
    setActionError("");
    setSendingId(`${record.id}:sms`);
    try {
      await api.sendOnboardingSms(record.id);
      await reload();
      toast.success(t("SMS envoyé."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setSendingId(null);
    }
  };
  const resendEmail = async (record) => {
    setActionError("");
    setSendingId(`${record.id}:email`);
    try {
      await api.sendOnboardingEmail(record.id);
      await reload();
      toast.success(t("Email envoyé."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setSendingId(null);
    }
  };
  const deleteOnboarding = async (record) => {
    if (!(await confirm({
      title: t("Supprimer le dossier"),
      message: t("Supprimer ce dossier d'inscription ?"),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    await api.deleteOnboarding(record.id);
    await reload();
  };
  // « Valider » n'engage plus en un clic : on ouvre la fiche pré-remplie pour
  // que le gestionnaire revoie/corrige les données avant de créer le locataire.
  const validateOnboarding = (record) => {
    setActionError("");
    const d = parseOnboardingData(record);
    setModal({ ...emptyTenant, ...d, phone: d.phone || record.phone || "", _onboardingId: record.id, _validating: true });
  };
  const openLinkModal = () => {
    setRefreshOnLinkClose(false);
    setLinkModal({ phone: "", firstName: "", lastName: "", email: "" });
  };
  const closeLinkModal = () => {
    setLinkModal(null);
    if (refreshOnLinkClose) {
      setRefreshOnLinkClose(false);
      reload();
    }
  };
  const handleDeleteTenant = async (tenant) => {
    const hasActiveLease = leases.some((l) => String(l.tenantId) === String(tenant.id) && l.status === "active");
    if (hasActiveLease) {
      toast.error(t("Impossible : ce locataire a un bail actif. Résiliez d'abord le bail."));
      return;
    }
    if (!(await confirm({
      title: t("Supprimer le locataire"),
      message: tf(t("Supprimer le locataire « {name} » ?"), { name: tenant._name }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    try {
      await api.deleteTenant(tenant.id);
      setSelectedId(null);
      await reload();
    } catch (e) {
      toast.error(e.message || String(e));
    }
  };

  const selected = selectedId != null ? view.find((t) => t.id === selectedId) || null : null;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Locataires")}</h1>
          <p>Annuaire des locataires, dossiers et soldes</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Nom, telephone, unite...")} />
          </label>
          <select
            className="immo-select"
            value={onboardingStatus}
            onChange={(e) => setOnboardingStatus(e.target.value)}
            title="Filtrer les dossiers d'inscription"
          >
            <option value="online">Dossiers en ligne</option>
            <option value="expired">Dossiers expires</option>
            <option value="validated">Dossiers valides</option>
            <option value="all">Tous les dossiers</option>
          </select>
          <button className="immo-btn" onClick={openLinkModal}>
            <UserRound size={16} /> Lien d'inscription
          </button>
          <button className="immo-btn primary" onClick={() => setModal({ ...emptyTenant })}>
            <UserPlus size={16} /> Nouveau locataire
          </button>
        </div>
      </div>

      <MetricsGrid>
        <Metric tone="brand" icon={<Users size={20} />} label={t("Locataires")} value={view.length} helper={tf("{n} actif(s)", {n: activeCount})} />
        <Metric tone="green" icon={<Home size={20} />} label={t("Occupants au foyer")} value={occupants} helper={t("personnes declarees")} />
        <Metric tone="amber" icon={<Clock size={20} />} label={t("Onboarding")} value={pendingOnboarding.length}
          valueColor={pendingOnboarding.length > 0 ? "#d97706" : undefined} helper="dossiers en ligne" />
        <Metric tone="brand" icon={<Briefcase size={20} />} label={t("Salaries / fonction.")} value={salaried} helper={t("revenu stable declare")} />
      </MetricsGrid>

      {filteredOnboarding.length === 0 && onboardingStatus !== "online" && (
        <p className="muted" style={{ margin: "0 0 20px", fontSize: 13.5 }}>
          Aucun dossier {onboardingStatus === "expired" ? "expire" : onboardingStatus === "validated" ? "valide" : ""} a afficher.
        </p>
      )}
      {filteredOnboarding.length > 0 && (
        <div className="domus-onboarding-strip">
          {filteredOnboarding.map((record, index) => (
            <OnboardingCard
              key={`onboarding-${record.id}`}
              record={record}
              index={index}
              sendingId={sendingId}
              onEdit={(r) => {
                const d = parseOnboardingData(r);
                setModal({ ...emptyTenant, ...d, phone: d.phone || r.phone || "", _onboardingId: r.id });
              }}
              onValidate={validateOnboarding}
              onDelete={deleteOnboarding}
              onCopy={() => copyText(onboardingUrl(record))}
              onOpen={() => openLink(onboardingUrl(record))}
              onResendSms={resendSms}
              onResendEmail={resendEmail}
            />
          ))}
        </div>
      )}

      {view.length === 0 ? (
        <div className="immo-empty">
          <Users size={28} />
          <h3>{t("Aucun locataire")}</h3>
          <p>Cliquez « Nouveau locataire » pour creer le premier dossier.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="immo-empty">
          <Search size={26} />
          <h3>{t("Aucun resultat")}</h3>
          <p>Aucun locataire ne correspond a « {query} ».</p>
        </div>
      ) : (
        <div className="immo-tenant-grid">
          {filtered.map((tenant, index) => {
            const { tenantLeases, activeLease, activeUnit } = tenantLeaseInfo(tenant, leases, units);
            const badge = tenantBadge(tenant, tenantLeases, activeLease);
            const isLate = activeLease?.isOverdue || activeLease?.status === "late";
            return (
              <button
                type="button"
                key={tenant.id}
                className={`immo-tenant-card is-clickable ${isLate ? "late" : ""} ${selectedId === tenant.id ? "active" : ""}`}
                onClick={() => setSelectedId(tenant.id)}
              >
                <div className={`immo-letter-avatar ${LETTER_TONES[index % LETTER_TONES.length]}`}>{tenant._initials}</div>
                <div className="immo-tenant-main">
                  <h3>{tenant._name}</h3>
                  <p>{tenant.email || "email non renseigne"}</p>
                  <p>{tenant.phone || "telephone non renseigne"}</p>
                  <span className={`immo-mini-badge ${badge.tone}`}>{badge.label}</span>
                </div>
                <div className="immo-tenant-divider" />
                <div className="immo-tenant-lease">
                  <p>{unitKindIcon(activeUnit?.unitKind)} {activeLease?.propertyName || activeUnit?.name || activeUnit?.code || "—"}</p>
                  <div>
                    <span className={isLate ? "danger" : ""}>Loyer · echeance {leaseDueLabel(activeLease)}</span>
                    <strong className={isLate ? "danger" : ""}>{leaseRentLabel(activeLease, activeUnit)}</strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <TenantDetailDrawer
          tenant={selected}
          currency={currency}
          leaseInfo={tenantLeaseInfo(selected, leases, units)}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setActionError(""); setModal(tenantToForm(selected)); }}
          onDelete={() => handleDeleteTenant(selected)}
          onCreateLease={go ? () => { setLeasePrefill(null, null, selected.id); go("baux"); } : undefined}
        />
      )}

      {modal && (
        <TenantModal
          value={modal}
          busy={saving}
          error={actionError}
          onClose={() => { setModal(null); setActionError(""); }}
          onSave={async (form) => {
            setSaving(true);
            setActionError("");
            try {
              let saved;
              if (form._onboardingId) {
                // On persiste d'abord les corrections du gestionnaire dans le
                // dossier, puis on valide (qui crée le locataire depuis ce dossier).
                await api.updateOnboarding(form._onboardingId, tenantPayload(form));
                saved = await api.validateOnboarding(form._onboardingId);
              } else if (form.id) {
                saved = await api.updateTenant(form.id, tenantPayload(form));
              } else {
                saved = await api.createTenant(tenantPayload(form));
              }
              // Après validation, l'id du locataire créé est dans saved.customer ;
              // sinon (create/update tenant) c'est saved.id / form.id.
              const tenantId = (form._onboardingId ? saved?.customer?.id : saved?.id) || form.id;
              if (form._idFile && tenantId) {
                await api.uploadTenantIdDocument(tenantId, form._idFile);
              }
              setModal(null);
              await reload();
              if (tenantId) setSelectedId(tenantId);
            } catch (e) {
              setActionError(e.message || String(e));
            } finally {
              setSaving(false);
            }
          }}
        />
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

function Info2({ icon: Icon, label, value }) {
  return (
    <div className="info-cell">
      <Icon size={15} />
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

// ── Tiroir « détail locataire » (s'ouvre à droite au clic sur une carte) ──
function TenantDetailDrawer({ tenant, currency, leaseInfo, onClose, onEdit, onDelete, onCreateLease }) {
  const toast = useToast();
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Charge le lien portail existant à l'ouverture de la fiche : avant, il
  // fallait cliquer sur "Générer" pour simplement le relire. Le GET ne crée
  // aucun lien (url null si le locataire n'en a jamais eu).
  useEffect(() => {
    let cancelled = false;
    setPortalUrl("");
    if (!tenant?.id) return undefined;
    api.tenantPortalLink(tenant.id)
      .then((res) => { if (!cancelled && res?.url) setPortalUrl(domusPortalUrl(res.url)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tenant?.id]);

  // Demandes de modification soumises par CE locataire depuis son portail.
  const [changeReqs, setChangeReqs] = useState([]);
  const [reqBusy, setReqBusy] = useState(false);
  const reloadChangeReqs = async () => {
    if (!tenant?.id) return;
    try {
      const all = await api.tenantChangeRequests("pending");
      setChangeReqs((all || []).filter((r) => String(r.tenantId) === String(tenant.id)));
    } catch { /* non bloquant : la fiche reste utilisable */ }
  };
  useEffect(() => { setChangeReqs([]); reloadChangeReqs(); }, [tenant?.id]);

  const reviewChangeReq = async (id, approve) => {
    setReqBusy(true);
    try {
      if (approve) await api.approveTenantChangeRequest(id);
      else await api.rejectTenantChangeRequest(id);
      toast.success(approve ? t("Modification appliquee.") : t("Demande refusee."));
      await reloadChangeReqs();
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setReqBusy(false);
    }
  };

  const copyPortalLink = async () => {
    try { await navigator.clipboard?.writeText(portalUrl); toast.success(t("Lien portail copié.")); }
    catch { toast.error(t("Copie impossible.")); }
  };

  // Genere le lien portail ET previent le locataire par SMS que son dossier
  // est disponible (meme effet qu'une creation de dossier aujourd'hui).
  const generatePortalLink = async () => {
    setPortalBusy(true);
    try {
      const res = await api.generateTenantPortalLink(tenant.id);
      const url = domusPortalUrl(res?.url);
      setPortalUrl(url);
      toast.success(t("Lien portail créé, SMS envoyé au locataire."));
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setPortalBusy(false);
    }
  };

  const married = MARRIED_STATES.includes(normalizeMaritalStatus(tenant.maritalStatus));
  const active = isActive(tenant);
  const { activeLease, activeUnit } = leaseInfo || {};

  const labelFor = (opts, code) => {
    const lbl = opts.find(([v]) => v === code)?.[1];
    return lbl ? t(lbl) : (code || "—");
  };
  const salarySym = (() => {
    const cur = tenant.salaryCurrencyId != null ? currency?.currencyById?.get(Number(tenant.salaryCurrencyId)) : null;
    return cur?.symbol || currency?.defaultCurrencySymbol || "CDF";
  })();
  const money = (v) => (v != null && v !== "" ? `${salarySym} ${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}` : "—");
  const childAges = parseChildAges(tenant.childAges);

  return (
    <>
      <div className="domus-drawer-scrim" onClick={onClose} />
      <aside className="domus-drawer" role="dialog" aria-label={tf(t("Detail {name}"), {name: tenant._name})}>
        <div className="domus-drawer-head">
          <h3>{t("Fiche locataire")}</h3>
          <div className="domus-drawer-head-actions">
            {onEdit && <button type="button" className="domus-drawer-iconbtn" onClick={onEdit} title={t("Modifier")}><Pencil size={16} /></button>}
            {onDelete && <button type="button" className="domus-drawer-iconbtn danger" onClick={onDelete} title={t("Supprimer")}><Trash2 size={16} /></button>}
            <button type="button" className="domus-drawer-close" onClick={onClose} aria-label={t("Fermer")}><X size={18} /></button>
          </div>
        </div>
        <div className="domus-drawer-body">
          <div className="detail-top">
            <div className="avatar large">{tenant._initials}</div>
            <div>
              <h3>{tenant._name}</h3>
              <p>{[tenant.mainActivity, tenant.entityName].filter(Boolean).join(" · ") || tenant.address || "—"}</p>
            </div>
            <span className={`chip ${active ? "chip-emerald" : "chip-ink"}`}>
              {active ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {active ? "Actif" : "Inactif"}
            </span>
          </div>

          <div className="action-strip">
            {tenant.phone && <a className="btn" href={`tel:${tenant.phone}`}><Phone size={16} /> Appeler</a>}
            {tenant.email && <a className="btn" href={`mailto:${tenant.email}`}><Mail size={16} /> Email</a>}
            {!activeLease && onCreateLease && (
              <button type="button" className="btn btn-primary" onClick={onCreateLease}><FileSignature size={16} /> Creer le bail</button>
            )}
            {portalUrl && (
              <button type="button" className="btn" onClick={copyPortalLink}>
                <Link2 size={16} /> {t("Copier le lien portail")}
              </button>
            )}
            <button type="button" className="btn" onClick={generatePortalLink} disabled={portalBusy}>
              <Link2 size={16} /> {portalBusy ? t("Envoi…") : portalUrl ? t("Renvoyer le lien par SMS") : t("Générer le lien + SMS")}
            </button>
          </div>
          {portalUrl && (
            <div className="info-cell" style={{ marginTop: -6, marginBottom: 8 }}>
              <Link2 size={15} />
              <span>{t("Lien portail")}</span>
              <b style={{ wordBreak: "break-all" }}>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">{portalUrl}</a>
              </b>
            </div>
          )}

          {changeReqs.length > 0 && (
            <div className="info-cell" style={{ flexDirection: "column", alignItems: "stretch", gap: 8, marginBottom: 10 }}>
              <b style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {t("Demande de modification du locataire")}
              </b>
              {changeReqs.map((r) => (
                <div key={r.id} style={{ fontSize: 13 }}>
                  <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>
                    {Object.entries(r.changes || {}).map(([k, v]) => (
                      <li key={k}>{k} : <strong>{String(v)}</strong></li>
                    ))}
                  </ul>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-primary" disabled={reqBusy} onClick={() => reviewChangeReq(r.id, true)}>
                      <CheckCircle2 size={14} /> {t("Approuver")}
                    </button>
                    <button type="button" className="btn" disabled={reqBusy} onClick={() => reviewChangeReq(r.id, false)}>
                      <X size={14} /> {t("Refuser")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="info-grid">
            <Info2 icon={Phone} label={t("Telephone")} value={tenant.phone || "—"} />
            <Info2 icon={Phone} label={t("Telephone 2")} value={tenant.phone2 || "—"} />
            <Info2 icon={Mail} label={t("Email")} value={tenant.email || "—"} />
            <Info2 icon={MapPin} label={t("Adresse")} value={tenant.address || "—"} />
            <Info2 icon={User} label={t("Sexe")} value={labelFor(SEX_OPTIONS, tenant.sex)} />
            <Info2 icon={IdCard} label={t("Date de naissance")} value={dateOnly(tenant.birthDate) || "—"} />
            <Info2 icon={IdCard} label={t("Nationalite")} value={tenant.nationality || "—"} />
            <Info2 icon={Briefcase} label={t("Statut")} value={labelFor(PRO_OPTIONS, tenant.professionalStatus)} />
            <Info2 icon={Briefcase} label={t("Activite")} value={[tenant.mainActivity, tenant.contractType].filter(Boolean).join(" · ") || "—"} />
            <Info2 icon={Building2} label={t("Employeur")} value={tenant.entityName || "—"} />
            <Info2 icon={Wallet} label={t("Salaire mensuel")} value={money(tenant.monthlyPay)} />
            <Info2 icon={Wallet} label={t("Autres revenus / mois")} value={money(tenant.otherMonthlyIncome)} />
            <Info2 icon={Home} label={t("Foyer")} value={`${tenant.occupantNumber || 0} occupant(s)${Number(tenant.childNumber) > 0 ? ` · ${tenant.childNumber} enfant(s)` : ""}`} />
            {childAges.length > 0 && (
              <Info2 icon={Home} label={t("Age des enfants")} value={childAges.join(" · ")} />
            )}
            <Info2 icon={User} label={t("Etat civil")} value={tenant.maritalStatus ? t(labelForMarital(tenant.maritalStatus)) : "—"} />
            <Info2 icon={IdCard} label={t("Piece d'identite")} value={[tenant.idDocumentType, tenant.idNumber].filter(Boolean).join(" · ") || "—"} />
          </div>

          {tenant.idDocumentName && (
            <div className="action-strip" style={{ marginTop: 8 }}>
              <ProofButton className="btn" path={`/tenants/${tenant.id}/id-document/file`} title={tenant.idDocumentName}>
                <IdCard size={16} /> Voir la copie de la piece
              </ProofButton>
            </div>
          )}

          {activeLease && (
            <div className="info-grid" style={{ marginTop: 8 }}>
              <Info2 icon={Building2} label="Bien loue" value={activeLease.propertyName || activeUnit?.name || activeUnit?.code || "—"} />
              <Info2 icon={Wallet} label="Loyer" value={leaseRentLabel(activeLease, activeUnit)} />
            </div>
          )}

          <div className="timeline">
            <div className="timeline-item done">
              <b>Contact d'urgence</b>
              <span>{[tenant.contactedPerson, tenant.contactedPersonPhoneNumber].filter(Boolean).join(" · ") || "Non renseigne"}</span>
            </div>
            {married && (
              <div className="timeline-item done">
                <b>Conjoint(e)</b>
                <span>{[tenant.partenairName, tenant.partenairNumber].filter(Boolean).join(" · ") || "Non renseigne"}</span>
              </div>
            )}
            {(tenant.oldAddress || tenant.oldLessor || tenant.movingReason) && (
              <div className="timeline-item done">
                <b>{t("Historique logement")}</b>
                <span>{[
                  tenant.oldAddress && `${t("Ancienne adresse")} : ${tenant.oldAddress}`,
                  tenant.oldLessor && `${t("Ancien bailleur")} : ${tenant.oldLessor}`,
                  tenant.movingReason && `${t("Motif du déménagement")} : ${tenant.movingReason}`,
                ].filter(Boolean).join(" — ")}</span>
              </div>
            )}
            <div className="timeline-item">
              <b>{t("Origine")}</b>
              <span>{tenant.originProvince || t("Province non renseignee")}</span>
            </div>
          </div>

          <TenantCommunications tenantId={tenant.id} />
        </div>
      </aside>
    </>
  );
}

// Rend cliquables les URL contenues dans un texte brut (les SMS envoyes au
// locataire se terminent par le lien de son espace personnel).
function linkifyText(text) {
  return String(text).split(/(https?:\/\/\S+)/g).map((part, i) => (
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>
      : <span key={i}>{part}</span>
  ));
}

// ── Onglet « Communications » : historique fusionne email + SMS envoyes au locataire ──
function TenantCommunications({ tenantId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [resendingId, setResendingId] = useState(null);
  const toast = useToast();

  const load = () => api.tenantCommunications(tenantId);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError("");
    load()
      .then((res) => { if (!cancelled) setItems(Array.isArray(res) ? res : []); })
      .catch((e) => { if (!cancelled) setError(e.message || String(e)); });
    return () => { cancelled = true; };
  }, [tenantId]);

  // Renvoi d'un SMS en echec : le backend rejoue le meme texte au meme numero
  // et cree une nouvelle ligne d'historique (l'ancienne tentative est gardee).
  const resend = async (logId) => {
    setResendingId(logId);
    try {
      const res = await api.resendSmsLog(logId);
      if (res?.success) toast.success(t("SMS renvoyé."));
      else toast.error(res?.message || t("Le renvoi a échoué."));
      const fresh = await load();
      setItems(Array.isArray(fresh) ? fresh : []);
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setResendingId(null);
    }
  };

  const statusMeta = {
    sent: { className: "chip-emerald", label: t("Envoye") },
    failed: { className: "chip-rose", label: t("Echec") },
    skipped: { className: "chip-ink", label: t("Ignore") },
    pending: { className: "chip-ink", label: t("En attente") },
  };

  return (
    <div className="domus-tenant-communications" style={{ marginTop: 16 }}>
      <h4 style={{ marginBottom: 8 }}>{t("Communications")}</h4>
      {error && <ApiError error={error} />}
      {!error && items === null && <Loading />}
      {!error && items && items.length === 0 && (
        <p className="muted">{t("Aucune communication envoyée à ce locataire pour le moment.")}</p>
      )}
      {!error && items && items.length > 0 && (
        <div className="timeline">
          {items.map((it, idx) => {
            const meta = statusMeta[it.status] || statusMeta.pending;
            return (
              <div key={idx} className="timeline-item done">
                <b>
                  {it.channel === "email" ? <Mail size={14} /> : <MessageSquare size={14} />}{" "}
                  {it.type} <span className={`chip ${meta.className}`} style={{ marginLeft: 6 }}>{meta.label}</span>
                </b>
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {it.recipient} — {it.subject ? linkifyText(it.subject) : "—"}
                  {it.errorMessage ? ` — ${it.errorMessage}` : ""}
                  {it.createdAt ? ` — ${formatShortDate(it.createdAt)}` : ""}
                </span>
                {it.channel === "sms" && it.id && (it.status === "failed" || it.status === "skipped") && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={resendingId === it.id}
                      onClick={() => resend(it.id)}
                    >
                      <RotateCw size={14} /> {resendingId === it.id ? t("Envoi...") : t("Renvoyer le SMS")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Formulaire « Nouveau locataire » (même API que le CRM) ──────────────────
export function OnboardingCard({
  record,
  index,
  sendingId,
  onEdit,
  onValidate,
  onDelete,
  onCopy,
  onOpen,
  onResendSms,
  onResendEmail,
}) {
  const data = parseOnboardingData(record);
  const name = onboardingDisplayName(record);
  const status = onboardingStatusMeta[record.status] || onboardingStatusMeta.sent;
  const phone = data.phone || record.phone;
  const tone = avatarTones[index % avatarTones.length];
  const smsBusy = sendingId === `${record.id}:sms`;
  const emailBusy = sendingId === `${record.id}:email`;
  const smsLabel = smsBusy ? "Envoi..." : record.smsSentAt ? "Renvoyer SMS" : "Envoyer SMS";
  const emailLabel = emailBusy ? "Envoi..." : record.emailSentAt ? "Renvoyer email" : "Envoyer email";
  return (
    <article className="domus-onboarding-card">
      <div className={`tenant-avatar ${tone}`}>{initials(name)}</div>
      <div className="domus-onboarding-main">
        <div className="domus-tenant-card-head">
          <div>
            <h3>{name}</h3>
            <p>{data.email || "email non renseigne"}</p>
            <p>{phone || "telephone non renseigne"}</p>
          </div>
          <span className={`domus-onboarding-badge ${status.className}`}>{status.label}</span>
        </div>
        <div className="domus-onboarding-divider" />
        <div className="domus-onboarding-line">
          <span><FileClock size={16} /> Inscription locataire</span>
        </div>
        {(record.smsSentAt || record.emailSentAt) && (
          <div className={`domus-onboarding-sent${record.smsStatus === "failed" || record.smsStatus === "undelivered" ? " failed" : ""}`}>
            <CheckCircle2 size={13} />
            <span>
              {record.smsSentAt &&
                (record.smsDeliveredAt
                  ? `SMS livre le ${formatShortDate(record.smsDeliveredAt)}`
                  : record.smsStatus === "failed" || record.smsStatus === "undelivered"
                    ? "SMS non delivre"
                    : `SMS transmis le ${formatShortDate(record.smsSentAt)}`)}
              {record.smsSentAt && record.emailSentAt && " · "}
              {record.emailSentAt && `Email transmis le ${formatShortDate(record.emailSentAt)}`}
            </span>
          </div>
        )}
        <div className="domus-onboarding-line">
          <span>Expire {formatShortDate(record.expiresAt)}</span>
          <strong>{record.status === "submitted" ? "A valider" : "Non valide"}</strong>
        </div>
        <div className="domus-onboarding-actions">
          <button type="button" onClick={() => onEdit(record)}><Pencil size={14} /> Remplir</button>
          <button type="button" onClick={() => onCopy(record)}><Copy size={14} /> Copier</button>
          <button type="button" onClick={() => onOpen(record)}><ExternalLink size={14} /> Ouvrir</button>
          {record.status === "submitted" && (
            <button type="button" className="primary" onClick={() => onValidate(record)}><CheckCircle2 size={14} /> Valider</button>
          )}
          <button type="button" disabled={smsBusy} onClick={() => onResendSms(record)}>
            <MessageSquare size={14} /> {smsLabel}
          </button>
          <button type="button" disabled={emailBusy} onClick={() => onResendEmail(record)}>
            <Mail size={14} /> {emailLabel}
          </button>
          <button type="button" className="danger" onClick={() => onDelete(record)}><Trash2 size={14} /> Supprimer</button>
        </div>
      </div>
    </article>
  );
}

// ── Modale « Lien d'inscription » (génère un dossier d'onboarding) ──────────
export function OnboardingLinkModal({ value, onClose, onGenerated }) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const set = (patch) => setForm((c) => ({ ...c, ...patch }));
  const url = result ? domusOnboardingUrl(result.url || result.onboardingUrl || "") : "";
  const phoneValid = isValidPhoneNumber(form.phone?.trim() || "");

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const rec = await api.generateOnboarding({
        phone: form.phone.trim(),
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
      });
      setResult(rec);
      onGenerated?.();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Lien d'inscription locataire"
      subtitle="Genere un lien securise a envoyer au futur locataire (meme API que le CRM)"
      icon={<UserRound size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        {!result ? (
          <FormSection icon={<UserRound size={14} />} title="Coordonnees du locataire">
            <DomusPhoneField label="Telephone" value={form.phone} onChange={(v) => set({ phone: v })} required />
            {form.phone?.trim() && !phoneValid && (
              <small className="api-error" style={{ display: "block", marginTop: -8 }}>Numero de telephone incomplet ou invalide.</small>
            )}
            <div className="domus-property-form-grid">
              <DomusPropertyField label="Prenom" value={form.firstName} onChange={(v) => set({ firstName: v })} placeholder="Optionnel" />
              <DomusPropertyField label="Nom" value={form.lastName} onChange={(v) => set({ lastName: v })} placeholder="Optionnel" />
            </div>
            <DomusPropertyField label="Email" type="email" value={form.email} onChange={(v) => set({ email: v })} placeholder="Optionnel" />
          </FormSection>
        ) : (
          <FormSection icon={<ExternalLink size={14} />} title="Lien genere">
            <div className="domus-link-result">
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={() => navigator.clipboard?.writeText(url)}><Copy size={14} /> Copier</button>
              <button type="button" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><ExternalLink size={14} /> Ouvrir</button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              Partagez ce lien avec le locataire pour qu'il complete son dossier. Vous pourrez ensuite le valider depuis la liste.
            </p>
          </FormSection>
        )}
      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <div className="modal-actions">
        {!result ? (
          <>
            <button className="btn" onClick={onClose} disabled={busy}>Annuler</button>
            <button className="btn btn-primary" onClick={generate} disabled={busy || !phoneValid}>
              {busy ? "Generation..." : "Generer le lien"}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onClose}>Termine</button>
        )}
      </div>
    </Modal>
  );
}

const emptyTenant = {
  firstName: "", lastName: "", email: "", phone: "", phone2: "", address: "",
  id_document_type: "", id_number: "", _idFile: null,
  birth_date: "", sex: "M", nationality: "Congolaise", marital_status: "célibataire",
  contacted_person: "", contacted_person_phone_number: "",
  prossional_status: "salarie", main_activity: "", entity_name: "",
  contract_type: "CDI", monthly_pay: "", salary_currency_id: "", other_monthly_income: "",
  occupant_number: 1, partenair_name: "", partenair_number: "",
  child_number: 0, child_ages: [],
  old_address: "", old_lessor: "", moving_reason: "",
};

const SEX_OPTIONS = [["M", "Masculin"], ["F", "Feminin"]];
// value = CODE canonique (stocké en base), text = libellé traduit. Mêmes codes que le CRM.
const MARITAL_OPTIONS = [
  ["single", t("Célibataire")], ["married", t("Marié(e)")], ["common_law", t("Conjoint de fait")],
  ["divorced", t("Divorcé(e)")], ["widowed", t("Veuf / Veuve")],
];
const PRO_OPTIONS = [
  ["salarie", "Salarié"], ["entrepreneur", "Entrepreneur"], ["commercant", "Commerçant"],
  ["independant", "Travailleur autonome / Indépendant"], ["pigiste", "Pigiste"],
  ["etudiant", "Étudiant"], ["sans_emploi", "Sans emploi"], ["retraite", "Retraité"], ["stagiaire", "Stagiaire"],
];
const CONTRACT_OPTIONS = [["CDI", "CDI"], ["CDD", "CDD"], ["indépendant", "Independant"], ["fonctionnaire", "Fonctionnaire"], ["autre", "Autre"]];

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}
function parseChildAges(raw) {
  if (Array.isArray(raw)) return raw.map((a) => String(a));
  if (typeof raw === "string" && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map((a) => String(a)) : [];
    } catch {
      return [];
    }
  }
  return [];
}
// API (camelCase) → champs du formulaire (snake_case), pour l'édition.
function tenantToForm(t) {
  return {
    ...emptyTenant,
    id: t.id,
    firstName: t.firstName || "",
    lastName: t.lastName || "",
    email: t.email || "",
    phone: t.phone || "",
    phone2: t.phone2 || "",
    address: t.address || "",
    birth_date: dateOnly(t.birthDate),
    sex: t.sex || "M",
    nationality: t.nationality || "Congolaise",
    marital_status: t.maritalStatus ? normalizeMaritalStatus(t.maritalStatus) : "single",
    id_document_type: t.idDocumentType || "",
    id_number: t.idNumber || "",
    _idDocumentName: t.idDocumentName || "",
    contacted_person: t.contactedPerson || "",
    contacted_person_phone_number: t.contactedPersonPhoneNumber || "",
    prossional_status: t.professionalStatus || "salarie",
    main_activity: t.mainActivity || "",
    entity_name: t.entityName || "",
    contract_type: t.contractType || "CDI",
    monthly_pay: t.monthlyPay != null && t.monthlyPay !== "" ? String(Number(t.monthlyPay)) : "",
    salary_currency_id: t.salaryCurrencyId != null && t.salaryCurrencyId !== "" ? String(t.salaryCurrencyId) : "",
    other_monthly_income: t.otherMonthlyIncome != null && t.otherMonthlyIncome !== "" ? String(Number(t.otherMonthlyIncome)) : "",
    occupant_number: t.occupantNumber || 1,
    partenair_name: t.partenairName || "",
    partenair_number: t.partenairNumber || "",
    child_number: t.childNumber || 0,
    child_ages: parseChildAges(t.childAges),
    old_address: t.oldAddress || "",
    old_lessor: t.oldLessor || "",
    moving_reason: t.movingReason || "",
  };
}

function isMarried(status) {
  return MARRIED_STATES.includes(normalizeMaritalStatus(status));
}

// Accès sûr : les dossiers d'inscription pré-remplis peuvent contenir des champs null.
const s = (v) => String(v ?? "").trim();

function canSaveTenant(f) {
  const required = [
    f.firstName, f.lastName, f.phone, f.address, f.birth_date, f.sex, f.nationality,
    f.marital_status, f.contacted_person, f.contacted_person_phone_number,
    f.prossional_status, f.main_activity, f.entity_name, f.contract_type,
  ];
  if (required.some((v) => !String(v ?? "").trim())) return false;
  if (Number(f.occupant_number || 0) < 1) return false;
  if (isMarried(f.marital_status) && (!s(f.partenair_name) || !s(f.partenair_number))) return false;
  const childN = Number(f.child_number || 0);
  if (childN > 0) {
    const ages = f.child_ages || [];
    for (let i = 0; i < childN; i += 1) {
      const a = ages[i];
      if (String(a ?? "").trim() === "" || !Number.isFinite(Number(a))) return false;
    }
  }
  return true;
}

function tenantPayload(f) {
  const married = isMarried(f.marital_status);
  const childN = Number(f.child_number || 0);
  const payload = {
    firstName: s(f.firstName),
    lastName: s(f.lastName),
    email: s(f.email) || null,
    phone: s(f.phone),
    address: s(f.address),
    birth_date: f.birth_date,
    sex: f.sex,
    nationality: s(f.nationality),
    marital_status: f.marital_status,
    id_document_type: s(f.id_document_type) || null,
    id_number: s(f.id_number) || null,
    phone2: s(f.phone2) || null,
    contacted_person: s(f.contacted_person),
    contacted_person_phone_number: s(f.contacted_person_phone_number),
    prossional_status: f.prossional_status,
    main_activity: s(f.main_activity),
    entity_name: s(f.entity_name),
    contract_type: f.contract_type,
    occupant_number: Number(f.occupant_number || 1),
    child_number: childN > 0 ? childN : 0,
  };
  if (f.monthly_pay !== "") payload.monthly_pay = Number(f.monthly_pay);
  if (f.salary_currency_id !== "") payload.salary_currency_id = Number(f.salary_currency_id);
  if (f.other_monthly_income !== "") payload.other_monthly_income = Number(f.other_monthly_income);
  if (s(f.old_address)) payload.old_address = s(f.old_address);
  if (s(f.old_lessor)) payload.old_lessor = s(f.old_lessor);
  if (s(f.moving_reason)) payload.moving_reason = s(f.moving_reason);
  if (married) {
    payload.partenair_name = s(f.partenair_name);
    payload.partenair_number = s(f.partenair_number);
  }
  if (childN > 0) {
    payload.child_age = (f.child_ages || []).slice(0, childN).map((a) => Number(a)).filter((n) => Number.isFinite(n));
  }
  return payload;
}

function TenantModal({ value, busy, error, onClose, onSave }) {
  const validating = !!value._validating;
  const [form, setForm] = useState(value);
  const set = (patch) => setForm((cur) => ({ ...cur, ...patch }));
  const married = isMarried(form.marital_status);
  const childCount = Math.max(0, Math.min(20, parseInt(form.child_number, 10) || 0));

  // Synchronise le nombre de champs d'âge avec le nombre d'enfants (comme le CRM).
  const setChildCount = (v) => setForm((cur) => {
    const n = Math.max(0, Math.min(20, parseInt(v, 10) || 0));
    const ages = (cur.child_ages || []).slice(0, n);
    while (ages.length < n) ages.push("");
    return { ...cur, child_number: v, child_ages: ages };
  });
  const setChildAge = (i, v) => setForm((cur) => {
    const ages = (cur.child_ages || []).slice();
    ages[i] = v;
    return { ...cur, child_ages: ages };
  });

  return (
    <Modal
      title={validating ? "Valider l'inscription" : value.id ? "Modifier le locataire" : "Nouveau locataire"}
      subtitle={validating ? "Verifiez et corrigez les informations avant de creer le locataire" : value.id ? "Mettre a jour le dossier locataire (meme API que le CRM)" : "Cree un dossier locataire (meme API que le CRM)"}
      icon={validating ? <CheckCircle2 size={20} /> : value.id ? <Pencil size={20} /> : <UserPlus size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        {validating && (
          <div className="domus-onboarding-notice" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", margin: "0 0 4px", borderRadius: 10, background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.2)" }}>
            <Info size={16} style={{ marginTop: 2, flexShrink: 0, color: "#4f46e5" }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>Un locataire actif sera cree dans votre annuaire a partir de ce dossier. Aucun bail n'est cree a cette etape — vous pourrez le creer ensuite depuis la fiche.</span>
          </div>
        )}
        <FormSection icon={<User size={14} />} title="Identite">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Prenom" value={form.firstName} onChange={(v) => set({ firstName: v })} required placeholder="ex. Jean" />
            <DomusPropertyField label="Nom" value={form.lastName} onChange={(v) => set({ lastName: v })} required placeholder="ex. Tshisekedi" />
          </div>
          <div className="domus-property-form-grid">
            <DomusPropertySelect label="Sexe" value={form.sex} onChange={(v) => set({ sex: v })} required options={SEX_OPTIONS} />
            <DomusPropertyField label="Date de naissance" type="date" value={form.birth_date} onChange={(v) => set({ birth_date: v })} required />
          </div>
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Nationalite" value={form.nationality} onChange={(v) => set({ nationality: v })} required />
            <DomusPropertySelect label="Etat civil" value={form.marital_status} onChange={(v) => set({ marital_status: v })} required options={MARITAL_OPTIONS} />
          </div>
          {married && (
            <div className="domus-property-form-grid">
              <DomusPropertyField label="Nom du conjoint" value={form.partenair_name} onChange={(v) => set({ partenair_name: v })} required />
              <DomusPhoneField label="Telephone du conjoint" value={form.partenair_number} onChange={(v) => set({ partenair_number: v })} required />
            </div>
          )}
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Piece d'identite (type)" value={form.id_document_type} onChange={(v) => set({ id_document_type: v })} placeholder="ex. Carte d'electeur, Passeport" />
            <DomusPropertyField label="N&deg; de la piece" value={form.id_number} onChange={(v) => set({ id_number: v })} placeholder="ex. CNI-0123456" />
          </div>
          <label className="domus-property-field">
            <span>Copie de la piece (scan/photo)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => set({ _idFile: e.target.files?.[0] || null })}
            />
            {form._idFile
              ? <small className="muted">Sera importee a l'enregistrement : {form._idFile.name}</small>
              : form._idDocumentName
                ? (
                  <small className="muted">
                    Copie actuelle : <ProofButton className="immo-linklike" path={`/tenants/${form.id}/id-document/file`} title={form._idDocumentName}>{form._idDocumentName}</ProofButton>
                  </small>
                )
                : <small className="muted">Aucune copie importee.</small>}
          </label>
        </FormSection>

        <FormSection icon={<Phone size={14} />} title="Contact">
          <div className="domus-property-form-grid">
            <DomusPhoneField label="Telephone" value={form.phone} onChange={(v) => set({ phone: v })} required />
            <DomusPhoneField label="Telephone 2" value={form.phone2} onChange={(v) => set({ phone2: v })} />
          </div>
          <DomusPropertyField label="Email" type="email" value={form.email} onChange={(v) => set({ email: v })} placeholder="Optionnel" />
          <DomusPropertyField label="Adresse" value={form.address} onChange={(v) => set({ address: v })} required placeholder="ex. 12 Av. des Palmiers" />
        </FormSection>

        <FormSection icon={<AlertTriangle size={14} />} title="Personne a contacter (urgence)">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Nom" value={form.contacted_person} onChange={(v) => set({ contacted_person: v })} required />
            <DomusPhoneField label="Telephone" value={form.contacted_person_phone_number} onChange={(v) => set({ contacted_person_phone_number: v })} required />
          </div>
        </FormSection>

        <FormSection icon={<Briefcase size={14} />} title="Situation professionnelle">
          <div className="domus-property-form-grid">
            <DomusPropertySelect label="Statut" value={form.prossional_status} onChange={(v) => set({ prossional_status: v })} required options={PRO_OPTIONS} />
            <DomusPropertyField label="Activite principale" value={form.main_activity} onChange={(v) => set({ main_activity: v })} required placeholder="ex. Comptable" />
          </div>
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Employeur / Entite" value={form.entity_name} onChange={(v) => set({ entity_name: v })} required placeholder="ex. Gecamines" />
            <DomusPropertySelect label="Type de contrat" value={form.contract_type} onChange={(v) => set({ contract_type: v })} required options={CONTRACT_OPTIONS} />
          </div>
          <div className="domus-property-form-grid">
            <DomusTenantMoneyField
              label="Salaire mensuel"
              value={form.monthly_pay}
              currencyId={form.salary_currency_id || tenantDefaultCurrencyId}
              onAmountChange={(v) => set({ monthly_pay: v, salary_currency_id: form.salary_currency_id || tenantDefaultCurrencyId })}
              onCurrencyChange={(v) => set({ salary_currency_id: v })}
            />
            <DomusTenantMoneyField
              label="Autres revenus / mois"
              value={form.other_monthly_income}
              currencyId={form.salary_currency_id || tenantDefaultCurrencyId}
              onAmountChange={(v) => set({ other_monthly_income: v, salary_currency_id: form.salary_currency_id || tenantDefaultCurrencyId })}
              onCurrencyChange={(v) => set({ salary_currency_id: v })}
            />
          </div>
        </FormSection>

        <FormSection icon={<Home size={14} />} title="Foyer">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Nombre d'occupants" type="number" value={form.occupant_number} onChange={(v) => set({ occupant_number: v })} required />
            <DomusPropertyField label="Nombre d'enfants" type="number" value={form.child_number} onChange={setChildCount} />
          </div>
          {childCount > 0 && (
            <div className="domus-children-grid">
              {Array.from({ length: childCount }).map((_, i) => (
                <DomusPropertyField
                  key={i}
                  label={`Age enfant ${i + 1}`}
                  type="number"
                  value={form.child_ages?.[i] ?? ""}
                  onChange={(v) => setChildAge(i, v)}
                  required
                />
              ))}
            </div>
          )}
        </FormSection>

        <FormSection icon={<Info size={14} />} title="Historique logement (optionnel)">
          <div className="domus-property-form-grid">
            <DomusPropertyField label="Ancienne adresse" value={form.old_address} onChange={(v) => set({ old_address: v })} placeholder="Optionnel" />
            <DomusPropertyField label="Ancien bailleur" value={form.old_lessor} onChange={(v) => set({ old_lessor: v })} placeholder="Optionnel" />
          </div>
          <DomusPropertyField label="Motif du demenagement" value={form.moving_reason} onChange={(v) => set({ moving_reason: v })} placeholder="Optionnel" textarea />
        </FormSection>

      </div>

      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      {validating ? (
        <div className="modal-actions">
          <button className="btn" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={busy || !canSaveTenant(form)}>
            <CheckCircle2 size={16} /> {busy ? "Validation..." : "Valider et creer le locataire"}
          </button>
        </div>
      ) : (
        <ModalActions busy={busy} disabled={!canSaveTenant(form)} onClose={onClose} onSave={() => onSave(form)} />
      )}
    </Modal>
  );
}
