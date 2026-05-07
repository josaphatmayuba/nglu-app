import { Button, Card, Form, Input, InputNumber, Select } from "antd";

import { Fragment, useEffect } from "react";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { loadSingleECommerceSale } from "../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import { addReturnOrder } from "../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";

const ReturnRefund = ({ handleCancel, selectedProduct }) => {
  const dispatch = useDispatch();
  const customerId = localStorage.getItem("id");
  const { id } = useParams("id");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    const data = {
      ...values,
      customerId: customerId,
      cartOrderId: id,
      cartOrderProductId: selectedProduct?.id,
    };

    const resp = await dispatch(addReturnOrder(data));
    if (resp.payload.message === "success") {
      handleCancel();
      dispatch(loadSingleECommerceSale(id));
      form.resetFields();
    }

    setLoading(false);
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      form.resetFields();
    };
  }, [form]);

  return (
    <Fragment>
      <Card bordered={false} className='h-full'>
        <h2 className='text-center font-semibold text-lg pb-3'>
          {selectedProduct?.product.name}
        </h2>
        <div>
          {(selectedProduct?.colors ||
            selectedProduct?.cartOrderAttributeValue) && (
            <div className='flex gap-3 pb-4'>
              {selectedProduct?.colors && (
                <p className=' font-medium  text-gray-500'>
                  Color: {selectedProduct?.colors.name}
                </p>
              )}
              {selectedProduct?.cartOrderAttributeValue &&
                selectedProduct?.cartOrderAttributeValue.map(
                  (attribute, index) => (
                    <span className='font-medium text-gray-500' key={index}>
                      {attribute.productAttributeValue.productAttribute.name}:{" "}
                      {attribute.productAttributeValue.name}
                    </span>
                  )
                )}
            </div>
          )}
        </div>
        <Form
          form={form}
          className=''
          labelCol={{
            span: 8,
          }}
          wrapperCol={{
            span: 16,
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Form.Item
            name='returnType'
            label='Select type'
            rules={[
              {
                required: true,
                message: "Please select type!",
              },
            ]}
          >
            <Select
              placeholder='Select type'
              style={{ width: "100%" }}
              popupClassName='bg-white'
            >
              <Select.Option value='REFUND'>Refund</Select.Option>
              <Select.Option value='PRODUCT'>Return</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label='Cause of action'
            name='note'
            rules={[
              {
                required: true,
                message: "Please enter why you want to return or refund!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label='Quantity'
            name='productQuantity'
            rules={[
              {
                required: true,
                message: "Please enter product quantity",
              },
            ]}
          >
            <InputNumber
              size='small'
              max={selectedProduct?.productQuantity}
              min={1}
            />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className='flex justify-center mt-6'
          >
            <Button
              type='primary'
              htmlType='submit'
              shape='round'
              loading={loading}
            >
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Fragment>
  );
};

export default ReturnRefund;
