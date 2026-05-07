import { Button, Card, DatePicker, Form, Input, Typography } from "antd";

import { useLocation, useNavigate } from "react-router-dom";

import { useState } from "react";

import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import dayjs from "dayjs";
import moment from "moment";
import { addCustomerPayment } from "../../redux/rtk/features/customerPayment/customerPaymentSlice";
import Payments from "./Payments";

const AddCustPaymentByInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pid } = useParams();
  const { dueAmount } = location?.state || {};

  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();

  let [date, setDate] = useState(moment());
  const [loader, setLoader] = useState(false);

  const onFinish = async (values) => {
    setLoader(true);
    try {
      const data = {
        date: date,
        ...values,
        paidAmount: values.paidAmount || [],
      };

      const resp = await dispatch(addCustomerPayment(data));

      if (resp.payload.message === "success") {
        navigate(-1);
        setLoader(false);
      }
      setLoader(false);
      form.resetFields();
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoader(false);
  };

  return (
    <>
      <Card bordered={false} className=' max-w-[700px] '>
        <Title level={3} className='m-3 text-center'>
          Sale Invoice Payment
        </Title>
        <Title level={4} className='text-center'>
          Due Amount :{" "}
          <strong style={{ color: "red" }}>{dueAmount?.toFixed(3) || 0}</strong>
        </Title>
        <Form
          form={form}
          className='m-4'
          name='basic'
          layout='vertical'
          initialValues={{
            remember: true,
            saleInvoiceNo: pid,
            discount: 0,
            paidAmount: [{}],
          }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete='off'
        >
          <Form.Item
            label='Date'
            rules={[
              {
                required: true,
                message: "Please input the date!",
              },
            ]}
            style={{ marginBottom: "10px" }}
          >
            <DatePicker
              onChange={(value) => setDate(value?._d)}
              defaultValue={dayjs()}
              label='date'
              name='date'
              rules={[
                {
                  required: true,
                  message: "Please input Date",
                },
              ]}
            />
          </Form.Item>
          <span>Paid Amount</span>
          <Payments />

          <Form.Item
            style={{ marginBottom: "10px" }}
            label='Sale Invoice No'
            name='saleInvoiceNo'
            validateStatus='success'
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            wrapperCol={{
              offset: 8,
              span: 16,
            }}
          >
            <Button
              block
              type='primary'
              htmlType='submit'
              shape='round'
              loading={loader}
            >
              Pay Now
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

export default AddCustPaymentByInvoice;
