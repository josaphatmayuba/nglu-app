import { Alert, Button, Card, Form, Input, Typography } from "antd";

import { useState } from "react";
import { CSVLink } from "react-csv";
import { FaDownload } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  addCustomer,
  loadAllCustomer,
} from "../../redux/rtk/features/customer/customerSlice";
import UploadMany from "../Card/UploadMany";

const AddCustomer = ({ drawer }) => {
  const dispatch = useDispatch();
  const { Title } = Typography;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  //check the page url has customer on it or not
  const isAdmin = window.location.href.includes("admin");

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const resp = await dispatch(addCustomer(values));
      if (resp.payload?.message === "success") {
        setSuccess(true);
        form.resetFields();
        dispatch(loadAllCustomer({ page: 1, count: 10, status: true }));
        //redirect to customer login page
        // wait for 5 sec and then redirect to home
        if (isAdmin !== true) {
          setTimeout(() => {
            window.location.href = "/customer/login";
            setSuccess(false);
            setLoading(false);
          }, 5000);
        } else {
          setSuccess(false);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={isAdmin !== true ? " mt-[5rem]" : ""}>
        {success && (
          <Alert
            message="We have sent you an email with password ."
            description="Please check your email and login to your account."
            type="success"
            showIcon
          />
        )}
        <Title level={4} className="m-2 text-center">
          Register Now
        </Title>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          style={{ marginLeft: "40px", marginRight: "40px" }}
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Username"
            name="username"
            rules={[
              {
                required: true,
                message: "Please input  name!",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: "Please input  email!",
              },
            ]}
          >
            <Input type="email" />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Phone"
            name="phone"
            rules={[
              {
                required: true,
                message: "Please input Phone!",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Address"
            name="address"
          >
            <Input />
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-6"
          >
            <Button
              loading={loading}
              type="primary"
              htmlType="submit"
              shape="round"
            >
              Create Customer
            </Button>
          </Form.Item>
        </Form>
        {!isAdmin && (
          <Title className="mt-5 mb-5 text-center text-base">
            Already have an account? <Link to="/customer/login">Login Now</Link>
          </Title>
        )}

        <Card
          className="mt-5"
          title={<span className="text-center font-bold">Import From CSV</span>}
        >
          <UploadMany
            urlPath={"customer"}
            demoData={[
              ["username", "email", "phone", "address"],
              [
                "custreomer 1",
                "customer1@gmail.com",
                "01708888842",
                "everywhere",
              ],
              [
                "custreomer 2",
                "customer2@gmail.com",
                "01708888843",
                "everywhere",
              ],
              [
                "custreomer 3",
                "customer3@gmail.com",
                "01708888844",
                "everywhere",
              ],
            ]}
            loadAllThunk={loadAllCustomer}
            query={{ page: 1, count: 10, status: true }}
            title={"Demo Customer"}
          />
        </Card>
      </div>
    </>
  );
};

export default AddCustomer;
