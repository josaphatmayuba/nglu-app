import { Form, Select } from "antd";
import dayjs from "dayjs";
import { ChevronLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";
import { addQuote } from "../../redux/rtk/features/quote/quoteSlice";
import { useDefaultCurrencySymbol } from "@/utils/useDefaultCurrency";

const round2 = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

const AddQuote = () => {
  const [loader, setLoader] = useState(false);
  const [, forceUpdate] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const currencySymbol = useDefaultCurrencySymbol();

  const allCustomer = useSelector((state) => state.customers.list) || [];
  const { list: productList = [], loading: productLoading } = useSelector(
    (state) => state.products
  );

  useEffect(() => {
    dispatch(loadAllCustomer({ page: 1, count: 100 }));
    dispatch(loadProduct({ query: "all" }));
  }, [dispatch]);

  const computeLines = () => {
    const lines = form.getFieldValue("quoteProduct") || [];
    return lines.map((line) => {
      const qty = parseFloat(line?.productQuantity || 0);
      const price = parseFloat(line?.productUnitSalePrice || 0);
      return { total: round2(qty * price) };
    });
  };

  const lines = computeLines();
  const totalAmount = round2(lines.reduce((acc, l) => acc + l.total, 0));

  const handleLineChange = () => forceUpdate((n) => n + 1);

  const formatAmount = (n) =>
    `${currencySymbol || "CDF"} ${Math.round(Number(n || 0)).toLocaleString("fr-FR")}`;

  const onFormSubmit = async (values) => {
    setLoader(true);
    try {
      const productArray = (values.quoteProduct || [])
        .filter((line) => line && line.productId)
        .map((line) => {
          const qty = parseFloat(line.productQuantity) || 0;
          const price = parseFloat(line.productUnitSalePrice) || 0;
          return {
            productId: line.productId,
            productQuantity: qty,
            productUnitSalePrice: price,
            productFinalAmount: round2(qty * price),
          };
        });

      const payload = {
        quoteName: values.quoteName,
        quoteDate: values.quoteDate
          ? dayjs(values.quoteDate).format("YYYY-MM-DD")
          : undefined,
        customerId: values.customerId,
        totalAmount: round2(productArray.reduce((acc, l) => acc + l.productFinalAmount, 0)),
        note: values.note,
        quoteProduct: productArray,
      };

      const resp = await dispatch(addQuote(payload));
      setLoader(false);
      if (resp.payload?.message === "success") {
        form.resetFields();
        navigate("/admin/quote");
      }
    } catch (error) {
      setLoader(false);
    }
  };

  const renderLineTable = () => (
    <Form.List name="quoteProduct">
      {(fields, { add, remove }) => (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-ink-500 uppercase tracking-wider border-b border-ink-100">
                  <th className="text-left pb-2 font-medium">Produit</th>
                  <th className="text-right pb-2 font-medium w-20">Qté</th>
                  <th className="text-right pb-2 font-medium w-28">Prix unit.</th>
                  <th className="text-right pb-2 font-medium w-32">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-400 text-sm">
                      Aucune ligne — cliquez sur « Ajouter une ligne »
                    </td>
                  </tr>
                )}
                {fields.map(({ key, name, ...restField }, idx) => {
                  const line = lines[idx] || { total: 0 };
                  return (
                    <tr key={key}>
                      <td className="py-3 pr-2">
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
                              const found = productList.find((p) => p.id === id);
                              if (found) {
                                const arr = form.getFieldValue("quoteProduct") || [];
                                arr[idx] = {
                                  ...arr[idx],
                                  productId: id,
                                  productUnitSalePrice: found.productSalePrice,
                                  productQuantity: arr[idx]?.productQuantity || 1,
                                };
                                form.setFieldsValue({ quoteProduct: arr });
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
                      </td>
                      <td className="py-3 px-1">
                        <Form.Item {...restField} name={[name, "productQuantity"]} className="mb-0">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm text-right focus:outline-none focus:border-brand-500"
                            defaultValue={form.getFieldValue(["quoteProduct", name, "productQuantity"])}
                            onChange={(e) => {
                              const arr = form.getFieldValue("quoteProduct") || [];
                              arr[idx] = { ...arr[idx], productQuantity: e.target.value };
                              form.setFieldsValue({ quoteProduct: arr });
                              handleLineChange();
                            }}
                          />
                        </Form.Item>
                      </td>
                      <td className="py-3 px-1">
                        <Form.Item {...restField} name={[name, "productUnitSalePrice"]} className="mb-0">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-white border border-ink-200 rounded-md text-sm text-right focus:outline-none focus:border-brand-500"
                            defaultValue={form.getFieldValue(["quoteProduct", name, "productUnitSalePrice"])}
                            onChange={(e) => {
                              const arr = form.getFieldValue("quoteProduct") || [];
                              arr[idx] = { ...arr[idx], productUnitSalePrice: e.target.value };
                              form.setFieldsValue({ quoteProduct: arr });
                              handleLineChange();
                            }}
                          />
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
              add({ productQuantity: 1 });
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
        name="add_quote_form"
        onFinish={onFormSubmit}
        onFinishFailed={() => setLoader(false)}
        layout="vertical"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        initialValues={{
          quoteDate: dayjs(),
          quoteProduct: [{ productQuantity: 1 }],
        }}
      >
        <div className="flex items-center gap-2 text-sm text-ink-500 mb-4">
          <Link to="/admin/quote" className="hover:text-ink-900 inline-flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Devis
          </Link>
          <span>/</span>
          <span className="text-ink-900 font-medium">Nouveau devis</span>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
            Nouveau devis
          </h1>
          <button
            type="submit"
            disabled={loader}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loader ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-ink-200 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-4">
              Articles
            </h3>
            {renderLineTable()}

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-sm font-semibold text-ink-900">Total</span>
                <span className="text-lg font-semibold text-ink-900">
                  {formatAmount(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-ink-200 p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Détails
            </h3>
            <Form.Item label="Nom du devis" name="quoteName">
              <input
                type="text"
                className="w-full px-2.5 py-1.5 bg-white border border-ink-200 rounded-md text-sm focus:outline-none focus:border-brand-500"
                placeholder="Devis #..."
              />
            </Form.Item>
            <Form.Item label="Client" name="customerId">
              <Select
                showSearch
                allowClear
                placeholder="Sélectionner un client"
                optionFilterProp="children"
              >
                {allCustomer.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.username || `${c.firstName || ""} ${c.lastName || ""}`.trim()}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Date" name="quoteDate">
              <input
                type="date"
                className="w-full px-2.5 py-1.5 bg-white border border-ink-200 rounded-md text-sm focus:outline-none focus:border-brand-500"
                defaultValue={dayjs().format("YYYY-MM-DD")}
                onChange={(e) => form.setFieldsValue({ quoteDate: dayjs(e.target.value) })}
              />
            </Form.Item>
            <Form.Item label="Note" name="note">
              <textarea
                rows={3}
                className="w-full px-2.5 py-1.5 bg-white border border-ink-200 rounded-md text-sm focus:outline-none focus:border-brand-500"
                placeholder="Conditions, remarques..."
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default AddQuote;
