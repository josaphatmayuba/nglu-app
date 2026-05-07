import Button from "@/UI/Button";
import useCurrency from "@/utils/useCurrency";
import { InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { Form, InputNumber, Select } from "antd";
import toast from "react-hot-toast";
import { CiCircleRemove } from "react-icons/ci";
import { useSelector } from "react-redux"; // Added import for useSelector
import SearchForm from "../../UI/Search";

export default function ProductAdd({
  form,
  productList,
  productLoading,
  totalCalculator,
  subTotal,
}) {
  const currency = useCurrency();
  const { data: settings } = useSelector((state) => state.setting) || {}; // Added settings from Redux
  const isDiscountEnabled = settings?.isDiscount === "true"; // Added discount enable check
  const isTaxEnabled = settings?.isTax === "true"; // Added tax enable check

  const handleSetInitial = (product, serial) => {
    const productArray = form.getFieldValue("saleInvoiceProduct");
    const findProduct = productList.find((pro) => pro.id === product);
    if (findProduct.productQuantity === 0) {
      toast.error("Product is out of stock");
    }
    const newArray = productArray.map((product, index) => {
      if (index === serial) {
        const data = {
          ...product,
          productQuantity: findProduct.productQuantity ? 1 : 0,
          productSalePrice: findProduct.productSalePrice,
          productVat: findProduct.productVat
            ? findProduct.productVat.percentage
            : 0,
          productDiscount: findProduct.discount?.value
            ? parseInt(findProduct.discount?.value)
            : 0,
          discountType: findProduct.discount?.type || "flat",
        };

        return data;
      } else {
        return product;
      }
    });

    form.setFieldsValue({
      saleInvoiceProduct: newArray,
    });
    totalCalculator();
  };

  const render = (index) => {
    const findId = form
      .getFieldValue("saleInvoiceProduct")
      ?.find((_, i) => i === index)?.productId;
    const findProduct = productList?.find((item) => findId === item.id);

    let colors = null;

    if (
      Array.isArray(findProduct?.productColor) &&
      findProduct.productColor.length > 0
    ) {
      colors = (
        <div className="flex flex-wrap gap-1">
          <span className="mr-1">Color: </span>
          {findProduct.productColor.map((item, index) => (
            <span key={item.id}>
              {item.color?.name}
              {index !== findProduct.productColor.length - 1 && ","}
            </span>
          ))}
        </div>
      );
    }

    let stock = null;
    if (findProduct?.productQuantity) {
      stock = (
        <span>
          <span className="mr-1">Stock: </span>
          <span>{findProduct.productQuantity}</span>
        </span>
      );
    }

    let uom = null;
    if (findProduct?.uom?.name) {
      uom = (
        <span>
          <span className="mr-1">UoM: </span>
          <span>{`${findProduct?.uomValue}/${findProduct?.uom?.name}`}</span>
        </span>
      );
    }

    return { stock, colors, uom };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="rounded-xl">
          <div className="w-full mt-5">
            <SearchForm
              className="w-full"
              form={form}
              totalCalculator={totalCalculator}
            />
          </div>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Form.List
          name="saleInvoiceProduct"
          rules={[
            {
              required: true,
              message: "Product is required",
            },
          ]}>
          {(fields, { add, remove }) => (
            <>
              {/* Header - Hidden on mobile, shown on md+ */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Product</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Discount</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-1">Tax%</div>
                <div className="col-span-1"></div>
              </div>

              {/* Body */}
              {fields.length === 0 ? (
                <div className="text-center py-12">
                  <InboxOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                  <p className="mt-2 text-gray-500">No products selected</p>
                  <p className="text-sm text-gray-400">
                    Start adding products to build your invoice
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {fields.map(({ key, name, ...restField }, index) => {
                    const indexedProduct = render(index);
                    const lineTotal =
                      (subTotal[index]?.subPrice || 0) +
                      (subTotal[index]?.subVatAmount || 0);

                    const unitPrice =
                      form.getFieldValue([
                        "saleInvoiceProduct",
                        name,
                        "productSalePrice",
                      ]) || 0;
                    const discount =
                      form.getFieldValue([
                        "saleInvoiceProduct",
                        name,
                        "productDiscount",
                      ]) || 0;
                    const discountType =
                      form.getFieldValue([
                        "saleInvoiceProduct",
                        name,
                        "discountType",
                      ]) || "flat";
                    const tax =
                      form.getFieldValue([
                        "saleInvoiceProduct",
                        name,
                        "productVat",
                      ]) || 0;

                    return (
                      <div key={key}>
                        {/* Mobile Card Layout - Simplified like SelectedProductsList */}
                        <div className="md:hidden bg-white border-b p-4 space-y-3 rounded-lg shadow-sm mx-2 my-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="font-medium text-sm mb-2 block">
                                {index + 1}. Product
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productId"]}
                                className="mb-2"
                                rules={[
                                  {
                                    required: true,
                                    message: "Product is required",
                                  },
                                ]}>
                                <Select
                                  placeholder="Select Product"
                                  showSearch
                                  loading={productLoading}
                                  optionFilterProp="children"
                                  filterOption={(input, option) =>
                                    option.children
                                      .toLowerCase()
                                      .includes(input.toLowerCase())
                                  }
                                  onChange={(product) => {
                                    handleSetInitial(product, index);
                                  }}
                                  size="small">
                                  {productList?.map((item) => (
                                    <Select.Option
                                      key={item.id}
                                      value={item.id}>
                                      {item.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <div className="text-xs text-gray-500">
                                {indexedProduct.colors} {indexedProduct.uom}{" "}
                                {indexedProduct.stock}
                              </div>
                            </div>
                            <button
                              className="ml-2 flex justify-center items-center hover:bg-red-50 rounded-md text-red-500 hover:text-red-700 p-1"
                              onClick={() => {
                                remove(name);
                                totalCalculator(index);
                              }}>
                              <CiCircleRemove size={20} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Quantity
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productQuantity"]}
                                className="mb-0"
                                rules={[
                                  {
                                    required: true,
                                    message: "Quantity is required",
                                  },
                                ]}>
                                <InputNumber
                                  type="number"
                                  style={{ width: "100%" }}
                                  size="small"
                                  placeholder="1"
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Price
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productSalePrice"]}
                                className="mb-0"
                                rules={[
                                  {
                                    required: true,
                                    message: "Price is required",
                                  },
                                ]}>
                                <InputNumber
                                  type="number"
                                  size="small"
                                  style={{ width: "100%" }}
                                  placeholder="50000"
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Discount
                              </span>
                              {isDiscountEnabled ? (
                                <Form.Item
                                  {...restField}
                                  name={[name, "productDiscount"]}
                                  className="mb-0"
                                  rules={[
                                    {
                                      required: true,
                                      message: "Discount is required",
                                    },
                                  ]}>
                                  <InputNumber
                                    type="number"
                                    addonAfter={
                                      <Form.Item
                                        {...restField}
                                        name={[name, "discountType"]}
                                        noStyle>
                                        <Select
                                          size="small"
                                          style={{ width: 50 }}
                                          defaultValue="flat"
                                          onChange={() =>
                                            totalCalculator(index)
                                          }>
                                          <Select.Option key="flat">
                                            <span
                                              dangerouslySetInnerHTML={{
                                                __html:
                                                  currency?.currencySymbol,
                                              }}
                                            />
                                          </Select.Option>
                                          <Select.Option key="percentage">
                                            %
                                          </Select.Option>
                                        </Select>
                                      </Form.Item>
                                    }
                                    placeholder="0"
                                    style={{ width: "100%" }}
                                    size="small"
                                    controls={false}
                                    onChange={() => totalCalculator(index)}
                                  />
                                </Form.Item>
                              ) : (
                                <span className="font-medium">
                                  {discount || 0}
                                  {discountType === "percentage" ? (
                                    "%"
                                  ) : (
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: currency?.currencySymbol,
                                      }}
                                    />
                                  )}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Tax%
                              </span>
                              {isTaxEnabled ? (
                                <Form.Item
                                  {...restField}
                                  name={[name, "productVat"]}
                                  className="mb-0"
                                  rules={[
                                    {
                                      required: true,
                                      message: "Tax is required",
                                    },
                                  ]}>
                                  <InputNumber
                                    type="number"
                                    size="small"
                                    style={{ width: "100%" }}
                                    placeholder="0"
                                    controls={false}
                                    onChange={() => totalCalculator(index)}
                                  />
                                </Form.Item>
                              ) : (
                                <span className="font-medium text-purple-600">
                                  {tax}%
                                </span>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Tax:{" "}
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                                {subTotal[index]?.subVatAmount?.toFixed(2) || 0}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-semibold text-base border-t pt-2">
                            Amount:{" "}
                            <span
                              dangerouslySetInnerHTML={{
                                __html: currency?.currencySymbol,
                              }}
                            />
                            {lineTotal?.toFixed(2) || 0}
                          </div>
                        </div>

                        {/* Desktop Grid Layout - Cleaner like ProductsForSale */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b hover:bg-gray-50 text-xs items-center">
                          <div className="col-span-1">{index + 1}</div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productId"]}
                              className="mb-0"
                              rules={[
                                {
                                  required: true,
                                  message: "Product is required",
                                },
                              ]}>
                              <Select
                                placeholder="Select Product"
                                showSearch
                                loading={productLoading}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                  option.children
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                                onChange={(product) => {
                                  handleSetInitial(product, index);
                                }}
                                size="small">
                                {productList?.map((item) => (
                                  <Select.Option key={item.id} value={item.id}>
                                    {item.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productQuantity"]}
                              className="mb-0"
                              rules={[
                                {
                                  required: true,
                                  message: "Quantity is required",
                                },
                              ]}>
                              <InputNumber
                                type="number"
                                style={{ width: "100%" }}
                                size="small"
                                placeholder="1"
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                            <div className="text-xs text-gray-500 mt-1">
                              {indexedProduct.stock}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productSalePrice"]}
                              className="mb-0"
                              rules={[
                                {
                                  required: true,
                                  message: "Price is required",
                                },
                              ]}>
                              <InputNumber
                                type="number"
                                size="small"
                                style={{ width: "100%" }}
                                placeholder="50000"
                                controls={false}
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-span-2">
                            {isDiscountEnabled ? (
                              <Form.Item
                                {...restField}
                                name={[name, "productDiscount"]}
                                className="mb-0"
                                rules={[
                                  {
                                    required: true,
                                    message: "Discount is required",
                                  },
                                ]}>
                                <InputNumber
                                  type="number"
                                  addonAfter={
                                    <Form.Item
                                      {...restField}
                                      name={[name, "discountType"]}
                                      noStyle>
                                      <Select
                                        size="small"
                                        style={{ width: 50 }}
                                        defaultValue="flat"
                                        onChange={() => totalCalculator(index)}>
                                        <Select.Option key="flat">
                                          <span
                                            dangerouslySetInnerHTML={{
                                              __html: currency?.currencySymbol,
                                            }}
                                          />
                                        </Select.Option>
                                        <Select.Option key="percentage">
                                          %
                                        </Select.Option>
                                      </Select>
                                    </Form.Item>
                                  }
                                  placeholder="0"
                                  style={{ width: "100%" }}
                                  size="small"
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            ) : (
                              <span className="text-sm">
                                {discount || 0}
                                {discountType === "percentage" ? (
                                  "%"
                                ) : (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: currency?.currencySymbol,
                                    }}
                                  />
                                )}
                              </span>
                            )}
                          </div>
                          <div className="col-span-1">
                            <span
                              dangerouslySetInnerHTML={{
                                __html: currency?.currencySymbol,
                              }}
                            />
                            {subTotal[index]?.subPrice?.toFixed(2) || 0}
                          </div>
                          <div className="col-span-1">
                            {isTaxEnabled ? (
                              <Form.Item
                                {...restField}
                                name={[name, "productVat"]}
                                className="mb-0"
                                rules={[
                                  {
                                    required: true,
                                    message: "Tax is required",
                                  },
                                ]}>
                                <InputNumber
                                  type="number"
                                  size="small"
                                  style={{ width: "100%" }}
                                  placeholder="0"
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            ) : (
                              <span className="text-sm text-purple-600">
                                {tax}%
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              className="flex justify-center items-center hover:bg-red-50 rounded-md text-red-500  p-1"
                              onClick={() => {
                                remove(name);
                                totalCalculator(index);
                              }}>
                              <CiCircleRemove size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-center mt-4 mb-4">
                <Button
                  onClick={() => add()}
                  className="w-48"
                  block
                  icon={<PlusOutlined />}
                  type="button" // Add this to prevent form submission on click
                >
                  Add Product
                </Button>
              </div>
            </>
          )}
        </Form.List>
      </div>
    </div>
  );
}
