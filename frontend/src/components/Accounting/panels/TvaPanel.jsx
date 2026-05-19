import { useMemo } from "react";
import { AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import moment from "moment";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const STATUS = {
  en_cours: { label: "Current",  icon: Clock,        class: "text-amber-600 bg-amber-50" },
  passe:    { label: "Past",     icon: CheckCircle,  class: "text-ink-500 bg-ink-50" },
};

export default function TvaPanel({ trailBalance = null, transactions = [], currencySymbol = "$" }) {
  const fmt = (v) => `${currencySymbol} ${FMT.format(Math.abs(Number(v || 0)))}`;

  // Find tax-related accounts from trial balance (name contains "tax" / "vat" / "tva")
  const taxItems = useMemo(() => {
    if (!trailBalance) return [];
    const all = [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])];
    return all.filter((a) =>
      /tax|vat|tva/i.test(a.subAccount || "")
    );
  }, [trailBalance]);

  const taxBalance = taxItems.reduce((s, a) => s + a.balance, 0);
  const hasTaxData = taxItems.length > 0;

  // Monthly tax movements from transactions involving tax sub-accounts
  const taxSubAccountIds = new Set(taxItems.map((a) => a.id));

  const monthlyTax = useMemo(() => {
    if (taxSubAccountIds.size === 0) return [];
    const map = {};
    transactions.forEach((t) => {
      const isTax = taxSubAccountIds.has(t.debitId) || taxSubAccountIds.has(t.creditId);
      if (!isTax || !t.date) return;
      const key = moment(t.date).format("YYYY-MM");
      map[key] = (map[key] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([key, amount]) => ({
        key,
        period: moment(key, "YYYY-MM").format("MMMM YYYY"),
        amount,
        isCurrent: key === moment().format("YYYY-MM"),
        deadline: moment(key, "YYYY-MM").endOf("month").add(15, "days").format("YYYY-MM-DD"),
      }));
  }, [transactions, taxSubAccountIds]);

  const currentDeadline = moment().endOf("month").format("DD MMMM YYYY");

  return (
    <div className="space-y-4">
      {/* Alert */}
      {hasTaxData ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">
                Tax to declare — {moment().format("MMMM YYYY")}
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">Deadline: {currentDeadline}</p>
              <p className="text-xs text-amber-600 mt-2">
                Tax balance: <span className="font-semibold">{fmt(taxBalance)}</span>
                {taxBalance < 0 ? " (credit)" : ""}.
                Accounts: {taxItems.map((a) => a.subAccount).join(", ")}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-ink-50 border border-ink-200 rounded-xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-ink-500" />
          </div>
          <div>
            <h3 className="font-semibold text-ink-700 text-sm">No tax account data</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              No accounts named "Tax" or "VAT" found with activity in the trial balance.
            </p>
          </div>
        </div>
      )}

      {/* Tax account balances */}
      {hasTaxData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {taxItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-amber-100 p-4">
              <div className="text-xs text-ink-500 font-medium mb-1">{item.subAccount}</div>
              <div className="text-xl font-semibold text-ink-900">
                <span className="text-sm text-ink-400 mr-1">{currencySymbol}</span>
                {FMT.format(Math.abs(item.balance))}
                {item.balance < 0 && <span className="text-xs text-emerald-600 ml-1">(credit)</span>}
              </div>
              <div className="text-xs text-ink-400 mt-1 capitalize">{item.accountType}</div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly tax activity */}
      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900 text-sm">Monthly tax activity</h3>
          <p className="text-xs text-ink-400 mt-0.5">From transactions on tax accounts</p>
        </div>

        {monthlyTax.length === 0 ? (
          <div className="py-10 text-center text-ink-400 text-sm">
            No tax transactions found for this fiscal year
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                {["Period", "Status", "Amount", "Deadline"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyTax.map((d) => {
                const s = d.isCurrent ? STATUS.en_cours : STATUS.passe;
                const Icon = s.icon;
                return (
                  <tr key={d.key} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                    <td className="px-4 py-3 text-ink-900 font-medium capitalize">{d.period}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${s.class}`}>
                        <Icon className="w-3 h-3" /> {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{currencySymbol} {FMT.format(d.amount)}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{moment(d.deadline).format("DD/MM/YYYY")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
