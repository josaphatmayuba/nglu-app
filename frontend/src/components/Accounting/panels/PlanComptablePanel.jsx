// Inspired by trialBalance.jsx — same data structure: trailBalance.debits[], trailBalance.credits[]
// Each item: { subAccount, balance, totalDebit, totalCredit }

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 });
const fmt = (v) => (v ? FMT.format(Number(v)) : "—");


export default function PlanComptablePanel({ trailBalance = null, loading = false, currencySymbol = "$" }) {
  const debits  = trailBalance?.debits  ?? [];
  const credits = trailBalance?.credits ?? [];
  const total   = (debits.length + credits.length);

  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-900 text-sm">Trial Balance</h3>
          <p className="text-xs text-ink-400 mt-0.5">All accounts with activity</p>
        </div>
        <div className="text-right">
          {trailBalance && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${trailBalance.match ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
              {trailBalance.match ? "Balanced ✓" : "Unbalanced ✗"}
            </span>
          )}
        </div>
      </div>

      {loading && <div className="py-12 text-center text-ink-400 text-sm">Loading…</div>}

      {!loading && !trailBalance && (
        <div className="py-12 text-center text-ink-400 text-sm">No data available</div>
      )}

      {!loading && trailBalance && total === 0 && (
        <div className="py-12 text-center text-ink-400 text-sm">No account activity recorded yet</div>
      )}

      {!loading && trailBalance && total > 0 && (
        <div className="p-4">
          {/* Full trial balance table — debits on left, credits on right */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Account</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider">Debit</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider">Credit</th>
                </tr>
              </thead>
              <tbody>
                {debits.map((item, i) => (
                  <tr key={`d-${i}`} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                    <td className="py-2 px-4 text-ink-900">{item.subAccount}</td>
                    <td className="py-2 px-4 text-right tabular-nums font-medium text-emerald-700">
                      {item.balance ? `${currencySymbol} ${fmt(item.balance)}` : ""}
                    </td>
                    <td className="py-2 px-4" />
                  </tr>
                ))}
                {credits.map((item, i) => (
                  <tr key={`c-${i}`} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                    <td className="py-2 px-4 text-ink-900">{item.subAccount}</td>
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4 text-right tabular-nums font-medium text-rose-700">
                      {item.balance ? `${currencySymbol} ${fmt(Math.abs(item.balance))}` : ""}
                    </td>
                  </tr>
                ))}
                <tr className="bg-ink-100 font-semibold border-t-2 border-ink-200">
                  <td className="py-3 px-4 text-ink-900 text-xs uppercase">Total</td>
                  <td className="py-3 px-4 text-right tabular-nums text-ink-900">
                    {trailBalance.totalDebit ? `${currencySymbol} ${fmt(trailBalance.totalDebit)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-ink-900">
                    {trailBalance.totalCredit ? `${currencySymbol} ${fmt(Math.abs(trailBalance.totalCredit))}` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
