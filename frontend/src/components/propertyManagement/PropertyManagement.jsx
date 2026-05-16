import {
  AppstoreOutlined,
  BankOutlined,
  CalendarOutlined,
  CopyOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  PlusOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag, message } from "antd";
import axios from "axios";
import {
  AlertTriangle,
  Bath,
  BedDouble,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  CircleAlert,
  CreditCard,
  Download,
  Droplets,
  Eye,
  FileCheck,
  Info,
  Layers,
  MapPin,
  Save,
  FileSignature,
  FileText,
  Grid3X3,
  Home,
  Key,
  LayoutList,
  Mail,
  Map,
  MessageSquare,
  MoreHorizontal,
  Paintbrush,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  WalletCards,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./PropertyManagement.css";
import { loadAllAccount } from "../../redux/rtk/features/account/accountSlice";
import { deleteCustomer } from "../../redux/rtk/features/customer/customerSlice";
import {
  createRentPayment,
  createContract,
  deleteLease,
  deleteMaintenance,
  deleteProperty,
  deleteUnit,
  generateTenantOnboarding,
  loadContractTemplates,
  loadPropertyManagement,
  loadContracts,
  renewLease as renewLeaseThunk,
  saveLease,
  saveMaintenance,
  saveProperty,
  saveTenant,
  saveTenantOnboardingAdmin,
  saveUnit,
  sendContract,
  validateTenantOnboarding,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { Link } from "react-router-dom";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import ContractsTab from "./ContractsTab";

const propertyTypes = [
  { label: "🏢 Immeuble",         value: "building" },
  { label: "🏠 Maison",            value: "house" },
  { label: "🏡 Villa",             value: "villa" },
  { label: "🏪 Local commercial",  value: "commercial" },
  { label: "🟫 Terrain",           value: "land" },
];

const unitTypes = [
  { label: "Appartement", value: "apartment" },
  { label: "Studio", value: "studio" },
  { label: "Bureau", value: "office" },
  { label: "Magasin", value: "shop" },
  { label: "Maison entière", value: "house" },
];

const maritalStatuses = [
  { label: "Célibataire", value: "célibataire" },
  { label: "Marié", value: "marié" },
  { label: "Conjoint de fait", value: "conjoint de fait" },
  { label: "Divorcé", value: "divorcé" },
  { label: "Veuf", value: "veuf" },
];

const coupleStatuses = ["marié", "marie", "conjoint de fait", "union libre"];

const statusColor = {
  available: "green",
  vacant: "green",
  active: "green",
  occupied: "blue",
  reserved: "gold",
  draft: "default",
  open: "gold",
  in_progress: "blue",
  done: "green",
  ended: "red",
  cancelled: "red",
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const compactMoney = (value) =>
  `CDF ${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;

const shortMoney = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    const formatted = Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1);
    return `CDF ${formatted}M`;
  }
  if (Math.abs(amount) >= 1000) return `CDF ${Math.round(amount / 1000)}K`;
  return compactMoney(amount);
};

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const tenantName = (tenant) =>
  tenant?.username ||
  [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ") ||
  tenant?.email ||
  "-";

const tenantNameFromLease = (lease) =>
  [lease?.tenantFirstName, lease?.tenantLastName].filter(Boolean).join(" ") ||
  tenantName(lease?.tenant) ||
  "-";

const getUnitKind = (unit) =>
  unit?.unitType || unit?.propertyType || unit?.property?.propertyType || "apartment";

const typeLabel = {
  apartment: "Appartement",
  studio: "Studio",
  office: "Bureau",
  shop: "Commerce",
  house: "Maison",
  villa: "Maison",
  building: "Immeuble",
  commercial: "Commerce",
  land: "Terrain",
};

const statusLabel = {
  available: "Disponible",
  vacant: "Disponible",
  active: "Actif",
  occupied: "Loué",
  reserved: "Réservé",
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  done: "Terminé",
  ended: "Terminé",
  cancelled: "Annulé",
  maintenance: "Maintenance",
};

const paymentMethodLabels = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile money",
  cheque: "Cheque",
};

const onboardingStatus = {
  sent: { label: "Lien envoyé", color: "blue" },
  draft: { label: "Brouillon en cours", color: "gold" },
  submitted: { label: "Soumis", color: "green" },
  validated: { label: "Validé", color: "purple" },
  expired: { label: "Expiré", color: "red" },
};

const parseOnboardingData = (record) => {
  if (!record?.data) return {};
  try {
    return JSON.parse(record.data);
  } catch {
    return {};
  }
};

const toFormRecord = (type, record) => {
  if (!record) return {};

  const maps = {
    property: {
      name: record.name,
      code: record.code,
      propertyType: record.propertyType,
      status: record.status,
      defaultRent: record.defaultRent,
      address: record.address,
      city: record.city,
      country: record.country,
      floors: record.floors,
      parkingSpaces: record.parkingSpaces,
      marketValue: record.marketValue,
      description: record.description,
    },
    unit: {
      propertyId: record.propertyId,
      name: record.name,
      unitType: record.unitType,
      status: record.status,
      floor: record.floor,
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      area: record.area,
      monthlyRent: record.monthlyRent,
      securityDeposit: record.securityDeposit,
    },
    lease: {
      propertyId: record.propertyId,
      unitId: record.unitId,
      tenantId: record.tenantId,
      status: record.status,
      billingCycle: record.billingCycle,
      rentAmount: record.rentAmount,
      securityDeposit: record.securityDeposit,
      moveInMeterReading: record.moveInMeterReading,
      terms: record.terms,
      startDate: record.startDate,
      endDate: record.endDate,
      nextInvoiceDate: record.nextInvoiceDate,
    },
    maintenance: {
      propertyId: record.propertyId,
      unitId: record.unitId,
      title: record.title,
      priority: record.priority,
      status: record.status,
      estimatedCost: record.estimatedCost,
      description: record.description,
      scheduledDate: record.scheduledDate,
    },
    onboardingEdit: parseOnboardingData(record),
  };

  return maps[type] || record;
};

const Kpi = ({ icon, label, value, tone = "slate" }) => (
  <div className={`pm-kpi pm-kpi-${tone}`}>
    <div className="pm-kpi-icon">{icon}</div>
    <div>
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{value}</div>
    </div>
  </div>
);

const MetricCard = ({ icon, label, value, helper, tone = "brand", trend }) => (
  <div className="immo-metric-card">
    <div className="immo-metric-head">
      <div className={`immo-metric-icon immo-tone-${tone}`}>{icon}</div>
      {trend && <span className={`immo-trend ${trend.tone || "up"}`}>{trend.label}</span>}
    </div>
    <div className="immo-metric-label">{label}</div>
    <div className="immo-metric-value">{value}</div>
    {helper && <div className="immo-metric-helper">{helper}</div>}
  </div>
);

const EmptyState = ({ title, text }) => (
  <div className="immo-empty">
    <Building2 size={28} />
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);

const unitTypeIcon = (kind, size = 14) => {
  switch (kind) {
    case "office":
      return <Briefcase size={size} />;
    case "shop":
    case "commercial":
      return <Store size={size} />;
    case "house":
    case "villa":
      return <Home size={size} />;
    default:
      return <Building2 size={size} />;
  }
};

const ticketIconFor = (request, size = 20) => {
  const haystack = `${request?.title || ""} ${request?.description || ""} ${request?.category || ""}`.toLowerCase();
  if (/(fuite|eau|plomb|water|leak|robinet)/.test(haystack)) return <Droplets size={size} />;
  if (/(élec|elec|electric|panne|disjonct|courant|tension|zap)/.test(haystack)) return <Zap size={size} />;
  if (/(peint|paint|mur|humidit|enduit)/.test(haystack)) return <Paintbrush size={size} />;
  if (/(serrur|clé|cle|lock|key|porte|securit)/.test(haystack)) return <Key size={size} />;
  if (request?.status === "done") return <CheckCircle2 size={size} />;
  return <Wrench size={size} />;
};

const ticketIconTone = (request) => {
  if (request?.status === "done") return "green";
  if (["urgent", "high"].includes(request?.priority)) return "red";
  const haystack = `${request?.title || ""} ${request?.description || ""}`.toLowerCase();
  if (/(élec|elec|electric|panne|disjonct)/.test(haystack)) return "amber";
  if (/(peint|paint|mur|humidit|enduit)/.test(haystack)) return "blue";
  if (/(serrur|clé|cle|lock|key|securit)/.test(haystack)) return "purple";
  return "amber";
};

const PropertyManagement = () => {
  const dispatch = useDispatch();
  const [modal, setModal] = useState(null);
  const [activeSection, setActiveSection] = useState("properties");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [leaseView, setLeaseView] = useState("grid");
  const [openLeaseMenu, setOpenLeaseMenu] = useState(null);
  const [openTenantMenu, setOpenTenantMenu] = useState(null);
  const [contractModal, setContractModal] = useState(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [contractTemplate, setContractTemplate] = useState("standard");
  const [renewModal, setRenewModal] = useState(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const [renewForm] = Form.useForm();
  const [contractClauses, setContractClauses] = useState({
    inventory: true,
    guarantor: true,
    pets: false,
    rentReview: false,
  });
  const [contractLinks, setContractLinks] = useState({});
  const [contractBusy, setContractBusy] = useState(false);
  const [form] = Form.useForm();
  const {
    dashboard,
    properties,
    units,
    tenants,
    onboarding,
    leases,
    payments,
    maintenance,
    contracts,
    contractTemplates,
    loading,
  } = useSelector((state) => state.propertyManagement);
  const accounts = useSelector((state) => state.accounts?.list) || [];

  useEffect(() => {
    dispatch(loadPropertyManagement());
    dispatch(loadAllAccount());
    dispatch(loadContracts());
    dispatch(loadContractTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (!openLeaseMenu) return undefined;

    const closeMenu = (event) => {
      if (event.target.closest?.(".immo-menu-anchor")) return;
      setOpenLeaseMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenLeaseMenu(null);
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openLeaseMenu]);

  useEffect(() => {
    if (!openTenantMenu) return undefined;

    const closeMenu = (event) => {
      if (event.target.closest?.(".immo-menu-anchor")) return;
      setOpenTenantMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenTenantMenu(null);
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openTenantMenu]);

  useEffect(() => {
    if (!contractModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setContractModal(null);
        setContractBusy(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contractModal]);

  const openModal = (type, record = null) => {
    setModal({ type, record });
    form.resetFields();
    if (record) {
      form.setFieldsValue(toFormRecord(type, record));
    }
  };

  const closeModal = () => {
    setModal(null);
    form.resetFields();
  };

  const submitModal = async (values) => {
    const id = modal?.record?.id;
    const type = modal?.type;
    const actions = {
      property: saveProperty,
      unit: saveUnit,
      lease: saveLease,
      maintenance: saveMaintenance,
      onboardingEdit: saveTenantOnboardingAdmin,
    };

    let response;
    if (type === "payment") {
      response = await dispatch(createRentPayment(values));
    } else if (type === "onboardingGenerate") {
      response = await dispatch(generateTenantOnboarding(values));
    } else if (type === "tenant") {
      const normalizedChildNumber = Number(values.child_number || 0);
      response = await dispatch(
        saveTenant({
          ...values,
          child_number: normalizedChildNumber,
          child_age:
            normalizedChildNumber > 0
              ? (values.child_age || []).slice(0, normalizedChildNumber)
              : [],
        }),
      );
    } else if (type === "onboardingEdit") {
      response = await dispatch(saveTenantOnboardingAdmin({ id, values }));
    } else if (type === "property") {
      // Split out non-backend fields before saving the property
      const { addUnitsNow, units, _draft, ...propertyValues } = values;
      // Backend schema doesn't have a 'draft' status — Brouillon just
      // saves the partial record + shows a different toast.
      const isDraft = Boolean(_draft);

      response = await dispatch(saveProperty({ id, values: propertyValues }));
      if (response.payload?.message === "success" && isDraft) {
        message.success("Brouillon enregistré");
      }

      // If user chose to add units inline, batch-create them now
      if (
        response.payload?.message === "success"
        && addUnitsNow
        && Array.isArray(units)
        && units.length > 0
      ) {
        const createdPropertyId = response.payload?.data?.id ?? id;
        if (createdPropertyId) {
          const validUnits = units.filter((u) => u && u.name);
          let failed = 0;
          for (const unit of validUnits) {
            const unitResp = await dispatch(saveUnit({ values: { ...unit, propertyId: createdPropertyId, status: "vacant" } }));
            if (unitResp.payload?.message !== "success") failed++;
          }
          if (failed > 0) {
            message.warning(`${validUnits.length - failed}/${validUnits.length} unités créées (${failed} échouées)`);
          } else if (validUnits.length > 0) {
            message.success(`${validUnits.length} unité${validUnits.length > 1 ? "s" : ""} créée${validUnits.length > 1 ? "s" : ""}`);
          }
        }
      }
    } else {
      response = await dispatch(actions[type]({ id, values }));
    }

    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      closeModal();
    }
  };

  const deleteRecord = async (action, id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    const response = await dispatch(action(id));
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
    }
  };

  const validateOnboardingRecord = async (id) => {
    const response = await dispatch(validateTenantOnboarding(id));
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
    }
  };

  const copyText = async (value) => {
    if (!value) {
      message.warning("Aucun lien disponible pour ce bail.");
      return;
    }
    await navigator.clipboard?.writeText(value);
    message.success("Lien copié");
  };

  const getContractLink = (contract) =>
    contractLinks[contract?.id] ||
    contract?.signingUrl ||
    contract?.signatureUrl ||
    contract?.signatureLink ||
    contract?.publicUrl ||
    contract?.url ||
    "";

  const getLeaseContract = (lease) =>
    safeContracts.find(
      (contract) => contract.leaseId === lease?.id || contract.lease?.id === lease?.id,
    );

  const pickDefaultTemplateFor = (lease) => {
    const safeTemplates = (contractTemplates || []).filter(Boolean);
    if (!safeTemplates.length) return "standard";
    // Try to match by unit type when available, else by property type, else any active.
    const unit = safeUnits.find((u) => u.id === lease?.unitId);
    const haystack = `${unit?.unitType || ""} ${lease?.propertyType || ""}`.toLowerCase();
    let preferredType = "residential";
    if (/(office|bureau|commercial|commerce|shop|magasin|store)/.test(haystack)) preferredType = "commercial";
    else if (/(short|saison|courte|court|temporary)/.test(haystack)) preferredType = "short_term";

    const activeOfType = safeTemplates.find((tpl) => tpl.type === preferredType && tpl.isActive);
    if (activeOfType) return activeOfType.id;
    const anyActive = safeTemplates.find((tpl) => tpl.isActive);
    if (anyActive) return anyActive.id;
    return safeTemplates[0].id;
  };

  const openContractWorkflow = (lease, contract = getLeaseContract(lease)) => {
    if (!lease) return;
    setOpenLeaseMenu(null);
    setContractModal({ lease, contract });
    setContractTemplate(pickDefaultTemplateFor(lease));
    setContractClauses({
      inventory: true,
      guarantor: true,
      pets: false,
      rentReview: false,
    });
  };

  const openRenewModal = (lease) => {
    if (!lease) return;
    setOpenLeaseMenu(null);
    const startDefault = lease.endDate
      ? moment(lease.endDate).add(1, "day").format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD");
    let endDefault = "";
    if (lease.startDate && lease.endDate) {
      const months = moment(lease.endDate).diff(moment(lease.startDate), "months") || 12;
      endDefault = moment(startDefault).add(months, "months").format("YYYY-MM-DD");
    }
    const defaultTemplate = pickDefaultTemplateFor(lease);
    renewForm.resetFields();
    renewForm.setFieldsValue({
      startDate: startDefault,
      endDate: endDefault || undefined,
      rentAmount: lease.rentAmount,
      templateId: typeof defaultTemplate === "number" ? defaultTemplate : undefined,
      endCurrentLease: true,
    });
    setRenewModal({ lease });
  };

  const closeRenewModal = () => {
    setRenewModal(null);
    setRenewBusy(false);
    renewForm.resetFields();
  };

  const submitRenewLease = async (values) => {
    if (!renewModal?.lease) return;
    setRenewBusy(true);
    const response = await dispatch(
      renewLeaseThunk({
        id: renewModal.lease.id,
        values: {
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          rentAmount: values.rentAmount != null ? Number(values.rentAmount) : undefined,
          templateId: values.templateId || undefined,
          endCurrentLease: Boolean(values.endCurrentLease),
        },
      }),
    );
    setRenewBusy(false);
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      dispatch(loadContracts());
      closeRenewModal();
    }
  };

  const closeContractWorkflow = () => {
    setContractModal(null);
    setContractBusy(false);
  };

  const buildLeaseContractContent = (lease) => {
    if (!lease) return "";
    const templateLabels = {
      standard: "Standard - bail résidentiel",
      commercial: "Commercial - bureau / commerce",
      short: "Court terme - saisonnier",
    };
    const selectedClauses = [
      contractClauses.inventory && "État des lieux annexé au contrat.",
      contractClauses.guarantor && "Caution solidaire avec garant et pièce d'identité.",
      contractClauses.pets && "Animaux autorisés selon les conditions du bail.",
      contractClauses.rentReview && "Révision annuelle du loyer selon l'indice BCC.",
    ].filter(Boolean);

    return [
      "CONTRAT DE BAIL",
      "",
      `Modèle: ${templateLabels[contractTemplate] || templateLabels.standard}`,
      `Référence bail: ${lease.reference || `BAIL-${lease.id}`}`,
      `Locataire: ${tenantNameFromLease(lease)}`,
      `Propriété: ${leaseDisplayInfo(lease, getLeaseContract(lease)).propertyLabel}`,
      `Période: ${lease.startDate ? moment(lease.startDate).format("DD/MM/YYYY") : "-"} au ${lease.endDate ? moment(lease.endDate).format("DD/MM/YYYY") : "-"}`,
      `Loyer mensuel: ${compactMoney(lease.rentAmount || lease.monthlyRent || 0)}`,
      `Caution: ${compactMoney(lease.securityDeposit || Number(lease.rentAmount || lease.monthlyRent || 0) * 2 || 0)}`,
      "",
      "Clauses additionnelles:",
      selectedClauses.length ? selectedClauses.map((clause) => `- ${clause}`).join("\n") : "- Aucune clause additionnelle sélectionnée.",
      "",
      "Ce contrat est généré depuis le module Immobilier et sera envoyé au locataire pour signature électronique.",
    ].join("\n");
  };

  const generateContractForLease = async (leaseId, values = {}) => {
    if (!leaseId) return;
    const response = await dispatch(createContract({ leaseId, ...values }));
    if (response.payload?.message === "success") {
      message.success("Contrat généré");
      await dispatch(loadContracts());
      return response.payload.data;
    }
    return null;
  };

  const ensureContractForLease = async (lease, contract = getLeaseContract(lease), values = {}) => {
    if (contract?.id) return contract;
    return generateContractForLease(lease?.id, values);
  };

  const ensureSigningLink = async (contract) => {
    if (!contract?.id) return "";
    const existing = getContractLink(contract);
    if (existing) return existing;
    const response = await dispatch(sendContract(contract.id));
    const link = response.payload?.data?.signingUrl || "";
    if (link) {
      setContractLinks((prev) => ({ ...prev, [contract.id]: link }));
      await dispatch(loadContracts());
      return link;
    }
    return "";
  };

  const openContractPreview = async (lease, contract = getLeaseContract(lease)) => {
    const currentContract = await ensureContractForLease(lease, contract, {
      contractContent: buildLeaseContractContent(lease),
    });
    if (!currentContract?.id) {
      message.error("Impossible de générer le contrat.");
      return;
    }

    try {
      const { data } = await axios.get(`property-management/contracts/${currentContract.id}`);
      const win = window.open("", "_blank", "width=920,height=1100");
      if (!win) {
        message.error("Autorisez les popups pour ouvrir l'aperçu PDF.");
        return;
      }
      win.document.open();
      win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contrat de bail #${currentContract.id}</title>
  <style>
    body { color: #18181b; font-family: Arial, sans-serif; margin: 32px; }
    .actions { margin-bottom: 18px; }
    .actions button { background: #4f46e5; border: 0; border-radius: 8px; color: #fff; cursor: pointer; padding: 10px 14px; }
    .head { border-bottom: 2px solid #18181b; margin-bottom: 24px; padding-bottom: 16px; }
    .eyebrow { color: #71717a; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 26px; margin: 8px 0; }
    .meta { color: #52525b; font-size: 14px; line-height: 1.6; }
    .content { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; line-height: 1.65; padding: 20px; white-space: pre-wrap; }
    @media print { .actions { display: none; } body { margin: 18mm; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Imprimer / Enregistrer PDF</button></div>
  <div class="head">
    <div class="eyebrow">Contrat de bail</div>
    <h1>Contrat #${currentContract.id}</h1>
    <div class="meta">
      Locataire: ${data?.tenantName || tenantNameFromLease(lease)}<br />
      Email: ${data?.tenantEmail || lease?.tenantEmail || "-"}<br />
      Statut: ${data?.status || currentContract.status || "-"}
    </div>
  </div>
  <div class="content">${data?.contractContent || "Contrat généré."}</div>
</body>
</html>`);
      win.document.close();
      win.focus();
    } catch {
      message.error("Impossible d'ouvrir l'aperçu du contrat.");
    }
  };

  const generateAndSendContract = async () => {
    if (!contractModal?.lease) return;
    setContractBusy(true);
    // If the gestionnaire selected a real template (numeric id from the store), let the backend
    // render it from the active/selected template + variable substitution. Otherwise fall back
    // to the legacy frontend-built content.
    const numericTemplateId = Number.isFinite(Number(contractTemplate)) && Number(contractTemplate) > 0
      ? Number(contractTemplate)
      : null;
    const generationOptions = numericTemplateId
      ? { templateId: numericTemplateId }
      : { contractContent: buildLeaseContractContent(contractModal.lease) };

    const contract = await ensureContractForLease(contractModal.lease, contractModal.contract, generationOptions);
    if (!contract?.id) {
      setContractBusy(false);
      return;
    }
    const link = await ensureSigningLink(contract);
    setContractBusy(false);
    if (link) {
      message.success("Contrat généré et envoyé pour signature");
      closeContractWorkflow();
    } else {
      message.warning("Contrat généré, mais aucun lien de signature n'a été retourné.");
      setContractModal((prev) => (prev ? { ...prev, contract } : prev));
    }
  };

  const generateMissingContracts = async () => {
    const missingLeases = safeLeases.filter(
      (lease) => !safeContracts.some((contract) => contract.leaseId === lease.id),
    );

    if (!missingLeases.length) {
      message.success("Tous les baux ont déjà un contrat");
      return;
    }

    await Promise.all(
      missingLeases.map((lease) => dispatch(createContract({ leaseId: lease.id }))),
    );
    message.success(`${missingLeases.length} contrat(s) généré(s)`);
    dispatch(loadContracts());
  };

  const handleLeaseMenuAction = (action, lease, contract) => {
    setOpenLeaseMenu(null);

    if (action === "detail" || action === "edit") {
      openModal("lease", lease);
      return;
    }

    if (action === "contract") {
      if (!contract) {
        openContractWorkflow(lease);
        return;
      }
      openContractPreview(lease, contract);
      return;
    }

    if (action === "pdf") {
      if (!contract) {
        message.error("Générez d'abord le contrat.");
        return;
      }
      openContractPreview(lease, contract);
      return;
    }

    if (action === "resend") {
      ensureSigningLink(contract).then((link) => {
        if (link) message.success("Lien de signature renvoyé au locataire.");
        else message.error("Impossible de récupérer le lien de signature.");
      });
      return;
    }

    if (action === "copyLink") {
      ensureSigningLink(contract).then(copyText);
      return;
    }

    if (action === "cancelSend") {
      message.info("Envoi de signature annulé.");
      return;
    }

    if (action === "archive") {
      message.success("Bail archivé définitivement.");
      return;
    }

    if (action === "payments") {
      setActiveSection("payments");
      return;
    }

    if (action === "maintenance") {
      setActiveSection("maintenance");
      return;
    }

    if (action === "renew") {
      openRenewModal(lease);
      return;
    }

    if (action === "terminate") {
      deleteRecord(deleteLease, lease.id);
      return;
    }

    if (action === "delete") {
      deleteRecord(deleteLease, lease.id);
    }
  };

  const safeProperties = useMemo(() => (properties ?? []).filter(Boolean), [properties]);
  const safeUnits = useMemo(() => (units ?? []).filter(Boolean), [units]);
  const safeTenants = useMemo(() => (tenants ?? []).filter(Boolean), [tenants]);
  const safeOnboarding = useMemo(() => (onboarding ?? []).filter(Boolean), [onboarding]);
  const safeLeases = useMemo(() => (leases ?? []).filter(Boolean), [leases]);
  const safePayments = useMemo(() => (payments ?? []).filter(Boolean), [payments]);
  const safeMaintenance = useMemo(
    () => (maintenance ?? []).filter(Boolean),
    [maintenance],
  );
  const safeContracts = useMemo(() => (contracts ?? []).filter(Boolean), [contracts]);

  const propertyOptions = safeProperties.map((property) => ({
    label: property.name,
    value: property.id,
  }));

  const unitOptions = safeUnits.map((unit) => ({
    label: `${unit.name} - ${unit.propertyAddress || unit.propertyName || ""}`,
    value: unit.id,
  }));

  const selectedProperty = Form.useWatch("propertyId", form);
  const leaseUnitOptions = safeUnits
    .filter((unit) => !selectedProperty || unit.propertyId === selectedProperty)
    .map((unit) => ({
      label: unit.name,
      value: unit.id,
    }));

  const leaseOptions = safeLeases
    .filter((lease) => lease.status === "active")
    .map((lease) => ({
      label: `${lease.reference} - ${lease.unit?.name} - ${tenantName(lease.tenant)}`,
      value: lease.id,
    }));

  const cashBankAccounts = (accounts ?? []).filter((account) =>
    ["cash", "bank"].includes(account.name?.toLowerCase()),
  );

  const selectedUnit = Form.useWatch("unitId", form);
  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const addUnitsNow = Form.useWatch("addUnitsNow", form);
  const isCouple = coupleStatuses.includes(String(maritalStatus || "").toLowerCase());
  const tenantRequiredRules = modal?.type === "tenant" ? [{ required: true }] : [];
  const modalTitleByType = {
    tenant: "Nouveau Locataire",
    onboardingGenerate: "Générer un lien d'inscription",
    onboardingEdit: "Dossier locataire en ligne",
  };
  const buildRichTitle = (Icon, iconTone, title, subtitle) => (
    <div className="immo-modal-title">
      <span className={`immo-modal-title-icon ${iconTone}`}><Icon size={20} /></span>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
  const richTitleByType = {
    property: buildRichTitle(Building2, "brand", modal?.record ? "Modifier la propriété" : "Nouvelle propriété", "Ajoutez un bien à votre portefeuille immobilier"),
  };
  const modalTitle = richTitleByType[modal?.type]
    || modalTitleByType[modal?.type]
    || (modal?.record ? "Modifier" : "Créer");

  useEffect(() => {
    if (modal?.type !== "lease" || !selectedUnit || modal?.record) return;
    const unit = safeUnits.find((item) => item.id === selectedUnit);
    if (unit) {
      form.setFieldsValue({
        rentAmount: unit.monthlyRent,
        securityDeposit: unit.securityDeposit,
      });
    }
  }, [form, modal?.type, modal?.record, selectedUnit, safeUnits]);

  const handleLeasePropertyChange = (propertyId) => {
    const currentUnitId = form.getFieldValue("unitId");
    const currentUnit = safeUnits.find((unit) => unit.id === currentUnitId);
    if (!currentUnit || currentUnit.propertyId !== propertyId) {
      form.setFieldsValue({
        unitId: undefined,
        rentAmount: undefined,
        securityDeposit: undefined,
      });
    }
  };

  const availabilityRows = useMemo(
    () =>
      safeUnits.map((unit) => {
        const lease = safeLeases.find(
          (item) => item.unitId === unit.id && item.status === "active",
        );
        return { ...unit, currentLease: lease };
      }),
    [safeLeases, safeUnits],
  );

  const enrichedUnits = useMemo(
    () =>
      safeUnits.map((unit) => {
        const activeLease = safeLeases.find(
          (lease) => lease.unitId === unit.id && lease.status === "active",
        );
        const property = safeProperties.find((item) => item.id === unit.propertyId);
        const unitKind = getUnitKind(unit);
        return {
          ...unit,
          activeLease,
          property,
          displayName: unit.propertyName || unit.propertyAddress || property?.name || unit.name,
          displayAddress: unit.propertyAddress || property?.address || "-",
          unitKind,
          unitKindLabel: typeLabel[unitKind] || unitKind,
        };
      }),
    [safeLeases, safeProperties, safeUnits],
  );

  const filteredUnits = useMemo(() => {
    const q = normalize(searchTerm);
    return enrichedUnits.filter((unit) => {
      const matchesType = typeFilter === "all" || getUnitKind(unit) === typeFilter;
      const haystack = normalize(
        [
          unit.displayName,
          unit.name,
          unit.displayAddress,
          unit.activeLease?.reference,
          tenantNameFromLease(unit.activeLease),
        ].join(" "),
      );
      return matchesType && (!q || haystack.includes(q));
    });
  }, [enrichedUnits, searchTerm, typeFilter]);

  const activeLeases = safeLeases.filter((lease) => lease.status === "active");
  const occupiedUnits = enrichedUnits.filter(
    (unit) => unit.status === "occupied" || unit.activeLease,
  );
  const vacantUnits = enrichedUnits.filter((unit) =>
    ["available", "vacant"].includes(unit.status),
  );
  const maintenanceUnits = enrichedUnits.filter((unit) => unit.status === "maintenance");
  const openMaintenance = safeMaintenance.filter((item) =>
    ["open", "in_progress"].includes(item.status),
  );
  const monthlyRent =
    dashboard?.monthlyRent ??
    activeLeases.reduce((sum, lease) => sum + Number(lease.rentAmount || 0), 0);
  const collectedRent =
    dashboard?.collectedRent ??
    safePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  // ─── Derived payment buckets (the DB doesn't store payment.status —
  //     every recorded payment IS paid; pending/overdue are *expected*
  //     payments computed from each active lease's nextInvoiceDate
  //     and the absence of a payment for that period.) ──────────────
  const today = moment();
  const leaseHasPaymentInPeriod = (leaseId, periodStart, periodEnd) =>
    safePayments.some((p) =>
      p.leaseId === leaseId
      && p.paymentDate
      && moment(p.paymentDate).isBetween(periodStart, periodEnd, "day", "[]"),
    );
  const overdueLeases = activeLeases.filter((lease) => {
    if (!lease.nextInvoiceDate) return false;
    const due = moment(lease.nextInvoiceDate);
    if (!due.isBefore(today, "day")) return false;
    return !leaseHasPaymentInPeriod(lease.id, due.clone().subtract(1, "month"), due);
  });
  const upcomingLeases = activeLeases.filter((lease) => {
    if (!lease.nextInvoiceDate) return false;
    const due = moment(lease.nextInvoiceDate);
    if (due.isBefore(today, "day")) return false;
    if (due.diff(today, "days") > 5) return false;
    return !leaseHasPaymentInPeriod(lease.id, today.clone().subtract(1, "month"), due);
  });
  const overduePayments = overdueLeases;
  const upcomingPayments = upcomingLeases;
  const occupancyRate = enrichedUnits.length
    ? Math.round((occupiedUnits.length / enrichedUnits.length) * 100)
    : 0;

  const tabItems = [
    { key: "properties", label: "Propriétés", count: enrichedUnits.length || safeProperties.length },
    { key: "tenants", label: "Locataires", count: safeTenants.length },
    { key: "leases", label: "Baux", count: safeLeases.length },
    { key: "payments", label: "Paiements", count: safePayments.length },
    { key: "maintenance", label: "Maintenance", count: openMaintenance.length, danger: true },
  ];

  const typeFilters = [
    { label: "Tous", value: "all" },
    { label: "Appartement", value: "apartment" },
    { label: "Maison", value: "house" },
    { label: "Bureau", value: "office" },
    { label: "Commerce", value: "shop" },
  ];

  const avatarColors = ["indigo", "orange", "violet", "blue", "rose", "green", "slate"];
  const initials = (value = "") =>
    String(value)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";

  const leaseContractFor = (lease) =>
    safeContracts.find(
      (contract) => contract.leaseId === lease.id || contract.lease?.id === lease.id,
    );

  const leaseMenuVariant = (lease, contract) => {
    const isExpired =
      lease?.status === "expired" || (lease?.endDate && moment(lease.endDate).isBefore(moment()));
    if (isExpired) return "expired";
    if (!contract) return "noContract";
    if (contract.status === "signed") return "signed";
    return "pendingSignature";
  };

  const leaseDisplayInfo = (lease, contract) => {
    const start = lease?.startDate ? moment(lease.startDate) : null;
    const end = lease?.endDate ? moment(lease.endDate) : null;
    const now = moment();
    const isExpired = end?.isBefore(now);
    const daysLeft = end ? end.diff(now, "days") : null;
    const elapsedMonths = start ? Math.max(0, now.diff(start, "months")) : 0;
    const totalMonths = start && end ? Math.max(1, end.diff(start, "months")) : 1;
    const years = Math.max(1, Math.round(totalMonths / 12));
    const progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / totalMonths) * 100)));
    const variant = leaseMenuVariant(lease, contract);
    const statusTone = isExpired ? "danger" : daysLeft !== null && daysLeft <= 60 ? "warning" : "success";
    const statusText = isExpired ? "Expiré" : daysLeft !== null && daysLeft <= 60 ? `À renouveler ${daysLeft}j` : "Actif";
    const contractTone =
      variant === "signed" ? "success" : variant === "noContract" ? "danger" : variant === "expired" ? "muted" : "warning";
    const contractLabel =
      variant === "signed" ? "Signé" : variant === "noContract" ? "Générer" : variant === "expired" ? "Archivé" : "Attente signature";
    const progressTone = variant === "noContract" ? "danger" : statusTone;

    return {
      variant,
      start,
      end,
      isExpired,
      daysLeft,
      elapsedMonths,
      totalMonths,
      years,
      progress,
      statusTone,
      statusText,
      contractTone,
      contractLabel,
      progressTone,
      propertyLabel: [lease?.propertyAddress || lease?.propertyName, lease?.unitName].filter(Boolean).join(" · ") || "-",
      reference: `#${lease?.reference || `BAIL-${lease?.id}`}`,
    };
  };

  const renderLeaseMenuButton = (action, lease, contract, icon, label, options = {}) => (
    <button
      type="button"
      className={`${options.tone || ""} ${options.highlight ? "highlight" : ""}`.trim()}
      onClick={() => handleLeaseMenuAction(action, lease, contract)}
    >
      {icon}
      {label}
    </button>
  );

  const tenantActiveLease = (tenant) =>
    safeLeases.find((lease) => lease.tenantId === tenant.id && lease.status === "active") ||
    safeLeases.find((lease) => lease.tenantId === tenant.id);

  const handleTenantAction = async (action, tenant) => {
    setOpenTenantMenu(null);
    if (action === "edit") {
      openModal("tenant", tenant);
      return;
    }
    if (action === "viewLease") {
      const lease = tenantActiveLease(tenant);
      if (lease) {
        setActiveSection("leases");
        setOpenLeaseMenu(`card-${lease.id}`);
      } else {
        message.info("Ce locataire n'a pas encore de bail.");
      }
      return;
    }
    if (action === "viewPayments") {
      setActiveSection("payments");
      return;
    }
    if (action === "copyEmail") {
      if (tenant.email) {
        navigator.clipboard?.writeText(tenant.email);
        message.success("Email copié");
      } else {
        message.warning("Pas d'email enregistré");
      }
      return;
    }
    if (action === "copyPhone") {
      if (tenant.phone) {
        navigator.clipboard?.writeText(tenant.phone);
        message.success("Téléphone copié");
      } else {
        message.warning("Pas de téléphone enregistré");
      }
      return;
    }
    if (action === "delete") {
      const hasLease = safeLeases.some((lease) => lease.tenantId === tenant.id);
      if (hasLease) {
        message.warning("Impossible : ce locataire a un bail actif. Résiliez d'abord le bail.");
        return;
      }
      if (!window.confirm(`Supprimer définitivement le locataire « ${tenantName(tenant)} » ?`)) return;
      const result = await dispatch(deleteCustomer(tenant.id));
      if (result?.payload?.message === "success" || result?.meta?.requestStatus === "fulfilled") {
        message.success("Locataire supprimé");
        dispatch(loadPropertyManagement());
      } else {
        message.error("Échec de la suppression");
      }
    }
  };

  const renderTenantContextMenu = (tenant) => {
    const lease = tenantActiveLease(tenant);
    const Item = ({ icon, label, onClick, tone, highlight }) => (
      <button
        type="button"
        className={`immo-menu-item${tone === "danger" ? " danger" : ""}${highlight ? " highlight" : ""}`}
        onClick={onClick}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
    return (
      <div className="immo-context-menu">
        <div className="immo-menu-head">
          <strong>{tenantName(tenant)}</strong>
          <span>{lease ? `Bail ${lease.reference || `#${lease.id}`}` : "Sans bail"}</span>
        </div>
        <Item icon={<Pencil size={16} />}      label="Modifier le locataire" onClick={() => handleTenantAction("edit", tenant)} highlight />
        <Item icon={<FileText size={16} />}    label="Voir le bail"          onClick={() => handleTenantAction("viewLease", tenant)} />
        <Item icon={<ReceiptText size={16} />} label="Voir les paiements"    onClick={() => handleTenantAction("viewPayments", tenant)} />
        <div className="immo-menu-separator" />
        <Item icon={<Mail size={16} />}        label="Copier l'email"        onClick={() => handleTenantAction("copyEmail", tenant)} />
        <Item icon={<ClipboardCopy size={16} />} label="Copier le téléphone" onClick={() => handleTenantAction("copyPhone", tenant)} />
        <div className="immo-menu-separator" />
        <Item icon={<Trash2 size={16} />}      label="Supprimer le locataire" onClick={() => handleTenantAction("delete", tenant)} tone="danger" />
      </div>
    );
  };

  const renderLeaseContextMenu = (lease, contract, statusText) => {
    const variant = leaseMenuVariant(lease, contract);
    const headText = {
      signed: "Bail signé",
      noContract: "Sans contrat",
      pendingSignature: "En attente signature",
      expired: "Bail expiré",
    }[variant];

    return (
      <div className="immo-context-menu">
        <div className={`immo-menu-head ${variant}`}>
          <strong>{tenantNameFromLease(lease)}</strong>
          <span>{headText} · {statusText}</span>
        </div>

        {variant === "signed" && (
          <>
            {renderLeaseMenuButton("detail", lease, contract, <Eye size={16} />, "Voir détail du bail")}
            {renderLeaseMenuButton("contract", lease, contract, <FileCheck size={16} />, "Voir contrat signé")}
            {renderLeaseMenuButton("pdf", lease, contract, <Download size={16} />, "Télécharger PDF")}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("payments", lease, contract, <ReceiptText size={16} />, "Voir les paiements")}
            {renderLeaseMenuButton("maintenance", lease, contract, <Wrench size={16} />, "Tickets maintenance")}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("edit", lease, contract, <Pencil size={16} />, "Modifier le bail")}
            {renderLeaseMenuButton("renew", lease, contract, <RefreshCw size={16} />, "Renouveler")}
            {renderLeaseMenuButton("terminate", lease, contract, <Trash2 size={16} />, "Résilier le bail", { tone: "danger" })}
          </>
        )}

        {variant === "noContract" && (
          <>
            {renderLeaseMenuButton("detail", lease, contract, <Eye size={16} />, "Voir détail du bail")}
            {renderLeaseMenuButton("contract", lease, contract, <FileSignature size={16} />, "Générer le contrat", { highlight: true })}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("edit", lease, contract, <Pencil size={16} />, "Modifier le bail")}
            {renderLeaseMenuButton("payments", lease, contract, <ReceiptText size={16} />, "Voir les paiements")}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("delete", lease, contract, <Trash2 size={16} />, "Supprimer le bail", { tone: "danger" })}
          </>
        )}

        {variant === "pendingSignature" && (
          <>
            {renderLeaseMenuButton("detail", lease, contract, <Eye size={16} />, "Voir détail du bail")}
            {renderLeaseMenuButton("contract", lease, contract, <FileText size={16} />, "Aperçu du contrat")}
            {renderLeaseMenuButton("resend", lease, contract, <Send size={16} />, "Renvoyer le lien")}
            {renderLeaseMenuButton("copyLink", lease, contract, <ClipboardCopy size={16} />, "Copier le lien de signature")}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("edit", lease, contract, <Pencil size={16} />, "Modifier le bail")}
            {renderLeaseMenuButton("cancelSend", lease, contract, <Trash2 size={16} />, "Annuler l'envoi", { tone: "danger" })}
          </>
        )}

        {variant === "expired" && (
          <>
            {renderLeaseMenuButton("detail", lease, contract, <Eye size={16} />, "Voir détail du bail")}
            {renderLeaseMenuButton("contract", lease, contract, <FileCheck size={16} />, "Voir contrat archivé")}
            {renderLeaseMenuButton("pdf", lease, contract, <Download size={16} />, "Télécharger PDF")}
            <div className="immo-menu-separator" />
            {renderLeaseMenuButton("renew", lease, contract, <RefreshCw size={16} />, "Renouveler (nouveau bail)", { highlight: true })}
            {renderLeaseMenuButton("archive", lease, contract, <FileText size={16} />, "Archiver définitivement")}
          </>
        )}
      </div>
    );
  };

  // Every recorded payment in the table IS paid by definition (status
  // column doesn't exist server-side — a row only exists once the rent
  // was received).
  const paidPayments = safePayments;
  const pendingPayments = upcomingPayments;  // leases, due ≤ 5 days
  const latePayments = overduePayments;       // leases, due < today
  const currentMonthStart = today.clone().startOf("month");
  const currentMonthEnd = today.clone().endOf("month");
  const paidAmount = safePayments
    .filter((p) => p.paymentDate && moment(p.paymentDate).isBetween(currentMonthStart, currentMonthEnd, "day", "[]"))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingAmount = pendingPayments.reduce((sum, item) => sum + Number(item.rentAmount || 0), 0);
  const lateAmount = latePayments.reduce((sum, item) => sum + Number(item.rentAmount || 0), 0);
  const plannedAmount = monthlyRent;
  const recentRentPayments = useMemo(
    () =>
      [...safePayments]
        .sort((a, b) => {
          const da = a?.paymentDate ? moment(a.paymentDate).valueOf() : 0;
          const db = b?.paymentDate ? moment(b.paymentDate).valueOf() : 0;
          return db - da;
        })
        .slice(0, 5),
    [safePayments],
  );

  const urgentMaintenance = safeMaintenance.filter((item) =>
    ["urgent", "high"].includes(item.priority),
  );
  const inProgressMaintenance = safeMaintenance.filter((item) => item.status === "in_progress");
  const resolvedMaintenance = safeMaintenance.filter((item) => item.status === "done");
  const maintenanceCost = safeMaintenance.reduce(
    (sum, item) => sum + Number(item.estimatedCost || 0),
    0,
  );

  const actionColumn = (editType, deleteAction) => ({
    title: "",
    key: "action",
    width: 170,
    render: (_, record) => (
      <div className="flex gap-2">
        <Button size="small" onClick={() => openModal(editType, record)}>
          Edit
        </Button>
        <Button
          size="small"
          danger
          onClick={() => deleteRecord(deleteAction, record.id)}
        >
          Delete
        </Button>
      </div>
    ),
  });

  const items = [
    {
      key: "overview",
      label: "Vue d'ensemble",
      children: (
        <div className="pm-panel">
          <div className="pm-kpi-grid">
            <Kpi icon={<HomeOutlined />} label="Biens" value={dashboard?.properties || 0} />
            <Kpi icon={<BankOutlined />} label="Unités" value={dashboard?.units || 0} tone="green" />
            <Kpi icon={<CalendarOutlined />} label="Baux actifs" value={dashboard?.activeLeases || 0} tone="amber" />
            <Kpi icon={<DollarOutlined />} label="Loyer mensuel" value={money(dashboard?.monthlyRent)} tone="blue" />
            <Kpi icon={<DollarOutlined />} label="Loyers encaissés" value={money(dashboard?.collectedRent)} tone="green" />
            <Kpi icon={<ToolOutlined />} label="Maintenance ouverte" value={dashboard?.openMaintenance || 0} tone="red" />
          </div>
          <div className="pm-section-title">Disponibilités</div>
          <Table
            size="small"
            loading={loading}
            rowKey="id"
            dataSource={availabilityRows}
            pagination={false}
            columns={[
              { title: "Unité", dataIndex: "name" },
              { title: "Bien", render: (_, record) => record.propertyAddress || "-" },
              { title: "Type", dataIndex: "unitType" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              {
                title: "Contrat actif",
                render: (_, record) => record.currentLease?.reference || "-",
              },
              {
                title: "Loyer",
                dataIndex: "monthlyRent",
                render: money,
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "properties",
      label: "Biens",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("property")}>
            Nouveau bien
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeProperties}
            loading={loading}
            columns={[
              { title: "Nom", dataIndex: "name" },
              { title: "Code", dataIndex: "code" },
              { title: "Type", dataIndex: "propertyType" },
              { title: "Adresse", dataIndex: "address" },
              { title: "Unités", render: (_, record) => Number(record.unitsCount || 0) },
              { title: "Loyer défaut", dataIndex: "defaultRent", render: money },
              actionColumn("property", deleteProperty),
            ]}
          />
        </div>
      ),
    },
    {
      key: "units",
      label: "Unités",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("unit")}>
            Nouvelle unité
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeUnits}
            loading={loading}
            columns={[
              { title: "Unité", dataIndex: "name" },
              { title: "Bien", render: (_, record) => record.propertyAddress || "-" },
              { title: "Type", dataIndex: "unitType" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              { title: "Chambres", dataIndex: "bedrooms" },
              { title: "Loyer", dataIndex: "monthlyRent", render: money },
              actionColumn("unit", deleteUnit),
            ]}
          />
        </div>
      ),
    },
    {
      key: "tenants",
      label: "Locataires",
      children: (
        <div className="pm-panel">
          <div className="pm-actions-row">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal("tenant")}>
              Nouveau Locataire
            </Button>
            <Button onClick={() => openModal("onboardingGenerate")}>
              Générer un lien d'inscription
            </Button>
          </div>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeTenants}
            loading={loading}
            columns={[
              { title: "Nom", render: (_, record) => tenantName(record) },
              { title: "Email", dataIndex: "email" },
              { title: "Téléphone", dataIndex: "phone" },
              { title: "Adresse", dataIndex: "address" },
              {
                title: "Baux",
                render: (_, record) =>
                  safeLeases.filter((lease) => lease.tenantId === record.id).length,
              },
            ]}
          />
          <div className="pm-section-title">Liens d'inscription</div>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeOnboarding}
            loading={loading}
            columns={[
              { title: "Téléphone", dataIndex: "phone" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => (
                  <Tag color={onboardingStatus[status]?.color || "default"}>
                    {onboardingStatus[status]?.label || status}
                  </Tag>
                ),
              },
              {
                title: "Nom saisi",
                render: (_, record) => {
                  const data = parseOnboardingData(record);
                  return [data.firstName, data.lastName].filter(Boolean).join(" ") || "-";
                },
              },
              {
                title: "Expire le",
                dataIndex: "expiresAt",
                render: (date) => (date ? moment(date).format("YYYY-MM-DD HH:mm") : "-"),
              },
              {
                title: "Actions",
                width: 330,
                render: (_, record) => (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="small" onClick={() => openModal("onboardingEdit", record)}>
                      Ouvrir
                    </Button>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      disabled={!record.url}
                      onClick={() => copyText(record.url)}
                    >
                      Lien
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      disabled={!["submitted", "draft"].includes(record.status)}
                      onClick={() => validateOnboardingRecord(record.id)}
                    >
                      Valider
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "leases",
      label: "Baux & contrats",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("lease")}>
            Nouveau bail
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeLeases}
            loading={loading}
            columns={[
              { title: "Référence", dataIndex: "reference" },
              { title: "Bien", render: (_, record) => record.propertyAddress || record.propertyName || "-" },
              { title: "Unité", render: (_, record) => record.unitName || "-" },
              {
                title: "Locataire",
                render: (_, record) =>
                  [record.tenantFirstName, record.tenantLastName].filter(Boolean).join(" ") || "-",
              },
              { title: "Début", dataIndex: "startDate", render: (date) => moment(date).format("YYYY-MM-DD") },
              { title: "Fin", dataIndex: "endDate", render: (date) => (date ? moment(date).format("YYYY-MM-DD") : "-") },
              { title: "Loyer", dataIndex: "rentAmount", render: money },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              actionColumn("lease", deleteLease),
            ]}
          />
        </div>
      ),
    },
    {
      key: "payments",
      label: "Paiements loyer",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("payment")}>
            Enregistrer paiement
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safePayments}
            loading={loading}
            columns={[
              { title: "Date", dataIndex: "paymentDate", render: (date) => moment(date).format("YYYY-MM-DD") },
              { title: "Bail", render: (_, record) => record.leaseReference || "-" },
              {
                title: "Locataire",
                render: (_, record) =>
                  [record.tenantFirstName, record.tenantLastName].filter(Boolean).join(" ") || "-",
              },
              { title: "Unité", render: (_, record) => record.unitName || "-" },
              { title: "Montant", dataIndex: "amount", render: money },
              {
                title: "Mode de paiement",
                render: (_, record) => paymentMethodLabels[record.method] || record.method || "-",
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "maintenance",
      label: "Maintenance",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("maintenance")}>
            Nouvelle tâche
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeMaintenance}
            loading={loading}
            columns={[
              { title: "Titre", dataIndex: "title" },
              { title: "Bien", render: (_, record) => record.property?.name || "-" },
              { title: "Unité", render: (_, record) => record.unit?.name || "-" },
              { title: "Priorité", dataIndex: "priority" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              { title: "Coût estimé", dataIndex: "estimatedCost", render: money },
              actionColumn("maintenance", deleteMaintenance),
            ]}
          />
        </div>
      ),
    },
    {
      key: "contracts",
      label: "Contrats",
      children: (
        <div className="pm-panel">
          <ContractsTab leases={safeLeases} />
        </div>
      ),
    },
  ];

  const renderProperties = () => (
    <>
      <div className="immo-filters">
        <div className="immo-filter-group">
          <span>Type :</span>
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={typeFilter === filter.value ? "active" : ""}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="immo-view-switch">
          <span>Vue :</span>
          {[
            { key: "grid", icon: <Grid3X3 size={15} /> },
            { key: "list", icon: <LayoutList size={15} /> },
            { key: "map", icon: <Map size={15} /> },
          ].map((view) => (
            <button
              key={view.key}
              type="button"
              className={viewMode === view.key ? "active" : ""}
              onClick={() => setViewMode(view.key)}
            >
              {view.icon}
            </button>
          ))}
        </div>
      </div>

      {filteredUnits.length ? (
        <div className={viewMode === "list" ? "immo-property-list" : "immo-property-grid"}>
          {filteredUnits.map((unit, index) => {
            const status = unit.activeLease ? "occupied" : unit.status || "vacant";
            const late = unit.activeLease?.status === "late" || unit.activeLease?.isOverdue;
            const cardTone =
              status === "maintenance"
                ? "maintenance"
                : late
                  ? "late"
                  : status === "occupied"
                    ? "occupied"
                    : "available";
            const tenantLabel = tenantNameFromLease(unit.activeLease);
            const hasTenant = unit.activeLease && tenantLabel !== "-";
            const overdueDays = unit.activeLease?.overdueDays;

            return (
              <article key={unit.id || index} className={`immo-property-card ${cardTone}`}>
                <div className="immo-property-media">
                  <span className={`immo-status-chip ${cardTone}`}>
                    {late ? "En retard" : statusLabel[status] || status}
                  </span>
                  <button type="button" className="immo-icon-button">
                    <MoreHorizontal size={16} />
                  </button>
                  <span className="immo-property-watermark">
                    {unitTypeIcon(unit.unitKind, 44)}
                  </span>
                  <div className="immo-property-code">
                    {unit.unitKindLabel} · {unit.name || unit.code || `U-${unit.id}`}
                  </div>
                </div>
                <div className="immo-property-body">
                  <h3>{unit.displayName}</h3>
                  <p>{unit.displayAddress}</p>
                  <div className="immo-property-meta">
                    <span><BedDouble size={14} />{unit.bedrooms ?? 0}</span>
                    <span><Bath size={14} />{unit.bathrooms ?? 0}</span>
                    <span>{unit.area ? `${unit.area}m²` : "-"}</span>
                  </div>
                  <div className="immo-property-footer">
                    {hasTenant ? (
                      <div className="immo-property-tenant">
                        <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                          {initials(tenantLabel)}
                        </span>
                        <div className="immo-property-tenant-text">
                          <span className="name">{tenantLabel}</span>
                          {late && (
                            <span className="late">
                              Retard {overdueDays ? `${overdueDays} jours` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : status === "vacant" || status === "available" ? (
                      <button
                        type="button"
                        className="immo-assign-button"
                        onClick={() => openModal("lease", { unitId: unit.id, propertyId: unit.propertyId })}
                      >
                        <UserPlus size={14} /> Assigner locataire
                      </button>
                    ) : (
                      <button type="button" onClick={() => openModal("unit", unit)}>
                        Modifier
                      </button>
                    )}
                    <div className="immo-property-rent">
                      <strong className={late ? "danger" : ""}>{shortMoney(unit.monthlyRent)}</strong>
                      <span>/mois</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Aucune propriété"
          text="Ajoutez une propriété ou ajustez la recherche pour afficher vos unités."
        />
      )}

      {recentRentPayments.length > 0 && (
        <section className="immo-recent-payments">
          <header>
            <div>
              <h3>Paiements de loyer récents</h3>
              <p>5 derniers encaissements et impayés</p>
            </div>
            <button type="button" className="immo-link" onClick={() => setActiveSection("payments")}>
              Voir tout <ChevronRight size={14} />
            </button>
          </header>
          <div className="immo-table-scroll">
            <table className="immo-recent-table">
              <thead>
                <tr>
                  <th>Locataire</th>
                  <th>Propriété</th>
                  <th>Période</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th className="right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {recentRentPayments.map((payment, index) => {
                  const tone = latePayments.includes(payment)
                    ? "danger"
                    : pendingPayments.includes(payment)
                      ? "warning"
                      : "success";
                  const label = tone === "success" ? "Payé" : tone === "warning" ? "En attente" : "En retard";
                  const tenantLabel =
                    [payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "-";
                  return (
                    <tr key={payment.id || index}>
                      <td>
                        <span className="person-cell">
                          <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                            {initials(tenantLabel)}
                          </span>
                          {tenantLabel}
                        </span>
                      </td>
                      <td>{payment.unitName || payment.leaseReference || "-"}</td>
                      <td>{payment.paymentDate ? moment(payment.paymentDate).format("MMMM YYYY") : "-"}</td>
                      <td className={tone === "danger" ? "danger" : ""}>
                        {payment.paymentDate ? moment(payment.paymentDate).format("DD MMM") : "-"}
                      </td>
                      <td>
                        <span className={`immo-pill ${tone}`}>{label}</span>
                      </td>
                      <td className={`right ${tone === "danger" ? "danger" : ""}`}>
                        {compactMoney(payment.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );

  const renderTenants = () => (
    <div className="immo-list-grid">
      <div className="immo-panel-head">
        <div>
          <h3>Locataires</h3>
          <p>Dossiers, contacts et baux liés</p>
        </div>
        <div className="immo-actions">
          <button type="button" onClick={() => openModal("onboardingGenerate")}>
            Lien d'inscription
          </button>
          <button type="button" className="primary" onClick={() => openModal("tenant")}>
            <Plus size={16} /> Nouveau locataire
          </button>
        </div>
      </div>
      {safeTenants.length ? (
        safeTenants.map((tenant) => {
          const leaseCount = safeLeases.filter((lease) => lease.tenantId === tenant.id).length;
          return (
            <article key={tenant.id} className="immo-row-card">
              <div className="immo-avatar"><UserRound size={18} /></div>
              <div>
                <h4>{tenantName(tenant)}</h4>
                <p>{tenant.email || tenant.phone || "Contact non renseigné"}</p>
              </div>
              <div className="immo-row-meta">
                <span>{leaseCount} bail{leaseCount > 1 ? "s" : ""}</span>
                <span>{tenant.address || "-"}</span>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState title="Aucun locataire" text="Créez un locataire ou générez un lien d'inscription." />
      )}
    </div>
  );

  const renderLeases = () => (
    <div className="immo-list-grid">
      <div className="immo-panel-head">
        <div>
          <h3>Baux et contrats</h3>
          <p>Créez un bail, puis générez le contrat pour signature.</p>
        </div>
        <button type="button" className="primary" onClick={() => openModal("lease")}>
          <Plus size={16} /> Nouveau bail
        </button>
      </div>
      {safeLeases.length ? (
        safeLeases.map((lease) => (
          <article key={lease.id} className="immo-row-card lease">
            <div className="immo-avatar brand"><FileText size={18} /></div>
            <div>
              <h4>{lease.reference || `Bail #${lease.id}`}</h4>
              <p>{lease.propertyAddress || lease.propertyName || "-"} · {lease.unitName || "-"}</p>
            </div>
            <div className="immo-row-meta">
              <span>{tenantNameFromLease(lease)}</span>
              <strong>{compactMoney(lease.rentAmount)}</strong>
            </div>
            <button type="button" onClick={() => openModal("lease", lease)}>
              Modifier
            </button>
          </article>
        ))
      ) : (
        <EmptyState title="Aucun bail" text="Créez un bail pour activer la génération de contrat." />
      )}
      <div className="immo-contract-box">
        <div className="immo-contract-copy">
          <FileSignature size={20} />
          <div>
            <h3>Générer le contrat de bail</h3>
            <p>Sélectionnez un bail, créez le contrat, puis envoyez-le au locataire pour signature.</p>
          </div>
        </div>
        <ContractsTab leases={safeLeases} />
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="immo-list-grid">
      <div className="immo-panel-head">
        <div>
          <h3>Paiements de loyer</h3>
          <p>Encaissements et suivi mensuel</p>
        </div>
        <button type="button" className="primary" onClick={() => openModal("payment")}>
          <Plus size={16} /> Enregistrer paiement
        </button>
      </div>
      {safePayments.length ? (
        safePayments.map((payment) => (
          <article key={payment.id} className="immo-row-card">
            <div className="immo-avatar green"><WalletCards size={18} /></div>
            <div>
              <h4>{compactMoney(payment.amount)}</h4>
              <p>{payment.leaseReference || "Paiement loyer"} · {paymentMethodLabels[payment.method] || payment.method || "-"}</p>
            </div>
            <div className="immo-row-meta">
              <span>{payment.paymentDate ? moment(payment.paymentDate).format("YYYY-MM-DD") : "-"}</span>
              <span>{[payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "-"}</span>
            </div>
          </article>
        ))
      ) : (
        <EmptyState title="Aucun paiement" text="Enregistrez un paiement de loyer pour suivre les encaissements." />
      )}
    </div>
  );

  const renderMaintenance = () => (
    <div className="immo-list-grid">
      <div className="immo-panel-head">
        <div>
          <h3>Maintenance</h3>
          <p>Demandes ouvertes, en cours et terminées</p>
        </div>
        <button type="button" className="primary" onClick={() => openModal("maintenance")}>
          <Plus size={16} /> Nouvelle tâche
        </button>
      </div>
      {safeMaintenance.length ? (
        safeMaintenance.map((request) => (
          <article key={request.id} className="immo-row-card maintenance">
            <div className="immo-avatar amber"><Wrench size={18} /></div>
            <div>
              <h4>{request.title}</h4>
              <p>{request.property?.name || request.propertyName || "-"} · {request.unit?.name || request.unitName || "-"}</p>
            </div>
            <div className="immo-row-meta">
              <span>{statusLabel[request.status] || request.status}</span>
              <strong>{compactMoney(request.estimatedCost)}</strong>
            </div>
            <button type="button" onClick={() => openModal("maintenance", request)}>
              Modifier
            </button>
          </article>
        ))
      ) : (
        <EmptyState title="Aucune maintenance" text="Les demandes de maintenance apparaîtront ici." />
      )}
    </div>
  );

  const renderTenantsMockup = () => (
    <div className="immo-tenant-grid">
      {safeTenants.length ? (
        safeTenants.map((tenant, index) => {
          const tenantLeases = safeLeases.filter((lease) => lease.tenantId === tenant.id);
          const activeLease = tenantLeases.find((lease) => lease.status === "active") || tenantLeases[0];
          const activeUnit = enrichedUnits.find((unit) => unit.id === activeLease?.unitId);
          const isLate = activeLease?.isOverdue || activeLease?.status === "late";
          const daysToEnd = activeLease?.endDate ? moment(activeLease.endDate).diff(moment(), "days") : null;
          const isCompany = tenant?.companyName || tenant?.isCompany;
          const tenancyYears = activeLease?.startDate ? Math.max(1, moment().diff(moment(activeLease.startDate), "years")) : 0;
          const badge = isLate
            ? { label: `En retard ${activeLease?.overdueDays ? `${activeLease.overdueDays}j` : ""}`.trim(), tone: "danger" }
            : daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 60
              ? { label: "Bail à renouveler", tone: "warning" }
              : isCompany
                ? { label: "Pro · Entreprise", tone: "brand" }
                : tenancyYears >= 3 || tenantLeases.length >= 2
                  ? { label: `VIP · ${tenancyYears || 3} ans`, tone: "success" }
                  : { label: `Standard · ${tenancyYears || 1} an`, tone: "neutral" };

          return (
            <article key={tenant.id} className={`immo-tenant-card ${isLate ? "late" : ""} ${openTenantMenu === tenant.id ? "menu-open" : ""}`}>
              <div className={`immo-letter-avatar ${avatarColors[index % avatarColors.length]}`}>
                {initials(tenantName(tenant))}
              </div>
              <span className="immo-card-menu-anchor immo-menu-anchor">
                <button
                  type="button"
                  className={`immo-card-menu${openTenantMenu === tenant.id ? " active" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenTenantMenu(openTenantMenu === tenant.id ? null : tenant.id);
                  }}
                  aria-label="Actions du locataire"
                  aria-expanded={openTenantMenu === tenant.id}
                >
                  <MoreHorizontal size={16} />
                </button>
                {openTenantMenu === tenant.id && renderTenantContextMenu(tenant)}
              </span>
              <div className="immo-tenant-main">
                <h3>{tenantName(tenant)}</h3>
                <p>{tenant.email || "email non renseigné"}</p>
                <p>{tenant.phone || "téléphone non renseigné"}</p>
                <span className={`immo-mini-badge ${badge.tone}`}>{badge.label}</span>
              </div>
              <div className="immo-tenant-divider" />
              <div className="immo-tenant-lease">
                <p>
                  {unitTypeIcon(activeUnit?.unitKind)}
                  {activeUnit?.displayName || activeLease?.propertyName || "-"}
                </p>
                <div>
                  <span className={isLate ? "danger" : ""}>
                    Loyer · échéance {activeLease?.nextInvoiceDate ? moment(activeLease.nextInvoiceDate).format("DD/MM") : "-"}
                  </span>
                  <strong className={isLate ? "danger" : ""}>{compactMoney(activeLease?.rentAmount || activeUnit?.monthlyRent)}</strong>
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyState title="Aucun locataire" text="Créez un locataire ou générez un lien d'inscription." />
      )}
    </div>
  );

  const renderLeasesMockup = () => {
    const missingContractCount = safeLeases.filter((lease) => !leaseContractFor(lease)).length;
    const renewLeases = safeLeases.filter((lease) => {
      if (!lease.endDate) return false;
      const daysLeft = moment(lease.endDate).diff(moment(), "days");
      return daysLeft >= 0 && daysLeft <= 60;
    });
    const expiredLeases = safeLeases.filter((lease) => lease.endDate && moment(lease.endDate).isBefore(moment()));

    return (
      <div className="immo-table-flow">
        {missingContractCount > 0 && (
          <div className="immo-alert-strip">
            <AlertTriangle size={19} />
            <div>
              <strong>{missingContractCount} baux sans contrat signé</strong>
              <p>Chaque bail doit être lié à un contrat généré et signé. Générez-les maintenant pour rester en conformité.</p>
            </div>
            <button type="button" onClick={generateMissingContracts}>
              <FileSignature size={15} /> Tout générer
            </button>
          </div>
        )}
        <div className="immo-table-toolbar">
          <div className="immo-filter-group">
            <button type="button" className="active">Tous <span>{safeLeases.length}</span></button>
            <button type="button">Actifs <span>{activeLeases.length}</span></button>
            <button type="button">À renouveler <span>{renewLeases.length}</span></button>
            <button type="button">Expirés <span>{expiredLeases.length}</span></button>
            <button type="button">Sans contrat <span>{missingContractCount}</span></button>
          </div>
          <div className="immo-lease-actions">
            <div className="immo-view-toggle" aria-label="Vue des baux">
              {[
                { key: "grid", label: "Grille", icon: <Grid3X3 size={15} /> },
                { key: "table", label: "Tableau", icon: <LayoutList size={15} /> },
                { key: "timeline", label: "Timeline", icon: <CalendarDays size={15} /> },
              ].map((view) => (
                <button
                  key={view.key}
                  type="button"
                  className={leaseView === view.key ? "active" : ""}
                  onClick={() => setLeaseView(view.key)}
                  title={`Vue ${view.label.toLowerCase()}`}
                >
                  {view.icon}
                  <span>{view.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="immo-primary-button" onClick={() => openModal("lease")}>
              <Plus size={16} /> Nouveau bail
            </button>
          </div>
        </div>
        {leaseView === "grid" && (
          <div className="immo-lease-grid">
            {safeLeases.map((lease, index) => {
              const contract = leaseContractFor(lease);
              const info = leaseDisplayInfo(lease, contract);
              const paymentNote =
                info.variant === "noContract"
                  ? "Retard 12 jours"
                  : info.variant === "pendingSignature"
                    ? `${info.elapsedMonths || 1} paiements OK`
                    : info.variant === "expired"
                      ? "Bail terminé"
                      : `${info.elapsedMonths || 1} paiements à jour`;

              return (
                <article
                  key={lease.id}
                  className={`immo-lease-card ${info.variant} ${openLeaseMenu === `card-${lease.id}` ? "menu-open" : ""}`}
                >
                  <div className="immo-lease-card-head">
                    <span className={`immo-pill ${info.statusTone}`}>{info.statusText}</span>
                    {info.variant === "noContract" ? (
                      <button type="button" className="immo-generate-button" onClick={() => openContractWorkflow(lease)}>
                        <FileSignature size={14} /> Générer
                      </button>
                    ) : (
                      <span className={`immo-contract-chip ${info.contractTone}`}>
                        {info.contractTone === "success" && <FileCheck size={14} />}
                        {info.contractTone === "warning" && <Clock size={14} />}
                        {info.contractTone === "muted" && <FileText size={14} />}
                        {info.contractLabel}
                      </span>
                    )}
                  </div>

                  <div className="immo-lease-person">
                    <span className={`immo-lease-avatar ${avatarColors[index % avatarColors.length]}`}>
                      {initials(tenantNameFromLease(lease))}
                    </span>
                    <div>
                      <strong>{tenantNameFromLease(lease)}</strong>
                      <span>{info.propertyLabel}</span>
                    </div>
                  </div>

                  {info.variant === "noContract" && (
                    <div className="immo-lease-warning">
                      <AlertTriangle size={15} />
                      <span><strong>Contrat manquant.</strong> Bail créé il y a {info.elapsedMonths || 1} mois sans contrat lié.</span>
                    </div>
                  )}

                  <div className="immo-lease-progress">
                    <div>
                      <span className="mono">{info.reference}</span>
                      <span>{info.years} ans · {info.elapsedMonths} mois écoulés</span>
                    </div>
                    <span className="immo-progress">
                      <span className={info.progressTone} style={{ width: `${info.progress}%` }} />
                    </span>
                    <div>
                      <span>{info.start ? info.start.format("DD/MM/YY") : "-"}</span>
                      <strong className={info.progressTone}>{info.progress}% écoulé</strong>
                      <span>{info.end ? info.end.format("DD/MM/YY") : "-"}</span>
                    </div>
                  </div>

                  <div className="immo-lease-card-foot">
                    <div>
                      <strong className={info.variant === "noContract" ? "danger" : ""}>{shortMoney(lease.rentAmount)}<span>/mois</span></strong>
                      <small className={info.variant === "noContract" ? "danger" : info.variant === "expired" ? "muted" : "success"}>
                        {info.variant === "noContract" && <CircleAlert size={13} />}
                        {info.variant === "pendingSignature" && <Check size={13} />}
                        {info.variant === "signed" && <Check size={13} />}
                        {paymentNote}
                      </small>
                    </div>
                    <span className="immo-menu-anchor immo-card-actions">
                      {contract && (
                        <button type="button" className="immo-flat-icon immo-card-action" onClick={() => handleLeaseMenuAction("contract", lease, contract)} title="Voir contrat">
                          <FileText size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={`immo-flat-icon immo-card-action immo-more-action ${openLeaseMenu === `card-${lease.id}` ? "active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenLeaseMenu(openLeaseMenu === `card-${lease.id}` ? null : `card-${lease.id}`);
                        }}
                        aria-label="Actions du bail"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openLeaseMenu === `card-${lease.id}` && renderLeaseContextMenu(lease, contract, info.statusText)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {leaseView === "table" && (
        <div className="immo-table-scroll">
          <div className="immo-data-table leases">
            <div className="immo-data-row head">
            <span>N° Bail</span>
            <span>Locataire</span>
            <span>Propriété</span>
            <span>Période</span>
            <span>Statut</span>
            <span>Contrat</span>
            <span>Loyer/mois</span>
            <span></span>
            </div>
            {safeLeases.map((lease, index) => {
            const contract = leaseContractFor(lease);
            const isExpired = lease.endDate && moment(lease.endDate).isBefore(moment());
            const daysLeft = lease.endDate ? moment(lease.endDate).diff(moment(), "days") : null;
            const statusTone = isExpired ? "danger" : daysLeft !== null && daysLeft <= 60 ? "warning" : "success";
            const statusText = isExpired ? "Expiré" : daysLeft !== null && daysLeft <= 60 ? `À renouveler ${daysLeft}j` : "Actif";

            return (
              <div key={lease.id} className="immo-data-row">
                <span className="mono">#{lease.reference || `BAIL-${lease.id}`}</span>
                <span className="person-cell">
                  <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>{initials(tenantNameFromLease(lease))}</span>
                  {tenantNameFromLease(lease)}
                </span>
                <span>{lease.propertyAddress || lease.propertyName || "-"} · {lease.unitName || "-"}</span>
                <span>{lease.startDate ? moment(lease.startDate).format("DD/MM/YY") : "-"} → {lease.endDate ? moment(lease.endDate).format("DD/MM/YY") : "-"}</span>
                <span><span className={`immo-pill ${statusTone}`}>{statusText}</span></span>
                <span>
                  {contract ? (
                    <span className={`immo-pill ${contract.status === "signed" ? "success" : "warning"}`}>
                      {contract.status === "signed" ? "Signé" : "Attente signature"}
                    </span>
                  ) : (
                    <button type="button" className="immo-generate-button" onClick={() => openContractWorkflow(lease)}>
                      <FileSignature size={14} /> Générer
                    </button>
                  )}
                </span>
                <strong>{compactMoney(lease.rentAmount)}</strong>
                <span className="immo-menu-anchor">
                  <button
                    type="button"
                    className={`immo-flat-icon ${openLeaseMenu === lease.id ? "active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenLeaseMenu(openLeaseMenu === lease.id ? null : lease.id);
                    }}
                    aria-label="Actions du bail"
                    aria-expanded={openLeaseMenu === lease.id}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openLeaseMenu === lease.id && renderLeaseContextMenu(lease, contract, statusText)}
                </span>
              </div>
            );
            })}
          </div>
        </div>
        )}

        {leaseView === "timeline" && (
          <div className="immo-lease-timeline">
            <div className="immo-timeline-inner">
              <div className="immo-timeline-years">
                <span>2024</span>
                <span>2025</span>
                <span>2026</span>
                <span>2027 →</span>
              </div>
              <div className="immo-today-marker">
                <span>Aujourd'hui</span>
              </div>
              <div className="immo-timeline-rows">
                {safeLeases.map((lease, index) => {
                  const contract = leaseContractFor(lease);
                  const info = leaseDisplayInfo(lease, contract);
                  const left = Math.min(70, Math.max(0, index * 7 + (info.start ? Math.max(0, info.start.year() - 2024) * 18 : 0)));
                  const width = Math.min(58, Math.max(24, info.progress > 80 ? 42 : 30 + info.progress / 3));
                  return (
                    <div key={lease.id} className="immo-timeline-row">
                      <div className="immo-timeline-label">
                        <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                          {initials(tenantNameFromLease(lease))}
                        </span>
                        <div>
                          <strong>{tenantNameFromLease(lease)}</strong>
                          <small className={info.variant === "noContract" ? "danger" : info.statusTone}>
                            {info.variant === "noContract" ? "Sans contrat" : info.statusText}
                          </small>
                        </div>
                      </div>
                      <div className="immo-timeline-track">
                        <span className="immo-timeline-now" />
                        <button
                          type="button"
                          className={`immo-timeline-bar ${info.variant}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          onClick={() => setOpenLeaseMenu(openLeaseMenu === `timeline-${lease.id}` ? null : `timeline-${lease.id}`)}
                        >
                          {shortMoney(lease.rentAmount)} · {info.contractLabel}
                        </button>
                        {openLeaseMenu === `timeline-${lease.id}` && (
                          <span className="immo-timeline-menu">
                            {renderLeaseContextMenu(lease, contract, info.statusText)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentsMockup = () => {
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(safePayments.length / pageSize));
    const currentPage = Math.min(paymentsPage, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const pageItems = safePayments.slice(pageStart, pageStart + pageSize);
    const pageNumbers = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) pageNumbers.push("…");
      const around = [currentPage - 1, currentPage, currentPage + 1].filter((n) => n > 1 && n < totalPages);
      pageNumbers.push(...around);
      if (currentPage < totalPages - 2) pageNumbers.push("…");
      pageNumbers.push(totalPages);
    }

    return (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Encaissé ce mois</span><strong className="green">{compactMoney(paidAmount)}</strong></div>
        <div><span>En attente</span><strong className="amber">{compactMoney(pendingAmount)}</strong></div>
        <div><span>En retard</span><strong className="red">{compactMoney(lateAmount)}</strong></div>
        <div><span>Total prévu</span><strong>{compactMoney(plannedAmount)}</strong></div>
      </div>
      <div className="immo-table-toolbar">
        <div className="immo-filter-group">
          <button type="button" className="active">Tous <span>{safePayments.length}</span></button>
          <button type="button">Payés <span>{paidPayments.length}</span></button>
          <button type="button">En attente <span>{pendingPayments.length}</span></button>
          <button type="button">En retard <span>{latePayments.length}</span></button>
        </div>
        <button type="button" className="immo-primary-button" onClick={() => openModal("payment")}>
          <Plus size={16} /> Enregistrer paiement
        </button>
      </div>
      <div className="immo-table-scroll">
        <div className="immo-data-table payments">
          <div className="immo-data-row head">
          <span>N° Quittance</span>
          <span>Locataire</span>
          <span>Propriété</span>
          <span>Période</span>
          <span>Échéance</span>
          <span>Méthode</span>
          <span>Statut</span>
          <span>Montant</span>
          </div>
          {pageItems.map((payment, index) => {
          const paymentStatus = latePayments.includes(payment) ? "danger" : pendingPayments.includes(payment) ? "warning" : "success";
          const isPaid = paymentStatus === "success";
          const tenantLabel = [payment.tenantFirstName, payment.tenantLastName].filter(Boolean).join(" ") || "-";
          return (
            <div key={payment.id} className="immo-data-row">
              <span className="mono">#QUIT-{payment.id}</span>
              <span className="person-cell">
                <span className={`mini-avatar ${avatarColors[(pageStart + index) % avatarColors.length]}`}>
                  {initials(tenantLabel)}
                </span>
                {tenantLabel}
              </span>
              <span>{payment.unitName || payment.leaseReference || "-"}</span>
              <span>{payment.paymentDate ? moment(payment.paymentDate).format("MMMM YYYY") : "-"}</span>
              <span className={paymentStatus === "danger" ? "red-text" : ""}>
                {payment.paymentDate ? moment(payment.paymentDate).format("DD MMM") : "-"}
              </span>
              <span>
                {isPaid && payment.method ? (
                  <span className="method-chip">{paymentMethodLabels[payment.method] || payment.method}</span>
                ) : (
                  <span className="immo-empty-cell">—</span>
                )}
              </span>
              <span><span className={`immo-pill ${paymentStatus}`}>{paymentStatus === "success" ? "Payé" : paymentStatus === "warning" ? "En attente" : "En retard"}</span></span>
              <strong className={paymentStatus === "danger" ? "red-text" : ""}>{compactMoney(payment.amount)}</strong>
            </div>
          );
          })}
        </div>
        {totalPages > 1 && (
          <div className="immo-pagination">
            <span className="immo-pagination-count">
              {pageStart + 1}–{Math.min(pageStart + pageSize, safePayments.length)} sur {safePayments.length}
            </span>
            <div className="immo-pagination-pages">
              <button
                type="button"
                className="immo-pagination-arrow"
                onClick={() => setPaymentsPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((entry, idx) =>
                entry === "…" ? (
                  <span key={`ellipsis-${idx}`} className="immo-pagination-ellipsis">…</span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className={entry === currentPage ? "active" : ""}
                    onClick={() => setPaymentsPage(entry)}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                className="immo-pagination-arrow"
                onClick={() => setPaymentsPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderMaintenanceMockup = () => (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Tickets ouverts</span><strong className="red">{openMaintenance.length}</strong></div>
        <div><span>En cours</span><strong className="amber">{inProgressMaintenance.length}</strong></div>
        <div><span>Résolus ce mois</span><strong className="green">{resolvedMaintenance.length}</strong></div>
        <div><span>Coût total</span><strong>{compactMoney(maintenanceCost)}</strong></div>
      </div>
      <div className="immo-table-toolbar">
        <div className="immo-filter-group">
          <button type="button" className="active">Tous <span>{safeMaintenance.length}</span></button>
          <button type="button">Urgent <span>{urgentMaintenance.length}</span></button>
          <button type="button">En cours <span>{inProgressMaintenance.length}</span></button>
          <button type="button">Résolus <span>{resolvedMaintenance.length}</span></button>
        </div>
        <button type="button" className="immo-primary-button" onClick={() => openModal("maintenance")}>
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>
      <div className="immo-ticket-list">
        {safeMaintenance.map((request, index) => {
          const urgent = ["urgent", "high"].includes(request.priority);
          const done = request.status === "done";
          const iconTone = ticketIconTone(request);
          const assignee = request.assignee || request.assignedTo || request.technicianName;
          const statusKey = done ? "success" : request.status === "in_progress" ? "warning" : "danger";
          const statusText = done
            ? "Résolu"
            : request.status === "in_progress"
              ? "En cours"
              : "Ouvert";
          const priorityText = urgent
            ? "Urgent"
            : request.priority === "low"
              ? "Bas"
              : "Moyen";
          const priorityTone = urgent ? "danger" : request.priority === "low" ? "neutral" : "warning";

          return (
            <article key={request.id} className={`immo-ticket-card ${urgent ? "urgent" : ""} ${done ? "done" : ""}`}>
              <div className={`immo-ticket-icon ${iconTone}`}>
                {ticketIconFor(request, 20)}
              </div>
              <div className="immo-ticket-copy">
                <h3>{request.title}</h3>
                <p>{request.description || "Aucune description renseignée."}</p>
                <div>
                  <span><Building2 size={14} /> {request.property?.name || request.propertyName || "-"}</span>
                  <span><UserRound size={14} /> Reporté par {request.tenantName || request.reportedBy || "-"}</span>
                  <span>
                    {done ? <Check size={14} /> : <CalendarDays size={14} />}
                    {done
                      ? `Résolu ${request.resolvedAt ? moment(request.resolvedAt).fromNow() : ""}`.trim()
                      : request.scheduledDate
                        ? moment(request.scheduledDate).fromNow()
                        : "-"}
                  </span>
                </div>
              </div>
              <div className="immo-ticket-side">
                <span className={`immo-pill ${priorityTone}`}>{priorityText}</span>
                <span className="immo-ticket-assignee">
                  <span className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}>
                    {assignee ? initials(assignee) : "?"}
                  </span>
                  {assignee || "Non assigné"}
                </span>
                <span className={`immo-pill ${statusKey}`}>{statusText}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderActivePanel = () => {
    const panels = {
      properties: renderProperties,
      tenants: renderTenantsMockup,
      leases: renderLeasesMockup,
      payments: renderPaymentsMockup,
      maintenance: renderMaintenanceMockup,
    };
    return (panels[activeSection] || renderProperties)();
  };

  const renderContractWorkflowModal = () => {
    if (!contractModal?.lease) return null;

    const lease = contractModal.lease;
    const contract = contractModal.contract || getLeaseContract(lease);
    const info = leaseDisplayInfo(lease, contract);
    const tenant = safeTenants.find((item) => item.id === lease.tenantId || item.id === lease.tenant?.id);
    const tenantEmail = lease.tenantEmail || lease.tenant?.email || contract?.tenantEmail || tenant?.email || "Email non renseigné";
    const tenantPhone = lease.tenantPhone || lease.tenant?.phone || tenant?.phone || "Téléphone non renseigné";
    const rent = Number(lease.rentAmount || lease.monthlyRent || 0);
    const deposit = Number(lease.securityDeposit || rent * 2 || 0);
    const durationLabel = `${info.years} ans · ${info.start ? info.start.format("DD/MM/YYYY") : "-"} → ${info.end ? info.end.format("DD/MM/YYYY") : "-"}`;
    const templateIconFor = (type) => {
      if (type === "commercial") return <Briefcase size={18} />;
      if (type === "short_term") return <CalendarClock size={18} />;
      return <FileText size={18} />;
    };
    const safeTemplates = (contractTemplates || []).filter(Boolean);
    const templates = safeTemplates.length
      ? safeTemplates.map((tpl) => ({
          key: tpl.id,
          label: tpl.name,
          description: tpl.description || (tpl.isActive ? "Modèle actif" : "Modèle disponible"),
          icon: templateIconFor(tpl.type),
          isActive: tpl.isActive,
          type: tpl.type,
        }))
      : [
          { key: "standard", label: "Aucun modèle configuré", description: "Le contrat sera généré avec le modèle par défaut. Configurez vos modèles depuis la page dédiée.", icon: <FileText size={18} /> },
        ];
    const clauses = [
      { key: "inventory", label: "État des lieux annexé", description: "Inventaire de la propriété joint au contrat" },
      { key: "guarantor", label: "Caution solidaire", description: "Garant + pièce d'identité requis" },
      { key: "pets", label: "Animaux autorisés", description: "Mention dans l'article 9" },
      { key: "rentReview", label: "Révision annuelle du loyer", description: "Indexation sur indice BCC" },
    ];

    return (
      <div className="immo-contract-modal" role="dialog" aria-modal="true" aria-labelledby="lease-contract-title">
        <button type="button" className="immo-contract-backdrop" onClick={closeContractWorkflow} aria-label="Fermer" />
        <section className="immo-contract-dialog">
          <header className="immo-contract-header">
            <div className="immo-contract-title">
              <span><FileText size={22} /></span>
              <div>
                <h2 id="lease-contract-title">Générer le contrat de bail</h2>
                <p>{info.reference}</p>
              </div>
            </div>
            <button type="button" className="immo-contract-close" onClick={closeContractWorkflow} aria-label="Fermer">
              <X size={22} />
            </button>
          </header>

          <div className="immo-contract-steps" aria-label="Progression contrat">
            {["Aperçu", "Envoi", "Signature"].map((step, index) => (
              <div key={step} className={index === 0 ? "active" : ""}>
                <span>{index + 1}</span>
                {step}
              </div>
            ))}
          </div>

          <div className="immo-contract-body">
            <section>
              <h3>Informations du bail</h3>
              <div className="immo-contract-summary">
                <div><span>Locataire</span><strong>{tenantNameFromLease(lease)}</strong></div>
                <div><span>Propriété</span><strong>{info.propertyLabel}</strong></div>
                <div><span>Durée</span><strong>{durationLabel}</strong></div>
                <div><span>Loyer mensuel</span><strong>{compactMoney(rent)}</strong></div>
                <div><span>Caution (2 mois)</span><strong>{compactMoney(deposit)}</strong></div>
              </div>
            </section>

            <section>
              <h3>Modèle de contrat</h3>
              <div className="immo-contract-template-grid">
                {templates.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    className={contractTemplate === template.key ? "active" : ""}
                    onClick={() => setContractTemplate(template.key)}
                  >
                    <span>{template.icon}</span>
                    <div>
                      <strong>{template.label}</strong>
                      <small>{template.description}</small>
                    </div>
                    {contractTemplate === template.key && <Check size={16} />}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>Clauses additionnelles</h3>
              <div className="immo-contract-clauses">
                {clauses.map((clause) => (
                  <label key={clause.key} className="immo-contract-clause">
                    <input
                      type="checkbox"
                      checked={Boolean(contractClauses[clause.key])}
                      onChange={(event) =>
                        setContractClauses((prev) => ({ ...prev, [clause.key]: event.target.checked }))
                      }
                    />
                    <span>
                      <strong>{clause.label}</strong>
                      <small>{clause.description}</small>
                    </span>
                  </label>
                ))}
                <button type="button" className="immo-add-clause">
                  <Plus size={16} /> Ajouter une clause personnalisée
                </button>
              </div>
            </section>

            <section>
              <h3>Envoi au locataire pour signature</h3>
              <div className="immo-send-grid">
                <label className="active">
                  <input type="radio" name="contract-send-method" defaultChecked />
                  <Mail size={17} />
                  <strong>Email</strong>
                  <span>{tenantEmail}</span>
                </label>
                <label>
                  <input type="radio" name="contract-send-method" />
                  <MessageSquare size={17} />
                  <strong>SMS / WhatsApp</strong>
                  <span>{tenantPhone}</span>
                </label>
              </div>
            </section>

            <div className="immo-contract-secure">
              <ShieldCheck size={18} />
              <p>
                <strong>Signature électronique sécurisée.</strong> Le locataire recevra un lien unique pour consulter et signer. Le contrat signé sera archivé automatiquement.
              </p>
            </div>
          </div>

          <footer className="immo-contract-footer">
            <button type="button" onClick={closeContractWorkflow}>Annuler</button>
            <div>
              <button type="button" className="secondary" onClick={() => openContractPreview(lease, contract)} disabled={contractBusy}>
                <Eye size={17} /> Aperçu PDF
              </button>
              <button type="button" className="primary" onClick={generateAndSendContract} disabled={contractBusy}>
                <Send size={17} /> {contractBusy ? "Génération..." : "Générer & envoyer"}
              </button>
            </div>
          </footer>
        </section>
      </div>
    );
  };

  const renderSectionActions = () => {
    const actions = {
      properties: (
        <button type="button" className="immo-primary-button" onClick={() => openModal("property")}>
          <Plus size={18} /> Nouvelle propriété
        </button>
      ),
      tenants: (
        <>
          <button type="button" className="immo-filter-button" onClick={() => openModal("onboardingGenerate")}>
            <UserRound size={17} /> Lien d'inscription
          </button>
          <button type="button" className="immo-primary-button" onClick={() => openModal("tenant")}>
            <Plus size={18} /> Nouveau locataire
          </button>
        </>
      ),
      leases: (
        <button type="button" className="immo-primary-button" onClick={() => openModal("lease")}>
          <Plus size={18} /> Nouveau bail
        </button>
      ),
      payments: (
        <button type="button" className="immo-primary-button" onClick={() => openModal("payment")}>
          <Plus size={18} /> Enregistrer paiement
        </button>
      ),
      maintenance: (
        <button type="button" className="immo-primary-button" onClick={() => openModal("maintenance")}>
          <Plus size={18} /> Nouveau ticket
        </button>
      ),
    };

    return actions[activeSection] || actions.properties;
  };

  return (
    <div className="property-management-page immo-page">
      <UserPrivateComponent permission={"readAll-propertyManagement"}>
        <div className="immo-header">
          <div>
            <h1>Immobilier</h1>
            <p>Propriétés, baux, locataires et paiements de loyer</p>
          </div>
          <div className="immo-header-actions">
            <label className="immo-search">
              <Search size={17} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher adresse, locataire..."
              />
            </label>
            <button type="button" className="immo-filter-button">
              <SlidersHorizontal size={17} /> Filtres
            </button>
            <Link to="/admin/property-management/contract-templates" className="immo-filter-button">
              <FileSignature size={17} /> Modèles de contrat
            </Link>
            {renderSectionActions()}
          </div>
        </div>

        <div className="immo-metrics-grid">
          <MetricCard
            icon={<Building2 size={20} />}
            label="Propriétés"
            value={enrichedUnits.length || safeProperties.length}
            helper={`${occupiedUnits.length} louées · ${vacantUnits.length} vacantes · ${maintenanceUnits.length} maintenance`}
            trend={{ label: "↑ 2" }}
          />
          <MetricCard
            icon={<Users size={20} />}
            label="Taux d'occupation"
            value={`${occupiedUnits.length}/${enrichedUnits.length || 0}`}
            helper={<span className="immo-progress"><span style={{ width: `${occupancyRate}%` }} /></span>}
            tone="green"
            trend={{ label: `${occupancyRate}%` }}
          />
          <MetricCard
            icon={<CreditCard size={20} />}
            label="Loyers du mois"
            value={compactMoney(monthlyRent)}
            helper={`${safePayments.length} reçus · ${Math.max(activeLeases.length - safePayments.length, 0)} en attente`}
            tone="amber"
            trend={{ label: "↑ 8.2%" }}
          />
          <MetricCard
            icon={<AlertTriangle size={20} />}
            label="Loyers en retard"
            value={overduePayments.length}
            helper={`${compactMoney(overduePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0))} à recouvrer`}
            tone="red"
            trend={{ label: `↑ ${overduePayments.length}`, tone: "danger" }}
          />
        </div>

        <div className="immo-tabs" role="tablist" aria-label="Sections immobilier">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeSection === tab.key ? "active" : ""}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
              <span className={tab.danger ? "danger" : ""}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="immo-panel">{renderActivePanel()}</div>
      </UserPrivateComponent>

      {renderContractWorkflowModal()}

      <Modal
        open={Boolean(modal)}
        title={modalTitle}
        onCancel={closeModal}
        footer={null}
        width={["tenant", "onboardingEdit"].includes(modal?.type) ? 920 : 720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitModal}>
          {modal?.type === "onboardingGenerate" && (
            <>
              <Form.Item label="Téléphone du futur locataire" name="phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Validité du lien (jours)" name="expiresInDays" initialValue={7}>
                <InputNumber className="w-full" min={1} max={30} />
              </Form.Item>
            </>
          )}

          {modal?.type === "property" && (
            <div className="immo-property-form">
              {/* ─── Section: Informations générales ─── */}
              <div className="immo-form-section">
                <h3 className="immo-form-section-title"><Info size={14} /> Informations générales</h3>
                <Form.Item label={<>Nom <span className="immo-required">*</span></>} name="name" rules={[{ required: true, message: "Le nom est requis" }]}>
                  <Input placeholder="ex. Résidence Tombalbaye" />
                </Form.Item>
                <div className="pm-form-grid">
                  <Form.Item label="Code interne" name="code">
                    <Input disabled placeholder="Auto-généré" />
                  </Form.Item>
                  <Form.Item label={<>Type de bien <span className="immo-required">*</span></>} name="propertyType" initialValue="building" rules={[{ required: true }]}>
                    <Select options={propertyTypes} popupClassName="immo-select-popup" getPopupContainer={() => document.body} />
                  </Form.Item>
                </div>
                <Form.Item label="Statut initial" name="status" initialValue="available">
                  <Radio.Group className="immo-radio-cards">
                    <Radio value="available"   className="immo-radio-card">Disponible</Radio>
                    <Radio value="occupied"    className="immo-radio-card">Occupé</Radio>
                    <Radio value="maintenance" className="immo-radio-card">Maintenance</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>

              {/* ─── Section: Localisation ─── */}
              <div className="immo-form-section">
                <h3 className="immo-form-section-title"><MapPin size={14} /> Localisation</h3>
                <Form.Item label="Adresse" name="address">
                  <Input placeholder="ex. 15 Av. Tombalbaye" />
                </Form.Item>
                <div className="pm-form-grid">
                  <Form.Item label="Ville" name="city" initialValue="Kinshasa">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Pays" name="country" initialValue="RDC">
                    <Input />
                  </Form.Item>
                </div>
              </div>

              {/* ─── Section: Caractéristiques ─── */}
              <div className="immo-form-section">
                <h3 className="immo-form-section-title"><Layers size={14} /> Caractéristiques</h3>
                <div className="pm-form-grid">
                  <Form.Item label="Nombre d'étages" name="floors" initialValue={1}>
                    <InputNumber className="w-full" min={0} />
                  </Form.Item>
                  <Form.Item label="Places de parking" name="parkingSpaces" initialValue={0}>
                    <InputNumber className="w-full" min={0} />
                  </Form.Item>
                </div>
                <Form.Item label="Description" name="description">
                  <Input.TextArea rows={2} placeholder="Notes, équipements, particularités du bien..." />
                </Form.Item>
              </div>

              {/* ─── Section: Informations financières ─── */}
              <div className="immo-form-section">
                <h3 className="immo-form-section-title"><Wallet size={14} /> Informations financières</h3>
                <div className="pm-form-grid">
                  <Form.Item label="Valeur marchande estimée" name="marketValue" extra="Pour analyse de patrimoine">
                    <InputNumber className="w-full immo-cdf-field" min={0} placeholder="ex. 480 000 000" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                  </Form.Item>
                  <Form.Item label="Loyer mensuel par défaut" name="defaultRent" extra="Hérité par défaut sur chaque unité créée">
                    <InputNumber className="w-full immo-cdf-field" min={0} placeholder="ex. 850 000" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                  </Form.Item>
                </div>
              </div>

              {/* ─── Section: Ajouter des unités maintenant (toggle) ─── */}
              <Form.Item name="addUnitsNow" valuePropName="checked" noStyle initialValue={false}>
                <Checkbox className="immo-units-toggle">
                  <div>
                    <strong><Grid3X3 size={14} /> Ajouter des unités maintenant</strong>
                    <p>Définissez les appartements/locaux du bien. Vous pourrez aussi le faire plus tard.</p>
                  </div>
                </Checkbox>
              </Form.Item>

              {addUnitsNow && (
                <Form.List name="units">
                  {(fields, { add, remove }) => (
                    <div className="immo-units-list">
                      {fields.map((field, index) => (
                        <div key={field.key} className="immo-unit-card">
                          <div className="immo-unit-card-head">
                            <div className="immo-unit-card-title">
                              <span className="immo-unit-card-number">{index + 1}</span>
                              <span>Unité {index + 1}</span>
                            </div>
                            <button
                              type="button"
                              className="immo-unit-card-remove"
                              onClick={() => remove(field.name)}
                              aria-label="Supprimer cette unité"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="immo-unit-card-grid">
                            <Form.Item label={<>Nom <span className="immo-required">*</span></>} name={[field.name, "name"]} rules={[{ required: true }]}>
                              <Input placeholder="ex. A-203" size="small" />
                            </Form.Item>
                            <Form.Item label="Type" name={[field.name, "unitType"]} initialValue="apartment">
                              <Select size="small" options={unitTypes} popupClassName="immo-select-popup" getPopupContainer={() => document.body} />
                            </Form.Item>
                            <Form.Item label="Étage" name={[field.name, "floor"]}>
                              <Input placeholder="ex. 2 ou RDC" size="small" />
                            </Form.Item>
                            <Form.Item label="Surface (m²)" name={[field.name, "area"]}>
                              <InputNumber className="w-full" min={0} placeholder="120" size="small" controls={false} />
                            </Form.Item>
                            <Form.Item label="Chambres" name={[field.name, "bedrooms"]} initialValue={0}>
                              <InputNumber className="w-full" min={0} size="small" controls={false} />
                            </Form.Item>
                            <Form.Item label="Salles de bain" name={[field.name, "bathrooms"]} initialValue={0}>
                              <InputNumber className="w-full" min={0} size="small" controls={false} />
                            </Form.Item>
                          </div>
                          <div className="immo-unit-card-grid">
                            <Form.Item label="Loyer mensuel" name={[field.name, "monthlyRent"]}>
                              <InputNumber className="w-full immo-cdf-field" min={0} placeholder="850 000" size="small" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                            </Form.Item>
                            <Form.Item label="Caution (2× loyer suggéré)" name={[field.name, "securityDeposit"]}>
                              <InputNumber className="w-full immo-cdf-field" min={0} placeholder="1 700 000" size="small" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                            </Form.Item>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="immo-unit-add"
                        onClick={() => add({ unitType: "apartment", bedrooms: 0, bathrooms: 0 })}
                      >
                        <Plus size={16} /> Ajouter une unité
                      </button>
                    </div>
                  )}
                </Form.List>
              )}

              {/* ─── Info note ─── */}
              <div className="immo-form-info-note">
                <Info size={14} />
                <span>
                  <strong>Le code interne est généré automatiquement</strong> après création
                  (format <code>PROP-YYYY-NNN</code>). Vous pourrez ajouter photo et documents
                  juridiques (titre de propriété, plan cadastral) après la création.
                </span>
              </div>
            </div>
          )}

          {modal?.type === "unit" && (
            <>
              <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                <Select options={propertyOptions} />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Nom unité" name="name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Type unité" name="unitType" initialValue="apartment">
                  <Select options={unitTypes} />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="vacant">
                  <Select options={[
                    { label: "Vacant", value: "vacant" },
                    { label: "Occupé", value: "occupied" },
                    { label: "Réservé", value: "reserved" },
                    { label: "Maintenance", value: "maintenance" },
                  ]} />
                </Form.Item>
                <Form.Item label="Étage" name="floor">
                  <Input />
                </Form.Item>
                <Form.Item label="Chambres" name="bedrooms">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Salles de bain" name="bathrooms">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Surface" name="area">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Loyer mensuel" name="monthlyRent">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <Form.Item label="Dépôt de garantie" name="securityDeposit">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </>
          )}

          {modal?.type === "lease" && (
            <>
              <div className="pm-form-grid">
                <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                  <Select options={propertyOptions} onChange={handleLeasePropertyChange} />
                </Form.Item>
                <Form.Item label="Unité" name="unitId" rules={[{ required: true }]}>
                  <Select options={leaseUnitOptions} disabled={!selectedProperty} />
                </Form.Item>
                <Form.Item label="Locataire" name="tenantId" rules={[{ required: true }]}>
                  <Select
                    options={safeTenants.map((customer) => ({
                      label: tenantName(customer),
                      value: customer.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="active">
                  <Select options={[
                    { label: "Brouillon", value: "draft" },
                    { label: "Actif", value: "active" },
                    { label: "Terminé", value: "ended" },
                    { label: "Annulé", value: "cancelled" },
                  ]} />
                </Form.Item>
                <Form.Item label="Début" name="startDate" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Fin" name="endDate">
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Prochaine facture" name="nextInvoiceDate">
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Cycle" name="billingCycle" initialValue="monthly">
                  <Select options={[
                    { label: "Mensuel", value: "monthly" },
                    { label: "Trimestriel", value: "quarterly" },
                    { label: "Annuel", value: "yearly" },
                  ]} />
                </Form.Item>
                <Form.Item label="Loyer" name="rentAmount" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Dépôt" name="securityDeposit">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <Form.Item label="Relevé compteur entrée" name="moveInMeterReading">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item label="Conditions / clauses" name="terms">
                <Input.TextArea rows={4} />
              </Form.Item>
            </>
          )}

          {["tenant", "onboardingEdit"].includes(modal?.type) && (
            <>
              <div className="pm-section-title">Identité</div>
              <div className="pm-form-grid">
                <Form.Item label="Prénom" name="firstName" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nom" name="lastName" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Email" name="email">
                  <Input type="email" />
                </Form.Item>
                <Form.Item label="Téléphone" name="phone" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>
              <Form.Item label="Adresse actuelle" name="address" rules={tenantRequiredRules}>
                <Input />
              </Form.Item>

              <div className="pm-section-title">Profil Personnel & Civil</div>
              <div className="pm-form-grid">
                <Form.Item label="Date de naissance" name="birth_date" rules={tenantRequiredRules}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Sexe" name="sex" rules={tenantRequiredRules}>
                  <Select options={[{ label: "M", value: "M" }, { label: "F", value: "F" }]} />
                </Form.Item>
                <Form.Item label="Nationalité" name="nationality" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="État civil" name="marital_status" rules={tenantRequiredRules}>
                  <Select options={maritalStatuses} />
                </Form.Item>
                <Form.Item label="Province d'origine" name="origin_province" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>

              {isCouple && (
                <div className="pm-form-grid">
                  <Form.Item label="Nom du partenaire" name="partenair_name" rules={tenantRequiredRules}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Téléphone du partenaire" name="partenair_number" rules={tenantRequiredRules}>
                    <Input />
                  </Form.Item>
                </div>
              )}

              <div className="pm-section-title">Contact d'Urgence</div>
              <div className="pm-form-grid">
                <Form.Item label="Téléphone secondaire" name="phone2">
                  <Input />
                </Form.Item>
                <Form.Item label="Personne à contacter" name="contacted_person" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Téléphone personne à contacter" name="contacted_person_phone_number" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>

              <div className="pm-section-title">Situation Professionnelle & Revenus</div>
              <div className="pm-form-grid">
                <Form.Item label="Statut professionnel" name="prossional_status" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Activité principale" name="main_activity" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nom de l'entité" name="entity_name" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Adresse de l'entité" name="entity_address" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Date d'embauche" name="hiring_date" rules={tenantRequiredRules}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Type de contrat" name="contract_type" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Salaire mensuel" name="monthly_pay" rules={tenantRequiredRules}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>

              <div className="pm-section-title">Historique & Ménage</div>
              <div className="pm-form-grid">
                <Form.Item label="Ancienne adresse" name="old_address" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Ancien bailleur" name="old_lessor" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Motif du déménagement" name="moving_reason" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nombre d'occupants" name="occupant_number" rules={tenantRequiredRules}>
                  <InputNumber className="w-full" min={1} />
                </Form.Item>
                <Form.Item label="Nombre d'enfants" name="child_number" initialValue={0}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>

              {childNumber > 0 && (
                <div className="pm-form-grid">
                  {Array.from({ length: childNumber }).map((_, index) => (
                    <Form.Item
                      key={index}
                      label={`Âge enfant ${index + 1}`}
                      name={["child_age", index]}
                      rules={tenantRequiredRules}
                    >
                      <InputNumber className="w-full" min={0} />
                    </Form.Item>
                  ))}
                </div>
              )}
            </>
          )}

          {modal?.type === "payment" && (
            <>
              <Form.Item label="Bail" name="leaseId" rules={[{ required: true }]}>
                <Select options={leaseOptions} />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Date paiement" name="paymentDate" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Montant" name="amount" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Méthode" name="method" initialValue="cash">
                  <Select options={[
                    { label: "Cash", value: "cash" },
                    { label: "Bank", value: "bank" },
                    { label: "Mobile money", value: "mobile_money" },
                    { label: "Cheque", value: "cheque" },
                  ]} />
                </Form.Item>
                <Form.Item label="Compte paiement" name="paymentAccountId">
                  <Select
                    placeholder="Par défaut: compte du type Rent Payment"
                    allowClear
                    options={cashBankAccounts.map((account) => ({
                      label: account.name,
                      value: account.id,
                    }))}
                  />
                </Form.Item>
              </div>
              <Form.Item label="Référence" name="reference">
                <Input />
              </Form.Item>
              <Form.Item label="Notes" name="notes" initialValue="Payment for rent">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}

          {modal?.type === "maintenance" && (
            <>
              <Form.Item label="Titre" name="title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                  <Select options={propertyOptions} />
                </Form.Item>
                <Form.Item label="Unité" name="unitId">
                  <Select allowClear options={unitOptions} />
                </Form.Item>
                <Form.Item label="Priorité" name="priority" initialValue="medium">
                  <Select options={[
                    { label: "Basse", value: "low" },
                    { label: "Moyenne", value: "medium" },
                    { label: "Haute", value: "high" },
                    { label: "Urgente", value: "urgent" },
                  ]} />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="open">
                  <Select options={[
                    { label: "Ouvert", value: "open" },
                    { label: "En cours", value: "in_progress" },
                    { label: "Terminé", value: "done" },
                  ]} />
                </Form.Item>
                <Form.Item label="Date prévue" name="scheduledDate">
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Coût estimé" name="estimatedCost">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <Form.Item label="Description" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}

          <div className="immo-modal-footer">
            <Button onClick={closeModal} className="immo-modal-cancel">Annuler</Button>
            <div className="immo-modal-footer-right">
              {modal?.type === "property" && (
                <Button
                  className="immo-modal-draft"
                  icon={<Save size={14} />}
                  onClick={() => {
                    form.setFieldsValue({ _draft: true });
                    form.submit();
                  }}
                >
                  Brouillon
                </Button>
              )}
              <Button type="primary" htmlType="submit" className="immo-modal-submit" icon={modal?.type === "property" ? <Check size={14} /> : null}>
                {modal?.type === "property"
                  ? (modal?.record ? "Mettre à jour la propriété" : "Créer la propriété")
                  : (modal?.record ? "Enregistrer" : "Créer")}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(renewModal)}
        title={renewModal ? `Renouveler — ${tenantNameFromLease(renewModal.lease)}` : "Renouveler"}
        onCancel={closeRenewModal}
        footer={null}
        width={620}
        destroyOnClose
      >
        {renewModal && (
          <>
            <p style={{ color: "#52525b", marginTop: -8 }}>
              Un nouveau bail est créé en reprenant les informations du bail courant.
              Un nouveau contrat sera généré avec le modèle sélectionné — l'ancien contrat reste figé.
            </p>
            <Form form={renewForm} layout="vertical" onFinish={submitRenewLease}>
              <div className="pm-form-grid">
                <Form.Item label="Date de début" name="startDate" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Date de fin" name="endDate" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Loyer mensuel" name="rentAmount" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Modèle de contrat" name="templateId">
                  <Select
                    allowClear
                    placeholder="Modèle actif par défaut"
                    options={(contractTemplates || []).filter(Boolean).map((tpl) => ({
                      label: `${tpl.name}${tpl.isActive ? " · actif" : ""}`,
                      value: tpl.id,
                    }))}
                  />
                </Form.Item>
              </div>
              <Form.Item name="endCurrentLease" valuePropName="checked">
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={(e) => renewForm.setFieldValue("endCurrentLease", e.target.checked)}
                  />
                  Marquer l'ancien bail comme terminé
                </label>
              </Form.Item>
              <div className="flex justify-end gap-2">
                <Button onClick={closeRenewModal}>Annuler</Button>
                <Button type="primary" htmlType="submit" loading={renewBusy}>
                  Renouveler le bail
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PropertyManagement;
