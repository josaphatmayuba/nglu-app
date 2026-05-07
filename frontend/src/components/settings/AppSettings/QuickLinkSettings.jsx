import {
  loadAllQuickLink,
  updateQuickLink,
} from "@/redux/rtk/features/quickLink/quickLinkSlice";
import Button from "@/UI/Button";

import { Form, Select } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function QuickLinkSettings() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.quickLink);
  const [loader, setLoader] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(loadAllQuickLink());
  }, [dispatch]);

  const handleSubmit = async (values) => {
    setLoader(true);
    const data = Object.keys(values).map((key) => values[key]);
    try {
      const response = await dispatch(updateQuickLink(data));
      if (response.data.message === "success") {
        dispatch(loadAllQuickLink());
      }
      setLoader(false);
    } catch (err) {
      setLoader(false);
    }
  };

  useEffect(() => {
    if (list) {
      const selectedList = list.filter((item) => item.position);
      selectedList.sort((a, b) => a.position - b.position);
      form.setFieldsValue({
        1: selectedList[0]?.id,
        2: selectedList[1]?.id,
        3: selectedList[2]?.id,
        4: selectedList[3]?.id,
        5: selectedList[4]?.id,
        6: selectedList[5]?.id,
      });
    }
  }, [form, list]);

  return (
    <div className="max-w-[768px] mx-auto mt-5">
      <Form
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-5"
        form={form}>
        <Form.Item name={1} label="Quick Link 1">
          <Select loading={loading} placeholder="Select Quick Link 1">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={2} label="Quick Link 2">
          <Select loading={loading} placeholder="Select Quick Link 2">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={3} label="Quick Link 3">
          <Select loading={loading} placeholder="Select Quick Link 3">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={4} label="Quick Link 4">
          <Select loading={loading} placeholder="Select Quick Link 4">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={5} label="Quick Link 5">
          <Select loading={loading} placeholder="Select Quick Link 5">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name={6} label="Quick Link 6">
          <Select loading={loading} placeholder="Select Quick Link 6">
            {list?.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Button
            loading={loader}
            type="submit"
            color="primary"
            className="w-24">
            Save
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
