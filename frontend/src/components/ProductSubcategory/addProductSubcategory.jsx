import { Button, Card, Form, Input, Select, Typography } from "antd";

import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { loadAllProductCategory } from "../../redux/rtk/features/productCategory/productCategorySlice";
import {
  addProductSubCategory,
  loadAllProductSubCategory,
} from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";
import UploadMany from "../Card/UploadMany";
import BigDrawer from "../Drawer/BigDrawer";
import AddProductCategory from "../productCategory/addProductCategory";

const AddProductSubCategory = ({ drawer }) => {
  const category = useSelector((state) => state.productCategories?.list);
  const dispatch = useDispatch();
  const { Title } = Typography;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const onClick = () => {
    setLoading(true);
  };

  const [selectedValue, setSelectedValue] = useState(null);

  const onSelect = (value) => {
    setSelectedValue(value);
  };

  const onFinish = async (values) => {
    try {
      const resp = await dispatch(
        addProductSubCategory({
          ...values,
          productCategoryId: selectedValue,
        })
      );

      if (resp.payload.message === "success") {
        setLoading(false);
        form.resetFields();
        setSelectedValue(null);
      } else {
        setLoading(false);
      }
    } catch (error) {}
  };

  //dispatch category in a useEffect
  useEffect(() => {
    dispatch(loadAllProductCategory({ page: 1, count: 100 }));
    setLoading(false);
  }, [dispatch, loading]);

  return (
    <>
      <div className=" h-full">
        <Form
          form={form}
          layout="vertical"
          className="sm:mx-10"
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please input category name!",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "15px" }}
            name="productCategoryId"
            label={
              <>
                Select Category
                <BigDrawer title={"new Category"}>
                  <AddProductCategory drawer={true} />
                </BigDrawer>
              </>
            }
            rules={[
              {
                required: true,
                message: "Please select category!",
              },
            ]}
          >
            <Select
              onSelect={onSelect}
              name="productCategoryId"
              loading={!category}
              showSearch
              placeholder="Select Category"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
            >
              {category &&
                category.map((cate) => (
                  <Select.Option key={cate.id} value={cate.id}>
                    {cate.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-[24px]"
          >
            <Button
              onClick={onClick}
              loading={loading}
              type="primary"
              htmlType="submit"
              shape="round"
            >
              Create Subcategory
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
            title={"Demo Product SubCategory"}
            demoData={[
              ["name", "productCategoryId"],
              ["SubCategory1", "1"],
              ["SubCategory2", "2"],
              ["SubCategory3", "3"],
            ]}
            urlPath={"product-sub-category"}
            loadAllThunk={loadAllProductSubCategory}
            query={{ page: 1, count: 10, status: true }}
          />
        </Card>
      </div>
    </>
  );
};

export default AddProductSubCategory;
