import { Button, Form, Input } from "antd";
import React from "react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadAllProductAttributeValuePaginated,
  updateProductAttributeValue,
} from "../../../redux/rtk/features/eCommerce/productAttributeValue/productAttributeValueSlice";
import { useEffect } from "react";
import { loadSingleProductAttribute } from "../../../redux/rtk/features/eCommerce/productAttribute/productAttribute";

export default function UpdateProductAttributeValue({
  handleCancel,
  attributeId,
}) {
  const dispatch = useDispatch();
  const { edit } = useSelector((state) => state.productAttributeValue);
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();

  const onFinish = async (values) => {
    setLoader(true);
    const resp = await dispatch(
      updateProductAttributeValue({ id: edit.id, values })
    );
    if (resp.payload.message == "success") {
      handleCancel();
      setLoader(false);
      dispatch(loadSingleProductAttribute(attributeId));
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    form.setFieldValue("name", edit.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);
  return (
    <>
      <Form
        form={form}
        layout="vertical"
        style={{ marginLeft: "40px", marginRight: "40px" }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        labelAlign="left">
        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Attribute name"
          name={"name"}
          rules={[
            {
              required: true,
              message: "Please input attribute Value!",
            },
          ]}>
          <Input size="small" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-[24px]">
          <Button
            loading={loader}
            onClick={() => setLoader(true)}
            type="primary"
            htmlType="submit"
            shape="round">
            Update Product Attribute Value
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
