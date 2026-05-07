import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import toast from "react-hot-toast";
import { useUpdateAwardHistoryMutation } from "../../../redux/rtk/features/awardHistory/awardHistoryApi";
import { useGetDesignationsQuery } from "../../../redux/rtk/features/designation/designationApi";
import BtnEditSvg from "../Button/btnEditSvg";

const AwardHistoryEditSinglePopup = ({ data, setLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: designations } = useGetDesignationsQuery();
  const [updateAwardHistory, { isLoading }] = useUpdateAwardHistoryMutation();
  const [initialValues, setInitialValues] = useState({
    awardId: data?.awardId || "",
    awardedDate: dayjs(data?.startDate),
    comment: data?.comment,
  });
 
  const onFinish = async (values) => {
    setLoading(true);
    const id = data.id || "";

    const infoData = {
      ...values,
    };

    const resp = await updateAwardHistory({ id, values: infoData });

    if (resp.data && resp.error) {
      setInitialValues({});

      setIsModalOpen(false);
      setLoading(false);
      window.location.reload();
    } else {
      setLoading(false);
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
              name='awardId'
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
                    {item.name || ""}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Start Date'
              name='awardedDate'
              rules={[
                {
                  required: true,
                  message: "Please input your start date!",
                },
              ]}
            >
              <DatePicker name='awardedDate' format='YYYY-MM-DD' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Comment'
              name='comment'
            >
              <Input name='comment' />
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
                loading={isLoading}
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
export default AwardHistoryEditSinglePopup;
