import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";
import { loadAllStaff } from "@/redux/rtk/features/user/userSlice";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function SaleReportFilter({
  setPageConfig,
  pageConfig,
  setSaleInfo,
}) {
  const dispatch = useDispatch();

  const { list, loading } = useSelector((state) => state.customers);
  const { list: salePersonList, loading: salePersonLoading } = useSelector(
    (state) => state.users
  );

  const handleChange = (value, name) => {
    const dataArray = value.split(",");
    const id = dataArray[0].trim();

    const [type, typeName] = dataArray[1].split(":");
    const Type = type.trim();
    if (Type === "salePerson") {
      setSaleInfo((prevSaleInfo) => ({
        ...prevSaleInfo,
        salePerson: typeName.trim(),
      }));
    } else if (Type === "customer") {
      setSaleInfo((prevSaleInfo) => ({
        ...prevSaleInfo,
        customer: typeName.trim(),
      }));
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
    <div className='flex flex-col items-center gap-2 rounded bg-white w-full md:w-2/5 p-4 md:p-0'>
      <div className='w-full flex flex-col md:flex-row gap-3'>
        <div className='w-full'>
          <p className='text-base py-2'>Sale Person</p>
          <Select
            placeholder='All'
            loading={salePersonLoading}
            showSearch={false}
            allowClear
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => (
              <div className=''>{item.length} Selected</div>
            )}
            maxTagCount={0}
            onChange={(value) => handleChange(value, "salePersonId")}
          >
            {salePersonList?.map((item) => (
              <Select.Option
                key={item.id}
                value={`${item.id},salePerson:${item?.username}`}
              >
                {item?.username}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className='w-full'>
          <p className='text-base py-2'>Customer</p>
          <Select
            placeholder='All'
            loading={loading}
            showSearch={false}
            allowClear
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => (
              <div className=''>{item.length} Selected</div>
            )}
            maxTagCount={0}
            onChange={(value) => handleChange(value, "customerId")}
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
      <div className='w-full flex flex-col md:flex-row gap-3'>
        <div className='w-full'>
          <p className='text-base py-2'>From</p>
          <DatePicker
            onChange={onStartDate}
            defaultValue={dayjs(pageConfig.startDate, "YYYY-MM-DD")}
            style={{ width: "100%" }}
          />
        </div>
        <div className='w-full'>
          <p className='text-base py-2'>To</p>
          <DatePicker
            onChange={onEndDate}
            defaultValue={dayjs(pageConfig.endDate, "YYYY-MM-DD")}
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
