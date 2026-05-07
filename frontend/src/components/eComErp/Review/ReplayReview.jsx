import { Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  loadAllReviewRatingPaginated,
  replayReview,
} from "../../../redux/rtk/features/eCommerce/reviewRating/reviewRatingSlice";

export default function ReplayReview({ item, pageConfig }) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loader, setLoader] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const onFinish = async (values) => {
    const resp = await dispatch(
      replayReview({ reviewId: item?.id, ...values })
    );
    if (resp.payload.message == "success") {
      setIsModalOpen(false);
      setLoader(false);
      dispatch(loadAllReviewRatingPaginated(pageConfig));
    }
  };

  const onFinishFailed = () => {
    setLoader(false);
  };

  useEffect(() => {
    if (item.reviewReply.length > 0) {
      form.setFieldsValue({
        comment: item.reviewReply[0].comment || "",
      });
    }
  }, [form, item.reviewReply]);

  return (
    <>
      <button
        onClick={showModal}
        className='bg-[#1890ff] px-3 py-2 text-white rounded-md'
        style={{ fontSize: "15px" }}
      >
        Reply Review
      </button>
      <Modal
        title={
          <div>
            {" "}
            <span className='text-gray-500'>Review from</span>{" "}
            {item.customer.username}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={false}
      >
        <div className='p-3 border rounded mb-10'>
          <p className='font-bold'>Review:</p>{" "}
          <p className='max-h-[200px] overflow-y-auto'>{item?.review} </p>
        </div>
        <Form
          form={form}
          layout='vertical'
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete='off'
          labelAlign='left'
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label='Replay'
            name={"comment"}
            required
          >
            <Input.TextArea placeholder='Write reply' />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className='flex justify-center mt-[24px]'
          >
            <Button
              loading={loader}
              onClick={() => setLoader(true)}
              type='primary'
              htmlType='submit'
              shape='round'
            >
              Replay
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
