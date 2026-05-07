import useCurrency from "@/utils/useCurrency";
import { Form, InputNumber, Select } from "antd";
import { CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { CiCircleRemove } from "react-icons/ci";

export default function SelectedProductsList({
    form,
    subTotal,
    totalCalculator,
    selectedProduct,
    setSelectedProduct,
}) {
    const currency = useCurrency();
    const { data: settings } = useSelector((state) => state.setting) || {};
    const isDiscountEnabled = settings?.isDiscount === "true";
    const isTaxEnabled = settings?.isTax === "true";

    const rowMeta = (index) => {
        const id = form.getFieldValue(["saleInvoiceProduct", index, "productId"]);
        const p = selectedProduct?.find((x) => x.id === id);
        return {
            id: p?.id,
            name: form.getFieldValue(["saleInvoiceProduct", index, "productName"]),
            sku: p?.sku,
            uom: p?.uom?.name && p?.uomValue ? `${p?.uomValue}/${p?.uom?.name}` : null,
            stock: p?.productQuantity,
            image: p?.productThumbnailImageUrl || "",
        };
    };

    const removeFromSelectedState = (id) => {
        setSelectedProduct((prev) => prev.filter((x) => x.id !== id));
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <Form.List name="saleInvoiceProduct" rules={[{ required: true, message: "Product is required" }]}>
                {(fields, { remove }) => (
                    <>
                        {/* Header - Hidden on mobile, shown on md+ */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                            <div className="col-span-1">#</div>
                            <div className="col-span-2">Product</div>
                            <div className="col-span-2">Unit Price</div>
                            <div className="col-span-2">Quantity</div>
                            <div className="col-span-2">Discount</div>
                            <div className="col-span-1">Tax %</div>
                            <div className="col-span-1">Total</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Body */}
                        {fields.length === 0 ? (
                            <div className="text-center py-12">
                                <InboxOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                                <p className="mt-2 text-gray-500">No products selected</p>
                                <p className="text-sm text-gray-400">Start adding products to build your invoice</p>
                            </div>
                        ) : (
                            <div className="max-h-96 overflow-y-auto">
                                {fields.map(({ key, name, ...restField }, index) => {
                                    const meta = rowMeta(index);
                                    const lineTotal = (subTotal[index]?.subPrice || 0) + (subTotal[index]?.subVatAmount || 0);

                                    const unitPrice = form.getFieldValue(["saleInvoiceProduct", name, "productSalePrice"]) || 0;
                                    const discount = form.getFieldValue(["saleInvoiceProduct", name, "productDiscount"]) || 0;
                                    const discountType = form.getFieldValue(["saleInvoiceProduct", name, "discountType"]) || "flat";
                                    const tax = form.getFieldValue(["saleInvoiceProduct", name, "productVat"]) || 0;

                                    return (
                                        <div key={key}>
                                            {/* Mobile Card Layout - Shows as a list of cards on responsive (mobile) screens */}
                                            <div className="md:hidden bg-white border-b p-4 space-y-2 rounded-lg shadow-sm mx-2 my-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-base">
                                                        {index + 1}. {meta.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            removeFromSelectedState(meta.id);
                                                            remove(name);
                                                            totalCalculator();
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                    >
                                                        <CiCircleRemove size={20} />
                                                    </button>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {meta.sku && `SKU: ${meta.sku}`} {meta.uom && ` • ${meta.uom}`} {meta.stock !== undefined && ` • Stock: ${meta.stock}`}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-600">Unit Price</span>
                                                        <Form.Item {...restField} name={[name, "productSalePrice"]} className="mb-0">
                                                            <InputNumber
                                                                min={0}
                                                                step={0.01}
                                                                controls={false}
                                                                size="small"
                                                                className="w-full"
                                                                formatter={(val) => (val === undefined || val === null || val === "" ? "" : Number(val).toFixed(2))}
                                                                parser={(val) => (val ? val.replace(/[^\d.-]/g, "") : "")}
                                                                onChange={() => totalCalculator(index)}
                                                            />
                                                        </Form.Item>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-600">Quantity</span>
                                                        <Form.Item {...restField} name={[name, "productQuantity"]} className="mb-0">
                                                            <InputNumber min={0} max={1000} size="small" className="w-full" controls={true} onChange={() => totalCalculator(index)} />
                                                        </Form.Item>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-600">Discount</span>
                                                        {isDiscountEnabled ? (
                                                            <Form.Item {...restField} name={[name, "productDiscount"]} className="mb-0">
                                                                <InputNumber
                                                                    size="small"
                                                                    className="w-full"
                                                                    placeholder="0"
                                                                    controls={false}
                                                                    addonAfter={
                                                                        <Form.Item {...restField} name={[name, "discountType"]} noStyle>
                                                                            <Select
                                                                                size="small"
                                                                                style={{ width: 50 }}
                                                                                defaultValue="flat"
                                                                                onChange={() => totalCalculator(index)}
                                                                            >
                                                                                <Select.Option value="flat">
                                                                                    <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />
                                                                                </Select.Option>
                                                                                <Select.Option value="percentage">%</Select.Option>
                                                                            </Select>
                                                                        </Form.Item>
                                                                    }
                                                                    onChange={() => totalCalculator(index)}
                                                                />
                                                            </Form.Item>
                                                        ) : (
                                                            <span className="font-medium">
                                                                {discount || 0}
                                                                {discountType === "percentage" ? "%" : <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-600">Tax</span>
                                                        {isTaxEnabled ? (
                                                            <Form.Item {...restField} name={[name, "productVat"]} className="mb-0">
                                                                <InputNumber size="small" className="w-full" controls={false} placeholder="0" onChange={() => totalCalculator(index)} />
                                                            </Form.Item>
                                                        ) : (
                                                            <span className="font-medium text-purple-600">{tax}%</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right font-semibold text-lg border-t pt-2">
                                                    Total: <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />
                                                    {lineTotal.toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Desktop Grid Layout - Shows table on larger screens */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b hover:bg-gray-50 text-sm">
                                                {/* Serial */}
                                                <div className="col-span-1 flex items-center">{index + 1}</div>

                                                {/* Product Info */}
                                                <div className="col-span-2 flex flex-col">
                                                    <span className="font-medium">{meta.name}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {meta.sku && `${meta.sku}`}
                                                        {meta.sku && meta.uom && " • "}
                                                        {meta.uom && `${meta.uom}`}
                                                        {meta.stock !== undefined && ` • Stock: ${meta.stock}`}
                                                    </span>
                                                </div>

                                                {/* Unit Price */}
                                                <div className="col-span-2 flex items-center">
                                                    <span className="mr-2" dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />
                                                    <Form.Item {...restField} name={[name, "productSalePrice"]} className="mb-0 w-full">
                                                        <InputNumber
                                                            min={0}
                                                            step={0.01}
                                                            controls={false}
                                                            size="small"
                                                            className="w-[100px]"
                                                            formatter={(val) => (val === undefined || val === null || val === "" ? "" : Number(val).toFixed(2))}
                                                            parser={(val) => (val ? val.replace(/[^\d.-]/g, "") : "")}
                                                            onChange={() => totalCalculator(index)}
                                                        />
                                                    </Form.Item>
                                                </div>

                                                {/* Quantity */}
                                                <div className="col-span-2 flex items-center">
                                                    <Form.Item
                                                        {...restField}
                                                        name={[name, "productQuantity"]}
                                                        className="mb-0"
                                                        rules={[{ required: true, message: "Required" }]}
                                                    >
                                                        <InputNumber
                                                            min={0}
                                                            max={1000}
                                                            size="small"
                                                            className="w-[80px]"
                                                            controls={true}
                                                            onChange={() => totalCalculator(index)}
                                                        />
                                                    </Form.Item>
                                                </div>

                                                {/* Discount */}
                                                <div className="col-span-2 flex items-center text-sm">
                                                    {isDiscountEnabled ? (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, "productDiscount"]}
                                                            className="mb-0"
                                                            rules={[{ required: true, message: "Required" }]}
                                                        >
                                                            <InputNumber
                                                                size="small"
                                                                className="w-full"
                                                                placeholder="0"
                                                                controls={false}
                                                                addonAfter={
                                                                    <Form.Item {...restField} name={[name, "discountType"]} noStyle>
                                                                        <Select
                                                                            size="small"
                                                                            style={{ width: 50 }}
                                                                            defaultValue="flat"
                                                                            onChange={() => totalCalculator(index)}
                                                                        >
                                                                            <Select.Option value="flat">
                                                                                <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />
                                                                            </Select.Option>
                                                                            <Select.Option value="percentage">%</Select.Option>
                                                                        </Select>
                                                                    </Form.Item>
                                                                }
                                                                onChange={() => totalCalculator(index)}
                                                            />
                                                        </Form.Item>
                                                    ) : (
                                                        <span className="text-sm">
                                                            {discount || 0}
                                                            {discountType === "percentage" ? "%" : <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Tax */}
                                                <div className="col-span-1 flex items-center text-sm">
                                                    {isTaxEnabled ? (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, "productVat"]}
                                                            className="mb-0 "
                                                            rules={[{ required: true, message: "Required" }]}
                                                        >
                                                            <InputNumber size="small" className="w-[50px]" controls={false} placeholder="0" onChange={() => totalCalculator(index)} />
                                                        </Form.Item>
                                                    ) : (
                                                        <span className="text-sm text-purple-600">{tax}%</span>
                                                    )}
                                                </div>

                                                {/* Line Total */}
                                                <div className="col-span-1 flex items-center text-sm">
                                                    <span dangerouslySetInnerHTML={{ __html: currency?.currencySymbol }} />
                                                    {lineTotal.toFixed(2)}
                                                </div>

                                                {/* Delete */}
                                                <div className="col-span-1 flex justify-center">
                                                    <button
                                                        className='flex justify-center items-center  rounded-md text-red-500 hover:text-red-700 p-1'
                                                        onClick={() => {
                                                            removeFromSelectedState(meta.id);
                                                            remove(name);
                                                            totalCalculator();
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
                    </>
                )}
            </Form.List>
        </div>
    );
}