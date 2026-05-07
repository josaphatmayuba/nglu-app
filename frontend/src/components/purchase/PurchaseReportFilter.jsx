import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadSuppliers } from "../../redux/rtk/features/supplier/supplierSlice";

export default function PurchaseReportFilter({
  setPageConfig,
  pageConfig,
  setSupplier,
}) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.suppliers);
  const handleChange = (value, name) => {
    const dataArray = value.split(",");
    const id = dataArray[0].trim();
    const supplier = dataArray[1].trim();
    setSupplier(supplier);
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
    dispatch(loadSuppliers({ query: "all" }));
  }, [dispatch]);
  return (
    <div className='flex flex-col items-center gap-2 rounded bg-white w-full md:w-1/3'>
      <div className='w-full'>
        <p className='text-base py-2'>Select Supplier</p>
        <Select
          placeholder='All'
          loading={loading}
          allowClear
          showSearch={false}
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className=''>{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "supplierId")}
        >
          {list?.map((item) => (
            <Select.Option key={item.id} value={`${item.id},${item.name}`}>
              {item?.name}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div className='w-full flex flex-col md:flex-row gap-3'>
        <div className='w-full'>
          <p className='text-base py-2'>From</p>
          <DatePicker
            onChange={onStartDate}
            defaultValue={dayjs(pageConfig.startDate, "YYYY-MM-DD")}
          />
        </div>
        <div className='w-full'>
          <p className='text-base py-2'>To</p>
          <DatePicker
            onChange={onEndDate}
            defaultValue={dayjs(pageConfig.endDate, "YYYY-MM-DD")}
          />
        </div>
      </div>
    </div>
  );
}
