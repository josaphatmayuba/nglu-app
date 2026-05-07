import { Button, DatePicker, Form, Input, Modal } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { updateEducation } from "../../../../redux/rtk/features/education/educationSlice";
import BtnEditSvg from "../../Button/btnEditSvg";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";
import { useParams } from "react-router-dom";

const EducationEditSinglePopup = ({ data, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loader, setLoader] = useState();
  const dispatch = useDispatch();
  const userId = useParams("id");
  const [initialValues, setInitialValues] = useState({
    degree: data?.degree || "",
    institution: data?.institution || "",
    fieldOfStudy: data?.fieldOfStudy || "",
    result: data?.result || "",
    studyStartDate: dayjs(data?.studyStartDate),
    studyEndDate: data?.studyEndDate ? dayjs(data?.studyEndDate) : "",
  });

  const onFinish = async (values) => {
    setLoading(true);
    const id = data.id || "";
    const infoData = {
      ...values,
    };
    const resp = await dispatch(updateEducation({ id, values: infoData }));

    if (resp.payload.message === "success") {
      setInitialValues({});
      setIsModalOpen(false);
      setLoading(false);
    dispatch(loadSingleStaff(userId.id));
      setLoader(false);
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
  };
  const handleCancel = () => {
    setIsModalOpen(false);
    setLoading(false);
  };

  return (
    <>
      <button onClick={showModal} className='mr-2'>
        <BtnEditSvg size={20} />
      </button>
      <Modal
        title={`Edit Education ${data?.id}`}
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
              rules={[
                {
                  required: true,
                  message: "Please input your start date!",
                },
              ]}
            >
              <DatePicker name='studyStartDate' format='YYYY-MM-DD' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='End Date'
              name='studyEndDate'
              rules={[
                {
                  required: true,
                  message: "Please input your start date!",
                },
              ]}
            >
              <DatePicker name='studyEndDate' format='YYYY-MM-DD' />
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
                Update Now
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};
export default EducationEditSinglePopup;
