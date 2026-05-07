import { Button, Form, Modal, Select } from "antd";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { loadSingleReturnOrder, updateReturnOrder } from "../../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";

export default function ReturnStatus({ data }) {
  const dispatch = useDispatch();
  const { Option } = Select;
  const { id } = useParams("id");
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading,setLoading] = useState(false)
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const resp = await dispatch(updateReturnOrder({ values, id }));
        if (resp.payload.message == "success") {
            setLoading(false)
            setIsModalOpen(false);
        dispatch(loadSingleReturnOrder(id));
        }
        setLoading(false);
    } catch (err) {
        setLoading(false);
    }
  };

  return (
    <>
      <Button type="dashed" onClick={showModal}>
        Update Status
      </Button>
      <Modal
        title="Update Return Order Status"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <Form
          form={form}
          name="basic"
          //   initialValues={data.returnCartOrderStatus}
          layout="vertical"
          onFinish={onSubmit}
        >
          <h1 className="text-lg text-center font-semibold text-gray-600">
            Return ID : {data.id}
          </h1>
          {data.returnType == "PRODUCT" ? (
            <Form.Item
              name="returnCartOrderStatus"
              label="Update Return Status"
              rules={[
                {
                  required: true,
                  message: "Please select return status!",
                },
              ]}
            >
              <Select
                placeholder="Select Return Status"
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="PENDING">Pending</Option>
                <Option value="RECEIVED">Received</Option>
                <Option value="RESEND">Resend</Option>
                <Option value="RESENDED">Resended</Option>
              </Select>
            </Form.Item>
          ) : (
            <Form.Item
              name="returnCartOrderStatus"
              label="Update Return Status"
              rules={[
                {
                  required: true,
                  message: "Please select return status!",
                },
              ]}
            >
              <Select
                placeholder="Select Return Status"
                style={{ width: "100%" }}
                allowClear
              >
                <Option value="PENDING">Pending</Option>
                <Option value="RECEIVED">Received</Option>
                <Option value="REFUNDED">Refunded</Option>
              
              </Select>
            </Form.Item>
          )}
          <Form.Item>
            <Button
              loading={loading}
              htmlType="submit"
              className="w-full"
              type="primary"
            >
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
