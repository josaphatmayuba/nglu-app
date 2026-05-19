import { useMemo } from "react";
import { TrendingUp, TrendingDown, Banknote, Building, Users, RefreshCw, FileText } from "lucide-react";
import moment from "moment";

// Assign icon and color based on transaction type name
function resolveStyle(name = "") {
  const n = name.toLowerCase();
  if (n.includes("sale") || n.includes("revenue") || n.includes("income"))
    return { icon: TrendingUp,   bg: "bg-emerald-50", iconCls: "text-emerald-600", badge: "text-emerald-700 bg-emerald-50" };
  if (n.includes("purchase") || n.includes("buy") || n.includes("expense"))
    return { icon: TrendingDown, bg: "bg-rose-50",    iconCls: "text-rose-600",    badge: "text-rose-700 bg-rose-50" };
  if (n.includes("bank") || n.includes("transfer"))
    return { icon: Building,     bg: "bg-brand-50",   iconCls: "text-brand-600",   badge: "text-brand-700 bg-brand-50" };
  if (n.includes("cash") || n.includes("payment") || n.includes("pay"))
    return { icon: Banknote,     bg: "bg-amber-50",   iconCls: "text-amber-600",   badge: "text-amber-700 bg-amber-50" };
  if (n.includes("salary") || n.includes("payroll") || n.includes("wage") || n.includes("staff"))
    return { icon: Users,        bg: "bg-purple-50",  iconCls: "text-purple-600",  badge: "text-purple-700 bg-purple-50" };
  return   { icon: RefreshCw,    bg: "bg-ink-50",     iconCls: "text-ink-500",     badge: "text-ink-600 bg-ink-100" };
}

function abbreviate(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

export default function JournauxPanel({ transactions = [], transactionTypes = [] }) {
  // Count transactions per type and find most recent date
  const statsByType = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const key = t.type || t.transactionType || "Other";
      if (!map[key]) map[key] = { count: 0, lastDate: null };
      map[key].count += 1;
      if (t.date) {
        if (!map[key].lastDate || t.date > map[key].lastDate) {
          map[key].lastDate = t.date;
        }
      }
    });
    return map;
  }, [transactions]);

  // Build display list: transaction types from DB + any extra types found in transactions
  const displayTypes = useMemo(() => {
    const listed = new Set();
    const result = [];

    // First: real transaction types from DB
    (transactionTypes || []).forEach((tt) => {
      const name = tt.name || tt.label || "";
      if (!name) return;
      listed.add(name);
      result.push({ name, description: tt.description || "" });
    });

    // Then: any additional types present in transactions but not in DB list
    Object.keys(statsByType).forEach((key) => {
      if (!listed.has(key)) {
        result.push({ name: key, description: "" });
      }
    });

    return result;
  }, [transactionTypes, statsByType]);

  // If no types at all, group by type from transactions directly
  const hasTypes = displayTypes.length > 0;

  return (
    <div>
      {!hasTypes && (
        <p className="text-sm text-ink-400 text-center py-10">No journal types found</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {displayTypes.map((jt) => {
          const style = resolveStyle(jt.name);
          const Icon  = style.icon;
          const stats = statsByType[jt.name] ?? { count: 0, lastDate: null };
          const abbr  = abbreviate(jt.name);

          return (
            <div
              key={jt.name}
              className="bg-white rounded-xl border border-ink-200 p-5 hover:border-brand-300 hover:shadow-sm transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${style.iconCls}`} />
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${style.badge}`}>
                  {abbr}
                </span>
              </div>
              <h4 className="font-semibold text-ink-900 text-sm">{jt.name}</h4>
              {jt.description && (
                <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{jt.description}</p>
              )}
              <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-ink-500 uppercase">Entries</div>
                  <div className="text-sm font-semibold text-ink-900">{stats.count || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-500 uppercase">Last</div>
                  <div className="text-sm font-semibold text-ink-900">
                    {stats.lastDate ? moment(stats.lastDate).format("DD/MM/YY") : "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
