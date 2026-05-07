import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { addDesignationHistory } from "../../../../redux/rtk/features/designationHistory/designationHistorySlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";

const DesignationAddSinglePopup = ({ list, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loader, setLoader] = useState();
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const userId = useParams("id");

  const onFinish = async (values) => {
    setLoading(true);
    setLoader(true);
    const infoData = {
      ...values,
      userId: parseInt(userId.id),
      designationId: parseInt(values.designationId),
    };

    const resp = await dispatch(addDesignationHistory(infoData));

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
          Add New Designation
        </Button>
      </div>
      <Modal
        title={`Add Designation`}
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
              label='Designation'
              name='designationId'
              rules={[
                {
                  required: true,
                  message: "Please input your Designation!",
                },
              ]}
            >
              <Select loading={!list} placeholder='Select Designation'>
                {list?.map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name || ""}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Start Date'
              name='designationStartDate'
              valuePropName='designationStartDate'
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
              name='designationEndDate'
              valuePropName='designationEndDate'
            >
              <DatePicker />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Comment'
              name='designationComment'
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
export default DesignationAddSinglePopup;
