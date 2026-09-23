import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Download, Plus, Check, Clock, Smartphone, ArrowRight, ArrowLeft,
  Banknote, BellRing, CheckCircle2, FileDown, Send, List, Users, CalendarRange, X, AlertTriangle, Search,
} from "lucide-react";
import { api } from "../api.js";
import { t, tf } from "../i18n.js";
import { filterLeases, filterPayments, useDateRange } from "../dateRange.jsx";
import { groupAmountsByCurrency, money, normalizeCurrencyModule, paymentMethodRows, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { MoneyStack } from "./ui.jsx";
import { Loading, ApiError } from "./dashboard.jsx";
import { useToast } from "../components/Dialog.jsx";

// Liste par défaut (repli) si aucun moyen de paiement n'est configuré côté backend.
const METHODS = [
  { key: "cash", label: "Espèces", color: "#475569", short: "FC" },
  { key: "mpesa", label: "M-Pesa", color: "#ef4444", short: "M-P", mobile: true },
  { key: "airtel", label: "Airtel", color: "#dc2626", short: "A", mobile: true },
  { key: "orange", label: "Orange", color: "#f59e0b", short: "O", mobile: true },
  { key: "bank", label: "Bancaire", color: "#2563eb", short: "BQ" },
  { key: "card", label: "Carte", color: "#0d9488", short: "CB" },
  { key: "cheque", label: "Chèque", color: "#7c3aed", short: "CH" },
];

// Construit la liste UI des moyens de paiement à partir de la config backend
// (/payment-method). Réutilise les jolis styles de METHODS pour les noms connus
// (M-Pesa, Airtel…), dérive couleur/abréviation/flag mobile pour les autres.
// Repli sur METHODS si rien n'est actif (app utilisable même sans config).
function uiMethodsFrom(raw) {
  const rows = paymentMethodRows(raw).filter((m) => m.active);
  if (!rows.length) return METHODS;
  return rows.map((m) => {
    const known = METHODS.find((d) => d.label.toLowerCase() === m.name.toLowerCase());
    return known || { key: String(m.id), label: m.name, color: m.color, short: m.short, mobile: m.mobile };
  });
}
const tenantName = (r) => [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire";
const today = () => new Date().toISOString().slice(0, 10);
// N° de reçu auto-généré (modifiable) : REC-AAMMJJ-HHMM.
const genReceiptRef = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `REC-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const PAY_AVATARS = ["av-indigo", "av-orange", "av-violet", "av-blue", "av-rose", "av-green"];
const BAR_MONTHS = 12;

const initials = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("") : "NA";
};
const monthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}`; };

// Les N derniers mois (le plus récent à droite), comme objets Date au 1er du mois.
const lastMonths = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  return out;
};

// N mois à partir d'une date de début (le plus ancien à gauche → la frise se
// remplit de gauche à droite au fil du bail).
const monthsFrom = (startDate, n) => {
  const out = [];
  const s = new Date(startDate);
  for (let i = 0; i < n; i++) out.push(new Date(s.getFullYear(), s.getMonth() + i, 1));
  return out;
};

// Regroupe les paiements par locataire et calcule l'unité + le dernier paiement.
function groupByTenant(rows) {
  const map = new Map();
  rows.forEach((p) => {
    const name = tenantName(p);
    if (!map.has(name)) map.set(name, { name, unit: null, list: [] });
    const g = map.get(name);
    g.list.push(p);
    if (!g.unit) g.unit = [p.propertyName, p.unitName].filter(Boolean).join(" · ") || null;
  });
  return [...map.values()];
}

// Construit une carte par bail actif, enrichie des paiements de ce bail.
// status : "late" (un mois PASSÉ impayé) · "pending" (mois courant impayé,
// en attente) · "ok" (à jour).
export function buildLeaseCards(leases, payments) {
  const now = new Date();
  const thisM = new Date(now.getFullYear(), now.getMonth(), 1);
  return leases
    .filter((l) => (l.status || "active") === "active")
    .map((l) => {
      const list = payments.filter((p) => String(p.leaseId) === String(l.id));
      // Seules les échéances réellement réglées comptent pour la couverture/frise ;
      // les "pending" (générées auto sur bail rétroactif, pas encore confirmées) ne
      // doivent pas être comptées comme payées.
      const paidList = list.filter((p) => p.status !== "pending");
      const paidMonths = new Set(paidList.map((p) => p.paymentDate && monthKey(p.paymentDate)).filter(Boolean));
      const latest = [...paidList].sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))[0] || null;

      // Couverture par MONTANT : le total payé / loyer mensuel = nb de mois couverts,
      // rempli du début du bail vers le présent. Régler le montant total fait avancer
      // la couverture et met donc le statut à jour (corrige « reste en retard apres paiement »).
      const rent = Number(l.rentAmount) || 0;
      const totalPaid = paidList.reduce((s, p) => s + Number(p.amount || 0), 0);
      const monthsCovered = rent > 0 ? Math.floor((totalPaid + 0.0001) / rent) : list.length;
      // Couverture fractionnaire : un paiement partiel (ex. 50 sur 100) remplit une demi-case.
      const monthsCoveredFloat = rent > 0 ? totalPaid / rent : monthsCovered;

      // Nombre de mois échus AVANT le mois courant (depuis le début du bail).
      let elapsedPast = 0;
      if (l.startDate) {
        const s = new Date(l.startDate);
        const sM = new Date(s.getFullYear(), s.getMonth(), 1);
        elapsedPast = Math.max(0, (thisM.getFullYear() - sM.getFullYear()) * 12 + (thisM.getMonth() - sM.getMonth()));
      }
      // late = un mois passé encore non couvert · pending = passés couverts mais pas le mois courant · ok = tout couvert.
      const status = monthsCovered >= elapsedPast + 1 ? "ok" : monthsCovered >= elapsedPast ? "pending" : "late";

      // Solde réel : total exigible (mois courant inclus) − total déjà versé.
      // Gère les paiements partiels : 2 mois dus à 100, 50 versé → reste 150.
      const monthsDue = elapsedPast + 1;
      const totalDue = monthsDue * rent;
      const balance = Math.max(0, Math.round((totalDue - totalPaid) * 100) / 100);
      const credit = Math.max(0, Math.round((totalPaid - totalDue) * 100) / 100); // avance éventuelle
      const monthsBehind = Math.max(0, monthsDue - monthsCovered); // mois entiers encore dus
      const monthsAhead = Math.max(0, monthsCovered - monthsDue);  // mois payés d'avance
      // Mois jusqu'auquel le loyer est couvert (dernier mois plein payé).
      let coveredUntil = null;
      if (l.startDate && monthsCovered > 0) {
        const s = new Date(l.startDate);
        coveredUntil = new Date(s.getFullYear(), s.getMonth() + monthsCovered - 1, 1);
      }

      return {
        lease: l,
        name: tenantName(l),
        unit: [l.propertyName || l.propertyAddress, l.unitName].filter(Boolean).join(" · ") || null,
        rent: l.rentAmount,
        currencyId: l.currencyId,
        symbol: l.currencySymbol || latest?.currencySymbol || "$",
        paidMonths,
        monthsCovered,
        monthsCoveredFloat,
        monthsDue,
        totalDue,
        balance,
        credit,
        monthsBehind,
        monthsAhead,
        coveredUntil,
        totalPaid,
        latest,
        status,
        list,
      };
    });
}

// Carte « Par locataire » : frise de 12 mois (vert = mois payé) + paiement direct du retard.
const STATUS_META = {
  ok: { pill: "success", label: "À jour", color: undefined, rowLabel: "Dernier paiement" },
  pending: { pill: "warning", label: "En attente", color: "#d97706", rowLabel: "Échéance ce mois" },
  late: { pill: "danger", label: "En retard", color: "#dc2626", rowLabel: "Mois en cours" },
};

function TenantPayCard({ card, index, onPay, onGenerateMissing, generating = false }) {
  const { name, unit, paidMonths, monthsCovered, monthsCoveredFloat, status = "ok", latest, rent, symbol, lease, balance = 0, credit = 0, monthsBehind = 0, monthsAhead = 0, coveredUntil = null, list = [] } = card;
  // Des echeances manquantes existent si le bail a des mois en retard ET
  // qu'aucune ligne pending n'a deja ete generee pour couvrir ces mois-la
  // (sinon on duplique l'action : il suffit de confirmer les pending existantes).
  const hasPending = list.some((p) => p.status === "pending");
  const missingMonths = monthsBehind > 0 && Boolean(lease) && !hasPending;
  const coveredUntilLabel = coveredUntil
    ? coveredUntil.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;
  const meta = STATUS_META[status] || STATUS_META.ok;
  const actionable = status !== "ok";
  // Frise ancrée sur le début du bail → se remplit de gauche à droite dans le temps.
  const slots = lease?.startDate ? monthsFrom(lease.startDate, BAR_MONTHS) : lastMonths(BAR_MONTHS);
  const latestDate = latest?.paymentDate
    ? new Date(latest.paymentDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  // vert = payé (couvert par les montants) · jaune = mois courant en attente · rouge = mois passé impayé · gris = futur.
  // Pour un bail, on colore par COUVERTURE FRACTIONNAIRE (de gauche à droite) : un paiement
  // partiel remplit la case proportionnellement (ex. 50 sur 100 → demi-case verte).
  const segMeta = (d, i) => {
    const coveredFloat = lease && monthsCoveredFloat != null ? monthsCoveredFloat : (paidMonths.has(monthKey(d)) ? i + 1 : i);
    const fill = Math.max(0, Math.min(1, coveredFloat - i));
    const m = new Date(d.getFullYear(), d.getMonth(), 1);
    let base = "";
    if (lease) base = m > thisMonth ? "" : m.getTime() === thisMonth.getTime() ? "pending" : "late";
    return { fill, base };
  };
  const segTitle = { paid: "payé", pending: "en attente", late: "en retard", "": "à venir" };

  return (
    <div className={`immo-pay-card ${status}`}>
      <div className="immo-pay-head">
        <div className="immo-pay-tenant">
          <span className={`mini-avatar ${PAY_AVATARS[index % PAY_AVATARS.length]}`} style={{ width: 40, height: 40, fontSize: 13 }}>{initials(name)}</span>
          <div style={{ minWidth: 0 }}>
            <div className="name">{name}</div>
            <div className="unit">{unit || "—"}</div>
          </div>
        </div>
        <span className={`immo-pill ${meta.pill}`}>{meta.label}</span>
      </div>
      <div className="immo-pay-row">
        <span>{meta.rowLabel}</span>
        <strong style={meta.color ? { color: meta.color } : undefined}>
          {status === "ok" ? latestDate : status === "pending" ? "À régler" : "Non payé"}
        </strong>
      </div>
      <div className="immo-pay-row"><span>Montant mensuel</span><strong>{money(rent ?? latest?.amount, symbol)}</strong></div>
      {actionable && balance > 0 && (
        <div className="immo-pay-row">
          <span>Reste à payer{monthsBehind > 1 ? ` · ${monthsBehind} mois` : ""}</span>
          <strong style={{ color: status === "late" ? "#dc2626" : "#d97706" }}>{money(balance, symbol)}</strong>
        </div>
      )}
      {status === "ok" && credit > 0 && (
        <div className="immo-pay-row">
          <span>Avance{monthsAhead > 0 ? ` · ${monthsAhead} mois` : ""}</span>
          <strong style={{ color: "#16a34a" }}>{money(credit, symbol)}</strong>
        </div>
      )}
      {status === "ok" && monthsAhead > 0 && coveredUntilLabel && (
        <div className="immo-pay-row"><span>Couvert jusqu'à</span><strong style={{ color: "#16a34a", textTransform: "capitalize" }}>{coveredUntilLabel}</strong></div>
      )}
      <div className="immo-pay-bar">
        {slots.map((d, i) => {
          const { fill, base } = segMeta(d, i);
          const full = fill >= 0.999;
          const cls = full ? "paid" : base;
          const title = full ? "payé" : fill > 0 ? `partiel ${Math.round(fill * 100)}%` : segTitle[base];
          return (
            <div key={i} className={`immo-pay-seg ${cls}`}
              title={`${MONTHS_FR[d.getMonth()]} ${d.getFullYear()} — ${title}`}>
              {!full && fill > 0 && <span className="immo-pay-seg-fill" style={{ width: `${Math.round(fill * 100)}%` }} />}
            </div>
          );
        })}
      </div>
      <div className="immo-pay-bar-labels">
        <span>{MONTHS_FR[slots[0].getMonth()]}</span>
        <span>{MONTHS_FR[slots[slots.length - 1].getMonth()]}</span>
      </div>
      {actionable && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="immo-btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onPay(card)}>
            <Smartphone size={16} /> {status === "late" ? "Régler le retard" : "Payer le loyer"}
          </button>
          {missingMonths && (
            <button className="immo-btn" style={{ flex: 1, justifyContent: "center" }} disabled={generating}
              onClick={() => onGenerateMissing?.(card)}>
              <CalendarRange size={16} /> {generating ? "…" : "Générer les échéances"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Mini-modale d'encaissement rapide depuis une carte en retard.
function QuickPayModal({ card, methods = METHODS, onClose, onPaid }) {
  const fullBalance = Number(card.balance) || 0;
  const monthRent = Number(card.rent ?? card.latest?.amount) || 0;
  // Pré-rempli avec le SOLDE réel (gère les retards cumulés + partiels) ; à défaut, un mois.
  const [amount, setAmount] = useState(String(fullBalance || monthRent || ""));
  const [method, setMethod] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const activeKey = method ?? methods[0]?.key;

  const submit = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const m = methods.find((x) => x.key === activeKey);
      await api.createPayment({
        leaseId: card.lease.id,
        paymentDate: today(),
        amount: Number(amount),
        method: m?.label || method,
        reference: null,
        ...(card.currencyId ? { currencyId: Number(card.currencyId) } : {}),
      }, proofFile);
      onPaid(`Paiement de ${money(Number(amount), card.symbol)} enregistré pour ${card.name}`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="immo-modal-scrim" onClick={onClose}>
      <div className="immo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="immo-modal-head">
          <div>
            <div className="eyebrow">Encaissement rapide</div>
            <h3>{t("Régler le loyer en retard")}</h3>
          </div>
          <button className="immo-flat-icon" onClick={onClose} aria-label={t("Fermer")}><X size={16} /></button>
        </div>
        <div className="immo-modal-body">
          <div className="immo-pay-row"><span>Locataire</span><strong>{card.name}</strong></div>
          <div className="immo-pay-row"><span>Logement</span><strong>{card.unit || "—"}</strong></div>
          {fullBalance > 0 && (
            <div className="immo-pay-row">
              <span>Solde dû{card.monthsBehind > 1 ? ` (${card.monthsBehind} mois)` : ""}</span>
              <strong style={{ color: "#dc2626" }}>{money(fullBalance, card.symbol)}</strong>
            </div>
          )}
          <label className="immo-field-label">Montant</label>
          {(fullBalance > 0 || monthRent > 0) && (
            <div className="immo-quickpay-chips">
              {fullBalance > 0 && (
                <button type="button" className={Number(amount) === fullBalance ? "active" : ""} onClick={() => setAmount(String(fullBalance))}>
                  Tout le solde · {money(fullBalance, card.symbol)}
                </button>
              )}
              {monthRent > 0 && (
                <button type="button" className={Number(amount) === monthRent ? "active" : ""} onClick={() => setAmount(String(monthRent))}>
                  1 mois · {money(monthRent, card.symbol)}
                </button>
              )}
            </div>
          )}
          <input className="immo-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          {fullBalance > 0 && Number(amount) > 0 && Number(amount) < fullBalance && (
            <p className="immo-quickpay-note">Paiement partiel — il restera {money(fullBalance - Number(amount), card.symbol)} à régler.</p>
          )}
          <label className="immo-field-label">Moyen de paiement</label>
          <div className="immo-method-grid">
            {methods.map((m) => (
              <button key={m.key} type="button" className={`immo-method ${activeKey === m.key ? "active" : ""}`} onClick={() => setMethod(m.key)}>
                <span className="immo-method-badge" style={{ background: m.color }}>{m.short}</span>
                {m.label}
              </button>
            ))}
          </div>
          <label className="immo-field-label">Preuve de paiement (optionnel)</label>
          <input
            id="quickpay-proof-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="quickpay-proof-input" className="immo-btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <FileDown size={16} />
            {proofFile ? proofFile.name : "Photo, scan ou capture (JPEG, PNG, PDF)"}
          </label>
          {proofFile && (
            <button type="button" className="immo-btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setProofFile(null)}>
              <X size={14} /> Retirer le fichier
            </button>
          )}
          {err && <div className="api-error" style={{ marginTop: 10 }}>{err}</div>}
        </div>
        <div className="immo-modal-foot">
          <button className="immo-btn" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="immo-btn primary" onClick={submit} disabled={busy || !amount}>
            {busy ? "Encaissement…" : <><Check size={16} /> Confirmer le paiement</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mini-modale de confirmation d'une échéance pending (générée par
// generate-missing-payments). Contrairement à QuickPayModal, la date par
// défaut est celle DU MOIS CONCERNÉ (pas today()) — l'échéance de janvier
// doit se confirmer avec une date de janvier, éditable par l'utilisateur.
function ConfirmPayModal({ payment, methods = METHODS, onClose, onConfirmed }) {
  const [amount, setAmount] = useState(String(payment.amount ?? ""));
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
    return d.toISOString().slice(0, 10);
  });
  const [method, setMethod] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const activeKey = method ?? methods[0]?.key;
  const tenant = tenantName(payment);

  const submit = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const m = methods.find((x) => x.key === activeKey);
      await api.confirmPayment(payment.id, {
        paymentDate,
        amount: Number(amount),
        method: m?.label || method,
        reference: null,
        ...(payment.currencyId ? { currencyId: Number(payment.currencyId) } : {}),
      }, proofFile);
      onConfirmed(`Paiement de ${money(Number(amount), payment.currencySymbol)} confirmé pour ${tenant}`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="immo-modal-scrim" onClick={onClose}>
      <div className="immo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="immo-modal-head">
          <div>
            <div className="eyebrow">Confirmation d'échéance</div>
            <h3>{t("Confirmer le paiement")}</h3>
          </div>
          <button className="immo-flat-icon" onClick={onClose} aria-label={t("Fermer")}><X size={16} /></button>
        </div>
        <div className="immo-modal-body">
          <div className="immo-pay-row"><span>Locataire</span><strong>{tenant}</strong></div>
          <div className="immo-pay-row"><span>Logement</span><strong>{[payment.propertyName, payment.unitName].filter(Boolean).join(" · ") || "—"}</strong></div>
          <label className="immo-field-label">Date du paiement</label>
          <input className="immo-input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <label className="immo-field-label">Montant</label>
          <input className="immo-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          <label className="immo-field-label">Moyen de paiement</label>
          <div className="immo-method-grid">
            {methods.map((m) => (
              <button key={m.key} type="button" className={`immo-method ${activeKey === m.key ? "active" : ""}`} onClick={() => setMethod(m.key)}>
                <span className="immo-method-badge" style={{ background: m.color }}>{m.short}</span>
                {m.label}
              </button>
            ))}
          </div>
          <label className="immo-field-label">Preuve de paiement (optionnel)</label>
          <input
            id="confirmpay-proof-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="confirmpay-proof-input" className="immo-btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <FileDown size={16} />
            {proofFile ? proofFile.name : "Photo, scan ou capture (JPEG, PNG, PDF)"}
          </label>
          {proofFile && (
            <button type="button" className="immo-btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setProofFile(null)}>
              <X size={14} /> Retirer le fichier
            </button>
          )}
          {err && <div className="api-error" style={{ marginTop: 10 }}>{err}</div>}
        </div>
        <div className="immo-modal-foot">
          <button className="immo-btn" onClick={onClose} disabled={busy}>Annuler</button>
          <button className="immo-btn primary" onClick={submit} disabled={busy || !amount || !paymentDate}>
            {busy ? "Confirmation…" : <><Check size={16} /> Confirmer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── LOYERS (liste) ───────────────────────────
async function loadPaymentsModule() {
  const [payments, leases, currencies, setting, paymentMethods, delegateChecks] = await Promise.all([
    api.payments(),
    api.leases(),
    api.currencies(),
    api.setting(),
    api.paymentMethods().catch(() => []),
    // Reponses des delegues aux relances de retard. Tolerant a l'echec : un
    // backend anterieur a la feature ne doit pas casser l'ecran Loyers.
    api.delegateRentChecks().catch(() => []),
  ]);
  return { payments, leases, currencies, setting, paymentMethods, delegateChecks };
}

export function Loyers({ go }) {
  const { data, loading, error, reload } = useApi(loadPaymentsModule, []);
  useRealtimeReload(reload, ["payments", "leases"]);
  const dateRange = useDateRange();
  const toast = useToast();
  const leases = useMemo(
    () => filterLeases(Array.isArray(data?.leases) ? data.leases : [], dateRange),
    [data?.leases, dateRange],
  );
  const rows = useMemo(() => {
    const leaseIds = new Set(leases.map((lease) => lease.id));
    return filterPayments(Array.isArray(data?.payments) ? data.payments : [], dateRange)
      .filter((payment) => leaseIds.has(payment.leaseId));
  }, [data?.payments, dateRange, leases]);
  const currency = useMemo(() => normalizeCurrencyModule(data?.currencies, data?.setting), [data]);
  const methods = useMemo(() => uiMethodsFrom(data?.paymentMethods), [data?.paymentMethods]);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);
  const totalByCurrency = useMemo(
    () => groupAmountsByCurrency(rows, (row) => row.amount, currency.defaultCurrencySymbol),
    [rows, currency.defaultCurrencySymbol],
  );
  const [view, setView] = useState("locataire");
  const [payTarget, setPayTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [generatingLeaseId, setGeneratingLeaseId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [query, setQuery] = useState("");

  // Seules les relances auxquelles le delegue a repondu sont montrees : une
  // relance sans reponse n'apprend rien au gestionnaire, qui voit deja
  // l'impaye dans la liste.
  const delegateChecks = useMemo(
    () => (Array.isArray(data?.delegateChecks) ? data.delegateChecks : []).filter((c) => c.answer),
    [data?.delegateChecks],
  );

  // Cartes par bail actif (détection du retard). Fallback : regroupement par
  // paiements si aucun bail n'est renvoyé par l'API (pas de paiement direct).
  const cards = useMemo(() => {
    if (leases.length) return buildLeaseCards(leases, rows);
    return groupByTenant(rows).map((g) => ({
      lease: null, name: g.name, unit: g.unit, rent: g.list[0]?.amount,
      currencyId: g.list[0]?.currencyId,
      symbol: g.list[0]?.currencySymbol || "$",
      paidMonths: new Set(g.list.map((p) => p.paymentDate && monthKey(p.paymentDate)).filter(Boolean)),
      latest: [...g.list].sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))[0] || null,
      status: "ok",
    }));
  }, [leases, rows]);
  const lateCount = cards.filter((c) => c.status === "late").length;
  const pendingCount = cards.filter((c) => c.status === "pending").length;
  // Total des arriérés (reste à payer cumulé), groupé par devise.
  const arrearsByCurrency = useMemo(() => {
    const map = new Map();
    cards.forEach((c) => {
      const bal = Number(c.balance) || 0;
      if (bal <= 0) return;
      const sym = c.symbol || currency.defaultCurrencySymbol || "$";
      map.set(sym, (map.get(sym) || 0) + bal);
    });
    return [...map.entries()].map(([symbol, amount]) => ({ symbol, amount }));
  }, [cards, currency.defaultCurrencySymbol]);
  const hasArrears = arrearsByCurrency.length > 0;

  // Recherche : filtre cartes (locataire/unité) et lignes (locataire/logement/méthode).
  const shownCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => [c.name, c.unit].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [cards, query]);
  const shownRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => [tenantName(p), p.propertyName, p.unitName, p.method].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rows, query]);

  const handlePaid = (msg) => {
    setPayTarget(null);
    setFlash(msg);
    reload();
    setTimeout(() => setFlash(null), 4000);
  };

  const handleConfirmed = (msg) => {
    setConfirmTarget(null);
    setFlash(msg);
    reload();
    setTimeout(() => setFlash(null), 4000);
  };

  const handleGenerateMissing = async (card) => {
    if (!card.lease?.id || generatingLeaseId) return;
    setGeneratingLeaseId(card.lease.id);
    try {
      const res = await api.generateMissingPayments(card.lease.id);
      const createdCount = res?.createdCount ?? 0;
      toast.success(
        createdCount > 0
          ? tf(t("{n} échéance(s) manquante(s) générée(s)."), { n: createdCount })
          : t("Aucune échéance manquante à générer."),
      );
      await reload();
    } catch (e) {
      toast.error(e.message || String(e));
    } finally {
      setGeneratingLeaseId(null);
    }
  };

  // Calendrier : 12 mois glissants, total encaissé + nb de paiements par mois.
  const calendar = useMemo(() => lastMonths(BAR_MONTHS).map((d) => {
    const inMonth = rows.filter((p) => p.paymentDate && monthKey(p.paymentDate) === monthKey(d));
    return {
      date: d,
      count: inMonth.length,
      amount: inMonth.reduce((s, p) => s + Number(p.amount || 0), 0),
      amountsByCurrency: groupAmountsByCurrency(inMonth, (p) => p.amount, currency.defaultCurrencySymbol),
      symbol: inMonth[0]?.currencySymbol || "$",
    };
  }), [rows, currency.defaultCurrencySymbol]);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const VIEWS = [
    { key: "liste", label: "Liste", icon: <List size={15} /> },
    { key: "locataire", label: "Par locataire", icon: <Users size={15} /> },
    { key: "calendrier", label: "Calendrier", icon: <CalendarRange size={15} /> },
  ];

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Loyers & paiements")}</h1>
          <p>Encaissements et suivi des paiements de loyer</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Locataire, logement, methode...")} />
          </label>
          <button className="immo-btn"><Download size={16} /> Export CSV</button>
          <button className="immo-btn primary" onClick={() => go("paiement")}><Smartphone size={16} /> Encaisser</button>
        </div>
      </div>

      <div className="immo-metrics-grid">
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-green"><CheckCircle2 size={20} /></div></div>
          <div className="immo-metric-label">Encaisse (cumul)</div><div className="immo-metric-value" style={{ color: "#059669" }}><MoneyStack rows={totalByCurrency} fallbackSymbol={currency.defaultCurrencySymbol} /></div>
          <div className="immo-metric-helper">{rows.length} paiement(s)</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-brand"><Wallet size={20} /></div></div>
          <div className="immo-metric-label">Paiements</div><div className="immo-metric-value">{rows.length}</div>
          <div className="immo-metric-helper">enregistres</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-amber"><Clock size={20} /></div></div>
          <div className="immo-metric-label">Dernier paiement</div><div className="immo-metric-value">{rows[0] ? money(rows[0].amount, rows[0].currencySymbol || currency.defaultCurrencySymbol) : "—"}</div>
          <div className="immo-metric-helper">{rows[0] ? tenantName(rows[0]) : "aucun"}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-red"><BellRing size={20} /></div></div>
          <div className="immo-metric-label">Arriérés (reste dû)</div>
          <div className="immo-metric-value" style={{ color: hasArrears ? "#dc2626" : undefined }}>
            {hasArrears ? <MoneyStack rows={arrearsByCurrency} fallbackSymbol={currency.defaultCurrencySymbol} /> : "—"}
          </div>
          <button className="immo-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            onClick={() => api.runOverdueReminders().then(() => toast.success(t("Rappels lancés"))).catch((e) => toast.error(e.message))}>
            <BellRing size={16} /> Relancer les impayés
          </button>
        </div>
      </div>

      {delegateChecks.length > 0 && (
        <div className="immo-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Users size={18} />
            <strong>{t("Retours des delegues")}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {t("suivi de loyer confie a un mandataire")}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {delegateChecks.map((c) => {
              const who = [c.tenantFirstName, c.tenantLastName].filter(Boolean).join(" ").trim();
              const paid = c.answer === "paid";
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className={`immo-mini-badge ${paid ? "success" : "warn"}`}>
                    {paid ? t("Paiement declare") : t("Toujours impaye")}
                  </span>
                  <strong>{who || `Bail #${c.leaseId}`}</strong>
                  <span className="muted">{c.propertyName || ""}</span>
                  {paid && c.amount != null ? (
                    <span>{money(c.amount, currency.defaultCurrencySymbol)}</span>
                  ) : null}
                  {c.comment ? <em className="muted">« {c.comment} »</em> : null}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {c.delegateName ? `— ${c.delegateName}` : ""}
                  </span>
                  {/* Le paiement declare apparait aussi dans la liste ci-dessous
                      en statut "En attente" : c'est la qu'il se valide. */}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="immo-pay-toolbar">
        <div className="immo-seg-toggle">
          {VIEWS.map((v) => (
            <button key={v.key} className={view === v.key ? "active" : ""} onClick={() => setView(v.key)}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>
          {lateCount > 0 || pendingCount > 0 ? (
            <span style={{ fontWeight: 600 }}>
              {lateCount > 0 && <span style={{ color: "#dc2626" }}>{lateCount} en retard</span>}
              {lateCount > 0 && pendingCount > 0 && " · "}
              {pendingCount > 0 && <span style={{ color: "#d97706" }}>{pendingCount} en attente</span>}
            </span>
          ) : `${rows.length} paiement(s) · frise sur 12 mois`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="immo-empty">
          <Wallet size={28} />
          <h3>{t("Aucun paiement")}</h3>
          <p>Cliquez « Encaisser » pour enregistrer le premier paiement.</p>
        </div>
      ) : view === "locataire" ? (
        shownCards.length === 0 ? (
          <div className="immo-empty"><Wallet size={28} /><h3>{t("Aucun résultat")}</h3><p>{tf(t("Aucun locataire ne correspond à « {q} »."), {q: query})}</p></div>
        ) : (
          <div className="immo-pay-grid">
            {shownCards.map((c, i) => (
              <TenantPayCard
                key={c.lease?.id ?? c.name}
                card={c}
                index={i}
                onPay={setPayTarget}
                onGenerateMissing={handleGenerateMissing}
                generating={Boolean(c.lease?.id) && generatingLeaseId === c.lease?.id}
              />
            ))}
          </div>
        )
      ) : view === "calendrier" ? (
        <div className="immo-cal-grid">
          {calendar.map((c, i) => (
            <div key={i} className={`immo-cal-cell ${c.count > 0 ? "paid" : ""}`}>
              <div className="immo-cal-month">{MONTHS_FR[c.date.getMonth()]} {String(c.date.getFullYear()).slice(2)}</div>
              <div className="immo-cal-count">{c.count} paiement(s)</div>
              <div className="immo-cal-amount">{c.amount ? <MoneyStack rows={c.amountsByCurrency} fallbackSymbol={currency.defaultCurrencySymbol} /> : "—"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>Locataire</th><th>Logement</th><th>Date</th><th>Méthode</th><th>Statut</th><th>Montant</th><th></th></tr></thead>
            <tbody>
              {shownRows.map((p) => {
                const isPending = p.status === "pending";
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{tenantName(p)}</td>
                    <td className="muted">{[p.propertyName, p.unitName].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="muted">{p.paymentDate || "—"}</td>
                    <td><span className="chip chip-ink">{p.method || "—"}</span></td>
                    <td><span className={`immo-pill ${isPending ? "warning" : "success"}`}>{isPending ? "En attente" : "Payé"}</span></td>
                    <td style={{ fontWeight: 600, color: isPending ? "#d97706" : undefined }}>{money(p.amount, p.currencySymbol || "$")}</td>
                    <td>
                      {isPending && (
                        <button className="immo-btn" style={{ fontSize: 12 }} onClick={() => setConfirmTarget(p)}>
                          <Check size={14} /> Confirmer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payTarget && <QuickPayModal card={payTarget} methods={methods} onClose={() => setPayTarget(null)} onPaid={handlePaid} />}
      {confirmTarget && <ConfirmPayModal payment={confirmTarget} methods={methods} onClose={() => setConfirmTarget(null)} onConfirmed={handleConfirmed} />}
      {flash && <div className="immo-toast"><Check size={16} /> {flash}</div>}
    </>
  );
}

// ───────────────────── PAIEMENT (wizard Encaisser) ─────────────────────
export function Paiement({ go }) {
  const { data, loading, error, reload } = useApi(
    async () => {
      const [leases, paymentMethods] = await Promise.all([
        api.leases(),
        api.paymentMethods().catch(() => []),
      ]);
      return { leases, paymentMethods };
    },
    [],
  );
  useRealtimeReload(reload, ["leases", "payments"]);
  const leases = data?.leases;
  const methods = useMemo(() => uiMethodsFrom(data?.paymentMethods), [data?.paymentMethods]);
  const active = (Array.isArray(leases) ? leases : []).filter((l) => (l.status || "active") === "active");

  const [step, setStep] = useState(() => {
    try {
      return sessionStorage.getItem("domus-pay-lease-id") ? 2 : 1;
    } catch {
      return 1;
    }
  });
  const [leaseId, setLeaseId] = useState(() => {
    try {
      const id = sessionStorage.getItem("domus-pay-lease-id");
      sessionStorage.removeItem("domus-pay-lease-id");
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(null);
  // Numéro mobile money (pré-rempli avec le téléphone du locataire) et
  // numéro de reçu (auto-généré) — deux champs distincts selon la méthode.
  const [mobileNumber, setMobileNumber] = useState("");
  const [receiptRef, setReceiptRef] = useState(genReceiptRef);
  // Preuve de paiement (photo/scan reçu, capture mobile money) — optionnelle, tous moyens.
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState(null);

  const lease = active.find((l) => String(l.id) === String(leaseId)) || null;
  const activeKey = method ?? methods[0]?.key;
  const methodMeta = methods.find((m) => m.key === activeKey) || methods[0] || null;

  // Pré-sélection depuis l'espace locataire (montant + étape 2).
  useEffect(() => {
    if (!lease || step !== 2) return;
    setAmount((prev) => (prev ? prev : String(lease.rentAmount ?? "")));
  }, [lease, step]);

  // Le numéro mobile money du locataire est déjà connu → pré-rempli.
  useEffect(() => {
    setMobileNumber(lease?.tenantPhone || "");
  }, [lease?.id, lease?.tenantPhone]);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const pickLease = (l) => {
    setLeaseId(l.id);
    setAmount(String(l.rentAmount ?? ""));
    setStep(2);
  };

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      const payment = await api.createPayment({
        leaseId,
        paymentDate: today(),
        amount: Number(amount),
        method: methodMeta?.label || method,
        reference: (methodMeta?.mobile ? mobileNumber : receiptRef) || null,
        ...(lease?.currencyId ? { currencyId: Number(lease.currencyId) } : {}),
      }, proofFile);
      setDone(payment || { amount, method: methodMeta?.label });
      setStep(4);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setLeaseId(null); setAmount(""); setMethod(null);
    setMobileNumber(""); setReceiptRef(genReceiptRef()); setProofFile(null); setDone(null); setErr(null);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow">Encaissement · pas à pas</div>
        <h2 className="title">Encaisser un loyer</h2>
      </div>

      <Stepper step={step} />

      {/* ÉTAPE 1 — bail */}
      {step === 1 && (
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi-label" style={{ marginBottom: 8 }}>Choisir le bail</div>
          {active.length === 0 && <p className="muted">Aucun bail actif.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {active.map((l) => (
              <button key={l.id} className="btn" style={{ height: "auto", padding: 12, justifyContent: "space-between", textAlign: "left" }}
                onClick={() => pickLease(l)}>
                <span>
                  <div style={{ fontWeight: 600 }}>{[l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ") || l.reference}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{[l.propertyName, l.unitName].filter(Boolean).join(" · ")}</div>
                </span>
                <span style={{ fontWeight: 700 }}>{money(l.rentAmount, l.currencySymbol || "$")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — montant + méthode */}
      {step === 2 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 13 }}>{lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : ""}</span>
            <span className="muted" style={{ fontSize: 12 }}>{lease ? [lease.propertyName, lease.unitName].filter(Boolean).join(" · ") : ""}</span>
          </div>
          <label className="kpi-label">Montant</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
            style={inputStyle} />
          <div className="kpi-label" style={{ margin: "14px 0 8px" }}>Moyen de paiement</div>
          <div className="grid g4 keep" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {methods.map((m) => (
              <button key={m.key} onClick={() => setMethod(m.key)}
                style={{ ...tileStyle, ...(activeKey === m.key ? tileOn : {}) }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: m.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, margin: "0 auto" }}>{m.short}</span>
                <div style={{ fontSize: 11, marginTop: 6, fontWeight: activeKey === m.key ? 600 : 400 }}>{m.label}</div>
              </button>
            ))}
          </div>
          <div className="kpi-label" style={{ margin: "14px 0 6px" }}>
            {methodMeta?.mobile ? "Numéro mobile money" : "N° de reçu"}
          </div>
          <input
            value={methodMeta?.mobile ? mobileNumber : receiptRef}
            onChange={(e) => (methodMeta?.mobile ? setMobileNumber(e.target.value) : setReceiptRef(e.target.value))}
            placeholder={methodMeta?.mobile ? "+243 …" : "REC-…"} style={inputStyle} />
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            {methodMeta?.mobile
              ? "Numéro du locataire (pré-rempli) — modifiable."
              : "Numéro du reçu remis au locataire (généré automatiquement) — modifiable."}
          </div>
          <div className="kpi-label" style={{ margin: "14px 0 6px" }}>Preuve de paiement (optionnel)</div>
          <input
            id="rent-proof-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="rent-proof-input" className="btn" style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <FileDown size={16} />
            {proofFile ? proofFile.name : "Photo, scan ou capture (JPEG, PNG, PDF)"}
          </label>
          {proofFile && (
            <button type="button" className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => setProofFile(null)}>
              <X size={14} /> Retirer le fichier
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={() => setStep(1)}><ArrowLeft size={16} /></button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}
              disabled={!amount} onClick={() => setStep(3)}>
              {methodMeta?.mobile ? <><Smartphone size={16} /> Demander le paiement</> : <>Continuer <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — validation / confirmation */}
      {step === 3 && (
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          {methodMeta?.mobile ? (
            <>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: "var(--iris-50)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Smartphone size={26} color="#4f46e5" />
              </div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>Demande envoyée</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                Demande <b>{methodMeta.label}</b> de <b>{money(amount, lease?.currencySymbol || "$")}</b>
                {mobileNumber ? <> au <span style={{ fontFamily: "monospace" }}>{mobileNumber}</span></> : null}. En attente de validation du locataire…
              </p>
              <div className="grad-dark" style={{ borderRadius: 16, padding: 14, textAlign: "left", color: "#fff", margin: "14px 0", fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}>
                *150*1#<br />DOMUS demande {money(amount, lease?.currencySymbol || "CDF")}<br />
                <span style={{ color: "#fcd34d" }}>Entrez votre code PIN pour confirmer :</span> ••••
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: "#ecfdf5", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Banknote size={26} color="#10b981" />
              </div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16 }}>Confirmer l'encaissement</div>
              <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {money(amount, lease?.currencySymbol || "$")} en espèces · {lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : ""}
              </p>
            </>
          )}
          {err && <p style={{ color: "#be123c", fontSize: 12 }}>{err}</p>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
            disabled={submitting} onClick={submit}>
            {submitting ? "Enregistrement…" : <><Check size={16} /> {methodMeta?.mobile ? "Valider le paiement" : "Confirmer"}</>}
          </button>
          <button className="btn" style={{ marginTop: 8, border: "none" }} onClick={() => setStep(2)}>Retour</button>
        </div>
      )}

      {/* ÉTAPE 4 — quittance */}
      {step === 4 && (
        <>
          <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, marginBottom: 12, borderColor: "#a7f3d0", background: "#ecfdf5" }}>
            <span style={{ width: 40, height: 40, borderRadius: 999, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Check size={20} color="#fff" />
            </span>
            <div>
              <div style={{ fontWeight: 600, color: "#065f46" }}>Paiement reçu · {money(done?.amount ?? amount, lease?.currencySymbol || "$")}</div>
              <div style={{ fontSize: 12, color: "#047857" }}>Écriture comptable créée automatiquement</div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
              <div className="eyebrow">Quittance de loyer</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{money(done?.amount ?? amount, lease?.currencySymbol || "$")}</div>
            </div>
            <Line k="Locataire" v={lease ? [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") : "—"} />
            <Line k="Logement" v={lease ? [lease.propertyName, lease.unitName].filter(Boolean).join(" · ") : "—"} />
            <Line k="Méthode" v={methodMeta?.label} />
            <Line k="Date" v={today()} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}><FileDown size={16} /> PDF</button>
              <button className="btn" style={{ flex: 1, justifyContent: "center" }}><Send size={16} /> Envoyer</button>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={reset}>
              <Plus size={16} /> Nouvel encaissement
            </button>
            <button className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 8, border: "none" }} onClick={() => go("loyers")}>
              Voir les loyers
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stepper({ step }) {
  const labels = ["Bail", "Moyen", "Validation", "Quittance"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n <= step;
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, flex: i < 3 ? 1 : "none" }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
              background: active ? "var(--grad-iris)" : "var(--ink-100)", color: active ? "#fff" : "var(--ink-500)" }}>{n}</span>
            {i < 3 && <span style={{ flex: 1, height: 1, background: "var(--ink-200)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Line({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--ink-100)" }}>
      <span className="muted">{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--ink-200)",
  padding: "0 12px", font: "inherit", fontSize: 16, outline: "none",
};
const tileStyle = {
  border: "1px solid var(--ink-200)", borderRadius: 12, padding: 10, textAlign: "center",
  background: "#fff", cursor: "pointer", font: "inherit",
};
const tileOn = { border: "2px solid var(--iris-500)", background: "var(--iris-50)" };
