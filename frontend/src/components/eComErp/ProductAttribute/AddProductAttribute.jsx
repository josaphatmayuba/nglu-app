import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addProductAttribute,
  loadAllProductAttributePaginated,
} from "../../../redux/rtk/features/eCommerce/productAttribute/productAttribute";
import UploadMany from "../../Card/UploadMany";

export default function AddProductAttribute() {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(addProductAttribute(values));

      if (resp.payload.message === "success") {
        setLoading(false);
        form.resetFields();
        dispatch(
          loadAllProductAttributePaginated({
            status: true,
            page: 1,
            count: 10,
          })
        );
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
      <div className=" h-full">
        <Title level={4} className="m-2 text-center">
          Create Attribute
        </Title>
        <Form
          form={form}
          layout="vertical"
          style={{ marginLeft: "40px", marginRight: "40px" }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          labelAlign="left"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Attribute name"
            name={"name"}
            rules={[
              {
                required: true,
                message: "Please input Attribute name!",
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
              loading={loading}
              type="primary"
              htmlType="submit"
              shape="round"
              onClick={onClick}
            >
              Create Attribute
            </Button>
          </Form.Item>
        </Form>

        <Card
          title={<span className="text-center font-bold">Import From CSV</span>}
          className="mt-5"
        >
          <Title level={4} className="m-2 text-center">
            Import From CSV
          </Title>
          <UploadMany
            title={"Demo Product Attribute"}
            demoData={[["name"], ["Fabric"], ["Sleeve"], ["Wheel"]]}
            urlPath={"product-attribute"}
            loadAllThunk={loadAllProductAttributePaginated}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </>
  );
}
