import { Button, DatePicker, Form, Input, Modal } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { addSalaryHistory } from "../../../../redux/rtk/features/salaryHistory/salaryHistorySlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";

const SalaryAddSinglePopup = ({ data, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();
  const dispatch = useDispatch();

  const userId = useParams("id");

  const onFinish = async (values) => {
    setLoading(true);
    setLoader(true);
    const infoData = {
      ...values,
      userId: parseInt(userId.id),
      salary: parseInt(values.salary),
    };

    const resp = await dispatch(addSalaryHistory(infoData));

    if (resp.payload.message === "success") {
      setIsModalOpen(false);
      setLoading(false);
      form.resetFields();
      setLoader(false);
      dispatch(loadSingleStaff(userId?.id));
    } else {
      setLoading(false);
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    toast.error("Failed at adding department");

    setLoading(false);
  };
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleOk = () => {
    setIsModalOpen(false);

    setLoading(false);
    form.resetFields();
  };
  const handleCancel = () => {
    setIsModalOpen(false);

    setLoading(false);
    form.resetFields();
  };

  return (
    <>
      <div className='text-center'>
        <Button type='primary' onClick={showModal}>
          Add New Salary
        </Button>
      </div>
      <Modal
        title={`Add Salary`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form
          form={form}
          style={{ marginBottom: "10px" }}
          eventKey='department-form'
          name='basic'
          labelCol={{
            span: 6,
          }}
          wrapperCol={{
            span: 16,
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete='off'
        >
          <div>
            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Salary'
              name='salary'
            >
              <Input placeholder='Salary' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Start Date'
              name='salaryStartDate'
              valuePropName='salaryStartDate'
              rules={[
                {
                  required: true,
                  message: "Please input your start date!",
                },
              ]}
            >
              <DatePicker />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='End Date'
              name='salaryEndDate'
              valuePropName='salaryEndDate'
            >
              <DatePicker />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Comment'
              name='salaryComment'
            >
              <Input placeholder='Comment' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "20px" }}
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
                loading={loader}
              >
                Add Now
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};
export default SalaryAddSinglePopup;
