import { cn } from "@/utils/functions";
import {
  SearchOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  FileDoneOutlined,
  FileOutlined,
  FileProtectOutlined,
  FileSyncOutlined,
  HomeOutlined,
  ImportOutlined,
  MinusSquareOutlined,
  OrderedListOutlined,
  PlusSquareOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  UngroupOutlined,
  UnorderedListOutlined,
  UserOutlined,
  UserSwitchOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BadgePercent,
  Banknote,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Grid2X2,
  HardHat,
  Layers,
  Mail,
  Package,
  Palette,
  Receipt,
  RotateCcw,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Truck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";
import { BiSolidDiscount } from "react-icons/bi";
import { BsBuildingFillGear } from "react-icons/bs";
import { FaBusinessTime } from "react-icons/fa";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { IoDocumentTextOutline } from "react-icons/io5";
import {
  MdAcUnit,
  MdOutlineAppSettingsAlt,
  MdOutlineAttachMoney,
  MdOutlineEditAttributes,
  MdOutlineInvertColors,
} from "react-icons/md";
import { TbShoppingCartCog } from "react-icons/tb";
import axios from "axios";
import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import Menu from "../../UI/Menu";
import usePermissions from "../../utils/usePermissions";
import SideNavLoader from "./SideNavLoader";

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

const SidebarLink = ({ item, collapsed }) => {
  const Icon = item.icon;

  if (item.action) {
    return (
      <button
        type="button"
        onClick={item.action}
        className={cn(
          "group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-950",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0 text-ink-500 group-hover:text-ink-800" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-950",
          collapsed && "justify-center px-0",
          isActive &&
            "bg-gradient-to-r from-brand-50 to-transparent text-ink-950"
        )
      }
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 text-ink-500 group-hover:text-ink-800",
              isActive && "text-brand-600"
            )}
          />
          {!collapsed && (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    item.badgeTone === "amber"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-brand-100 text-brand-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
};

const SideNav = ({ collapsed, setCollapsed }) => {
  const { permissions } = usePermissions();
  const [isSetting, setIsSetting] = useState(false);
  const { loading } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [saleInvoiceBadge, setSaleInvoiceBadge] = useState(null);
  const searchInputRef = useRef(null);

  // ⌘K / Ctrl+K to focus the sidebar search
  useEffect(() => {
    const handler = (event) => {
      const isCmdOrCtrlK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdOrCtrlK) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const normalizeForSearch = (value) =>
    String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      // strip combining diacritical marks so 'éàç' matches 'eac'
      .replace(/[̀-ͯ]/g, "");

  const { data } = useSelector((state) => state?.setting) || {};
  // SCRUM-142: read badge from Redux startup data when Dashboard has already loaded it
  const startupBadge = useSelector((state) => state.dashboard?.startup?.sidenavBadge);
  const canReadSales = canSee(permissions, {
    permissions: ["create-saleInvoice", "readAll-saleInvoice"],
    operator: "or",
  });

  useEffect(() => {
    if (!canReadSales) {
      setSaleInvoiceBadge(null);
      return undefined;
    }

    // If startup data already loaded by Dashboard, use it — no HTTP call needed
    if (startupBadge) {
      const total = startupBadge.unpaidInvoicesCount ?? 0;
      setSaleInvoiceBadge(total > 0 ? String(total) : null);
      return undefined;
    }

    let cancelled = false;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    axios
      .get(
        `sale-invoice?page=1&count=1&status=true&startDate=${startDate}&endDate=${endDate}`
      )
      .then(({ data: response }) => {
        if (cancelled) return;
        const total = Number(response?.totalSaleInvoice ?? 0);
        setSaleInvoiceBadge(total > 0 ? String(total) : null);
      })
      .catch(() => {
        if (!cancelled) setSaleInvoiceBadge(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canReadSales, startupBadge]);

  const flatSections = [
    {
      label: "Général",
      items: [
        {
          label: "Dashboard",
          to: "/admin/dashboard",
          icon: Grid2X2,
          permit: {
            permissions: ["readAll-dashboard", "create-dashboard"],
            operator: "or",
          },
        },
        data.isPos === "true" && {
          label: "Point de vente",
          to: "/admin/pos",
          icon: ShoppingCart,
          badge: "POS",
          permit: {
            permissions: ["create-saleInvoice", "readAll-saleInvoice"],
            operator: "or",
          },
        },
        {
          label: "Produits",
          to: "/admin/product",
          icon: Package,
          permit: {
            permissions: ["readAll-product", "create-product"],
            operator: "or",
          },
        },
        {
          label: "Factures",
          to: "/admin/sale",
          icon: FileText,
          badge: saleInvoiceBadge,
          badgeTone: "amber",
          permit: {
            permissions: ["create-saleInvoice", "readAll-saleInvoice"],
            operator: "or",
          },
        },
        {
          label: "Clients",
          to: "/admin/customer",
          icon: Users,
          permit: {
            permissions: ["readAll-customer", "create-customer"],
            operator: "or",
          },
        },
        {
          label: "Achats",
          to: "/admin/purchase",
          icon: Truck,
          permit: {
            permissions: ["readAll-purchaseInvoice", "create-purchaseInvoice"],
            operator: "or",
          },
        },
        {
          label: "Messagerie",
          to: "/admin/messages",
          icon: Mail,
          permit: {
            permissions: ["readAll-message", "create-message"],
            operator: "or",
          },
        },
      ],
    },
    {
      label: "Gestion",
      items: [
        {
          label: "Immobilier",
          to: "/admin/property-management",
          icon: Building2,
          permit: {
            permissions: ["create-propertyManagement", "readAll-propertyManagement"],
            operator: "or",
          },
        },
        {
          label: "RH",
          to: "/admin/hr",
          icon: BriefcaseBusiness,
          permit: {
            permissions: ["create-user", "readAll-user"],
            operator: "or",
          },
        },
        {
          label: "FarmOS",
          action: () => { window.location.href = "/farmos/"; },
          icon: Layers,
          permit: {
            permissions: ["readAll-farmos", "create-farmos"],
            operator: "or",
          },
        },
        {
          label: "BatiPro",
          action: () => { window.location.href = "/batipro/"; },
          icon: HardHat,
          permit: {
            permissions: ["readAll-batipro", "create-batipro"],
            operator: "or",
          },
        },
        {
          label: "Comptabilite",
          to: "/admin/accounting",
          icon: WalletCards,
          permit: {
            permissions: ["create-account", "readAll-account"],
            operator: "or",
          },
        },
        {
          label: "Rapports",
          to: "/admin/reports",
          icon: BarChart3,
          permit: {
            permissions: ["create-saleInvoice", "readAll-saleInvoice", "readAll-productReports"],
            operator: "or",
          },
        },
      ],
    },
    {
      label: "Système",
      items: [
        {
          label: "Paramètres",
          to: "/admin/settings",
          icon: Settings,
          permit: {
            permissions: ["create-setting", "readAll-setting"],
            operator: "or",
          },
        },
      ],
    },
    {
      label: "Stocks",
      items: [
        { label: "Produits en rupture", to: "/admin/product-sort-list", icon: ClipboardList, permit: { permissions: ["readAll-product", "create-product"], operator: "or" } },
        { label: "Importer produits", to: "/admin/import-product", icon: Package, permit: { permissions: ["create-product", "readAll-product"], operator: "or" } },
        { label: "Pages codes-barres", to: "/admin/print-page-setting", icon: Receipt, permit: { permissions: ["create-pageSize", "readAll-pageSize"], operator: "or" } },
        { label: "Catégories", to: "/admin/product-category", icon: Layers, permit: { permissions: ["create-productCategory", "readAll-productCategory"], operator: "or" } },
        { label: "Sous-catégories", to: "/admin/product-subcategory", icon: Layers, permit: { permissions: ["create-productSubCategory", "readAll-productSubCategory"], operator: "or" } },
        { label: "Marques", to: "/admin/product-brand", icon: Tag, permit: { permissions: ["create-productBrand", "readAll-productBrand"], operator: "or" } },
        { label: "Couleurs", to: "/admin/product-color", icon: Palette, permit: { permissions: ["create-color", "readAll-color"], operator: "or" } },
        { label: "Attributs", to: "/admin/product-attribute", icon: SlidersHorizontal, permit: { permissions: ["create-productAttribute", "readAll-productAttribute"], operator: "or" } },
        { label: "Unités", to: "/admin/uom", icon: Ruler, permit: { permissions: ["create-uom", "readAll-uom"], operator: "or" } },
      ],
    },
    {
      label: "Ventes avancées",
      items: [
        { label: "Nouvelle vente", to: "/admin/sale/add", icon: Receipt, permit: { permissions: ["create-saleInvoice"], operator: "or" } },
        { label: "Retours ventes", to: "/admin/sale-return-list", icon: RotateCcw, permit: { permissions: ["create-returnSaleInvoice", "readAll-returnSaleInvoice"], operator: "or" } },
        { label: "Fournisseurs", to: "/admin/supplier", icon: Users, permit: { permissions: ["readAll-supplier", "create-supplier"], operator: "or" } },
        { label: "Retours achats", to: "/admin/purchase-return-list", icon: RotateCcw, permit: { permissions: ["create-returnPurchaseInvoice", "readAll-returnPurchaseInvoice"], operator: "or" } },
        { label: "Bons de commande", to: "/admin/purchase-reorder-invoice", icon: ClipboardList, permit: { permissions: ["create-purchaseReorderInvoice", "readAll-purchaseReorderInvoice"], operator: "or" } },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Transactions", to: "/admin/transaction", icon: Banknote, permit: { permissions: ["create-transaction", "readAll-transaction"], operator: "or" } },
        { label: "Types transaction", to: "/admin/transaction-type", icon: Receipt, permit: { permissions: ["create-transactionType", "readAll-transactionType"], operator: "or" } },
        { label: "Balance générale", to: "/admin/account/trial-balance", icon: BarChart3, permit: { permissions: ["readAll-account", "readSingle-account"], operator: "or" } },
        { label: "Bilan", to: "/admin/account/balance-sheet", icon: ClipboardList, permit: { permissions: ["readAll-account", "readSingle-account"], operator: "or" } },
        { label: "Résultat", to: "/admin/account/income", icon: BarChart3, permit: { permissions: ["readAll-account", "readSingle-account"], operator: "or" } },
        { label: "Paiements manuels", to: "/admin/manual-payment", icon: CreditCard, permit: { permissions: ["create-manualPayment", "readAll-manualPayment"], operator: "or" } },
        { label: "Modes de paiement", to: "/admin/payment-method", icon: WalletCards, permit: { permissions: ["create-paymentMethod", "readAll-paymentMethod"], operator: "or" } },
      ],
    },
    {
      label: "E-commerce",
      items: [
        { label: "Commandes", to: "/admin/order", icon: ShoppingCart, permit: { permissions: ["readAll-cartOrder", "create-cartOrder"], operator: "or" } },
        { label: "Retours commandes", to: "/admin/return-order", icon: RotateCcw, permit: { permissions: ["readAll-returnCartOrder"], operator: "or" } },
        { label: "Renvois retours", to: "/admin/resend-return-order", icon: Truck, permit: { permissions: ["readAll-cartOrder"], operator: "or" } },
        { label: "Avis clients", to: "/admin/review", icon: Star, permit: { permissions: ["readAll-review"], operator: "or" } },
        { label: "Livreurs", to: "/admin/delivery-boy", icon: Truck },
        { label: "Frais livraison", to: "/admin/delivery-fee", icon: Truck, permit: { permissions: ["readAll-deliveryFee"], operator: "or" } },
        { label: "Sliders", to: "/admin/slider", icon: SlidersHorizontal, permit: { permissions: ["readAll-sliderImages"], operator: "or" } },
      ],
    },
    {
      label: "RH détails",
      items: [
        { label: "Rôles", to: "/admin/role", icon: ShieldCheck, permit: { permissions: ["create-role", "readAll-role"], operator: "or" } },
        { label: "Postes", to: "/admin/designation", icon: UserCog, permit: { permissions: ["create-designation", "readAll-designation"], operator: "or" } },
        { label: "Départements", to: "/admin/department", icon: Building2, permit: { permissions: ["create-department", "readAll-department"], operator: "or" } },
        { label: "Horaires", to: "/admin/shift", icon: BriefcaseBusiness, permit: { permissions: ["create-shift", "readAll-shift"], operator: "or" } },
        { label: "Récompenses", to: "/admin/award", icon: Star, permit: { permissions: ["create-award", "readAll-award"], operator: "or" } },
        { label: "Salaires", to: "/admin/salary-history", icon: Banknote, permit: { permissions: ["create-salaryHistory", "readAll-salaryHistory"], operator: "or" } },
        { label: "Statuts employés", to: "/admin/employment-status", icon: UserCog, permit: { permissions: ["create-employmentStatus", "readAll-employmentStatus"], operator: "or" } },
      ],
    },
    {
      label: "Configuration",
      items: [
        { label: "Entreprise", to: "/admin/company-setting", icon: Building2, permit: { permissions: ["create-setting", "readAll-setting"], operator: "or" } },
        { label: "Email", to: "/admin/email-config", icon: Mail, permit: { permissions: ["readAll-emailConfig"], operator: "or" } },
        { label: "Remises", to: "/admin/discount", icon: BadgePercent, permit: { permissions: ["create-discount", "readAll-discount"], operator: "or" } },
        { label: "Devises", to: "/admin/currency", icon: Banknote, permit: { permissions: ["create-currency", "readAll-currency"], operator: "or" } },
        { label: "TVA / Taxes", to: "/admin/vat-tax", icon: BadgePercent, permit: { permissions: ["create-vat", "readAll-vat"], operator: "or" } },
        { label: "Conditions", to: "/admin/terms-and-condition", icon: FileText, permit: { permissions: ["create-termsAndCondition", "readAll-termsAndCondition"], operator: "or" } },
      ],
    },
  ];

  const menu = [
    {
      type: "section",
      key: "section-general",
      label: "Général",
    },
    Array.isArray(permissions) &&
    permissions.length > 0 && {
      label: (
        <NavLink to="/admin/dashboard">
          <span>Tableau de bord</span>
        </NavLink>
      ),
      permit: {
        permissions: ["readAll-dashboard", "create-dashboard"],
        operator: "or",
      },
      key: "dashboard",
      icon: <HomeOutlined />,
    },

    data.isPos === "true" && {
      permit: {
        permissions: ["create-saleInvoice", "readAll-saleInvoice"],
        operator: "or",
      },
      label: (
        <NavLink
          to="/admin/pos"
          onClick={() => setCollapsed && setCollapsed(true)}
        >
          <span>Point de vente</span>
        </NavLink>
      ),

      key: "pos",
      icon: <ShoppingCartOutlined />,
    },

    {
      label: (
        <NavLink to="/admin/messages">
          <span>Messagerie</span>
        </NavLink>
      ),
      permit: {
        permissions: ["readAll-message", "create-message"],
        operator: "or",
      },
      key: "messages",
      icon: <Mail className="h-4 w-4" />,
    },

    {
      label: "Produits",
      key: "inventory",
      permit: {
        permissions: ["readAll-product", "create-product"],
        operator: "or",
      },
      icon: <CodeSandboxOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/product">
              <span>Catalogue produits</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-product",
              "create-product",
              "readSingle-product",
              "update-product",
              "delete-product",
            ],
            operator: "or",
          },
          key: "products",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-sort-list">
              <span>Produits en rupture</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-product",
              "create-product",
              "readSingle-product",
              "update-product",
              "delete-product",
            ],
            operator: "or",
          },
          key: "productSortList",
          icon: <OrderedListOutlined />,
        },
      ],
    },

    {
      type: "section",
      key: "section-operations",
      label: "Opérations",
    },
    {
      label: "Achats",
      permit: {
        permissions: [
          "readAll-purchaseInvoice",
          "readAll-supplier",
          "readAll-purchaseInvoice",
          "readAll-purchaseReorderInvoice",
          "create-purchaseInvoice",
          "create-supplier",
          "create-purchaseReorderInvoice",
          "create-returnPurchaseInvoice",
          "readAll-returnPurchaseInvoice",
        ],
        operator: "or",
      },
      key: "PURCHASE",
      icon: <PlusSquareOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/purchase">
              <span>Factures d&apos;achat</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-purchaseInvoice",
              "readSingle-purchaseInvoice",
              "create-purchaseInvoice",
              "update-purchaseInvoice",
              "delete-purchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchases",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/supplier">
              <span>Fournisseurs</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-supplier",
              "create-supplier",
              "readSingle-supplier",
              "update-supplier",
              "delete-supplier",
            ],
            operator: "or",
          },
          key: "suppliers",
          icon: <UserOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-return-list">
              <span>Retours achats</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-returnPurchaseInvoice",
              "readAll-returnPurchaseInvoice",
              "readSingle-returnPurchaseInvoice",
              "update-returnPurchaseInvoice",
              "delete-returnPurchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchaseReturn",
          icon: <OrderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-reorder-invoice">
              <span>Bons de commande</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-purchaseReorderInvoice",
              "readAll-purchaseReorderInvoice",
              "readSingle-purchaseReorderInvoice",
              "update-purchaseReorderInvoice",
              "delete-purchaseReorderInvoice",
            ],
            operator: "or",
          },
          key: "purchaseOrder",
          icon: <OrderedListOutlined />,
        },
      ],
    },
    {
      label: "Ventes",
      permit: {
        permissions: [
          "create-saleInvoice",
          "readAll-saleInvoice",
          "create-returnSaleInvoice",
          "readAll-returnSaleInvoice",
          "create-customer",
          "readAll-customer",
        ],
        operator: "or",
      },
      key: "SALE",
      icon: <MinusSquareOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/sale">
              <span>Factures de vente</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-saleInvoice",
              "readAll-saleInvoice",
              "readSingle-saleInvoice",
              "update-saleInvoice",
              "delete-saleInvoice",
            ],
            operator: "or",
          },
          key: "sells",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/customer">
              <span>Clients</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readAll-customer",
              "readSingle-customer",
              "create-customer",
              "update-customer",
              "delete-customer",
            ],
            operator: "or",
          },
          key: "customers",
          icon: <UserOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/sale-return-list">
              <span>Retours ventes</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-returnSaleInvoice",
              "readAll-returnSaleInvoice",
              "readSingle-returnSaleInvoice",
            ],
            operator: "or",
          },
          key: "saleReturn",
          icon: <OrderedListOutlined />,
        },
      ],
    },

    {
      type: "section",
      key: "section-management",
      label: "Gestion",
    },
    {
      label: "Comptabilité",
      permit: {
        permissions: [
          "create-account",
          "readAll-account",
          "create-transaction",
          "readAll-transaction",
          "create-transactionType",
          "readAll-transactionType",
          "create-propertyManagement",
          "readAll-propertyManagement",
          "create-productReports",
          "readAll-productReports",
        ],
        operator: "or",
      },
      key: "accounts",
      icon: <WalletOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/account/">
              <span>Comptes</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-account",
              "readAll-account",
              "readSingle-account",
              "update-account",
              "delete-account",
            ],
            operator: "or",
          },
          key: "accountList",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/transaction/">
              <span>Transactions</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-transaction",
              "readAll-transaction",
              "readSingle-transaction",
              "update-transaction",
              "delete-transaction",
            ],
            operator: "or",
          },
          key: "transactionList",
          icon: <UnorderedListOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/transaction-type/">
              <span>Types de transaction</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-transactionType",
              "readAll-transactionType",
              "readSingle-transactionType",
              "update-transactionType",
              "delete-transactionType",
            ],
            operator: "or",
          },
          key: "transactionTypeList",
          icon: <FileProtectOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/property-management/">
              <span>Immobilier</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-propertyManagement",
              "readAll-propertyManagement",
              "readSingle-propertyManagement",
              "update-propertyManagement",
              "delete-propertyManagement",
            ],
            operator: "or",
          },
          key: "propertyManagement",
          icon: <BsBuildingFillGear />,
        },
        {
          label: (
            <NavLink to="/admin/account/trial-balance">
              <span>Balance générale</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "trialBalance",
          icon: <FileDoneOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/account/balance-sheet">
              <span>Bilan</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "balanceSheet",
          icon: <FileOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/account/income">
              <span>Compte de résultat</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-account", "readSingle-account"],
            operator: "or",
          },
          key: "incomeStatement",
          icon: <FileSyncOutlined />,
        },
      ],
    },
    Array.isArray(permissions) &&
    permissions.length > 0 && {
      label: "Rapports",
      key: "report",
      icon: <IoDocumentTextOutline size={16} />,
      permit: {
        permissions: [
          "create-productReports",
          "readAll-productReports",
          "create-purchaseInvoice",
          "readAll-purchaseInvoice",
          "create-saleInvoice",
          "readAll-saleInvoice",
          "create-supplier",
          "readAll-supplier",
          "create-customer",
          "readAll-customer",
          "create-manualPayment",
          "readAll-manualPayment",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/product-report">
              <span>Rapport inventaire</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readSingle-productReports",
              "readAll-productReports",
            ],
            operator: "or",
          },
          key: "productReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/purchase-report">
              <span>Rapport achats</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "readSingle-purchaseInvoice",
              "readAll-purchaseInvoice",
            ],
            operator: "or",
          },
          key: "purchaseReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/sale-report">
              <span>Rapport ventes</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-saleInvoice", "readAll-saleInvoice"],
            operator: "or",
          },
          key: "saleReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/supplier-report">
              <span>Rapport fournisseurs</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-supplier", "readAll-supplier"],
            operator: "or",
          },
          key: "supplierReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/customer-report">
              <span>Rapport clients</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readSingle-customer", "readAll-customer"],
            operator: "or",
          },
          key: "customerReport",
          icon: <FileSyncOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/payment-report">
              <span>Rapport paiements</span>
            </NavLink>
          ),
          permit: {
            permissions: ["readAll-manualPayment", "readAll-manualPayment"],
            operator: "or",
          },
          key: "paymentReport",
          icon: <FileSyncOutlined />,
        },
      ],
    },
  ];

  const SettingMenu = [
    {
      type: "section",
      key: "section-system",
      label: "Système",
    },
    {
      label: (
        <NavLink to="/admin/company-setting">
          <span>Entreprise</span>
        </NavLink>
      ),
      permit: {
        permissions: ["create-setting", "readAll-setting"],
        operator: "or",
      },
      key: "invoiceSetting",
      icon: <BsBuildingFillGear />,
    },
    {
      label: (
        <NavLink to="/admin/settings">
          <span>Paramètres</span>
        </NavLink>
      ),
      permit: {
        permissions: ["create-setting", "readAll-setting"],
        operator: "or",
      },
      key: "appSettings",
      icon: <MdOutlineAppSettingsAlt />,
    },
    {
      type: "section",
      key: "section-hr",
      label: "Gestion",
    },
    {
      label: "Ressources humaines",
      permit: {
        permissions: [
          "create-user",
          "readAll-user",
          "create-rolePermission",
          "readAll-rolePermission",
          "create-designation",
          "readAll-designation",
          "create-department",
          "readAll-department",
          "create-shift",
          "readAll-shift",
          "create-award",
          "readAll-award",
          "create-salaryHistory",
          "readAll-salaryHistory",
          "create-employmentStatus",
          "readAll-employmentStatus",
          "create-role",
          "readAll-role"
        ],
        operator: "or",
      },
      key: "hr",
      icon: <TeamOutlined />,
      children: [
        {
          label: (
            <NavLink to="/admin/hr">
              <span>Ressources humaines</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-user", "readAll-user"],
            operator: "or",
          },
          key: "staffs",
          icon: <UsergroupAddOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/role">
              <span>Rôles et permissions</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-role", "readAll-role"],
            operator: "or",
          },
          key: "roleAndPermissions",
          icon: <UserSwitchOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/designation/">
              <span>Postes</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-designation", "readAll-designation"],
            operator: "or",
          },
          key: "designation",
          icon: <SolutionOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/department/">
              <span>Départements</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-department", "readAll-department"],
            operator: "or",
          },
          key: "department",
          icon: <HiOutlineBuildingOffice2 />,
        },
        {
          label: (
            <NavLink to="/admin/shift/">
              <span>Horaires</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-shift", "readAll-shift"],
            operator: "or",
          },
          key: "shift",
          icon: <FaBusinessTime />,
        },
        {
          label: (
            <NavLink to="/admin/award">
              <span>Récompenses</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-award", "readAll-award"],
            operator: "or",
          },
          key: "award",
          icon: <SolutionOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/salary-history">
              <span>SALAIRES</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-salaryHistory", "readAll-salaryHistory"],
            operator: "or",
          },
          key: "salaryHistory",
          icon: <MdOutlineAttachMoney />,
        },
        {
          label: (
            <NavLink to="/admin/employment-status/">
              <span>Statuts employés</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-employmentStatus",
              "readAll-employmentStatus",
            ],
            operator: "or",
          },
          key: "employmentStatus",
          icon: <FaBusinessTime />,
        },
      ],
    },
    {
      label: "Paramètres produits",
      key: "inventory",
      icon: <TbShoppingCartCog />,
      permit: {
        permissions: [
          "create-productCategory",
          "readAll-productCategory",
          "create-productSubCategory",
          "readAll-productSubCategory",
          "create-productBrand",
          "readAll-productBrand",
          "create-color",
          "readAll-color",
          "create-uom",
          "readAll-uom",
          "create-productAttribute",
          "readAll-productAttribute",
          "create-product",
          "readAll-product",
          "create-pageSize",
          "readAll-pageSize",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/product-category">
              <span>Catégories</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-productCategory", "readAll-productCategory"],
            operator: "or",
          },
          key: "productCategory",
          icon: <AppstoreOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-subcategory">
              <span>Sous-catégories</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-productSubCategory",
              "readAll-productSubCategory",
            ],
            operator: "or",
          },
          key: "productSubcategory",
          icon: <UngroupOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/product-brand">
              <span>Marques</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-productBrand", "readAll-productBrand"],
            operator: "or",
          },
          key: "productBrand",
          icon: <FileProtectOutlined />,
        },

        {
          label: (
            <NavLink to="/admin/product-color">
              <span>Couleurs</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-color", "readAll-color"],
            operator: "or",
          },
          key: "productColor",
          icon: <MdOutlineInvertColors />,
        },
        {
          label: (
            <NavLink to="/admin/product-attribute">
              <span>Attributs</span>
            </NavLink>
          ),
          permit: {
            permissions: [
              "create-productAttribute",
              "readAll-productAttribute",
            ],
            operator: "or",
          },
          key: "productAttribute",
          icon: <MdOutlineEditAttributes />,
        },

        {
          label: (
            <NavLink to="/admin/uom">
              <span>UOM</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-uom", "readAll-uom"],
            operator: "or",
          },
          key: "UoM",
          icon: <MdAcUnit />,
        },
        {
          label: (
            <NavLink to="/admin/import-product">
              <span>Importer produits</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-product", "readAll-product"],
            operator: "or",
          },
          key: "import_csv",
          icon: <ImportOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/print-page-setting">
              <span>Pages codes-barres</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-pageSize", "readAll-pageSize"],
            operator: "or",
          },
          key: "Barcode page setting",
        },
      ],
    },
    {
      label: "Autres réglages",
      key: "Others",
      icon: <SettingOutlined />,
      permit: {
        permissions: [
          "create-discount",
          "readAll-discount",
          "create-currency",
          "readAll-currency",
          "create-vat",
          "readAll-vat",
        ],
        operator: "or",
      },
      children: [
        {
          label: (
            <NavLink to="/admin/discount">
              <span>Remises</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-discount", "readAll-discount"],
            operator: "or",
          },
          key: "Discount",
          icon: <BiSolidDiscount />,
        },
        {
          label: (
            <NavLink to="/admin/currency">
              <span>Devises</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-currency", "readAll-currency"],
            operator: "or",
          },
          key: "Currency",
          icon: <MdOutlineAttachMoney />,
        },
        {
          label: (
            <NavLink to="/admin/vat-tax">
              <span>TVA / Taxes</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-vat", "readAll-vat"],
            operator: "or",
          },
          key: "VAT/TAX",
          icon: <SettingOutlined />,
        },
        {
          label: (
            <NavLink to="/admin/terms-and-condition">
              <span>Conditions</span>
            </NavLink>
          ),
          permit: {
            permissions: ["create-termsAndCondition", "readAll-termsAndCondition"],
            operator: "or",
          },
          key: "termsAndConditions",
          icon: <SettingOutlined />,
        },
      ],
    },
  ];

  return (
    <div className="overflow-y-auto no-scrollbar h-[calc(100vh-64px)] pb-4">
      {loading ? (
        <SideNavLoader />
      ) : (
        <div className="relative min-h-full">
          <div
            className={cn(
              `absolute w-full  transition-all duration-300 ${isSetting ? "left-[280px]" : "left-0"
              }`
            )}
          >
            {!collapsed && (
              <div className="px-3 pt-3 pb-2">
                <div className="relative w-full flex items-center gap-2 rounded-lg bg-ink-100 hover:bg-ink-200 px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 focus-within:border focus-within:border-brand-300 transition">
                  <SearchOutlined className="text-[14px] text-ink-500 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="flex-1 bg-transparent text-sm text-ink-700 placeholder:text-ink-500 outline-none border-0 min-w-0"
                    aria-label="Rechercher dans le menu"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                      className="shrink-0 text-ink-400 hover:text-ink-700 text-xs leading-none p-0.5"
                      aria-label="Effacer la recherche"
                    >
                      ✕
                    </button>
                  ) : (
                    <kbd className="shrink-0 inline-flex items-center text-[11px] bg-white px-1.5 py-0.5 rounded border border-ink-200 font-mono text-ink-400 leading-none">⌘K</kbd>
                  )}
                </div>
              </div>
            )}
            <nav className={cn("space-y-3 px-3", collapsed && "px-2 pt-4")}>
              {(() => {
                const q = normalizeForSearch(searchQuery.trim());
                let totalMatches = 0;
                const rendered = flatSections.map((section) => {
                  const visibleItems = section.items
                    .filter(Boolean)
                    .filter((item) => canSee(permissions, item.permit))
                    .filter((item) => {
                      if (!q) return true;
                      const haystack = normalizeForSearch(
                        [item.label, item.to, section.label, item.badge].join(" "),
                      );
                      return haystack.includes(q);
                    });

                  if (!visibleItems.length) return null;
                  totalMatches += visibleItems.length;

                  return (
                    <div key={section.label}>
                      {!collapsed && (
                        <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                          {section.label}
                        </p>
                      )}
                      <div className="space-y-1">
                        {visibleItems.map((item) => (
                          <SidebarLink
                            key={item.label}
                            item={item}
                            collapsed={collapsed}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });

                if (q && totalMatches === 0) {
                  return (
                    <div className="px-3 py-6 text-center text-xs text-ink-500">
                      Aucun résultat pour <span className="text-ink-900 font-medium">« {searchQuery} »</span>
                    </div>
                  );
                }

                return rendered;
              })()}
            </nav>
          </div>

          <div
            className={cn(
              `absolute w-full  transition-all duration-300 ${isSetting ? "left-0" : "-left-[280px]"
              }`
            )}
          >
            <div
              className={cn(
                "mx-3 mb-2 px-3 flex items-center font-medium gap-2 rounded-lg text-ink-600 hover:bg-ink-100 hover:text-ink-900 py-2 cursor-pointer transition",
                {
                  "flex items-center justify-center text-lg": collapsed,
                }
              )}
              onClick={() => setIsSetting(false)}
            >
              <IoIosArrowBack /> {!collapsed && "Retour au menu"}
            </div>
            <hr className="border-ink-100" />
            <Menu
              items={SettingMenu}
              setCollapsed={setCollapsed}
              permissions={permissions}
              collapsed={collapsed}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SideNav;
