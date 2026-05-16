import { ChevronRight } from "lucide-react";
import moment from "moment";

import { avatarColors } from "../../shared/constants";
import { compactMoney } from "../../shared/format";
import { initials } from "../../shared/tenants";

const RecentPaymentsTable = ({ payments, latePayments = [], pendingPayments = [], onViewAll }) => {
  if (!payments?.length) return null;
  return (
    <section className="immo-recent-payments">
      <header>
        <div>
          <h3>Paiements de loyer récents</h3>
          <p>5 derniers encaissements et impayés</p>
        </div>
        {onViewAll && (
          <button type="button" className="immo-link" onClick={onViewAll}>
            Voir tout <ChevronRight size={14} />
          </button>
        )}
      </header>
      <div className="immo-table-scroll">
        <table className="immo-recent-table">
          <thead>
            <tr>
              <th>Locataire</th>
              <th>Propriété</th>
              <th>Période</th>
              <th>Échéance</th>
              <th>Statut</th>
              <th className="right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => {
              const tone = latePayments.includes(payment)
                ? "danger"
                : pendingPayments.includes(payment)
                  ? "warning"
                  : "success";
              const label = tone === "success" ? "Payé" : tone === "warning" ? "En attente" : "En retard";
              const tenantLabel =
                [payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "-";
              return (
                <tr key={payment.id || index}>
                  <td>
                    <span className="person-cell">
                      <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                        {initials(tenantLabel)}
                      </span>
                      {tenantLabel}
                    </span>
                  </td>
                  <td>{payment.unitName || payment.leaseReference || "-"}</td>
                  <td>{payment.paymentDate ? moment(payment.paymentDate).format("MMMM YYYY") : "-"}</td>
                  <td className={tone === "danger" ? "danger" : ""}>
                    {payment.paymentDate ? moment(payment.paymentDate).format("DD MMM") : "-"}
                  </td>
                  <td>
                    <span className={`immo-pill ${tone}`}>{label}</span>
                  </td>
                  <td className={`right ${tone === "danger" ? "danger" : ""}`}>
                    {compactMoney(payment.amount, payment.currencySymbol)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentPaymentsTable;
