import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle, Clock, Landmark, ArrowRight } from "lucide-react";
import moment from "moment";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
};

const RANGES = [
  { key: "12M", months: 12 },
  { key: "6M",  months: 6  },
  { key: "3M",  months: 3  },
];

const CHARGE_COLORS = ["#6366f1","#10b981","#f59e0b","#a855f7","#71717a"];

function DynamicAlerts({ trailBalance, transactions }) {
  const alerts = useMemo(() => {
    const list = [];
    const all = trailBalance
      ? [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])]
      : [];

    // Tax account with positive balance
    const taxItems = all.filter((a) => /tax|vat|tva/i.test(a.subAccount || ""));
    const taxBalance = taxItems.reduce((s, a) => s + a.balance, 0);
    if (taxBalance > 0) {
      list.push({
        icon: AlertTriangle, bg: "bg-amber-50", iconColor: "text-amber-600",
        title: "Tax to declare",
        desc: `Balance: ${FMT.format(taxBalance)} on ${taxItems.map((a) => a.subAccount).join(", ")}`,
      });
    }

    // Asset accounts with negative balance
    const negAssets = all.filter((a) => a.accountType === "Asset" && a.balance < 0);
    if (negAssets.length > 0) {
      list.push({
        icon: AlertTriangle, bg: "bg-rose-50", iconColor: "text-rose-600",
        title: "Negative asset balance",
        desc: negAssets.map((a) => a.subAccount).join(", "),
      });
    }

    // Transactions without assigned accounts
    const unmatched = (transactions ?? []).filter(
      (t) => !t.debitId && !t.creditId && !t.debitAccount && !t.creditAccount
    ).length;
    if (unmatched > 0) {
      list.push({
        icon: Clock, bg: "bg-red-50", iconColor: "text-red-600",
        title: `${unmatched} unassigned entry${unmatched > 1 ? "ies" : ""}`,
        desc: "Transactions missing account assignment",
      });
    }

    if (list.length === 0) {
      list.push({
        icon: CheckCircle, bg: "bg-emerald-50", iconColor: "text-emerald-600",
        title: "All clear",
        desc: "No issues detected for this fiscal year",
      });
    }

    return list;
  }, [trailBalance, transactions]);

  return (
    <div className="space-y-2.5">
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div key={i} className="flex items-start gap-2.5 text-xs">
            <div className={`w-7 h-7 rounded-md ${alert.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${alert.iconColor}`} />
            </div>
            <div>
              <div className="text-ink-900 font-medium">{alert.title}</div>
              <div className="text-ink-500">{alert.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OverviewPanel({ transactions = [], trailBalance = null, incomeStatement, currencySymbol = "$", onNavigateEcritures }) {
  const fmt = (v) => `${currencySymbol} ${FMT.format(Number(v || 0))}`;
  const [range, setRange] = useState("12M");
  const months = RANGES.find((r) => r.key === range)?.months ?? 12;

  // Monthly CA vs Expenses from transactions
  const chartData = useMemo(() => {
    const cutoff = moment().subtract(months, "months").startOf("month");
    const buckets = {};
    for (let i = months - 1; i >= 0; i--) {
      const label = moment().subtract(i, "months").format("MMM");
      buckets[label] = { month: label, revenue: 0, expense: 0 };
    }
    transactions.forEach((t) => {
      if (!t.date) return;
      const m = moment(t.date);
      if (m.isBefore(cutoff)) return;
      const label = m.format("MMM");
      if (!buckets[label]) return;
      const amount = Number(t.amount || 0);
      const creditName = String(t.creditAccountName || t.creditAccount || "").toLowerCase();
      const debitName  = String(t.debitAccountName  || t.debitAccount  || "").toLowerCase();
      if (creditName.includes("sales") || creditName.includes("revenue")) buckets[label].revenue += amount;
      if (debitName.includes("expense") || debitName.includes("cost") || debitName.includes("salary") || debitName.includes("rent")) buckets[label].expense += amount;
    });
    return Object.values(buckets);
  }, [transactions, months]);

  // incomeStatement from backend: { totalRevenue, totalExpense }
  const totalRevenue = Number(incomeStatement?.totalRevenue ?? chartData.reduce((s, d) => s + d.revenue, 0));
  const totalExpense = Number(incomeStatement?.totalExpense ?? chartData.reduce((s, d) => s + d.expense, 0));

  // Top expenses from trial balance (Expense type)
  const topExpenses = useMemo(() => {
    if (!trailBalance) return [];
    const all = [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])];
    return all
      .filter((a) => a.accountType === "Expense" && a.balance !== 0)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 5)
      .map((a) => ({ name: a.subAccount, amount: Math.abs(a.balance) }));
  }, [trailBalance]);

  const topTotal = topExpenses.reduce((s, c) => s + c.amount, 0) || 1;

  // Asset accounts for treasury display
  const assetAccounts = useMemo(() => {
    if (!trailBalance) return [];
    const all = [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])];
    return all.filter((a) => a.accountType === "Asset").slice(0, 3);
  }, [trailBalance]);

  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-ink-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-ink-900">Revenue vs Expenses</h3>
              <p className="text-xs text-ink-500 mt-0.5">Last {months} months</p>
            </div>
            <div className="flex gap-1 p-1 bg-ink-100 rounded-lg">
              {RANGES.map((r) => (
                <button key={r.key} type="button" onClick={() => setRange(r.key)}
                  className={`px-3 py-1 text-xs font-medium rounded transition ${range === r.key ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" style={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(v, name) => [fmt(v), name === "revenue" ? "Revenue" : "Expenses"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" /><span className="text-ink-600">Revenue</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-rose-500 rounded-full inline-block" /><span className="text-ink-600">Expenses</span></div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3 md:space-y-4">
          {/* Asset accounts */}
          <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5">
            <h3 className="font-semibold text-ink-900 text-sm mb-1">Assets</h3>
            <p className="text-xs text-ink-500 mb-3">{moment().format("DD MMMM YYYY")}</p>
            <div className="text-2xl font-semibold text-ink-900 tracking-tight">
              <span className="text-sm text-ink-500 mr-1">{currencySymbol}</span>
              {FMT.format(totalAssets)}
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t border-ink-100">
              {assetAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-ink-400" />
                    <span className="text-ink-700">{a.subAccount}</span>
                  </span>
                  <span className="font-medium text-ink-900">{currencySymbol} {fmtShort(a.balance)}</span>
                </div>
              ))}
              {assetAccounts.length === 0 && (
                <p className="text-xs text-ink-400">No asset accounts with activity</p>
              )}
            </div>
          </div>

          {/* Dynamic alerts */}
          <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">To review</h3>
            <DynamicAlerts trailBalance={trailBalance} transactions={transactions} />
          </div>
        </div>
      </div>

      {/* Top expenses */}
      <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-ink-900">Top expense accounts</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              {topExpenses.length > 0 ? `Total: ${fmt(topTotal)}` : "No data"}
            </p>
          </div>
          <button type="button" onClick={onNavigateEcritures}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Detail <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {topExpenses.length === 0 && (
            <p className="text-sm text-ink-400 text-center py-4">No expense activity recorded</p>
          )}
          {topExpenses.map((c, i) => {
            const pct = Math.round((c.amount / topTotal) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHARGE_COLORS[i % CHARGE_COLORS.length] }} />
                    <span className="text-ink-700 font-medium">{c.name}</span>
                  </span>
                  <span className="font-semibold text-ink-900">{currencySymbol} {fmtShort(c.amount)} · {pct}%</span>
                </div>
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHARGE_COLORS[i % CHARGE_COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
