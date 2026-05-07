import { Button, DatePicker, Form, Input, Typography } from "antd";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import moment from "moment";
import { addCustomerPayment } from "../../redux/rtk/features/customerPayment/customerPaymentSlice";
import SalePayment from "./SalePayment";
import {
  loadAllSale,
  loadSingleSale,
} from "@/redux/rtk/features/sale/saleSlice";

const SaleInvoicePayment = ({ data, onClose, singlePage }) => {
  const id = data?.singleSaleInvoice?.id || data?.id;
  const dueAmount = data?.dueAmount ?? data?.singleSaleInvoice?.dueAmount ?? 0;

  const dispatch = useDispatch();
  const { Title } = Typography;
  const [form] = Form.useForm();
  let [date, setDate] = useState(moment());
  const [loader, setLoader] = useState(false);
  const [newDue, setNewDue] = useState(0);

  useEffect(() => {
    if (id) {
      form.setFieldsValue({
        saleInvoiceNo: id,
      });
    }
  }, [id, form]);

  const onFinish = async (values) => {
    setLoader(true);
    try {
      const payloadData = {
        date: date,
        saleInvoiceNo: values.saleInvoiceNo || id,
        ...values,
        paidAmount: values.paidAmount || [],
      };

      const resp = await dispatch(addCustomerPayment(payloadData));

      if (resp.payload.message === "success") {
        setLoader(false);
        if (singlePage) {
          dispatch(loadSingleSale(id));
        } else {
          dispatch(
            loadAllSale({
              page: 1,
              count: 10,
              status: "true",
              startDate: moment().startOf("month").format("YYYY-MM-DD"),
              endDate: moment().endOf("month").format("YYYY-MM-DD"),
              user: "",
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
        <strong style={{ color: "red" }}>{dueAmount ? dueAmount.toFixed(2) : 0}</strong>
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
          saleInvoiceNo: id,
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
            label="date"
            name="date"
            rules={[
              {
                required: true,
                message: "Please input Date",
              },
            ]}
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
                className="ml-3 bg-blue-200 hover:bg-blue-300 transition-all rounded px-2 py-1 text-sm cursor-pointer">
                Full Paid
              </button>
            )}
          </span>
          <SalePayment form={form} setNewDue={setNewDue} />
        </div>

        <Form.Item
          style={{ marginBottom: "10px", marginTop: "20px" }}
          label="Sale Invoice No"
          name="saleInvoiceNo"
          validateStatus="success">
          <Input disabled />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          wrapperCol={{
            span: 24,
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

export default SaleInvoicePayment;