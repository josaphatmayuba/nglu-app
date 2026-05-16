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

  // KPI card design matching mockup style
  const KpiCard = ({ item }) => {
    const Icon = item.icon;
    const isCurrency = item.isCurrency;
    
    // Map colors to mockup-style backgrounds
    const colorMap = {
      'text-blue-500': { bg: 'bg-blue-50', icon: 'text-blue-600' },
      'text-emerald-500': { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
      'text-amber-500': { bg: 'bg-amber-50', icon: 'text-amber-600' },
      'text-rose-500': { bg: 'bg-rose-50', icon: 'text-rose-600' },
    };
    const colors = colorMap[item.color] || { bg: 'bg-brand-50', icon: 'text-brand-600' };

    return (
      <div className="bg-white rounded-xl border border-ink-200 p-3 md:p-5 hover:border-ink-300 transition">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${colors.icon}`} />
          </div>
        </div>
        <div className="text-start">
          <p className="text-xs text-ink-500 font-medium mb-1">{item.label}</p>
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
            <div className="text-lg md:text-2xl font-semibold text-ink-900 tracking-tight truncate">
              {isCurrency && (
                <span className="text-base mr-1"
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