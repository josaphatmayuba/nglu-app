import { Card, Form, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loadAllCartByCustomerId } from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import { loadSingleCustomerEcom } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import { loadAllDeliveryFee } from "../../redux/rtk/features/eCommerce/deliveryFee/deliveryFeeSlice";
import useCurrency from "../../utils/useCurrency";
import PricingTable from "./PricingTable";
import ProductTable from "./ProductTable";

export default function ProceedToCheckout() {
  const customerId = localStorage.getItem("id");
  const { list } = useSelector((state) => state.cartDynamic);
  const { customer } = useSelector((state) => state.customerECommerce);
  const { list: deliveryFee, loading } = useSelector(
    (state) => state.deliveryFee
  );
  const userName = localStorage.getItem("user");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const currency = useCurrency();
  const [deliveryFeeId, setDeliveryFeeId] = useState();

  const onFinish = async (values) => {
    navigate("/proceed-to-checkout/payment", {
      state: {
       
        deliveryAddress: values.deliveryAddress,
        customerPhone: values.customerPhone,
        deliveryFeeId: values.deliveryFeeId,
        deliveryFee: deliveryFee?.find(
          (item) => item.id === Number(deliveryFeeId)
        )?.deliveryFee,
      },
    });
  };

  const handleDeliveryFee = (value) => {
    setDeliveryFeeId(value);
  };

  useEffect(() => {
    dispatch(loadAllDeliveryFee());
  }, [dispatch]);
  useEffect(() => {
    if (customerId) {
      dispatch(loadAllCartByCustomerId(customerId));
    }
  }, [customerId, dispatch]);
  useEffect(() => {
    if (!customer) {
      dispatch(loadSingleCustomerEcom());
    } else {
      form.setFieldsValue({
        deliveryAddress: customer?.address,
        customerPhone: customer?.phone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, dispatch]);
  let content = null;
  if (list?.cartProducts?.length > 0) {
    content = (
      <div className='container mt-10'>
        <div className='flex flex-col lg:flex-row gap-5 lg:gap-10'>
          <div className='w-full lg:w-[70%] flex flex-col gap-4'>
            <Card className='bg-white' title={`Deliver to: ${userName}`}>
              <Form form={form} onFinish={onFinish} layout='vertical'>
                <Form.Item
                  name='deliveryAddress'
                  label='Shipping address'
                  className='w-full'
                  rules={[
                    {
                      required: true,
                      message: "Please enter shipping address",
                    },
                  ]}
                >
                  <Input placeholder='Enter shipping address' />
                </Form.Item>
                <div className='sm:flex gap-3'>
                  <Form.Item
                    name='customerPhone'
                    label='Phone number'
                    className='sm:w-1/2'
                    rules={[
                      {
                        required: true,
                        message: "Please enter shipping address",
                      },
                    ]}
                  >
                    <Input placeholder='Enter shipping Phone number' />
                  </Form.Item>
                  <Form.Item
                    name='deliveryFeeId'
                    label='Select delivery area'
                    className='sm:w-1/2'
                    rules={[
                      {
                        required: true,
                        message: "Please select delivery option",
                      },
                    ]}
                  >
                    <Select
                      onChange={handleDeliveryFee}
                      size='middle'
                      className='py-[3px]'
                      popupClassName='bg-white'
                      placeholder="please select delivery area "
                    >
                      {deliveryFee &&
                        deliveryFee.map((fee) => (
                          <Select.Option key={fee.id}>
                            {fee.deliveryArea} -{" "}
                            <span
                              dangerouslySetInnerHTML={{
                                __html: currency?.currencySymbol,
                              }}
                            />
                            {`${fee.deliveryFee}`}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>
                </div>
              </Form>
            </Card>
            <ProductTable list={list} />
          </div>
          <div className='w-full lg:w-[30%]'>
            <PricingTable
              list={list}
              deliveryFeeId={deliveryFeeId}
              form={form}
            />
          </div>
        </div>
      </div>
    );
  } else if (list?.error || list?.cartProducts?.length === 0) {
    content = <Navigate to={"/"} />;
  }
  return content;
}
