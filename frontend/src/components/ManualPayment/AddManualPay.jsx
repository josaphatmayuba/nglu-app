import { Button, Form, Input, Select, Space } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import {
  AddManualPayment,
  loadALLManualPayment,
} from "../../redux/rtk/features/manualPayment/manualPaymentSlice";
import { loadALLPaymentMethod } from "../../redux/rtk/features/paymentMethod/paymentMethodSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddPayMethod from "../PaymentMethod/AddPayMethod";
import AddCust from "../customer/AddCustomer";

export default function AddManualPay() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const { list, loading } = useSelector((state) => state.paymentMethod);
  const { list: customers } = useSelector((state) => state.customers);
  const [method, setMethod] = useState(null);
  const [customer, setCustomer] = useState(null);

  const onFinish = (values) => {
    const data = { ...values, paymentMethodId: method, customerId: customer };

    const resp = dispatch(AddManualPayment(data));
    if (resp.payload.message == "success") {
      dispatch(
        loadALLManualPayment({
          page: 1,
          count: 10,
          status: "true",
        })
      );
    }
    setLoader(false);
  };
  const onFinishFailed = () => {};

  useEffect(() => {
    dispatch(loadALLPaymentMethod());
    dispatch(loadAllCustomer({ query: "all" }));
  }, [dispatch]);

  const handlePaymentMethod = (val) => {
    setMethod(val);
  };
  const handleCustomer = (val) => {
    setCustomer(val);
  };
  return (
    <div>
      <Form
        form={form}
        name="basic"
        layout="vertical"
        className="sm:mx-10"
        initialValues={{
          remember: true,
        }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item
          style={{ marginBottom: "15px" }}
          label="Payment Method"
          name="paymentMethodId"
          rules={[
            {
              required: method === null,
              message: "Please select payment method !",
            },
          ]}
        >
          <Space.Compact block>
            <Select
              name="paymentMethodId"
              loading={loading}
              showSearch
              placeholder="Select Payment Method"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              onChange={handlePaymentMethod}
            >
              {list &&
                list.map((method) => (
                  <Select.Option key={method.id} value={method.id}>
                    {method.methodName}
                  </Select.Option>
                ))}
            </Select>
            <BigDrawer
              btnTitle={"Add Payment Method"}
              title="new Payment Method"
            >
              <AddPayMethod />
            </BigDrawer>
          </Space.Compact>
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "15px" }}
          label="Customer"
          name="customerId"
          rules={[
            {
              required: customer === null,
              message: "Please select customer !",
            },
          ]}
        >
          <Space.Compact block>
            <Select
              name="paymentMethodId"
              loading={!customers}
              showSearch
              placeholder="Select Payment Method"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              onChange={handleCustomer}
            >
              {customers &&
                customers.map((customer) => (
                  <Select.Option key={customer.id} value={customer.id}>
                    {customer.username}
                  </Select.Option>
                ))}
            </Select>
            <BigDrawer btnTitle={"Add Customer"} title="new customer">
              <AddCust />
            </BigDrawer>
          </Space.Compact>
        </Form.Item>

        <div className="flex items-center gap-4">
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="Amount"
            name="amount"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please input amount !",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="Order Id"
            name="cartOrderId"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please select Order !",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </div>
        <div className="flex items-center gap-4">
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="Customer Account"
            name="CustomerAccount"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please select customer account!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="TRX Id"
            name="CustomerTransactionId"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please input Customer Transaction Id !",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </div>
        <Form.Item
          style={{ marginBottom: "15px" }}
          className="flex justify-center mt-[24px]"
        >
          <Button
            type="primary"
            htmlType="submit"
            shape="round"
            loading={loader}
            onClick={() => {
              setLoader(true);
            }}
          >
            Create Manual Payment
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
