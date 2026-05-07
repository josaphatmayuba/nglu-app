import { Button, Form, Input, InputNumber, Typography } from "antd";

import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addVatTax,
  loadAllVatTax,
} from "../../redux/rtk/features/vatTax/vatTaxSlice";

const AddVatTax = () => {
  const dispatch = useDispatch();
  const { Title } = Typography;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(addVatTax(values));
      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllVatTax());
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoading(false);
  };

  const onClick = () => {
    setLoading(true);
  };

  return (
    <>
      <div className=" h-full">
        <Title level={4} className="m-3 text-center">
          Create Vat/Tax Type
        </Title>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          className="sm:mx-10"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Title"
            name="title"
            rules={[
              {
                required: true,
                message: "Please enter vat/tax type name!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Percentage"
            name="percentage"
            rules={[
              {
                required: true,
                message: "Please enter vat/tax percentage name!",
              },
            ]}
          >
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-6"
          >
            <Button
              type="primary"
              htmlType="submit"
              shape="round"
              loading={loading}
              onClick={onClick}
            >
              Create Vat/Tax Type
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default AddVatTax;
