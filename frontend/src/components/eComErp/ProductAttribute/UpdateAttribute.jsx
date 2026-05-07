import React from 'react'
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadAllProductAttributePaginated, loadSingleProductAttribute, updateProductAttribute } from '../../../redux/rtk/features/eCommerce/productAttribute/productAttribute';
import { useEffect } from 'react';
import { Button, Form, Input } from 'antd';

export default function UpdateAttribute({ productAttribute }) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();

  const onFinish = async (values) => {
    const resp = await dispatch(updateProductAttribute({ id: productAttribute.id, values }));
    if (resp.payload.message === "success") {
      setLoader(false);
      dispatch(loadSingleProductAttribute(productAttribute.id));
      dispatch(loadAllProductAttributePaginated({ page: 1, count: 10, status: "true" })); // Reload the list
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    form.setFieldValue("name", productAttribute.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productAttribute]);
  return (
    <>
      <Form
        form={form}
        layout="vertical"
        style={{ marginLeft: "40px", marginRight: "40px" }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        labelAlign="left"
      >
        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Attribute name"
          name={"name"}
          rules={[
            {
              required: true,
              message: "Please input attribute name!",
            },
          ]}
        >
          <Input size="small" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-[24px]"
        >
          <Button
            loading={loader}
            onClick={() => setLoader(true)}
            type="primary"
            htmlType="submit"
            shape="round"
          >
            Update Product Attribute
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
