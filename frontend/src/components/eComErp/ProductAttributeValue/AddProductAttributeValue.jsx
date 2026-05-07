import { Button, Card, Form, Input, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import { useDispatch, useSelector } from "react-redux";
import {
  loadAllProductAttribute,
  loadSingleProductAttribute,
} from "../../../redux/rtk/features/eCommerce/productAttribute/productAttribute";
import {
  addProductAttributeValue,
  loadAllProductAttributeValuePaginated,
} from "../../../redux/rtk/features/eCommerce/productAttributeValue/productAttributeValueSlice";
import UploadMany from "../../Card/UploadMany";
import BigDrawer from "../../Drawer/BigDrawer";
import AddProductAttribute from "../ProductAttribute/AddProductAttribute";

export default function AddProductAttributeValue({ id }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.productAttribute);
  const { Title } = Typography;
  const [form] = Form.useForm();
  const [loader, setLoading] = useState(false);

  const onClick = () => {
    setLoading(true);
  };

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(
        addProductAttributeValue({
          ...values,
          productAttributeId: id,
        })
      );

      if (resp.payload.message === "success") {
        setLoading(false);
        form.resetFields();
        dispatch(dispatch(loadSingleProductAttribute(id)));
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    setLoading(false);
  };
  useEffect(() => {
    dispatch(loadAllProductAttribute());
  }, [dispatch]);

  return (
    <>
      <div className=" h-full">
        <Title level={4} className="m-2 text-center">
          Add Product Attribute
        </Title>
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          labelAlign="left">
          <Form.Item
            style={{ marginBottom: "15px" }}
            name="productAttributeId"
            label="Selected Attribute ">
            <Space.Compact block>
              <Input
                value={list?.find((item) => item.id == id).name}
                disabled
              />
              <BigDrawer
                title={"new Product Attribute"}
                btnTitle="Create Attribute"
                // eslint-disable-next-line react/no-children-prop
                children={<AddProductAttribute drawer={true} />}
              />
            </Space.Compact>
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Attribute value "
            name={"name"}
            rules={[
              {
                required: true,
                message: "Please input Attribute value !",
              },
            ]}>
            <Input size="small" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-[24px]">
            <Button
              loading={loader}
              type="primary"
              htmlType="submit"
              shape="round"
              onClick={onClick}>
              Create Attribute Value
            </Button>
          </Form.Item>
        </Form>
        <Card
          title={<span className="text-center font-bold">Import From CSV</span>}
          className="mt-5">
          <Title level={4} className="m-2 text-center">
            Import From CSV
          </Title>
          <UploadMany
            demoData={[
              ["productAttributeId", "name"],
              [1, "M"],
              [1, "L"],
              [1, "XL"],
            ]}
            urlPath={"product-attribute-value"}
            loadAllThunk={loadAllProductAttributeValuePaginated}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </>
  );
}
