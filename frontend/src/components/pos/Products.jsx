import useCurrency from "@/utils/useCurrency";
import { Form, Input, InputNumber, Select } from "antd";
import { CiCircleRemove } from "react-icons/ci";

export default function Products({
  totalCalculator,
  subTotal,
  form,
  selectedProduct,
  setSelectedProduct,
}) {
  const currency = useCurrency();

  const render = (index) => {
    const findId = form
      .getFieldValue("saleInvoiceProduct")
      ?.find((_, i) => i === index)?.productId;
    const findProduct = selectedProduct?.find((item) => findId === item.id);

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

    return { stock, colors, uom, id: findProduct?.id };
  };

  const handleRemoveSelected = (id) => {
    setSelectedProduct((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="products-container">
      <Form.List
        name="saleInvoiceProduct"
        rules={[
          {
            required: true,
            message: "Product is required",
          },
        ]}>
        {(fields, { remove }) => (
          <>
            <div className="max-h-[calc(100vh-280px)] overflow-auto mt-2">
              <table className="w-full">
                <thead
                  className={
                    "font-Popins text-black bg-tableHeaderBg border-gray-200 sticky top-0 z-10"
                  }>
                  <tr>
                    <th className="py-2 pl-2 text-left rounded-tl-lg">SL</th>
                    <th className="py-2 pl-2 text-left">Product</th>
                    <th className="py-2 pl-2 text-left">Quantity</th>
                    <th className="py-2 pl-2 text-left">price</th>
                    <th className="py-2 pl-2 text-left">Discount</th>
                    <th className="py-2 pl-2 text-left">Amount</th>
                    <th className="py-2 pl-2 text-left">Tax%</th>
                    <th className="py-2 pl-2 text-left">Tax</th>
                    <th className="py-2 pl-2 text-left rounded-tr-lg"></th>
                  </tr>
                </thead>
                <tbody className="bg-tableBg px-1">
                  {fields.map(({ key, name, ...restField }, index) => {
                    const indexedProduct = render(index);
                    return (
                      <tr
                        key={key}
                        className={`hover:bg-slate-900/10 py-1 ${
                          index === fields.length - 1 ? "" : "border-b"
                        }`}>
                        <td className="py-2 pl-2 align-top">{index + 1}</td>
                        <td className="py-2 pl-2 align-top">
                          <Form.Item
                            {...restField}
                            name={[name, "productName"]}
                            className="mb-0">
                            <Input disabled />
                          </Form.Item>
                          {/* <div className='px-2 text-xs'>
                            {indexedProduct.colors}
                          </div> */}
                          <div className="px-2 text-xs whitespace-nowrap">
                            {indexedProduct.uom}
                          </div>
                        </td>
                        <td className="py-2 pl-2 align-top">
                          <Form.Item
                            {...restField}
                            name={[name, "productQuantity"]}
                            className="mb-0"
                            rules={[
                              {
                                required: true,
                                message: "quantity is required",
                              },
                            ]}>
                            <InputNumber
                              style={{ width: "100%" }}
                              size={"small"}
                              placeholder="Quantity"
                              onChange={() => totalCalculator(index)}
                            />
                          </Form.Item>
                          <div className="px-2 text-xs">
                            {indexedProduct.stock}
                          </div>
                        </td>
                        <td className="py-2 pl-2 align-top">
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
                              size="small"
                              style={{ width: "100%" }}
                              placeholder="50000"
                              onChange={() => totalCalculator(index)}
                            />
                          </Form.Item>
                        </td>
                        <td className="py-2 pl-2 align-top">
                          <div className="flex items-center">
                            <Form.Item
                              {...restField}
                              name={[name, "productDiscount"]}
                              className="mb-0 max-w-[150px]"
                              rules={[
                                {
                                  required: true,
                                  message: "Discount is required",
                                },
                              ]}>
                              <InputNumber
                                className="discountType"
                                addonAfter={
                                  <Form.Item
                                    {...restField}
                                    name={[name, "discountType"]}
                                    noStyle>
                                    <Select
                                      size="small"
                                      style={{
                                        width: 50,
                                      }}
                                      defaultValue={"flat"}
                                      popupClassName="bg-white"
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
                                style={{
                                  width: "100%",
                                }}
                                size={"small"}
                                onChange={() => totalCalculator(index)}
                              />
                            </Form.Item>
                          </div>
                        </td>
                        <td className="py-2 pl-2 align-top min-w-[80px]">
                          <div className="font-weight-bold md:text-base xxs:text-xs">
                            {subTotal[index]?.subPrice?.toFixed(2) || 0}
                          </div>
                        </td>
                        <td className="py-2 pl-2 align-top min-w-[80px]">
                          <Form.Item
                            {...restField}
                            name={[name, "productVat"]}
                            className="mb-0 max-w-[100px]"
                            rules={[
                              {
                                required: true,
                                message: "Tax is required",
                              },
                            ]}>
                            <InputNumber
                              size="small"
                              style={{ width: "100%" }}
                              placeholder="50000"
                              onChange={() => totalCalculator(index)}
                            />
                          </Form.Item>
                        </td>
                        <td className="py-2 pl-2 align-top min-w-[80px]">
                          <div className="font-weight-bold md:text-base xxs:text-xs">
                            {subTotal[index]?.subVatAmount?.toFixed(2) || 0}
                          </div>
                        </td>
                        <td className="py-2 pl-2 align-top">
                          <Form.Item className="mb-0">
                            <button
                              shape="circle"
                              className="flex justify-center items-center hover:bg-black/40 rounded-md"
                              onClick={() => {
                                handleRemoveSelected(indexedProduct.id);
                                remove(name);
                                totalCalculator();
                              }}>
                              <CiCircleRemove size={25} />
                            </button>
                          </Form.Item>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {fields.length === 0 && (
              <div className="text-center py-10">No product selected yet</div>
            )}
          </>
        )}
      </Form.List>
    </div>
  );
}
