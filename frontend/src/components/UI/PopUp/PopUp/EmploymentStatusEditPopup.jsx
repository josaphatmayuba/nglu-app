import { Button, Form, Input, Modal } from "antd";

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import BtnEditSvg from "../Button/btnEditSvg";
import { useUpdateEmploymentStatusMutation } from "../../../redux/rtk/features/employemntStatus/employmentStatusApi";

const EmploymentStatusEditPopup = ({ data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { id } = useParams("id");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [updateEmploymentStatus, { isLoading }] =
    useUpdateEmploymentStatusMutation();

  const onFinish = (values) => {
    updateEmploymentStatus({ id: id, values: values });
    setIsModalOpen(false);
    navigate(-1);
  };

  const [initialValues, setInitialValues] = useState({
    name: data?.name || "",
    colourValue: data?.colourValue,
    description: data?.description,
  });

  const onFinishFailed = (errorInfo) => {
    toast.error("Failed at adding department");
  };
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };
  return (
    <>
      <button onClick={showModal}>
        <BtnEditSvg size={30} />
      </button>
      <Modal
        title="Edit Shift"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}>
        <Form
          form={form}
          style={{ marginBottom: "40px" }}
          eventKey="shift-form"
          name="basic"
          initialValues={initialValues}
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 12,
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off">
          <div>
            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Name"
              name="name"
              rules={[
                {
                  required: true,
                  message: "Please input your shift!",
                },
              ]}>
              <Input placeholder="Permanent" />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Color Code"
              name="colourValue"
              rules={[
                {
                  required: true,
                  message: "Please input your shift!",
                },
              ]}>
              <Input placeholder="#00FF00" />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "20px" }}
              label="Description"
              name={"description"}>
              <Input.TextArea placeholder="Description" />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              wrapperCol={{
                offset: 6,
                span: 12,
              }}>
              <Button
                type="primary"
                size="small"
                htmlType="submit"
                block
                loading={isLoading}>
                Update Now
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};
export default EmploymentStatusEditPopup;
