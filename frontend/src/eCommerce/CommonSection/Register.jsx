import { Button, Checkbox, Form, Input } from "antd";
import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { customerRegister } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import GoogleLoginButton from "./GoogleLoginBtn";

export default function Register({ setOpen }) {
  const dispatch = useDispatch();
  const [loader, setLoader] = useState();
  const onFinishRegister = async (values) => {
    setLoader(true);
    const response = await dispatch(customerRegister(values));
    if (response.payload.message === "success") {
      setOpen({
        login: true,
        register: false,
        forget: false,
      });
      setLoader(false);
    } else {
      setLoader(false);
    }
  };
  return (
    <>
      <div className="">
        <h1 className="text-[20px] md:text-[25px] font-medium text-gray-800 text-center mt-5 mb-5 md:mb-8 ">
          Create Your Account
        </h1>
        <div>
          <Form
            name="login"
            layout="vertical"
            style={{
              maxWidth: 600,
            }}
            onFinish={onFinishRegister}
            autoComplete="off"
          >
            <Form.Item
              label="Username"
              name="username"
              placeholder="Username"
              className="mb-2 md:mb-5"
              rules={[
                {
                  required: true,
                  message: "Please input  username!",
                },
              ]}
            >
              <Input placeholder="Username" className="md:p-[9px]" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              className="mb-2 md:mb-5"
              rules={[
                {
                  required: true,
                  message: "Please input your email!",
                },
              ]}
            >
              <Input placeholder="user@gmail.com" className="md:p-[9px]" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              className="mb-2 md:mb-5"
              rules={[
                {
                  required: true,
                  message: "Please input your password!",
                },
              ]}
            >
              <Input.Password placeholder="password" className="px-1 md:py-1" />
            </Form.Item>
            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              className="mb-2 md:mb-5"
              rules={[
                {
                  required: true,
                  message: "Please input your confirm password!",
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(
                        "The new password that you entered do not match!"
                      )
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="confirm password"
                className="px-1 md:py-1"
              />
            </Form.Item>

            <div className="flex justify-between items-center">
              <Form.Item
                name="agree"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Please accept terms and conditions")
                          ),
                  },
                ]}
              >
                <Checkbox className="text-sm md:text-base">
                  I am agree with terms and conditions
                </Checkbox>
              </Form.Item>
            </div>

            <Form.Item className="">
              <Button
                loading={loader}
                className="w-full text-white font-medium bg-ePrimary"
                htmlType="submit"
              >
                Register
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div className="py-5">
          <hr />
          <p className="text-center -mt-3">
            <span className="bg-white px-4 font-medium">OR</span>
          </p>
        </div>
        <div className="flex justify-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-[220px]">
              <GoogleLoginButton />
            </div>
          </div>
        </div>
        <div className="py-5">
          <p className="text-gray-600 font-medium text-center">
            Already have an Account?{" "}
            <span
              onClick={() =>
                setOpen({
                  login: true,
                  register: false,
                  forget: false,
                })
              }
              className="text-gray-900 font-bold cursor-pointer"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
