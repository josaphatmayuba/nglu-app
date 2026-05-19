// Inspired by incomeStatement.jsx and balanceSheet.jsx
// incomeStatement: { revenue[], expense[], profit, totalRevenue, totalExpense }
// balanceSheet:    { assets[], liabilities[], equity[], totalAsset, totalLiability, totalEquity }

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 });
const fmt = (v, sym) => v ? `${sym} ${FMT.format(Number(v))}` : "—";

function AccountTable({ title, colorClass, items, total, totalLabel = "Total", currencySymbol }) {
  if (!items?.length) return null;
  return (
    <div className="mb-6">
      <h4 className={`text-sm font-semibold mb-3 px-3 py-1.5 rounded-lg inline-block ${colorClass}`}>{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              <th className="py-2 px-4 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Account</th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                <td className="py-2 px-4 text-ink-800">{item.subAccount}</td>
                <td className="py-2 px-4 text-right tabular-nums text-ink-700">
                  {item.balance ? fmt(item.balance, currencySymbol) : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-ink-100 font-semibold">
              <td className="py-2 px-4 text-ink-900 text-xs uppercase">{totalLabel}</td>
              <td className="py-2 px-4 text-right tabular-nums text-ink-900">{fmt(total, currencySymbol)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EtatsFinanciersPanel({ incomeStatement, balanceSheet, currencySymbol = "$" }) {
  const hasIS = incomeStatement && (incomeStatement.revenue?.length || incomeStatement.expense?.length);
  const hasBS = balanceSheet && (balanceSheet.assets?.length || balanceSheet.liabilities?.length);

  if (!hasIS && !hasBS) {
    return (
      <div className="py-12 text-center text-ink-400 text-sm">
        No financial data available
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Income Statement ── */}
      {hasIS && (
        <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-100">
            <h3 className="font-semibold text-ink-900 text-sm">Income Statement</h3>
          </div>
          <div className="p-4">
            <AccountTable
              title="Revenue"
              colorClass="text-emerald-700 bg-emerald-50"
              items={incomeStatement.revenue}
              total={incomeStatement.totalRevenue}
              currencySymbol={currencySymbol}
            />
            <AccountTable
              title="Expenses"
              colorClass="text-rose-700 bg-rose-50"
              items={incomeStatement.expense}
              total={incomeStatement.totalExpense}
              currencySymbol={currencySymbol}
            />
            {/* Net profit row */}
            <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${Number(incomeStatement.profit) >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <span className={`font-semibold text-sm ${Number(incomeStatement.profit) >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                Net {Number(incomeStatement.profit) >= 0 ? "Profit" : "Loss"}
              </span>
              <span className={`font-bold text-base tabular-nums ${Number(incomeStatement.profit) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {fmt(Math.abs(Number(incomeStatement.profit || 0)), currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance Sheet ── */}
      {hasBS && (
        <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-100">
            <h3 className="font-semibold text-ink-900 text-sm">Balance Sheet</h3>
          </div>
          <div className="p-4">
            <AccountTable
              title="Assets"
              colorClass="text-brand-700 bg-brand-50"
              items={balanceSheet.assets}
              total={balanceSheet.totalAsset}
              currencySymbol={currencySymbol}
            />
            <AccountTable
              title="Liabilities"
              colorClass="text-amber-700 bg-amber-50"
              items={balanceSheet.liabilities}
              total={balanceSheet.totalLiability}
              currencySymbol={currencySymbol}
            />
            <AccountTable
              title="Equity"
              colorClass="text-purple-700 bg-purple-50"
              items={balanceSheet.equity}
              total={balanceSheet.totalEquity}
              currencySymbol={currencySymbol}
            />
            {/* Total Liability + Equity */}
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-sm text-brand-800">Total Liability & Equity</span>
              <span className="font-bold text-base tabular-nums text-brand-700">
                {fmt((Number(balanceSheet.totalLiability || 0) + Number(balanceSheet.totalEquity || 0)), currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
