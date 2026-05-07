import {
  loadAllEmailConfig,
  updateEmailConfig,
} from "@/redux/rtk/features/EmailConfigAppSettings/emailConfigAppSettingSlice";
import Button from "@/UI/Button";

import { Form, Input } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function EmailConfig() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.emailConfigAppSetting);
  const [loader, setLoader] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoader(true);
    try {
      const data = {
        ...values,
        emailConfigId: list?.[0]?.id,
      };
      const response = await dispatch(updateEmailConfig(data));
      if (response.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllEmailConfig());
      }
      setLoader(false);
    } catch (err) {
      setLoader(false);
    }
  };

  useEffect(() => {
    dispatch(loadAllEmailConfig());
  }, [dispatch]);

  useEffect(() => {
    if (list) {
      form.setFieldsValue(list[0]);
    }
  }, [form, list]);

  return (
    <div className="max-w-[768px] mx-auto mt-5">
      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        className="mt-5">
        <Form.Item name="emailConfigName" label="Email config name">
          <Input type="text" className="input" />
        </Form.Item>
        <Form.Item name="emailHost" label="Host">
          <Input className="input" />
        </Form.Item>
        <Form.Item name="emailPort" label="Port">
          <Input type="number" className="input" />
        </Form.Item>
        <Form.Item name="emailUser" label="User email">
          <Input type="text" className="input" />
        </Form.Item>
        <Form.Item name="emailPass" label="Password">
          <Input type="text" className="input" />
        </Form.Item>
        <Form.Item>
          <Button loading={loader || loading} color="primary" type="submit">
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
