import { DatePicker, Form, Select } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { UserAddOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddCust from "../customer/AddCustomer";

const AddPosFields = () => {
    const dispatch = useDispatch();
    const { list: allCustomer } = useSelector((s) => s.customers);

    useEffect(() => {
        dispatch(loadAllVatTax());
        dispatch(loadAllCustomer({ query: "all" }));
    }, [dispatch]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <Form.Item
                label={
                    <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                            <UserOutlined className="text-blue-500" />
                            Customer
                        </span>
                        <BigDrawer
                            className="ml-auto"
                            title={
                                <span className="flex items-center gap-2">
                                    <UserAddOutlined />
                                    Add New Customer
                                </span>
                            }
                        >
                            <AddCust drawer />
                        </BigDrawer>
                    </div>
                }
                name="customerId"
                className="mb-0"
                rules={[{ required: true, message: "Please select a customer" }]}
            >
                <Select
                    showSearch
                    size="large"
                    placeholder="Walk-in customer or search..."
                    optionFilterProp="children"
                    suffixIcon={<UserOutlined className="text-gray-400" />}
                    className="rounded-lg"
                    filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {allCustomer?.map((cust) => (
                        <Select.Option key={cust.id} value={cust.id}>
                            {cust.username}
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                label={
                    <span className="flex items-center gap-2 text-gray-700 font-medium">
                        <CalendarOutlined className="text-blue-500" />
                        Date
                    </span>
                }
                name="date"
                className="mb-0 md:w-64"
                rules={[{ required: true, message: "Please select date" }]}
            >
                <DatePicker
                    size="large"
                    className="w-full rounded-lg"
                    format="DD/MM/YYYY"
                    suffixIcon={<CalendarOutlined className="text-gray-400" />}
                />
            </Form.Item>
        </div>
    );
};

export default AddPosFields;