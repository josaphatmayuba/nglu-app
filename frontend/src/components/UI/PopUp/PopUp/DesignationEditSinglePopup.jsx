import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { updateDesignationHistory } from "../../../../redux/rtk/features/designationHistory/designationHistorySlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";
import BtnEditSvg from "../../Button/btnEditSvg";

const DesignationEditSinglePopup = ({ data, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loader, setLoader] = useState();
  const dispatch = useDispatch();
  const userId = useParams("id");
  const { list: designations } = useSelector((state) => state.designations);
  const [initialValues, setInitialValues] = useState({
    designationId: data?.designationId || "",
    designationStartDate: data?.startDate
      ? dayjs(data?.startDate.slice(0, 10))
      : "",
    designationEndDate: data?.endDate ? dayjs(data?.endDate.slice(0, 10)) : "",
    designationComment: data?.comment,
  });

  const onFinish = async (values) => {
    setLoading(true);
    const id = data.id || "";
    const infoData = {
      ...values,
      designationId: Number(values.designationId),
    };

    const resp = await dispatch(
      updateDesignationHistory({ id, values: infoData })
    );

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
    toast.error("Failed at adding designation");
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
        title={`Edit Designation ${data?.id}`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form
          style={{ marginBottom: "100px" }}
          eventKey='design-form'
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
              label='Designation'
              name='designationId'
              rules={[
                {
                  required: true,
                  message: "Please input your Designation!",
                },
              ]}
            >
              <Select placeholder='Select Designation'>
                {designations?.map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item?.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Start Date'
              name='designationStartDate'
              rules={[
                {
                  required: true,
                  message: "Please input your start date!",
                },
              ]}
            >
              <DatePicker name='designationStartDate' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='End Date'
              name='designationEndDate'
            >
              <DatePicker name='designationStartDate' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Comment'
              name='designationComment'
            >
              <Input name='designationComment' />
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
export default DesignationEditSinglePopup;
