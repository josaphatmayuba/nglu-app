import { useEffect, useMemo, useState } from "react";
import {
  Phone, Search, UserPlus, Mail, Briefcase, Home, AlertTriangle, CheckCircle2,
  Users, Clock, User, Building2, MapPin, IdCard, Info, UserRound, Copy,
  ExternalLink, FileClock, MessageSquare, Pencil, Trash2, Plus, X, Wallet, FileSignature,
} from "lucide-react";
import { api, domusOnboardingUrl } from "../api.js";
import { t, tf } from "../i18n.js";
import { filterTenants, useDateRange } from "../dateRange.jsx";
import { normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Metric, MetricsGrid } from "./ui.jsx";
import { Modal, FormSection, DomusPropertyField, DomusPropertySelect, ModalActions } from "./biens.jsx";
import { DomusPhoneField } from "../components/PhoneField.jsx";
import { setLeasePrefill } from "./reservationPrefill.js";
import { isValidPhoneNumber } from "react-phone-number-input";

const avatarTones = ["iris", "orange", "purple", "emerald", "ink"];
let tenantCurrencyOptions = [];
let tenantDefaultCurrencyId = "";
// Dégradés des avatars de carte locataire (mêmes teintes que le CRM immobilier).
const LETTER_TONES = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];
const onboardingStatusMeta = {
  sent: { label: "Non rempli", className: "warning" },
  draft: { label: "En remplissage", className: "warning" },
  submitted: { label: "Soumis", className: "success" },
  validated: { label: "Valide", className: "success" },
  expired: { label: "Expire", className: "danger" },
};

const MARRIED_STATES = ["marié", "marie", "conjoint de fait", "union libre"];

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
function parseOnboardingData(record) {
  if (!record?.data) return {};
  if (typeof record.data === "object") return record.data;
  try {
    return JSON.parse(record.data);
  } catch {
    return {};
  }
}
function isPendingOnboarding(record, now = Date.now()) {
  if (!record || record.status === "validated") return false;
  if (record.status !== "submitted" && record.expiresAt) {
    const expiry = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expiry) && expiry < now) return false;
  }
  return true;
}
function onboardingUrl(record) {
  // Le backend renvoie le lien CRM ; on le réécrit vers la page publique Domus.
  return domusOnboardingUrl(record?.url || record?.onboardingUrl || "");
}
function onboardingDisplayName(record) {
  const data = parseOnboardingData(record);
  return [data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
    data.email || data.phone || record?.phone || "Dossier locataire";
}
function formatShortDate(value) {
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

// ── Liaison locataire → bail actif → unité (comme le CRM TenantsPanel) ──
function tenantLeaseInfo(tenant, leases, units) {
  const tenantLeases = leases.filter((l) => String(l.tenantId) === String(tenant.id));
  const activeLease = tenantLeases.find((l) => l.status === "active") || tenantLeases[0] || null;
  const activeUnit = activeLease ? units.find((u) => String(u.id) === String(activeLease.unitId)) || null : null;
  return { tenantLeases, activeLease, activeUnit };
}

function tenantBadge(tenant, tenantLeases, activeLease) {
  const isLate = activeLease?.isOverdue || activeLease?.status === "late";
  if (isLate) {
    const d = activeLease?.overdueDays;
    return { label: `En retard${d ? ` ${d}j` : ""}`, tone: "danger" };
  }
  const daysToEnd = activeLease?.endDate
    ? Math.ceil((new Date(activeLease.endDate).getTime() - Date.now()) / 86400000)
    : null;
  if (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 60) return { label: "Bail à renouveler", tone: "warning" };
  const isCompany = Boolean(tenant?.entityName) && /\b(sarl|sas|sa|sprl|entreprise|company|ltd|inc|group)\b/i.test(String(tenant.entityName));
  if (isCompany) return { label: "Pro · Entreprise", tone: "brand" };
  const years = activeLease?.startDate
    ? Math.max(1, Math.floor((Date.now() - new Date(activeLease.startDate).getTime()) / (365 * 86400000)))
    : 0;
  if (years >= 3 || tenantLeases.length >= 2) return { label: `VIP · ${years || 3} ans`, tone: "success" };
  return { label: `Standard · ${years || 1} an`, tone: "neutral" };
}

function unitKindIcon(kind) {
  const k = String(kind || "").toLowerCase();
  if (/(house|villa|maison|residence)/.test(k)) return <Home size={15} />;
  return <Building2 size={15} />;
}

function leaseDueLabel(activeLease) {
  if (!activeLease?.nextInvoiceDate) return "—";
  const d = new Date(activeLease.nextInvoiceDate);
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

  // Dossiers d'onboarding encore "en ligne" (ni validés, ni expirés) : sert au KPI ET aux cartes,
  // sinon le compteur affiche 4 alors qu'on ne voit que 3 dossiers en attente.
  const pendingOnboarding = useMemo(() => onboarding.filter(isPendingOnboarding), [onboarding]);

  const filteredOnboarding = useMemo(() => {
    const q = normalize(query);
    if (!q) return pendingOnboarding;
    return pendingOnboarding.filter((record) => {
      const d = parseOnboardingData(record);
      return [d.firstName, d.lastName, d.email, d.phone, record.phone, record.status]
        .some((v) => normalize(v).includes(q));
    });
  }, [pendingOnboarding, query]);

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
      window.alert("SMS envoye.");
    } catch (e) {
      window.alert(e.message || String(e));
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
      window.alert("Email envoye.");
    } catch (e) {
      window.alert(e.message || String(e));
    } finally {
      setSendingId(null);
    }
  };
  const deleteOnboarding = async (record) => {
    if (!window.confirm("Supprimer ce dossier d'inscription ?")) return;
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
      window.alert("Impossible : ce locataire a un bail actif. Resiliez d'abord le bail.");
      return;
    }
    if (!window.confirm(`Supprimer le locataire « ${tenant._name} » ?`)) return;
    try {
      await api.deleteTenant(tenant.id);
      setSelectedId(null);
      await reload();
    } catch (e) {
      window.alert(e.message || String(e));
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
function TenantDetailDrawer({ tenant, leaseInfo, onClose, onEdit, onDelete, onCreateLease }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const married = MARRIED_STATES.includes(String(tenant.maritalStatus || "").toLowerCase());
  const active = isActive(tenant);
  const { activeLease, activeUnit } = leaseInfo || {};

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
          </div>

          <div className="info-grid">
            <Info2 icon={Phone} label={t("Telephone")} value={tenant.phone || "—"} />
            <Info2 icon={Mail} label={t("Email")} value={tenant.email || "—"} />
            <Info2 icon={MapPin} label={t("Adresse")} value={tenant.address || "—"} />
            <Info2 icon={IdCard} label={t("Nationalite")} value={tenant.nationality || "—"} />
            <Info2 icon={Briefcase} label={t("Activite")} value={[tenant.mainActivity, tenant.contractType].filter(Boolean).join(" · ") || "—"} />
            <Info2 icon={Building2} label={t("Employeur")} value={tenant.entityName || "—"} />
            <Info2 icon={Home} label={t("Foyer")} value={`${tenant.occupantNumber || 0} occupant(s)${Number(tenant.childNumber) > 0 ? ` · ${tenant.childNumber} enfant(s)` : ""}`} />
            <Info2 icon={User} label={t("Etat civil")} value={tenant.maritalStatus || "—"} />
            <Info2 icon={IdCard} label={t("Piece d'identite")} value={[tenant.idDocumentType, tenant.idNumber].filter(Boolean).join(" · ") || "—"} />
          </div>

          {tenant.idDocumentName && (
            <div className="action-strip" style={{ marginTop: 8 }}>
              <a className="btn" href={api.tenantIdDocumentUrl(tenant.id)} target="_blank" rel="noreferrer">
                <IdCard size={16} /> Voir la copie de la piece
              </a>
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
            <div className="timeline-item">
              <b>Origine</b>
              <span>{tenant.originProvince || "Province non renseignee"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Formulaire « Nouveau locataire » (même API que le CRM) ──────────────────
function OnboardingCard({
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
function OnboardingLinkModal({ value, onClose, onGenerated }) {
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
const MARITAL_OPTIONS = [
  ["célibataire", "Celibataire"], ["marié", "Marie(e)"], ["conjoint de fait", "Conjoint de fait"],
  ["union libre", "Union libre"], ["divorcé", "Divorce(e)"], ["veuf", "Veuf/Veuve"],
];
// Mêmes valeurs/libellés que le CRM (TenantFormModal) pour garder les données cohérentes.
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
    marital_status: t.maritalStatus || "célibataire",
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
  return MARRIED_STATES.includes(String(status || "").toLowerCase());
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
                    Copie actuelle : <a href={api.tenantIdDocumentUrl(form.id)} target="_blank" rel="noreferrer">{form._idDocumentName}</a>
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
