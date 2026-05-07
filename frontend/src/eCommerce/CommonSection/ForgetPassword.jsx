import { Button, Form, Input } from "antd";
import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { customerForgetPasswordRequest } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import GoogleLoginButton from "./GoogleLoginBtn";

export default function ForgetPassword({ setOpen, onCancel }) {
  const dispatch = useDispatch();
  const [loader, setLoader] = useState();
  const onFinishForget = async (values) => {
    setLoader(true);
    const response = await dispatch(customerForgetPasswordRequest(values));
    if (response.payload.message === "success") {
      onCancel();
      setLoader(false);
    } else {
      setLoader(false);
    }
  };

  return (
    <div className="">
      <h1 className="text-[20px] md:text-[25px] font-medium text-gray-800 text-center mt-5 mb-8">
        Forgot your password?
      </h1>
      <div>
        <Form
          name="login"
          layout="vertical"
          style={{
            maxWidth: 600,
          }}
          onFinish={onFinishForget}
          autoComplete="off"
        >
          <Form.Item
            label="Email"
            name="email"
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
            <Input className="md:p-[9px]" />
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
        <p className="text-center -mt-3">
          <span className="bg-white px-4 font-medium">OR</span>
        </p>
      </div>
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-[220px]">
            <GoogleLoginButton />
          </div>
      </div>
      <div className="py-5">
        <p className="text-gray-600 font-medium text-center">
          Not have an Account?{" "}
          <span
            onClick={() =>
              setOpen({
                login: false,
                register: true,
                forget: false,
              })
            }
            className="text-gray-900 font-bold cursor-pointer"
          >
            Register
          </span>
        </p>
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
  );
}
