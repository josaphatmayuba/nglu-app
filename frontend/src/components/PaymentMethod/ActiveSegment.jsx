import { SolutionOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import React from 'react'
import { useDispatch } from 'react-redux';
import { loadAllPaymentMethodPaginated, updatePaymentMethod } from '../../redux/rtk/features/paymentMethod/paymentMethodSlice';

export default function ActiveSegment({ isActive , id}) {
  const dispatch = useDispatch();
  const handleActiveValue = async (value, id) => {
    let formData = new FormData();
    formData.append("isActive", value);
    formData.append("_method", "PUT");

    const resp = await dispatch(updatePaymentMethod({ values: formData, id }));
    if (resp.payload.message === "success") {
      dispatch(
        loadAllPaymentMethodPaginated({ status: "true", page: 1, count: 10 })
      );
    }
  };
  return (
    <Segmented
      options={[
        {
          label: (
            <span>
              <SolutionOutlined /> Active
            </span>
          ),
          value: "true",
        },
        {
          label: (
            <span>
              <UserDeleteOutlined /> Inactive
            </span>
          ),
          value: "false",
        },
      ]}
      value={isActive}
      onChange={(value) => handleActiveValue(value, id)}
    />
  );
}
