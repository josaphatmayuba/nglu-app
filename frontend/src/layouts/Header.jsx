import { useEffect, useRef, useState } from "react";

import { Skeleton } from "antd";
import {
  Bell,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  Search,
  User,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AppSwitcher from "../components/AppSwitcher/AppSwitcher";

const SECTION_LABELS = {
  dashboard: "Tableau de bord",
  pos: "Point de vente",
  product: "Produits",
  "product-sort-list": "Produits en rupture",
  purchase: "Achats",
  "purchase-return-list": "Retours achats",
  "purchase-reorder-invoice": "Bons de commande",
  supplier: "Fournisseurs",
  sale: "Ventes",
  "sale-return-list": "Retours ventes",
  customer: "Clients",
  hr: "Ressources Humaines",
  staffs: "Personnel",
  account: "Comptabilité",
  transactions: "Rapports",
  "app-settings": "Paramètres",
  "property-management": "Immobilier",
};

function titleFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const adminIdx = parts.indexOf("admin");
  const segment = parts[adminIdx + 1];
  if (!segment) return "Accueil";
  return SECTION_LABELS[segment] || segment.replace(/-/g, " ");
}

function Header({ onPress, data, loading }) {
  const isLogged = localStorage.getItem("isLogged");
  const user = localStorage.getItem("user");
  const userId = localStorage.getItem("id");
  const navigate = useNavigate();
  const location = useLocation();

  const [imageError, setImageError] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const currentTitle = titleFromPath(location.pathname);

  useEffect(() => {
    setImageError(false);
  }, [data]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Keyboard shortcut: G opens app switcher (when not typing in input)
  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === "g" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        if (!appSwitcherOpen) setAppSwitcherOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [appSwitcherOpen]);

  return (
    <>
      <div className="sticky top-0 z-10 w-full h-16 bg-white border-b border-ink-200 px-3 md:px-6 flex items-center justify-between gap-2">
        {/* Left: hamburger (mobile) + logo + breadcrumb */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {isLogged && (
            <button
              onClick={() => onPress && onPress()}
              className="p-2 hover:bg-ink-100 rounded-lg text-ink-700 md:hidden -ml-1"
              title="Menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <Skeleton loading={loading} active paragraph={false}>
              {data?.logo && !imageError ? (
                <img
                  alt="logo"
                  src={data.logo}
                  className="h-8 w-auto max-w-[120px] object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="font-semibold text-ink-900 text-sm">
                  {data?.companyName || "NGOLU"}
                </span>
              )}
            </Skeleton>
          </div>

          {/* Desktop breadcrumb */}
          {isLogged && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-ink-500">Accueil</span>
              <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
              <span className="text-ink-900 font-medium capitalize">
                {currentTitle}
              </span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {isLogged && (
            <>
              {/* Search (mobile only — desktop should use sidebar/global search) */}
              <button
                className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition md:hidden"
                title="Rechercher"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* App switcher */}
              <button
                onClick={() => setAppSwitcherOpen(true)}
                className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition"
                title="Toutes les apps (G)"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button
                className="relative p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              </button>

              {/* Theme toggle (placeholder) */}
              <button
                className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition hidden sm:block"
                title="Thème"
              >
                <Moon className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-ink-200 mx-1 hidden sm:block" />

              {/* New sale CTA */}
              <button
                onClick={() => navigate("/admin/sale-create")}
                className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                title="Nouvelle vente"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline whitespace-nowrap">
                  Nouvelle vente
                </span>
              </button>

              {/* User menu — click-based */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold ml-1 hover:opacity-90 transition"
                  title={user || "Profil"}
                >
                  {(user || "U").slice(0, 2).toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-ink-100">
                      <div className="text-sm font-semibold text-ink-900 truncate">
                        {user || "Utilisateur"}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        Connecté
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to={`/admin/hr/staffs/${userId}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 transition"
                      >
                        <User className="w-4 h-4" /> Mon profil
                      </Link>
                      <Link
                        to="/admin/auth/logout"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AppSwitcher
        open={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
      />
    </>
  );
}

export default Header;
