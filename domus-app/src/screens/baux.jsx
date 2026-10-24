import { useEffect, useMemo, useRef, useState } from "react";
import { t, tf } from "../i18n.js";
import {
  Check,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileDown,
  FilePlus,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Receipt,
  Search,
  Send,
  Shield,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { api } from "../api.js";
import { contractSignaturesHtml, downloadSignedContractPdf } from "../contractPdf.js";
import { contractDraftMarkScreen, contractStatusMeta, escapeHtml, hasHtmlMarkup, hasSignedScan, isPaperSigned, isProofMissing, openContractPrint, signingUrlFromContract } from "../contractUtils.js";
import { downloadSignedScan, scanNeedsProofModal } from "../signedScan.js";
import { SignedScanViewer, useSignedScanActions } from "../components/SignedScanViewer.jsx";
import { SignedScanImportButton } from "../components/SignedScanImportButton.jsx";
import { openRentBookPrint } from "../rentBookUtils.js";
import { filterLeases, filterProperties, filterTenants, filterUnits, parseDomusDate, useDateRange } from "../dateRange.jsx";
import { money, moneyExact, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { sanitizeHtml } from "../sanitizeHtml.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";
import { SmsNotice, useConfirm, usePrompt, useSmsSend, useToast } from "../components/Dialog.jsx";
import { ProofButton } from "../components/ProofModal.jsx";
import { takeLeasePrefill } from "./reservationPrefill.js";
import { MAX_UPLOAD_BYTES, UploadProgress, useUploadSuccess, useUploads } from "../uploads/uploadManager.jsx";
import { InspectionComparison, InspectionLauncher, LeaseInspectionsSection } from "./etatDesLieux.jsx";
import { TerminateLeaseModal } from "./leaseTermination.jsx";

const AVATARS = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];
const DAY = 86400000;
const emptyLease = {
  propertyId: "",
  unitId: "",
  tenantId: "",
  coTenantIds: [],
  startDate: todayISO(),
  endDate: addMonthsISO(todayISO(), 12, -1),
  nextInvoiceDate: todayISO(), // = startDate par defaut (suit startDate a la creation)
  rentProrationEnabled: false,
  billingCycle: "monthly",
  rentAmount: "",
  securityDeposit: "",
  status: "active",
  terms: "",
  moveInNotes: "",
  signingCity: "",
  taxApplyMode: "never",
  taxName: "",
  taxType: "percent",
  taxValue: "",
};

function tenantName(l) {
  const n = [l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ");
  return n || l.tenantName || "Locataire";
}

// Tous les locataires du bail (principal + co-locataires), joints par « & ».
const MAX_CO_TENANTS = 3;

function tenantNames(l) {
  const extra = (Array.isArray(l.coTenants) ? l.coTenants : []).map((c) => c?.name).filter(Boolean);
  return [tenantName(l), ...extra].join(" & ");
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// Réplique leaseDisplayInfo du CRM, sans moment (Date natif).
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function leaseInfo(l) {
  // Date seule AAAA-MM-JJ lue en jour LOCAL (new Date("YYYY-MM-DD") = minuit UTC).
  const start = l.startDate ? parseDomusDate(l.startDate) : null;
  const end = l.endDate ? parseDomusDate(l.endDate) : null;
  const now = new Date();
  const isExpired = end ? end < now : false;
  const daysLeft = end ? Math.round((end - now) / DAY) : null;
  const elapsedMonths = start ? Math.max(0, monthsBetween(start, now)) : 0;
  const totalMonths = start && end ? Math.max(1, monthsBetween(start, end)) : 1;
  const years = Math.max(1, Math.round(totalMonths / 12));
  const progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100)));

  // Bail résilié avec motif (statut ended + termination_reason) : distinct d'un « Terminé » de renouvellement.
  const terminated = isTerminatedLease(l);
  // Résiliation programmée (bail encore actif) : prioritaire sur « À renouveler ».
  const scheduledDate = !terminated && !isExpired && l.scheduledTerminationDate ? String(l.scheduledTerminationDate).slice(0, 10) : "";
  const scheduledReached = Boolean(scheduledDate) && scheduledDate <= todayYmd();
  const variant = isExpired || terminated ? "expired" : scheduledDate ? "signed" : daysLeft !== null && daysLeft <= 60 ? "pendingSignature" : "signed";
  const tone = isExpired || terminated ? "danger" : scheduledDate || (daysLeft !== null && daysLeft <= 60) ? "warning" : "success";
  const statusText = terminated
    ? t("Résilié")
    : isExpired
      ? "Expiré"
      : scheduledDate
        ? tf(t("Résiliation prévue le {date}"), { date: scheduledDate.split("-").reverse().join("/") })
        : daysLeft !== null && daysLeft <= 60 ? `À renouveler ${daysLeft}j` : "Actif";

  // dueCount/lateCount viennent du backend (withOverdueStats) : échéances
  // réellement rapprochées des paiements enregistrés, pas juste la durée
  // écoulée depuis startDate. paidOnTimeCount = à jour, sans retard.
  const dueCount = Number.isFinite(l.dueCount) ? l.dueCount : null;
  const lateCount = Number.isFinite(l.lateCount) ? l.lateCount : null;
  const paidOnTimeCount = dueCount !== null && lateCount !== null ? Math.max(0, dueCount - lateCount) : null;
  // unpaidCount = échéances réellement non payées ; le reste de lateCount = payées en retard.
  const unpaidCount = Number.isFinite(l.unpaidCount) ? Math.min(l.unpaidCount, lateCount ?? l.unpaidCount) : (l.isOverdue ? lateCount : 0);
  const paidLateCount = lateCount !== null ? Math.max(0, lateCount - (unpaidCount || 0)) : null;

  return {
    scheduledDate, scheduledReached, terminated, variant, tone, statusText, start, end, years, elapsedMonths, progress, daysLeft, isExpired,
    dueCount, lateCount, unpaidCount, paidLateCount, paidOnTimeCount, isOverdue: !!l.isOverdue,
    reference: `#${l.reference || `LEASE-${l.id}`}`,
    propertyLabel: [l.propertyAddress || l.propertyName, l.unitName].filter(Boolean).join(" · ") || "—",
  };
}

function isTerminatedLease(l) {
  return l?.status === "ended" && Boolean(l?.terminationReason);
}

// Chip de contrat dérivé du VRAI contrat lié au bail (pas de l'échéance).
// Sans contrat → invite à le générer.
function contractChip(contract, isExpired) {
  if (!contract) return { tone: "muted", label: "À générer", kind: "generate" };
  switch (contract.status) {
    case "signed": return { tone: "success", label: "Signé", kind: "signed" };
    case "sent": return { tone: "warning", label: "À signer", kind: "file" };
    case "viewed": return { tone: "warning", label: "Consulté", kind: "file" };
    case "expired": return { tone: "muted", label: "Archivé", kind: "file" };
    case "deleted": return { tone: "muted", label: "Retiré", kind: "file" };
    case "draft":
    default: return { tone: isExpired ? "muted" : "warning", label: "Brouillon", kind: "file" };
  }
}

// timeZone UTC : les dates de bail sont stockées à minuit UTC ; sans ça, un
// navigateur derrière UTC affiche la veille (03/06 au lieu de 04/06).
const fmtDate = (d) => (d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "—");

export function Baux({ go } = {}) {
  const smsSend = useSmsSend();
  const { data, loading, error, reload } = useApi(loadLeaseModule, []);
  useRealtimeReload(reload, ["leases", "properties", "units", "tenants", "contracts"]);
  const { itemForContract } = useUploads();
  // Envoi d'un bail signé terminé (gestionnaire global) : mise à jour de la modale ouverte + liste.
  useUploadSuccess(({ contractId, contract }) => {
    setContractPreview((prev) => (prev && String(prev.id) === String(contractId) && contract && typeof contract === "object" ? { ...prev, ...contract } : prev));
    reload();
  });
  const dateRange = useDateRange();
  const confirm = useConfirm();
  const leases = useMemo(
    () => filterLeases(Array.isArray(data?.leases) ? data.leases : [], dateRange),
    [data?.leases, dateRange],
  );
  const properties = filterProperties(Array.isArray(data?.properties) ? data.properties : []);
  const units = filterUnits(Array.isArray(data?.units) ? data.units : [], properties);
  const tenants = filterTenants(Array.isArray(data?.tenants) ? data.tenants : [], dateRange);
  const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
  const deposits = Array.isArray(data?.deposits) ? data.deposits : [];
  const currency = useMemo(() => normalizeCurrencyModule(data?.currencies, data?.setting), [data]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuDir, setMenuDir] = useState("down");
  const [leaseModal, setLeaseModal] = useState(null);
  const [depositModal, setDepositModal] = useState(null);
  const [terminateModal, setTerminateModal] = useState(null); // { lease, rev }
  const [inspectionView, setInspectionView] = useState(null);
  const [detailLease, setDetailLease] = useState(null);
  const [contractPreview, setContractPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");

  // Bouton « Créer un bail » depuis un bien : ouvre le formulaire pré-rempli.
  useEffect(() => {
    if (loading) return;
    const prefill = takeLeasePrefill();
    if (prefill) {
      setLeaseModal({
        ...emptyLease,
        propertyId: prefill.propertyId || "",
        unitId: prefill.unitId || "",
        tenantId: prefill.tenantId || "",
        currencyId: currency.defaultCurrencyId || "",
      });
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermer le menu « … » au clic en dehors ou sur Échap.
  useEffect(() => {
    if (openMenuId == null) return;
    const onDown = (e) => {
      if (!e.target.closest?.(".immo-card-actions")) setOpenMenuId(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpenMenuId(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  const enriched = useMemo(() => leases.map((l) => ({ lease: l, info: leaseInfo(l) })), [leases]);
  // Caution détenue (status="held") par bail, sinon la dernière (restituée).
  const depositByLease = useMemo(() => {
    const map = new Map();
    [...deposits]
      .sort((a, b) => (a.status === "held" ? -1 : 1) - (b.status === "held" ? -1 : 1) || (b.id || 0) - (a.id || 0))
      .forEach((d) => {
        if (d?.leaseId != null && !map.has(String(d.leaseId))) map.set(String(d.leaseId), d);
      });
    return map;
  }, [deposits]);
  const contractsByLease = useMemo(() => {
    const map = new Map();
    const priority = { signed: 5, viewed: 4, sent: 3, draft: 2 };
    [...contracts].sort((a, b) => (priority[b?.status] || 0) - (priority[a?.status] || 0)).forEach((contract) => {
      if (contract?.leaseId != null && !map.has(String(contract.leaseId))) {
        map.set(String(contract.leaseId), contract);
      }
    });
    return map;
  }, [contracts]);
  const counts = useMemo(() => ({
    all: enriched.length,
    active: enriched.filter((e) => e.info.variant !== "expired").length,
    renew: enriched.filter((e) => e.info.variant === "pendingSignature").length,
    expired: enriched.filter((e) => e.info.variant === "expired" && !e.info.terminated).length,
    terminated: enriched.filter((e) => e.info.terminated).length,
  }), [enriched]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter === "active" && e.info.variant === "expired") return false;
      if (filter === "renew" && e.info.variant !== "pendingSignature") return false;
      if (filter === "expired" && (e.info.variant !== "expired" || e.info.terminated)) return false;
      if (filter === "terminated" && !e.info.terminated) return false;
      if (!q) return true;
      return [tenantNames(e.lease), e.info.propertyLabel, e.info.reference].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [enriched, filter, query]);

  // Loader plein écran seulement au 1er chargement : les rechargements suivants sont silencieux.
  if (loading && !data) return <Loading />;
  if (error && !data) return <ApiError error={error} />;

  const chips = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "active", label: "Actifs", count: counts.active },
    { key: "renew", label: "À renouveler", count: counts.renew },
    { key: "expired", label: "Expirés", count: counts.expired },
    { key: "terminated", label: t("Résiliés"), count: counts.terminated },
  ];

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>Baux</h1>
          <p>Contrats de location, échéances et renouvellements</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Locataire, unite, reference..." />
          </label>
          <button className="immo-btn" onClick={() => downloadLeasesCsv(leases)}><Download size={16} /> CSV</button>
          <button className="immo-btn primary" onClick={() => setLeaseModal({ ...emptyLease, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> Nouveau bail
          </button>
        </div>
      </div>

      <div className="immo-filters">
        <div className="immo-filter-group">
          {chips.map((c) => (
            <button key={c.key} className={filter === c.key ? "active" : ""} onClick={() => setFilter(c.key)}>
              {c.label} <span className="count">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="immo-empty">
          <FileText size={28} />
          <h3>Aucun bail</h3>
          <p>Aucun bail ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="immo-lease-grid">
          {shown.map(({ lease, info }, index) => {
            const contract = contractsByLease.get(String(lease.id)) || null;
            const cchip = contractChip(contract, info.variant === "expired");
            const contractBusy = busyAction === `contract-${lease.id}`;
            // Le bail ne « démarre » pas tant que le locataire n'a pas signé :
            // si le contrat n'est pas signé (et le bail non expiré), on affiche
            // « Non signé » (ambre) au lieu de « Actif ».
            const signed = contract?.status === "signed";
            const pendingSignature = !signed && info.variant !== "expired";
            const cardVariant = pendingSignature ? "pendingSignature" : info.variant;
            // Variante du menu d'actions, calquée sur le CRM (leaseMenuVariant) :
            // expiré → contrat archivé ; pas de contrat → à générer ;
            // contrat signé → signé ; sinon → en attente de signature.
            const menuVariant = info.variant === "expired"
              ? "expired"
              : !contract
                ? "noContract"
                : signed
                  ? "signed"
                  : "pendingSignature";
            const statusPill = pendingSignature
              ? { tone: "warning", text: "Non signé" }
              : { tone: info.tone, text: info.statusText };
            const openContract = () => handleContractPreview(lease, contractsByLease, setContractPreview, setBusyAction, setActionError, reload);
            const deposit = depositByLease.get(String(lease.id)) || null;
            const depositDue = toNumber(lease.securityDeposit);
            return (
            <article key={lease.id} className={`immo-lease-card ${cardVariant}`}>
              <div className="immo-lease-card-head">
                <span className={`immo-pill ${statusPill.tone}`}>{statusPill.text}</span>
                <button
                  type="button"
                  className={`immo-contract-chip as-button ${cchip.tone}`}
                  title={contract ? "Voir le contrat" : "Générer le contrat"}
                  disabled={contractBusy}
                  onClick={openContract}
                >
                  {cchip.kind === "signed" ? <FileCheck size={14} /> : cchip.kind === "generate" ? <FilePlus size={14} /> : <FileText size={14} />}
                  {contractBusy ? "..." : cchip.label}
                </button>
              </div>

              <div className="immo-lease-person">
                <span className={`immo-lease-avatar ${AVATARS[index % AVATARS.length]}`}>{initials(tenantName(lease))}</span>
                <div>
                  <strong>{tenantNames(lease)}</strong>
                  <span>{info.propertyLabel}</span>
                </div>
              </div>

              <div className="immo-lease-progress">
                <div>
                  <span className="mono">{info.reference}</span>
                  {(() => {
                    const up = contract ? itemForContract(contract.id) : null;
                    if (!up) return null;
                    return <span className={`domus-upload-badge ${up.status}`}>{up.status === "failed" ? t("Échec") : up.status === "waiting_network" ? t("En attente de réseau") : t("Envoi…")}</span>;
                  })()}
                  <span>{info.years} an{info.years > 1 ? "s" : ""} · {info.elapsedMonths} mois écoulés</span>
                </div>
                <span className="immo-progress"><span className={info.tone} style={{ width: `${info.progress}%` }} /></span>
                <div>
                  <span>{fmtDate(info.start)}</span>
                  <strong className={info.tone}>{info.progress}% écoulé</strong>
                  <span>{fmtDate(info.end)}</span>
                </div>
              </div>

              {(depositDue > 0 || deposit) && (
                <div className="immo-lease-deposit">
                  <span className="immo-lease-deposit-label"><Shield size={13} /> Caution</span>
                  {deposit?.status === "held" ? (
                    <>
                      <span className="immo-pill success">Reçue · {money(deposit.amount, lease.currencySymbol || "$")}</span>
                      <button className="immo-deposit-link" onClick={() => setDepositModal({ mode: "return", lease, deposit })}>Restituer</button>
                    </>
                  ) : deposit?.status === "returned" ? (
                    <span className="immo-pill muted">Restituée{toNumber(deposit.deductionAmount) > 0 ? ` · retenue ${money(deposit.deductionAmount, lease.currencySymbol || "$")}` : ""}</span>
                  ) : (
                    <>
                      <span className="immo-pill warning">Due · {money(depositDue, lease.currencySymbol || "$")}</span>
                      <button className="immo-deposit-link" onClick={() => setDepositModal({ mode: "collect", lease, amount: depositDue })}>Encaisser</button>
                    </>
                  )}
                </div>
              )}

              <div className="immo-lease-card-foot">
                <div>
                  <strong className={info.variant === "expired" ? "" : ""}>
                    {money(lease.rentAmount, lease.currencySymbol || "$")}<span>/mois</span>
                  </strong>
                  <small className={info.variant === "expired" ? "muted" : info.isOverdue ? "danger" : "success"}>
                    {info.variant !== "expired" && !info.isOverdue && <Check size={13} />}
                    {info.terminated
                      ? `${t("Bail résilié")}${lease.terminationDate ? ` · ${fmtDate(parseDomusDate(lease.terminationDate))}` : ""}${info.unpaidCount > 0 ? ` · ${info.unpaidCount} ${info.unpaidCount > 1 ? t("impayés") : t("impayé")}` : ""}`
                      : info.variant === "expired"
                      ? "Bail terminé"
                      : info.dueCount === null
                        ? "—"
                        : info.lateCount > 0
                          ? info.unpaidCount > 0
                            ? `${info.unpaidCount} loyer${info.unpaidCount > 1 ? "s" : ""} impayé${info.unpaidCount > 1 ? "s" : ""}${info.paidLateCount > 0 ? ` · ${info.paidLateCount} payé${info.paidLateCount > 1 ? "s" : ""} en retard` : ""}`
                            : `${info.paidLateCount} payé${info.paidLateCount > 1 ? "s" : ""} en retard sur ${info.dueCount}`
                          : `${info.paidOnTimeCount || info.dueCount} paiements à jour`}
                  </small>
                </div>
                <span className="immo-card-actions">
                  <button className="immo-flat-icon" title="Contrat" disabled={contractBusy} onClick={openContract}><FileText size={16} /></button>
                  <button
                    className={`immo-flat-icon ${openMenuId === lease.id ? "active" : ""}`}
                    title="Actions"
                    onClick={(e) => {
                      // Détection auto du sens d'ouverture : assez de place dessous → bas, sinon haut.
                      if (openMenuId !== lease.id) {
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenuDir(window.innerHeight - r.bottom < 460 ? "up" : "down");
                      }
                      setOpenMenuId((id) => (id === lease.id ? null : lease.id));
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenuId === lease.id && (
                    <LeaseActionsMenu
                      lease={lease}
                      info={info}
                      variant={menuVariant}
                      contract={contract}
                      dir={menuDir}
                      renewable={!info.terminated && (info.isExpired || (info.daysLeft != null && info.daysLeft <= 120))}
                      statusText={statusPill.text}
                      deposit={deposit}
                      depositDue={depositDue}
                      onCollectDeposit={() => { setOpenMenuId(null); setDepositModal({ mode: "collect", lease, amount: depositDue }); }}
                      onReturnDeposit={() => { setOpenMenuId(null); setDepositModal({ mode: "return", lease, deposit }); }}
                      busy={busyAction}
                      onInspection={(type) => { setOpenMenuId(null); setInspectionView({ kind: "launch", lease, type }); }}
                      onCompareInspections={() => { setOpenMenuId(null); setInspectionView({ kind: "compare", lease }); }}
                      onDetail={() => {
                        setDetailLease({ lease, info });
                        setOpenMenuId(null);
                      }}
                      onContract={() => {
                        setOpenMenuId(null);
                        handleContractPreview(lease, contractsByLease, setContractPreview, setBusyAction, setActionError, reload);
                      }}
                      onDownloadContract={() => {
                        setOpenMenuId(null);
                        handleContractDownload(lease, contractsByLease, setBusyAction, setActionError, reload, setContractPreview);
                      }}
                      onExportCsv={() => {
                        downloadLeaseCsv(lease, info);
                        setOpenMenuId(null);
                      }}
                      onResend={() => {
                        setOpenMenuId(null);
                        handleResendContract(contract, setBusyAction, setActionError, reload, smsSend);
                      }}
                      onCancelSend={() => {
                        setOpenMenuId(null);
                        handleCancelContract(contract, setBusyAction, setActionError, reload, confirm);
                      }}
                      onPayments={() => {
                        go?.("loyers");
                        setOpenMenuId(null);
                      }}
                      onMaintenance={() => {
                        go?.("maintenance");
                        setOpenMenuId(null);
                      }}
                      onEdit={() => {
                        setLeaseModal(leaseToForm(lease));
                        setOpenMenuId(null);
                      }}
                      onRenew={() => {
                        setOpenMenuId(null);
                        handleRenewLease(lease, setBusyAction, setActionError, reload, confirm);
                      }}
                      onDelete={() => {
                        setOpenMenuId(null);
                        setTerminateModal({ lease, rev: 0 });
                      }}
                      onCancelScheduled={() => {
                        setOpenMenuId(null);
                        handleCancelScheduledTermination(lease, setBusyAction, setActionError, reload, confirm);
                      }}
                      onCancelLease={() => {
                        setOpenMenuId(null);
                        handleDeleteLease(lease, setBusyAction, setActionError, reload, confirm);
                      }}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </span>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {terminateModal && (
        <TerminateLeaseModal
          lease={terminateModal.lease}
          refreshKey={terminateModal.rev}
          onClose={() => setTerminateModal(null)}
          onDone={async () => {
            setTerminateModal(null);
            setActionError("");
            await reload();
          }}
          onOpenDeposit={(deposit) => setDepositModal({ mode: "return", lease: terminateModal.lease, deposit })}
          onOpenExitInspection={() => setInspectionView({ kind: "launch", lease: terminateModal.lease, type: "exit" })}
        />
      )}
      {depositModal && (
        <DepositModal
          state={depositModal}
          onClose={() => setDepositModal(null)}
          onDone={async (msg) => {
            setDepositModal(null);
            setActionError("");
            setTerminateModal((m) => (m ? { ...m, rev: m.rev + 1 } : m));
            await reload();
            if (msg) setActionError("");
          }}
        />
      )}

      {leaseModal && (
        <LeaseModal
          value={leaseModal}
          properties={properties}
          units={units}
          tenants={tenants}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          busy={saving}
          error={actionError}
          onClose={() => {
            setLeaseModal(null);
            setActionError("");
          }}
          onSave={async (values) => {
            setSaving(true);
            setActionError("");
            try {
              if (values.id) {
                await api.updateLease(values.id, leasePayload(values));
              } else {
                await api.createLease(leasePayload(values));
              }
              setLeaseModal(null);
              await reload();
            } catch (e) {
              setActionError(t(e.message));
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      {inspectionView?.kind === "launch" && (
        <InspectionLauncher lease={inspectionView.lease} type={inspectionView.type} onClose={() => setInspectionView(null)} />
      )}
      {inspectionView?.kind === "compare" && (
        <InspectionComparison lease={inspectionView.lease} onClose={() => setInspectionView(null)} />
      )}
      {detailLease && (
        <LeaseDetailModal lease={detailLease.lease} info={detailLease.info} contract={contractsByLease.get(String(detailLease.lease.id)) || null} onClose={() => setDetailLease(null)} go={go} />
      )}
      {contractPreview && (
        <ContractPreviewModal
          contract={contractPreview}
          leaseRef={((Array.isArray(data?.leases) ? data.leases : []).find((l) => String(l.id) === String(contractPreview.leaseId)) || {}).reference}
          onClose={() => setContractPreview(null)}
        />
      )}
      {actionError && !leaseModal && <div className="domus-floating-error">{actionError}</div>}
      {error && data && !actionError && <div className="domus-floating-error" role="alert">{error?.message || t("Impossible de charger les données")}</div>}
    </>
  );
}

async function loadLeaseModule() {
  const [leases, properties, units, tenants, contracts, deposits, currencies, setting] = await Promise.all([
    api.leases(),
    api.properties(),
    api.units(),
    api.tenants(),
    api.contracts(),
    api.deposits().catch(() => []),
    api.currencies(),
    api.setting(),
  ]);
  return { leases, properties, units, tenants, contracts, deposits, currencies, setting };
}

// Libellés d'en-tête du menu, calqués sur le CRM (LeaseContextMenu).
const LEASE_MENU_HEAD = {
  signed: "Bail signé",
  noContract: "Sans contrat",
  pendingSignature: "En attente signature",
  expired: "Bail expiré",
};

function LeaseActionsMenu({
  lease,
  info,
  variant = "signed",
  contract,
  dir = "down",
  renewable = false,
  statusText,
  deposit,
  depositDue = 0,
  onCollectDeposit,
  onReturnDeposit,
  busy,
  onDetail,
  onInspection,
  onCompareInspections,
  onContract,
  onDownloadContract,
  onExportCsv,
  onResend,
  onCancelSend,
  onPayments,
  onMaintenance,
  onEdit,
  onRenew,
  onDelete,
  onCancelScheduled,
  onCancelLease,
  onClose,
}) {
  const disabled = Boolean(busy);
  const toast = useToast();
  const prompt = usePrompt();
  const copyReference = async () => {
    try {
      await navigator.clipboard?.writeText?.(info.reference.replace(/^#/, ""));
    } catch {}
    onClose?.();
  };
  const copySigningLink = async () => {
    const link = signingUrlFromContract(contract);
    if (!link) {
      toast.error(t("Envoyez d'abord le contrat pour obtenir un lien de signature."));
    } else {
      try {
        await navigator.clipboard?.writeText?.(link);
        toast.success(t("Lien de signature copié."));
      } catch {
        await prompt({ title: t("Lien de signature"), label: t("Copiez le lien :"), defaultValue: link, readOnly: true, copyable: true });
      }
    }
    onClose?.();
  };

  return (
    <div className={`immo-lease-actions-menu ${dir}`}>
      <div className={`immo-lease-actions-head ${variant}`}>
        <strong>{tenantNames(lease)}</strong>
        <span>{info.terminated ? t("Bail résilié") : (LEASE_MENU_HEAD[variant] || "Bail")} · {statusText || (info.variant === "expired" ? "Expiré" : "Actif")}</span>
      </div>

      {(depositDue > 0 || deposit) && (
        <>
          {deposit?.status === "held" ? (
            <button className="highlight" onClick={onReturnDeposit}><Shield size={15} /> Restituer la caution</button>
          ) : deposit?.status === "returned" ? (
            <button disabled><Shield size={15} /> Caution restituée</button>
          ) : (
            <button className="highlight" onClick={onCollectDeposit}><Shield size={15} /> Encaisser la caution</button>
          )}
          <hr />
        </>
      )}

      {variant === "signed" && (
        <>
          <button onClick={onDetail}><Eye size={15} /> Voir détail du bail</button>
          <button disabled={disabled} onClick={onContract}><FileCheck size={15} /> Voir contrat signé</button>
          <button onClick={onPayments}><Receipt size={15} /> Paiements</button>
          <hr />
          <button onClick={onEdit}><Pencil size={15} /> Modifier le bail</button>
          {renewable && <button disabled={disabled} onClick={onRenew}><RefreshCw size={15} /> Renouveler</button>}
          {/* Résilier uniquement si le contrat est signé. */}
          {info.scheduledDate && !info.scheduledReached ? (
            <button disabled={disabled} style={{ height: 44 }} onClick={onCancelScheduled}><X size={15} /> {t("Annuler la résiliation")}</button>
          ) : (
            <button disabled={disabled} style={{ height: 44 }} className="danger" onClick={onDelete}><Trash2 size={15} /> {t("Résilier le bail")}</button>
          )}
          <button disabled={disabled} className="danger" onClick={onCancelLease}><Trash2 size={15} /> {t("Annuler le bail (erreur de saisie)")}</button>
        </>
      )}

      {variant === "pendingSignature" && (
        <>
          <button onClick={onDetail}><Eye size={15} /> Voir détail du bail</button>
          <button disabled={disabled} onClick={onContract}><FileText size={15} /> Aperçu du contrat</button>
          <button disabled={disabled} onClick={onResend}><Send size={15} /> Renvoyer le lien</button>
          <button onClick={copySigningLink}><Link2 size={15} /> Copier le lien de signature</button>
          <hr />
          <button onClick={onEdit}><Pencil size={15} /> Modifier le bail</button>
          <button disabled={disabled} className="danger" onClick={onCancelSend}><Trash2 size={15} /> Annuler l'envoi</button>
        </>
      )}

      {variant === "noContract" && (
        <>
          <button onClick={onDetail}><Eye size={15} /> Voir détail du bail</button>
          <button disabled={disabled} className="highlight" onClick={onContract}><FileSignature size={15} /> Générer le contrat</button>
          <hr />
          <button onClick={onEdit}><Pencil size={15} /> Modifier le bail</button>
        </>
      )}

      {variant === "expired" && (
        <>
          <button onClick={onDetail}><Eye size={15} /> Voir détail du bail</button>
          <button disabled={disabled} onClick={onContract}><FileCheck size={15} /> Voir contrat archivé</button>
          <hr />
          {/* Bail expiré → renouvellement toujours proposé (pas pour un bail résilié). */}
          {!info.terminated && <button disabled={disabled} className="highlight" onClick={onRenew}><RefreshCw size={15} /> {t("Renouveler (nouveau bail)")}</button>}
        </>
      )}

      <hr />
      <button onClick={() => onInspection?.("entry")}><ClipboardCheck size={15} /> {t("État des lieux d'entrée")}</button>
      <button onClick={() => onInspection?.("exit")}><ClipboardCheck size={15} /> {t("État des lieux de sortie")}</button>
      <button onClick={onCompareInspections}><ClipboardCheck size={15} /> {t("Comparer entrée / sortie")}</button>
    </div>
  );
}

const DEPOSIT_METHODS = [
  ["cash", "Espèces"], ["bank", "Bancaire"], ["card", "Carte"], ["cheque", "Chèque"], ["mpesa", "M-Pesa / Mobile"],
];

// Modale caution : encaissement (mode "collect") ou restitution avec retenue (mode "return").
function DepositModal({ state, onClose, onDone }) {
  const { mode, lease, deposit } = state;
  const symbol = lease?.currencySymbol || "$";
  const held = Number(deposit?.amount) || 0;
  const [amount, setAmount] = useState(String(mode === "collect" ? (state.amount || lease?.securityDeposit || "") : held));
  const [method, setMethod] = useState(mode === "collect" ? "cash" : "bank");
  const [date, setDate] = useState(todayISO());
  const [deduction, setDeduction] = useState("0");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Échap ferme la modale du dessus (la caution peut être ouverte par-dessus la résiliation).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(false);
  busyRef.current = busy;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || busyRef.current) return;
      e.stopPropagation();
      closeRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const dedNum = Math.min(Math.max(0, Number(deduction) || 0), held);
  const refund = Math.round((held - dedNum) * 100) / 100;

  const submit = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (mode === "collect") {
        await api.collectDeposit(lease.id, {
          paymentDate: date, amount: Number(amount), method,
          notes: notes || null,
          ...(lease.currencyId ? { currencyId: Number(lease.currencyId) } : {}),
        }, proofFile);
        onDone(`Caution de ${money(Number(amount), symbol)} encaissée`);
      } else {
        await api.returnDeposit(lease.id, {
          returnDate: date, deductionAmount: dedNum, deductionReason: reason || null,
          returnMethod: method, notes: notes || null,
        }, proofFile);
        onDone(`Caution restituée (${money(refund, symbol)})`);
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-deposit-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><Shield size={20} /></span>
            <div>
              <h2>{mode === "collect" ? "Encaisser la caution" : "Restituer la caution"}</h2>
              <p>{tenantNames(lease)} · {[lease.propertyName || lease.propertyAddress, lease.unitName].filter(Boolean).join(" · ") || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="domus-property-form">
          {mode === "collect" ? (
            <section className="domus-form-section">
              <div className="domus-property-form-grid">
                <label className="immo-field"><span>Montant ({symbol})</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
                <label className="immo-field"><span>Date</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              </div>
              <label className="immo-field"><span>Moyen de paiement</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {DEPOSIT_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></label>
              <label className="immo-field"><span>Note (optionnel)</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Référence, remarque…" /></label>
              <label className="immo-field"><span>Preuve / reçu signé (optionnel)</span>
                <input
                  id="deposit-collect-proof-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="deposit-collect-proof-input" className="btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <FileDown size={16} />
                  {proofFile ? proofFile.name : "Photo, scan ou capture (JPEG, PNG, PDF)"}
                </label>
              </label>
              {proofFile && (
                <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => setProofFile(null)}>
                  <X size={14} /> Retirer le fichier
                </button>
              )}
            </section>
          ) : (
            <section className="domus-form-section">
              <div className="immo-pay-row"><span>Caution détenue</span><strong>{money(held, symbol)}</strong></div>
              <div className="domus-property-form-grid">
                <label className="immo-field"><span>Retenue (dégâts) ({symbol})</span>
                  <input type="number" min="0" max={held} value={deduction} onChange={(e) => setDeduction(e.target.value)} /></label>
                <label className="immo-field"><span>Date de restitution</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              </div>
              <label className="immo-field"><span>Motif de la retenue</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Réparation mur, nettoyage…" /></label>
              <label className="immo-field"><span>Moyen de restitution</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {DEPOSIT_METHODS.filter(([k]) => k !== "mpesa").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></label>
              <div className="immo-pay-row" style={{ marginTop: 8 }}>
                <span>Montant restitué</span><strong style={{ color: "#16a34a" }}>{money(refund, symbol)}</strong>
              </div>
              <label className="immo-field"><span>Preuve / reçu signé (optionnel)</span>
                <input
                  id="deposit-return-proof-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="deposit-return-proof-input" className="btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <FileDown size={16} />
                  {proofFile ? proofFile.name : "Photo, scan ou capture (JPEG, PNG, PDF)"}
                </label>
              </label>
              {proofFile && (
                <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => setProofFile(null)}>
                  <X size={14} /> Retirer le fichier
                </button>
              )}
            </section>
          )}
          {err && <div className="api-error" style={{ margin: "0 18px 14px" }}>{err}</div>}
        </div>

        <div className="modal-foot">
          <button className="immo-btn" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="immo-btn primary" onClick={submit} disabled={busy || (mode === "collect" && !(Number(amount) > 0))}>
            {busy ? "…" : <><Check size={16} /> {mode === "collect" ? "Encaisser" : "Restituer"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaseModal({ value, properties, units, tenants, currencyOptions = [], defaultCurrencyId = "", busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  const propertyUnits = units.filter((unit) => !form.propertyId || String(unit.propertyId) === String(form.propertyId));
  const selectedUnit = units.find((unit) => String(unit.id) === String(form.unitId));

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  // Prorata : sur un bail existant, (de)cocher la case exige un apercu +
  // une confirmation explicite avant l'enregistrement.
  const prorationWas = Boolean(value.rentProrationEnabled);
  const [proration, setProration] = useState({ status: "idle", data: null, error: "", confirmed: false });
  const prorationChanged = Boolean(form.id) && Boolean(form.rentProrationEnabled) !== prorationWas;
  const prorationBlocked = prorationChanged && (!proration.confirmed || proration.status === "loading" || (form.rentProrationEnabled && proration.status !== "ready"));
  const loadProrationPreview = () => {
    setProration({ status: "loading", data: null, error: "", confirmed: false });
    api.leaseProrationPreview(form.id)
      .then((data) => setProration({ status: "ready", data, error: "", confirmed: false }))
      .catch((e) => setProration({ status: "error", data: null, error: e?.message || t("Impossible de calculer l'aperçu."), confirmed: false }));
  };
  const toggleProration = (checked) => {
    set({ rentProrationEnabled: checked });
    if (!form.id || checked === prorationWas) {
      setProration({ status: "idle", data: null, error: "", confirmed: false });
    } else if (checked) {
      loadProrationPreview();
    } else {
      setProration({ status: "ready", data: null, error: "", confirmed: false });
    }
  };
  const prorationSymbol = (currencyOptions.find((o) => String(o.value) === String(form.currencyId))?.symbol) || value.currencySymbol || "";
  const setUnit = (unitId) => {
    const unit = units.find((item) => String(item.id) === String(unitId));
    set({
      unitId,
      propertyId: unit?.propertyId ? String(unit.propertyId) : form.propertyId,
      rentAmount: unit?.monthlyRent ?? form.rentAmount,
      securityDeposit: unit?.securityDeposit ?? form.securityDeposit,
      currencyId: unit?.currencyId ?? form.currencyId ?? defaultCurrencyId,
    });
  };

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-lease-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FileCheck size={20} /></span>
            <div>
              <h2>{form.id ? "Modifier le bail" : "Nouveau bail"}</h2>
              <p>{form.id ? "Mettre a jour le contrat de location" : "Creer un contrat de location pour une unite et un locataire"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="domus-property-form">
          <section className="domus-form-section">
            <h3><FileText size={14} /> Contrat</h3>
            <div className="domus-property-form-grid">
              <LeaseSelect
                label="Propriete"
                value={form.propertyId}
                required
                onChange={(propertyId) => {
                  const property = properties.find((p) => String(p.id) === String(propertyId));
                  set({ propertyId, unitId: "", ...(form.signingCity ? {} : { signingCity: property?.city || "" }) });
                }}
                options={properties.map((property) => [String(property.id), property.name || `Propriete #${property.id}`])}
              />
              <LeaseSelect
                label="Unite"
                value={form.unitId}
                required
                onChange={setUnit}
                options={[...propertyUnits].sort((a, b) => unitRank(a) - unitRank(b)).map((unit) => [String(unit.id), unitLabel(unit, properties, true)])}
              />
            </div>
            <LeaseSelect
              label={(form.coTenantIds || []).length ? "Locataire 1 (principal)" : "Locataire"}
              value={form.tenantId}
              required
              onChange={(tenantId) => set({ tenantId })}
              options={tenants
                .filter((t) => !(form.coTenantIds || []).includes(String(t.id)))
                .map((tenant) => [String(tenant.id), tenantLabel(tenant)])}
            />
            {(form.coTenantIds || []).map((coId, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <LeaseSelect
                    label={`Locataire ${i + 2}`}
                    value={coId}
                    required
                    onChange={(v) => set({ coTenantIds: form.coTenantIds.map((x, j) => (j === i ? v : x)) })}
                    options={tenants
                      .filter((t) => String(t.id) !== String(form.tenantId) && !form.coTenantIds.some((x, j) => j !== i && x === String(t.id)))
                      .map((tenant) => [String(tenant.id), tenantLabel(tenant)])}
                  />
                </div>
                <button
                  type="button"
                  className="immo-btn"
                  style={{ minHeight: 44, minWidth: 44 }}
                  aria-label={`Retirer le locataire ${i + 2}`}
                  onClick={() => set({ coTenantIds: form.coTenantIds.filter((_, j) => j !== i) })}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {(() => {
              const ids = [form.tenantId, ...(form.coTenantIds || [])];
              const filled = ids.filter(Boolean);
              const msg = filled.length !== new Set(filled).size
                ? "Un même locataire ne peut pas figurer deux fois sur le bail."
                : (form.coTenantIds || []).some((x) => !x)
                  ? "Choisissez un locataire pour chaque ligne, ou retirez la ligne vide."
                  : "";
              return msg ? <p role="alert" style={{ margin: 0, color: "var(--danger, #b91c1c)", fontSize: 13 }}>{msg}</p> : null;
            })()}
            {(form.coTenantIds || []).length < MAX_CO_TENANTS ? (
              <button
                type="button"
                className="immo-btn"
                style={{ minHeight: 44, alignSelf: "flex-start" }}
                onClick={() => set({ coTenantIds: [...(form.coTenantIds || []), ""] })}
              >
                + Ajouter un locataire
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>Maximum {MAX_CO_TENANTS + 1} locataires par bail.</p>
            )}
            <LeaseField
              label="Ville de signature (Fait a ...)"
              value={form.signingCity}
              onChange={(signingCity) => set({ signingCity })}
              placeholder="ex. Kinshasa"
            />
          </section>

          <section className="domus-form-section">
            <h3><RefreshCw size={14} /> Periode</h3>
            <div className="domus-property-form-grid three">
              <LeaseField label="Debut" type="date" value={form.startDate} required onChange={(startDate) => set({ startDate, ...(!form.id && (!form.nextInvoiceDate || form.nextInvoiceDate === form.startDate) ? { nextInvoiceDate: startDate } : {}) })} />
              <LeaseField label="Fin" type="date" value={form.endDate} onChange={(endDate) => set({ endDate })} />
              <LeaseField label="Prochaine facture" type="date" min={form.startDate || undefined} value={form.nextInvoiceDate} onChange={(nextInvoiceDate) => set({ nextInvoiceDate })} />
            </div>
            <div className="domus-lease-proration">
              <label className="domus-lease-proration-toggle">
                <input type="checkbox" checked={Boolean(form.rentProrationEnabled)} onChange={(e) => toggleProration(e.target.checked)} />
                <span>
                  <strong>{t("Loyer au prorata")}</strong>
                  <small>{t("Facture la période partielle au prorata des jours (début ou fin de bail en cours de mois). Désactivé : loyer plein chaque mois.")}</small>
                </span>
              </label>
              {prorationChanged && (
                <ProrationPanel
                  enabling={Boolean(form.rentProrationEnabled)}
                  state={proration}
                  symbol={prorationSymbol}
                  onRetry={loadProrationPreview}
                  onConfirm={(confirmed) => setProration((cur) => ({ ...cur, confirmed }))}
                />
              )}
            </div>
            <div className="domus-property-form-grid">
              <LeaseSelect
                label="Cycle"
                value={form.billingCycle}
                onChange={(billingCycle) => set({ billingCycle })}
                options={[
                  ["monthly", "Mensuel"],
                  ["quarterly", "Trimestriel"],
                  ["yearly", "Annuel"],
                ]}
              />
              <LeaseSelect
                label="Statut"
                value={form.status}
                onChange={(status) => set({ status })}
                options={[
                  ["active", "Actif"],
                  ["draft", "Brouillon"],
                ]}
              />
            </div>
          </section>

          <section className="domus-form-section">
            <h3><Receipt size={14} /> Financier</h3>
            <div className="domus-property-form-grid">
              <LeaseMoneyField
                label="Loyer mensuel"
                value={form.rentAmount}
                currencyId={form.currencyId || defaultCurrencyId || ""}
                currencyOptions={currencyOptions}
                required
                onAmountChange={(rentAmount) => set({ rentAmount })}
                onCurrencyChange={(currencyId) => set({ currencyId })}
                placeholder="ex. 850000"
              />
              <LeaseMoneyField
                label="Depot de garantie"
                value={form.securityDeposit}
                currencyId={form.currencyId || defaultCurrencyId || ""}
                currencyOptions={currencyOptions}
                onAmountChange={(securityDeposit) => set({ securityDeposit })}
                onCurrencyChange={(currencyId) => set({ currencyId })}
                placeholder="ex. 1700000"
              />
            </div>
            {selectedUnit && (
              <div className="domus-lease-unit-note">
                Unite selectionnee : <strong>{unitLabel(selectedUnit, properties)}</strong>
              </div>
            )}
          </section>

          <section className="domus-form-section">
            <h3><Receipt size={14} /> Taxe (incluse dans le loyer)</h3>
            <div className="domus-property-form-grid">
              <LeaseSelect
                label="Application"
                value={form.taxApplyMode}
                onChange={(taxApplyMode) => set({ taxApplyMode })}
                options={[["never", "Jamais"], ["auto", "Automatique (a chaque paiement)"]]}
              />
              {form.taxApplyMode === "auto" && (
                <LeaseField label="Nom de la taxe" value={form.taxName} onChange={(taxName) => set({ taxName })} placeholder="ex. TVA" />
              )}
            </div>
            {form.taxApplyMode === "auto" && (
              <>
                <div className="domus-property-form-grid">
                  <LeaseSelect
                    label="Type"
                    value={form.taxType}
                    onChange={(taxType) => set({ taxType })}
                    options={[["percent", "Pourcentage (%)"], ["fixed", "Montant fixe"]]}
                  />
                  <LeaseField
                    label={form.taxType === "percent" ? "Taux (%)" : "Montant"}
                    type="number"
                    value={form.taxValue}
                    onChange={(taxValue) => set({ taxValue })}
                    placeholder={form.taxType === "percent" ? "ex. 16" : "ex. 50000"}
                  />
                </div>
                <div className="domus-lease-unit-note">
                  Part de taxe estimee sur ce loyer : <strong>{taxPreview(form)}</strong>
                  <span style={{ color: "var(--ink-400)" }}> — incluse, ne change pas le montant paye.</span>
                </div>
              </>
            )}
          </section>

          <section className="domus-form-section">
            <h3><Pencil size={14} /> Notes</h3>
            <LeaseField label="Conditions" value={form.terms} onChange={(terms) => set({ terms })} textarea placeholder="Clauses, renouvellement, penalites..." />
            <LeaseField label="Notes d'entree" value={form.moveInNotes} onChange={(moveInNotes) => set({ moveInNotes })} textarea placeholder="Etat des lieux, remise des cles..." />
          </section>
        </div>

        {!form.id && (
          <SmsNotice>{t("À la création, des SMS partent automatiquement : bienvenue au locataire (bail actif) et récapitulatif au propriétaire et aux délégués du bien.")}</SmsNotice>
        )}
        {error && <div className="api-error">{error}</div>}
        <div className="domus-modal-footer">
          <button className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
          <div>
            <button className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !canSaveLease(form) || prorationBlocked}>
              <Check size={14} /> {busy ? "Enregistrement..." : form.id ? "Enregistrer" : "Creer le bail"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaseDetailModal({ lease, info, contract, onClose, go }) {
  const rows = [
    [t("Référence"), info.reference],
    [(lease.coTenants || []).length ? "Locataires" : "Locataire", tenantNames(lease)],
    ["Bien", info.propertyLabel],
    [t("Début"), fmtDate(info.start)],
    ["Fin", fmtDate(info.end)],
    ["Loyer", `${moneyExact(lease.rentAmount, lease.currencySymbol || "$")}/mois`],
    [t("Dépôt"), moneyExact(lease.securityDeposit || 0, lease.currencySymbol || "$")],
    ["Statut", info.statusText],
    ...(info.terminated
      ? [
          [t("Date de résiliation"), fmtDate(lease.terminationDate ? parseDomusDate(lease.terminationDate) : null)],
          [t("Motif de résiliation"), lease.terminationReason],
          [t("Résilié par"), [lease.terminatedByName, lease.terminatedAt ? new Date(lease.terminatedAt).toLocaleDateString("fr-FR") : ""].filter(Boolean).join(" · ")],
        ]
      : []),
  ];

  const confirm = useConfirm();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState("");
  // Document qui sert de preuve de signature du contrat de ce bail (avertissement a la suppression).
  const signedScanIds = contract?.signedDocumentId ? [Number(contract.signedDocumentId)] : [];
  const [rentBookBusy, setRentBookBusy] = useState(false);

  async function handleRentBook() {
    setRentBookBusy(true);
    try {
      const { lease: leaseData, payments, portalUrl, schedule } = await api.rentBook(lease.id);
      await openRentBookPrint(leaseData, payments, portalUrl, { onError: toast.error, schedule });
    } catch (err) {
      toast.error(err?.message || "Génération du carnet de quittances impossible.");
    } finally {
      setRentBookBusy(false);
    }
  }

  const docReq = useRef(0);
  async function reloadDocuments() {
    const req = ++docReq.current;
    try {
      const list = await api.leaseDocuments(lease.id);
      if (req === docReq.current) setDocuments(Array.isArray(list) ? list : []); // dernière requête gagne
    } catch (err) {
      if (req === docReq.current) setDocError(err?.message || "Chargement des documents impossible.");
    }
  }

  useEffect(() => {
    reloadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id]);

  // Remplacement du scan terminé en arrière-plan : on relit la liste des documents.
  useUploadSuccess(({ leaseId }) => {
    if (String(leaseId) === String(lease.id)) reloadDocuments();
  });

  async function handleUploadDocument(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocBusy(true);
    setDocError("");
    try {
      await api.uploadLeaseDocument(lease.id, file);
      await reloadDocuments();
    } catch (err) {
      setDocError(err?.message || "Import du bail signe impossible.");
    } finally {
      setDocBusy(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!(await confirm({
      title: t("Supprimer le document"),
      message: signedScanIds.includes(Number(documentId))
        ? t("Ce document est la preuve de signature du bail. Le contrat apparaîtra en \"Preuve manquante\". Préférez \"Remplacer le scan\".")
        : t("Supprimer ce document ?"),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    setDocBusy(true);
    setDocError("");
    try {
      await api.deleteLeaseDocument(documentId);
      await reloadDocuments();
    } catch (err) {
      setDocError(err?.message || "Suppression impossible.");
    } finally {
      setDocBusy(false);
    }
  }

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-action-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><Eye size={20} /></span>
            <div>
              <h2>{t("Détail du bail")}</h2>
              <p>{tenantName(lease)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="domus-detail-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value || "-"}</strong>
            </div>
          ))}
        </div>
        {(lease.terms || lease.moveInNotes) && (
          <div className="domus-detail-notes">
            {lease.terms && <p><strong>Conditions</strong>{lease.terms}</p>}
            {lease.moveInNotes && <p><strong>Notes d'entree</strong>{lease.moveInNotes}</p>}
          </div>
        )}
        <div className="domus-detail-notes">
          <p><strong>{t("Bail signé à la main")}</strong></p>
          {docError && <div className="domus-floating-error">{docError}</div>}
          {documents.length > 0 && (
            <ul className="domus-lease-documents">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <ProofButton className="immo-linklike" path={`/leases/documents/${doc.id}/file`} title={doc.originalName}>
                    <FileText size={14} /> {doc.originalName || `Document ${doc.id}`}
                  </ProofButton>
                  <button
                    className="domus-lease-document-remove"
                    disabled={docBusy}
                    onClick={() => handleDeleteDocument(doc.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {contract?.signedDocumentId && (
            <div className="signed-scan-import-row">
              <SignedScanImportButton contract={contract} leaseRef={info.reference} replace label={t("Remplacer le scan")} />
            </div>
          )}
          {!contract?.signedDocumentId && (<>
          <label className="immo-btn">
            <FilePlus size={15} /> {t("Importer le bail signé (photo/scan/PDF)")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: "none" }}
              disabled={docBusy}
              onChange={handleUploadDocument}
            />
          </label>
          <span className="muted signed-scan-hint">{t("PDF de plusieurs pages recommandé")}</span>
          </>)}
        </div>
        <LeaseInspectionsSection lease={lease} />
        {go && (
          <div className="domus-detail-actions">
            <button className="immo-btn" onClick={() => { onClose(); go("loyers"); }}><Receipt size={15} /> Voir les paiements</button>
            <button className="immo-btn" disabled={rentBookBusy} onClick={handleRentBook}>
              <FileDown size={15} /> {rentBookBusy ? "Génération…" : "Imprimer le carnet"}
            </button>
            <button className="immo-btn" onClick={() => { onClose(); go("maintenance"); }}><Wrench size={15} /> Tickets maintenance</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractPreviewModal({ contract, leaseRef, onClose }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { enqueueSignedContract, itemForContract } = useUploads();
  const upload = itemForContract(contract.id);
  const signBusy = Boolean(upload);
  const [signError, setSignError] = useState("");
  const raw = contract.contractContent || "";
  // Texte brut (sans balises) → on préserve les sauts de ligne (articles séparés)
  // au lieu de tout coller. Sinon on rend le HTML tel quel.
  const body = raw
    ? (hasHtmlMarkup(raw) ? raw : `<pre class="domus-contract-plain">${escapeHtml(raw)}</pre>`)
    : "<p>Aucun contenu de contrat.</p>";
  const statusLabel = contractStatusMeta(contract).label || contract.status || "Contrat";  // « Signé (papier) » / « Preuve manquante »
  const scan = hasSignedScan(contract);
  const proofMissing = isProofMissing(contract);
  const draftMark = contractDraftMarkScreen(contract);
  const generated = isPaperSigned(contract) || proofMissing;
  const scanActions = useSignedScanActions(contract, toast.error);
  // Signé sans preuve attachée (scan supprimé) → on ré-affiche l'import.
  // Jamais d'import papier sur un contrat signe electroniquement.
  const electronicallySigned = contract.status === "signed" && Boolean(contract.signatureData) && !contract.signedDocumentId;
  const canMarkSigned = !electronicallySigned && (contract.status !== "signed" || !contract.signedDocumentId);

  async function handleMarkSignedManually(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setSignError(t("Fichier trop lourd (max 10 Mo)"));
      return;
    }
    if (!(await confirm({
      title: t("Signature manuscrite"),
      message: t("Confirmer : le locataire a bien signé ce bail à la main sur papier ?"),
      confirmLabel: t("Confirmer"),
    }))) return;
    setSignError("");
    // Envoi délégué au gestionnaire global : la modale peut être fermée librement.
    enqueueSignedContract(file, {
      contractId: contract.id,
      leaseId: contract.leaseId,
      ref: leaseRef ? (String(leaseRef).startsWith("#") ? String(leaseRef) : `#${leaseRef}`) : `#LEASE-${contract.leaseId}`,
    });
  }

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-action-modal domus-contract-preview">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FileCheck size={20} /></span>
            <div>
              <h2>Contrat de bail</h2>
              <p>{statusLabel}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="domus-contract-manual-sign">
          <button
            type="button"
            className="immo-btn"
            onClick={() => (scan
              ? scanActions.print()
              : openContractPrint(contract, { onError: toast.error, generated }))}
          >
            <Printer size={15} /> Imprimer
          </button>
          {scan && (
            <button type="button" className="immo-btn" onClick={scanActions.download}>
              <FileText size={15} /> {t("Télécharger le contrat signé")}
            </button>
          )}
        </div>
        {proofMissing && (
          <div className="domus-contract-manual-sign signed-scan-missing" role="alert">
            <p>{t("Preuve manquante : le contrat est marqué signé mais aucun scan n'est attaché.")}</p>
            <SignedScanImportButton contract={contract} leaseRef={leaseRef} label={t("Importer le scan")} />
          </div>
        )}
        {canMarkSigned && !proofMissing && (
          <div className="domus-contract-manual-sign">
            {signError && <div className="domus-upload-inline-error" role="alert">{signError}</div>}
            {upload && <UploadProgress item={upload} />}
            <label className="immo-btn domus-upload-pick" aria-disabled={signBusy} data-disabled={signBusy ? "true" : undefined}>
              <FileSignature size={15} /> {signBusy ? t("Envoi en cours…") : t("Marquer signé à la main (importer le PDF/scan)")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ display: "none" }}
                disabled={signBusy}
                onChange={handleMarkSignedManually}
              />
            </label>
            <span className="muted signed-scan-hint">{t("PDF de plusieurs pages recommandé")}</span>
          </div>
        )}
        {scan ? (
          <div className="domus-contract-content">
            <div className="signed-scan-banner">
              <FileCheck size={15} />
              <span>{tf("Signé sur papier le {date} — le scan ci-dessous fait foi", { date: contract.signedAt ? new Date(contract.signedAt).toLocaleDateString("fr-FR") : "—" })}</span>
            </div>
            <SignedScanViewer key={contract.signedDocumentId} contract={contract} />
            <div className="signed-scan-import-row">
              <SignedScanImportButton contract={contract} leaseRef={leaseRef} replace label={t("Remplacer le scan")} />
            </div>
            <details className="signed-scan-generated">
              <summary>{t("Version générée (non signée)")}</summary>
              <p className="signed-scan-note">{t("Texte généré par Domus, sans signature. Le document signé fait foi.")}</p>
              <button type="button" className="immo-btn" onClick={() => openContractPrint(contract, { onError: toast.error, generated: true })}>
                <Printer size={15} /> {t("Imprimer cette version")}
              </button>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(`${body}${contractSignaturesHtml(contract)}`) }} />
            </details>
          </div>
        ) : proofMissing ? (
          <div className="domus-contract-content">
            <details className="signed-scan-generated">
              <summary>{t("Version générée (non signée)")}</summary>
              <p className="signed-scan-note">{t("Texte généré par Domus, sans signature. Le document signé fait foi.")}</p>
              <button type="button" className="immo-btn" onClick={() => openContractPrint(contract, { onError: toast.error, generated: true })}>
                <Printer size={15} /> {t("Imprimer cette version")}
              </button>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(`${body}${contractSignaturesHtml(contract)}`) }} />
            </details>
          </div>
        ) : (
          <div className="domus-contract-content">
            {draftMark && <div className="contrats-draft-mark screen-only" aria-hidden="true">{t("PROJET – non signé")}</div>}
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(`${body}${contractSignaturesHtml(contract)}`) }} />
          </div>
        )}
        {scanActions.proofModal}
      </div>
    </div>
  );
}

// Apercu + confirmation du passage au prorata (ou retour au loyer plein).
function ProrationPanel({ enabling, state, symbol, onRetry, onConfirm }) {
  const { status, data, error, confirmed } = state;
  const rows = Array.isArray(data?.schedule) ? data.schedule : [];
  const fullRows = rows.filter((r) => !r.prorated);
  const partRows = rows.filter((r) => r.prorated);
  const sameAmount = fullRows.length > 0 && fullRows.every((r) => Number(r.amount) === Number(fullRows[0].amount));
  const parts = [];
  if (fullRows.length) {
    parts.push(sameAmount
      ? tf("{n} échéances de {amount}", { n: fullRows.length, amount: moneyExact(fullRows[0].amount, symbol) })
      : tf("{n} échéances", { n: fullRows.length }));
  }
  partRows.forEach((r) => {
    parts.push(tf("1 échéance de {amount} ({d} jours sur {p})", { amount: moneyExact(r.amount, symbol), d: r.days, p: r.periodDays }));
  });
  const total = data?.totalProposed ?? rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div className="domus-lease-proration-panel" role="group" aria-label={t("Aperçu du loyer au prorata")}>
      {enabling && status === "loading" && <p className="muted" role="status">{t("Calcul de l'aperçu…")}</p>}
      {enabling && status === "error" && (
        <div className="api-error" role="alert">
          {error}{" "}
          <button type="button" className="immo-btn" style={{ minHeight: 44 }} onClick={onRetry}>{t("Réessayer")}</button>
        </div>
      )}
      {enabling && status === "ready" && (
        <>
          <p><strong>{parts.length ? parts.join(" + ") : t("Aucune échéance à recalculer.")}</strong>{parts.length ? " — " + tf("total {amount}", { amount: moneyExact(total, symbol) }) : ""}</p>
          <p className="muted">
            {tf("{u} échéance(s) mise(s) à jour · {v} annulée(s) · {k} conservée(s)", {
              u: data?.willUpdate ?? 0, v: data?.willVoid ?? 0, k: data?.willKeep ?? 0,
            })}
          </p>
        </>
      )}
      {!enabling && (
        <p><strong>{t("Retour au loyer plein : les échéances déjà générées gardent leur montant au prorata ; seuls les nouveaux calculs reviennent au loyer plein.")}</strong></p>
      )}
      {(!enabling || status === "ready") && (
        <label className="domus-lease-proration-confirm">
          <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} />
          <span>{t("Je confirme ce changement, appliqué à l'enregistrement du bail.")}</span>
        </label>
      )}
    </div>
  );
}

function LeaseField({ label, value, onChange, type = "text", placeholder = "", required = false, textarea = false, min }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      {textarea ? (
        <textarea value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value ?? ""} placeholder={placeholder} min={min} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function LeaseSelect({ label, value, options, onChange, required = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <Autocomplete value={value ?? ""} onChange={onChange} options={options} placeholder="Choisir…" />
    </label>
  );
}

function LeaseMoneyField({
  label,
  value,
  currencyId,
  currencyOptions,
  onAmountChange,
  onCurrencyChange,
  type = "number",
  placeholder = "",
  required = false,
}) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      <div className="domus-money-input">
        <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.symbol || option.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function canSaveLease(form) {
  const ids = [form.tenantId, ...(form.coTenantIds || [])];
  if (ids.slice(1).some((id) => !id) || new Set(ids).size !== ids.length) return false;
  return Boolean(form.propertyId && form.unitId && form.tenantId && form.startDate && form.rentAmount !== "" && Number(form.rentAmount) >= 0);
}

function leaseToForm(lease) {
  return {
    id: lease.id,
    propertyId: lease.propertyId ? String(lease.propertyId) : "",
    unitId: lease.unitId ? String(lease.unitId) : "",
    tenantId: lease.tenantId ? String(lease.tenantId) : "",
    coTenantIds: (Array.isArray(lease.coTenants) ? lease.coTenants : []).map((c) => String(c.id)),
    startDate: dateOnly(lease.startDate) || todayISO(),
    endDate: dateOnly(lease.endDate),
    nextInvoiceDate: dateOnly(lease.nextInvoiceDate) || dateOnly(lease.startDate) || todayISO(),
    rentProrationEnabled: Boolean(lease.rentProrationEnabled),
    _prorationWas: Boolean(lease.rentProrationEnabled),
    billingCycle: lease.billingCycle || "monthly",
    rentAmount: lease.rentAmount ?? "",
    securityDeposit: lease.securityDeposit ?? "",
    currencyId: lease.currencyId,
    status: lease.status || "active",
    terms: lease.terms || "",
    moveInNotes: lease.moveInNotes || "",
    signingCity: lease.signingCity || "",
    taxApplyMode: lease.taxApplyMode || "never",
    taxName: lease.taxName || "",
    taxType: lease.taxType || "percent",
    taxValue: lease.taxValue ?? "",
  };
}

function leasePayload(form) {
  return {
    propertyId: toNumber(form.propertyId),
    unitId: toNumber(form.unitId),
    tenantId: toNumber(form.tenantId),
    coTenantIds: (form.coTenantIds || []).filter(Boolean).map(toNumber),
    startDate: form.startDate,
    endDate: form.endDate || null,
    nextInvoiceDate: form.nextInvoiceDate || form.startDate,
    // Additif : envoye seulement si l'option est active, ou vient d'etre
    // decochee -> un ancien backend ne voit jamais ce champ.
    ...(form.rentProrationEnabled ? { rentProrationEnabled: true } : form.id && form._prorationWas ? { rentProrationEnabled: false } : {}),
    billingCycle: form.billingCycle || "monthly",
    rentAmount: toNumber(form.rentAmount),
    securityDeposit: toNumber(form.securityDeposit),
    ...(form.currencyId ? { currencyId: toNumber(form.currencyId) } : {}),
    terms: form.terms || null,
    moveInNotes: form.moveInNotes || null,
    signingCity: form.signingCity || null,
    status: form.status || "active",
    taxApplyMode: form.taxApplyMode || "never",
    taxName: form.taxApplyMode === "auto" ? (form.taxName || null) : (form.taxName || null),
    taxType: form.taxType || "percent",
    taxValue: form.taxValue === "" || form.taxValue == null ? null : toNumber(form.taxValue),
  };
}

// Aperçu de la part de taxe (incluse) calculée sur le loyer saisi.
function taxPreview(form) {
  const amount = Number(form.rentAmount) || 0;
  const v = Number(form.taxValue) || 0;
  if (form.taxApplyMode !== "auto" || amount <= 0 || v <= 0) return "—";
  const tax = form.taxType === "percent" ? amount - amount / (1 + v / 100) : Math.min(v, amount);
  return (Math.round(tax * 100) / 100).toLocaleString("fr-FR");
}

async function ensureContract(lease, contractsByLease) {
  const existing = contractsByLease.get(String(lease.id));
  if (existing?.id) return api.contract(existing.id);
  return api.createContract({ leaseId: lease.id });
}

async function handleContractPreview(lease, contractsByLease, setContractPreview, setBusyAction, setActionError, reload) {
  setBusyAction(`contract-${lease.id}`);
  setActionError("");
  try {
    const contract = await ensureContract(lease, contractsByLease);
    setContractPreview(contract);
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de charger le contrat.");
  } finally {
    setBusyAction("");
  }
}

async function handleContractDownload(lease, contractsByLease, setBusyAction, setActionError, reload, setContractPreview) {
  setBusyAction(`download-${lease.id}`);
  setActionError("");
  try {
    const contract = await ensureContract(lease, contractsByLease);
    if (hasSignedScan(contract)) {
      // Mobile natif + PDF : le telechargement passe par la ProofModal de l'apercu du contrat.
      if (scanNeedsProofModal(contract)) setContractPreview(contract);
      else await downloadSignedScan(contract);
    } else await downloadSignedContractPdf(contract, { generated: isPaperSigned(contract) || isProofMissing(contract) });
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de telecharger le contrat.");
  } finally {
    setBusyAction("");
  }
}

async function handleRenewLease(lease, setBusyAction, setActionError, reload, confirm) {
  const ok = await confirm({
    title: t("Renouveler le bail"),
    message: tf(t("Renouveler le bail {ref} pour 12 mois ?"), { ref: lease.reference || lease.id }),
    confirmLabel: t("Renouveler"),
  });
  if (!ok) return;
  const startDate = addDaysISO(dateOnly(lease.endDate) || todayISO(), 1);
  const endDate = addMonthsISO(startDate, 12, -1);
  setBusyAction(`renew-${lease.id}`);
  setActionError("");
  try {
    await api.renewLease(lease.id, {
      startDate,
      endDate,
      rentAmount: toNumber(lease.rentAmount),
      endCurrentLease: true,
    });
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de renouveler le bail.");
  } finally {
    setBusyAction("");
  }
}

async function handleResendContract(contract, setBusyAction, setActionError, reload, smsSend) {
  if (!contract?.id) {
    setActionError("Aucun contrat à renvoyer.");
    return;
  }
  setBusyAction(`resend-${contract.id}`);
  setActionError("");
  try {
    const res = await smsSend((extra) => api.sendContract(contract.id, extra), { title: t("Contrat : vérifier le SMS de signature") });
    if (!res) return;
    const link = res?.signingUrl || signingUrlFromContract({ ...contract, ...res });
    if (link) {
      try {
        await navigator.clipboard?.writeText?.(link);
      } catch {}
    }
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de renvoyer le lien de signature.");
  } finally {
    setBusyAction("");
  }
}

async function handleCancelContract(contract, setBusyAction, setActionError, reload, confirm) {
  if (!contract?.id) {
    setActionError("Aucun envoi à annuler.");
    return;
  }
  const ok = await confirm({
    title: t("Annuler l'envoi"),
    message: t("Annuler l'envoi du contrat ? Le locataire ne pourra plus le signer via ce lien."),
    confirmLabel: t("Annuler l'envoi"),
    cancelLabel: t("Retour"),
    danger: true,
  });
  if (!ok) return;
  setBusyAction(`cancel-${contract.id}`);
  setActionError("");
  try {
    await api.deleteContract(contract.id);
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible d'annuler l'envoi.");
  } finally {
    setBusyAction("");
  }
}

// Annulation d'un bail créé par erreur (statut "cancelled", bail masqué) : distincte de la résiliation avec motif.
async function handleCancelScheduledTermination(lease, setBusyAction, setActionError, reload, confirm) {
  const date = String(lease.scheduledTerminationDate || "").slice(0, 10).split("-").reverse().join("/");
  const ok = await confirm({
    title: t("Annuler la résiliation"),
    message: tf(t("Annuler la résiliation prévue le {date} ? Le bail continuera normalement."), { date }),
    confirmLabel: t("Annuler la résiliation"),
    danger: true,
  });
  if (!ok) return;
  setBusyAction(`cancel-term-${lease.id}`);
  setActionError("");
  try {
    await api.cancelScheduledTermination(lease.id, {});
    await reload();
  } catch (e) {
    setActionError(e.message || t("Impossible d'annuler la résiliation."));
  } finally {
    setBusyAction("");
  }
}

async function handleDeleteLease(lease, setBusyAction, setActionError, reload, confirm) {
  const ok = await confirm({
    title: t("Annuler le bail (erreur de saisie)"),
    message: tf(t("Annuler le bail {ref} ? Il sera retiré de la liste (ce n'est pas une résiliation)."), { ref: lease.reference || lease.id }),
    confirmLabel: t("Annuler le bail"),
    danger: true,
  });
  if (!ok) return;
  setBusyAction(`delete-${lease.id}`);
  setActionError("");
  try {
    await api.deleteLease(lease.id);
    await reload();
  } catch (e) {
    setActionError(e.message || t("Impossible d'annuler le bail."));
  } finally {
    setBusyAction("");
  }
}

function downloadLeasesCsv(leases) {
  const rows = leases.map((lease) => {
    const info = leaseInfo(lease);
    return leaseCsvRow(lease, info);
  });
  downloadCsv("baux.csv", rows);
}

function downloadLeaseCsv(lease, info) {
  downloadCsv(`${safeFileName(lease.reference || `lease-${lease.id}`)}.csv`, [leaseCsvRow(lease, info)]);
}

function leaseCsvRow(lease, info) {
  return {
    reference: info.reference.replace(/^#/, ""),
    locataire: tenantName(lease),
    bien: info.propertyLabel,
    debut: dateOnly(lease.startDate),
    fin: dateOnly(lease.endDate),
    statut: lease.status || info.statusText,
    loyer: lease.rentAmount ?? "",
    depot: lease.securityDeposit ?? "",
    devise: lease.currencyCode || lease.currencySymbol || "",
  };
}

function downloadCsv(filename, rows) {
  const headers = ["reference", "locataire", "bien", "debut", "fin", "statut", "loyer", "depot", "devise"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function safeFileName(value) {
  return String(value || "bail").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

// Libres d'abord (0), puis libres bientôt (1), puis loués (2) : simple tri, aucun blocage.
function unitRank(unit) {
  if (String(unit.status || "").toLowerCase() === "vacant") return 0;
  return unit.availableFrom ? 1 : 2;
}

function unitLabel(unit, properties, withState = false) {
  const property = properties.find((item) => String(item.id) === String(unit.propertyId));
  const base = [property?.name || unit.propertyName, unit.name || unit.code || `Unite #${unit.id}`].filter(Boolean).join(" · ");
  if (!withState) return base;
  const state = String(unit.status || "").toLowerCase() === "vacant"
    ? t("Libre")
    : unit.availableFrom
      ? tf(t("Libre le {date}"), { date: String(unit.availableFrom).slice(0, 10).split("-").reverse().join("/") })
      : t("Loué");
  return `${base} · ${state}`;
}

function tenantLabel(tenant) {
  return [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || tenant.name || tenant.fullName || `Locataire #${tenant.id}`;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsISO(dateIso, months, dayOffset = 0) {
  const date = new Date(dateIso);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function addDaysISO(dateIso, days) {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
