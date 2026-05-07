import { Button, Form, Input } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { customerForgetPassword } from "../../redux/rtk/features/eCommerce/customer/customerSlice";

export default function PasswordChange() {
  const dispatch = useDispatch();
  const { token } = useParams();
  const navigate = useNavigate();
  const [loader, setLoader] = useState();
  const onFinishPasswordChange = async (values) => {
    const data = {
      ...values,
      token,
    };
    setLoader(true);
    const response = await dispatch(customerForgetPassword(data));
    if (response.payload.message === "success") {
      navigate("/");
      setLoader(false);
    } else {
      setLoader(false);
    }
  };
  return (
    <div className='container mx-auto max-w-[600px]'>
      <h1 className='text-[25px] font-medium text-gray-800 text-center mt-5 mb-8'>
        Password Recovery
      </h1>
      <div>
        <Form
          name='login'
          layout='vertical'
          style={{
            maxWidth: 600,
          }}
          onFinish={onFinishPasswordChange}
          autoComplete='off'
        >
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
            <Input.Password placeholder='password' className='p-1' />
          </Form.Item>
          <Form.Item
            label='Confirm Password'
            name='confirmPassword'
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
                    new Error("The new password that you entered do not match!")
                  );
                },
              }),
            ]}
          >
            <Input.Password placeholder='confirm password' className='p-1' />
          </Form.Item>

          <Form.Item>
            <Button
              loading={loader}
              style={{ backgroundColor: "#0766AD", borderColor: "#0766AD" }}
              className='w-full text-white font-medium '
              htmlType='submit'
            >
              Recover Password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
