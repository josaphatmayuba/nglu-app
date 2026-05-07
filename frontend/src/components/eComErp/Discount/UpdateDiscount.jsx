import { Button, DatePicker, Form, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import React from 'react'
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateDiscount } from '../../../redux/rtk/features/eCommerce/discount/discountSlice';
import { EditOutlined } from '@ant-design/icons';

export default function UpdateDiscount({ data }) {
  const dispatch = useDispatch();
  const { type, value, startDate, endDate ,id} = data;
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initValues, setInitValues] = useState({
    type: type,
    value: value,
    startDate: dayjs(startDate, "YYYY-MM-DD"),
    endDate: dayjs(endDate, "YYYY-MM-DD"),
  });
 const showModal = () => {
   setIsModalOpen(true);
 };

  const onFinish = async (values) => {
    const data = {
      ...values,
      startDate: dayjs(values.startDate).format("YYYY-MM-DD"),
      endDate: dayjs(values.endDate).format("YYYY-MM-DD"),
    };
    const resp = await dispatch(updateDiscount({ id: id, values: data }));
    if (resp.payload.message == "success") {
      setIsModalOpen(false)
      setLoader(false);
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  return (
    <>
      <div
        onClick={showModal}
        className="flex items-center gap-2 cursor-pointer"
      >
        <EditOutlined className="bg-gray-600 p-1 text-white rounded-md" />
        Edit
      </div>
      <Modal
        title="Update discount"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
      >
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10"
          initialValues={initValues}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          labelAlign="left"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Type"
            name={"type"}
            required
          >
            <Select>
              <Select.Option key={"percentage"}>Percentage</Select.Option>
              <Select.Option key={"flat"}>Flat</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Value"
            name={"value"}
            required
            rules={[
              {
                required: true,
                message: "Please input discount Value!",
              },
            ]}
          >
            <InputNumber size="small" placeholder="15" />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              label="Start Date"
              required
              className="w-1/2"
              name="startDate"
              rules={[
                {
                  required: true,
                  message: "Please input Start Date!",
                },
              ]}
            >
              <DatePicker
                label="StartDate"
                size="medium"
                format={"YYYY-MM-DD"}
              />
            </Form.Item>
            <Form.Item
              label="End Date"
              required
              className="w-1/2"
              name="endDate"
              rules={[
                {
                  required: true,
                  message: "Please input End Date!",
                },
              ]}
            >
              <DatePicker label="endDate" size="medium" format={"YYYY-MM-DD"} />
            </Form.Item>
          </div>

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
              Update Discount
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

