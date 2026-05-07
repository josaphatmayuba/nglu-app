import { Button, Card, Form, Input } from "antd";
import { Fragment } from "react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadSingleDepartment, updateDepartment } from "../../redux/rtk/features/department/departmentSlice";

const UpdateDepartment = ({ handleCancel }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const { department } = useSelector((state) => state.department);

  const onFinish = async (values) => {
    await dispatch(updateDepartment({ id: department.id, values }));
    await dispatch(loadSingleDepartment(department.id));
    handleCancel();
    setLoading(false);
  };

  const onFinishFailed = () => {
    setLoading(false);
  };

  useEffect(() => {
    form.setFieldValue("name", department.name);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  return (
    <Fragment>
      <Card bordered={false} className="h-full">
        <Form
          form={form}
          className=""
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please enter department name!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-6"
          >
            <Button
              type="primary"
              htmlType="submit"
              shape="round"
              loading={loading}
              onClick={() => setLoading(true)}
            >
              Update Department
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Fragment>
  );
};

export default UpdateDepartment;
