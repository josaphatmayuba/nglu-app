import { Button, Card, DatePicker, Form, Input, Typography } from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import moment from "moment";
import { addCustomerPayment } from "../../redux/rtk/features/customerPayment/customerPaymentSlice";
import PurchasePayment from "./PurchasePayment";
import { addSupplierPayment } from "@/redux/rtk/features/supplierPayment/supplierPaymentSlice";
import {
  loadAllPurchase,
  loadSinglePurchase,
} from "@/redux/rtk/features/purchase/purchaseSlice";

const PurchaseInvoicePayment = ({ data, onClose, singlePage }) => {
  const { singlePurchaseInvoice } = data;
  const id = data?.singlePurchaseInvoice?.id || data?.id;
  const dueAmount = data?.dueAmount;

  const dispatch = useDispatch();
  const { Title } = Typography;
  const [form] = Form.useForm();
  let [date, setDate] = useState(moment());
  const [loader, setLoader] = useState(false);
  const [newDue, setNewDue] = useState(0);

  useEffect(() => {
    if (id) {
      form.setFieldsValue({
        purchaseInvoiceNo: id,
      });
    }
  }, [id, form]);

  const onFinish = async (values) => {
    setLoader(true);
    try {
      const data = {
        date: date,
        purchaseInvoiceNo: values.purchaseInvoiceNo,
        ...values,
        paidAmount: values.paidAmount || [],
      };

      const resp = await dispatch(addSupplierPayment(data));

      if (resp.payload.message === "success") {
        setLoader(false);
        if (singlePage) {
          dispatch(loadSinglePurchase(id));
        } else {
          dispatch(
            loadAllPurchase({
              page: 1,
              count: 10,
              status: "true",
              startDate: moment().startOf("month").format("YYYY-MM-DD"),
              endDate: moment().endOf("month").format("YYYY-MM-DD"),
            })
          );
        }

        onClose();
      }
      setLoader(false);
      form.resetFields();
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoader(false);
  };

  return (
    <>
      <Title level={4} className="text-center">
        Due Amount :{" "}
        <strong style={{ color: "red" }}>{dueAmount?.toFixed(2) || 0}</strong>
      </Title>
      {newDue ? (
        <p className="text-center text-lg font-semibold">
          Remaining Amount :{" "}
          <strong style={{ color: "red" }}>
            {(dueAmount - newDue).toFixed(2)}
          </strong>
        </p>
      ) : (
        ""
      )}

      <Form
        form={form}
        className="m-4 px-7"
        name="basic"
        layout="vertical"
        initialValues={{
          remember: true,
          purchaseInvoiceNo: id,
          discount: 0,
          paidAmount: [{}],
        }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off">
        <Form.Item
          label="Date"
          rules={[
            {
              required: true,
              message: "Please input the date!",
            },
          ]}
          style={{ marginBottom: "10px" }}>
          <DatePicker
            onChange={(value) => setDate(value?._d)}
            defaultValue={dayjs()}
            name="date"
          />
        </Form.Item>
        <div className="mt-5">
          <span>
            Paid Amount
            {dueAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  form.setFieldsValue({
                    paidAmount: [{ amount: dueAmount }],
                  });
                  setNewDue(0);
                }}
                className="ml-3 bg-blue-200 rounded px-1">
                Full Paid
              </button>
            )}
          </span>
          <PurchasePayment setNewDue={setNewDue} form={form} />
        </div>

        <Form.Item
          style={{ marginBottom: "10px", marginTop: "20px" }}
          label="Purchase Invoice No"
          name="purchaseInvoiceNo"
          validateStatus="success">
          <Input disabled />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          wrapperCol={{
            offset: 8,
            span: 16,
          }}>
          <Button
            className="mt-5"
            block
            type="primary"
            htmlType="submit"
            shape="round"
            loading={loader}>
            Pay Now
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default PurchaseInvoicePayment;