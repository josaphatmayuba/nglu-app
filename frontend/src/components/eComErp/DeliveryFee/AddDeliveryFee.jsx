import { Button, Form, Input, InputNumber } from "antd";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addDeliveryFee,
  loadAllDeliveryFee,
} from "../../../redux/rtk/features/eCommerce/deliveryFee/deliveryFeeSlice";

export default function AddDeliveryFee() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    setLoading(true);
  };
  const onFinish = async (values) => {
    const resp = await dispatch(addDeliveryFee(values));
    if (resp.payload.message == "success") {
      form.resetFields();
      dispatch(loadAllDeliveryFee());
    }
    setLoading(false);
  };
  const onFinishFailed = () => {};
  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        className="sm:mx-10"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        labelAlign="left"
      >
        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Delivery Area"
          name={"deliveryArea"}
          rules={[
            {
              required: true,
              message: "Please input delivery area name!",
            },
          ]}
        >
          <Input size="small" placeholder="e.g. Dhaka" />
        </Form.Item>

        <Form.Item
          label="Delivery Fee"
          required
          name="deliveryFee"
          rules={[
            {
              required: true,
              message: "Please input delivery Fee",
            },
          ]}
        >
          <InputNumber placeholder="e.g. 100" size="small" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-[24px]"
        >
          <Button
            loading={loading}
            type="primary"
            htmlType="submit"
            shape="round"
            onClick={onClick}
          >
            Create Delivery Area
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
