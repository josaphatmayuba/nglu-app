import { EditOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Form, Input, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateColor } from "../../redux/rtk/features/color/colorSlice";

function UpdateProductColor({ data, id }) {
  const dispatch = useDispatch();
  //Loading Old data from URL
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();
  const [updatedColorCode, setUpdatedColorCode] = useState(data?.colorCode);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onFinish = async (values) => {
    const data = { ...values, colorCode: updatedColorCode };
    await dispatch(updateColor({ id, data }));
    setIsModalOpen(false);
    setLoader(false);
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    form.setFieldValue("name", data?.name);
    setUpdatedColorCode(data?.colorCode);
  }, [data, form]);

  return (
    <>
      <div
        onClick={showModal}
        className="flex items-center gap-2 cursor-pointer">
        <EditOutlined className="text-[1rem]" />
        Edit
      </div>

      <Modal
        title="Edit Color"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={false}>
        <Form
          form={form}
          className="m-4"
          name="basic"
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off">
          <Form.Item
            style={{ marginBottom: "10px" }}
            fields={[{ name: "Name" }]}
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please input Color name!",
              },
            ]}>
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Color Code"
            required>
            <ColorPicker
              className="w-full"
              showText
              defaultValue={updatedColorCode}
              onChange={(code) => {
                setUpdatedColorCode(code.toHexString());
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: "10px" }}>
            <Button
              onClick={() => setLoader(true)}
              block
              type="primary"
              htmlType="submit"
              shape="round"
              loading={loader}>
              Update Now
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default UpdateProductColor;
