import React, { Fragment } from "react";
import { Tooltip } from "antd";
import { Coins, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { abbreviateNumber } from "../../utils/nFormetter";
import useCurrency from "../../utils/useCurrency";

// Utility function to generate card data
const getCardData = (information, count) => [
  {
    id: "total-sales",
    icon: Coins,
    value: information?.totalAmount || 0,
    fullValue: information?.totalAmount?.toFixed(3),
    label: `Total Sales #${count ? abbreviateNumber(count) : 0}`,
    color: "text-emerald-500",
    isCurrency: true,
  },
  {
    id: "total-paid",
    icon: CreditCard,
    value: information?.paidAmount || 0,
    fullValue: information?.paidAmount?.toFixed(3),
    label: "Total Sale Paid",
    color: "text-violet-500",
    isCurrency: true,
  },
  {
    id: "total-due",
    icon: DollarSign,
    value: information?.dueAmount || 0,
    fullValue: information?.dueAmount?.toFixed(3),
    label: "Total Sale Due",
    color: "text-blue-600",
    isCurrency: true,
  },
  {
    id: "total-profit",
    icon: TrendingUp,
    value: information?.profit || 0,
    fullValue: information?.profit?.toFixed(3),
    label: "Total Sale Profit",
    color: "text-blue-600",
    isCurrency: true,
  },
];

// Background tint per color to match icon
const ICON_BG = {
  "text-emerald-500": "bg-emerald-50 dark:bg-emerald-900/20",
  "text-violet-500": "bg-violet-50 dark:bg-violet-900/20",
  "text-blue-600": "bg-blue-50 dark:bg-blue-900/20",
  "text-amber-500": "bg-amber-50 dark:bg-amber-900/20",
  "text-rose-500": "bg-rose-50 dark:bg-rose-900/20",
};

// Modern KPI card with bordered style + colored icon tile
const KpiCard = ({ item, currency }) => {
  const Icon = item.icon;
  const isCurrency = item.isCurrency;
  const iconBg = ICON_BG[item.color] || "bg-brand-50 dark:bg-brand-900/20";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-ink-200 dark:border-gray-700 p-4 sm:p-5 hover:border-ink-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${item.color}`} />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-xs text-ink-500 dark:text-gray-400 font-medium mb-1 truncate">
            {item.label}
          </p>
          <Tooltip
            title={
              <span className="text-base font-medium">
                {isCurrency && (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />
                )}
                {item.fullValue ?? 0}
              </span>
            }
          >
            <div className="text-lg sm:text-xl font-semibold text-ink-900 dark:text-white tracking-tight truncate">
              {isCurrency && (
                <span
                  className="text-sm mr-1 text-ink-500"
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />
              )}
              {typeof item.value === "number"
                ? abbreviateNumber(item.value)
                : item.value}
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

// DashboardCard Component
const DashboardCard = ({ information, count }) => {
  const currency = useCurrency();
  const cards = getCardData(information, count);

  return (
    <Fragment>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 mb-4">
        {cards.map((cardData) => (
          <KpiCard key={cardData.id} item={cardData} currency={currency} />
        ))}
      </section>
    </Fragment>
  );
};

export default DashboardCard;