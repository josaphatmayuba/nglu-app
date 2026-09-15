// Domus — Échéancier de paiement d'une dépense de propriété (SCRUM-313).
// Modale de détail branchée sur une ExpenseTable existante (depenses.jsx).
import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, FileDown, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { money, useApi } from "../data.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { DomusPropertyField, FormSection, Modal, ModalActions } from "./biens.jsx";
import { t, tf } from "../i18n.js";

const STATUS_LABEL = {
  pending: t("En attente"),
  paid: t("Payée"),
  partial: t("Partielle"),
  cancelled: t("Annulée"),
};

const PAYMENT_METHOD_OPTIONS = [
  ["cash", t("Cash")],
  ["bank", t("Banque")],
  ["mobile_money", t("Mobile money")],
  ["cheque", t("Cheque")],
];

function compactDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function StatusBadge({ status }) {
  const cls = status === "paid" ? "chip chip-emerald" : status === "partial" ? "chip chip-amber" : status === "cancelled" ? "chip chip-ink" : "chip chip-ink";
  return <span className={cls}>{STATUS_LABEL[status] || status}</span>;
}

export function ExpenseInstallmentsModal({ expense, symbol, onClose, onChanged }) {
  const installmentsApi = useApi(() => api.expenseInstallments(expense.id), [expense.id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [payTarget, setPayTarget] = useState(null); // installment being marked as paid
  const [addingPartial, setAddingPartial] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const installments = useMemo(() => {
    const raw = installmentsApi.data;
    return Array.isArray(raw) ? raw : raw?.data || [];
  }, [installmentsApi.data]);

  const scheduled = useMemo(() => installments.filter((i) => i.kind === "scheduled"), [installments]);
  const partials = useMemo(() => installments.filter((i) => i.kind === "partial"), [installments]);
  const hasPaidInstallment = useMemo(() => installments.some((i) => Number(i.paidAmount ?? 0) > 0), [installments]);

  const amount = Number(expense.amount || 0);
  const settled = Number(expense.settledAmount ?? 0);
  const remaining = Math.max(0, amount - settled);
  const progressPct = amount > 0 ? Math.min(100, Math.round((settled / amount) * 100)) : 0;

  const reload = async () => {
    await installmentsApi.reload();
    if (onChanged) await onChanged();
  };

  const doPay = async (installmentId, payload) => {
    setBusy(true);
    setActionError("");
    try {
      await api.payExpenseInstallment(installmentId, payload);
      setPayTarget(null);
      await reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const doAddPartial = async (payload) => {
    setBusy(true);
    setActionError("");
    try {
      await api.addExpensePartialPayment(expense.id, payload);
      setAddingPartial(false);
      await reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const doRegenerate = async (recurrenceMonths) => {
    setBusy(true);
    setActionError("");
    try {
      await api.generateExpenseInstallments(expense.id, { recurrenceMonths: Number(recurrenceMonths), force: true });
      setRegenerating(false);
      await reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (installmentId) => {
    setBusy(true);
    setActionError("");
    try {
      await api.deleteExpenseInstallment(installmentId);
      await reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const doUploadReceipt = async (installmentId, file) => {
    setBusy(true);
    setActionError("");
    try {
      await api.uploadExpenseInstallmentReceipt(installmentId, file);
      await reload();
    } catch (err) {
      setActionError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t("Échéancier de paiement")}
      subtitle={expense.description}
      icon={<CalendarClock size={20} />}
      className="domus-property-modal"
      onClose={onClose}
    >
      <div className="domus-property-form">
        <FormSection icon={<CalendarClock size={14} />} title={t("Progression du règlement")}>
          <div className="installment-progress">
            <div className="installment-progress-bar">
              <div className="installment-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="installment-progress-labels">
              <span>{tf(t("Réglé : {settled}"), { settled: money(settled, symbol) })}</span>
              <span>{tf(t("Total : {total}"), { total: money(amount, symbol) })}</span>
              <span>{tf(t("Reste : {remaining}"), { remaining: money(remaining, symbol) })}</span>
            </div>
          </div>
        </FormSection>

        {actionError && <div className="api-error">{actionError}</div>}

        {installmentsApi.loading && <Loading />}
        {installmentsApi.error && <ApiError error={installmentsApi.error} onRetry={installmentsApi.reload} />}

        {!installmentsApi.loading && !installmentsApi.error && (
          <>
            {scheduled.length > 0 && (
              <FormSection icon={<CalendarClock size={14} />} title={t("Mensualités")}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl" style={{ width: "100%", minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t("Date prévue")}</th>
                        <th className="r">{t("Montant prévu")}</th>
                        <th className="r">{t("Montant réglé")}</th>
                        <th>{t("Statut")}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduled.map((row) => (
                        <tr key={row.id}>
                          <td>{row.sequenceNo}</td>
                          <td>{compactDate(row.dueDate)}</td>
                          <td className="r">{money(row.plannedAmount, symbol)}</td>
                          <td className="r">{money(row.paidAmount, symbol)}</td>
                          <td><StatusBadge status={row.status} /></td>
                          <td className="r">
                            {row.status !== "paid" && row.status !== "cancelled" && (
                              <button className="immo-link" disabled={busy} onClick={() => setPayTarget(row)}>
                                <CheckCircle2 size={13} /> {t("Marquer payée")}
                              </button>
                            )}
                            <ReceiptUploadButton installment={row} busy={busy} onUpload={(file) => doUploadReceipt(row.id, file)} />
                            {row.status === "pending" && (
                              <button className="immo-link danger" disabled={busy} onClick={() => doDelete(row.id)}>
                                <Trash2 size={13} /> {t("Supprimer")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!hasPaidInstallment && (
                  <button className="btn" style={{ marginTop: 10 }} disabled={busy} onClick={() => setRegenerating(true)}>
                    <RefreshCw size={14} /> {t("Régénérer les échéances")}
                  </button>
                )}
              </FormSection>
            )}

            {partials.length > 0 && (
              <FormSection icon={<CalendarClock size={14} />} title={t("Paiements libres")}>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl" style={{ width: "100%", minWidth: 480 }}>
                    <thead>
                      <tr>
                        <th>{t("Date")}</th>
                        <th className="r">{t("Montant")}</th>
                        <th>{t("Méthode")}</th>
                        <th>{t("Référence")}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {partials.map((row) => (
                        <tr key={row.id}>
                          <td>{compactDate(row.paidDate)}</td>
                          <td className="r">{money(row.paidAmount, symbol)}</td>
                          <td>{PAYMENT_METHOD_OPTIONS.find(([k]) => k === row.paymentMethod)?.[1] || row.paymentMethod}</td>
                          <td>{row.reference || "-"}</td>
                          <td className="r">
                            <ReceiptUploadButton installment={row} busy={busy} onUpload={(file) => doUploadReceipt(row.id, file)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FormSection>
            )}

            <button className="btn btn-primary" disabled={busy} onClick={() => setAddingPartial(true)}>
              <Plus size={14} /> {t("Ajouter un paiement")}
            </button>
          </>
        )}
      </div>
      <ModalActions busy={busy} disabled={false} onClose={onClose} onSave={onClose} />

      {payTarget && (
        <PayInstallmentDialog
          installment={payTarget}
          symbol={symbol}
          busy={busy}
          error={actionError}
          onClose={() => setPayTarget(null)}
          onSave={(payload) => doPay(payTarget.id, payload)}
        />
      )}

      {addingPartial && (
        <AddPartialPaymentDialog
          symbol={symbol}
          busy={busy}
          error={actionError}
          onClose={() => setAddingPartial(false)}
          onSave={doAddPartial}
        />
      )}

      {regenerating && (
        <RegenerateDialog
          busy={busy}
          error={actionError}
          onClose={() => setRegenerating(false)}
          onSave={doRegenerate}
        />
      )}
    </Modal>
  );
}

function ReceiptUploadButton({ installment, busy, onUpload }) {
  const inputId = `installment-receipt-${installment.id}`;
  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <label htmlFor={inputId} className="immo-link" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
        <FileDown size={13} /> {installment.receiptUrl ? t("Justificatif") : t("Ajouter justificatif")}
      </label>
    </>
  );
}

function PayInstallmentDialog({ installment, symbol, busy, error, onClose, onSave }) {
  const [amount, setAmount] = useState(installment.plannedAmount ?? "");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState(installment.paymentMethod || "cash");
  const [reference, setReference] = useState(installment.reference || "");

  return (
    <Modal title={t("Marquer l'échéance payée")} subtitle={tf(t("Échéance #{n}"), { n: installment.sequenceNo })} icon={<CheckCircle2 size={20} />} onClose={onClose}>
      <div className="domus-property-form">
        <FormSection title={t("Paiement")}>
          <DomusPropertyField label={tf(t("Montant réglé ({sym})"), { sym: symbol })} type="number" value={amount} onChange={setAmount} placeholder={String(installment.plannedAmount ?? "")} />
          <DomusPropertyField label={t("Date de règlement")} type="date" value={paidDate} onChange={setPaidDate} required />
          <DomusPropertyField label={t("Méthode de paiement")} value={paymentMethod} onChange={setPaymentMethod} />
          <DomusPropertyField label={t("Référence")} value={reference} onChange={setReference} />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions
        busy={busy}
        disabled={!paidDate}
        onClose={onClose}
        onSave={() => onSave({
          amount: amount !== "" ? Number(amount) : undefined,
          paidDate,
          paymentMethod,
          reference: reference || undefined,
        })}
      />
    </Modal>
  );
}

function AddPartialPaymentDialog({ symbol, busy, error, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");

  return (
    <Modal title={t("Ajouter un paiement")} icon={<Plus size={20} />} onClose={onClose}>
      <div className="domus-property-form">
        <FormSection title={t("Paiement libre")}>
          <DomusPropertyField label={tf(t("Montant ({sym})"), { sym: symbol })} type="number" value={amount} onChange={setAmount} required />
          <DomusPropertyField label={t("Date")} type="date" value={paidDate} onChange={setPaidDate} required />
          <DomusPropertyField label={t("Méthode de paiement")} value={paymentMethod} onChange={setPaymentMethod} />
          <DomusPropertyField label={t("Référence")} value={reference} onChange={setReference} />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions
        busy={busy}
        disabled={!amount || Number(amount) <= 0 || !paidDate}
        onClose={onClose}
        onSave={() => onSave({ amount: Number(amount), paidDate, paymentMethod, reference: reference || undefined })}
      />
    </Modal>
  );
}

function RegenerateDialog({ busy, error, onClose, onSave }) {
  const [recurrenceMonths, setRecurrenceMonths] = useState("");
  return (
    <Modal title={t("Régénérer les échéances")} icon={<RefreshCw size={20} />} onClose={onClose}>
      <div className="domus-property-form">
        <FormSection title={t("Nouvel échéancier")}>
          <DomusPropertyField label={t("Nombre de mois")} type="number" value={recurrenceMonths} onChange={setRecurrenceMonths} required helper={t("Remplace les échéances non réglées (aucune si déjà payée).")} />
        </FormSection>
      </div>
      {error && <div className="api-error" style={{ margin: "0 24px" }}>{error}</div>}
      <ModalActions
        busy={busy}
        disabled={!recurrenceMonths || Number(recurrenceMonths) < 1}
        onClose={onClose}
        onSave={() => onSave(recurrenceMonths)}
      />
    </Modal>
  );
}
