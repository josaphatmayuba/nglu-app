import { Tooltip } from "antd";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Package, Coins, DollarSign, AlertTriangle } from "lucide-react"; // Lucide icons
import { abbreviateNumber } from "../../utils/nFormetter";
import useCurrency from "../../utils/useCurrency";

export default function ProductCard({ card }) {
  const currency = useCurrency();

  const cards = [
    {
      id: "unique-product",
      icon: Package,
      value: card?.uniqueProduct || 0,
      fullValue: card?.uniqueProduct,
      label: "Unique Product",
      color: "text-blue-500",
      link: null,
    },
    {
      id: "sales-value",
      icon: Coins,
      value: card?.inventorySalesValue || 0,
      fullValue: card?.inventorySalesValue?.toFixed(3),
      label: "Inventory Sale Value",
      color: "text-emerald-500",
      isCurrency: true,
      link: null,
    },
    {
      id: "purchase-value",
      icon: DollarSign,
      value: card?.inventoryPurchaseValue || 0,
      fullValue: card?.inventoryPurchaseValue?.toFixed(3),
      label: "Inventory Purchase Value",
      color: "text-amber-500",
      isCurrency: true,
      link: null,
    },
    {
      id: "short-product",
      icon: AlertTriangle,
      value: card?.shortProductCount || 0,
      fullValue: card?.shortProductCount,
      label: "Short Product",
      color: "text-rose-500",
      // link: "/admin/product-sort-list",
      link: null,
    },
  ];

  // New KPI-like card design to match dashboard KPI cards
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
            <Link
              to={item.link}
              className="text-xs text-blue-500 hover:underline"
            >
              View
            </Link>
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
}