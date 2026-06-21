// Trial Balance — one row per (account, currency).
// Computed from raw transactions so that multi-currency amounts are never collapsed.

import { useMemo } from "react";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 2 });

const getCurrencyCode = (symbol) => {
  if (symbol === "$") return "USD";
  if (symbol === "€") return "EUR";
  if (symbol === "£") return "GBP";
  if (symbol === "CDF") return "CDF";
  return "N/A";
};

const fmt = (v, symbol) => {
  if (!v) return "—";
  const code = getCurrencyCode(symbol);
  return `${code} ${FMT.format(Number(v))}`;
};

const decodeHTML = (str) => {
  if (typeof document === "undefined" || !str) return str ?? "";
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
};

function buildTrialBalance(transactions, defaultSymbol) {
  const map = {};

  transactions.forEach((t) => {
    const rawSym = t.currencySymbol || defaultSymbol || "$";
    const sym    = decodeHTML(rawSym) || rawSym;
    const curId  = t.currencyId ?? sym;
    const amount = Number(t.amount || 0);

    const debitName  = t.debitAccountName  || t.debitAccount  || t.debit?.name  || "";
    const creditName = t.creditAccountName || t.creditAccount || t.credit?.name || "";

    if (debitName) {
      const key = `${debitName}::${curId}`;
      if (!map[key]) map[key] = { account: debitName, symbol: sym, curId, debit: 0, credit: 0 };
      map[key].debit += amount;
    }
    if (creditName) {
      const key = `${creditName}::${curId}`;
      if (!map[key]) map[key] = { account: creditName, symbol: sym, curId, debit: 0, credit: 0 };
      map[key].credit += amount;
    }
  });

  return Object.values(map)
    .filter((r) => r.debit > 0 || r.credit > 0)
    .sort((a, b) => a.account.localeCompare(b.account));
}

export default function PlanComptablePanel({
  trailBalance = null,
  transactions = [],
  loading = false,
  currencySymbol = "$",
}) {
  // Prefer per-currency rows computed from raw transactions when available
  const txRows = useMemo(
    () => buildTrialBalance(transactions, currencySymbol),
    [transactions, currencySymbol]
  );

  // Fall back to backend aggregated data (single currency)
  const useBackend = txRows.length === 0 && trailBalance;
  const debits  = trailBalance?.debits  ?? [];
  const credits = trailBalance?.credits ?? [];

  const totalDebit  = txRows.reduce((s, r) => s + r.debit,  0) || trailBalance?.totalDebit  || 0;
  const totalCredit = txRows.reduce((s, r) => s + r.credit, 0) || Math.abs(trailBalance?.totalCredit || 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  const hasData = txRows.length > 0 || debits.length > 0 || credits.length > 0;

  return (
    <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-900 text-sm">Trial Balance</h3>
          <p className="text-xs text-ink-400 mt-0.5">All accounts with activity · one row per currency</p>
        </div>
        {hasData && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${balanced ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
            {balanced ? "Balanced ✓" : "Unbalanced ✗"}
          </span>
        )}
      </div>

      {loading && <div className="py-12 text-center text-ink-400 text-sm">Loading…</div>}

      {!loading && !hasData && (
        <div className="py-12 text-center text-ink-400 text-sm">No account activity recorded yet</div>
      )}

      {!loading && hasData && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">Account</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider">Debit</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-ink-500 uppercase tracking-wider">Credit</th>
              </tr>
            </thead>
            <tbody>
              {txRows.length > 0
                ? txRows.map((row, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                      <td className="py-2 px-4 text-ink-900">
                        {row.account}
                        <span className="ml-2 text-xs text-ink-400 font-mono">{row.symbol}</span>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium text-emerald-700">
                        {row.debit > 0 ? fmt(row.debit, row.symbol) : ""}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-medium text-rose-700">
                        {row.credit > 0 ? fmt(row.credit, row.symbol) : ""}
                      </td>
                    </tr>
                  ))
                : [
                    ...debits.map((item, i) => (
                      <tr key={`d-${i}`} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                        <td className="py-2 px-4 text-ink-900">{item.subAccount}</td>
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-emerald-700">
                          {item.balance ? fmt(item.balance, currencySymbol) : ""}
                        </td>
                        <td className="py-2 px-4" />
                      </tr>
                    )),
                    ...credits.map((item, i) => (
                      <tr key={`c-${i}`} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                        <td className="py-2 px-4 text-ink-900">{item.subAccount}</td>
                        <td className="py-2 px-4" />
                        <td className="py-2 px-4 text-right tabular-nums font-medium text-rose-700">
                          {item.balance ? fmt(Math.abs(item.balance), currencySymbol) : ""}
                        </td>
                      </tr>
                    )),
                  ]}

              {/* Totals per currency when multi-currency */}
              {txRows.length > 0 && (() => {
                const totals = {};
                txRows.forEach((r) => {
                  if (!totals[r.curId]) totals[r.curId] = { symbol: r.symbol, debit: 0, credit: 0 };
                  totals[r.curId].debit  += r.debit;
                  totals[r.curId].credit += r.credit;
                });
                return Object.entries(totals).map(([key, t]) => (
                  <tr key={`tot-${key}`} className="bg-ink-100 font-semibold border-t-2 border-ink-200">
                    <td className="py-3 px-4 text-ink-900 text-xs uppercase">Total {t.symbol}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-ink-900">{fmt(t.debit, t.symbol)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-ink-900">{fmt(t.credit, t.symbol)}</td>
                  </tr>
                ));
              })()}

              {/* Fallback single-currency total */}
              {txRows.length === 0 && (
                <tr className="bg-ink-100 font-semibold border-t-2 border-ink-200">
                  <td className="py-3 px-4 text-ink-900 text-xs uppercase">Total</td>
                  <td className="py-3 px-4 text-right tabular-nums text-ink-900">
                    {trailBalance?.totalDebit ? fmt(trailBalance.totalDebit, currencySymbol) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-ink-900">
                    {trailBalance?.totalCredit ? fmt(Math.abs(trailBalance.totalCredit), currencySymbol) : "—"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
