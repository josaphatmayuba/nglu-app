import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";
import { loadALLPaymentMethod } from "@/redux/rtk/features/paymentMethod/paymentMethodSlice";
import { DatePicker, Select } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function PaymentReportFilter({
  setPageConfig,
  pageConfig,
  setPayInfo,
}) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.customers);
  const { list: paymentMethod, loading: paymentLoading } = useSelector(
    (state) => state.paymentMethod
  );

  const handleChange = (value, name) => {
    const dataArray = value.split(",");
    const id = dataArray[0].trim();

    const [type, typeName] = dataArray[1].split(":");
    const Type = type.trim();
    if (Type === "payment") {
      setPayInfo((prevPayInfo) => ({
        ...prevPayInfo,
        method: typeName.trim(),
      }));
    } else if (Type === "customer") {
      setPayInfo((prevPayInfo) => ({
        ...prevPayInfo,
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

  const onDate = (date) => {
    const fromDate = date.format("YYYY-MM-DD");
    setPageConfig((prev) => {
      return {
        ...prev,
        fromDate,
      };
    });
  };

  useEffect(() => {
    dispatch(loadAllCustomer({ query: "all" }));
    dispatch(loadALLPaymentMethod({ query: "all" }));
  }, [dispatch]);
  return (
    <div className='flex flex-col items-center gap-2 rounded bg-white w-full md:w-1/3'>
      <div className='w-full flex flex-col gap-3'>
        {" "}
        <div className='w-full'>
          <p className='text-base py-2'>Select Customer</p>
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
                value={`${item.id},customer:${item.username}`}
              >
                {item?.username}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className='w-full'>
          <p className='text-base py-2'>Select Payment Method</p>
          <Select
            placeholder='All'
            loading={paymentLoading}
            allowClear
            showSearch={false}
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => (
              <div className=''>{item.length} Selected</div>
            )}
            maxTagCount={0}
            onChange={(value) => handleChange(value, "paymentMethodId")}
          >
            {paymentMethod?.map((item) => (
              <Select.Option
                key={item.id}
                value={`${item.id},payment:${item.methodName}`}
              >
                {item?.methodName}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>
      <div className='w-full flex gap-3'>
        <div className='w-full'>
          <p className='text-base py-2'>From</p>
          <DatePicker onChange={onDate} />
        </div>
      </div>
    </div>
  );
}
