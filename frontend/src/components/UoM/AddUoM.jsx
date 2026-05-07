import { Button, Form, Input } from "antd";
import Title from "antd/es/skeleton/Title";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addUom,
  loadAllUomPaginated,
} from "../../redux/rtk/features/uom/uomSlice";

export default function AddUoM() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const resp = await dispatch(addUom(values));
      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllUomPaginated({ status: true, page: 1, count: 10 }));
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
        Create UoM
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
              message: "Please enter UoM Name!",
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
            Create UoM
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
