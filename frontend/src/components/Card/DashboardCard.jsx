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

// KPI-like Card to match ProductCard design
const KpiCard = ({ item, currency }) => {
  const Icon = item.icon;
  const isCurrency = item.isCurrency;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl dark:border-gray-700 p-3 sm:p-4 shadow-none border-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <Icon className={`w-5 h-5 ${item.color}`} />
          </div>

          <div className="flex flex-col">
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5">
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
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {isCurrency && (
                  <span
                    className="text-base mr-1"
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