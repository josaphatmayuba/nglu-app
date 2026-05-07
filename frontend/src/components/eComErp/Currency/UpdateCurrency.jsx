import { Button, Form, Input } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadAllCurrency,
  updateCurrency,
} from "../../../redux/rtk/features/eCommerce/currency/currencySlice";

export default function UpdateCurrency({ handleCancel }) {
  const dispatch = useDispatch();
  const { edit } = useSelector((state) => state.currency);
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();

  const onFinish = async (values) => {
    await dispatch(updateCurrency({ id: edit.id, values }));
    handleCancel();
    setLoader(false);
    dispatch(loadAllCurrency());
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    form.setFieldValue("currencyName", edit.currencyName);
    form.setFieldValue("currencySymbol", edit.currencySymbol);
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
          label="Currency name"
          name={"currencyName"}
          rules={[
            {
              required: true,
              message: "Please input currency name!",
            },
          ]}
        >
          <Input size="small"  />
        </Form.Item>

        <Form.Item
          label="Symbol"
          required
          name="currencySymbol"
          rules={[
            {
              required: true,
              message: "Please input currency symbol!",
            },
          ]}
        >
          <Input size="small"  />
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
            Update Currency
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
