import { TrendingUp, TrendingDown, RefreshCw, Banknote, Building, Users, FileText } from "lucide-react";

const OHADA_JOURNALS = [
  { code: "VTE", label: "Ventes", desc: "Factures clients · classe 7", icon: TrendingUp, color: "emerald" },
  { code: "ACH", label: "Achats", desc: "Factures fournisseurs · classe 6", icon: TrendingDown, color: "rose" },
  { code: "BNQ", label: "Banque", desc: "Relevés bancaires · compte 512", icon: Building, color: "brand" },
  { code: "CAI", label: "Caisse", desc: "Espèces · compte 571", icon: Banknote, color: "amber" },
  { code: "SAL", label: "Paie", desc: "Salaires et charges sociales · 641", icon: Users, color: "purple" },
  { code: "OD",  label: "Opérations diverses", desc: "Ajustements, provisions · divers", icon: RefreshCw, color: "ink" },
];

const TONE = {
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", badge: "text-emerald-700 bg-emerald-50" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-600",    badge: "text-rose-700 bg-rose-50" },
  brand:   { bg: "bg-brand-50",   icon: "text-brand-600",   badge: "text-brand-700 bg-brand-50" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   badge: "text-amber-700 bg-amber-50" },
  purple:  { bg: "bg-purple-50",  icon: "text-purple-600",  badge: "text-purple-700 bg-purple-50" },
  ink:     { bg: "bg-ink-50",     icon: "text-ink-500",     badge: "text-ink-600 bg-ink-100" },
};

export default function JournauxPanel({ transactions = [] }) {
  const countByType = {};
  transactions.forEach((t) => {
    const type = t.type || t.transactionType || "OD";
    countByType[type] = (countByType[type] || 0) + 1;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {OHADA_JOURNALS.map((j) => {
        const tone = TONE[j.color] || TONE.ink;
        const Icon = j.icon;
        const count = countByType[j.code] ?? countByType[j.label] ?? 0;
        return (
          <div
            key={j.code}
            className="bg-white rounded-xl border border-ink-200 p-5 hover:border-brand-300 hover:shadow-sm transition cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${tone.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${tone.icon}`} />
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${tone.badge}`}>{j.code}</span>
            </div>
            <h4 className="font-semibold text-ink-900 text-sm">{j.label}</h4>
            <p className="text-xs text-ink-500 mt-0.5">{j.desc}</p>
            <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-ink-500 uppercase">Écritures</div>
                <div className="text-sm font-semibold text-ink-900">{count || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-500 uppercase">Dernier</div>
                <div className="text-sm font-semibold text-ink-900">—</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
