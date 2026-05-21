import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "antd";
import axios from "axios";
import {
  AlertTriangle,
  Bell,
  LogOut,
  Moon,
  Package,
  Plus,
  Receipt,
  Sun,
  User,
  Wrench,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDarkMode } from "../utils/useDarkMode";
import usePermissions from "../utils/usePermissions";

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

const ALERTS_STORAGE_KEY = "ngolu.crm.alerts.read";

const canSee = (permissions, permit) => {
  if (!permit) return true;
  if (!Array.isArray(permissions)) return false;
  const required = Array.isArray(permit.permissions)
    ? permit.permissions
    : [permit.permissions];

  if (permit.operator === "and") {
    return required.every((permission) => permissions.includes(permission));
  }

  return required.some((permission) => permissions.includes(permission));
};

const readDismissedAlerts = () => {
  try {
    const raw = window.localStorage?.getItem(ALERTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDismissedAlerts = (ids) => {
  try {
    window.localStorage?.setItem(ALERTS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Local read-state persistence is best-effort only.
  }
};

const isOpenMaintenance = (request) => {
  const status = String(request?.status || "").toLowerCase();
  return !["done", "resolved", "closed", "completed"].includes(status);
};

const isActiveLease = (lease) => {
  const status = String(lease?.status || "").toLowerCase();
  return !["expired", "terminated", "cancelled", "archived"].includes(status);
};

const buildPropertyAlerts = ({ leases = [], maintenance = [] }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgentMaintenance = maintenance.filter(
    (item) => ["urgent", "high"].includes(item?.priority) && isOpenMaintenance(item),
  ).length;
  const overdueLeases = leases.filter((lease) => {
    if (!isActiveLease(lease)) return false;
    const dueDate = lease?.nextInvoiceDate || lease?.nextPaymentDate;
    const due = dueDate ? new Date(dueDate) : null;
    if (lease?.isOverdue || lease?.status === "late") return true;
    return due && !Number.isNaN(due.getTime()) && due < today;
  }).length;

  return [
    urgentMaintenance > 0 && {
      id: `maintenance-urgent-${urgentMaintenance}`,
      title: "Maintenance urgente",
      description: `${urgentMaintenance} ticket${urgentMaintenance > 1 ? "s" : ""} prioritaire${urgentMaintenance > 1 ? "s" : ""} a traiter`,
      tone: "red",
      to: "/admin/property-management",
      icon: Wrench,
    },
    overdueLeases > 0 && {
      id: `rent-overdue-${overdueLeases}`,
      title: "Loyers en retard",
      description: `${overdueLeases} bail${overdueLeases > 1 ? "s" : ""} avec paiement attendu en retard`,
      tone: "amber",
      to: "/admin/property-management",
      icon: AlertTriangle,
    },
  ].filter(Boolean);
};

function Header({ onPress, data, loading }) {
  const isLogged = localStorage.getItem("isLogged");
  const user = localStorage.getItem("user");
  const userId = localStorage.getItem("id");
  const navigate = useNavigate();
  const location = useLocation();

  const { isDark, toggle: toggleDark } = useDarkMode();
  const { permissions } = usePermissions();
  const [imageError, setImageError] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(readDismissedAlerts);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const alertsRef = useRef(null);
  const userMenuRef = useRef(null);

  const currentTitle = titleFromPath(location.pathname);
  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !dismissedAlertIds.includes(alert.id)),
    [alerts, dismissedAlertIds],
  );
  const unreadAlertCount = unreadAlerts.length;
  const alertBadge = unreadAlertCount > 9 ? "9+" : unreadAlertCount;

  useEffect(() => {
    setImageError(false);
  }, [data]);

  useEffect(() => {
    if (!isLogged) {
      setAlerts([]);
      return undefined;
    }

    let cancelled = false;
    const nextAlerts = [];
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const requests = [];

    if (canSee(permissions, { permissions: ["create-saleInvoice", "readAll-saleInvoice"], operator: "or" })) {
      requests.push(
        axios
          .get(`sale-invoice?page=1&count=1&status=true&startDate=${startDate}&endDate=${endDate}`)
          .then(({ data: response }) => {
            const total = Number(response?.totalSaleInvoice ?? 0);
            if (total > 0) {
              nextAlerts.push({
                id: `sale-invoice-${startDate}-${total}`,
                title: "Factures du mois",
                description: `${total} facture${total > 1 ? "s" : ""} a suivre ce mois-ci`,
                tone: "brand",
                to: "/admin/sale",
                icon: Receipt,
              });
            }
          })
          .catch(() => undefined),
      );
    }

    if (canSee(permissions, { permissions: ["create-propertyManagement", "readAll-propertyManagement"], operator: "or" })) {
      requests.push(
        Promise.all([
          axios.get("property-management/leases"),
          axios.get("property-management/maintenance"),
        ])
          .then(([leases, maintenance]) => {
            nextAlerts.push(
              ...buildPropertyAlerts({
                leases: leases.data || [],
                maintenance: maintenance.data || [],
              }),
            );
          })
          .catch(() => undefined),
      );
    }

    if (canSee(permissions, { permissions: ["readAll-product", "create-product"], operator: "or" })) {
      requests.push(
        axios
          .get("reorder-quantity?page=1&count=1&status=true")
          .then(({ data: response }) => {
            const total = Number(response?._count?.id ?? response?.total ?? 0);
            if (total > 0) {
              nextAlerts.push({
                id: `low-stock-${total}`,
                title: "Stock faible",
                description: `${total} produit${total > 1 ? "s" : ""} sous le seuil de reapprovisionnement`,
                tone: "amber",
                to: "/admin/product-sort-list",
                icon: Package,
              });
            }
          })
          .catch(() => undefined),
      );
    }

    if (!requests.length) {
      setAlerts([]);
      return undefined;
    }

    setAlertsLoading(true);
    Promise.allSettled(requests).then(() => {
      if (cancelled) return;
      setAlerts(nextAlerts);
      setAlertsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isLogged, permissions]);

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

  useEffect(() => {
    if (!alertsOpen) return undefined;
    const handler = (e) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alertsOpen]);

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

  const markAlertsRead = () => {
    const ids = Array.from(new Set([...dismissedAlertIds, ...alerts.map((alert) => alert.id)]));
    setDismissedAlertIds(ids);
    writeDismissedAlerts(ids);
  };

  const openAlert = (alert) => {
    const ids = Array.from(new Set([...dismissedAlertIds, alert.id]));
    setDismissedAlertIds(ids);
    writeDismissedAlerts(ids);
    setAlertsOpen(false);
    navigate(alert.to);
  };

  return (
    <>
      <div className="sticky top-0 z-10 w-full h-16 bg-white border-b border-ink-200 px-3 md:px-6 flex items-center justify-between gap-2">
        {/* Left: mobile logo + desktop breadcrumb */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden min-w-0">
            <Skeleton loading={loading} active paragraph={false}>
              {data?.logo && !imageError ? (
                <img
                  alt="logo"
                  src={data.logo}
                  className="h-8 w-auto max-w-[120px] object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="font-semibold text-ink-900 text-sm truncate max-w-[120px]">
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
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {isLogged && (
            <>
              {/* Mobile navigation entry point */}
              <button
                onClick={() => onPress && onPress()}
                className="p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition md:hidden"
                title="Menu CRM"
                aria-label="Ouvrir le menu CRM"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              {/* App switcher desktop shortcut */}
              <button
                onClick={() => setAppSwitcherOpen(true)}
                className="hidden md:block p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition"
                title="Toutes les apps (G)"
                aria-label="Ouvrir toutes les apps"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <div className="relative" ref={alertsRef}>
                <button
                  onClick={() => setAlertsOpen((open) => !open)}
                  className="relative p-2 hover:bg-ink-100 rounded-lg text-ink-600 transition"
                  title="Notifications"
                  aria-label="Ouvrir les alertes"
                  aria-expanded={alertsOpen}
                >
                  <Bell className="w-5 h-5" />
                  {unreadAlertCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white">
                      {alertBadge}
                    </span>
                  )}
                </button>
                {alertsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1rem))] bg-white border border-ink-200 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">Alertes CRM</div>
                        <div className="text-xs text-ink-500">
                          {alertsLoading ? "Chargement..." : `${unreadAlerts.length} non lue${unreadAlerts.length > 1 ? "s" : ""}`}
                        </div>
                      </div>
                      {alerts.length > 0 && (
                        <button
                          type="button"
                          onClick={markAlertsRead}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          Marquer lues
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {!alertsLoading && alerts.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Bell className="h-5 w-5" />
                          </div>
                          <div className="text-sm font-medium text-ink-900">Aucune alerte active</div>
                          <div className="mt-1 text-xs text-ink-500">Tout est a jour pour le moment.</div>
                        </div>
                      )}
                      {alerts.map((alert) => {
                        const Icon = alert.icon;
                        const isRead = dismissedAlertIds.includes(alert.id);
                        return (
                          <button
                            key={alert.id}
                            type="button"
                            onClick={() => openAlert(alert)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-ink-50 ${isRead ? "opacity-60" : ""}`}
                          >
                            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              alert.tone === "red"
                                ? "bg-red-50 text-red-600"
                                : alert.tone === "amber"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-brand-50 text-brand-600"
                            }`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-ink-900">{alert.title}</span>
                                {!isRead && <span className="h-2 w-2 rounded-full bg-red-500" />}
                              </span>
                              <span className="mt-0.5 block text-xs leading-5 text-ink-500">{alert.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleDark}
                className="p-2 hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg text-ink-600 dark:text-ink-300 transition hidden sm:block"
                title={isDark ? "Mode clair" : "Mode sombre"}
                aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="w-px h-6 bg-ink-200 mx-1 hidden sm:block" />

              {/* New sale CTA */}
              <button
                onClick={() => navigate("/admin/sale/add")}
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
