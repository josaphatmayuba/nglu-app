import { Button, DatePicker, Form, Input, Modal } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { addEducation } from "../../../../redux/rtk/features/education/educationSlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";

const EducationAddSinglePopup = ({ data, setLoading }) => {
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
    };

    const resp = await dispatch(addEducation(infoData));

    if (resp.payload.message === "success") {
      setIsModalOpen(false);
      setLoading(false);
      setLoader(false);
      form.resetFields();
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
          Add New Education
        </Button>
      </div>
      <Modal
        title={`Add Education`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form
          form={form}
          style={{ marginBottom: "100px" }}
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
              label='Degree'
              name='degree'
              rules={[
                {
                  required: true,
                  message: "Please input your degree!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Institution'
              name='institution'
              rules={[
                {
                  required: true,
                  message: "Please input your institution!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Field of Study'
              name='fieldOfStudy'
              rules={[
                {
                  required: true,
                  message: "Please input your field of study!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Result'
              name='result'
              rules={[
                {
                  required: true,
                  message: "Please input your result!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Start Date'
              name='studyStartDate'
              valuePropName='studyStartDate'
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
              name='studyEndDate'
              valuePropName='studyEndDate'
            >
              <DatePicker />
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
export default EducationAddSinglePopup;
