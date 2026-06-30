import { useEffect, useMemo, useState } from "react";
import {
  Check,
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
import { CONTRACT_STATUS, escapeHtml, hasHtmlMarkup, signingUrlFromContract } from "../contractUtils.js";
import { filterLeases, filterProperties, filterTenants, filterUnits, useDateRange } from "../dateRange.jsx";
import { money, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { sanitizeHtml } from "../sanitizeHtml.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { Autocomplete } from "../components/Autocomplete.jsx";

const AVATARS = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];
const DAY = 86400000;
const emptyLease = {
  propertyId: "",
  unitId: "",
  tenantId: "",
  startDate: todayISO(),
  endDate: addMonthsISO(todayISO(), 12, -1),
  nextInvoiceDate: todayISO(),
  billingCycle: "monthly",
  rentAmount: "",
  securityDeposit: "",
  status: "active",
  terms: "",
  moveInNotes: "",
  taxApplyMode: "never",
  taxName: "",
  taxType: "percent",
  taxValue: "",
};

function tenantName(l) {
  const n = [l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ");
  return n || l.tenantName || "Locataire";
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
function leaseInfo(l) {
  const start = l.startDate ? new Date(l.startDate) : null;
  const end = l.endDate ? new Date(l.endDate) : null;
  const now = new Date();
  const isExpired = end ? end < now : false;
  const daysLeft = end ? Math.round((end - now) / DAY) : null;
  const elapsedMonths = start ? Math.max(0, monthsBetween(start, now)) : 0;
  const totalMonths = start && end ? Math.max(1, monthsBetween(start, end)) : 1;
  const years = Math.max(1, Math.round(totalMonths / 12));
  const progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100)));

  const variant = isExpired ? "expired" : daysLeft !== null && daysLeft <= 60 ? "pendingSignature" : "signed";
  const tone = isExpired ? "danger" : daysLeft !== null && daysLeft <= 60 ? "warning" : "success";
  const statusText = isExpired ? "Expiré" : daysLeft !== null && daysLeft <= 60 ? `À renouveler ${daysLeft}j` : "Actif";

  return {
    variant, tone, statusText, start, end, years, elapsedMonths, progress, daysLeft, isExpired,
    reference: `#${l.reference || `LEASE-${l.id}`}`,
    propertyLabel: [l.propertyAddress || l.propertyName, l.unitName].filter(Boolean).join(" · ") || "—",
  };
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

const fmtDate = (d) => (d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—");

export function Baux({ go } = {}) {
  const { data, loading, error, reload } = useApi(loadLeaseModule, []);
  useRealtimeReload(reload, ["leases", "properties", "units", "tenants", "contracts"]);
  const dateRange = useDateRange();
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
  const [detailLease, setDetailLease] = useState(null);
  const [contractPreview, setContractPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");

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
    expired: enriched.filter((e) => e.info.variant === "expired").length,
  }), [enriched]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((e) => {
      if (filter === "active" && e.info.variant === "expired") return false;
      if (filter === "renew" && e.info.variant !== "pendingSignature") return false;
      if (filter === "expired" && e.info.variant !== "expired") return false;
      if (!q) return true;
      return [tenantName(e.lease), e.info.propertyLabel, e.info.reference].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [enriched, filter, query]);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const chips = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "active", label: "Actifs", count: counts.active },
    { key: "renew", label: "À renouveler", count: counts.renew },
    { key: "expired", label: "Expirés", count: counts.expired },
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
                  <strong>{tenantName(lease)}</strong>
                  <span>{info.propertyLabel}</span>
                </div>
              </div>

              <div className="immo-lease-progress">
                <div>
                  <span className="mono">{info.reference}</span>
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
                  <small className={info.variant === "expired" ? "muted" : "success"}>
                    {info.variant !== "expired" && <Check size={13} />}
                    {info.variant === "expired" ? "Bail terminé" : `${info.elapsedMonths || 1} paiements à jour`}
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
                      renewable={info.isExpired || (info.daysLeft != null && info.daysLeft <= 120)}
                      statusText={statusPill.text}
                      deposit={deposit}
                      depositDue={depositDue}
                      onCollectDeposit={() => { setOpenMenuId(null); setDepositModal({ mode: "collect", lease, amount: depositDue }); }}
                      onReturnDeposit={() => { setOpenMenuId(null); setDepositModal({ mode: "return", lease, deposit }); }}
                      busy={busyAction}
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
                        handleContractDownload(lease, contractsByLease, setBusyAction, setActionError, reload);
                      }}
                      onExportCsv={() => {
                        downloadLeaseCsv(lease, info);
                        setOpenMenuId(null);
                      }}
                      onResend={() => {
                        setOpenMenuId(null);
                        handleResendContract(contract, setBusyAction, setActionError, reload);
                      }}
                      onCancelSend={() => {
                        setOpenMenuId(null);
                        handleCancelContract(contract, setBusyAction, setActionError, reload);
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
                        handleRenewLease(lease, setBusyAction, setActionError, reload);
                      }}
                      onDelete={() => {
                        setOpenMenuId(null);
                        handleDeleteLease(lease, setBusyAction, setActionError, reload);
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

      {depositModal && (
        <DepositModal
          state={depositModal}
          onClose={() => setDepositModal(null)}
          onDone={async (msg) => {
            setDepositModal(null);
            setActionError("");
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
              setActionError(e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      {detailLease && (
        <LeaseDetailModal lease={detailLease.lease} info={detailLease.info} onClose={() => setDetailLease(null)} go={go} />
      )}
      {contractPreview && (
        <ContractPreviewModal contract={contractPreview} onClose={() => setContractPreview(null)} />
      )}
      {actionError && !leaseModal && <div className="domus-floating-error">{actionError}</div>}
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
  onClose,
}) {
  const disabled = Boolean(busy);
  const copyReference = async () => {
    try {
      await navigator.clipboard?.writeText?.(info.reference.replace(/^#/, ""));
    } catch {}
    onClose?.();
  };
  const copySigningLink = async () => {
    const link = signingUrlFromContract(contract);
    if (!link) {
      window.alert("Envoyez d'abord le contrat pour obtenir un lien de signature.");
    } else {
      try {
        await navigator.clipboard?.writeText?.(link);
      } catch {
        window.prompt("Copiez le lien de signature :", link);
      }
    }
    onClose?.();
  };

  return (
    <div className={`immo-lease-actions-menu ${dir}`}>
      <div className={`immo-lease-actions-head ${variant}`}>
        <strong>{tenantName(lease)}</strong>
        <span>{LEASE_MENU_HEAD[variant] || "Bail"} · {statusText || (info.variant === "expired" ? "Expiré" : "Actif")}</span>
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
          <hr />
          <button onClick={onEdit}><Pencil size={15} /> Modifier le bail</button>
          {renewable && <button disabled={disabled} onClick={onRenew}><RefreshCw size={15} /> Renouveler</button>}
          {/* Résilier uniquement si le contrat est signé. */}
          <button disabled={disabled} className="danger" onClick={onDelete}><Trash2 size={15} /> Résilier le bail</button>
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
          {/* Bail expiré → renouvellement toujours proposé. */}
          <button disabled={disabled} className="highlight" onClick={onRenew}><RefreshCw size={15} /> Renouveler (nouveau bail)</button>
        </>
      )}
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
        });
        onDone(`Caution de ${money(Number(amount), symbol)} encaissée`);
      } else {
        await api.returnDeposit(lease.id, {
          returnDate: date, deductionAmount: dedNum, deductionReason: reason || null,
          returnMethod: method, notes: notes || null,
        });
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
              <p>{tenantName(lease)} · {[lease.propertyName || lease.propertyAddress, lease.unitName].filter(Boolean).join(" · ") || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="domus-property-form">
          {mode === "collect" ? (
            <section className="domus-form-section">
              <div className="domus-property-form-grid">
                <label className="immo-field"><span>Montant</span>
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
            </section>
          ) : (
            <section className="domus-form-section">
              <div className="immo-pay-row"><span>Caution détenue</span><strong>{money(held, symbol)}</strong></div>
              <div className="domus-property-form-grid">
                <label className="immo-field"><span>Retenue (dégâts)</span>
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
                onChange={(propertyId) => set({ propertyId, unitId: "" })}
                options={properties.map((property) => [String(property.id), property.name || `Propriete #${property.id}`])}
              />
              <LeaseSelect
                label="Unite"
                value={form.unitId}
                required
                onChange={setUnit}
                options={propertyUnits.map((unit) => [String(unit.id), unitLabel(unit, properties)])}
              />
            </div>
            <LeaseSelect
              label="Locataire"
              value={form.tenantId}
              required
              onChange={(tenantId) => set({ tenantId })}
              options={tenants.map((tenant) => [String(tenant.id), tenantLabel(tenant)])}
            />
          </section>

          <section className="domus-form-section">
            <h3><RefreshCw size={14} /> Periode</h3>
            <div className="domus-property-form-grid three">
              <LeaseField label="Debut" type="date" value={form.startDate} required onChange={(startDate) => set({ startDate })} />
              <LeaseField label="Fin" type="date" value={form.endDate} onChange={(endDate) => set({ endDate })} />
              <LeaseField label="Prochaine facture" type="date" value={form.nextInvoiceDate} onChange={(nextInvoiceDate) => set({ nextInvoiceDate })} />
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

        {error && <div className="api-error">{error}</div>}
        <div className="domus-modal-footer">
          <button className="domus-modal-cancel" onClick={onClose} disabled={busy}>Annuler</button>
          <div>
            <button className="domus-modal-submit" onClick={() => onSave(form)} disabled={busy || !canSaveLease(form)}>
              <Check size={14} /> {busy ? "Enregistrement..." : form.id ? "Enregistrer" : "Creer le bail"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaseDetailModal({ lease, info, onClose, go }) {
  const rows = [
    ["Reference", info.reference],
    ["Locataire", tenantName(lease)],
    ["Bien", info.propertyLabel],
    ["Debut", fmtDate(info.start)],
    ["Fin", fmtDate(info.end)],
    ["Loyer", `${money(lease.rentAmount, lease.currencySymbol || "$")}/mois`],
    ["Depot", money(lease.securityDeposit || 0, lease.currencySymbol || "$")],
    ["Statut", info.statusText],
  ];

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-action-modal">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><Eye size={20} /></span>
            <div>
              <h2>Detail du bail</h2>
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
        {go && (
          <div className="domus-detail-actions">
            <button className="immo-btn" onClick={() => { onClose(); go("loyers"); }}><Receipt size={15} /> Voir les paiements</button>
            <button className="immo-btn" onClick={() => { onClose(); go("maintenance"); }}><Wrench size={15} /> Tickets maintenance</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractPreviewModal({ contract, onClose }) {
  const raw = contract.contractContent || "";
  // Texte brut (sans balises) → on préserve les sauts de ligne (articles séparés)
  // au lieu de tout coller. Sinon on rend le HTML tel quel.
  const body = raw
    ? (hasHtmlMarkup(raw) ? raw : `<pre class="domus-contract-plain">${escapeHtml(raw)}</pre>`)
    : "<p>Aucun contenu de contrat.</p>";
  const statusLabel = (CONTRACT_STATUS[contract.status] || {}).label || contract.status || "Contrat";
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
        <div
          className="domus-contract-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(`${body}${contractSignaturesHtml(contract)}`) }}
        />
      </div>
    </div>
  );
}

function LeaseField({ label, value, onChange, type = "text", placeholder = "", required = false, textarea = false }) {
  return (
    <label className="domus-property-field">
      <span>{label}{required ? <b> *</b> : null}</span>
      {textarea ? (
        <textarea value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
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
  return Boolean(form.propertyId && form.unitId && form.tenantId && form.startDate && form.rentAmount !== "" && Number(form.rentAmount) >= 0);
}

function leaseToForm(lease) {
  return {
    id: lease.id,
    propertyId: lease.propertyId ? String(lease.propertyId) : "",
    unitId: lease.unitId ? String(lease.unitId) : "",
    tenantId: lease.tenantId ? String(lease.tenantId) : "",
    startDate: dateOnly(lease.startDate) || todayISO(),
    endDate: dateOnly(lease.endDate),
    nextInvoiceDate: dateOnly(lease.nextInvoiceDate) || dateOnly(lease.startDate) || todayISO(),
    billingCycle: lease.billingCycle || "monthly",
    rentAmount: lease.rentAmount ?? "",
    securityDeposit: lease.securityDeposit ?? "",
    currencyId: lease.currencyId,
    status: lease.status || "active",
    terms: lease.terms || "",
    moveInNotes: lease.moveInNotes || "",
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
    startDate: form.startDate,
    endDate: form.endDate || null,
    nextInvoiceDate: form.nextInvoiceDate || form.startDate,
    billingCycle: form.billingCycle || "monthly",
    rentAmount: toNumber(form.rentAmount),
    securityDeposit: toNumber(form.securityDeposit),
    ...(form.currencyId ? { currencyId: toNumber(form.currencyId) } : {}),
    terms: form.terms || null,
    moveInNotes: form.moveInNotes || null,
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

async function handleContractDownload(lease, contractsByLease, setBusyAction, setActionError, reload) {
  setBusyAction(`download-${lease.id}`);
  setActionError("");
  try {
    const contract = await ensureContract(lease, contractsByLease);
    downloadSignedContractPdf(contract);
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de telecharger le contrat.");
  } finally {
    setBusyAction("");
  }
}

async function handleRenewLease(lease, setBusyAction, setActionError, reload) {
  const ok = window.confirm(`Renouveler le bail ${lease.reference || lease.id} pour 12 mois ?`);
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

async function handleResendContract(contract, setBusyAction, setActionError, reload) {
  if (!contract?.id) {
    setActionError("Aucun contrat à renvoyer.");
    return;
  }
  setBusyAction(`resend-${contract.id}`);
  setActionError("");
  try {
    const res = await api.sendContract(contract.id);
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

async function handleCancelContract(contract, setBusyAction, setActionError, reload) {
  if (!contract?.id) {
    setActionError("Aucun envoi à annuler.");
    return;
  }
  const ok = window.confirm("Annuler l'envoi du contrat ? Le locataire ne pourra plus le signer via ce lien.");
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

async function handleDeleteLease(lease, setBusyAction, setActionError, reload) {
  const ok = window.confirm(`Resilier le bail ${lease.reference || lease.id} ?`);
  if (!ok) return;
  setBusyAction(`delete-${lease.id}`);
  setActionError("");
  try {
    await api.deleteLease(lease.id);
    await reload();
  } catch (e) {
    setActionError(e.message || "Impossible de resilier le bail.");
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

function unitLabel(unit, properties) {
  const property = properties.find((item) => String(item.id) === String(unit.propertyId));
  return [property?.name || unit.propertyName, unit.name || unit.code || `Unite #${unit.id}`].filter(Boolean).join(" · ");
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
