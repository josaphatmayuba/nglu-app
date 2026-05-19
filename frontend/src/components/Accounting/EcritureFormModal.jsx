import { useState, useMemo } from "react";
import { X, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import { addTransaction } from "@/redux/rtk/features/transaction/transactionSlice";

const JOURNALS = [
  { code: "VTE", label: "Ventes" },
  { code: "ACH", label: "Achats" },
  { code: "BNQ", label: "Banque" },
  { code: "CAI", label: "Caisse" },
  { code: "SAL", label: "Paie" },
  { code: "OD",  label: "Opérations diverses" },
];

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const emptyLine = () => ({ id: crypto.randomUUID(), account: "", label: "", debit: "", credit: "" });

export default function EcritureFormModal({ open, onClose, accounts = [] }) {
  const dispatch = useDispatch();
  const [journal, setJournal] = useState("OD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  const totalDebit  = useMemo(() => lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (Number(l.credit) || 0), 0), 0);
  const balanced = totalDebit > 0 && totalDebit === totalCredit;

  const updateLine = (id, field, value) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.id !== id));

  const reset = () => {
    setJournal("OD");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setLines([emptyLine(), emptyLine()]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) return;
    setSubmitting(true);
    const debitLine  = lines.find((l) => Number(l.debit)  > 0);
    const creditLine = lines.find((l) => Number(l.credit) > 0);
    await dispatch(addTransaction({
      date,
      type: journal,
      note: note || undefined,
      debitAccount:  debitLine?.account  || undefined,
      creditAccount: creditLine?.account || undefined,
      amount: totalDebit,
    }));
    setSubmitting(false);
    reset();
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="text-base font-semibold text-ink-900">Nouvelle écriture comptable</h2>
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
              <label className="block text-xs font-medium text-ink-600 mb-1">Journal</label>
              <select
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
              >
                {JOURNALS.map((j) => (
                  <option key={j.code} value={j.code}>{j.code} — {j.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-ink-600 mb-1">Libellé</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Description de l'écriture"
                className="w-full text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Lines table */}
          <div className="px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase pb-2 pr-2">Compte</th>
                  <th className="text-left text-xs font-semibold text-ink-500 uppercase pb-2 pr-2">Libellé ligne</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase pb-2 pr-2 w-28">Débit</th>
                  <th className="text-right text-xs font-semibold text-ink-500 uppercase pb-2 pr-2 w-28">Crédit</th>
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
                          <option value="">— compte —</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.accountNumber || a.id}>
                              {a.accountNumber || a.id} {a.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={line.account}
                          onChange={(e) => updateLine(line.id, "account", e.target.value)}
                          placeholder="N° compte"
                          className="w-full text-xs border border-ink-200 rounded-md px-2 py-1 focus:outline-none focus:border-brand-400"
                        />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => updateLine(line.id, "label", e.target.value)}
                        placeholder="Libellé"
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
                        <button type="button" onClick={() => removeLine(line.id)} className="p-1 rounded hover:bg-rose-50 text-ink-400 hover:text-rose-500 transition">
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
                  <td className="pt-2 pr-2 text-right text-xs font-semibold text-ink-900 tabular-nums">
                    {FMT.format(totalDebit)}
                  </td>
                  <td className="pt-2 pr-2 text-right text-xs font-semibold text-ink-900 tabular-nums">
                    {FMT.format(totalCredit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            <button
              type="button"
              onClick={addLine}
              className="mt-2 flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
            </button>
          </div>

          {/* Balance indicator */}
          <div className="px-6 py-3 mt-1">
            {totalDebit === 0 ? null : balanced ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Écriture équilibrée — débit = crédit = CDF {FMT.format(totalDebit)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Déséquilibre : débit {FMT.format(totalDebit)} ≠ crédit {FMT.format(totalCredit)} (diff. {FMT.format(Math.abs(totalDebit - totalCredit))})
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { reset(); onClose?.(); }}
            className="px-4 py-2 text-sm font-medium text-ink-700 border border-ink-200 rounded-lg hover:bg-ink-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="ecriture-form"
            disabled={!balanced || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Enregistrement…" : "Valider l'écriture"}
          </button>
        </div>
      </div>
    </div>
  );
}
