import { Form } from "antd";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronLeft, FilePlus, Package, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";
import { addSale } from "../../redux/rtk/features/sale/saleSlice";
import Products from "./Products";

import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { loadAllTermsAndConditions } from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import { loadAllStaff } from "../../redux/rtk/features/user/userSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import getStaffId from "../../utils/getStaffId";
import SaleSidebar from "./SaleSidebar";

const AddSale = () => {
  const [loader, setLoader] = useState(false);
  const [subTotal, setSubTotal] = useState([]);
  const [due, setDue] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState();
  const [selectedTermsAndConditions, setSelectedTermsAndConditions] =
    useState();
  // Vente vs Prestation toggle — currently only changes labels/header;
  // backend reception is identical (saleInvoiceProduct array).
  const [invoiceMode, setInvoiceMode] = useState("vente");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Form Function
  const [form] = Form.useForm();

  const allCustomer = useSelector((state) => state.customers.list);
  const { list: productList, loading: productLoading } = useSelector(
    (state) => state.products
  );

  const { list: termsAndConditions, loading } = useSelector(
    (state) => state.termsAndConditions
  );

  const staffId = getStaffId();
  const [userId, setUserId] = useState(staffId);

  const allStaff = useSelector((state) => state.users.list);
  useEffect(() => {
    dispatch(loadAllStaff({ status: "true" }));
    dispatch(loadAllCustomer({ page: 1, count: 100 }));
    dispatch(loadProduct({ query: "all" }));
    dispatch(loadAllVatTax());
    dispatch(loadAllTermsAndConditions());
  }, [dispatch]);

  const onFormSubmit = async (values) => {
    try {
      const mergedObject = values.saleInvoiceProduct.reduce(
        (accumulator, currentObject) => {
          const productId = currentObject.productId;
          if (!accumulator[productId]) {
            accumulator[productId] = { ...currentObject };
          } else {
            accumulator[productId].productQuantity +=
              currentObject.productQuantity;
          }
          return accumulator;
        },
        {}
      );

      const mergedArray = Object.values(mergedObject);
      const productArray = mergedArray.map((item) => {
        const quantity = item?.productQuantity || 0;
        const price = item?.productSalePrice || 0;
        const data = {
          productId: item.productId,
          productQuantity: item.productQuantity,
          productUnitSalePrice: item.productSalePrice,
          tax: item.productVat,
        };

        data.productDiscount = item.productDiscount;
        if (item.discountType === "percentage") {
          data.productDiscount =
            (price * quantity * item?.productDiscount) / 100;
        }

        return data;
      });
      const data = {
        ...values,
        userId: userId,
        saleInvoiceProduct: productArray,
        paidAmount: values.paidAmount || [],
      };
      const resp = await dispatch(addSale(data));
      if (resp.payload.message === "success") {
        form.resetFields();
        setLoader(false);

        navigate(`/admin/sale/${resp.payload.data.id}`);
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };

  // total calculate
  const totalCalculator = () => {
    const round2 = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

    const productArray = form.getFieldValue("saleInvoiceProduct");
    const subTotalCalc =
      productArray?.reduce((subTotalAcc, current) => {
        const quantity = current?.productQuantity || 0;
        const price = current?.productSalePrice || 0;

        let discount = current?.productDiscount || 0;
        if (current?.discountType === "percentage") {
          discount = round2((price * quantity * discount) / 100);
        } else {
          discount = round2(discount);
        }

        const vat = current?.productVat || 0;

        const subPrice = round2(price * quantity - discount);
        const totalVat = round2((vat / 100) * subPrice);

        return [
          ...subTotalAcc,
          { subDiscount: discount, subVatAmount: totalVat, subPrice },
        ];
      }, []) || [];

    setSubTotal(subTotalCalc);

    const total = round2(subTotalCalc.reduce((acc, item) => acc + item.subPrice, 0));
    const totalTaxAmount = round2(subTotalCalc.reduce((acc, item) => acc + item.subVatAmount, 0));
    const totalPayable = round2(total + totalTaxAmount);

    const paidAmountArray = form.getFieldValue("paidAmount") || [];
    const paidAmount = round2(paidAmountArray?.reduce((acc, item) => {
      return acc + (item.amount ? parseFloat(item.amount) : 0);
    }, 0));

    const due = round2(totalPayable - paidAmount);
    setDue(due);
  };

  const customer = allCustomer?.find((item) => item.id === selectedCustomer);
  const total = subTotal.reduce((acc, item) => {
    return acc + item.subPrice;
  }, 0);
  const totalTaxAmount = subTotal.reduce((acc, item) => {
    return acc + item.subVatAmount;
  }, 0);
  const totalDiscount = subTotal.reduce((acc, item) => {
    return acc + item.subDiscount;
  }, 0);

  const totalPayable = total + totalTaxAmount;
  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f7f8fa] px-3 sm:px-5 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-500 mb-4">
        <Link to="/admin/sale" className="hover:text-ink-900 inline-flex items-center gap-1.5">
          <ChevronLeft className="w-4 h-4" />
          <span>Factures</span>
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-ink-900 font-medium">Nouvelle facture</span>
      </div>

      {/* Title row with icon + subtitle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <FilePlus className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-ink-900 tracking-tight">
              Nouvelle facture
            </h1>
            <p className="text-xs md:text-sm text-ink-500 mt-0.5">
              {invoiceMode === "vente"
                ? "Vente de produits — Lignes depuis le catalogue"
                : "Prestation de service — Lignes libres"}
            </p>
          </div>
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

      <Form
        form={form}
        name="dynamic_form_nest_item"
        onFinish={onFormSubmit}
        onFinishFailed={() => {
          setLoader(false);
        }}
        layout="vertical"
        size="large"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        }}
        autoComplete="off"
        initialValues={{
          discount: 0,
          date: dayjs(),
          vatId: [],
          saleInvoiceProduct: [{}],
          paymentType: 1,
        }}>
        <div className="flex flex-col xl:flex-row gap-4 xl:gap-0">
          <div className="xl:w-[60%] w-full">
            <Products
              form={form}
              totalCalculator={totalCalculator}
              subTotal={subTotal}
              productList={productList}
              productLoading={productLoading}
              invoiceMode={invoiceMode}
            />
          </div>
          <div className="xl:w-[40%] w-full">
            <SaleSidebar
              form={form}
              totalCalculator={totalCalculator}
              subTotal={subTotal}
              due={due}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              selectedTermsAndConditions={selectedTermsAndConditions}
              setSelectedTermsAndConditions={setSelectedTermsAndConditions}
              allCustomer={allCustomer}
              termsAndConditions={termsAndConditions}
              loading={loading}
              allStaff={allStaff}
              userId={userId}
              setUserId={setUserId}
              total={total}
              totalDiscount={totalDiscount}
              totalTaxAmount={totalTaxAmount}
              totalPayable={totalPayable}
              loader={loader}
              setLoader={setLoader}
              onFormSubmit={onFormSubmit}
              invoiceMode={invoiceMode}
            />
          </div>
        </div>
      </Form>
    </div>
  );
};

export default AddSale;
