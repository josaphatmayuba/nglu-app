import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Upload } from "antd";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadSingleProduct,
  updateProduct,
} from "../../redux/rtk/features/product/productSlice";
import { loadAllProductBrandByPaginated } from "../../redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductCategory } from "../../redux/rtk/features/productCategory/productCategorySlice";
import { loadAllProductSubCategory } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";

import { useParams } from "react-router-dom";
import { loadAllColor } from "../../redux/rtk/features/color/colorSlice";
import { loadAllDiscount } from "../../redux/rtk/features/eCommerce/discount/discountSlice";
import { loadAllUom } from "../../redux/rtk/features/uom/uomSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import fileConfig from "../../utils/fileConfig";
import { removeFalsyProperties } from "../../utils/functions";
import BigDrawer from "../Drawer/BigDrawer";
import AddProductCategory from "../ProductSubcategory/addProductSubcategory";
import Loader from "../loader/loader";
import AddProductBrand from "../productBrand/addProductBrand";
import ColorDropdown from "./colorDropDown";
// Quill modules to add features like toolbar, image upload, etc.
const textEditorModule = {
  toolbar: [
    [{ header: "1" }, { header: "2" }, { font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    ["link", "image"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

// Quill formats to specify allowed styles
const textEditorFormats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "color",
  "background",
];

const UpdateProduct = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { id } = useParams();
  const subCategory = useSelector((state) => state.productSubCategories?.list);
  const brand = useSelector((state) => state.productBrands?.list);
  const { product } = useSelector((state) => state.products);
  const { list: color } = useSelector((state) => state.colors);
  const { list: uomList, loading: uomLoading } = useSelector(
    (state) => state.uom,
  );
  const { list: vatTaxList, loading: vatTaxLoading } = useSelector(
    (state) => state.vatTax,
  );
  const discount = useSelector((state) => state.discount?.list);

  const [thumbFileList, setThumbFileList] = useState([]);
  const [galleryFileList, setGalleryFileList] = useState([]);
  const [loader, setLoader] = useState(false);

  const [prodSubCat, setProdSubCat] = useState(null);
  const [prodBrand, setProdBrand] = useState(null);
  const [prodDescription, setProdDescription] = useState("");
  const [selectedColors, setSelectedColors] = useState([]);

  const prodSubCatHandler = (val) => {
    setProdSubCat(val);
  };
  const prodBrandHandler = (val) => {
    setProdBrand(val);
  };
  const prodDescriptionHandler = (val) => {
    setProdDescription(val);
  };
  const colorsHandler = (val) => {
    setSelectedColors(val);
  };

  const handelThumbImageChange = ({ fileList }) => {
    setThumbFileList(fileList);
  };

  const handelGalleryImageChange = ({ fileList }) => {
    setGalleryFileList(fileList);
  };

  const [shippingChargeComment, setShippingChargeComment] = useState("");
  const handleText = (e) => {
    e.preventDefault();
    setShippingChargeComment(e.target.value);
  };
  const handleTextareaKeyDown = (e) => {
    if (e.key === "Enter") {
      setShippingChargeComment(shippingChargeComment + "\n");
    }
  };
  const onFinish = async (values) => {
    let formData = new FormData();
    const data = removeFalsyProperties(values);
    try {
      if (fileConfig() === "laravel" && thumbFileList?.length) {
        thumbFileList[0]?.originFileObj &&
          formData.append("images[]", thumbFileList[0]?.originFileObj);
      } else if (thumbFileList?.length) {
        thumbFileList[0]?.originFileObj &&
          formData.append("images", thumbFileList[0]?.originFileObj);
      }
      if (product?.productThumbnailImage && thumbFileList?.length === 0) {
        formData.append("deleteThumbnail", "true");
      }
      galleryFileList.forEach((galleryImage) => {
        formData.append("images[]", galleryImage.originFileObj);
      });

      formData.append("_method", "PUT");
      formData.append("name", data?.name);
      prodSubCat && formData.append("productSubCategoryId", prodSubCat);
      prodBrand && formData.append("productBrandId", prodBrand);
      formData.append("sku", data?.sku);
      data?.uomId && formData.append("uomId", data?.uomId);
      data?.uomValue && formData.append("uomValue", data.uomValue);

      data?.productSalePrice &&
        formData.append("productSalePrice", data?.productSalePrice);

      data?.reorderQuantity &&
        formData.append("reorderQuantity", data.reorderQuantity);
      prodDescription && formData.append("description", prodDescription);

      data.productVatId &&
        formData.append("productVatId", parseInt(data.productVatId));
      data.discountId &&
        formData.append("discountId", parseInt(data.discountId));
      selectedColors.length && formData.append("colors", selectedColors);
      shippingChargeComment &&
        formData.append("shippingChargeComment", shippingChargeComment);

      const resp = await dispatch(updateProduct({ id, formData, fileConfig }));

      if (resp.payload.message === "success") {
        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  //useEffect for loading category list from redux
  useEffect(() => {
    dispatch(loadSingleProduct(id));
    dispatch(loadAllProductCategory({ page: 1, count: 100, status: true }));
    dispatch(loadAllProductSubCategory({ page: 1, count: 100, status: true }));
    dispatch(
      loadAllProductBrandByPaginated({ page: 1, count: 100, status: true }),
    );
    dispatch(loadAllColor({}));
    dispatch(loadAllDiscount());
    dispatch(loadAllVatTax());
    dispatch(loadAllUom());
  }, [dispatch, id]);

  useEffect(() => {
    if (product) {
      setProdDescription(product?.description);
      setShippingChargeComment(product?.shippingChargeComment);
      setProdSubCat(product?.productSubCategoryId);
      setProdBrand(product?.productBrandId);
      const colors = product?.productColor?.map((item) => item.color?.id);

      setSelectedColors(colors);
      if (product?.productThumbnailImageUrl) {
        setThumbFileList([
          {
            uid: "-1",
            name: "thumbnail_image",
            status: "done",
            url: product.productThumbnailImageUrl,
          },
        ]);
      } else {
        setThumbFileList([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    product?.description,
    product?.productBrandId,
    product?.productSubCategoryId,
    product?.productThumbnailImageUrl,
  ]);

  return (
    <>
      {product ? (
        <Card
          className="border-0 md:border md:p-6 bg-transparent md:bg-[#fafafa]"
          bodyStyle={{ padding: 0 }}
          bordered={false}>
          <h1 className="text-lg font-bold text-center my-10">
            Update Product
          </h1>
          <Form
            form={form}
            name="basic"
            className="mx-40"
            initialValues={{ ...product }}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
            layout="vertical">
            <Form.Item
              style={{ marginBottom: "15px" }}
              label="Name"
              name="name"
              required>
              <Input />
            </Form.Item>
            <div className="flex flex-col sm:flex-row gap-3">
              <Form.Item
                style={{ marginBottom: "15px" }}
                name="productSubCategoryId"
                label={
                  <>
                    Subcategory
                    <BigDrawer title="new Sub-Category">
                      <AddProductCategory drawer={true} />
                    </BigDrawer>
                  </>
                }
                className="w-full sm:w-1/2">
                <Select
                  name="productSubCategoryId"
                  loading={!subCategory}
                  showSearch
                  placeholder="Select Subcategory"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      .toLowerCase()
                      .localeCompare(optionB.children.toLowerCase())
                  }
                  onChange={prodSubCatHandler}>
                  {subCategory &&
                    subCategory.map((subcat) => (
                      <Select.Option key={subcat?.id} value={subcat?.id}>
                        {subcat?.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                style={{ marginBottom: "15px" }}
                className="flex-grow"
                name="productBrandId"
                label={
                  <>
                    Brand
                    <BigDrawer title="new Brand">
                      <AddProductBrand drawer={true} />
                    </BigDrawer>
                  </>
                }>
                {" "}
                <Select
                  name="productBrandId"
                  value={prodBrand}
                  loading={!brand}
                  showSearch
                  placeholder="Select Brand"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      .toLowerCase()
                      .localeCompare(optionB.children.toLowerCase())
                  }
                  onChange={prodBrandHandler}>
                  {brand?.map((brandSingle) => (
                    <Select.Option key={brandSingle.id} value={brandSingle.id}>
                      {brandSingle.name}
                    </Select.Option>
                  ))}
                </Select>{" "}
              </Form.Item>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Form.Item
                style={{ marginBottom: "15px" }}
                name="uomId"
                label="UoM (Unit of Measure)"
                className="w-full sm:w-1/2">
                <Select
                  name="uomId"
                  loading={uomLoading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      .toLowerCase()
                      .localeCompare(optionB.children.toLowerCase())
                  }>
                  {uomList &&
                    uomList.map((uom) => (
                      <Select.Option key={uom.id} value={uom?.id}>
                        {uom?.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                style={{ marginBottom: "15px" }}
                label="UoM Value"
                name="uomValue"
                className="w-full sm:w-1/2">
                <Input type="number" />
              </Form.Item>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Form.Item
                style={{ marginBottom: "15px" }}
                label="Sale Price"
                name="productSalePrice"
                className="w-full sm:w-1/2">
                <Input type="number" />
              </Form.Item>

              <Form.Item
                style={{ marginBottom: "15px" }}
                label="Reorder Quantity"
                name="reorderQuantity"
                className="w-full sm:w-1/2">
                <Input type="number" />
              </Form.Item>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Form.Item
                style={{ marginBottom: "15px" }}
                label="SKU No"
                name="sku"
                required
                className="w-full sm:w-1/2">
                <Input />
              </Form.Item>
              {color?.length && (
                <Form.Item
                  style={{ marginBottom: "15px" }}
                  label="Colors"
                  className="w-full sm:w-1/2"
                  rules={[
                    selectedColors?.length === 0 && {
                      required: true,
                      message: "Please input Color!",
                    },
                  ]}>
                  <ColorDropdown
                    data={color}
                    selectedColors={selectedColors}
                    colorsHandler={colorsHandler}
                  />
                </Form.Item>
              )}
            </div>

            {/* <Form.Item
              label='Upload Thumbnail Image'
              valuePropName='thumbnail_image'
            >
              <Upload
                listType='picture-card'
                beforeUpload={() => false}
                name='image'
                fileList={thumbFileList}
                maxCount={1}
                onChange={handelThumbImageChange}
              >
                <div>
                  <PlusOutlined />
                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    Upload
                  </div>
                </div>
              </Upload>
            </Form.Item> */}
            <div className="flex  gap-3">
              <Form.Item
                label="Upload Thumbnail Image"
                valuePropName="thumbnail_image"
                className="w-1/2">
                <Upload
                  listType="picture-card"
                  beforeUpload={() => false}
                  name="image"
                  fileList={thumbFileList}
                  maxCount={1}
                  accept="image/png, image/jpg, image/jpeg"
                  onChange={handelThumbImageChange}>
                  <div>
                    <PlusOutlined />
                    <div
                      style={{
                        marginTop: 8,
                      }}>
                      Upload
                    </div>
                  </div>
                </Upload>
              </Form.Item>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Form.Item
                style={{ marginBottom: "15px" }}
                label="Discount"
                name="discountId"
                className="w-full sm:w-1/2">
                <Select
                  name="discountId"
                  loading={!brand}
                  showSearch
                  placeholder="Select discount"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      .toLowerCase()
                      .localeCompare(optionB.children.toLowerCase())
                  }
                  onChange={prodBrandHandler}>
                  {discount &&
                    discount.map((discountSingle) => (
                      <Select.Option
                        key={discountSingle.id}
                        value={discountSingle.id}>
                        {`${
                          discountSingle.type == "percentage"
                            ? `${discountSingle.value}%`
                            : `Flat ${discountSingle.value}`
                        }`}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              <Form.Item
                style={{ marginBottom: "15px" }}
                label="Product Vat/Tax"
                name="productVatId"
                placeholder="Select Vat/tax"
                className="w-full sm:w-1/2">
                <Select
                  placeholder="Select Vat/Tax type"
                  loading={vatTaxLoading}>
                  {vatTaxList?.map((item) => (
                    <Select.Option key={item.id} value={item.id}>
                      {item.title}
                      <span className="italic">@{item.percentage}%</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            {/* <Form.Item
              style={{ marginBottom: "15px" }}
              label='Delivery Charge warning'
              name='shippingChargeComment'
            >
              <Input.TextArea
                onChange={handleText}
                onKeyPress={handleTextareaKeyDown}
                rows={3}
                className='w-full resize-none '
                placeholder='Write comment here...'
              />
            </Form.Item> */}

            {/* make a description item in form */}
            <Form.Item
              style={{ marginBottom: "25px" }}
              label="Product Description ">
              <ReactQuill
                value={prodDescription}
                onChange={prodDescriptionHandler}
                modules={textEditorModule}
                formats={textEditorFormats}
              />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "15px" }}
              className="flex justify-center mt-[24px]">
              <Button
                onClick={() => setLoader(true)}
                type="primary"
                htmlType="submit"
                shape="round"
                loading={loader}>
                Update Product
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ) : (
        <Loader />
      )}
    </>
  );
};

export default UpdateProduct;
