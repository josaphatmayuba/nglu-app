import { Button, Form, Input } from 'antd';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { loadAllUomPaginated, updateUom } from '../../redux/rtk/features/uom/uomSlice';

export default function UpdateUoM ({ handleCancel }) {
  const dispatch = useDispatch();
  const { edit } = useSelector((state) => state.uom);
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();

  const onFinish = async (values) => {
    await dispatch(updateUom({ id: edit.id, values }));
    handleCancel();
    setLoader(false);
    dispatch(loadAllUomPaginated({ status: true, page: 1, count: 10 }));
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    form.setFieldValue("name", edit.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);
  return (
    <>
      <Form
        form={form}
        layout="vertical"
        className="sm:mx-10"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        labelAlign="left"
      >
        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Name"
          name={"name"}
          rules={[
            {
              required: true,
              message: "Please input UoM name!",
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-[24px]"
        >
          <Button
            loading={loader}
            onClick={() => setLoader(true)}
            type="primary"
            htmlType="submit"
            shape="round"
          >
            Update UoM
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
