import { Button, Form, Input, Modal } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useUpdateDepartmentMutation } from "../../../redux/rtk/features/Department/departmentApi";
import UserPrivateComponent from "../../PrivateRoutes/UserPrivateComponent";
import BtnEditSvg from "../Button/btnEditSvg";
const DepartmentEditPopup = ({ data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { id } = useParams("id");
  const [updateDepartment, { isLoading }] = useUpdateDepartmentMutation();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    const resp = await updateDepartment({ id, values });

    if (resp) {
      navigate(-1);
      setInitialValues({
        name: values.name,
      });
    }
  };

  const [initialValues, setInitialValues] = useState({
    name: data?.name || "",
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
    <UserPrivateComponent permission={"update-department"}>
      <button onClick={showModal}>
        <BtnEditSvg size={38} />
      </button>
      <Modal
        title='Edit Department'
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form
          style={{ marginBottom: "100px" }}
          eventKey='department-form'
          initialValues={initialValues}
          name='basic'
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 12,
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete='off'
        >
          <div>
            <Form.Item
              style={{ marginBottom: "20px" }}
              label='Name'
              name='name'
              rules={[
                {
                  required: true,
                  message: "Please input your department name!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              wrapperCol={{
                offset: 6,
                span: 12,
              }}
            >
              <Button
                type='primary'
                size='small'
                htmlType='submit'
                block
                loading={isLoading}
              >
                Update Now
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </UserPrivateComponent>
  );
};
export default DepartmentEditPopup;
