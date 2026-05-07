import { Button, Form, Input } from "antd";
import Title from "antd/es/skeleton/Title";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addTermsAndConditions,
  loadAllTermsAndConditions,
} from "../../redux/rtk/features/termsAndCondition/termsAndConditionSlice";

export default function AddTermsAndConditions() {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { TextArea } = Input;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const resp = await dispatch(addTermsAndConditions(values));
      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllTermsAndConditions());
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  return (
    <div className=' h-full'>
      <Title level={4} className='m-3 text-center'>
        Add Terms And Conditions
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
          label='Title'
          name='title'
          rules={[
            {
              required: true,
              message: "Please enter title!",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label='Terms And Conditions'
          name='subject'
          rules={[
            {
              required: true,
              message: "Please enter Terms And Conditions!",
            },
          ]}
        >
          <TextArea rows={10} />
        </Form.Item>

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
            Create Terms & Conditions
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
