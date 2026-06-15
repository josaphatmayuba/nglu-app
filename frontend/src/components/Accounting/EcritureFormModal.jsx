import { useEffect, useState, useMemo } from "react";
import { X, Plus, Trash2, AlertCircle, CheckCircle, Paperclip, FileText } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  addTransaction,
  updateTransaction,
  listAttachments,
  uploadAttachment,
  deleteAttachment,
} from "@/redux/rtk/features/transaction/transactionSlice";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });
const emptyLine = () => ({ id: crypto.randomUUID(), account: "", label: "", debit: "", credit: "" });

// Comptes de trésorerie pour le sélecteur "Payé via" (caisse / banque / mobile money).
const isTreasuryAccount = (name = "") =>
  /caisse|cash|banque|bank|we\s*&?\s*cash|western|mobile|wallet/i.test(name);

export default function EcritureFormModal({
  open,
  onClose,
  accounts = [],
  currencies = [],
  projects = [],
  defaultCurrencyId = null,
  record = null,
  onSaved,
}) {
  const dispatch = useDispatch();

  // Real transaction types from DB
  const transactionTypes = useSelector((s) => s.transactionTypes?.list ?? []);

  const [type, setType]   = useState("");
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote]   = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [payVia, setPayVia] = useState("");
  const [projectId, setProjectId] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = Boolean(record?.id);

  // Comptes de trésorerie disponibles pour "Payé via".
  const treasuryAccounts = useMemo(
    () => accounts.filter((a) => isTreasuryAccount(a.name)),
    [accounts]
  );

  // When a transaction type is selected, auto-fill the debit/credit accounts from its definition
  const selectedType = useMemo(
    () => transactionTypes.find((t) => t.name === type),
    [type, transactionTypes]
  );

  const totalDebit  = useMemo(() => lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (Number(l.credit) || 0), 0), [lines]);
  const balanced = totalDebit > 0 && totalDebit === totalCredit;

  const updateLine = (id, field, value) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.id !== id));

  const handleTypeChange = (name) => {
    setType(name);
    const tt = transactionTypes.find((t) => t.name === name);
    if (tt) {
      // Auto-fill first two lines with the debit/credit accounts from the type definition
      setLines((prev) => {
        const updated = [...prev];
        if (updated[0]) updated[0] = { ...updated[0], account: String(tt.debitAccountId ?? "") };
        if (updated[1]) updated[1] = { ...updated[1], account: String(tt.creditAccountId ?? "") };
        return updated;
      });
    }
  };

  // Applique le compte de trésorerie choisi ("Payé via") sur la ligne de crédit.
  const handlePayViaChange = (accountId) => {
    setPayVia(accountId);
    if (!accountId) return;
    setLines((prev) => {
      const updated = [...prev];
      const creditIdx = updated.findIndex((l) => Number(l.credit) > 0);
      const idx = creditIdx >= 0 ? creditIdx : 1;
      if (updated[idx]) updated[idx] = { ...updated[idx], account: String(accountId) };
      return updated;
    });
  };

  // Charge les justificatifs existants (mode edition uniquement).
  useEffect(() => {
    if (open && record?.id) {
      dispatch(listAttachments(record.id)).then((res) => {
        const data = res?.payload?.data;
        setAttachments(Array.isArray(data) ? data : []);
      });
    } else {
      setAttachments([]);
    }
  }, [open, record?.id, dispatch]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-selectionner le meme fichier
    if (!file || !record?.id) return;
    setUploading(true);
    const res = await dispatch(uploadAttachment({ transactionId: record.id, file }));
    setUploading(false);
    if (res?.payload?.message === "success" || res?.payload?.data?.url) {
      const list = await dispatch(listAttachments(record.id));
      const data = list?.payload?.data;
      setAttachments(Array.isArray(data) ? data : []);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const res = await dispatch(deleteAttachment(attachmentId));
    if (res?.payload?.message === "success" || res?.payload?.data) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }
  };

  const reset = () => {
    setType("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setCurrencyId(defaultCurrencyId ? String(defaultCurrencyId) : "");
    setPayVia("");
    setProjectId("");
    setLines([emptyLine(), emptyLine()]);
  };

  useEffect(() => {
    if (!open) return;
    if (!record?.id) {
      reset();
      return;
    }
    const amount = String(Number(record.amount || 0));
    setType(record.type || "");
    setDate(record.date ? new Date(record.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setNote(record.particulars || record.note || "");
    setCurrencyId(
      record.currencyId != null
        ? String(record.currencyId)
        : defaultCurrencyId ? String(defaultCurrencyId) : ""
    );
    setPayVia("");
    setProjectId(record.projectId != null ? String(record.projectId) : "");
    setLines([
      { id: crypto.randomUUID(), account: String(record.debitId || record.debit?.id || ""), label: record.particulars || "", debit: amount, credit: "" },
      { id: crypto.randomUUID(), account: String(record.creditId || record.credit?.id || ""), label: record.particulars || "", debit: "", credit: amount },
    ]);
  }, [open, record]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) return;
    setSubmitting(true);
    const debitLine  = lines.find((l) => Number(l.debit)  > 0);
    const creditLine = lines.find((l) => Number(l.credit) > 0);
    const values = {
      date,
      type: type || "Other",
      particulars: note || type || "Manual entry",
      debitId:  Number(debitLine?.account)  || selectedType?.debitAccountId  || undefined,
      creditId: Number(creditLine?.account) || selectedType?.creditAccountId || undefined,
      amount: totalDebit,
      currencyId: currencyId ? Number(currencyId) : undefined,
      projectId: projectId ? Number(projectId) : undefined,
    };
    const response = isEdit
      ? await dispatch(updateTransaction({ id: record.id, values }))
      : await dispatch(addTransaction(values));
    setSubmitting(false);
    if (response?.payload?.message === "success") {
      reset();
      onSaved?.();
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="text-base font-semibold text-ink-900">{isEdit ? "Edit journal entry" : "New journal entry"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 transition">
            <X className="w-4 h-4 text-ink-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          {/* Meta */}
          <div className="px-6 pt-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Transaction type
              </label>
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
              >
                <option value="">— select type —</option>
                {transactionTypes.map((tt) => (
                  <option key={tt.id} value={tt.name}>{tt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Description</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Entry description"
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Meta 2 — devise + payé via + projet */}
          <div className="px-6 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Currency</label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
              >
                <option value="">— select currency —</option>
                {currencies.map((cur) => (
                  <option key={cur.id} value={cur.id}>
                    {(cur.currencyCode || cur.currencyName || cur.id)}
                    {cur.currencySymbol ? ` (${cur.currencySymbol})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Paid via <span className="text-ink-400 font-normal">(optional)</span>
              </label>
              <select
                value={payVia}
                onChange={(e) => handlePayViaChange(e.target.value)}
                disabled={treasuryAccounts.length === 0}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white disabled:bg-ink-50"
              >
                <option value="">— cash/bank account —</option>
                {treasuryAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Project <span className="text-ink-400 font-normal">(analytics)</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={projects.length === 0}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white disabled:bg-ink-50"
              >
                <option value="">— no project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code ? `${p.code} — ${p.name}` : p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lines table */}
          <div className="px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase pb-2 pr-2">Account</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase pb-2 pr-2">Label</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase pb-2 pr-2 w-28">Debit</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase pb-2 pr-2 w-28">Credit</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-ink-50">
                    <td className="py-1.5 pr-2">
                      {accounts.length > 0 ? (
                        <select
                          value={line.account}
                          onChange={(e) => updateLine(line.id, "account", e.target.value)}
                          className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 focus:outline-none focus:border-brand-400 bg-white"
                        >
                          <option value="">— account —</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={line.account}
                          onChange={(e) => updateLine(line.id, "account", e.target.value)}
                          placeholder="Account ID"
                          className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 focus:outline-none focus:border-brand-400"
                        />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => updateLine(line.id, "label", e.target.value)}
                        placeholder="Label"
                        className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 focus:outline-none focus:border-brand-400"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={line.debit}
                        onChange={(e) => updateLine(line.id, "debit", e.target.value)}
                        placeholder="0"
                        className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 text-right focus:outline-none focus:border-brand-400"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={line.credit}
                        onChange={(e) => updateLine(line.id, "credit", e.target.value)}
                        placeholder="0"
                        className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 text-right focus:outline-none focus:border-brand-400"
                      />
                    </td>
                    <td className="py-1.5">
                      {lines.length > 2 && (
                        <button type="button" onClick={() => removeLine(line.id)}
                          className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-200">
                  <td colSpan={2} className="pt-2 text-xs text-ink-500 font-semibold uppercase">Total</td>
                  <td className="pt-2 pr-2 text-right text-xs font-semibold text-ink-900 tabular-nums">{FMT.format(totalDebit)}</td>
                  <td className="pt-2 pr-2 text-right text-xs font-semibold text-ink-900 tabular-nums">{FMT.format(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <button type="button" onClick={addLine}
              className="mt-2 flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition">
              <Plus className="w-3.5 h-3.5" /> Add line
            </button>
          </div>

          {/* Balance indicator */}
          <div className="px-6 py-3 mt-1">
            {totalDebit === 0 ? null : balanced ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Balanced — debit = credit = {FMT.format(totalDebit)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Unbalanced: debit {FMT.format(totalDebit)} ≠ credit {FMT.format(totalCredit)} (diff. {FMT.format(Math.abs(totalDebit - totalCredit))})
              </div>
            )}
          </div>

          {/* Justificatifs (recus/factures) */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 uppercase">
                <Paperclip className="w-3.5 h-3.5" /> Justificatifs
              </label>
              {isEdit && (
                <label className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 cursor-pointer transition ${uploading ? "bg-ink-100 text-ink-400" : "text-brand-600 hover:bg-brand-50"}`}>
                  <Plus className="w-3.5 h-3.5" />
                  {uploading ? "Envoi…" : "Ajouter un reçu"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleUpload} disabled={uploading} className="hidden" />
                </label>
              )}
            </div>
            {!isEdit ? (
              <p className="text-xs text-ink-400 italic">Enregistrez d'abord l'écriture pour y joindre un reçu.</p>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-ink-400 italic">Aucun justificatif. Joignez le reçu ou la facture (jpg, png, pdf — max 10 Mo).</p>
            ) : (
              <ul className="space-y-1.5">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs border border-ink-100 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-ink-400 shrink-0" />
                    <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-brand-600 hover:underline">
                      {a.filename || a.url?.split("/").pop()}
                    </a>
                    <button type="button" onClick={() => handleDeleteAttachment(a.id)}
                      className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-2">
          <button type="button" onClick={() => { reset(); onClose?.(); }}
            className="px-4 py-2 text-sm font-medium text-ink-700 border border-ink-200 rounded-lg hover:bg-ink-50 transition">
            Cancel
          </button>
          <button
            type="button"
            disabled={!balanced || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Validate entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
