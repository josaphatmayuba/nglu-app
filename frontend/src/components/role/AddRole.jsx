import { Button, Form, Input, Typography } from "antd";

import React, {  useState } from "react";
import toast from "react-hot-toast";
import { addSingleRole } from "../../redux/rtk/features/hr/role/roleSlice";
import { useDispatch } from "react-redux";

const AddRole = () => {
  const [loader, setLoader] = useState(false);
  const dispatch = useDispatch()

  const { Title } = Typography;

  const onFinish = async (values) => {
    setLoader(true);
    await dispatch(addSingleRole(values));
    setLoader(false);    
  };

  const onFinishFailed = () => {
    toast.error("Failed at adding role");
    setLoader(false);
  };
  return (
    <>
      <Title level={4} className="m-2 mt-5 text-center">
        Create New Role
      </Title>
      <Form
        eventKey="role-form"
        name="basic"
        layout="vertical"
        className="sm:mx-10"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <div>
          <Form.Item
            style={{ marginBottom: "20px" }}
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please input your username!",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item style={{ marginBottom: "10px" }}>
            <Button
              onClick={() => setLoader(true)}
              type="primary"
              size="small"
              htmlType="submit"
              block
              loading={loader}
            >
              Create New Role
            </Button>
          </Form.Item>
        </div>
      </Form>
    </>
  );
};

export default AddRole;
