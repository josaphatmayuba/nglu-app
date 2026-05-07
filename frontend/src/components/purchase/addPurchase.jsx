import { Form, Select } from "antd";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";
import { loadSuppliers } from "../../redux/rtk/features/supplier/supplierSlice";
import Products from "./Products";
import PurchaseSidebar from "./PurchaseSidebar";

import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { addPurchase } from "../../redux/rtk/features/purchase/purchaseSlice";

const AddPurchase = () => {
  const { Option } = Select;
  const [loader, setLoader] = useState(false);
  const [subTotal, setSubTotal] = useState([]);
  const [due, setDue] = useState(0);
  const [selectedSupplier, setSelectedSupplier] = useState();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const allSuppliers = useSelector((state) => state.suppliers.list);
  const { list: productList, loading: productLoading } = useSelector(
    (state) => state.products,
  );

  // Form Function
  const [form] = Form.useForm();

  const onFormSubmit = async (values) => {
    try {
      const mergedObject = values.purchaseInvoiceProduct.reduce(
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
        {},
      );

      const mergedArray = Object.values(mergedObject);
      const newArray = mergedArray.map((product) => {
        return {
          ...product,
          productId: product.productId,
          productQuantity: product.productQuantity,
          productUnitPurchasePrice: parseFloat(
            Number(product.productPurchasePrice).toFixed(2),
          ),
          productUnitSalePrice: parseFloat(
            Number(product.productSalePrice).toFixed(2),
          ),
          tax: parseFloat(Number(product.tax || 0).toFixed(2)),
        };
      });

      const data = {
        ...values,
        purchaseInvoiceProduct: newArray,
        paidAmount:
          values.paidAmount?.map((item) => ({
            ...item,
            amount: parseFloat(Number(item.amount || 0).toFixed(2)),
          })) || [],
      };
      const resp = await dispatch(addPurchase(data));
      if (resp.payload.message === "success") {
        form.resetFields();
        setLoader(false);
        navigate(`/admin/purchase/${resp.payload.data.id}`);
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };

  // total calculate
  const totalCalculator = () => {
    const productArray = form.getFieldValue("purchaseInvoiceProduct");

    const subTotal =
      productArray?.reduce((acc, current) => {
        const quantity = current?.productQuantity || 0;
        const price = current?.productPurchasePrice || 0;
        const vat = current?.tax || 0;

        const subPrice = parseFloat((price * quantity).toFixed(2));
        const totalVat = parseFloat(((vat / 100) * subPrice).toFixed(2));

        return [...acc, { subPrice, totalVat }];
      }, []) || [];

    setSubTotal(subTotal);

    const total = parseFloat(
      subTotal?.reduce((acc, item) => acc + item.subPrice, 0).toFixed(2),
    );
    const totalTaxAmount = parseFloat(
      subTotal?.reduce((acc, item) => acc + item.totalVat, 0).toFixed(2),
    );
    const totalPayable = parseFloat((total + totalTaxAmount).toFixed(2));

    const paidAmountArray = form.getFieldValue("paidAmount") || [];
    const paidAmount = parseFloat(
      paidAmountArray
        ?.reduce((acc, item) => {
          return acc + (item.amount ? parseFloat(item.amount) : 0);
        }, 0)
        .toFixed(2),
    );

    const due = Math.max(0, parseFloat((totalPayable - paidAmount).toFixed(2)));
    setDue(due);
  };

  const supplier = allSuppliers?.find((item) => item.id === selectedSupplier);
  // Compute totals and ensure 2 decimal rounding
  const total =
    Math.round(
      (subTotal?.reduce((acc, item) => acc + (item.subPrice || 0), 0) || 0) *
        100,
    ) / 100;
  const totalTaxAmount =
    Math.round(
      (subTotal?.reduce((acc, item) => acc + (item.totalVat || 0), 0) || 0) *
        100,
    ) / 100;
  const totalPayable = Math.round((total + totalTaxAmount) * 100) / 100;

  useEffect(() => {
    dispatch(loadSuppliers({ query: "all" }));
    dispatch(loadProduct({ query: "all" }));
  }, [dispatch]);

  return (
    <div className="relative min-h-[calc(100vh-120px)] bg-gradient-to-br from-gray-50 to-gray-100">
      <Form
        form={form}
        className="w-full "
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
          purchaseInvoiceProduct: [{}],
        }}>
        <div className="flex flex-col xl:flex-row gap-4 xl:gap-0">
          <div className="xl:w-[60%] w-full">
            <Products
              totalCalculator={totalCalculator}
              subTotal={subTotal}
              form={form}
              productList={productList}
              productLoading={productLoading}
            />
          </div>
          <div className="xl:w-[40%] w-full">
            <PurchaseSidebar
              form={form}
              totalCalculator={totalCalculator}
              subTotal={subTotal}
              due={due}
              selectedSupplier={selectedSupplier}
              setSelectedSupplier={setSelectedSupplier}
              allSuppliers={allSuppliers}
              total={total}
              totalTaxAmount={totalTaxAmount}
              totalPayable={totalPayable}
              loader={loader}
              setLoader={setLoader}
              onFormSubmit={onFormSubmit}
            />
          </div>
        </div>
      </Form>
    </div>
  );
};

export default AddPurchase;
