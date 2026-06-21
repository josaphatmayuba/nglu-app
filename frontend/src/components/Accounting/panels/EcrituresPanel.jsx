import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import moment from "moment";
import usePermissions from "@/utils/usePermissions";
import FormattedAmount from "@/components/Shared/FormattedAmount";

const PAGE_SIZE = 15;

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

export default function EcrituresPanel({
  transactions = [],
  loading = false,
  currencySymbol = "$",
  onEdit,
  onDelete,
}) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission?.("update-transaction");
  const canDelete = hasPermission?.("delete-transaction");
  const showActions = canEdit || canDelete;
  const colSpan = showActions ? 7 : 6;

  // Use per-transaction currency if available, otherwise fall back to app default
  const fmtTx = (t) => (
    <FormattedAmount
      amount={t.amount || 0}
      currency={{
        currencyCode: t.currencyCode,
        currencyName: t.currencyName,
        currencySymbol: t.currencySymbol,
        ...t.currency
      }}
      fractionDigits={0}
    />
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const q = search.toLowerCase();
  const filtered = transactions.filter((t) => {
    if (!q) return true;
    return (
      String(t.id).includes(q) ||
      String(t.note || "").toLowerCase().includes(q) ||
      String(t.debitAccount || "").toLowerCase().includes(q) ||
      String(t.creditAccount || "").toLowerCase().includes(q) ||
      String(t.type || "").toLowerCase().includes(q)
    );
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-ink-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher une écriture..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:outline-none focus:border-brand-400"
          />
        </div>
        <span className="text-xs text-ink-500 ml-auto">{total} écriture{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              {["Date","Réf.","Libellé","Débit","Crédit","Montant"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
              {showActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={colSpan} className="py-8 text-center text-ink-400 text-sm">Chargement…</td></tr>
            )}
            {!loading && slice.length === 0 && (
              <tr><td colSpan={colSpan} className="py-8 text-center text-ink-400 text-sm">Aucune écriture trouvée</td></tr>
            )}
            {slice.map((t, i) => (
              <tr key={t.id ?? i} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                <td className="px-4 py-3 text-ink-600 whitespace-nowrap text-xs">
                  {t.date ? moment(t.date).format("DD/MM/YYYY") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">#{t.id ?? "—"}</td>
                <td className="px-4 py-3 text-ink-900 max-w-[200px] truncate">
                  {t.particulars || t.note || t.description || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
                  {t.debit?.name || t.debitAccount || t.debitAccountName || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
                  {t.credit?.name || t.creditAccount || t.creditAccountName || "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900 whitespace-nowrap">
                  {fmtTx(t)}
                </td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit?.(t)}
                          title="Modifier la transaction"
                          className="p-1.5 rounded-lg border border-ink-200 text-ink-600 hover:text-brand-700 hover:bg-brand-50 hover:border-brand-200 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete?.(t)}
                          title="Supprimer la transaction"
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100">
          <span className="text-xs text-ink-500">
            Page {page + 1} / {pages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-ink-200 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="p-1.5 rounded-lg border border-ink-200 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
