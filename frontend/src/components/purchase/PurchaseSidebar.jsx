import {
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Select } from "antd";
import BigDrawer from "../Drawer/BigDrawer";
import AddSup from "../suppliers/addSup";
import Payments from "./Payments";

const PurchaseSidebar = ({
  form,
  totalCalculator,
  subTotal,
  due,
  selectedSupplier,
  setSelectedSupplier,
  allSuppliers,
  total,
  totalTaxAmount,
  totalPayable,
  loader,
  setLoader,
  onFormSubmit,
}) => {
  const { Option } = Select;
  const supplier = allSuppliers?.find((item) => item.id === selectedSupplier);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 sm:p-5 space-y-4">
        {/* Top Section: Supplier, Date, Supplier Memo, Note */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-4 mb-2">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                  <UserOutlined className="text-gray-500 text-xs" />
                  Supplier<span className="text-red-500">*</span>
                  <BigDrawer title={"Add New Supplier"}>
                    <AddSup drawer={true} />
                  </BigDrawer>
                </label>
                <Form.Item
                  className="w-full mb-0"
                  name="supplierId"
                  rules={[
                    {
                      required: true,
                      message: "Please Select a supplier!",
                    },
                  ]}>
                  <Select
                    className="w-full"
                    loading={!allSuppliers}
                    onChange={(id) => setSelectedSupplier(id)}
                    showSearch
                    placeholder="Select a supplier "
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }>
                    {allSuppliers &&
                      allSuppliers.map((sup) => (
                        <Option key={sup.id} value={sup.id}>
                          {sup.name}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
                {supplier && (
                  <div className="flex justify-between py-1 px-4 mt-2 bg-transparent border-b border-gray-200 border-dashed">
                    <span className="text-xs">
                      <span>Address: </span>
                      <span>{supplier?.address}</span>{" "}
                    </span>
                    <span className="text-xs">
                      <span>Phone: </span>
                      <span>{supplier?.phone}</span>{" "}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
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
                  <FileTextOutlined className="text-gray-500 text-xs" />
                  Supplier Memo
                </label>
                <Form.Item className="mb-0" name="supplierMemoNo">
                  <Input
                    className="w-full"
                    placeholder="Memo no "
                    size="small"
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
                  <Input className="w-full" placeholder="Note" size="small" />
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
                  {total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-600 text-sm">Total tax amount</span>
                <span className="text-gray-800 text-sm">
                  {totalTaxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-900 font-semibold text-base">
                  Total Payable
                </span>
                <span className="text-gray-900 font-bold text-xl">
                  {totalPayable.toFixed(2)}
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

        {/* Create Purchase Button */}
        <Form.Item className="w-full pb-0">
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={loader}
            onClick={() => setLoader(true)}
            size="large"
            className="h-12 text-base font-semibold rounded-lg">
            Create Purchase
          </Button>
        </Form.Item>
      </div>
    </div>
  );
};

export default PurchaseSidebar;
