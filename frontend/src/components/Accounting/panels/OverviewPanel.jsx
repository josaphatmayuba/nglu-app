import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AlertTriangle, CheckSquare, Clock, Landmark, ArrowRight } from "lucide-react";
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
  { key: "6M", months: 6 },
  { key: "3M", months: 3 },
];

const CHARGE_COLORS = ["#6366f1","#10b981","#f59e0b","#a855f7","#71717a"];

function DynamicAlerts({ accounts = [], transactions = [] }) {
  const alerts = useMemo(() => {
    const list = [];

    // 1. TVA collectée non nulle ce mois = à déclarer
    const tvaCollectee = accounts
      .filter((a) => String(a.accountNumber || a.id || "").startsWith("4453"))
      .reduce((s, a) => s + Number(a.openingBalance || a.balance || 0), 0);
    if (tvaCollectee > 0) {
      list.push({
        icon: AlertTriangle,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        title: "TVA à déclarer",
        desc: `Solde compte 4453 : ${new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(tvaCollectee)}`,
      });
    }

    // 2. Transactions sans compte débit ou crédit assigné
    const unmatched = transactions.filter(
      (t) => !t.debitAccount && !t.debitAccountName && !t.creditAccount && !t.creditAccountName
    ).length;
    if (unmatched > 0) {
      list.push({
        icon: Clock,
        bg: "bg-red-50",
        iconColor: "text-red-600",
        title: `${unmatched} écriture${unmatched > 1 ? "s" : ""} sans compte`,
        desc: "Transactions à vérifier et imputer",
      });
    }

    // 3. Comptes classe 5 (trésorerie) avec solde négatif
    const negTreso = accounts.filter(
      (a) => String(a.accountNumber || a.id || "").startsWith("5") &&
             Number(a.openingBalance || a.balance || 0) < 0
    );
    if (negTreso.length > 0) {
      list.push({
        icon: AlertTriangle,
        bg: "bg-rose-50",
        iconColor: "text-rose-600",
        title: "Trésorerie négative",
        desc: `${negTreso.map((a) => a.name || a.accountNumber).join(", ")}`,
      });
    }

    // 4. Tout est à jour
    if (list.length === 0) {
      list.push({
        icon: CheckSquare,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        title: "Tout est à jour",
        desc: "Aucune anomalie détectée sur cet exercice",
      });
    }

    return list;
  }, [accounts, transactions]);

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

export default function OverviewPanel({ transactions = [], accounts = [], incomeStatement, currencySymbol = "CDF", onNavigateEcritures }) {
  const fmt = (v) => `${currencySymbol} ${FMT.format(Number(v || 0))}`;
  const [range, setRange] = useState("12M");

  const months = RANGES.find((r) => r.key === range)?.months ?? 12;

  // Build monthly CA vs Charges from transactions
  const chartData = useMemo(() => {
    const cutoff = moment().subtract(months, "months").startOf("month");
    const buckets = {};
    for (let i = months - 1; i >= 0; i--) {
      const label = moment().subtract(i, "months").format("MMM");
      buckets[label] = { month: label, ca: 0, charges: 0 };
    }
    transactions.forEach((t) => {
      if (!t.date) return;
      const m = moment(t.date);
      if (m.isBefore(cutoff)) return;
      const label = m.format("MMM");
      if (!buckets[label]) return;
      const debitName = String(t.debitAccountName || t.debitAccount || "").toLowerCase();
      const creditName = String(t.creditAccountName || t.creditAccount || "").toLowerCase();
      const amount = Number(t.amount || 0);
      if (creditName.includes("produit") || creditName.includes("vente") || creditName.match(/^7/)) {
        buckets[label].ca += amount;
      }
      if (debitName.includes("charge") || debitName.includes("achat") || debitName.match(/^6/)) {
        buckets[label].charges += amount;
      }
    });
    return Object.values(buckets);
  }, [transactions, months]);

  const totalCA = incomeStatement?.income ?? chartData.reduce((s, d) => s + d.ca, 0);
  const totalCharges = incomeStatement?.expense ?? chartData.reduce((s, d) => s + d.charges, 0);
  const resultat = totalCA - totalCharges;

  // Top charges from transactions — group by debit account
  const topCharges = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (!t.amount) return;
      const key = t.debitAccount || t.debitAccountName || "Autres";
      map[key] = (map[key] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));
  }, [transactions]);

  const topTotal = topCharges.reduce((s, c) => s + c.amount, 0) || 1;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-ink-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-ink-900">Évolution CA vs Charges</h3>
              <p className="text-xs text-ink-500 mt-0.5">{months} derniers mois</p>
            </div>
            <div className="flex gap-1 p-1 bg-ink-100 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1 text-xs font-medium rounded transition ${
                    range === r.key
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-700"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCharges" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="month" stroke="#a1a1aa" style={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#a1a1aa" style={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <Tooltip
                formatter={(v, name) => [fmt(v), name === "ca" ? "Chiffre d'affaires" : "Charges"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="ca" stroke="#10b981" strokeWidth={2} fill="url(#colorCA)" />
              <Area type="monotone" dataKey="charges" stroke="#f43f5e" strokeWidth={2} fill="url(#colorCharges)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" /><span className="text-ink-600">Chiffre d'affaires</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-rose-500 rounded-full inline-block" /><span className="text-ink-600">Charges</span></div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3 md:space-y-4">
          {/* Trésorerie */}
          <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5">
            <h3 className="font-semibold text-ink-900 text-sm mb-1">Trésorerie disponible</h3>
            <p className="text-xs text-ink-500 mb-3">{moment().format("DD MMMM YYYY")}</p>
            <div className="text-2xl font-semibold text-ink-900 tracking-tight">
              <span className="text-sm text-ink-500 mr-1">{currencySymbol}</span>
              {FMT.format(accounts.reduce((s, a) => s + Number(a.openingBalance || 0), 0))}
            </div>
            <div className="space-y-2 mt-4 pt-4 border-t border-ink-100">
              {accounts.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-ink-400" />
                    <span className="text-ink-700">{a.name}</span>
                  </span>
                  <span className="font-medium text-ink-900">{currencySymbol} {fmtShort(a.openingBalance || 0)}</span>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-xs text-ink-400">Aucun compte disponible</p>
              )}
            </div>
          </div>

          {/* Alertes dynamiques */}
          <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-5">
            <h3 className="font-semibold text-ink-900 text-sm mb-3">À surveiller</h3>
            <DynamicAlerts accounts={accounts} transactions={transactions} />
          </div>
        </div>
      </div>

      {/* Top charges */}
      <div className="bg-white rounded-xl border border-ink-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-ink-900">Top postes de charges</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              {topCharges.length > 0 ? `Répartition de ${fmt(topTotal)}` : "Aucune donnée"}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateEcritures}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Détail <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {topCharges.length === 0 && (
            <p className="text-sm text-ink-400 text-center py-4">Aucune charge enregistrée pour la période</p>
          )}
          {topCharges.map((c, i) => {
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
