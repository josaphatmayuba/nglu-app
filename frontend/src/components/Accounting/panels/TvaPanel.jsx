import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import moment from "moment";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const MOCK_DECLARATIONS = [
  { period: "Avril 2026", status: "deposee", amount: 980000, deadline: "2026-05-15" },
  { period: "Mars 2026",  status: "deposee", amount: 1120000, deadline: "2026-04-15" },
  { period: "Février 2026", status: "deposee", amount: 875000, deadline: "2026-03-15" },
];

const STATUS = {
  deposee: { label: "Déposée", icon: CheckCircle, class: "text-emerald-600 bg-emerald-50" },
  en_cours: { label: "En cours", icon: Clock, class: "text-amber-600 bg-amber-50" },
  en_retard: { label: "En retard", icon: AlertTriangle, class: "text-red-600 bg-red-50" },
};

export default function TvaPanel() {
  const currentDeadline = moment().endOf("month").format("DD MMMM YYYY");

  return (
    <div className="space-y-4">
      {/* TVA du mois en cours */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">TVA à déclarer — {moment().format("MMMM YYYY")}</h3>
            <p className="text-xs text-amber-700 mt-0.5">Échéance : {currentDeadline}</p>
            <p className="text-xs text-amber-600 mt-2">
              La déclaration TVA du mois en cours n'a pas encore été soumise. Vérifiez les comptes 4453 (TVA collectée) et 4454 (TVA déductible).
            </p>
          </div>
        </div>
      </div>

      {/* KPIs TVA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "TVA collectée", account: "4453", amount: 1580000, color: "rose" },
          { label: "TVA déductible", account: "4454", amount: 341600, color: "brand" },
          { label: "TVA nette à payer", account: "4453 - 4454", amount: 1238400, color: "amber" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-ink-200 p-4">
            <div className="text-xs text-ink-500 font-medium mb-1">{item.label}</div>
            <div className="text-xl font-semibold text-ink-900">
              <span className="text-sm text-ink-400 mr-1">CDF</span>
              {FMT.format(item.amount)}
            </div>
            <div className="text-xs text-ink-400 mt-1">Compte {item.account}</div>
          </div>
        ))}
      </div>

      {/* Historique déclarations */}
      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900 text-sm">Historique des déclarations</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              {["Période","Statut","Montant","Échéance"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_DECLARATIONS.map((d) => {
              const s = STATUS[d.status] || STATUS.en_cours;
              const Icon = s.icon;
              return (
                <tr key={d.period} className="border-b border-ink-50 hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{d.period}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${s.class}`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-900">CDF {FMT.format(d.amount)}</td>
                  <td className="px-4 py-3 text-xs text-ink-500">{moment(d.deadline).format("DD/MM/YYYY")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
