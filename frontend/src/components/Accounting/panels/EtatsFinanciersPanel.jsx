import { FileBarChart2, FileText, BookOpen } from "lucide-react";

const REPORTS = [
  {
    icon: FileBarChart2,
    label: "Bilan",
    desc: "Actif / Passif au " + new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    color: "brand",
    available: false,
  },
  {
    icon: FileText,
    label: "Compte de résultat",
    desc: "Produits et charges de l'exercice",
    color: "emerald",
    available: true,
  },
  {
    icon: BookOpen,
    label: "Grand livre",
    desc: "Détail des mouvements par compte",
    color: "amber",
    available: false,
  },
];

const TONE = {
  brand:   { bg: "bg-brand-50",   icon: "text-brand-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600" },
};

export default function EtatsFinanciersPanel({ incomeStatement }) {
  const income = Number(incomeStatement?.income ?? 0);
  const expense = Number(incomeStatement?.expense ?? 0);
  const result = income - expense;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPORTS.map((r) => {
          const tone = TONE[r.color] || TONE.brand;
          const Icon = r.icon;
          return (
            <div
              key={r.label}
              className={`bg-white rounded-xl border p-5 transition ${r.available ? "border-ink-200 hover:border-brand-300 hover:shadow-sm cursor-pointer" : "border-ink-100 opacity-60"}`}
            >
              <div className={`w-10 h-10 rounded-lg ${tone.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${tone.icon}`} />
              </div>
              <h4 className="font-semibold text-ink-900 text-sm">{r.label}</h4>
              <p className="text-xs text-ink-500 mt-1">{r.desc}</p>
              {!r.available && (
                <span className="mt-3 inline-block text-[10px] font-medium bg-ink-100 text-ink-500 px-2 py-0.5 rounded">À venir</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Compte de résultat simplifié */}
      <div className="bg-white rounded-xl border border-ink-200 p-5">
        <h3 className="font-semibold text-ink-900 mb-4">Compte de résultat — aperçu</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-ink-100">
            <span className="text-sm text-ink-700">Produits (classe 7)</span>
            <span className="text-sm font-semibold text-emerald-600">
              CDF {new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(income)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-ink-100">
            <span className="text-sm text-ink-700">Charges (classe 6)</span>
            <span className="text-sm font-semibold text-rose-600">
              CDF {new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(expense)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-ink-900">Résultat net</span>
            <span className={`text-base font-bold ${result >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              CDF {new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 }).format(Math.abs(result))}
              {result < 0 ? " (perte)" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
