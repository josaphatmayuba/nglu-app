import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Select, Upload } from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addProduct,
  loadProduct,
} from "../../redux/rtk/features/product/productSlice";
import { loadAllProductBrand } from "../../redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductCategory } from "../../redux/rtk/features/productCategory/productCategorySlice";
import { loadAllProductSubCategory } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";

import queryGenerator from "@/utils/queryGenarator";
import axios from "axios";
import { loadAllColor } from "../../redux/rtk/features/color/colorSlice";
import { loadAllDiscount } from "../../redux/rtk/features/eCommerce/discount/discountSlice";
import { loadAllProductAttribute } from "../../redux/rtk/features/eCommerce/productAttribute/productAttribute";
import { loadAllUom } from "../../redux/rtk/features/uom/uomSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddProductCategory from "../ProductSubcategory/addProductSubcategory";
import AddUoM from "../UoM/AddUoM";
import AddDiscount from "../eComErp/Discount/AddDiscount";
import AddProductBrand from "../productBrand/addProductBrand";
import AddVatTax from "../vatTax/addVatTax";
import AttributeValueDropdown from "./attributeValueDropdown";
import AttributesDropdown from "./attributesDropDown";
import ColorDropdown from "./colorDropDown";

export const textEditorModule = {
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
export const textEditorFormats = [
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

const AddProduct = () => {
  const subCategory = useSelector((state) => state.productSubCategories?.list);
  const brand = useSelector((state) => state.productBrands?.list);
  const attribute = useSelector((state) => state.productAttribute?.list);
  const discount = useSelector((state) => state.discount?.list);
  const { list: color } = useSelector((state) => state.colors);
  const { list: uomList, loading: uomLoading } = useSelector(
    (state) => state.uom,
  );
  const { list: vatTaxList, loading: vatTaxLoading } = useSelector(
    (state) => state.vatTax,
  );
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  useEffect(() => {
    dispatch(loadAllProductCategory());
    dispatch(loadAllProductSubCategory());
    dispatch(loadAllProductBrand());
    dispatch(loadAllColor());
    dispatch(loadAllProductAttribute());
    dispatch(loadAllDiscount());
    dispatch(loadAllVatTax());
    dispatch(loadAllUom());
  }, [dispatch]);

  const [galleryFileList, setGalleryFileList] = useState([]);
  const [loader, setLoader] = useState(false);
  const debounceTimeoutRef = useRef();
  const [SKUValid, setSKUValid] = useState("");
  const [prodSubCat, setProdSubCat] = useState(null);
  const [prodBrand, setProdBrand] = useState(null);
  const [prodDescription, setProdDescription] = useState(false);

  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [attributeValue, setAttributeValue] = useState({});
  const [attributeId, setAttributeId] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  // Quill modules to add features like toolbar, image upload, etc.

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

  const makeAttributeIdArray = (val) => {
    // Extract all values (arrays) from the object
    const arrays = Object.values(val);

    // Combine arrays into a single array
    const combinedArray = arrays.reduce((acc, curr) => [...acc, ...curr], []);
    setAttributeId(combinedArray);
  };
  const attributesHandler = (selectedAttributesFromDropDown) => {
    const selectedAttributeDetails = selectedAttributesFromDropDown.map(
      (selectedAttributeSingle) => {
        const foundAttributeDetails = attribute.find(
          (item) => item.name === selectedAttributeSingle,
        );

        return foundAttributeDetails;
      },
    );
    setSelectedAttributes(selectedAttributeDetails);
  };
  const attributeValueHandler = (name, val) => {
    const attributeObjKey = Object.keys(attributeValue);
    const foundAttributeObjKey = attributeObjKey.find((item) => item === name);
    if (foundAttributeObjKey) {
      const newAttributeObj = {
        ...attributeValue,
        [foundAttributeObjKey]: val,
      };
      setAttributeValue(newAttributeObj);
      makeAttributeIdArray(newAttributeObj);
    } else {
      const newAttributeObj = { ...attributeValue, [name]: val };
      setAttributeValue(newAttributeObj);
      makeAttributeIdArray(newAttributeObj);
    }
  };

  const onFinish = async (values) => {
    setLoader(true);
    try {
      let formData = new FormData();
      formData.append("name", values.name);
      formData.append("sku", values.sku);

      selectedColors.length > 0 && formData.append("colors", selectedColors);
      attributeId.length > 0 &&
        formData.append("productAttributeValueId", attributeId);

      galleryFileList.forEach((galleryImage) => {
        formData.append("images[]", galleryImage.originFileObj);
      });

      prodSubCat && formData.append("productSubCategoryId", prodSubCat);
      prodBrand && formData.append("productBrandId", prodBrand);
      values?.uomId && formData.append("uomId", values.uomId);
      values?.uomValue && formData.append("uomValue", values.uomValue);
      values?.productSalePrice &&
        formData.append("productSalePrice", values.productSalePrice);
      values?.reorderQuantity &&
        formData.append("reorderQuantity", values.reorderQuantity);
      prodDescription && formData.append("description", prodDescription);

      if (values.productVat) {
        formData.append("productVatId", values.productVat);
      }
      if (values.discountId) {
        formData.append("discountId", parseInt(values.discountId));
      }

      shippingChargeComment &&
        formData.append("shippingChargeComment", shippingChargeComment);

      const resp = await dispatch(addProduct(formData));
      console.log("resp from add product", resp);
      if (resp.payload.message === "success") {
        form.resetFields();
        setSelectedColors([]);
        setProdDescription("");
        dispatch(loadProduct({ status: "true", page: 1, count: 10 }));
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

  const handelGalleryImageChange = ({ fileList }) => {
    setGalleryFileList(fileList);
  };

  const onChange = async (e) => {
    setSKUValid("loading");
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (e.target.value !== "") {
      debounceTimeoutRef.current = setTimeout(async () => {
        const query = queryGenerator({
          query: "sku",
          key: e.target.value,
        });
        try {
          const { data } = await axios.get(`product?${query}`);
          if (data) {
            setSKUValid(data.status);
          }
        } catch (err) {}
      }, 500);
    } else {
      setSKUValid("");
    }
  };

  let props = {};
  if (SKUValid === "true") {
    props = {
      validateStatus: "error",
      help: "Sku already exists",
    };
  } else if (SKUValid === "false") {
    props = {
      validateStatus: "success",
      help: "Sku available",
    };
  } else if (SKUValid === "loading") {
    props = {
      validateStatus: "validating",
      help: "Validating Sku...",
    };
  }
  return (
    <>
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
        autoComplete="off">
        <Form.Item
          style={{ marginBottom: "15px" }}
          label="Name"
          name="name"
          rules={[
            {
              required: true,
              message: "Please input Product name!",
            },
          ]}>
          <Input />
        </Form.Item>
        <div className="flex flex-col sm:flex-row gap-3">
          <Form.Item
            style={{ marginBottom: "15px" }}
            name="productSubCategoryId"
            className="w-full sm:w-1/2"
            label={
              <>
                Subcategory
                <BigDrawer title={"Sub Category"}>
                  <AddProductCategory drawer={true} />
                </BigDrawer>
              </>
            }>
            <Select
              name="productSubCategoryId"
              loading={!subCategory}
              showSearch
              placeholder="Select Subcategory"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              onChange={prodSubCatHandler}>
              {subCategory &&
                subCategory.map((subcat) => (
                  <Select.Option key={subcat.id} value={subcat.id}>
                    {subcat.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "15px" }}
            name="productBrandId"
            className="w-full sm:w-1/2"
            label={
              <>
                Brand
                <BigDrawer title="new Brand">
                  <AddProductBrand drawer={true} />
                </BigDrawer>
              </>
            }>
            <Select
              name="productBrandId"
              loading={!brand}
              showSearch
              placeholder="Select Brand"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              onChange={prodBrandHandler}>
              {brand &&
                brand.map((brandSingle) => (
                  <Select.Option key={brandSingle.id} value={brandSingle.id}>
                    {brandSingle.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Form.Item
            style={{ marginBottom: "15px" }}
            name="uomId"
            className="w-full sm:w-1/2"
            label={
              <>
                UoM
                <BigDrawer title={"UoM"}>
                  <AddUoM />
                </BigDrawer>
              </>
            }>
            <Select
              name="uomId"
              loading={uomLoading}
              showSearch
              placeholder="Select UoM "
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }>
              {uomList &&
                uomList.map((uom) => (
                  <Select.Option key={uom} value={uom?.id}>
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
            className="w-full sm:w-1/2"
            name="productSalePrice">
            <Input type="number" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "15px" }}
            label="Reorder Quantity"
            className="w-full sm:w-1/2"
            name="reorderQuantity">
            <InputNumber size="small" />
          </Form.Item>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="SKU No"
            name="sku"
            className="w-full sm:w-1/2"
            hasFeedback
            required
            {...props}
            rules={[
              {
                validator: () => {
                  return new Promise((resolve, reject) => {
                    if (SKUValid === "true") {
                      reject("This Sku already in use!");
                    } else if (SKUValid === "false") {
                      resolve();
                    } else {
                      reject("Please enter the Sku!");
                    }
                  });
                },
              },
            ]}>
            <Input onChange={onChange} />
          </Form.Item>
          {color?.length && (
            <Form.Item
              style={{ marginBottom: "15px" }}
              label="Colors"
              className="w-full sm:w-1/2">
              <ColorDropdown
                data={color}
                selectedColors={selectedColors}
                colorsHandler={colorsHandler}
              />
            </Form.Item>
          )}
        </div>
        {attribute?.length ? (
          <Form.Item style={{ marginBottom: "15px" }} label="Attributes">
            <AttributesDropdown
              data={attribute}
              attributes={selectedAttributes}
              attributesHandler={attributesHandler}
            />
          </Form.Item>
        ) : (
          <Form.Item style={{ marginBottom: "15px" }} label="Attributes">
            <Select />
          </Form.Item>
        )}
        {selectedAttributes?.map((item) => (
          <Form.Item
            key={item.id}
            style={{ marginBottom: "15px" }}
            label={item.name}
            name={item.name.toLowerCase()}>
            <AttributeValueDropdown
              name={item.name}
              data={item.productAttributeValue}
              attributeValueHandler={attributeValueHandler}
              attributeValue={attributeValue}
            />
          </Form.Item>
        ))}
        <div className="flex gap-3">
          <Form.Item
            label="Images"
            valuePropName="gallery_image"
            className="w-full"
            tooltip="First image will be used as product Thumbnail image. Maximum number of images is 9 and each image should be less than 2MB.">
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              name="image"
              fileList={galleryFileList}
              maxCount={9}
              multiple
              onChange={handelGalleryImageChange}
              accept="image/png, image/jpg, image/jpeg">
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
            label={
              <>
                Discount
                <BigDrawer title={"Discount"}>
                  <AddDiscount />
                </BigDrawer>
              </>
            }
            className="w-full sm:w-1/2"
            name="discountId">
            <Select
              name="discountId"
              loading={!discount} // Also fixed: was incorrectly set to {!brand}
              showSearch
              placeholder="Select discount"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              // Removed: onChange={prodBrandHandler}  // This was causing the bug
              allowClear>
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
          {vatTaxList && (
            <Form.Item
              style={{ marginBottom: "15px" }}
              label={
                <>
                  Vat/Tax
                  <BigDrawer title={"Vat/Tax"}>
                    <AddVatTax />
                  </BigDrawer>
                </>
              }
              className="w-full sm:w-1/2"
              name="productVat">
              <Select
                allowClear
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
          )}
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
            type="primary"
            htmlType="submit"
            shape="round"
            loading={loader}>
            Create Product
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default AddProduct;
