import { Select } from "antd";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadAllCustomer } from "../../../redux/rtk/features/customer/customerSlice";
import { loadAllStaff } from "../../../redux/rtk/features/user/userSlice";

export default function OrderFilter({ setPageConfig }) {
  const dispatch = useDispatch();
  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
        page: 1,
      };
    });
  };

  useEffect(() => {
    dispatch(loadAllCustomer({ query: "all" }));
    dispatch(loadAllStaff({ query: "all" }));
  }, [dispatch]);

 

  return (
    <div className='flex flex-wrap md:flex-nowrap items-center gap-2'>
      <div className='filterTag float-left min-w-[120px] max-w-[150px]'>
        <Select
          placeholder='Order status'
          className=''
          showSearch={false}
          mode='multiple'
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className=''>{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "orderStatus")}
        >
          <Select.Option value='PENDING' key='PENDING'>
            Pending
          </Select.Option>
          <Select.Option value='RECEIVED' key='RECEIVED'>
            Received
          </Select.Option>
          <Select.Option value='PACKED' key={"PACKED"}>
            Packed
          </Select.Option>
          <Select.Option value='SHIPPED' key={"SHIPPED"}>
            Shipped
          </Select.Option>
          <Select.Option value='DELIVERED' key={"DELIVERED"}>
            Delivered
          </Select.Option>
          <Select.Option value='CANCELLED' key={"CANCELLED"}>
            Cancelled
          </Select.Option>
        </Select>
      </div>
    </div>
  );
}
