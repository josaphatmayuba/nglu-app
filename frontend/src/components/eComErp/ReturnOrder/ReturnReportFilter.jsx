
import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";
import { loadAllStaff } from "@/redux/rtk/features/user/userSlice";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function ReturnReportFilter({ setPageConfig, pageConfig, setCustomer }) {
  const dispatch = useDispatch();

  const { list, loading } = useSelector((state) => state.customers);

  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
      };
    });
  };
  const handleCustomerChange = (value, name) => {
    const dataArray = value.split(",");
    const id = dataArray[0].trim();

    const [type, typeName] = dataArray[1].split(":");
    const Type = type.trim();
    if (Type === "customer") {
      setCustomer(typeName.trim());
    }

    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: id,
      };
    });
  };
  const onStartDate = (date) => {
    const startDate = date.format("YYYY-MM-DD");
    setPageConfig((prev) => {
      return {
        ...prev,
        startDate,
      };
    });
  };
  const onEndDate = (date) => {
    const endDate = date.format("YYYY-MM-DD");
    setPageConfig((prev) => {
      return {
        ...prev,
        endDate,
      };
    });
  };

  useEffect(() => {
    dispatch(loadAllCustomer({ query: "all" }));
    dispatch(loadAllStaff({ query: "all" }));
  }, [dispatch]);
  return (
    <div className="flex flex-col items-center gap-2 p-5 m-4 rounded bg-white w-2/5">
      <div className="w-full flex gap-3">
        <div className="w-full">
          <p className="text-base py-2">Return Status</p>
          <Select
            placeholder="Return Status"
            showSearch={false}
            allowClear
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => (
              <div className="">{item.length} Selected</div>
            )}
            maxTagCount={0}
            onChange={(value) => handleChange(value, "returnCartOrderStatus")}
          >
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="RECEIVED">Received</Select.Option>
            <Select.Option value="RESEND">Resend</Select.Option>
            <Select.Option value="RESENDED">Resended</Select.Option>
          </Select>
        </div>

        <div className="w-full">
          <p className="text-base py-2">Customer</p>
          <Select
            placeholder="Customer"
            loading={loading}
            allowClear
            showSearch={false}
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => (
              <div className="">{item.length} Selected</div>
            )}
            maxTagCount={0}
            onChange={(value) => handleCustomerChange(value, "customerId")}
          >
            {list?.map((item) => (
              <Select.Option
                key={item.id}
                value={`${item.id},customer:${item?.username}`}
              >
                {item?.username}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
      <div className="w-full flex gap-3">
        <div className="w-full">
          <p className="text-base py-2">From</p>
          <DatePicker
            onChange={onStartDate}
            defaultValue={dayjs(pageConfig.startDate, "YYYY-MM-DD")}
          />
        </div>
        <div className="w-full">
          <p className="text-base py-2">To</p>
          <DatePicker
            onChange={onEndDate}
            defaultValue={dayjs(pageConfig.endDate, "YYYY-MM-DD")}
          />
        </div>
      </div>
      <div className="w-full">
        <p className="text-base py-2">Return Type</p>
        <Select
          placeholder="Return Type"
          showSearch={false}
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className="">{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "returnType")}
        >
          <Select.Option value="PRODUCT">Product</Select.Option>
          <Select.Option value="REFUND">Refund</Select.Option>
        </Select>
      </div>
    </div>
  );
}
