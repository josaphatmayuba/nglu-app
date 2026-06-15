import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import { deleteTransaction, loadAllTransaction } from "@/redux/rtk/features/transaction/transactionSlice";
import { loadAllAccount, loadIncomeStatement, loadTrailBalance, loadBalanceSheet } from "@/redux/rtk/features/account/accountSlice";
import { loadAllTransactionType } from "@/redux/rtk/features/transactionType/transactionTypeSlice";
import { loadAllCurrency } from "@/redux/rtk/features/eCommerce/currency/currencySlice";
import { loadAllProjects } from "@/redux/rtk/features/project/projectSlice";
import { Plus, Download, TrendingUp, TrendingDown, Scale, Receipt } from "lucide-react";

import OverviewPanel        from "./panels/OverviewPanel";
import JournauxPanel        from "./panels/JournauxPanel";
import EcrituresPanel       from "./panels/EcrituresPanel";
import PlanComptablePanel   from "./panels/PlanComptablePanel";
import EtatsFinanciersPanel from "./panels/EtatsFinanciersPanel";
import TvaPanel             from "./panels/TvaPanel";
import EcritureFormModal    from "./EcritureFormModal";
import DateRangeFilter, { defaultDateRange } from "./DateRangeFilter";

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "journaux",  label: "Journals" },
  { key: "ecritures", label: "Entries" },
  { key: "plan",      label: "Chart of Accounts" },
  { key: "etats",     label: "Financial Statements" },
  { key: "tva",       label: "Tax" },
];

const decodeHTML = (str) => {
  if (typeof document === "undefined" || !str) return str ?? "";
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
};

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

// Group transactions by currency, compute revenue/expense per currency.
function computeKpisByCurrency(transactions) {
  const map = {};
  transactions.forEach((t) => {
    const rawSym = t.currencySymbol || "$";
    const sym    = decodeHTML(rawSym) || rawSym;
    const key    = t.currencyId ?? sym;
    const amount = Number(t.amount || 0);
    const creditName = (t.creditAccountName || t.creditAccount || t.credit?.name || "").toLowerCase();
    const debitName  = (t.debitAccountName  || t.debitAccount  || t.debit?.name  || "").toLowerCase();
    const isRevenue  = /revenue|sales|rental/i.test(creditName);
    const isExpense  = /expense|cost|salary|maintenance|utilities/i.test(debitName);
    if (!map[key]) map[key] = { sym, revenue: 0, expense: 0 };
    if (isRevenue) map[key].revenue += amount;
    if (isExpense) map[key].expense += amount;
  });
  return Object.entries(map)
    .filter(([, v]) => v.revenue > 0 || v.expense > 0)
    .map(([key, v]) => ({ key, sym: v.sym, revenue: v.revenue, expense: v.expense, result: v.revenue - v.expense }));
}

// KPI card showing one line per currency
function MultiKpiCard({ icon: Icon, label, colorKey, lines }) {
  const COLORS = {
    emerald: ["bg-emerald-50", "text-emerald-600"],
    rose:    ["bg-rose-50",    "text-rose-600"],
    brand:   ["bg-brand-50",   "text-brand-600"],
    red:     ["bg-red-50",     "text-red-600"],
    amber:   ["bg-amber-50",   "text-amber-600"],
  };
  const [bg, ic] = COLORS[colorKey] || COLORS.brand;
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${ic}`} />
        </div>
        <span className="text-xs text-ink-500 font-medium">{label}</span>
      </div>
      <div className="space-y-0.5">
        {lines.length === 0
          ? <p className="text-base font-semibold text-ink-400">—</p>
          : lines.map((line, i) => (
              <p key={i} className="text-sm font-semibold text-ink-900 tabular-nums leading-tight">{line}</p>
            ))
        }
      </div>
    </div>
  );
}

export default function AccountingPage() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState(() => defaultDateRange());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const transactions    = useSelector((s) => s.transactions?.list       ?? []);
  const txLoading       = useSelector((s) => s.transactions?.loading    ?? false);
  const accounts        = useSelector((s) => s.accounts?.list           ?? []);
  const acctLoading     = useSelector((s) => s.accounts?.loading        ?? false);
  const incomeStatement = useSelector((s) => s.accounts?.incomeStatement ?? null);
  const trailBalance    = useSelector((s) => s.accounts?.trailBalance   ?? null);
  const balanceSheet    = useSelector((s) => s.accounts?.balanceSheet   ?? null);
  const transactionTypes = useSelector((s) => s.transactionTypes?.list  ?? []);
  const currencies      = useSelector((s) => s.currency?.list           ?? []);
  const projects        = useSelector((s) => s.project?.list            ?? []);
  const { data: appSetting } = useSelector((s) => s.setting) || {};

  const currencySymbol = useMemo(
    () => decodeHTML(appSetting?.currency?.currencySymbol) || "$",
    [appSetting]
  );

  const transactionQuery = useMemo(
    () => ({ startDate: dateRange.from || undefined, endDate: dateRange.to || undefined, status: "true", count: 1000, offset: 0 }),
    [dateRange]
  );

  const reloadTransactions = () => dispatch(loadAllTransaction(transactionQuery));

  useEffect(() => {
    const reportParams = { startDate: dateRange.from || undefined, endDate: dateRange.to || undefined };
    dispatch(loadAllTransaction(transactionQuery));
    dispatch(loadAllAccount());
    dispatch(loadIncomeStatement(reportParams));
    dispatch(loadTrailBalance(reportParams));
    dispatch(loadAllTransactionType());
    dispatch(loadAllCurrency());
    dispatch(loadAllProjects());
    dispatch(loadBalanceSheet(reportParams));
  }, [dispatch, transactionQuery, dateRange]);

  const openCreateModal = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const closeEntryModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleDeleteTransaction = async (transaction) => {
    if (!window.confirm(`Supprimer la transaction #${transaction.id} ?`)) return;

    const response = await dispatch(deleteTransaction({ id: transaction.id }));
    if (response?.payload?.message === "success") {
      message.success("Transaction supprimee");
      reloadTransactions();
      return;
    }

    message.error(response?.payload?.message || "Suppression impossible");
  };

  const kpisByCur = useMemo(() => computeKpisByCurrency(transactions), [transactions]);

  // Tax lines from trial balance — one per matching account
  const taxLines = useMemo(() => {
    if (!trailBalance) return [];
    return [...(trailBalance.debits ?? []), ...(trailBalance.credits ?? [])]
      .filter((a) => /tax|vat|tva/i.test(a.subAccount || ""))
      .map((a) => `${currencySymbol} ${FMT.format(Math.abs(Number(a.balance || 0)))}`);
  }, [trailBalance, currencySymbol]);

  // Build display lines per KPI; fall back to backend totals when no per-currency data
  const income  = Number(incomeStatement?.totalRevenue ?? 0);
  const expense = Number(incomeStatement?.totalExpense ?? 0);

  const revenueLines = kpisByCur.length
    ? kpisByCur.map((c) => `${c.sym} ${FMT.format(c.revenue)}`)
    : (income ? [`${currencySymbol} ${FMT.format(income)}`] : []);

  const expenseLines = kpisByCur.length
    ? kpisByCur.map((c) => `${c.sym} ${FMT.format(c.expense)}`)
    : (expense ? [`${currencySymbol} ${FMT.format(expense)}`] : []);

  const resultLines = kpisByCur.length
    ? kpisByCur.map((c) => `${c.sym} ${FMT.format(Math.abs(c.result))}${c.result < 0 ? " (loss)" : ""}`)
    : [`${currencySymbol} ${FMT.format(Math.abs(income - expense))}${income - expense < 0 ? " (loss)" : ""}`];

  const allProfit = kpisByCur.every((c) => c.result >= 0);

  const kpis = [
    { icon: TrendingUp,   label: "Revenue",    colorKey: "emerald",              lines: revenueLines },
    { icon: TrendingDown, label: "Expenses",   colorKey: "rose",                 lines: expenseLines },
    { icon: Scale,        label: "Net result", colorKey: allProfit ? "brand" : "red", lines: resultLines },
    { icon: Receipt,      label: "Tax",        colorKey: "amber",                lines: taxLines.length ? taxLines : ["—"] },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-white border-b border-ink-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Accounting</h1>
            <p className="text-xs text-ink-500 mt-0.5">Double-entry bookkeeping</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <button type="button" className="flex items-center gap-1.5 text-sm border border-ink-200 rounded-lg px-3 py-1.5 hover:bg-ink-50 transition text-ink-700">
              <Download className="w-4 h-4" /> Export
            </button>
            <button type="button" onClick={openCreateModal} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white rounded-lg px-4 py-1.5 hover:bg-brand-700 transition font-medium">
              <Plus className="w-4 h-4" /> New entry
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <MultiKpiCard key={k.label} icon={k.icon} label={k.label} colorKey={k.colorKey} lines={k.lines} />
          ))}
        </div>

        <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-ink-100">
            {TABS.map((t) => (
              <button
                key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-5 py-3 text-sm font-medium transition border-b-2 ${
                  activeTab === t.key
                    ? "border-brand-600 text-brand-700 bg-brand-50/50"
                    : "border-transparent text-ink-600 hover:text-ink-900 hover:bg-ink-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {activeTab === "overview"  && (
              <OverviewPanel transactions={transactions} trailBalance={trailBalance} incomeStatement={incomeStatement} currencySymbol={currencySymbol} onNavigateEcritures={() => setActiveTab("ecritures")} />
            )}
            {activeTab === "journaux"  && (
              <JournauxPanel transactions={transactions} transactionTypes={transactionTypes} />
            )}
            {activeTab === "ecritures" && (
              <EcrituresPanel
                transactions={transactions}
                loading={txLoading}
                currencySymbol={currencySymbol}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            )}
            {activeTab === "plan"      && (
              <PlanComptablePanel transactions={transactions} trailBalance={trailBalance} loading={acctLoading} currencySymbol={currencySymbol} />
            )}
            {activeTab === "etats"     && (
              <EtatsFinanciersPanel incomeStatement={incomeStatement} balanceSheet={balanceSheet} transactions={transactions} trailBalance={trailBalance} currencySymbol={currencySymbol} />
            )}
            {activeTab === "tva"       && (
              <TvaPanel trailBalance={trailBalance} transactions={transactions} currencySymbol={currencySymbol} />
            )}
          </div>
        </div>
      </div>

      <EcritureFormModal
        open={modalOpen}
        onClose={closeEntryModal}
        accounts={accounts}
        currencies={currencies}
        projects={projects}
        defaultCurrencyId={appSetting?.currency?.id}
        record={editingTransaction}
        onSaved={reloadTransactions}
      />
    </div>
  );
}
