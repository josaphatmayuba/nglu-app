import { LoadingOutlined } from "@ant-design/icons";
import { Form, Input, Spin } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { loadAllCartByCustomerId } from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import { addECommerceSale } from "../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import { loadALLPaymentMethod } from "../../redux/rtk/features/paymentMethod/paymentMethodSlice";
import { couponCalculate } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";

export default function Payment() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const currency = useCurrency();
  const navigate = useNavigate();
  const { state } = useLocation();
  const customerId = localStorage.getItem("id");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loader, setLoader] = useState(false);

  const { list, loading } = useSelector((state) => state.paymentMethod);
  const { list: cart } = useSelector((state) => state.cartDynamic);
  const onFinish = async (values) => {
    const data = {
      customerId: parseInt(customerId),
      cartId: cart?.id,
      paymentMethodId: paymentMethod.id,
      deliveryAddress: state?.deliveryAddress,
      customerPhone: state?.customerPhone,
      deliveryFeeId: state?.deliveryFeeId,
      ...values,
    };

    if (state?.coupon) {
      data.couponCode = state?.coupon?.couponCode;
    }

    try {
      setLoader(true);
      const resp = await dispatch(addECommerceSale(data));
      if (resp.payload.message === "success") {
        setLoader(false);
        dispatch(loadAllCartByCustomerId(customerId));
        navigate(`success?orderId=${resp.payload.data.createdCartOrder?.id}`);
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      !cart && dispatch(loadAllCartByCustomerId(customerId));
    }
    dispatch(loadALLPaymentMethod());
  }, [cart, customerId, dispatch]);

  return (
    <div>
      <div className='container mt-10'>
        <div className='flex flex-col lg:flex-row gap-5 lg:gap-10'>
          <div className='w-full lg:w-[70%] flex flex-col gap-4'>
            <div className='bg-white rounded p-2 md:p-5'>
              <h1 className=' md:text-lg font-medium'>Select Payment Method</h1>
              <div className='flex items-center justify-center gap-2 flex-wrap mt-3 md:mt-5'>
                {loading && !list && (
                  <>
                    <div className='w-[100px] h-[40px] md:w-[140px] md:h-[60px] animate-pulse bg-slate-100 rounded'></div>
                    <div className='w-[100px] h-[40px] md:w-[140px] md:h-[60px] animate-pulse bg-slate-100 rounded'></div>
                    <div className='w-[100px] h-[40px] md:w-[140px] md:h-[60px] animate-pulse bg-slate-100 rounded'></div>
                    <div className='w-[100px] h-[40px] md:w-[140px] md:h-[60px] animate-pulse bg-slate-100 rounded'></div>
                  </>
                )}
                {list?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPaymentMethod(item)}
                    className={`flex items-center gap-2  py-1 px-2 md:py-1  md:px-4 rounded cursor-pointer ${
                      paymentMethod?.id === item.id
                        ? "bg-orange-300 "
                        : "bg-slate-100"
                    } `}
                  >
                    <img
                      src={`${import.meta.env.VITE_APP_API}/files/${item.logo}`}
                      alt=''
                      className='h-8 w-8 md:h-14 md:w-14 object-fill'
                    />
                    <h3
                      className={` md:text-lg text-gray-600  md:font-extrabold ${
                        paymentMethod?.id === item.id && "text-gray-800"
                      }`}
                    >
                      {item.methodName}
                    </h3>
                  </div>
                ))}
              </div>
              <hr className='my-3' />
              {paymentMethod && (
                <div className='productDescription'>
                  <p className='text-center'>
                    <span>
                      Our Account:{" "}
                      <span className='font-semibold'>
                        {paymentMethod.ownerAccount}
                      </span>
                    </span>
                  </p>
                  <div
                    className='p-2 md:p-10'
                    dangerouslySetInnerHTML={{
                      __html: paymentMethod.instruction,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='w-full lg:w-[30%]'>
            <div className='bg-white rounded p-3'>
              <div className='flex flex-col gap-1'>
                <div className='flex justify-between items-center'>
                  <h3 className='font-semibold'>Order summary</h3>
                </div>
                {cart && (
                  <div className='flex justify-between items-center'>
                    <h3 className='font-medium md:font-medium'>
                      Total payment
                    </h3>
                    <span className=''>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: currency?.currencySymbol,
                        }}
                      />{" "}
                      {couponCalculate(cart.totalAmount, state?.coupon)
                        ?.discountedPrice + (state.deliveryFee || 0) ||
                        cart.totalAmount + (state.deliveryFee || 0)}
                    </span>
                  </div>
                )}
                <p className='text-sm text-end pb-5'>
                  VAT included, where applicable and
                  <br />
                  delivery charge will be added
                </p>

                <Form
                  form={form}
                  onFinish={onFinish}
                  labelCol={{
                    span: 8,
                  }}
                  wrapperCol={{
                    span: 16,
                  }}
                  layout='horizontal'
                >
                  {paymentMethod && paymentMethod.id !== 1 && (
                    <div>
                      <Form.Item
                        label='Your account'
                        name='CustomerAccount'
                        rules={[
                          {
                            required: true,
                            message: "Please input your account ",
                          },
                        ]}
                      >
                        <Input placeholder='Input your account ' />
                      </Form.Item>
                      <Form.Item
                        label='TRX-ID'
                        className='-mt-5 '
                        name='CustomerTransactionId'
                        rules={[
                          {
                            required: true,
                            message: "Please input Transaction Id",
                          },
                        ]}
                      >
                        <Input placeholder='Input Transaction Id' />
                      </Form.Item>
                    </div>
                  )}
                  <Form.Item
                    wrapperCol={{
                      span: 24,
                    }}
                  >
                    <button
                      disabled={!paymentMethod?.id || loader}
                      type='submit'
                      className={`bg-ePrimary text-white  w-full rounded-md py-2 ${
                        !paymentMethod?.id && "bg-slate-600"
                      }`}
                    >
                      {loader && (
                        <Spin
                          indicator={
                            <LoadingOutlined
                              style={{
                                fontSize: 18,
                                color: "#ffffff",
                                marginRight: "5px",
                              }}
                              spin
                            />
                          }
                        />
                      )}
                      Confirm order
                    </button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
