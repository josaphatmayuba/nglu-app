import { Button, Form, Input, TimePicker } from "antd";
import Title from "antd/es/skeleton/Title";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addShift,
  loadAllShiftPaginated,
} from "../../redux/rtk/features/shift/shiftSlice";

export default function AddShift() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        startTime: values.startTime.format("HH:mm"),
        endTime: values.endTime.format("HH:mm"),
      };
      const resp = await dispatch(addShift(data));

      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllShiftPaginated({}));
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoading(false);
  };

  return (
    <div className=' h-full'>
      <Title level={4} className='m-3 text-center'>
        Create Shift
      </Title>
      <Form
        form={form}
        name='basic'
        layout='vertical'
        className='sm:mx-10'
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
      >
        <Form.Item
          label='Name'
          name='name'
          rules={[
            {
              required: true,
              message: "Please enter Shift Name!",
            },
          ]}
        >
          <Input />
        </Form.Item>

        <div className='flex justify-between gap-3'>
          <Form.Item
            className='w-full'
            label='Start Time'
            name='startTime'
            rules={[
              {
                required: true,
                message: "Please select Start Time!",
              },
            ]}
          >
            <TimePicker />
          </Form.Item>
          <Form.Item
            className='w-full'
            label='End Time'
            name='endTime'
            rules={[
              {
                required: true,
                message: "Please select end Time!",
              },
            ]}
          >
            <TimePicker />
          </Form.Item>
        </div>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className='flex justify-center mt-6'
        >
          <Button
            type='primary'
            htmlType='submit'
            shape='round'
            loading={loading}
          >
            Create Shift
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
