import { Form, Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Banknote,
  Briefcase,
  Calculator,
  Check,
  ChevronLeft,
  FilePlus,
  MessageSquare,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import dayjs from "dayjs";

import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";
import { addSale } from "../../redux/rtk/features/sale/saleSlice";
import { loadAllTermsAndConditions } from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import { loadAllStaff } from "../../redux/rtk/features/user/userSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import { loadAllCurrency } from "../../redux/rtk/features/eCommerce/currency/currencySlice";
import getStaffId from "../../utils/getStaffId";

const round2 = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

const PAYMENT_TERMS = [
  { label: "À réception", days: 0 },
  { label: "Net 14 jours", days: 14 },
  { label: "Net 30 jours", days: 30 },
  { label: "Net 60 jours", days: 60 },
];

const TVA_OPTIONS = [
  { value: 0, label: "0%" },
  { value: 16, label: "16%" },
  { value: 20, label: "20%" },
];

const formatAmount = (n, symbol) => {
  const amount = Math.round(Number(n || 0)).toLocaleString("fr-FR");
  return `${symbol || "CDF"} ${amount}`;
};

const AddSale = () => {
  const [loader, setLoader] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState("vente");
  const [paymentTerm, setPaymentTerm] = useState(14);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percentage");
  const [, forceUpdate] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const staffId = getStaffId();

  const allCustomer = useSelector((state) => state.customers.list) || [];
  const { list: productList = [], loading: productLoading } = useSelector(
    (state) => state.products
  );
  const { list: termsList = [] } = useSelector(
    (state) => state.termsAndConditions
  );
  const currencyList = useSelector((state) => state.currency?.list) || [];
  const activeCurrencies = useMemo(
    () => currencyList.filter((c) => c?.status === true || c?.status === "true"),
    [currencyList]
  );

  useEffect(() => {
    dispatch(loadAllStaff({ status: "true" }));
    dispatch(loadAllCustomer({ page: 1, count: 100 }));
    dispatch(loadProduct({ query: "all" }));
    dispatch(loadAllVatTax());
    dispatch(loadAllTermsAndConditions());
    dispatch(loadAllCurrency());
  }, [dispatch]);

  // ── Sync due date when payment term changes ──────────────────────
  useEffect(() => {
    const date = form.getFieldValue("date") || dayjs();
    if (paymentTerm > 0) {
      form.setFieldsValue({
        dueDate: dayjs(date).add(paymentTerm, "day"),
      });
    }
  }, [paymentTerm, form]);

  // ── Line items computation ───────────────────────────────────────
  const computeLines = () => {
    const lines = form.getFieldValue("saleInvoiceProduct") || [];
    return lines.map((line) => {
      const qty = parseFloat(line?.productQuantity || 0);
      const price = parseFloat(line?.productSalePrice || 0);
      const tax = parseFloat(line?.productVat || 0);
      const sub = round2(qty * price);
      const taxAmt = round2((tax / 100) * sub);
      return { sub, taxAmt, total: round2(sub + taxAmt) };
    });
  };

  const lines = computeLines();
  const subTotalHT = round2(lines.reduce((acc, l) => acc + l.sub, 0));
  const totalTax = round2(lines.reduce((acc, l) => acc + l.taxAmt, 0));
  const remise =
    discountType === "percentage"
      ? round2(((parseFloat(discountValue) || 0) / 100) * subTotalHT)
      : round2(parseFloat(discountValue) || 0);
  const totalTTC = round2(subTotalHT + totalTax - remise);

  const handleLineChange = () => forceUpdate((n) => n + 1);

  // ── Submit ───────────────────────────────────────────────────────
  const onFormSubmit = async (values) => {
    try {
      const productArray = (values.saleInvoiceProduct || [])
        .filter((line) => line && line.productId)
        .map((line) => {
          const qty = parseFloat(line.productQuantity) || 0;
          const price = parseFloat(line.productSalePrice) || 0;
          const taxPct = parseFloat(line.productVat) || 0;
          return {
            productId: line.productId,
            productQuantity: qty,
            productUnitSalePrice: price,
            tax: taxPct,
            productDiscount: 0,
          };
        });

      if (!productArray.length) {
        setLoader(false);
        return;
      }

      const payload = {
        date: values.date ? dayjs(values.date).format("YYYY-MM-DD") : undefined,
        customerId: values.customerId,
        currencyId: values.currencyId,
        userId: staffId,
        saleInvoiceProduct: productArray,
        paidAmount: [],
        invoiceMemoNo: values.invoiceMemoNo || undefined,
        note: values.note,
        dueDate: values.dueDate
          ? dayjs(values.dueDate).format("YYYY-MM-DD")
          : undefined,
        termsAndConditions: values.termsAndConditions,
      };

      const resp = await dispatch(addSale(payload));
      setLoader(false);
      if (resp.payload?.message === "success") {
        form.resetFields();
        navigate(`/admin/sale/${resp.payload.data.id}`);
      }
    } catch (error) {
      setLoader(false);
    }
  };

  const sectionTitle = (icon, label) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-4 flex items-center gap-2">
      {icon}
      {label}
    </h3>
  );

  // ── Custom line table (mockup-styled) ────────────────────────────
  const renderLineTable = () => (
    <Form.List name="saleInvoiceProduct">
      {(fields, { add, remove }) => (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-ink-500 uppercase tracking-wider border-b border-ink-100">
                  <th className="text-left pb-2 font-medium">
                    {invoiceMode === "vente" ? "Produit" : "Description"}
                  </th>
                  <th className="text-right pb-2 font-medium w-20">
                    {invoiceMode === "vente" ? "Qté" : "Heures"}
                  </th>
                  <th className="text-right pb-2 font-medium w-28">
                    {invoiceMode === "vente" ? "Prix unit." : "Taux / unité"}
                  </th>
                  <th className="text-right pb-2 font-medium w-20">TVA</th>
                  <th className="text-right pb-2 font-medium w-32">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {fields.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-ink-400 text-sm"
                    >
                      Aucune ligne — cliquez sur « Ajouter une ligne »
                    </td>
                  </tr>
                )}
                {fields.map(({ key, name, ...restField }, idx) => {
                  const line = lines[idx] || { total: 0 };
                  return (
                    <tr key={key}>
                      <td className="py-3 pr-2">
                        {invoiceMode === "vente" ? (
                          <Form.Item
                            {...restField}
                            name={[name, "productId"]}
                            className="mb-0"
                            rules={[{ required: true, message: " " }]}
                          >
                            <Select
                              size="small"
                              showSearch
                              loading={productLoading}
                              placeholder="Sélectionner un produit"
                              optionFilterProp="children"
                              onChange={(id) => {
                                const found = productList.find(
                                  (p) => p.id === id
                                );
                                if (found) {
                                  const arr =
                                    form.getFieldValue("saleInvoiceProduct") || [];
                                  arr[idx] = {
                                    ...arr[idx],
                                    productId: id,
                                    productSalePrice: found.productSalePrice,
                                    productQuantity: 1,
                                    productVat:
                                      found.productVat?.percentage || 0,
                                  };
                                  form.setFieldsValue({
                                    saleInvoiceProduct: arr,
                                  });
                                  handleLineChange();
                                }
                              }}
                            >
                              {productList.map((item) => (
                                <Select.Option key={item.id} value={item.id}>
                                  {item.name}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        ) : (
                          <Form.Item
                            {...restField}
                            name={[name, "productDescription"]}
                            className="mb-0"
                          >
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm focus:outline-none focus:border-brand-500"
                              placeholder="Conseil en gestion · janvier"
                              defaultValue={form.getFieldValue([
                                "saleInvoiceProduct",
                                name,
                                "productDescription",
                              ])}
                              onChange={(e) => {
                                const arr =
                                  form.getFieldValue("saleInvoiceProduct") || [];
                                arr[idx] = {
                                  ...arr[idx],
                                  productDescription: e.target.value,
                                };
                                form.setFieldsValue({
                                  saleInvoiceProduct: arr,
                                });
                              }}
                            />
                          </Form.Item>
                        )}
                      </td>
                      <td className="py-3 px-1">
                        <Form.Item
                          {...restField}
                          name={[name, "productQuantity"]}
                          className="mb-0"
                        >
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm text-right focus:outline-none focus:border-brand-500"
                            defaultValue={form.getFieldValue([
                              "saleInvoiceProduct",
                              name,
                              "productQuantity",
                            ])}
                            onChange={(e) => {
                              const arr =
                                form.getFieldValue("saleInvoiceProduct") || [];
                              arr[idx] = {
                                ...arr[idx],
                                productQuantity: e.target.value,
                              };
                              form.setFieldsValue({
                                saleInvoiceProduct: arr,
                              });
                              handleLineChange();
                            }}
                          />
                        </Form.Item>
                      </td>
                      <td className="py-3 px-1">
                        <Form.Item
                          {...restField}
                          name={[name, "productSalePrice"]}
                          className="mb-0"
                        >
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm text-right focus:outline-none focus:border-brand-500"
                            defaultValue={form.getFieldValue([
                              "saleInvoiceProduct",
                              name,
                              "productSalePrice",
                            ])}
                            onChange={(e) => {
                              const arr =
                                form.getFieldValue("saleInvoiceProduct") || [];
                              arr[idx] = {
                                ...arr[idx],
                                productSalePrice: e.target.value,
                              };
                              form.setFieldsValue({
                                saleInvoiceProduct: arr,
                              });
                              handleLineChange();
                            }}
                          />
                        </Form.Item>
                      </td>
                      <td className="py-3 px-1">
                        <Form.Item
                          {...restField}
                          name={[name, "productVat"]}
                          className="mb-0"
                        >
                          <select
                            className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm focus:outline-none focus:border-brand-500"
                            value={
                              form.getFieldValue([
                                "saleInvoiceProduct",
                                name,
                                "productVat",
                              ]) ?? 16
                            }
                            onChange={(e) => {
                              const arr =
                                form.getFieldValue("saleInvoiceProduct") || [];
                              arr[idx] = {
                                ...arr[idx],
                                productVat: Number(e.target.value),
                              };
                              form.setFieldsValue({
                                saleInvoiceProduct: arr,
                              });
                              handleLineChange();
                            }}
                          >
                            {TVA_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </Form.Item>
                      </td>
                      <td className="py-3 pl-1 text-right font-medium text-ink-900 whitespace-nowrap">
                        {formatAmount(line.total)}
                      </td>
                      <td className="py-3 pl-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            remove(name);
                            handleLineChange();
                          }}
                          className="p-1 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded"
                          aria-label="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => {
              add({ productVat: 16, productQuantity: 1 });
              handleLineChange();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border-2 border-dashed border-ink-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-lg text-sm font-medium text-ink-600 hover:text-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter une ligne
          </button>
        </>
      )}
    </Form.List>
  );

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      <Form
        form={form}
        name="add_sale_form"
        onFinish={onFormSubmit}
        onFinishFailed={() => setLoader(false)}
        layout="vertical"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        initialValues={{
          date: dayjs(),
          dueDate: dayjs().add(14, "day"),
          saleInvoiceProduct: [{ productVat: 16, productQuantity: 1 }],
        }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-ink-500 mb-4">
          <Link
            to="/admin/sale"
            className="hover:text-ink-900 inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Factures</span>
          </Link>
          <span className="text-ink-300">/</span>
          <span className="text-ink-900 font-medium">Nouvelle facture</span>
        </div>

        {/* Title row + actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <FilePlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
                Nouvelle facture
              </h1>
              <p className="text-xs md:text-sm text-ink-500 mt-0.5">
                Vente de produits ou prestation de service
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/sale"
              className="px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 rounded-lg transition"
            >
              Annuler
            </Link>
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-ink-700 border border-ink-200 hover:bg-white rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              Brouillon
            </button>
            <button
              type="submit"
              disabled={loader}
              onClick={() => setLoader(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              Créer la facture
            </button>
          </div>
        </div>

        {/* Vente / Prestation toggle */}
        <div className="bg-white rounded-xl border border-ink-200 p-1 inline-flex gap-1 mb-5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setInvoiceMode("vente")}
            className={
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition " +
              (invoiceMode === "vente"
                ? "bg-indigo-50 text-indigo-700"
                : "text-ink-600 hover:bg-ink-50")
            }
          >
            <Package className="w-4 h-4" />
            Vente de produits
          </button>
          <button
            type="button"
            onClick={() => setInvoiceMode("service")}
            className={
              "flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition " +
              (invoiceMode === "service"
                ? "bg-indigo-50 text-indigo-700"
                : "text-ink-600 hover:bg-ink-50")
            }
          >
            <Briefcase className="w-4 h-4" />
            Prestation de service
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* LEFT — main form */}
          <div className="space-y-5">
            {/* Client & dates */}
            <div className="bg-white rounded-xl border border-ink-200 p-5">
              {sectionTitle(
                <UserRound className="w-3.5 h-3.5" />,
                "Client & dates"
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <Form.Item
                    name="customerId"
                    rules={[
                      { required: true, message: "Sélectionnez un client" },
                    ]}
                    className="mb-0"
                  >
                    <Select
                      showSearch
                      placeholder="Sélectionner ou créer un client"
                      optionFilterProp="children"
                      suffixIcon={<Search className="w-4 h-4 text-ink-400" />}
                      filterOption={(input, option) =>
                        String(option.children)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {allCustomer.map((c) => (
                        <Select.Option key={c.id} value={c.id}>
                          {c.username}
                          {c.email ? ` · ${c.email}` : ""}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      N° facture
                    </label>
                    <Form.Item name="invoiceMemoNo" className="mb-0">
                      <input
                        type="text"
                        placeholder="Auto-généré"
                        className="w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Date facture <span className="text-red-500">*</span>
                    </label>
                    <Form.Item
                      name="date"
                      rules={[{ required: true, message: " " }]}
                      className="mb-0"
                      getValueProps={(v) => ({
                        value: v ? dayjs(v).format("YYYY-MM-DD") : "",
                      })}
                      normalize={(v) => (v ? dayjs(v) : null)}
                    >
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </Form.Item>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Échéance <span className="text-red-500">*</span>
                    </label>
                    <Form.Item
                      name="dueDate"
                      rules={[{ required: true, message: " " }]}
                      className="mb-0"
                      getValueProps={(v) => ({
                        value: v ? dayjs(v).format("YYYY-MM-DD") : "",
                      })}
                      normalize={(v) => (v ? dayjs(v) : null)}
                    >
                      <input
                        type="date"
                        className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Conditions de paiement
                    </label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      {PAYMENT_TERMS.map((t) => (
                        <option key={t.days} value={t.days}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">
                      Devise
                    </label>
                    <Form.Item name="currencyId" className="mb-0">
                      <Select
                        allowClear
                        placeholder="Devise par défaut"
                        optionFilterProp="children"
                      >
                        {activeCurrencies.map((c) => (
                          <Select.Option
                            key={c.currencyId}
                            value={c.currencyId}
                          >
                            {c.currencyName} ({c.currencySymbol})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-xl border border-ink-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 flex items-center gap-2">
                  {invoiceMode === "vente" ? (
                    <Package className="w-3.5 h-3.5" />
                  ) : (
                    <Briefcase className="w-3.5 h-3.5" />
                  )}
                  {invoiceMode === "vente" ? "Produits" : "Prestations"}
                </h3>
              </div>
              {renderLineTable()}
            </div>

            {/* Notes & conditions */}
            <div className="bg-white rounded-xl border border-ink-200 p-5">
              {sectionTitle(
                <MessageSquare className="w-3.5 h-3.5" />,
                "Notes & conditions"
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Notes pour le client
                  </label>
                  <Form.Item name="note" className="mb-0">
                    <textarea
                      rows={2}
                      placeholder="Merci de votre confiance. Référence sur votre paiement..."
                      className="w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                    />
                  </Form.Item>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Termes & conditions
                  </label>
                  <Form.Item name="termsAndConditions" className="mb-0">
                    <Select
                      allowClear
                      placeholder="Aucun"
                      optionFilterProp="children"
                    >
                      {termsList.map((t) => (
                        <Select.Option key={t.id} value={t.subject}>
                          {t.title}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Summary sidebar (sticky) */}
          <aside className="space-y-4 lg:sticky lg:top-4 self-start">
            <div className="bg-white rounded-xl border border-ink-200 p-5">
              {sectionTitle(
                <Calculator className="w-3.5 h-3.5" />,
                "Récapitulatif"
              )}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Sous-total HT</span>
                  <span className="text-ink-900 font-medium">
                    {formatAmount(subTotalHT)}
                  </span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>TVA</span>
                  <span className="text-ink-900 font-medium">
                    {formatAmount(totalTax)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-600">
                  <span>Remise</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-16 px-2 py-1 bg-white border border-ink-200 rounded text-xs text-right focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-ink-200 rounded text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="percentage">%</option>
                      <option value="flat">CDF</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-ink-100 my-3"></div>

                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-ink-900">
                    Total TTC
                  </span>
                  <span className="text-2xl font-bold text-indigo-700">
                    {formatAmount(totalTTC)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment expected hint */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xs text-emerald-900">
                <p className="font-semibold mb-1">
                  Paiement attendu d'ici{" "}
                  {paymentTerm > 0 ? `${paymentTerm}j` : "réception"}
                </p>
                <p className="text-emerald-700/80">
                  Un rappel automatique sera envoyé au client à J-3 si la
                  facture n'est pas réglée.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
};

export default AddSale;
