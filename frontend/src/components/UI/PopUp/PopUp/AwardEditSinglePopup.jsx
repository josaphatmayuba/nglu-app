import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { loadAllAward } from "../../../../redux/rtk/features/award/awardSlice";
import { updateAwardHistory } from "../../../../redux/rtk/features/awardHistory/awardHistorySlice";
import { loadSingleStaff } from "../../../../redux/rtk/features/user/userSlice";
import BtnEditSvg from "../../Button/btnEditSvg";

const AwardEditSinglePopup = ({ data, setLoading }) => {
  const { id } = useParams("id");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [loader, setLoader] = useState();
  const { list: award } = useSelector((state) => state.award);

  const [initialValues, setInitialValues] = useState({
    awardId: data?.awardId,
    awardedDate: dayjs(data?.awardedDate),
    comment: data?.comment,
  });

  const onFinish = async (values) => {
    setLoader(true);
    const FormData = {
      ...values,
    };
    setLoading(true);

    const resp = await dispatch(
      updateAwardHistory({ id: data.id, values: FormData })
    );

    if (resp.payload.message === "success") {
      setInitialValues({});
      setIsModalOpen(false);
      setLoading(false);
      dispatch(loadSingleStaff(id));
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
  useEffect(() => {
    dispatch(loadAllAward());
  }, [dispatch]);
  return (
    <>
      <button onClick={showModal} className='mr-2'>
        <BtnEditSvg size={20} />
      </button>
      <Modal
        title={`Edit Award History`}
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
              label='Award'
              name='awardId'
              rules={[
                {
                  required: true,
                  message: "Please input your salary!",
                },
              ]}
            >
              <Select
                name='awardId'
                defaultValue={initialValues.awardId}
                loading={!award}
              >
                {award?.map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name}
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
              <DatePicker name='awardedDate' />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label='Comment'
              name='comment'
            >
              <Input name='salaryComment' />
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
export default AwardEditSinglePopup;
