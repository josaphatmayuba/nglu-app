import {
  loadSingleShift,
  updateShift,
} from "@/redux/rtk/features/shift/shiftSlice";
import { Button, Form, Input, TimePicker } from "antd";
import Title from "antd/es/skeleton/Title";
import dayjs from "dayjs";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function UpdateShift({ id }) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loader, setLoader] = useState(false);
  const { shift, loading } = useSelector((state) => state.shift);

  const onFinish = async (values) => {
    setLoader(true);
    const formattedValues = {
      ...values,
      startTime: values.startTime
        ? dayjs(values.startTime).format("HH:mm:ss")
        : null,
      endTime: values.endTime ? dayjs(values.endTime).format("HH:mm:ss") : null,
    };
    try {
      const resp = await dispatch(
        updateShift({ id: id, values: formattedValues })
      );
      if (resp.payload.message === "success") {
        // form.resetFields();
        dispatch(loadSingleShift(id));
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoader(false);
  };

  return (
    <div className=" h-full">
      <Title level={4} className="m-3 text-center">
        Create Shift
      </Title>
      <Form
        form={form}
        name="basic"
        layout="vertical"
        className="sm:mx-10"
        onFinish={onFinish}
        initialValues={{
          ...shift,
          startTime: shift?.startTime
            ? dayjs(shift?.startTime, "HH:mm:ss")
            : null,
          endTime: shift?.endTime ? dayjs(shift?.endTime, "HH:mm:ss") : null,
        }}
        onFinishFailed={onFinishFailed}>
        <Form.Item
          label="Name"
          name="name"
          rules={[
            {
              required: true,
              message: "Please enter Shift Name!",
            },
          ]}>
          <Input />
        </Form.Item>

        <div className="flex justify-between gap-3">
          <Form.Item
            className="w-full"
            label="Start Time"
            name="startTime"
            rules={[
              {
                required: true,
                message: "Please select Start Time!",
              },
            ]}>
            <TimePicker />
          </Form.Item>
          <Form.Item
            className="w-full"
            label="End Time"
            name="endTime"
            rules={[
              {
                required: true,
                message: "Please select end Time!",
              },
            ]}>
            <TimePicker />
          </Form.Item>
        </div>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-6">
          <Button
            type="primary"
            htmlType="submit"
            shape="round"
            loading={loader}>
            Update Shift
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
