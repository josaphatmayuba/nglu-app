import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Typography,
} from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import dayjs from "dayjs";
import moment from "moment";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { addSupplierPayment } from "../../redux/rtk/features/supplierPayment/supplierPaymentSlice";
import Payments from "./Payments";

const AddSupPaymentByInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pid } = useParams();
  // eslint-disable-next-line no-unsafe-optional-chaining
  const { dueAmount } = location?.state;

  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();

  let [date, setDate] = useState(moment());
  const [loader, setLoader] = useState(false);

  const onFinish = async (values) => {
    try {
      const data = {
        date: date,
        purchaseInvoiceNo: parseInt(values.purchaseInvoiceNo),
        ...values,
        paidAmount: values.paidAmount || [],
      };

      const resp = await dispatch(addSupplierPayment(data));

      if (resp.payload.message === "success") {
        setLoader(false);
        navigate(-1);
      }
      form.resetFields();
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoader(false);
  };

  return (
    <>
      <Row className='mr-top'>
        <Col
          xs={24}
          sm={24}
          md={12}
          lg={12}
          xl={14}
          className='border rounded column-design'
        >
          <Card bordered={false} className='criclebox h-full'>
            <Title level={3} className='m-3 text-center'>
              Purchase Invoice Payment
            </Title>

            <Title level={4} className='text-center'>
              Due Amount : <strong style={{ color: "red" }}>{dueAmount}</strong>
            </Title>
            <Form
              form={form}
              className='m-4'
              name='basic'
              layout='vertical'
              initialValues={{
                remember: true,
                purchaseInvoiceNo: pid,
                paidAmount: [{}],
              }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              autoComplete='off'
            >
              <Form.Item label='Date' required style={{ marginBottom: "10px" }}>
                <DatePicker
                  defaultValue={dayjs()}
                  onChange={(value) => setDate(value?._d)}
                  label='date'
                  name='date'
                  rules={[
                    {
                      required: true,
                      message: "Please input date!",
                    },
                  ]}
                />
              </Form.Item>

              <span>Paid Amount</span>
              <Payments />

              <Form.Item
                style={{ marginBottom: "10px" }}
                label='Purchase Invoice No'
                name='purchaseInvoiceNo'
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
                  onClick={() => setLoader(true)}
                >
                  Pay Now
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default AddSupPaymentByInvoice;
