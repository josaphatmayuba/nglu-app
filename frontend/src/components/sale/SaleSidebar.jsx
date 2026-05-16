import {
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
  HomeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Select } from "antd";
import BigDrawer from "../Drawer/BigDrawer";
import AddTermsAndConditions from "../TermsAndConditions/AddTermsAndConditions";
import AddCust from "../customer/AddCustomer";
import Payments from "./Payments";

const SaleSidebar = ({
  form,
  totalCalculator,
  subTotal,
  due,
  selectedCustomer,
  setSelectedCustomer,
  selectedTermsAndConditions,
  setSelectedTermsAndConditions,
  allCustomer,
  termsAndConditions,
  loading,
  allStaff,
  userId,
  setUserId,
  total,
  totalDiscount,
  totalTaxAmount,
  totalPayable,
  loader,
  setLoader,
  onFormSubmit,
  invoiceMode = "vente",
}) => {
  const { Option } = Select;
  const customer = allCustomer?.find((item) => item.id === selectedCustomer);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 sm:p-5 space-y-4">
        {/* Top Section: Customer, Date, Due Date, Sales Person, Shipping Address, Note, Terms */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-4 mb-2">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <UserOutlined className="text-gray-500 text-xs" />
                  Customer<span className="text-red-500">*</span>
                  <BigDrawer title={"new Customer"}>
                    <AddCust drawer={true} />
                  </BigDrawer>
                </label>
                <Form.Item
                  className="w-full mb-0"
                  name="customerId"
                  rules={[
                    {
                      required: true,
                      message: "Please Select a Customer!",
                    },
                  ]}>
                  <Select
                    className="w-full"
                    loading={!allCustomer}
                    showSearch
                    onChange={(id) => setSelectedCustomer(id)}
                    placeholder="Select a customer "
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }>
                    {allCustomer &&
                      allCustomer?.map((sup) => (
                        <Option key={sup.id} value={sup.id}>
                          {sup.username}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
                {(customer?.address || customer?.phone) && (
                  <div className="flex justify-between py-1 px-4 mt-2 bg-transparent border-b border-gray-200 border-dashed">
                    <span className="text-xs">
                      <span>Address: </span>
                      <span>{customer?.address}</span>{" "}
                    </span>
                    <span className="text-xs">
                      <span>Phone: </span>
                      <span>{customer?.phone}</span>{" "}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <CalendarOutlined className="text-gray-500 text-xs" />
                  Date<span className="text-red-500">*</span>
                </label>
                <Form.Item
                  className="w-full mb-0"
                  name="date"
                  rules={[
                    {
                      required: true,
                      message: "Please input Date!",
                    },
                  ]}>
                  <DatePicker
                    label="date"
                    size="medium"
                    format={"YYYY-MM-DD"}
                    className="w-full"
                  />
                </Form.Item>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <CalendarOutlined className="text-gray-500 text-xs" />
                  Due date
                </label>
                <Form.Item className="w-full mb-0" name="dueDate">
                  <DatePicker
                    label="date"
                    size="medium"
                    format={"YYYY-MM-DD"}
                    className="w-full"
                  />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <UserOutlined className="text-gray-500 text-xs" />
                  Sales Person<span className="text-red-500">*</span>
                </label>
                <Form.Item className="w-full mb-0" name="userId" required>
                  <Select
                    className="w-full"
                    loading={!allStaff}
                    showSearch
                    placeholder="Select sales person "
                    optionFilterProp="children"
                    onChange={(value) => setUserId(value)}
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }>
                    {allStaff &&
                      allStaff?.map((info) => (
                        <Option key={info.id} value={info.id}>
                          {info.username}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <HomeOutlined className="text-gray-500 text-xs" />
                  Shipping Address
                </label>
                <Form.Item className="mb-0" name="address">
                  <Input
                    className=""
                    placeholder="Enter shipping address"
                    size={"small"}
                  />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <EditOutlined className="text-gray-500 text-xs" />
                  Note
                </label>
                <Form.Item className="mb-0" name="note">
                  <Input
                    className=""
                    size={"small"}
                    placeholder="Write sale Note"
                    label="note"
                  />
                </Form.Item>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <FileTextOutlined className="text-gray-500 text-xs" />
                    Terms and conditions
                    <BigDrawer title={"New Terms and conditions"}>
                      <AddTermsAndConditions drawer={true} />
                    </BigDrawer>
                  </label>
                  {selectedTermsAndConditions && (
                    <button
                      onClick={() => setSelectedTermsAndConditions(false)}
                      className="py-1 px-2 bg-red-200 rounded ml-1 text-gray-500 text-xs">
                      Cancel
                    </button>
                  )}
                </div>
                <Form.Item className="mb-0" name="termsAndConditions">
                  {selectedTermsAndConditions ? (
                    <Input.TextArea
                      onChange={(value) => setSelectedTermsAndConditions(value)}
                      value={selectedTermsAndConditions}
                      rows={2}
                      placeholder="Enter terms"
                      className="text-xs"
                    />
                  ) : (
                    <Select
                      className="w-full"
                      loading={loading}
                      showSearch
                      value={selectedTermsAndConditions}
                      placeholder="Select Terms and conditions"
                      onSelect={(value) =>
                        setSelectedTermsAndConditions(value)
                      }>
                      {termsAndConditions &&
                        termsAndConditions?.map((info) => (
                          <Option key={info.id} value={info.subject}>
                            {info.title}
                          </Option>
                        ))}
                    </Select>
                  )}
                </Form.Item>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-3 sm:px-4 pt-3 pb-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Payment Summary
            </h3>
            <div className="space-y-0 mb-4">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-600 text-sm">Total amount</span>
                <span className="text-gray-800 text-sm">
                  {Number(total).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-600 text-sm">Total discount</span>
                <span className="text-gray-800 text-sm">
                  {Number(totalDiscount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-600 text-sm">Total tax amount</span>
                <span className="text-gray-800 text-sm">
                  {Number(totalTaxAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-900 font-semibold text-base">
                  Total Payable
                </span>
                <span className="text-gray-900 font-bold text-xl">
                  {Number(totalPayable).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-600 text-sm">Due Amount</span>
                <span className="text-red-500 text-sm">{due.toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <h4 className="text-sm font-medium text-gray-700 mb-2 sm:mb-0 sm:mt-2">
                  Paid Amount:
                </h4>
                <div className="flex-1 lg:max-w-[60%] ">
                  <Payments totalCalculator={totalCalculator} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Sale Button */}
        <Form.Item className="w-full pb-0">
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={loader}
            onClick={() => setLoader(true)}
            size="large"
            className="h-12 text-base font-semibold rounded-lg">
            {invoiceMode === "service" ? "Créer la facture (prestation)" : "Créer la facture"}
          </Button>
        </Form.Item>
      </div>
    </div>
  );
};

export default SaleSidebar;
