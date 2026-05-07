import { customerResetPassword } from "@/redux/rtk/features/eCommerce/customer/customerSlice";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";

export default function ChangePassword() {
  const dispatch = useDispatch();
  const id = localStorage.getItem("id");

  const [loader, setLoader] = useState(false);

  const onFinishReset = async (values) => {
    setLoader(true);
    const resp = await dispatch(customerResetPassword({ id, values }));
    console.log(resp);
    if (resp.payload.message == "success") {
      setLoader(false);
      localStorage.clear();
      window.location.replace("/");
    }
    setLoader(false);
  };
  return (
    <div>
      <div className="min-w-[300px] max-w-[700px] mx-auto rounded-2xl border p-5 md:px-10 md:pt-7 md:pb-6">
        <div>
          <Form name="login" layout="vertical" onFinish={onFinishReset}>
            <Form.Item
              label="Old Password"
              name="oldPassword"
              className="customer-login-password"
              rules={[
                {
                  required: true,
                  message: "Please input your old password!",
                },
              ]}
            >
              <Input.Password
                className="md:py-1 px-1 "
                placeholder="Enter old password"
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="password"
              className="customer-login-password"
              rules={[
                {
                  required: true,
                  message: "Please input your new password!",
                },
              ]}
            >
              <Input.Password
                className="md:py-1 px-1 "
                placeholder="Enter new password"
              />
            </Form.Item>

            <Form.Item className="-mt-4">
              <Button
                loading={loader}
                className="w-full text-white font-medium bg-ePrimary mt-5"
                htmlType="submit"
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
