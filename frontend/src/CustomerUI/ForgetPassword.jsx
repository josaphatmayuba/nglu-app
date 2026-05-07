import { customerForgetPasswordRequest } from "@/redux/rtk/features/eCommerce/customer/customerSlice";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { FaUser } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

export default function ForgetPassword() {
  const dispatch = useDispatch();
  const [loader, setLoader] = useState();
  const onFinishForget = async (values) => {
    setLoader(true);
    const response = await dispatch(customerForgetPasswordRequest(values));
    if (response.payload.message === "success") {
      setLoader(false);
    } else {
      setLoader(false);
    }
  };

  return (
    <div className="h-screen flex items-center md:-mt-20">
      <div className="min-w-[300px] max-w-[700px] mx-auto rounded-2xl border p-5">
        <h1 className="text-[20px] md:text-[25px] font-medium text-gray-800 text-center mt-5 mb-8">
          Forgot your password?
        </h1>
        <div>
          <Form
            name="login"
            layout="vertical"
            onFinish={onFinishForget}
            autoComplete="off"
          >
            <Form.Item
              label="Email"
                          name="email"
                          className="forget-password"
              rules={[
                {
                  type: "email",
                  message: "The input is not valid E-mail!",
                },
                {
                  required: true,
                  message: "Please input your email!",
                },
              ]}
            >
              <Input
                className="md:py-1 px-1"
                prefix={<FaUser className="ml-1" />}
                placeholder="Enter your email"
              />
            </Form.Item>

            <Form.Item>
              <Button
                loading={loader}
                style={{ backgroundColor: "#0766AD", borderColor: "#0766AD" }}
                className="w-full text-white font-medium bg-ePrimary"
                htmlType="submit"
              >
                Recover Password
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="py-5">
          <hr />
          <p className="text-center -mt-2">
            <span className="bg-slate-50 px-4 font-medium">OR</span>
          </p>
        </div>
        {/* <div className="flex justify-center">
          <div className="flex items-center justify-center w-[220px]">
            <GoogleLoginButton />
          </div>
        </div> */}
        <div className="py-5">
          {/* <p className="text-gray-600 font-medium text-center">
            Not have an Account?{" "}
            <Link
              to="/register"
              className="text-gray-900 font-bold cursor-pointer"
            >
              Register
            </Link>
          </p> */}
          <p className="text-gray-600 font-medium text-center">
            Already have an Account?{" "}
            <Link to="/" className="text-gray-900 font-bold cursor-pointer">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
