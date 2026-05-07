import GoogleLoginButton from "@/eCommerce/CommonSection/GoogleLoginBtn";
import { customerLogin } from "@/redux/rtk/features/eCommerce/customer/customerSlice";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { BiSolidLock } from "react-icons/bi";
import { FaUser } from "react-icons/fa";
import Lottie from "react-lottie";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import login from "../../public/login.json";
import CustomerLoginTable from "@/components/Card/CustomerLoginTable";
export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loader, setLoader] = useState();
  const data = useSelector((state) => state.setting.data);
  const onFinishLogin = async (values) => {
    setLoader(true);
    const response = await dispatch(customerLogin(values));
    if (response.payload.message === "success") {
      setLoader(false);
      navigate("/user");
    } else {
      setLoader(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center w-full">
      <div className="flex justify-center items-center">
        <div className="hidden lg:block mr-5 mb-5">
          <Lottie
            options={{
              loop: true,
              autoplay: true,
              animationData: login,
              rendererSettings: {
                preserveAspectRatio: "xMidYMid slice",
              },
            }}
            style={{
              maxWidth: "400px",
              maxHeight: "400px",
            }}
          />
        </div>
        <div className="min-w-[300px] max-w-[700px] mx-auto rounded-2xl border p-5 md:px-10 md:pt-7 md:pb-6">
          <h1 className="text-[20px] md:text-[25px] flex flex-col gap-1 md:gap-2 font-medium text-gray-800 text-center Md:mt-5 md:mb-8 mb-5">
            Welcome to {data?.companyName}!
          </h1>
          <div>
            <Form name="login" layout="vertical" onFinish={onFinishLogin}>
              <Form.Item
                label="Email"
                name="email"
                className="mb-2 md:mb-5 customer-login-email"
                rules={[
                  {
                    required: true,
                    message: "Please input your email!",
                  },
                ]}>
                <Input
                  className="md:py-1 px-1"
                  prefix={<FaUser className="ml-1" />}
                  placeholder="Enter your email"
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                className="customer-login-password"
                rules={[
                  {
                    required: true,
                    message: "Please input your password!",
                  },
                ]}>
                <Input.Password
                  className="md:py-1 px-1 "
                  prefix={<BiSolidLock className="ml-1" />}
                  placeholder="Enter password"
                />
              </Form.Item>
              {import.meta.env.VITE_LOGIN_TABLE === "true" ? (
                <div className="py-4">
                  <CustomerLoginTable />
                </div>
              ) : null}

              <div className="flex justify-end items-center">
                <Form.Item>
                  <Link
                    to="forget-password"
                    className="underline cursor-pointer">
                    Forget Password?
                  </Link>
                </Form.Item>
              </div>

              <Form.Item className="-mt-4">
                <Button
                  loading={loader}
                  className="w-full text-white font-medium bg-ePrimary"
                  htmlType="submit">
                  Login
                </Button>
              </Form.Item>
            </Form>
          </div>

          {import.meta.env.VITE_APP_GOOGLE_CLIENT_ID && (
            <>
              <div className="py-5">
                <hr />
                <p className="text-center -mt-3">
                  <span className="bg-white px-4 font-medium">OR</span>
                </p>
              </div>
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-[220px]">
                  <GoogleLoginButton />
                </div>
              </div>
            </>
          )}

          {/* <div className="py-5">
            <p className="text-gray-600 font-medium text-center">
              Not have an Account?{" "}
              <Link
                to={"/register"}
                className="text-gray-900 font-bold cursor-pointer"
              >
                Register
              </Link>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
