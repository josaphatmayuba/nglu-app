import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllTransaction } from "@/redux/rtk/features/transaction/transactionSlice";
import { loadAllAccount, loadIncomeStatement } from "@/redux/rtk/features/account/accountSlice";
import { Plus, Download, TrendingUp, TrendingDown, Scale, Receipt } from "lucide-react";

import OverviewPanel     from "./panels/OverviewPanel";
import JournauxPanel     from "./panels/JournauxPanel";
import EcrituresPanel    from "./panels/EcrituresPanel";
import PlanComptablePanel from "./panels/PlanComptablePanel";
import EtatsFinanciersPanel from "./panels/EtatsFinanciersPanel";
import TvaPanel          from "./panels/TvaPanel";
import EcritureFormModal from "./EcritureFormModal";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });
const fmt = (v) => `CDF ${FMT.format(Number(v || 0))}`;

const TABS = [
  { key: "overview",  label: "Vue d'ensemble" },
  { key: "journaux",  label: "Journaux" },
  { key: "ecritures", label: "Écritures" },
  { key: "plan",      label: "Plan comptable" },
  { key: "etats",     label: "États financiers" },
  { key: "tva",       label: "TVA" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function AccountingPage() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab]   = useState("overview");
  const [exercice, setExercice]     = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen]   = useState(false);

  const transactions   = useSelector((s) => s.transaction?.list ?? []);
  const txLoading      = useSelector((s) => s.transaction?.loading ?? false);
  const accounts       = useSelector((s) => s.account?.list ?? []);
  const acctLoading    = useSelector((s) => s.account?.loading ?? false);
  const incomeStatement = useSelector((s) => s.account?.incomeStatement ?? null);

  useEffect(() => {
    dispatch(loadAllTransaction({ startDate: `${exercice}-01-01`, endDate: `${exercice}-12-31`, count: 1000, offset: 0 }));
    dispatch(loadAllAccount());
    dispatch(loadIncomeStatement());
  }, [dispatch, exercice]);

  const income  = Number(incomeStatement?.income  ?? 0);
  const expense = Number(incomeStatement?.expense ?? 0);
  const result  = income - expense;

  const kpis = [
    {
      key: "ca",
      icon: TrendingUp,
      label: "Chiffre d'affaires",
      value: fmt(income),
      color: "emerald",
    },
    {
      key: "charges",
      icon: TrendingDown,
      label: "Charges",
      value: fmt(expense),
      color: "rose",
    },
    {
      key: "result",
      icon: Scale,
      label: "Résultat net",
      value: fmt(Math.abs(result)) + (result < 0 ? " (perte)" : ""),
      color: result >= 0 ? "brand" : "red",
    },
    {
      key: "tva",
      icon: Receipt,
      label: "TVA nette",
      value: "CDF —",
      color: "amber",
    },
  ];

  const COLOR = {
    emerald: "text-emerald-600 bg-emerald-50",
    rose:    "text-rose-600 bg-rose-50",
    brand:   "text-brand-600 bg-brand-50",
    red:     "text-red-600 bg-red-50",
    amber:   "text-amber-600 bg-amber-50",
  };

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <div className="bg-white border-b border-ink-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-900">Comptabilité</h1>
            <p className="text-xs text-ink-500 mt-0.5">Plan OHADA · double entrée</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={exercice}
              onChange={(e) => setExercice(Number(e.target.value))}
              className="text-sm border border-ink-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400 bg-white"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>Exercice {y}</option>
              ))}
            </select>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm border border-ink-200 rounded-lg px-3 py-1.5 hover:bg-ink-50 transition text-ink-700"
            >
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white rounded-lg px-4 py-1.5 hover:bg-brand-700 transition font-medium"
            >
              <Plus className="w-4 h-4" /> Nouvelle écriture
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            const cls  = COLOR[k.color] || COLOR.brand;
            return (
              <div key={k.key} className="bg-white rounded-xl border border-ink-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${cls.split(" ")[1]} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${cls.split(" ")[0]}`} />
                  </div>
                  <span className="text-xs text-ink-500 font-medium">{k.label}</span>
                </div>
                <p className="text-base font-semibold text-ink-900 tabular-nums leading-tight">{k.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-ink-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
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
            {activeTab === "overview" && (
              <OverviewPanel
                transactions={transactions}
                accounts={accounts}
                incomeStatement={incomeStatement}
                onNavigateEcritures={() => setActiveTab("ecritures")}
              />
            )}
            {activeTab === "journaux" && (
              <JournauxPanel transactions={transactions} />
            )}
            {activeTab === "ecritures" && (
              <EcrituresPanel transactions={transactions} loading={txLoading} />
            )}
            {activeTab === "plan" && (
              <PlanComptablePanel accounts={accounts} loading={acctLoading} />
            )}
            {activeTab === "etats" && (
              <EtatsFinanciersPanel incomeStatement={incomeStatement} />
            )}
            {activeTab === "tva" && (
              <TvaPanel />
            )}
          </div>
        </div>
      </div>

      <EcritureFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={accounts}
      />
    </div>
  );
}
