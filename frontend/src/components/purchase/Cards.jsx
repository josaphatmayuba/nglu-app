import { Tooltip } from "antd";
import React, { Fragment } from "react";
import { Coins, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { abbreviateNumber } from "../../utils/nFormetter";
import useCurrency from "../../utils/useCurrency";

const DashboardCard = ({ information, count }) => {
  const currency = useCurrency();

  const cards = [
    {
      id: "total-purchases",
      icon: Coins,
      value: information?.totalAmount || 0,
      fullValue: information?.totalAmount?.toFixed(3),
      label: `Total Purchases #${count ? abbreviateNumber(count) : 0}`,
      color: "text-emerald-500",
      isCurrency: true,
      link: null,
    },
    {
      id: "total-paid",
      icon: CreditCard,
      value: information?.paidAmount || 0,
      fullValue: information?.paidAmount?.toFixed(3),
      label: "Total Purchase Paid",
      color: "text-violet-500",
      isCurrency: true,
      link: null,
    },
    {
      id: "total-due",
      icon: DollarSign,
      value: information?.dueAmount || 0,
      fullValue: information?.dueAmount?.toFixed(3),
      label: "Total Purchase Due",
      color: "text-blue-600",
      isCurrency: true,
      link: null,
    },
    {
      id: "total-return",
      icon: TrendingUp,
      value: information?.totalReturnAmount || 0,
      fullValue: information?.totalReturnAmount?.toFixed(3),
      label: "Total Purchase Return",
      color: "text-blue-600",
      isCurrency: true,
      link: null,
    },
  ];

  // KPI-like card design (matches ProductCard style)
  const KpiCard = ({ item }) => {
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

          {item.link ? (
            <a
              href={item.link}
              className="text-xs text-blue-500 hover:underline"
            >
              View
            </a>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Fragment>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 mb-4">
        {cards.map((cardData) => (
          <KpiCard key={cardData.id} item={cardData} />
        ))}
      </section>
    </Fragment>
  );
};

export default DashboardCard;