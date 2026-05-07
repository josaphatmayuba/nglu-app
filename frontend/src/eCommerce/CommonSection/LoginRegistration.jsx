import { Button, Form, Input } from "antd";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { customerLogin } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import ForgetPassword from "./ForgetPassword";
import GoogleLoginButton from "./GoogleLoginBtn";
import Register from "./Register";

export default function LoginRegistration({ onCancel }) {
  const [open, setOpen] = useState({
    login: true,
    register: false,
    forget: false,
  });
  const dispatch = useDispatch();
  const [loader, setLoader] = useState();
  const data = useSelector((state) => state.setting.data);
  const onFinishLogin = async (values) => {
    setLoader(true);
    const response = await dispatch(customerLogin(values));
    if (response.payload.message === "success") {
      onCancel();
      setLoader(false);
    } else {
      setLoader(false);
    }
  };

  return (
    <div className='md:px-10'>
      {/* login container start */}
      {open.login && (
        <div className=''>
          <h1 className='text-[20px] md:text-[25px] flex flex-col gap-1 md:gap-2 font-medium text-gray-800 text-center Md:mt-5 md:mb-8 mb-5'>
            Welcome to {data?.companyName}!
            <span className='text-base'>Please login.</span>
          </h1>
          <div>
            <Form
              name='login'
              layout='vertical'
              style={{
                maxWidth: 600,
              }}
              onFinish={onFinishLogin}
            >
              <Form.Item
                label='Email'
                name='email'
                className='mb-2 md:mb-5'
                rules={[
                  {
                    required: true,
                    message: "Please input your email!",
                  },
                ]}
              >
                <Input className='md:p-[9px]' />
              </Form.Item>

              <Form.Item
                label='Password'
                name='password'
                rules={[
                  {
                    required: true,
                    message: "Please input your password!",
                  },
                ]}
              >
                <Input.Password className='md:py-1 px-1' />
              </Form.Item>

              <div className='flex justify-end items-center'>
                <Form.Item>
                  <p
                    onClick={() =>
                      setOpen({
                        login: false,
                        register: false,
                        forget: true,
                      })
                    }
                    className='underline cursor-pointer'
                  >
                    Forget Password?
                  </p>
                </Form.Item>
              </div>

              <Form.Item className='-mt-4'>
                <Button
                  loading={loader}
                  className='w-full text-white font-medium bg-ePrimary'
                  htmlType='submit'
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
          </div>

          {import.meta.env.VITE_APP_GOOGLE_CLIENT_ID && (
            <>
              <div className='py-5'>
                <hr />
                <p className='text-center -mt-3'>
                  <span className='bg-white px-4 font-medium'>OR</span>
                </p>
              </div>
              <div className='flex justify-center'>
                <div className='flex items-center justify-center w-[220px]'>
                  <GoogleLoginButton />
                </div>
              </div>
            </>
          )}

          <div className='py-5'>
            <p className='text-gray-600 font-medium text-center'>
              Not have an Account?{" "}
              <span
                onClick={() =>
                  setOpen({
                    login: false,
                    register: true,
                    forget: false,
                  })
                }
                className='text-gray-900 font-bold cursor-pointer'
              >
                Register
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Register container start */}
      {open.register && <Register setOpen={setOpen} />}

      {/* forget password container start */}
      {open.forget && <ForgetPassword setOpen={setOpen} onCancel={onCancel} />}
    </div>
  );
}
