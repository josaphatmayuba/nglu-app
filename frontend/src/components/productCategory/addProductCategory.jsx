import { Button, Card, Form, Input, Typography } from "antd";

import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addProductCategory,
  loadAllProductCategory,
} from "../../redux/rtk/features/productCategory/productCategorySlice";
import UploadMany from "../Card/UploadMany";

const AddProductCategory = () => {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(addProductCategory(values));
      if (resp.payload.message === "success") {
        setLoading(false);
        form.resetFields();
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
      <div className="h-full md:">
        <Form
          form={form}
          name="basic"
          layout="vertical"
          className="sm:mx-10"
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
                message: "Please input category Dname!",
              },
            ]}
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
              Create Category
            </Button>
          </Form.Item>
        </Form>

        <Card
          title={<span className="text-center font-bold">Import From CSV</span>}
          className="mt-5"
        >
          <UploadMany
            title={"Demo Category"}
            demoData={[["name"], ["Category1"], ["Category2"], ["Category3"]]}
            urlPath={"product-category"}
            loadAllThunk={loadAllProductCategory}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </>
  );
};

export default AddProductCategory;
