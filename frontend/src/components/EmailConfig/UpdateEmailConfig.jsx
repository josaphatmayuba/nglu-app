import { Form, Input, InputNumber } from "antd";
import { Button } from "antd/lib";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  loadConfigEmail,
  updateConfigEmail,
} from "../../redux/rtk/features/emailConfig/emailConfigSlice";

export default function UpdateEmailConfig({ data }) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initValues, setInitValues] = useState({
    emailConfigName: data[0]?.emailConfigName,
    emailHost: data[0]?.emailHost,
    emailPort: data[0]?.emailPort,
    emailUser: data[0]?.emailUser,
    emailPass: data[0]?.emailPass,
  });

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await dispatch(updateConfigEmail({ id: data[0].id, values }));
      if (res.payload.message == "success") {
        dispatch(loadConfigEmail());
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };
  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <div className='sm:mx-10'>
      <Form
        size='small'
        form={form}
        name='basic'
        layout='vertical'
        initialValues={initValues}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete='off'
      >
        <Form.Item
          style={{ marginBottom: "10px" }}
          label='Config Name'
          name='emailConfigName'
          rules={[
            {
              required: true,
              message: "Please input Config Name!",
            },
          ]}
        >
          <Input type='text' />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "10px" }}
          label='Host'
          name='emailHost'
          rules={[
            {
              required: true,
              message: "Please input Host!",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "10px" }}
          label='Port'
          name='emailPort'
          rules={[
            {
              required: true,
              message: "Please input Port!",
            },
          ]}
        >
          <InputNumber />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "10px" }}
          label='User Email'
          name='emailUser'
          rules={[
            {
              required: true,
              message: "Please input User Email!",
            },
          ]}
        >
          <Input type='email' />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "10px" }}
          label='Password'
          name='emailPass'
          rules={[
            {
              required: true,
              message: "Please input Password!",
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item className='flex justify-center mt-5'>
          <Button
            loading={loading}
            type='primary'
            htmlType='submit'
            shape='round'
            size='large'
          >
            Update Config Email
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
