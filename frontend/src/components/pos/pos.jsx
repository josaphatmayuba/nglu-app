import { Button, Form } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";

import ProductsForSale from "./ProductsForSale";
import SelectedProductsList from "./SelectedProductsList";
import PaymentSidebar from "./PaymentSidebar";
import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";

const Pos = () => {
  const isLogged = Boolean(localStorage.getItem("isLogged"));
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const dispatch = useDispatch();
  const [selectedProduct, setSelectedProduct] = useState([]);
  const [subTotal, setSubTotal] = useState([]);
  const [due, setDue] = useState(0);

  const { list: vatTaxList, loading: vatTaxLoading } = useSelector(
    (state) => state.vatTax
  );

  useEffect(() => {
    dispatch(loadAllVatTax());
    dispatch(loadAllCustomer({ query: "all" }));
  }, [dispatch]);

  const allCustomer = useSelector((s) => s.customers.list);
  const { list: accounts } = useSelector((s) => s.accounts || {});
  const paymentAutoRef = useRef(true);
  const lastAutoTotalRef = useRef(0);

  // round to 2 decimals helper
  const round2 = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

  const handleUserEditedPayment = () => {
    paymentAutoRef.current = false;
  };

  if (!isLogged) return <Navigate to={"/auth/login"} replace />;

  const totalCalculator = () => {
    const productArray = form.getFieldValue("saleInvoiceProduct");

    const subTotalCalc =
      productArray?.reduce((acc, current) => {
        const quantity = current?.productQuantity || 0;
        const price = current?.productSalePrice || 0;

        let discount = current?.productDiscount || 0;
        if (current?.discountType === "percentage") {
          discount = round2((price * quantity * current?.productDiscount) / 100);
        }

        const vat = current?.productVat || 0;

        const subPrice = round2(price * quantity - discount);
        const subVatAmount = round2((vat / 100) * subPrice);

        return [...acc, { subDiscount: discount, subVatAmount, subPrice }];
      }, []) || [];

    setSubTotal(subTotalCalc);

    const total = round2(subTotalCalc.reduce((a, x) => a + x.subPrice, 0));
    const totalTaxAmount = round2(subTotalCalc.reduce((a, x) => a + x.subVatAmount, 0));
    const totalPayable = round2(total + totalTaxAmount);

    // update due
    const paidAmountArray = paymentForm.getFieldValue("paidAmount") || [];
    const paidAmount = paidAmountArray.reduce(
      (a, x) => a + (x.amount ? parseFloat(x.amount) : 0),
      0
    );
    setDue(round2(totalPayable - paidAmount));

    const currentPaid = paymentForm.getFieldValue("paidAmount") || [];
    const newTotal = round2(totalPayable);

    const cashAccount = accounts && accounts.length
      ? accounts.find(acc => (acc.name || "").toLowerCase() === "cash") || accounts[0]
      : undefined;

    const paymentEntry = cashAccount ? { paymentType: cashAccount.id, amount: newTotal } : { amount: newTotal };

    const lastAuto = round2(lastAutoTotalRef.current);
    if (currentPaid.length === 0 || (paymentAutoRef.current && lastAuto !== newTotal)) {
      paymentForm.setFieldsValue({ paidAmount: [paymentEntry] });
      paymentAutoRef.current = true;
      lastAutoTotalRef.current = newTotal;

      const paidAfter = (paymentForm.getFieldValue("paidAmount") || []).reduce((s, p) => s + (parseFloat(p?.amount) || 0), 0);
      setDue(round2(newTotal - paidAfter));
    }
  };

  const handleSuccessReset = () => {
    form.resetFields();
    paymentForm.resetFields();
    setSelectedProduct([]);
    setSubTotal([]);
    setDue(0);
    paymentAutoRef.current = true;
    lastAutoTotalRef.current = 0;

    const walkInCustomer = allCustomer?.find(
      (cust) => cust.username.toLowerCase() === "walk-in"
    );

    form.setFieldsValue({
      date: dayjs(),
      customerId: walkInCustomer ? walkInCustomer.id : undefined
    });

    totalCalculator();
  };

  const total = subTotal.reduce((a, x) => a + x.subPrice, 0);
  const totalTaxAmount = subTotal.reduce((a, x) => a + x.subVatAmount, 0);
  const totalDiscount = subTotal.reduce((a, x) => a + x.subDiscount, 0);
  const totalPayable = total + totalTaxAmount;

  return (
    <div className="relative min-h-[calc(100vh-120px)] bg-gradient-to-br from-gray-50 to-gray-100 ">
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-0">
        <div className="xl:w-[60%] w-full">
          <Form
            form={form}
            layout="vertical"
            size="large"
            initialValues={{ date: dayjs() }}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          >
            <div className="mt-5">
              <ProductsForSale
                setSelectedProduct={setSelectedProduct}
                form={form}
                totalCalculator={totalCalculator}
              />
            </div>

            <SelectedProductsList
              form={form}
              subTotal={subTotal}
              totalCalculator={totalCalculator}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
            />
          </Form>
        </div>

        <div className="xl:w-[40%] w-full">
          <PaymentSidebar
            form={paymentForm}
            productForm={form}
            vatTaxList={vatTaxList}
            vatTaxLoading={vatTaxLoading}
            total={total}
            totalDiscount={totalDiscount}
            totalTaxAmount={totalTaxAmount}
            totalPayable={totalPayable}
            due={due}
            totalCalculator={totalCalculator}
            allCustomer={allCustomer}
            onUserEdit={handleUserEditedPayment}
            handleSuccessReset={handleSuccessReset}
          />
        </div>
      </div>
    </div>
  );
};

export default Pos;