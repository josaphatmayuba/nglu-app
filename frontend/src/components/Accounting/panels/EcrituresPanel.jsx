import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";

const PAGE_SIZE = 15;

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });
const fmt = (v) => `CDF ${FMT.format(Number(v || 0))}`;

export default function EcrituresPanel({ transactions = [], loading = false }) {
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
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-8 text-center text-ink-400 text-sm">Chargement…</td></tr>
            )}
            {!loading && slice.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-ink-400 text-sm">Aucune écriture trouvée</td></tr>
            )}
            {slice.map((t, i) => (
              <tr key={t.id ?? i} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                <td className="px-4 py-3 text-ink-600 whitespace-nowrap text-xs">
                  {t.date ? moment(t.date).format("DD/MM/YYYY") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">#{t.id ?? "—"}</td>
                <td className="px-4 py-3 text-ink-900 max-w-[200px] truncate">
                  {t.note || t.description || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
                  {t.debitAccount || t.debitAccountName || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-600 whitespace-nowrap">
                  {t.creditAccount || t.creditAccountName || "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900 whitespace-nowrap">
                  {fmt(t.amount)}
                </td>
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
