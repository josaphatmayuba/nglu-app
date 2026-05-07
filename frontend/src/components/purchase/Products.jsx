import Button from "@/UI/Button";
import { InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { Form, InputNumber, Select } from "antd";
import { CiCircleRemove } from "react-icons/ci";
import SearchForm from "./SearchForm";

export default function ProductAdd({
  form,
  productList,
  productLoading,
  totalCalculator,
  subTotal,
}) {
  const handleSetInitial = (product, serial) => {
    const productArray = form.getFieldValue("purchaseInvoiceProduct");
    const findProduct = productList.find((pro) => pro.id === product);
    const newArray = productArray.map((product, index) => {
      if (index === serial) {
        return {
          ...product,
          productQuantity: findProduct.productQuantity ? 1 : 0,
          productSalePrice: findProduct.productSalePrice,
          productPurchasePrice: findProduct.productPurchasePrice,
          tax: 0,
        };
      } else {
        return product;
      }
    });

    form.setFieldsValue({
      purchaseInvoiceProduct: newArray,
    });
    totalCalculator(serial);
  };

  const render = (index) => {
    const findId = form
      .getFieldValue("purchaseInvoiceProduct")
      ?.find((_, i) => i === index)?.productId;
    const findProduct = productList?.find((item) => findId === item.id);

    let colors = null;

    if (
      Array.isArray(findProduct?.productColor) &&
      findProduct.productColor.length > 0
    ) {
      colors = (
        <div className='flex flex-wrap gap-1'>
          <span className='mr-1'>Color: </span>
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
          <span className='mr-1'>Stock: </span>
          <span>{findProduct.productQuantity}</span>
        </span>
      );
    }

    return { stock, colors };
  };

  return (
    <div className="flex flex-col h-full">
      {/* <div className="mb-6">
        <div className="rounded-xl">
          <div className="w-full">
            <SearchForm
              className="w-full"
              form={form}
              totalCalculator={totalCalculator}
            />
          </div>
        </div>
      </div> */}
      <div className="border rounded-lg overflow-hidden mt-5">
        <Form.List
          name='purchaseInvoiceProduct'
          rules={[
            {
              required: true,
              message: "Product is required",
            },
          ]}
        >
          {(fields, { add, remove }) => (
            <>
              {/* Header - Hidden on mobile, shown on md+ */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Product</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Purchase Price</div>
                <div className="col-span-2">Selling Price</div>
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
                <div className='max-h-96 overflow-y-auto'>
                  {fields.map(({ key, name, ...restField }, index) => {
                    const indexedProduct = render(index);
                    const lineTotal =
                      (subTotal[index]?.subPrice || 0) + (subTotal[index]?.totalVat || 0);

                    return (
                      <div key={key}>
                        {/* Mobile Card Layout */}
                        <div className="md:hidden bg-white border-b p-4 space-y-3 rounded-lg shadow-sm mx-2 my-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="font-medium text-sm mb-2 block">
                                {index + 1}. Product
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productId"]}
                                className='mb-2'
                                rules={[
                                  {
                                    required: true,
                                    message: "Product is required",
                                  },
                                ]}
                              >
                                <Select
                                  placeholder='Select Product'
                                  showSearch
                                  loading={productLoading}
                                  optionFilterProp='children'
                                  filterOption={(input, option) =>
                                    option.children
                                      .toLowerCase()
                                      .includes(input.toLowerCase())
                                  }
                                  onChange={(product) => {
                                    handleSetInitial(product, index);
                                  }}
                                  size="small"
                                >
                                  {productList?.map((item) => (
                                    <Select.Option key={item.id} value={item.id}>
                                      {item.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <div className="text-xs text-gray-500">
                                {indexedProduct.colors} {indexedProduct.stock}
                              </div>
                            </div>
                            <button
                              className='ml-2 flex justify-center items-center hover:bg-red-50 rounded-md text-red-500 hover:text-red-700 p-1'
                              onClick={() => {
                                remove(name);
                                totalCalculator(index);
                              }}
                            >
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
                                className='mb-0'
                                rules={[
                                  {
                                    required: true,
                                    message: "Quantity is required",
                                  },
                                ]}
                              >
                                <InputNumber
                                  type='number'
                                  style={{ width: "100%" }}
                                  size="small"
                                  placeholder='1'
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Purchase Price
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productPurchasePrice"]}
                                className='mb-0'
                                rules={[
                                  {
                                    required: true,
                                    message: "Purchase Price is required",
                                  },
                                ]}
                              >
                                <InputNumber
                                  type='number'
                                  size='small'
                                  style={{ width: "100%" }}
                                  placeholder='50000'
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">
                                Selling Price
                              </span>
                              <Form.Item
                                {...restField}
                                name={[name, "productSalePrice"]}
                                className='mb-0'
                                rules={[
                                  {
                                    required: true,
                                    message: "Selling Price is required",
                                  },
                                ]}
                              >
                                <InputNumber
                                  type='number'
                                  size='small'
                                  style={{ width: "100%" }}
                                  placeholder='50000'
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs block">Tax%</span>
                              <Form.Item
                                {...restField}
                                name={[name, "tax"]}
                                className='mb-0'
                                rules={[
                                  {
                                    required: true,
                                    message: "Tax is required",
                                  },
                                ]}
                              >
                                <InputNumber
                                  type='number'
                                  size='small'
                                  style={{ width: "100%" }}
                                  placeholder='0'
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                              </Form.Item>
                              <div className="text-xs text-gray-500 mt-1">
                                Tax: {subTotal[index]?.totalVat?.toFixed(2) || 0}
                              </div>
                            </div>
                          </div>
                          <div className="text-right font-semibold text-base border-t pt-2">
                            Amount: {lineTotal?.toFixed(2) || 0}
                          </div>
                        </div>

                        {/* Desktop Grid Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b hover:bg-gray-50 text-xs items-center">
                          <div className="col-span-1">{index + 1}</div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productId"]}
                              className='mb-0'
                              rules={[
                                {
                                  required: true,
                                  message: "Product is required",
                                },
                              ]}
                            >
                              <Select
                                placeholder='Select Product'
                                showSearch
                                loading={productLoading}
                                optionFilterProp='children'
                                filterOption={(input, option) =>
                                  option.children
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                                onChange={(product) => {
                                  handleSetInitial(product, index);
                                }}
                                size="small"
                              >
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
                              className='mb-0'
                              rules={[
                                {
                                  required: true,
                                  message: "Quantity is required",
                                },
                              ]}
                            >
                              <InputNumber
                                type='number'
                                style={{ width: "100%" }}
                                size="small"
                                placeholder='1'
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productPurchasePrice"]}
                              className='mb-0'
                              rules={[
                                {
                                  required: true,
                                  message: "Purchase Price is required",
                                },
                              ]}
                            >
                              <InputNumber
                                  type='number'
                                  size='small'
                                  style={{ width: "100%" }}
                                  placeholder='50000'
                                  controls={false}
                                  onChange={() => totalCalculator(index)}
                                />
                            </Form.Item>
                          </div>
                          <div className="col-span-2">
                            <Form.Item
                              {...restField}
                              name={[name, "productSalePrice"]}
                              className='mb-0'
                              rules={[
                                {
                                  required: true,
                                  message: "Selling Price is required",
                                },
                              ]}
                            >
                              <InputNumber
                                type='number'
                                size='small'
                                style={{ width: "100%" }}
                                placeholder='50000'
                                controls={false}
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-span-1">
                            {subTotal[index]?.subPrice?.toFixed(2) || 0}
                          </div>
                          <div className="col-span-1">
                            <Form.Item
                              {...restField}
                              name={[name, "tax"]}
                              className='mb-0'
                              rules={[
                                {
                                  required: true,
                                  message: "Tax is required",
                                },
                              ]}
                            >
                              <InputNumber
                                type='number'
                                size='small'
                                style={{ width: "100%" }}
                                placeholder='0'
                                controls={false}
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              className='flex justify-center items-center hover:bg-red-50 rounded-md text-red-500  p-1'
                              onClick={() => {
                                remove(name);
                                totalCalculator(index);
                              }}
                            >
                              <CiCircleRemove size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className='flex justify-center mt-4 mb-4'>
                <Button
                  onClick={() => add()}
                  className='w-48'
                  block
                  icon={<PlusOutlined />}
                  type="button"
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
