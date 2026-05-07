import { Button, Form, InputNumber, Modal, Select } from "antd";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadSingleECommerceSale,
  updateECommerceSale,
} from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import { loadAllCourierMedium } from "../../../redux/rtk/features/eCommerce/courierMedium/courierMediumSlice";

export default function OrderStatus({ deliveryFee, invoiceId }) {
  const dispatch = useDispatch();
  const { Option } = Select;
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);
  const { list, loading: courierLoading } = useSelector(
    (state) => state.courierMedium
  );

  useEffect(() => {
    setLoading(false);
    dispatch(loadAllCourierMedium());
  }, [dispatch]);

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onSubmit = async (values) => {
    setLoading(true);

    const response = await dispatch(
      updateECommerceSale({
        ...values,
        invoiceId,
      })
    );

    if (response.payload?.message === "success") {
      setLoading(false);
      dispatch(loadSingleECommerceSale(invoiceId));
      setIsModalOpen(false);
    } else {
      setLoading(false);
    }
  };

  return (
    <>
      <Button type='dashed' onClick={showModal}>
        Update Status
      </Button>
      <Modal
        title='Update Order Status'
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <Form
          form={form}
          name='basic'
          initialValues={{ deliveryFee: deliveryFee }}
          layout='vertical'
          onFinish={onSubmit}
        >
          <h1 className='text-lg text-center font-semibold text-gray-600'>
            Order ID : {invoiceId}
          </h1>
          <Form.Item
            name='orderStatus'
            label='Update Order Status'
            rules={[
              {
                required: true,
                message: "Please select order status!",
              },
            ]}
          >
            <Select
              placeholder='Select Order Status'
              style={{ width: "100%" }}
              onChange={(value) => setStatus(value)}
              allowClear
            >
              <Option value='PENDING'>Pending</Option>
              <Option value='RECEIVED'>Received</Option>
              {/* <Option value='PACKED'>Packed</Option>
              <Option value='SHIPPED'>Shipped</Option> */}
              <Option value='DELIVERED'>Delivered</Option>
              <Option value='CANCELLED'>Cancelled</Option>
            </Select>
          </Form.Item>

          {status === "RECEIVED" && (
            <>
              <Form.Item
                style={{ marginBottom: "15px" }}
                label='Courier Medium'
                name='courierMediumId'
                rules={[
                  {
                    required: true,
                    message: "please select courier medium",
                  },
                ]}
              >
                <Select
                  showSearch
                  loading={courierLoading}
                  placeholder='Select Courier Medium'
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    option.children.includes(input)
                  }
                  filterSort={(optionA, optionB) =>
                    optionA.children
                      .toLowerCase()
                      .localeCompare(optionB.children.toLowerCase())
                  }
                >
                  {list?.map((item) => (
                    <Select.Option key={item.id} value={item.courierMediumId}>
                      {item.courierMediumName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label='Delivery Charge' name='deliveryFee'>
                <InputNumber disabled size='small' placeholder='e.g. 100' />
              </Form.Item>
            </>
          )}
          <Form.Item>
            <Button
              htmlType='submit'
              loading={loading}
              className='w-full'
              type='primary'
            >
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
