import { Button, Form, Input } from "antd";
import Title from "antd/es/skeleton/Title";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addDepartment,
  loadAllDepartmentPaginated,
} from "../../redux/rtk/features/department/departmentSlice";

export default function AddDepartment() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const resp = await dispatch(addDepartment(values));
      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllDepartmentPaginated({}));
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <div className=" h-full">
      <Title level={4} className="m-3 text-center">
        Add Department
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
          label="Name"
          name="name"
          rules={[
            {
              required: true,
              message: "Please enter department Name!",
            },
          ]}
        >
          <Input />
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
          >
            Create Department
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
