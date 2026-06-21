// Financial Statements — per-currency income statement + balance sheet.
// Falls back to backend aggregated data when transactions have no currency info.

import { useMemo } from "react";
import FormattedAmount from "@/components/Shared/FormattedAmount";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 });

const getCurrencyCode = (symbol, currencyName) => {
  if (currencyName) {
    const name = String(currencyName).toUpperCase();
    if (name.includes("FRANC CONGOLAIS")) return "CDF";
    if (name.includes("DOLLAR")) return "USD";
    if (name.includes("EURO")) return "EUR";
  }
  if (symbol === "$") return "USD";
  if (symbol === "€") return "EUR";
  if (symbol === "£") return "GBP";
  if (symbol === "CDF") return "CDF";
  return "N/A";
};

const fmt = (v, sym, currencyName) => {
  if (!v) return "—";
  const code = getCurrencyCode(sym, currencyName);
  return `${code} ${FMT.format(Number(v))}`;
};

const decodeHTML = (str) => {
  if (typeof document === "undefined" || !str) return str ?? "";
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
};

// Build account-type map from trailBalance: subAccountName → accountType
function buildTypeMap(trailBalance) {
  const map = {};
  if (!trailBalance) return map;
  [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])].forEach((a) => {
    if (a.subAccount && a.accountType) map[a.subAccount.toLowerCase()] = a.accountType;
  });
  return map;
}

// Compute per-currency income statement from raw transactions
function computeIncomeStatement(transactions, typeMap, defaultSymbol) {
  // revenue: credit account is Revenue type
  // expense: debit account is Expense type
  const map = {};

  transactions.forEach((t) => {
    const rawSym = t.currencySymbol || defaultSymbol || "$";
    const sym    = decodeHTML(rawSym) || rawSym;
    const curId  = t.currencyId ?? sym;
    const amount = Number(t.amount || 0);

    const creditName = (t.creditAccountName || t.creditAccount || t.credit?.name || "").toLowerCase();
    const debitName  = (t.debitAccountName  || t.debitAccount  || t.debit?.name  || "").toLowerCase();

    const creditType = typeMap[creditName] || "";
    const debitType  = typeMap[debitName]  || "";

    const isRevenue = creditType === "Revenue" || /revenue|sales|rental/i.test(creditName);
    const isExpense = debitType  === "Expense" || /expense|cost|salary|maintenance|utilities/i.test(debitName);

    if (!isRevenue && !isExpense) return;

    if (!map[curId]) map[curId] = { sym, revenue: {}, expense: {} };

    if (isRevenue) {
      const acc = t.creditAccountName || t.creditAccount || t.credit?.name || "Revenue";
      map[curId].revenue[acc] = (map[curId].revenue[acc] || 0) + amount;
    }
    if (isExpense) {
      const acc = t.debitAccountName || t.debitAccount || t.debit?.name || "Expense";
      map[curId].expense[acc] = (map[curId].expense[acc] || 0) + amount;
    }
  });

  return Object.entries(map).map(([curId, data]) => {
    const revenueItems = Object.entries(data.revenue).map(([name, amount]) => ({ name, amount }));
    const expenseItems = Object.entries(data.expense).map(([name, amount]) => ({ name, amount }));
    const totalRevenue = revenueItems.reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenseItems.reduce((s, i) => s + i.amount, 0);
    return { curId, sym: data.sym, revenueItems, expenseItems, totalRevenue, totalExpense, profit: totalRevenue - totalExpense };
  });
}

// Multi-currency account table section
function CurrencySection({ sym, title, colorClass, items, total, totalLabel = "Total" }) {
  if (!items?.length) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className={`text-xs font-semibold px-2 py-0.5 rounded ${colorClass}`}>{title}</h4>
        <span className="text-xs font-mono text-ink-400">{sym}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
              <td className="py-1.5 px-3 text-ink-700">{item.subAccount ?? item.name}</td>
              <td className="py-1.5 px-3 text-right tabular-nums text-ink-700">
                {fmt(item.balance ?? item.amount, sym)}
              </td>
            </tr>
          ))}
          <tr className="bg-ink-100 font-semibold">
            <td className="py-2 px-3 text-ink-900 text-xs uppercase">{totalLabel}</td>
            <td className="py-2 px-3 text-right tabular-nums text-ink-900">{fmt(total, sym)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function EtatsFinanciersPanel({
  incomeStatement,
  balanceSheet,
  transactions = [],
  trailBalance = null,
  currencySymbol = "$",
}) {
  const typeMap = useMemo(() => buildTypeMap(trailBalance), [trailBalance]);

  const txIS = useMemo(
    () => computeIncomeStatement(transactions, typeMap, currencySymbol),
    [transactions, typeMap, currencySymbol]
  );

  const useBackendIS = txIS.length === 0;
  const hasIS = txIS.length > 0 || (incomeStatement && (incomeStatement.revenue?.length || incomeStatement.expense?.length));
  const hasBS = balanceSheet && (balanceSheet.assets?.length || balanceSheet.liabilities?.length || balanceSheet.equity?.length);

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
            {!useBackendIS && (
              <p className="text-xs text-ink-400 mt-0.5">Amounts shown per currency</p>
            )}
          </div>
          <div className="p-4">
            {!useBackendIS ? (
              txIS.map((cur) => (
                <div key={cur.curId} className="mb-6 border border-ink-100 rounded-lg p-3">
                  <div className="text-xs font-mono text-ink-500 mb-3 font-semibold">{cur.sym}</div>
                  <CurrencySection
                    sym={cur.sym} title="Revenue" colorClass="text-emerald-700 bg-emerald-50"
                    items={cur.revenueItems} total={cur.totalRevenue}
                  />
                  <CurrencySection
                    sym={cur.sym} title="Expenses" colorClass="text-rose-700 bg-rose-50"
                    items={cur.expenseItems} total={cur.totalExpense}
                  />
                  <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${cur.profit >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                    <span className={`font-semibold text-sm ${cur.profit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      Net {cur.profit >= 0 ? "Profit" : "Loss"}
                    </span>
                    <span className={`font-bold text-base tabular-nums ${cur.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {fmt(Math.abs(cur.profit), cur.sym)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <>
                {incomeStatement?.revenue?.length > 0 && (
                  <CurrencySection
                    sym={currencySymbol} title="Revenue" colorClass="text-emerald-700 bg-emerald-50"
                    items={incomeStatement.revenue} total={incomeStatement.totalRevenue}
                  />
                )}
                {incomeStatement?.expense?.length > 0 && (
                  <CurrencySection
                    sym={currencySymbol} title="Expenses" colorClass="text-rose-700 bg-rose-50"
                    items={incomeStatement.expense} total={incomeStatement.totalExpense}
                  />
                )}
                <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${Number(incomeStatement?.profit) >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  <span className={`font-semibold text-sm ${Number(incomeStatement?.profit) >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                    Net {Number(incomeStatement?.profit) >= 0 ? "Profit" : "Loss"}
                  </span>
                  <span className={`font-bold text-base tabular-nums ${Number(incomeStatement?.profit) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {fmt(Math.abs(Number(incomeStatement?.profit || 0)), currencySymbol)}
                  </span>
                </div>
              </>
            )}
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
            <CurrencySection
              sym={currencySymbol} title="Assets" colorClass="text-brand-700 bg-brand-50"
              items={balanceSheet.assets} total={balanceSheet.totalAsset}
            />
            <CurrencySection
              sym={currencySymbol} title="Liabilities" colorClass="text-amber-700 bg-amber-50"
              items={balanceSheet.liabilities} total={balanceSheet.totalLiability}
            />
            <CurrencySection
              sym={currencySymbol} title="Equity" colorClass="text-purple-700 bg-purple-50"
              items={balanceSheet.equity} total={balanceSheet.totalEquity}
            />
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-sm text-brand-800">Total Liability &amp; Equity</span>
              <span className="font-bold text-base tabular-nums text-brand-700">
                {fmt(Number(balanceSheet.totalLiability || 0) + Number(balanceSheet.totalEquity || 0), currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
