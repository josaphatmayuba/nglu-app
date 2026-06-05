// SCRUM-249 — Espace locataire (vue portail + prévisualisation gestionnaire).
import { useEffect, useMemo, useState } from "react";
import {
  Download, FileSignature, Folder, History, LifeBuoy, MessageCircle,
  Receipt, Smartphone, Wrench, X, FileCheck, ChevronDown,
} from "lucide-react";
import { api } from "../api.js";
import { filterLeases, filterPayments, filterTenants, parseDomusDate, useDateRange } from "../dateRange.jsx";
import { money, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { buildLeaseCards } from "./loyers.jsx";

const STORAGE_TENANT = "domus-portail-tenant-id";
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function tenantLabel(t) {
  const n = [t?.firstName, t?.lastName].filter(Boolean).join(" ").trim();
  return n || t?.entityName || t?.username || `Locataire #${t?.id}`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NA";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function formatGreeting(name) {
  const n = String(name || "").trim();
  return n ? `Bonjour, ${n}` : "Bonjour";
}

function monthLabel(dateLike) {
  const d = parseDomusDate(dateLike);
  if (!d) return "—";
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function daysUntil(dateLike) {
  const d = parseDomusDate(dateLike);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function dueChip(days) {
  if (days == null) return { text: "Échéance à confirmer", chip: "chip-ink" };
  if (days < 0) return { text: `en retard de ${Math.abs(days)} j`, chip: "chip-rose" };
  if (days === 0) return { text: "dû aujourd'hui", chip: "chip-amber" };
  return { text: `dû dans ${days} j`, chip: "chip-amber" };
}

async function loadPortailModule() {
  const [tenants, leases, payments, contracts, currencies, setting] = await Promise.all([
    api.tenants(),
    api.leases(),
    api.payments(),
    api.contracts(),
    api.currencies(),
    api.setting(),
  ]);
  return { tenants, leases, payments, contracts, currencies, setting };
}

export function Portail({ go }) {
  const { data, loading, error, reload } = useApi(loadPortailModule, []);
  useRealtimeReload(reload, ["tenants", "leases", "payments", "contracts"]);
  const dateRange = useDateRange();

  const tenants = useMemo(() => filterTenants(Array.isArray(data?.tenants) ? data.tenants : [], dateRange), [data?.tenants, dateRange]);
  const leases = useMemo(
    () => filterLeases(Array.isArray(data?.leases) ? data.leases : [], dateRange),
    [data?.leases, dateRange],
  );
  const payments = useMemo(
    () => filterPayments(Array.isArray(data?.payments) ? data.payments : [], dateRange),
    [data?.payments, dateRange],
  );
  const contracts = useMemo(() => (Array.isArray(data?.contracts) ? data.contracts : []), [data]);
  const currency = useMemo(() => normalizeCurrencyModule(data?.currencies, data?.setting), [data]);

  const [tenantId, setTenantId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_TENANT) || "";
    } catch {
      return "";
    }
  });
  const [contractPreview, setContractPreview] = useState(null);

  const tenantOptions = useMemo(
    () => tenants
      .map((t) => ({ id: String(t.id), label: tenantLabel(t) }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr")),
    [tenants],
  );

  useEffect(() => {
    if (tenantId || !tenantOptions.length) return;
    setTenantId(tenantOptions[0].id);
  }, [tenantId, tenantOptions]);

  useEffect(() => {
    if (!tenantId) return;
    try {
      localStorage.setItem(STORAGE_TENANT, tenantId);
    } catch {}
  }, [tenantId]);

  const tenant = tenants.find((t) => String(t.id) === String(tenantId)) || null;
  const tenantLeases = leases.filter((l) => String(l.tenantId) === String(tenantId));
  const activeLease = tenantLeases.find((l) => (l.status || "active") === "active") || tenantLeases[0] || null;

  const leasePayments = useMemo(
    () => (activeLease
      ? payments.filter((p) => String(p.leaseId) === String(activeLease.id))
      : []),
    [payments, activeLease],
  );

  const card = useMemo(() => {
    if (!activeLease) return null;
    const cards = buildLeaseCards([activeLease], payments);
    return cards[0] || null;
  }, [activeLease, payments]);

  const dueDate = activeLease?.nextInvoiceDate || activeLease?.endDate || null;
  const dueDays = daysUntil(dueDate);
  const due = dueChip(dueDays);

  const leaseContracts = useMemo(
    () => contracts.filter((c) => activeLease && String(c.leaseId) === String(activeLease.id)),
    [contracts, activeLease],
  );

  const documents = useMemo(() => {
    const docs = [];
    leaseContracts.forEach((c) => {
      docs.push({
        id: `contract-${c.id}`,
        kind: "contract",
        title: `Bail ${c.reference ? `#${c.reference}` : `#${c.id}`}`,
        sub: c.status || "Contrat",
        contract: c,
      });
    });
    [...leasePayments]
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
      .slice(0, 6)
      .forEach((p) => {
        docs.push({
          id: `receipt-${p.id}`,
          kind: "receipt",
          title: `Quittance — ${monthLabel(p.paymentDate)}`,
          sub: p.method || "Paiement",
          payment: p,
        });
      });
    return docs;
  }, [leaseContracts, leasePayments]);

  const history = useMemo(
    () => [...leasePayments]
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
      .slice(0, 8),
    [leasePayments],
  );

  const payRent = () => {
    if (!activeLease?.id) return;
    try {
      sessionStorage.setItem("domus-pay-lease-id", String(activeLease.id));
    } catch {}
    go("paiement");
  };

  const contactManager = () => {
    const email = data?.setting?.email || data?.setting?.contactEmail;
    const phone = data?.setting?.phone || data?.setting?.contactPhone;
    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent("Message locataire Domus")}`;
      return;
    }
    if (phone) {
      window.location.href = `tel:${phone}`;
      return;
    }
    window.alert("Coordonnées du gestionnaire non configurées dans les réglages.");
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const name = tenant ? tenantLabel(tenant) : "Locataire";
  const unit = activeLease
    ? [activeLease.propertyName || activeLease.propertyAddress, activeLease.unitName].filter(Boolean).join(" · ")
    : "Aucun bail actif";

  return (
    <>
      <div className="portail-preview-banner">
        <span>Vue gestionnaire</span>
        <label className="portail-tenant-pick">
          <span className="muted" style={{ fontSize: 12 }}>Locataire</span>
          <div className="portail-tenant-select">
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              {tenantOptions.length === 0 && <option value="">Aucun locataire</option>}
              {tenantOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden />
          </div>
        </label>
      </div>

      <div className="portail-hero grad-iris">
        <div>
          <div className="portail-hero-eyebrow">Espace locataire</div>
          <h1 className="portail-hero-title">{formatGreeting(name)}</h1>
          <div className="portail-hero-sub">{unit}</div>
        </div>
        <div className="portail-hero-avatar">{initials(name)}</div>
      </div>

      {!activeLease ? (
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Ce locataire n&apos;a pas de bail sur la période sélectionnée. Choisissez « Tout » dans le filtre de dates ou un autre locataire.
          </p>
        </div>
      ) : (
        <>
          <div className="portail-main-grid">
            <div className="card portail-rent-card">
              <div className="portail-rent-head">
                <span className="kpi-label">Prochain loyer</span>
                <span className={`chip ${due.chip}`}>{due.text}</span>
              </div>
              <div className="portail-rent-amount">
                {money(activeLease.rentAmount, card?.symbol || activeLease.currencySymbol || currency.defaultCurrencySymbol)}
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                {dueDate
                  ? `Échéance ${parseDomusDate(dueDate)?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Date d'échéance non renseignée"}
                {card?.status === "ok" && <span> · À jour</span>}
                {card?.status === "pending" && <span> · Mois en cours à régler</span>}
                {card?.status === "late" && <span style={{ color: "#be123c" }}> · Retard</span>}
              </div>
              <button type="button" className="portail-pay-btn" onClick={payRent}>
                <Smartphone size={16} /> Payer par mobile money
              </button>
            </div>

            <div className="card portail-help-card">
              <h3 className="portail-card-title"><LifeBuoy size={16} color="var(--iris-500)" /> Aide</h3>
              <button type="button" className="portail-outline-btn" onClick={() => go("maintenance")}>
                <Wrench size={16} color="#d97706" /> Déclarer une panne
              </button>
              <button type="button" className="portail-outline-btn" onClick={contactManager}>
                <MessageCircle size={16} color="var(--iris-500)" /> Contacter le gestionnaire
              </button>
            </div>
          </div>

          <div className="portail-docs-grid">
            <div className="card portail-panel">
              <h3 className="portail-card-title"><Folder size={16} /> Mes documents</h3>
              {documents.length === 0 && (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>Aucun document pour cette période.</p>
              )}
              <div className="portail-doc-list">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className="portail-doc-row"
                    onClick={() => {
                      if (doc.kind === "contract" && doc.contract) setContractPreview(doc.contract);
                    }}
                  >
                    {doc.kind === "contract"
                      ? <FileSignature size={16} color="var(--iris-500)" />
                      : <Receipt size={16} color="#059669" />}
                    <span className="portail-doc-label">
                      <span>{doc.title}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{doc.sub}</span>
                    </span>
                    {doc.kind === "contract" && <Download size={16} className="muted" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="card portail-panel">
              <h3 className="portail-card-title"><History size={16} /> Historique</h3>
              {history.length === 0 && (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>Aucun paiement sur la période.</p>
              )}
              <div className="portail-hist-list">
                {history.map((p) => (
                  <div key={p.id} className="portail-hist-row">
                    <span className="portail-hist-dot" />
                    <span className="flex-1">{monthLabel(p.paymentDate)}</span>
                    <span className="muted">{p.method || "—"}</span>
                    <strong>{money(p.amount, p.currencySymbol || card?.symbol || "$")}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {contractPreview && (
        <ContractPreviewModal contract={contractPreview} onClose={() => setContractPreview(null)} />
      )}
    </>
  );
}

function ContractPreviewModal({ contract, onClose }) {
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card domus-action-modal domus-contract-preview">
        <div className="modal-head">
          <div className="domus-modal-title">
            <span className="domus-modal-title-icon"><FileCheck size={20} /></span>
            <div>
              <h2>Contrat de bail</h2>
              <p>{contract.status || "Document"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div
          className="domus-contract-content"
          dangerouslySetInnerHTML={{ __html: contract.contractContent || "<p>Aucun contenu de contrat.</p>" }}
        />
      </div>
    </div>
  );
}
