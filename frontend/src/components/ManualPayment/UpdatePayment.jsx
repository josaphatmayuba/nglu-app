import { Select } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { loadSingleECommerceSale } from "../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import {
  loadAllManualPaymentPaginated,
  updatePaymentStatus,
} from "../../redux/rtk/features/manualPayment/manualPaymentSlice";

export default function UpdatePayment({ data, id }) {
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const handlePaymentStatus = async (value) => {
    setLoader(true);
    const resp = await dispatch(
      updatePaymentStatus({ values: { isVerified: value }, id: data.id })
    );
    if (resp.payload.message == "success") {
      if (id) {
        dispatch(loadSingleECommerceSale(id));
      } else {
        dispatch(
          loadAllManualPaymentPaginated({
            page: 1,
            count: 10,
            status: "true",
          })
        );
      }
    }
    setLoader(false);
  };
  return (
    <div>
      <Select
        placeholder='Payment'
        loading={loader}
        style={{ width: "100%" }}
        onChange={(value) => handlePaymentStatus(value)}
        className='w-[120px]'
        defaultValue={data.isVerified}
      >
        <Select.Option value='Pending'>Pending</Select.Option>
        <Select.Option value='Accept'>Accept</Select.Option>
        <Select.Option value='Reject'>Reject</Select.Option>
      </Select>
    </div>
  );
}
