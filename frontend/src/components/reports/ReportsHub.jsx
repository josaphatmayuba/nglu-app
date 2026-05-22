import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Package,
  Users,
  Wallet,
  Building2,
  FileText,
} from "lucide-react";

const REPORTS = [
  {
    icon: TrendingUp,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
    title: "Rapport ventes",
    description: "Synthèse mensuelle des ventes",
    to: "/admin/sale-report",
  },
  {
    icon: Package,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "Rapport stock",
    description: "Inventaire et rotations",
    to: "/admin/product-report",
  },
  {
    icon: Users,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "Rapport clients",
    description: "Top clients et fidélité",
    to: "/admin/customer-report",
  },
  {
    icon: Wallet,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "Compte de résultat",
    description: "P&L mensuel et annuel",
    to: "/admin/account/income",
  },
  {
    icon: Building2,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Rapport immobilier",
    description: "Loyers et occupation",
    to: "/admin/property-management",
  },
  {
    icon: FileText,
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    title: "Rapport achats",
    description: "Fournisseurs et dépenses",
    to: "/admin/purchase-report",
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
          Rapports
        </h1>
        <p className="text-xs md:text-sm text-ink-500 mt-1">Analyses et exports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.to}
              type="button"
              onClick={() => navigate(r.to)}
              className="bg-white hover:border-brand-300 hover:shadow-sm rounded-xl border border-ink-200 p-5 text-left transition"
            >
              <div className={`w-10 h-10 rounded-lg ${r.iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${r.iconColor}`} />
              </div>
              <h4 className="font-semibold text-ink-900">{r.title}</h4>
              <p className="text-xs text-ink-500 mt-1">{r.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
