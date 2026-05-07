import { EditOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { loadAllDeliveryFee, updateDeliveryFee } from "../../../redux/rtk/features/eCommerce/deliveryFee/deliveryFeeSlice";

export default function UpdateDeliveryFee({ item }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    setLoading(true);
  };

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

    const onFinish = async(values) => {
        try {
            const resp = await dispatch(updateDeliveryFee({ values, id: item.id }));
            if (resp.payload.message == "success") {
                setLoading(false)
                setIsModalOpen(false)
                dispatch(loadAllDeliveryFee())
            }
      }catch(error){}
  };
    const onFinishFailed = () => { };
    
   
  return (
    <>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => {
          showModal();
        }}
      >
        <EditOutlined className="bg-gray-600 p-1 text-white rounded-md" />
        Edit
      </div>
      <Modal
        title="Update delivery fee"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10 mt-5"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          labelAlign="left"
          initialValues={item}
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
              Add Delivery Fee
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
