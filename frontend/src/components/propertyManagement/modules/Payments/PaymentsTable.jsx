import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { useMemo, useState } from "react";

import { avatarColors, paymentMethodLabels } from "../../shared/constants";
import { compactMoney } from "../../shared/format";
import { initials } from "../../shared/tenants";

const buildPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [1];
  if (currentPage > 3) pages.push("...");
  pages.push(
    ...[currentPage - 1, currentPage, currentPage + 1].filter(
      (page) => page > 1 && page < totalPages,
    ),
  );
  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
};

const PaymentsTable = ({ payments, pendingPayments, latePayments, selectedIds = [], onSelect, onSelectAll }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = useMemo(
    () => payments.slice(pageStart, pageStart + pageSize),
    [pageStart, payments],
  );
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  const selectable = typeof onSelect === "function";
  const allSelected = selectable && pageItems.length > 0 && pageItems.every((p) => selectedIds.includes(p.id));
  const someSelected = selectable && pageItems.some((p) => selectedIds.includes(p.id));

  return (
    <div className="immo-table-scroll">
      <div className="immo-data-table payments">
        <div className="immo-data-row head">
          {selectable && (
            <span style={{ width: 32, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={() => onSelectAll?.(pageItems.map((p) => p.id), !allSelected)}
                aria-label="Tout sélectionner"
              />
            </span>
          )}
          <span>N° Quittance</span>
          <span>Locataire</span>
          <span>Propriété</span>
          <span>Période</span>
          <span>Échéance</span>
          <span>Méthode</span>
          <span>Statut</span>
          <span>Montant</span>
        </div>
        {pageItems.map((payment, index) => {
          const paymentStatus = latePayments.includes(payment)
            ? "danger"
            : pendingPayments.includes(payment)
              ? "warning"
              : "success";
          const isPaid = paymentStatus === "success";
          const tenantLabel =
            [payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "-";
          const isSelected = selectable && selectedIds.includes(payment.id);

          return (
            <div
              key={payment.id}
              className={`immo-data-row${isSelected ? " selected" : ""}`}
              onClick={selectable ? () => onSelect(payment.id) : undefined}
              style={selectable ? { cursor: "pointer" } : undefined}
            >
              {selectable && (
                <span style={{ width: 32, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(payment.id)}
                    aria-label={`Sélectionner paiement #${payment.id}`}
                  />
                </span>
              )}
              <span className="mono">#QUIT-{payment.id}</span>
              <span className="person-cell">
                <span className={`mini-avatar ${avatarColors[(pageStart + index) % avatarColors.length]}`}>
                  {initials(tenantLabel)}
                </span>
                {tenantLabel}
              </span>
              <span>{payment.unitName || payment.leaseReference || "-"}</span>
              <span>{payment.paymentDate ? moment(payment.paymentDate).format("MMMM YYYY") : "-"}</span>
              <span className={paymentStatus === "danger" ? "red-text" : ""}>
                {payment.paymentDate ? moment(payment.paymentDate).format("DD MMM") : "-"}
              </span>
              <span>
                {isPaid && payment.method ? (
                  <span className="method-chip">{paymentMethodLabels[payment.method] || payment.method}</span>
                ) : (
                  <span className="immo-empty-cell">-</span>
                )}
              </span>
              <span>
                <span className={`immo-pill ${paymentStatus}`}>
                  {paymentStatus === "success" ? "Payé" : paymentStatus === "warning" ? "En attente" : "En retard"}
                </span>
              </span>
              <strong className={paymentStatus === "danger" ? "red-text" : ""}>
                {compactMoney(payment.amount, payment.currencySymbol)}
              </strong>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="immo-pagination">
          <span className="immo-pagination-count">
            {pageStart + 1}-{Math.min(pageStart + pageSize, payments.length)} sur {payments.length}
          </span>
          <div className="immo-pagination-pages">
            <button
              type="button"
              className="immo-pagination-arrow"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((entry, index) =>
              entry === "..." ? (
                <span key={`ellipsis-${index}`} className="immo-pagination-ellipsis">...</span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  className={entry === currentPage ? "active" : ""}
                  onClick={() => setPage(entry)}
                >
                  {entry}
                </button>
              ),
            )}
            <button
              type="button"
              className="immo-pagination-arrow"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Page suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTable;
