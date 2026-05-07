import NewEcomOrderInvoice from "@/components/Invoice/NewEcomOrderInvoice";
import { cn } from "@/utils/functions";
import { Modal } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { AiFillQuestionCircle } from "react-icons/ai";
import { BsCurrencyExchange } from "react-icons/bs";
import { FaOpencart, FaShippingFast } from "react-icons/fa";
import { FaMapLocationDot } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { loadSingleECommerceSale } from "../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import useCurrency from "../../utils/useCurrency";
import OrderCard from "../Card/OrderCard";
import OrderLoading from "./OrderLoading";
import ReturnRefund from "./ReturnRefund";
export default function Order() {
  const { id } = useParams("id");
  const dispatch = useDispatch();
  const currency = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(false);

  const { sale, loading } = useSelector((state) => state.ESale);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const logOut = () => {
    localStorage.clear();
    window.location.replace("/");
  };
  useEffect(() => {
    dispatch(loadSingleECommerceSale(id));
  }, [dispatch, id]);

  let content;

  if (loading) {
    content = <OrderLoading />;
  } else if (!loading && sale) {
    content = (
      <>
        <div className='container flex justify-between items-center my-5'>
          <h2 className='text-xl font-bold'>Order Details</h2>
          <button
            className='bg-red-500 text-white px-3 py-1 rounded'
            onClick={logOut}
          >
            Logout
          </button>
        </div>
        <div className='my-5'>
          <div className='container bg-white py-5'>
            <div className='border-b flex justify-between pb-3'>
              <div>
                <h3 className='-mb-1'>
                  Order ID: <span className=' font-semibold'>{`${id}`}</span>
                </h3>
                <span className='text-gray-500 text-sm '>
                  Placed on{" "}
                  {moment(sale.singleCartOrder.createdAt).format(
                    "MMMM Do YYYY, h:mm:ss a"
                  )}
                </span>
              </div>
              <div>
                {sale && (
                  <NewEcomOrderInvoice
                    title={"Order Invoice"}
                    data={sale}
                    orderStatus={sale.singleCartOrder.orderStatus}
                  />
                )}
              </div>
            </div>

            <div className='py-3'>
              <div className='flex justify-end'>
                {/* <div>
                {sale.singleCartOrder.orderStatus === "DELIVERED" && (
                  <h3 className="text-sm md:text-base">
                    Delivered on{" "}
                    {moment(sale.singleCartOrder.updatedAt).format(
                      "MMMM Do YYYY, h:mm:ss a"
                    )}
                  </h3>
                )}
              </div> */}
                <div>
                  <div className='flex justify-end text-sm md:text-base my-2 md:my-0'>
                    Delivery Status:{" "}
                    <span
                      className={`mx-2 rounded px-2 py-[1px] text-ePrimary bg-ePrimary/10 ${
                        sale.singleCartOrder.orderStatus == "PENDING" &&
                        "text-orange-500 bg-orange-500/10"
                      }
                  ${
                    sale.singleCartOrder.orderStatus == "RECEIVED" &&
                    "text-ePrimary bg-ePrimary/10"
                  }
                  ${
                    sale.singleCartOrder.orderStatus == "DELIVERED" &&
                    "text-green-500 bg-green-500/10"
                  }
                  ${
                    sale.singleCartOrder.orderStatus == "CANCELLED" &&
                    "text-red-500 bg-red-500/10"
                  }
                    `}
                    >
                      {sale.singleCartOrder.orderStatus}
                    </span>
                  </div>
                  <div className='flex gap-2 py-2'>
                    <span className='flex justify-end text-sm md:text-base  md:my-0'>
                      Payment Status:
                    </span>
                    <span>
                      <span
                        className={cn(` rounded px-2 py-[1px] text-[16px]
                     ${
                       sale.status === "PAID"
                         ? "text-green-500 bg-green-50"
                         : "text-red-500 bg-red-50"
                     }
                    `)}
                      >
                        {sale.status}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ordered Product List  */}
            <div className='py-5 max-h-[400px] overflow-y-auto'>
              {sale.singleCartOrder.cartOrderProduct.map((item, index) => (
                <OrderCard
                  key={index}
                  item={item}
                  showModal={showModal}
                  setSelectedProduct={setSelectedProduct}
                  invoice={sale}
                />
              ))}
            </div>
          </div>

          {/* bottom section */}
          <div className='flex flex-col md:flex-row justify-between gap-5 container bg-white my-5 p-3'>
            <div className='w-full  md:w-2/3'>
              <div className='flex items-center gap-2'>
                <FaMapLocationDot className='text-ePrimary' />{" "}
                <h3>Shipping address</h3>
              </div>
              <div className='flex gap-2 text-gray-600 mt-2'>
                <span>Address: </span>
                <p>{sale?.singleCartOrder?.address}</p>
              </div>
              {/* <div className="flex gap-2 text-gray-600 mt-1">
              <span>Phone: </span>
              <p>{sale.singleCartOrder.customerPhone}</p>
            </div> */}
              {sale.singleCartOrder?.courierMedium && (
                <>
                  <div className='flex items-center gap-2 mt-3'>
                    <FaShippingFast className='text-ePrimary' />{" "}
                    <h3>Delivery by</h3>
                  </div>
                  <div className='text-gray-600'>
                    {sale.singleCartOrder.courierMedium && (
                      <>
                        <div className='flex gap-2'>
                          {sale.singleCartOrder.courierMedium.type ==
                          "courier" ? (
                            <span>Courier Name:</span>
                          ) : (
                            <span>DeliveryBoy Name:</span>
                          )}
                          <p className='text-black font-semibold'>
                            {
                              sale.singleCartOrder.courierMedium
                                ?.courierMediumName
                            }
                          </p>
                        </div>
                        <div className='flex gap-2'>
                          <span>Phone number:</span>
                          <p className='text-black font-semibold'>
                            {sale.singleCartOrder.courierMedium?.phone}
                          </p>
                        </div>
                      </>
                    )}
                    {sale.singleCartOrder.deliveryBoy && (
                      <>
                        <div className='flex gap-2'>
                          <span>Delivery Boy:</span>
                          <p className='text-black font-semibold'>
                            {sale.singleCartOrder.deliveryBoy?.userName}
                          </p>
                        </div>
                        <div className='flex gap-2'>
                          <span>Phone number:</span>
                          <p className='text-black font-semibold'>
                            {sale.singleCartOrder.deliveryBoy?.phone}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {sale.singleCartOrder?.manualPayment?.map((item) => (
                    <>
                      <div className='flex items-center gap-2 mt-3'>
                        <BsCurrencyExchange className='text-ePrimary' />{" "}
                        <h3>Payment by</h3>
                      </div>
                      <div className='text-gray-600'>
                        {item.paymentMethod.methodName}
                      </div>
                      <div className='flex gap-2'>
                        <span>Status:</span>
                        <p className='text-black font-semibold'>
                          {sale.status}
                        </p>
                      </div>
                    </>
                  ))}
                </>
              )}
            </div>
            <div className=' w-full md:w-1/3'>
              <div className='flex items-center gap-2'>
                <FaOpencart className='text-ePrimary' /> <h3>Order Summery</h3>
              </div>
              <div className='flex flex-col gap-1 mt-3 text-gray-600'>
                <div className='flex justify-between items-center'>
                  <h3>Items Total</h3>
                  <span className=''>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: currency?.currencySymbol,
                      }}
                    />{" "}
                    {(sale.totalAmount - (sale.deliveryFee || 0)).toFixed(2)}
                  </span>
                </div>
                {(sale.deliveryFee === 0 || sale.deliveryFee) && (
                  <div className='flex justify-between items-center'>
                    <h3 className='flex items-center gap-1'>
                      <span>Delivery Fee </span>
                      <span className='cursor-pointer relative group'>
                        <AiFillQuestionCircle />
                        <p className='group-hover:inline-block duration-200 hidden p-[10px]  w-[280px] rounded-lg bg-slate-100 absolute bottom-5 -left-20 md:left-0 shadow-lg'>
                          Lorem ipsum dolor sit amet consectetur adipisicing
                          elit.
                        </p>
                      </span>
                    </h3>
                    <span className=''>
                      {" "}
                      <span
                        dangerouslySetInnerHTML={{
                          __html: currency?.currencySymbol,
                        }}
                      />{" "}
                      {sale.deliveryFee?.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between items-center'>
                  <h3>Total payable</h3>
                  <span className=''>
                    {" "}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: currency?.currencySymbol,
                      }}
                    />{" "}
                    {sale.totalAmount?.toFixed(2)}
                  </span>
                </div>
                {/* {sale.dueAmount === 0 ? (
                <div className="text-end">
                  <span className="italic uppercase text-green-500 bg-green-200 px-2 ">
                    Paid
                  </span>{" "}
                  <i className="font-extralight">By </i>
                  <span className="italic uppercase font-light">
                    {
                      sale?.singleCartOrder?.manualPayment[0]?.paymentMethod
                        ?.methodName
                    }
                  </span>
                </div>
              ) : ( */}

                <div className='flex justify-between items-center'>
                  <h3>Due amount</h3>
                  {sale?.dueAmount ? (
                    <span className=''>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: currency?.currencySymbol,
                        }}
                      />
                      {sale.dueAmount?.toFixed(2)}
                    </span>
                  ) : (
                    "$ 0"
                  )}
                </div>

                {/* )} */}
                <p className='text-sm text-end pb-5'>
                  VAT included, where applicable
                </p>
              </div>
            </div>
          </div>

          <Modal
            title='Return/Refund'
            open={isModalOpen}
            onCancel={handleCancel}
            footer={false}
          >
            <ReturnRefund
              selectedProduct={selectedProduct}
              handleCancel={handleCancel}
            />
          </Modal>
          {/* just For You 
        <div className="container bg-white">
          <JustForYou />
        </div> */}
        </div>
      </>
    );
  }
  return content;
}
