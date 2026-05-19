import { useMemo } from "react";
import { AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import moment from "moment";

const FMT = new Intl.NumberFormat("fr-CD", { maximumFractionDigits: 0 });

const STATUS = {
  en_cours: { label: "En cours", icon: Clock,         class: "text-amber-600 bg-amber-50" },
  passe:    { label: "Passé",    icon: CheckCircle,    class: "text-ink-500 bg-ink-50" },
};

function sumAccountsByPrefix(accounts, prefix) {
  return accounts
    .filter((a) => String(a.accountNumber || a.id || "").startsWith(prefix))
    .reduce((s, a) => s + Number(a.openingBalance || a.balance || 0), 0);
}

export default function TvaPanel({ accounts = [], transactions = [], currencySymbol = "CDF" }) {
  const tvaCollectee  = useMemo(() => sumAccountsByPrefix(accounts, "4453"), [accounts]);
  const tvaDeduc      = useMemo(() => sumAccountsByPrefix(accounts, "4454"), [accounts]);
  const tvaNette      = tvaCollectee - tvaDeduc;

  // Build monthly TVA from transactions involving accounts 4453/4454
  const monthlyTva = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const debit  = String(t.debitAccount  || "");
      const credit = String(t.creditAccount || "");
      const isTva  = debit.startsWith("4453") || debit.startsWith("4454") ||
                     credit.startsWith("4453") || credit.startsWith("4454");
      if (!isTva || !t.date) return;
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
  }, [transactions]);

  const currentDeadline = moment().endOf("month").format("DD MMMM YYYY");
  const hasTvaData = tvaCollectee > 0 || tvaDeduc > 0;

  const kpis = [
    { label: "TVA collectée",    account: "4453", amount: tvaCollectee, color: "rose" },
    { label: "TVA déductible",   account: "4454", amount: tvaDeduc,     color: "brand" },
    { label: "TVA nette à payer", account: "4453 – 4454", amount: tvaNette, color: "amber" },
  ];

  const CARD_COLOR = {
    rose:  "border-rose-100",
    brand: "border-brand-100",
    amber: "border-amber-100",
  };

  return (
    <div className="space-y-4">
      {/* Alerte mois en cours */}
      {hasTvaData ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">
                TVA à déclarer — {moment().format("MMMM YYYY")}
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">Échéance : {currentDeadline}</p>
              <p className="text-xs text-amber-600 mt-2">
                TVA nette calculée :{" "}
                <span className="font-semibold">{currencySymbol} {FMT.format(Math.abs(tvaNette))}</span>
                {tvaNette < 0 ? " (crédit TVA)" : " à verser"}.
                Vérifiez les comptes 4453 (TVA collectée) et 4454 (TVA déductible).
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
            <h3 className="font-semibold text-ink-700 text-sm">Aucune donnée TVA</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Aucun compte 4453 ou 4454 avec solde trouvé pour cet exercice.
            </p>
          </div>
        </div>
      )}

      {/* KPIs TVA — depuis les comptes réels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {kpis.map((item) => (
          <div key={item.label} className={`bg-white rounded-xl border ${CARD_COLOR[item.color] || "border-ink-200"} p-4`}>
            <div className="text-xs text-ink-500 font-medium mb-1">{item.label}</div>
            <div className="text-xl font-semibold text-ink-900">
              <span className="text-sm text-ink-400 mr-1">{currencySymbol}</span>
              {FMT.format(Math.abs(item.amount))}
              {item.label === "TVA nette à payer" && item.amount < 0 && (
                <span className="text-xs text-emerald-600 ml-1">(crédit)</span>
              )}
            </div>
            <div className="text-xs text-ink-400 mt-1">Compte {item.account}</div>
          </div>
        ))}
      </div>

      {/* Historique mensuel TVA — depuis les transactions réelles */}
      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900 text-sm">Mouvements TVA par mois</h3>
          <p className="text-xs text-ink-400 mt-0.5">Calculé depuis les transactions sur comptes 4453 / 4454</p>
        </div>

        {monthlyTva.length === 0 ? (
          <div className="py-10 text-center text-ink-400 text-sm">
            Aucun mouvement sur les comptes TVA pour cet exercice
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50">
                {["Période", "Statut", "Montant", "Échéance"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyTva.map((d) => {
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
