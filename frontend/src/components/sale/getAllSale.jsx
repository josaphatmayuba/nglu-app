import { Link, useNavigate } from "react-router-dom";

import ModalUi from "@/UI/ModalUi";
import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";
import { loadAllSale, loadSingleSale } from "@/redux/rtk/features/sale/saleSlice";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { loadAllStaff } from "@/redux/rtk/features/user/userSlice";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SaleInvoicePayment from "./SaleInvoicePayment";
import SendSaleInvoice from "./SendSaleInvoice";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const fmtCDF = (n) =>
  `CDF ${Math.round(Number(n || 0)).toLocaleString("fr-FR")}`;

const fmtDate = (d) => (d ? moment(d).locale("fr").format("D MMM YYYY") : "—");

/**
 * Derive a UI status from the raw invoice fields.
 *  paid  : dueAmount === 0 && orderStatus !== 'returned'
 *  late  : dueAmount > 0  && dueDate < today
 *  pending: dueAmount > 0 && dueDate >= today (or no due date)
 *  cancelled: orderStatus === 'returned'
 */
const deriveStatus = (invoice) => {
  if (invoice.orderStatus === "returned") return "cancelled";
  const due = Number(invoice.dueAmount || 0);
  if (due === 0) return "paid";
  if (invoice.dueDate && moment(invoice.dueDate).isBefore(moment(), "day")) {
    return "late";
  }
  return "pending";
};

const STATUS_LABEL = {
  paid: "Payée",
  pending: "En attente",
  late: "En retard",
  cancelled: "Annulée",
};

const STATUS_PILL = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  late: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
};

const STATUS_DOT = {
  paid: "bg-emerald-500",
  pending: "bg-amber-500",
  late: "bg-red-500",
  cancelled: "bg-red-500",
};

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
const GetAllSale = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [singleSaleInvoice, setSingleSaleInvoice] = useState({});
  const [edit, setEdit] = useState();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const companyInfo = useSelector((state) => state?.setting?.data) || null;

  const {
    list,
    total,
    totalPage,
    loading: saleLoading,
  } = useSelector((state) => state.sales);

  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
    user: "",
  });

  useEffect(() => {
    dispatch(loadAllCustomer({ query: "all" }));
    dispatch(loadAllStaff({ query: "all" }));
    !companyInfo && dispatch(getSetting());
  }, [companyInfo, dispatch]);

  useEffect(() => {
    dispatch(loadAllSale(pageConfig));
  }, [dispatch, pageConfig]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return undefined;
    const close = (e) => {
      if (!e.target.closest?.(".invoice-menu-anchor")) setOpenMenu(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  const safeList = Array.isArray(list) ? list : [];

  // Counts per status tab (front-side from current page; for now)
  const counts = useMemo(() => {
    return safeList.reduce(
      (acc, inv) => {
        const s = deriveStatus(inv);
        acc.all += 1;
        if (s === "paid") acc.paid += 1;
        else if (s === "cancelled") acc.cancelled += 1;
        else acc.pending += 1; // pending + late grouped under 'En attente'
        return acc;
      },
      { all: 0, paid: 0, pending: 0, cancelled: 0 },
    );
  }, [safeList]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return safeList.filter((inv) => {
      const status = deriveStatus(inv);
      const tabMatch =
        activeTab === "all"
        || (activeTab === "paid" && status === "paid")
        || (activeTab === "pending" && (status === "pending" || status === "late"))
        || (activeTab === "cancelled" && status === "cancelled");
      if (!tabMatch) return false;
      if (!q) return true;
      const haystack = [
        inv.invoiceMemoNo,
        inv.id,
        inv.customer?.username,
        inv.customer?.firstName,
        inv.customer?.lastName,
        String(inv.totalAmount || ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [safeList, activeTab, searchTerm]);

  // KPI totals derived from current page list
  const kpis = useMemo(() => {
    return safeList.reduce(
      (acc, inv) => {
        const s = deriveStatus(inv);
        if (s !== "cancelled") {
          acc.total += Number(inv.totalAmount || 0);
          acc.paid += Number(inv.paidAmount || 0);
          acc.due += Number(inv.dueAmount || 0);
        }
        return acc;
      },
      { total: 0, paid: 0, due: 0 },
    );
  }, [safeList]);

  const { RangePicker } = DatePicker;
  const onCalendarChange = (dates) => {
    if (!dates || dates.length < 2) return;
    setPageConfig((prev) => ({
      ...prev,
      startDate: dates[0].format("YYYY-MM-DD"),
      endDate: dates[1].format("YYYY-MM-DD"),
      page: 1,
    }));
  };

  // Email modal helpers
  const customerEmail = singleSaleInvoice?.customer?.email;
  const subject = `Votre facture #${singleSaleInvoice?.id}`;
  const body = `<div>Bonjour <strong>${singleSaleInvoice?.customer?.username || ""}</strong>,</div><div>Veuillez trouver votre facture ci-jointe.</div>`;
  const showModal = () => setIsModalOpen(true);

  const tabs = [
    { key: "all",       label: "Toutes",      count: counts.all },
    { key: "paid",      label: "Payées",      count: counts.paid },
    { key: "pending",   label: "En attente",  count: counts.pending },
    { key: "cancelled", label: "Annulées",    count: counts.cancelled },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
            Factures
          </h1>
          <p className="text-xs md:text-sm text-ink-500 mt-1">
            Toutes les factures de vente
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RangePicker
            className="range-picker"
            onCalendarChange={onCalendarChange}
            defaultValue={[
              dayjs(pageConfig.startDate, "YYYY-MM-DD"),
              dayjs(pageConfig.endDate, "YYYY-MM-DD"),
            ]}
          />
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
          <button
            onClick={() => navigate("/admin/sale/add")}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Créer</span>
          </button>
        </div>
      </div>

      {/* KPI strip (compact, mockup-style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-5">
        <div className="bg-white rounded-xl border border-ink-200 p-4">
          <div className="text-xs text-ink-500 font-medium mb-1">Total facturé</div>
          <div className="text-lg md:text-2xl font-semibold text-ink-900 tracking-tight truncate">
            {fmtCDF(kpis.total)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 p-4">
          <div className="text-xs text-emerald-700 font-medium mb-1">Encaissé</div>
          <div className="text-lg md:text-2xl font-semibold text-emerald-700 tracking-tight truncate">
            {fmtCDF(kpis.paid)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-ink-200 p-4">
          <div className="text-xs text-amber-700 font-medium mb-1">À recouvrer</div>
          <div className="text-lg md:text-2xl font-semibold text-amber-700 tracking-tight truncate">
            {fmtCDF(kpis.due)}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-white border border-ink-200 rounded-lg mb-5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                "px-3 py-1.5 text-xs md:text-sm font-medium rounded whitespace-nowrap transition " +
                (isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-ink-500 hover:text-ink-700")
              }
            >
              {tab.label}
              <span className="ml-1.5 text-ink-400">{tab.count}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-2 px-2">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher facture, client..."
              className="pl-8 pr-3 py-1.5 bg-white border border-ink-200 rounded-md text-sm w-64 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-ink-50 text-xs text-ink-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium w-8">
                  <input type="checkbox" className="rounded border-ink-300" />
                </th>
                <th className="text-left px-4 py-3 font-medium">N° Facture</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Échéance</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {saleLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-ink-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!saleLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="text-ink-700 font-medium mb-1">Aucune facture</div>
                    <div className="text-xs text-ink-500">
                      {searchTerm
                        ? `Aucun résultat pour « ${searchTerm} »`
                        : "Aucune facture ne correspond à ce filtre."}
                    </div>
                  </td>
                </tr>
              )}

              {filtered.map((inv) => {
                const status = deriveStatus(inv);
                const overdue = status === "late";
                const customerName =
                  inv.customer?.username
                  || [inv.customer?.firstName, inv.customer?.lastName]
                    .filter(Boolean).join(" ")
                  || "—";
                return (
                  <tr key={inv.id} className="hover:bg-ink-50 transition">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-ink-300" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700">
                      <Link to={`/admin/sale/${inv.id}`} className="hover:text-indigo-700">
                        #{inv.invoiceMemoNo || inv.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-900">{customerName}</td>
                    <td className="px-4 py-3 text-ink-600">{fmtDate(inv.date)}</td>
                    <td className={"px-4 py-3 " + (overdue ? "text-red-600 font-medium" : "text-ink-600")}>
                      {inv.dueDate ? fmtDate(inv.dueDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${STATUS_PILL[status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`}></span>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className={"px-4 py-3 text-right font-medium " + (status === "cancelled" ? "text-ink-400 line-through" : "text-ink-900")}>
                      {fmtCDF(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right relative invoice-menu-anchor">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === inv.id ? null : inv.id);
                        }}
                        className="text-ink-400 hover:text-ink-700 hover:bg-ink-100 p-1.5 rounded transition"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === inv.id && (
                        <div className="absolute right-2 top-9 z-10 w-52 bg-white border border-ink-200 rounded-lg shadow-lg py-1">
                          <Link
                            to={`/admin/sale/${inv.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 transition"
                            onClick={() => setOpenMenu(null)}
                          >
                            <Search className="w-4 h-4" /> Voir le détail
                          </Link>
                          <button
                            type="button"
                            onClick={() => { setEdit(inv); setOpenMenu(null); }}
                            disabled={Number(inv.dueAmount || 0) === 0}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 transition disabled:opacity-40 disabled:cursor-not-allowed text-left"
                          >
                            <Wallet className="w-4 h-4" /> Enregistrer un paiement
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              showModal();
                              dispatch(loadSingleSale(inv?.id));
                              setSingleSaleInvoice(inv);
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 transition text-left"
                          >
                            <Mail className="w-4 h-4" /> Envoyer par email
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100 text-sm">
            <span className="text-ink-500 text-xs md:text-sm">
              {filtered.length} sur {total?._count?.id || safeList.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPageConfig((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pageConfig.page === 1}
                className="p-1.5 hover:bg-ink-100 rounded text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                {pageConfig.page}
              </span>
              <span className="text-ink-400 px-1">/ {totalPage}</span>
              <button
                type="button"
                onClick={() => setPageConfig((p) => ({ ...p, page: Math.min(totalPage, p.page + 1) }))}
                disabled={pageConfig.page === totalPage}
                className="p-1.5 hover:bg-ink-100 rounded text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalUi
        title="Envoyer la facture par email"
        open={isModalOpen}
        className="bg-white"
        onClose={() => setIsModalOpen(false)}
        footer={false}
      >
        <SendSaleInvoice
          setIsModalOpen={setIsModalOpen}
          modal={true}
          onClose={() => setIsModalOpen(false)}
          body={body}
          subject={subject}
          customerEmail={customerEmail}
        />
      </ModalUi>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Enregistrer un paiement"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <SaleInvoicePayment data={edit} onClose={() => setEdit(false)} />
      </ModalUi>
    </div>
  );
};

export default GetAllSale;
