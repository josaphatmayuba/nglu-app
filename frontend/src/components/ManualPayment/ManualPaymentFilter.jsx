import { Select } from 'antd';
import React from 'react'
import { useSelector } from 'react-redux';

export default function ManualPaymentFilter({ setPageConfig }) {
  const { list, loading } = useSelector((state) => state.paymentMethod);
  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
        page: 1,
      };
    });
  };
  return (
    <div className="flex items-center gap-2">
      <div className="filterTag float-left min-w-[145px] max-w-[150px]">
        <Select
          placeholder="Payment Method"
          loading={loading}
          showSearch={false}
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className="">{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "paymentMethodId")}
          allowClear
        >
          {list?.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item?.methodName}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div className="filterTag float-left min-w-[85px] max-w-[150px]">
        <Select
          placeholder="Status"
          className=""
          showSearch={false}
          mode="multiple"
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className="">{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "status")}
        >
          <Select.Option key={"true"} value={"true"}>
            Show
          </Select.Option>
          <Select.Option key={"false"} value={"false"}>
            Hide
          </Select.Option>
        </Select>
      </div>
    </div>
  );
}
