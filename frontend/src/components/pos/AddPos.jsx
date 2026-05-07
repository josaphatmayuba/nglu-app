import { DatePicker, Form, Select } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCustomer } from "../../redux/rtk/features/customer/customerSlice";
import { loadAllVatTax } from "../../redux/rtk/features/vatTax/vatTaxSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddCust from "../customer/AddCustomer";

const AddPos = ({ form }) => {
  const { Option } = Select;
  const dispatch = useDispatch();
  const allCustomer = useSelector((state) => state.customers.list);

  useEffect(() => {
    dispatch(loadAllVatTax());
    dispatch(loadAllCustomer({ query: "all" }));
  }, [dispatch]);

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      initialValues={{ date: dayjs() }}
      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
    >
      <div className="flex flex-col md:flex-row gap-4">
        <Form.Item
          label={
            <>
              Customer{" "}
              <BigDrawer className={""} title={"new Customer"}>
                <AddCust drawer={true} />
              </BigDrawer>
            </>
          }
          name="customerId"
          className="w-full md:flex-1 mb-0"
          rules={[{ required: true, message: "Please Select a Customer!" }]}
        >
          <Select
            showSearch
            placeholder="Walk-in / Select customer"
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toString().toLowerCase().includes(input.toLowerCase())
            }
          >
            {allCustomer?.map((cust) => (
              <Option key={cust.id} value={cust.id}>
                {cust.username}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Date"
          name="date"
          className="w-full md:w-60 mb-0"
          rules={[{ required: true, message: "Please input Date!" }]}
        >
          <DatePicker className="w-full" />
        </Form.Item>
      </div>
    </Form>
  );
};

export default AddPos;
