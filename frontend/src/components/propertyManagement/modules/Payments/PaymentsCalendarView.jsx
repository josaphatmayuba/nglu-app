// SCRUM-95 — Payments "Calendrier" view.
// Monthly grid (Mon→Sun) with colour-coded payment due dates.

import moment from "moment";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const statusOf = (payment, overduePayments, upcomingPayments) => {
  if (overduePayments.includes(payment)) return "late";
  if (upcomingPayments.includes(payment)) return "pending";
  return "paid";
};

const DOT_CLASS = {
  paid: "bg-emerald-500",
  pending: "bg-amber-400",
  late: "bg-red-500",
};
const LABEL_CLASS = {
  paid: "text-emerald-700",
  pending: "text-amber-700",
  late: "text-red-700",
};

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const tenantShort = (p) => {
  const first = p.tenantFirstName?.trim();
  const last = p.tenantLastName?.trim();
  if (first && last) return `${first[0]}. ${last}`;
  return first || last || p.leaseReference || `#${p.id}`;
};

const PaymentsCalendarView = ({ payments, overduePayments, upcomingPayments }) => {
  const [ref, setRef] = useState(() => moment().startOf("month"));

  const startOfMonth = ref.clone().startOf("month");
  const endOfMonth = ref.clone().endOf("month");
  const daysInMonth = endOfMonth.date();

  // Mon = 1 … Sun = 7 (ISO). Offset: how many empty cells before day 1.
  const firstDow = startOfMonth.isoWeekday(); // 1-7
  const offset = firstDow - 1;

  // Build day→payments map
  const byDay = new Map();
  payments.forEach((p) => {
    if (!p.paymentDate) return;
    const d = moment(p.paymentDate);
    if (d.isSame(ref, "month")) {
      const day = d.date();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(p);
    }
  });

  const today = moment();
  const isCurrentMonth = ref.isSame(today, "month");

  const paid = payments.filter((p) => !overduePayments.includes(p) && !upcomingPayments.includes(p)).length;
  const pending = upcomingPayments.filter((p) => {
    const d = moment(p.paymentDate);
    return d.isSame(ref, "month");
  }).length;
  const late = overduePayments.filter((p) => {
    const d = moment(p.paymentDate);
    return d.isSame(ref, "month");
  }).length;

  // Total cells: offset + daysInMonth, rounded up to multiple of 7
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setRef(ref.clone().subtract(1, "month"))}
          className="p-1.5 hover:bg-ink-100 rounded-lg text-ink-600"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-semibold text-ink-900 capitalize">
          {ref.format("MMMM YYYY")}
        </h3>
        <button
          type="button"
          onClick={() => setRef(ref.clone().add(1, "month"))}
          className="p-1.5 hover:bg-ink-100 rounded-lg text-ink-600"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-ink-500">
        {[
          { key: "paid",    label: "Payé" },
          { key: "pending", label: "En attente" },
          { key: "late",    label: "En retard" },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${DOT_CLASS[key]}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center text-xs text-ink-400 font-medium mb-2">
        {DAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - offset + 1;
          const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = isCurrentMonth && isValidDay && dayNum === today.date();
          const dayPayments = isValidDay ? (byDay.get(dayNum) || []) : [];

          if (!isValidDay) {
            return (
              <div key={i} className="h-16 rounded-lg p-1 bg-ink-50 text-ink-300 text-xs" />
            );
          }

          // Determine dominant status for cell border
          const hasLate = dayPayments.some((p) => overduePayments.includes(p));
          const hasPending = dayPayments.some((p) => upcomingPayments.includes(p));
          const hasPaid = dayPayments.some((p) => !overduePayments.includes(p) && !upcomingPayments.includes(p));
          const cellBorder = hasLate
            ? "border-red-200 bg-red-50"
            : hasPending
              ? "border-amber-200 bg-amber-50"
              : hasPaid
                ? "border-emerald-200 bg-emerald-50"
                : "border-ink-100";

          return (
            <div
              key={i}
              className={`h-16 rounded-lg p-1 border text-xs overflow-hidden ${cellBorder} ${
                isToday ? "ring-2 ring-brand-400" : ""
              }`}
            >
              <div className={`font-semibold mb-0.5 ${isToday ? "text-brand-600" : "text-ink-700"}`}>
                {dayNum}{isToday ? " ·" : ""}
              </div>
              {dayPayments.slice(0, 2).map((p) => {
                const s = statusOf(p, overduePayments, upcomingPayments);
                return (
                  <div key={p.id} className={`flex items-center gap-0.5 text-[10px] leading-tight ${LABEL_CLASS[s]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[s]}`} />
                    <span className="truncate">{tenantShort(p)}</span>
                  </div>
                );
              })}
              {dayPayments.length > 2 && (
                <div className="text-[10px] text-ink-400">+{dayPayments.length - 2}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly summary */}
      <div className="mt-4 pt-4 border-t border-ink-100 grid grid-cols-3 gap-3 text-center text-xs">
        <div>
          <div className="font-semibold text-emerald-600 text-base">{paid}</div>
          <div className="text-ink-500">Payés</div>
        </div>
        <div>
          <div className="font-semibold text-amber-600 text-base">{pending}</div>
          <div className="text-ink-500">En attente</div>
        </div>
        <div>
          <div className="font-semibold text-red-600 text-base">{late}</div>
          <div className="text-ink-500">En retard</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsCalendarView;
