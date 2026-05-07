import { loadAllAccount } from "@/redux/rtk/features/account/accountSlice";
import { addSale } from "../../redux/rtk/features/sale/saleSlice";
import { loadAllTermsAndConditions } from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";
import { Button, Form, Input, Select, DatePicker, Card, Divider, message } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useCallback, useMemo } from "react";
import Payments from "./Payments";
import { useNavigate } from "react-router-dom";
import { CalendarOutlined, FileTextOutlined, UserOutlined, UserAddOutlined } from "@ant-design/icons";
import BigDrawer from "../Drawer/BigDrawer";
import AddCust from "../customer/AddCustomer";
import AddTermsAndConditions from "../TermsAndConditions/AddTermsAndConditions";

// Custom hook for loading initial data
const useInitialData = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(loadAllTermsAndConditions());
        dispatch(loadAllAccount());
    }, [dispatch]);
};

// Custom hook for getting user ID
const useUserId = () => {
    return useMemo(() => parseInt(localStorage.getItem("id") || "0"), []);
};

// Minimalist Summary Row Component
const SummaryRow = ({ label, amount, isBold = false, isNegative = false }) => {
    return (
        <div className="flex justify-between items-center py-1.5">
            <span className={`${isBold ? "text-gray-900 font-semibold text-base" : "text-gray-600 text-sm"}`}>
                {label}
            </span>
            <span className={`${isBold ? "text-gray-900 font-bold text-xl" : isNegative ? "text-red-500 text-sm" : "text-gray-800 text-sm"}`}>
                {isNegative ? "-" : ""}${Math.abs(amount).toFixed(2)}
            </span>
        </div>
    );
};

export default function PaymentSidebar({
    form,
    productForm,
    totalTaxAmount,
    total,
    totalPayable,
    totalDiscount,
    totalCalculator,
    due,
    allCustomer,
    onUserEdit, // accept prop
    handleSuccessReset, // accept prop
}) {
    // helper to round to 2 decimals for comparisons
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [selectedTermsAndConditions, setSelectedTermsAndConditions] = useState("");
    const [isEditingTerms, setIsEditingTerms] = useState(false);
    const [isCustomerLoading, setIsCustomerLoading] = useState(true);

    const userId = useUserId();
    useInitialData();

    const { list: termsAndConditions, loading } = useSelector(
        (state) => state.termsAndConditions
    );
    const { list: accounts } = useSelector((state) => state.accounts);

    // set default paidAmount when accounts load (existing)
    useEffect(() => {
        if (accounts && accounts.length > 0) {
            const currentPaidAmount = form.getFieldValue('paidAmount') || [];
            if (currentPaidAmount.length === 0) {
                const cashAccount = accounts.find(acc => acc.name.toLowerCase() === 'cash');
                const selectedAccount = cashAccount || accounts[0];
                if (selectedAccount) {
                    form.setFieldsValue({
                        paidAmount: [{ paymentType: selectedAccount.id, amount: 0 }]
                    });
                }
            }
        }
    }, [accounts, form]);

    useEffect(() => {
        if (termsAndConditions && termsAndConditions.length > 0 && !selectedTermsAndConditions) {
            const firstTerm = termsAndConditions[0];
            setSelectedTermsAndConditions(firstTerm.subject);
            form.setFieldsValue({ termsAndConditions: firstTerm.subject });
        }
    }, [termsAndConditions, form, selectedTermsAndConditions]);

    useEffect(() => {
        if (allCustomer && allCustomer.length > 0) {
            const walkInCustomer = allCustomer.find(cust => cust.username.toLowerCase() === 'walk-in');
            if (walkInCustomer) {
                productForm.setFieldsValue({ customerId: walkInCustomer.id });
            }
            setIsCustomerLoading(false);
        }
    }, [allCustomer, productForm]);

    const onFormSubmit = useCallback(async (values) => {
        try {
            await productForm.validateFields(["customerId", "date"]);

            // Calculate total paid amount
            const totalPaid = (values.paidAmount || []).reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);


            const products = productForm
                ?.getFieldValue("saleInvoiceProduct")
                ?.map((p) => {
                    const quantity = p?.productQuantity || 0;
                    const price = p?.productSalePrice || 0;
                    const obj = {
                        productId: p.productId,
                        productQuantity: p.productQuantity,
                        productUnitSalePrice: p.productSalePrice,
                        tax: p.productVat,
                    };
                    obj.productDiscount = p.productDiscount;
                    if (p.discountType === "percentage") {
                        obj.productDiscount = Number(((price * quantity * p?.productDiscount) / 100).toFixed(2));
                    }
                    return obj;
                });

            const data = {
                ...values,
                customerId: productForm.getFieldValue("customerId"),
                date: productForm.getFieldValue("date") ? productForm.getFieldValue("date").format("YYYY-MM-DD") : null,
                paidAmount: values.paidAmount || [],
                saleInvoiceProduct: products,
                userId,
            };

            const resp = await dispatch(addSale(data));
            if (resp.payload.message === "success") {
                if (typeof handleSuccessReset === "function") {
                    handleSuccessReset();
                }
            }
        } catch (e) {
            console.error("Error submitting form:", e);
        }
    }, [dispatch, form, navigate, productForm, userId, totalPayable]);

    const handleTermsSelect = useCallback((value) => {
        setSelectedTermsAndConditions(value);
        setIsEditingTerms(true);
    }, []);

    const handleCancelTermsEdit = useCallback(() => {
        setIsEditingTerms(false);
        if (termsAndConditions && termsAndConditions.length > 0) {
            const firstTerm = termsAndConditions[0];
            setSelectedTermsAndConditions(firstTerm.subject);
            form.setFieldsValue({ termsAndConditions: firstTerm.subject });
        }
    }, [termsAndConditions, form]);

    const handleTermsChange = useCallback((e) => {
        setSelectedTermsAndConditions(e.target.value);
    }, []);
    return (
        <div className="h-full overflow-y-auto">
            <div className="p-3 sm:p-5 space-y-4">
                {/* Top Section: Customer, Date, Terms */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 gap-4 mb-2">
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                                    <UserOutlined className="text-gray-500 text-xs" />
                                    Customer<span className="text-red-500">*</span>
                                    <BigDrawer
                                        title={<span className="flex items-center gap-2"><UserAddOutlined /> Add New Customer</span>}
                                    >
                                        <AddCust drawer />
                                    </BigDrawer>
                                </label>
                                <Form form={productForm} component={false}>
                                    <Form.Item
                                        name="customerId"
                                        rules={[{ required: true, message: "Please select a customer" }]}
                                        className="mb-0"
                                    >
                                        <Select
                                            loading={isCustomerLoading}
                                            showSearch
                                            placeholder="Select customer"
                                            optionFilterProp="children"
                                            className="w-full"
                                            filterOption={(input, option) =>
                                                (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {allCustomer?.map((cust) => (
                                                <Select.Option key={cust.id} value={cust.id}>
                                                    {cust.username}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Form>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                                    <CalendarOutlined className="text-gray-500 text-xs" />
                                    Date<span className="text-red-500">*</span>
                                </label>
                                <Form form={productForm} component={false}>
                                    <Form.Item
                                        name="date"
                                        rules={[{ required: true, message: "Please select date" }]}
                                        className="mb-0"
                                    >
                                        <DatePicker
                                            className="w-full"
                                            format="DD/MM/YYYY"
                                        />
                                    </Form.Item>
                                </Form>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                        <FileTextOutlined className="text-gray-500 text-xs" />
                                        Terms and Conditions
                                        <BigDrawer title={"New Terms and conditions"}>
                                            <AddTermsAndConditions drawer={true} />
                                        </BigDrawer>
                                    </label>
                                    {isEditingTerms && (
                                        <Button
                                            onClick={handleCancelTermsEdit}
                                            size="small"
                                            type="link"
                                            danger
                                            className="p-0 h-auto shadow-none"
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                                <Form form={form} component={false}>
                                    <Form.Item name="termsAndConditions" className="mb-0">
                                        {isEditingTerms ? (
                                            <Input.TextArea
                                                onChange={handleTermsChange}
                                                value={selectedTermsAndConditions}
                                                rows={2}
                                                placeholder="Enter terms"
                                                className="text-xs"
                                            />
                                        ) : (
                                            <Select
                                                loading={loading}
                                                showSearch
                                                placeholder="Select terms"
                                                onSelect={handleTermsSelect}
                                                optionFilterProp="children"
                                                value={selectedTermsAndConditions}
                                                className="w-full"
                                            >
                                                {termsAndConditions?.map((info) => (
                                                    <Select.Option key={info.id} value={info.subject}>
                                                        {info.title}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        )}
                                    </Form.Item>
                                </Form>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Combined Payment Summary and Detail Payment Section */}
                <Form
                    form={form}
                    onFinish={onFormSubmit}
                    initialValues={{ discount: 0, paidAmount: 0, vatId: [] }}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                >
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="px-3 sm:px-4 pt-3 pb-4">
                            <h3 className="text-base font-semibold text-gray-800 mb-3">Payment Summary & Details</h3>
                            <div className="space-y-0 mb-4">
                                <SummaryRow label="Subtotal" amount={total} />
                                <SummaryRow label="Tax" amount={totalTaxAmount} />
                                <SummaryRow label="Discount" amount={totalDiscount} />
                                <Divider className="my-2" />
                                <SummaryRow label="Total Payable" amount={totalPayable} isBold={true} />
                                {due !== 0 && (
                                    <SummaryRow
                                        label={due < 0 ? "Change" : "Due Amount"}
                                        amount={Math.abs(due)}
                                        isNegative={due > 0}
                                        className="mt-1"
                                    />
                                )}
                            </div>
                            <div className="mb-2">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2 sm:mb-0 sm:mt-2">
                                        Paid Amount:
                                    </h4>
                                    <div className="flex-1 lg:max-w-[60%] ">
                                        <Payments totalCalculator={totalCalculator} onUserEdit={onUserEdit} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Complete Sale Button */}
                    <Button
                        block
                        type="primary"
                        htmlType="submit"
                        size="large"
                        className="mt-4 h-12 text-base font-semibold rounded-lg"
                        style={{
                            background: "#1890ff",
                        }}
                    >
                        Complete Sale
                    </Button>
                </Form>
            </div>
        </div>
    );
}