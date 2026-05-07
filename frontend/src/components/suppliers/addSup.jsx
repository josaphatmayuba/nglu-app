import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";

import { useDispatch } from "react-redux";
import {
  addSupplier,
  loadSuppliers,
} from "../../redux/rtk/features/supplier/supplierSlice";
import UploadMany from "../Card/UploadMany";

const AddSup = () => {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    setLoading(true);
  };
  const onFinish = async (values) => {
    try {
      const resp = await dispatch(addSupplier(values));
      if (resp.payload.message === "success") {
        form.resetFields();
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <>
      <div className="h-full">
        <Title level={4} className=" text-center">
          Add Supplier
        </Title>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          style={{ marginLeft: "40px", marginRight: "40px" }}
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please input supplier name!",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Phone"
            name="phone"
            rules={[
              {
                required: true,
                message: "Please input supplier phone!",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Email"
            name="email"
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Address"
            name="address"
          >
            <Input />
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
              Create Supplier
            </Button>
          </Form.Item>
        </Form>

        <Card
          title={<span className="text-center font-bold">Import From CSV</span>}
          className="mt-5"
        >
          <UploadMany
            title={"Demo Supplier"}
            demoData={[
              ["name", "phone", "email", "address"],
              [
                "Supplier 1",
                "01700001234",
                "supplier1@gmail.com",
                "everywhere",
              ],
              [
                "Supplier 2",
                "01700002234",
                "supplier2@gmail.com",
                "everywhere",
              ],
              [
                "Supplier 3",
                "01700003234",
                "supplier3@gmail.com",
                "everywhere",
              ],
            ]}
            urlPath={"supplier"}
            loadAllThunk={loadSuppliers}
            query={{ status: true, page: 1, count: 10 }}
          />
        </Card>
      </div>
    </>
  );
};

export default AddSup;
