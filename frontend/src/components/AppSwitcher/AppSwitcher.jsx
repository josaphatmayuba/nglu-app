import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Truck,
  Building2,
  Briefcase,
  Wallet,
  BarChart3,
  Settings,
  X,
  Search,
  ArrowRight,
  SearchX,
  HeartHandshake,
  ShoppingBag,
  Globe,
  Mail,
  Kanban,
  Folder,
  PenTool,
  Sparkles,
  MessageCircle,
  Boxes,
  CalendarClock,
  Wrench,
  Layers,
  HardHat,
  KeyRound,
} from "lucide-react";

const AVAILABLE_APPS = [
  { key: "dashboard", name: "Tableau de bord", path: "/admin/dashboard", icon: LayoutDashboard, gradient: "from-brand-500 to-brand-700" },
  { key: "pos", name: "Point de Vente", path: "/admin/pos", icon: ShoppingCart, gradient: "from-orange-400 to-orange-600" },
  { key: "products", name: "Produits", path: "/admin/product", icon: Package, gradient: "from-emerald-400 to-emerald-600" },
  { key: "sale", name: "Ventes", path: "/admin/sale", icon: FileText, gradient: "from-violet-400 to-violet-600" },
  { key: "customer", name: "Clients", path: "/admin/customer", icon: Users, gradient: "from-sky-400 to-sky-600" },
  { key: "purchase", name: "Achats", path: "/admin/purchase", icon: Truck, gradient: "from-rose-400 to-rose-600" },
  { key: "property", name: "Immobilier", path: "/admin/property-management", icon: Building2, gradient: "from-teal-400 to-teal-600" },
  { key: "hr", name: "RH", path: "/admin/hr", icon: Briefcase, gradient: "from-purple-400 to-purple-600" },
  { key: "farmos", name: "FarmOS", path: "/farmos/", icon: Layers, gradient: "from-green-500 to-emerald-700", external: true },
  { key: "batipro", name: "BatiPro", path: "/batipro/", icon: HardHat, gradient: "from-blue-700 to-amber-500", external: true },
  { key: "domus", name: "Domus", path: "/domus/", icon: KeyRound, gradient: "from-indigo-500 to-violet-700", external: true },
  { key: "accounting", name: "Comptabilité", path: "/admin/accounting", icon: Wallet, gradient: "from-amber-400 to-amber-600" },
  { key: "reports", name: "Rapports", path: "/admin/reports", icon: BarChart3, gradient: "from-blue-400 to-blue-600" },
  { key: "settings", name: "Paramètres", path: "/admin/app-settings", icon: Settings, gradient: "from-zinc-500 to-zinc-700" },
];

const SOON_APPS = [
  { key: "crm", name: "CRM", icon: HeartHandshake, gradient: "from-pink-400 to-pink-600", badge: "SOON" },
  { key: "ecommerce", name: "eCommerce", icon: ShoppingBag, gradient: "from-indigo-400 to-indigo-600", badge: "SOON" },
  { key: "website", name: "Site Web", icon: Globe, gradient: "from-cyan-400 to-cyan-600", badge: "SOON" },
  { key: "email", name: "Email Marketing", icon: Mail, gradient: "from-red-400 to-red-600", badge: "SOON" },
  { key: "project", name: "Projet", icon: Kanban, gradient: "from-lime-400 to-lime-600", badge: "SOON" },
  { key: "documents", name: "Documents", icon: Folder, gradient: "from-yellow-400 to-yellow-600", badge: "SOON" },
  { key: "signature", name: "Signature", icon: PenTool, gradient: "from-fuchsia-400 to-fuchsia-600", badge: "SOON" },
  { key: "ai", name: "Assistant IA", icon: Sparkles, gradient: "from-slate-700 to-slate-900", badge: "NEW" },
  { key: "discussion", name: "Discussion", icon: MessageCircle, gradient: "from-green-400 to-green-600", badge: "SOON" },
  { key: "inventory", name: "Inventaire", icon: Boxes, gradient: "from-stone-500 to-stone-700", badge: "SOON" },
  { key: "planning", name: "Planning", icon: CalendarClock, gradient: "from-orange-500 to-red-500", badge: "SOON" },
  { key: "maintenance", name: "Maintenance", icon: Wrench, gradient: "from-zinc-500 to-zinc-700", badge: "SOON" },
];

export default function AppSwitcher({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredActive = useMemo(
    () => AVAILABLE_APPS.filter((a) => a.name.toLowerCase().includes(query.toLowerCase().trim())),
    [query]
  );
  const filteredSoon = useMemo(
    () => SOON_APPS.filter((a) => a.name.toLowerCase().includes(query.toLowerCase().trim())),
    [query]
  );
  const isEmpty = filteredActive.length === 0 && filteredSoon.length === 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const handleNavigate = (path, external = false) => {
    onClose();
    if (external || !path.startsWith("/admin")) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-w-5xl mx-3 md:mx-auto mt-12 md:mt-20 bg-white rounded-2xl border border-ink-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-ink-100">
          <div>
            <h2 className="font-semibold text-ink-900 text-base md:text-lg">
              Toutes les applications
            </h2>
            <p className="text-xs text-ink-500 mt-0.5 hidden sm:block">
              Choisissez un module pour y accéder rapidement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une app..."
                className="pl-9 pr-3 py-1.5 bg-ink-50 border border-ink-200 rounded-lg text-sm w-56 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-ink-100 rounded-lg text-ink-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 max-h-[70vh] overflow-y-auto">
          {filteredActive.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-3 px-2">
                Disponibles
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 mb-6">
                {filteredActive.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.key}
                      onClick={() => handleNavigate(app.path, app.external)}
                      className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-ink-50 transition"
                    >
                      <div
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <span className="text-xs md:text-sm text-ink-700 text-center font-medium">
                        {app.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {filteredSoon.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-3 px-2">
                Bientôt disponible
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {filteredSoon.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.key}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl opacity-60"
                    >
                      <div
                        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm`}
                      >
                        <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        <span
                          className={`absolute -top-1.5 -right-1.5 text-[9px] ${
                            app.badge === "NEW"
                              ? "bg-brand-600"
                              : "bg-ink-900"
                          } text-white px-1.5 py-0.5 rounded-md font-medium`}
                        >
                          {app.badge}
                        </span>
                      </div>
                      <span className="text-xs md:text-sm text-ink-700 text-center font-medium">
                        {app.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {isEmpty && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                <SearchX className="w-6 h-6 text-ink-400" />
              </div>
              <p className="text-sm font-medium text-ink-700">
                Aucune app trouvée
              </p>
              <p className="text-xs text-ink-500 mt-1">
                Essayez un autre terme de recherche
              </p>
            </div>
          )}
        </div>

        <div className="px-5 md:px-8 py-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
          <span className="hidden sm:inline">
            Appuyez sur{" "}
            <kbd className="px-1.5 py-0.5 bg-ink-100 border border-ink-200 rounded font-mono text-[10px]">
              Esc
            </kbd>{" "}
            pour fermer
          </span>
          <span className="sm:hidden">Esc pour fermer</span>
          <a
            href="#"
            className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            Voir le catalogue <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
