import { AiFillPrinter } from "react-icons/ai";
import { FaCartPlus, FaMoneyBillTransfer, FaMoneyBillTrendUp } from "react-icons/fa6";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

export default function QuickLink({ isHeader = false }) {
  const { data } = useSelector((state) => state?.setting) || {};
  const links = [
    {
      to: "/admin/sale/add",
      icon: <FaMoneyBillTrendUp size={isHeader ? 20 : 16} />,
      label: "Create Sale",
      color: "#2563eb"
    },
    {
      to: "/admin/purchase/add",
      icon: <FaCartPlus size={isHeader ? 20 : 16} />,
      label: "Create Purchase",
      color: "#8b5cf6"
    },
    {
      to: "/admin/transaction/",
      icon: <FaMoneyBillTransfer size={isHeader ? 20 : 16} />,
      label: "Create Transaction",
      color: "#2563eb"
    },
    ...(data?.isPos === "true" ? [{
      to: "/admin/pos",
      icon: <AiFillPrinter size={isHeader ? 20 : 16} />,
      label: "POS",
      color: "#7c3aed"
    }] : []),
  ];

  return (
    <div className={isHeader ? "w-full" : "w-full p-3 rounded-lg"}>
      <div className={isHeader ? "w-full max-w-md mx-auto" : "w-full max-w-xl mx-auto"}>
        <div className="w-full flex items-center justify-center gap-4 flex-wrap sm:flex-nowrap">
          {links.map((link, idx) => (
            <Link
              key={idx}
              to={link.to}
              aria-label={link.label}
              title={link.label}
              className={`
                /* xs: content width, sm+: equal width */
                flex-none sm:flex-1 sm:basis-0
                inline-flex items-center justify-center
                gap-1 ${isHeader ? "px-2 py-1 text-xs" : "gap-2 px-3.5 py-2.5 text-xs"} rounded-md font-semibold
                hover:shadow-sm transition
                whitespace-nowrap
              `}
              style={{
                color: link.color,
                backgroundColor: `${link.color}20`,
                border: `1px solid ${link.color}33`,
              }}
            >
              <span className="flex-shrink-0" style={{ color: link.color }}>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
