import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const TYPE_ORDER = ["Asset", "Liability", "Equity", "Revenue", "Expense", "Withdrawal"];
const TYPE_COLOR = {
  Asset:      "text-brand-600 bg-brand-50",
  Liability:  "text-rose-600 bg-rose-50",
  Equity:     "text-purple-600 bg-purple-50",
  Revenue:    "text-emerald-600 bg-emerald-50",
  Expense:    "text-amber-600 bg-amber-50",
  Withdrawal: "text-ink-500 bg-ink-100",
};

function AccountRow({ item, currencySymbol }) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 hover:bg-ink-50 rounded-lg transition"
    >
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 shrink-0" />
        <span className="text-sm text-ink-700">{item.subAccount}</span>
      </div>
      <span className={`text-sm font-medium tabular-nums ${item.balance > 0 ? "text-emerald-600" : item.balance < 0 ? "text-red-500" : "text-ink-400"}`}>
        {item.balance !== 0 ? `${currencySymbol} ${FMT.format(Math.abs(item.balance))}` : "—"}
      </span>
    </div>
  );
}

function AccountGroup({ type, items, currencySymbol }) {
  const [open, setOpen] = useState(true);
  const total = items.reduce((s, i) => s + i.balance, 0);
  const colorClass = TYPE_COLOR[type] || "text-ink-600 bg-ink-100";

  return (
    <div className="mb-2">
      <div
        className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-ink-50 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-ink-400 shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-ink-400 shrink-0" />
          }
          <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${colorClass}`}>{type}</span>
          <span className="text-xs text-ink-400 ml-1">{items.length} account{items.length !== 1 ? "s" : ""}</span>
        </div>
        <span className="text-sm font-semibold text-ink-900 tabular-nums">
          {total !== 0 ? `${currencySymbol} ${FMT.format(Math.abs(total))}` : "—"}
        </span>
      </div>
      {open && (
        <div className="ml-4 border-l border-ink-100 pl-2">
          {items.map((item) => (
            <AccountRow key={item.id} item={item} currencySymbol={currencySymbol} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanComptablePanel({ trailBalance = null, loading = false, currencySymbol = "$" }) {
  // Merge debits and credits from trail balance into one list
  const allItems = trailBalance
    ? [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])]
    : [];

  // Deduplicate by id (a sub-account can appear in both debits and credits)
  const seen = new Set();
  const items = allItems.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Group by account type
  const byType = {};
  items.forEach((a) => {
    const type = a.accountType || a.account || "Other";
    if (!byType[type]) byType[type] = [];
    byType[type].push(a);
  });

  const sortedTypes = [
    ...TYPE_ORDER.filter((t) => byType[t]),
    ...Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t)),
  ];

  const totalAccounts = items.length;

  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <h3 className="font-semibold text-ink-900 text-sm">Chart of Accounts</h3>
        <span className="text-xs text-ink-500">{totalAccounts} account{totalAccounts !== 1 ? "s" : ""}</span>
      </div>

      {loading && <div className="py-12 text-center text-ink-400 text-sm">Loading…</div>}

      {!loading && !trailBalance && (
        <div className="py-12 text-center text-ink-400 text-sm">No account data available</div>
      )}

      {!loading && trailBalance && totalAccounts === 0 && (
        <div className="py-12 text-center text-ink-400 text-sm">No accounts with activity found</div>
      )}

      {!loading && totalAccounts > 0 && (
        <div className="p-3">
          {sortedTypes.map((type) => (
            <AccountGroup
              key={type}
              type={type}
              items={byType[type]}
              currencySymbol={currencySymbol}
            />
          ))}
        </div>
      )}
    </div>
  );
}
