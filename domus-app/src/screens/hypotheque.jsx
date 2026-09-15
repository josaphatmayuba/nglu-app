// Domus — Remboursement hypothèque par propriété (SCRUM-311).
// Liste + modale de création/édition, sur le même pattern que depenses.jsx.
import { useMemo, useState } from "react";
import {
  Banknote,
  FileDown,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { money, normalizeCurrencyModule, cleanCurrencySymbol, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, DomusPropertySelect, FormSection, Modal, ModalActions } from "./biens.jsx";
import { useConfirm } from "../components/Dialog.jsx";
import { t, tf } from "../i18n.js";

const PAYMENT_METHOD_OPTIONS = [
  ["cash", t("Cash")],
  ["bank", t("Banque")],
  ["mobile_money", t("Mobile money")],
  ["cheque", t("Cheque")],
];
const PAYMENT_STATUS_OPTIONS = [
  ["paid", t("Payé")],
  ["pending", t("En attente")],
  ["overdue", t("En retard")],
];

const emptyPayment = {
  propertyId: "",
  unitId: "",
  lenderName: "",
  paymentDate: "",
  periodStart: "",
  periodEnd: "",
  totalAmount: "",
  principalAmount: "",
  interestAmount: "",
  escrowAmount: "",
  currencyId: "",
  paymentMethod: "bank",
  paymentStatus: "paid",
  reference: "",
  receiptUrl: "",
  receiptFile: null,
  notes: "",
};

function toId(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function compactDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

// Somme capital / intérêts groupée PAR DEVISE (jamais de somme inter-devises).
export function mortgageTotalsByCurrency(payments, resolveSymbol) {
  const map = new Map();
  payments.forEach((payment) => {
    const sym = resolveSymbol(payment);
    const entry = map.get(sym) || { principal: 0, interest: 0 };
    entry.principal += Number(payment.principalAmount || 0);
    entry.interest += Number(payment.interestAmount || 0);
    map.set(sym, entry);
  });
  return [...map.entries()].map(([symbol, entry]) => ({ symbol, ...entry }));
}

export function Hypotheque() {
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [paymentModal, setPaymentModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const confirm = useConfirm();
  const paymentsApi = useApi(() => api.mortgagePayments(), []);
  const propertiesApi = useApi(() => api.properties(), []);
  const unitsApi = useApi(() => api.units(), []);
  const currenciesApi = useApi(() => api.currencies(), []);
  const settingApi = useApi(() => api.setting(), []);
  useRealtimeReload(paymentsApi.reload, ["mortgage-payments"]);

  const loading = paymentsApi.loading || propertiesApi.loading || unitsApi.loading;
  const error = paymentsApi.error || propertiesApi.error || unitsApi.error;
  const payments = useMemo(() => {
    const raw = paymentsApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [paymentsApi.data]);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);
  const units = useMemo(() => (Array.isArray(unitsApi.data) ? unitsApi.data : unitsApi.data?.data || []), [unitsApi.data]);
  const currency = useMemo(
    () => normalizeCurrencyModule(currenciesApi.data, settingApi.data),
    [currenciesApi.data, settingApi.data],
  );

  // Symbole de la devise PROPRE au paiement (SIFA : jamais le défaut global).
  const paymentSymbol = (payment) => {
    const byId = payment?.currencyId != null ? currency.currencyById?.get(Number(payment.currencyId)) : null;
    const fromId = byId ? cleanCurrencySymbol(byId) : "";
    return fromId || cleanCurrencySymbol(payment) || currency.defaultCurrencySymbol;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((payment) => {
      if (propertyFilter && String(payment.propertyId) !== String(propertyFilter)) return false;
      if (!q) return true;
      return [payment.lenderName, payment.propertyName, payment.unitName, payment.reference]
        .some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [payments, query, propertyFilter]);

  const totalsByCurrency = useMemo(() => mortgageTotalsByCurrency(filtered, paymentSymbol), [filtered, currency]);

  const reloadAll = async () => {
    await Promise.all([paymentsApi.reload(), propertiesApi.reload(), unitsApi.reload()]);
  };

  const savePayment = async (form) => {
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        propertyId: toId(form.propertyId),
        unitId: toId(form.unitId) ?? null,
        lenderName: form.lenderName?.trim() || undefined,
        paymentDate: form.paymentDate || null,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
        totalAmount: toMoney(form.totalAmount),
        principalAmount: toMoney(form.principalAmount),
        interestAmount: toMoney(form.interestAmount),
        escrowAmount: toMoney(form.escrowAmount || 0),
        currencyId: toId(form.currencyId) ?? null,
        paymentMethod: form.paymentMethod || "bank",
        paymentStatus: form.paymentStatus || "paid",
        reference: form.reference?.trim() || undefined,
        receiptUrl: form.receiptUrl?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (!payload.propertyId || !payload.paymentDate || !payload.totalAmount) {
        throw new Error(t("Bien, date et montant total obligatoires."));
      }
      const gap = Math.abs(payload.principalAmount + payload.interestAmount + payload.escrowAmount - payload.totalAmount);
      if (gap > 0.01) {
        throw new Error(t("Capital + intérêts + frais annexes doit être égal au montant total."));
      }
      let paymentId = form.id;
      if (paymentId) await api.updateMortgagePayment(paymentId, payload);
      else {
        const created = await api.createMortgagePayment(payload);
        paymentId = created?.id;
      }
      // Justificatif : upload multipart séparé (piece jointe), pas dans le payload JSON.
      if (form.receiptFile && paymentId) {
        await api.uploadMortgagePaymentReceipt(paymentId, form.receiptFile);
      }
      setPaymentModal(null);
      await reloadAll();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!(await confirm({
      title: t("Supprimer le paiement"),
      message: tf(t("Supprimer ce paiement d'hypothèque du {date} ?"), { date: compactDate(payment.paymentDate) }),
      confirmLabel: t("Supprimer"),
      danger: true,
    }))) return;
    setBusyId(payment.id);
    setActionError("");
    try {
      await api.deleteMortgagePayment(payment.id);
      await paymentsApi.reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reloadAll} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("Hypothèque")}</h1>
          <p>{t("Remboursements d'hypothèque par propriété : capital et intérêts.")}</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Prêteur, bien, référence...")} />
          </label>
          <button className="immo-btn primary" onClick={() => setPaymentModal({ ...emptyPayment, currencyId: currency.defaultCurrencyId || "" })}>
            <Plus size={16} /> {t("Nouveau paiement")}
          </button>
        </div>
      </div>

      <div className="maintenance-toolbar">
        <div className="immo-filter-group">
          <button type="button" className={propertyFilter === "" ? "active" : ""} onClick={() => setPropertyFilter("")}>
            {t("Toutes propriétés")}
          </button>
          {properties.map((p) => (
            <button key={p.id} type="button" className={String(propertyFilter) === String(p.id) ? "active" : ""} onClick={() => setPropertyFilter(String(p.id))}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {actionError && <div className="api-error" style={{ marginBottom: 12 }}>{actionError}</div>}

      <MortgageTable
        payments={filtered}
        busyId={busyId}
        paymentSymbol={paymentSymbol}
        onEdit={(payment) => setPaymentModal(paymentToForm(payment, currency.defaultCurrencyId))}
        onDelete={deletePayment}
      />

      <div className="card ops-panel maintenance-summary-card">
        <div className="panel-title">{t("Capital remboursé / Intérêts payés (période filtrée)")}</div>
        {totalsByCurrency.length === 0
          ? (
            <>
              <div className="ops-score"><span>{t("Capital")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
              <div className="ops-score"><span>{t("Intérêts")}</span><b>{money(0, currency.defaultCurrencySymbol)}</b></div>
            </>
          )
          : totalsByCurrency.map((c) => (
              <div key={c.symbol}>
                <div className="ops-score">
                  <span>{tf(t("Capital {sym}"), { sym: c.symbol })}</span>
                  <b>{money(c.principal, c.symbol)}</b>
                </div>
                <div className="ops-score">
                  <span>{tf(t("Intérêts {sym}"), { sym: c.symbol })}</span>
                  <b>{money(c.interest, c.symbol)}</b>
                </div>
              </div>
            ))}
      </div>

      {paymentModal && (
        <MortgagePaymentModal
          value={paymentModal}
          properties={properties}
          units={units}
          currencyOptions={currency.currencyOptions}
          defaultCurrencyId={currency.defaultCurrencyId}
          busy={busy}
          error={actionError}
          onClose={() => { setPaymentModal(null); setActionError(""); }}
          onSave={savePayment}
        />
      )}
    </>
  );
}

function MortgageTable({ payments, busyId, paymentSymbol, onEdit, onDelete }) {
  if (!payments.length) return <div className="card maintenance-empty">{t("Aucun paiement d'hypothèque à afficher pour ce filtre.")}</div>;
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="tbl" style={{ width: "100%", minWidth: 960 }}>
        <thead>
          <tr>
            <th>{t("Prêteur")}</th>
            <th>{t("Bien")}</th>
            <th>{t("Date")}</th>
            <th>{t("Statut")}</th>
            <th className="r">{t("Capital")}</th>
            <th className="r">{t("Intérêts")}</th>
            <th className="r">{t("Total")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const sym = paymentSymbol(payment);
            return (
              <tr key={payment.id}>
                <td style={{ fontWeight: 700 }}>{payment.lenderName || "-"}</td>
                <td>{payment.propertyName || "-"}{payment.unitName ? ` - ${payment.unitName}` : ""}</td>
                <td>{compactDate(payment.paymentDate)}</td>
                <td>{PAYMENT_STATUS_OPTIONS.find(([k]) => k === payment.paymentStatus)?.[1] || payment.paymentStatus}</td>
                <td className="r">{money(payment.principalAmount, sym)}</td>
                <td className="r">{money(payment.interestAmount, sym)}</td>
                <td className="r">{money(payment.totalAmount, sym)}</td>
                <td className="r">
                  <button className="immo-link" disabled={busyId === payment.id} onClick={() => onEdit(payment)}>
                    <Pencil size={13} /> {t("Modifier")}
                  </button>
                  <button className="immo-link danger" disabled={busyId === payment.id} onClick={() => onDelete(payment)}>
                    <Trash2 size={13} /> {t("Supprimer")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function paymentToForm(payment, defaultCurrencyId) {
  return {
    id: payment.id,
    propertyId: payment.propertyId ? String(payment.propertyId) : "",
    unitId: payment.unitId ? String(payment.unitId) : "",
    lenderName: payment.lenderName || "",
    paymentDate: payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : "",
    periodStart: payment.periodStart ? String(payment.periodStart).slice(0, 10) : "",
    periodEnd: payment.periodEnd ? String(payment.periodEnd).slice(0, 10) : "",
    totalAmount: payment.totalAmount ?? "",
    principalAmount: payment.principalAmount ?? "",
    interestAmount: payment.interestAmount ?? "",
    escrowAmount: payment.escrowAmount ?? "",
    currencyId: payment.currencyId || defaultCurrencyId || "",
    paymentMethod: payment.paymentMethod || "bank",
    paymentStatus: payment.paymentStatus || "paid",
    reference: payment.reference || "",
    receiptUrl: payment.receiptUrl || "",
    receiptFile: null,
    notes: payment.notes || "",
  };
}

// Aide au calcul : total = principal + intérêts + escrow.
// Si les 2 premiers champs remplis (parmi total/principal/interest) sont
// connus, on déduit automatiquement le 3e (intérêts par défaut) au blur.
function computeGap(form) {
  const total = toMoney(form.totalAmount);
  const principal = toMoney(form.principalAmount);
  const interest = toMoney(form.interestAmount);
  const escrow = toMoney(form.escrowAmount || 0);
  return Math.round((total - (principal + interest + escrow)) * 100) / 100;
}

function MortgagePaymentModal({ value, properties, units, currencyOptions, defaultCurrencyId, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...value, currencyId: value.currencyId || defaultCurrencyId || "" });
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const propertyUnits = units.filter((unit) => !form.propertyId || String(unit.propertyId) === String(form.propertyId));

  const gap = computeGap(form);
  const hasAllThree = form.totalAmount !== "" && form.principalAmount !== "" && form.interestAmount !== "";
  const gapOk = !hasAllThree || Math.abs(gap) <= 0.01;
  const gapSymbol = currencyOptions.find((o) => String(o.value) === String(form.currencyId))?.symbol || "";

  // Aide au calcul : quand deux des trois montants (total/capital/intérêts)
  // sont connus, on déduit automatiquement le troisième à chaque saisie.
  const setTotal = (totalAmount) => {
    if (totalAmount !== "" && form.principalAmount !== "" && form.interestAmount === "") {
      const computed = Math.round((toMoney(totalAmount) - toMoney(form.principalAmount) - toMoney(form.escrowAmount || 0)) * 100) / 100;
      set({ totalAmount, interestAmount: computed >= 0 ? String(computed) : form.interestAmount });
      return;
    }
    set({ totalAmount });
  };
  const setPrincipal = (principalAmount) => {
    if (form.totalAmount !== "" && principalAmount !== "") {
      const computed = Math.round((toMoney(form.totalAmount) - toMoney(principalAmount) - toMoney(form.escrowAmount || 0)) * 100) / 100;
      set({ principalAmount, interestAmount: computed >= 0 ? String(computed) : form.interestAmount });
      return;
    }
    set({ principalAmount });
  };
  const setInterest = (interestAmount) => {
    if (form.totalAmount !== "" && interestAmount !== "" && form.principalAmount === "") {
      const computed = Math.round((toMoney(form.totalAmount) - toMoney(interestAmount) - toMoney(form.escrowAmount || 0)) * 100) / 100;
      set({ interestAmount, principalAmount: computed >= 0 ? String(computed) : form.principalAmount });
      return;
    }
    set({ interestAmount });
  };

  return (
    <Modal
      title={form.id ? t("Modifier le paiement") : t("Nouveau paiement")}
      subtitle={t("Remboursement hypothèque")}
      icon={<Landmark size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<Banknote size={14} />} title={t("Paiement")}>
          <div className="domus-property-form-grid">
            <DomusPropertySelect label={t("Propriété")} value={form.propertyId} required onChange={(propertyId) => set({ propertyId, unitId: "" })} options={properties.map((p) => [String(p.id), p.name])} />
            <DomusPropertySelect label={t("Unité")} value={form.unitId} onChange={(unitId) => set({ unitId })} options={propertyUnits.map((u) => [String(u.id), `${u.name}${u.propertyName ? ` - ${u.propertyName}` : ""}`])} />
            <DomusPropertyField label={t("Prêteur / Banque")} value={form.lenderName} onChange={(lenderName) => set({ lenderName })} placeholder={t("ex. Rawbank")} />
            <DomusPropertyField label={t("Date de paiement")} type="date" value={form.paymentDate} onChange={(paymentDate) => set({ paymentDate })} required />
            <DomusPropertyField label={t("Début de période")} type="date" value={form.periodStart} onChange={(periodStart) => set({ periodStart })} />
            <DomusPropertyField label={t("Fin de période")} type="date" value={form.periodEnd} onChange={(periodEnd) => set({ periodEnd })} />
            <MoneyField label={t("Montant total")} value={form.totalAmount} currencyId={form.currencyId} currencyOptions={currencyOptions} onAmountChange={setTotal} onCurrencyChange={(currencyId) => set({ currencyId })} />
            <DomusPropertyField label={t("Capital")} type="number" value={form.principalAmount} onChange={setPrincipal} />
            <DomusPropertyField label={t("Intérêts")} type="number" value={form.interestAmount} onChange={setInterest} />
            <DomusPropertyField label={t("Frais annexes / escrow")} type="number" value={form.escrowAmount} onChange={(escrowAmount) => set({ escrowAmount })} />
            <DomusPropertySelect label={t("Méthode de paiement")} value={form.paymentMethod} onChange={(paymentMethod) => set({ paymentMethod })} options={PAYMENT_METHOD_OPTIONS} />
            <DomusPropertySelect label={t("Statut de paiement")} value={form.paymentStatus} onChange={(paymentStatus) => set({ paymentStatus })} options={PAYMENT_STATUS_OPTIONS} />
            <DomusPropertyField label={t("Référence")} value={form.reference} onChange={(reference) => set({ reference })} placeholder={t("ex. ECH-2026-09")} />
          </div>
          {!gapOk && (
            <div className="api-error" style={{ marginTop: 8 }}>
              {tf(t("Capital + intérêts + frais annexes ne correspond pas au montant total (écart {gap})."), { gap: money(gap, gapSymbol) })}
            </div>
          )}
          <ReceiptField
            receiptUrl={form.receiptUrl}
            receiptFile={form.receiptFile}
            onPick={(receiptFile) => set({ receiptFile })}
            onClear={() => set({ receiptFile: null })}
          />
          <DomusPropertyField label={t("Notes")} value={form.notes} onChange={(notes) => set({ notes })} textarea />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions busy={busy} disabled={!form.propertyId || !form.paymentDate || !form.totalAmount || !gapOk} onClose={onClose} onSave={() => onSave(form)} />
    </Modal>
  );
}

// Justificatif (SCRUM-311) — upload fichier (image/PDF), meme pattern que
// ReceiptField dans depenses.jsx (SCRUM-310).
function ReceiptField({ receiptUrl, receiptFile, onPick, onClear }) {
  const isImage = receiptUrl && /\.(jpe?g|png|webp)$/i.test(receiptUrl);
  return (
    <label className="domus-property-field">
      <span>{t("Justificatif")}</span>
      <input
        id="mortgage-receipt-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      <label htmlFor="mortgage-receipt-input" className="btn" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <FileDown size={16} />
        {receiptFile ? receiptFile.name : t("Photo, scan ou capture (JPEG, PNG, PDF)")}
      </label>
      {receiptFile && (
        <button type="button" className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => onClear()}>
          <X size={14} /> {t("Retirer le fichier")}
        </button>
      )}
      {!receiptFile && receiptUrl && (
        isImage
          ? <a href={receiptUrl} target="_blank" rel="noreferrer"><img src={receiptUrl} alt={t("Justificatif")} style={{ maxWidth: 160, marginTop: 8, borderRadius: 6 }} /></a>
          : <a href={receiptUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 13 }}>{t("Voir le justificatif")}</a>
      )}
    </label>
  );
}

function MoneyField({ label, value, currencyId, currencyOptions, onAmountChange, onCurrencyChange }) {
  return (
    <label className="domus-property-field">
      <span>{label}</span>
      <div className="domus-money-input">
        <input type="number" value={value ?? ""} onChange={(e) => onAmountChange(e.target.value)} />
        <select value={currencyId ?? ""} onChange={(e) => onCurrencyChange(e.target.value)}>
          {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.symbol || option.label}</option>)}
        </select>
      </div>
    </label>
  );
}
