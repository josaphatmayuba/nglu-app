import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  clearOrder,
  loadSingleECommerceSale,
} from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";

import NewOrderInvoice from "@/components/Invoice/NewOrderInvoice";
import NewOrderPackingInvoice from "@/components/Invoice/NewOrderPackingInvoice";
import { SolutionOutlined } from "@ant-design/icons";
import { Badge, Card, Typography } from "antd";
import moment from "moment";
import { Fragment } from "react";
import { useSelector } from "react-redux";
import { nameRender } from "../../../utils/functions";
import useCurrency from "../../../utils/useCurrency";
import CardComponent from "../../Card/card.components";
import UpdatePayment from "../../ManualPayment/UpdatePayment";
import Loader from "../../loader/loader";
import OrderProductList from "./OrderProductList";
import OrderStatus from "./OrderStatus";
import OrderTransactionsList from "./OrderTransactionsList";
import ReturnProductList from "./ReturnProductList";
//PopUp

export default function DetailsOrder() {
  const { id } = useParams();
  const currency = useCurrency();
  //dispatch
  const dispatch = useDispatch();
  const { sale, loading } = useSelector((state) => state.ESale);

  useEffect(() => {
    dispatch(loadSingleECommerceSale(id));

    return () => {
      dispatch(clearOrder());
    };
  }, [dispatch, id]);
  return (
    <div>
      <div>
        {sale ? (
          <Fragment key={sale.singleCartOrder.id}>
            <Card bordered={false} className="card-custom">
              <h5 className="flex justify-start items-center gap-2 text-xl">
                <SolutionOutlined />
                <span className="mr-left">ID : {sale.singleCartOrder.id} </span>
              </h5>
              <div className=" flex justify-center mt-5 flex-wrap gap-2">
                <div>
                  {sale?.singleCartOrder && (
                    <NewOrderInvoice
                      data={sale.singleCartOrder}
                      vatAmount={sale.totalVatAmount}
                      title={"Order Invoice"}
                    />
                  )}
                </div>
                <div>
                  {sale?.singleCartOrder && (
                    <NewOrderPackingInvoice
                      title={"Order packing Slip"}
                      data={sale.singleCartOrder}
                    />
                  )}
                </div>

                <div className="text-end mr-2">
                  <OrderStatus
                    deliveryFee={sale.deliveryFee}
                    invoiceId={sale.singleCartOrder.id}
                  />
                </div>
              </div>
              <div className="card-body mt-5">
                <div className="flex flex-col md:flex-row items-start gap-10">
                  <div className="w-full flex flex-col gap-5">
                    <Badge.Ribbon
                      text={sale.status}
                      color={sale.status === "PAID" ? "green" : "red"}
                    >
                      <Badge.Ribbon
                        text={sale.singleCartOrder.orderStatus}
                        color={
                          sale.singleCartOrder.orderStatus === "DELIVERED"
                            ? "success"
                            : "orange"
                        }
                        className="mt-10"
                      >
                        <CardComponent title="Sale Invoice Information ">
                          <p>
                            <Typography.Text strong>
                              Total Amount :
                            </Typography.Text>{" "}
                            <strong>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.singleCartOrder?.totalAmount
                                ? Number(
                                    sale.singleCartOrder.totalAmount
                                  ).toFixed(2)
                                : 0}
                            </strong>
                          </p>

                          <p>
                            <Typography.Text strong>
                              Due Amount :
                            </Typography.Text>{" "}
                            <strong style={{ color: "red" }}>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.singleCartOrder?.due
                                ? Number(sale.singleCartOrder.due).toFixed(2)
                                : 0}
                            </strong>
                          </p>

                          <p>
                            <Typography.Text strong>
                              Paid Amount :
                            </Typography.Text>{" "}
                            <strong>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.singleCartOrder?.paidAmount
                                ? Number(
                                    sale.singleCartOrder.paidAmount
                                  ).toFixed(2)
                                : 0}
                            </strong>
                          </p>

                          <p>
                            <Typography.Text strong>Discount :</Typography.Text>{" "}
                            <strong>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.singleCartOrder?.discount
                                ? Number(sale.singleCartOrder.discount).toFixed(
                                    2
                                  )
                                : 0}
                            </strong>
                          </p>
                          <p>
                            <Typography.Text strong>
                              Delivery Fee :
                            </Typography.Text>{" "}
                            <strong>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.deliveryFee
                                ? Number(sale.deliveryFee).toFixed(2)
                                : 0}
                            </strong>
                          </p>

                          <p>
                            <Typography.Text strong>Profit :</Typography.Text>{" "}
                            <strong>
                              {
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: currency?.currencySymbol,
                                  }}
                                />
                              }
                              {sale.singleCartOrder?.profit
                                ? Number(sale.singleCartOrder.profit).toFixed(2)
                                : 0}
                            </strong>
                          </p>

                          <p>
                            <Typography.Text strong>
                              Sale Date :
                            </Typography.Text>{" "}
                            <strong>
                              {sale.singleCartOrder.createdAt.slice(0, 10)}
                            </strong>
                          </p>
                        </CardComponent>
                      </Badge.Ribbon>
                    </Badge.Ribbon>
                    <CardComponent title="Customer Information">
                      <p>
                        <Typography.Text strong>
                          Customer Name :
                        </Typography.Text>{" "}
                        <strong>
                          <Link
                            to={`/admin/customer/${sale?.singleCartOrder?.customerId}`}
                          >
                            {nameRender(sale.singleCartOrder.customer)}
                          </Link>
                        </strong>
                      </p>

                      <p>
                        <Typography.Text strong>Phone :</Typography.Text>{" "}
                        <strong>{sale.singleCartOrder.customer.phone}</strong>
                      </p>

                      <p>
                        <Typography.Text strong>Address :</Typography.Text>{" "}
                        <strong>{sale.singleCartOrder.customer.address}</strong>
                      </p>
                    </CardComponent>
                  </div>
                  <div className="w-full flex flex-col gap-5">
                    <CardComponent title="Delivery Information">
                      <p>
                        <Typography.Text strong>
                          Delivery Area :
                        </Typography.Text>{" "}
                        <strong>
                          {sale.singleCartOrder?.deliveryFee?.deliveryArea} (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: currency?.currencySymbol,
                            }}
                          />{" "}
                          {sale.singleCartOrder?.deliveryFee?.deliveryFee})
                        </strong>
                      </p>
                      <p>
                        <Typography.Text strong>
                          Delivery Address :
                        </Typography.Text>{" "}
                        <strong>{sale.singleCartOrder.deliveryAddress}</strong>
                      </p>
                      <p>
                        <Typography.Text strong>
                          Customer Phone :
                        </Typography.Text>{" "}
                        <strong>{sale.singleCartOrder.customerPhone}</strong>
                      </p>
                      {sale.singleCartOrder?.courierMedium
                        ?.courierMediumName && (
                        <>
                          <h1 className="text-[16px] font-medium py-3">
                            {" "}
                            Assigned Delivery Media
                          </h1>
                          <hr />
                          <p className="pt-3">
                            <Typography.Text strong>
                              {sale.singleCartOrder?.courierMedium?.type ===
                              "courier"
                                ? "Courier:"
                                : "Delivery Man:"}
                            </Typography.Text>{" "}
                            <strong>
                              {
                                sale.singleCartOrder?.courierMedium
                                  ?.courierMediumName
                              }
                            </strong>
                          </p>
                        </>
                      )}
                      {sale.singleCartOrder?.courierMedium?.phone && (
                        <p>
                          <Typography.Text strong>
                            {sale.singleCartOrder?.courierMedium?.type ===
                            "courier"
                              ? "Courier Phone :"
                              : "Phone: "}
                          </Typography.Text>{" "}
                          <strong>
                            {sale.singleCartOrder?.courierMedium?.phone}{" "}
                          </strong>
                        </p>
                      )}
                    </CardComponent>
                    {sale.singleCartOrder?.manualPayment?.map((info, index) => (
                      <CardComponent
                        key={index}
                        title={
                          <div className="flex justify-between items-center overflow-auto gap-2">
                            <p>Payment Method Information</p>
                            <UpdatePayment data={info} id={id} />
                          </div>
                        }
                      >
                        <p>
                          <Typography.Text strong>
                            Payment Method :
                          </Typography.Text>{" "}
                          <strong>{info.paymentMethod.methodName}</strong>
                        </p>

                        {info.customerTransactionId && (
                          <p>
                            <Typography.Text strong>TRX ID :</Typography.Text>{" "}
                            <strong>{info.customerTransactionId}</strong>
                          </p>
                        )}

                        <p>
                          <Typography.Text strong>Amount :</Typography.Text>{" "}
                          <strong>
                            {
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: currency?.currencySymbol,
                                }}
                              />
                            }
                            {info.amount}
                          </strong>
                        </p>
                        <p>
                          <Typography.Text strong>
                            Payment Status :
                          </Typography.Text>{" "}
                          <strong
                            className={` uppercase rounded-sm px-2 py-[2px] ${
                              info.isVerified == "Pending" &&
                              "text-orange-500 bg-orange-500/10"
                            }
                 
                  ${
                    info.isVerified == "Accept" &&
                    "text-green-500 bg-green-500/10"
                  }
                  ${info.isVerified == "Reject" && "text-red-500 bg-red-500/10"}
                    `}
                          >
                            {info.isVerified}
                          </strong>
                        </p>
                        <p>
                          <Typography.Text strong>
                            Payment Date :
                          </Typography.Text>{" "}
                          <strong>
                            {moment(info.createdAt).format(
                              "MMMM Do YYYY, h:mm:ss a"
                            )}
                          </strong>
                        </p>
                      </CardComponent>
                    ))}
                  </div>
                </div>
                <br />
              </div>
            </Card>
            <OrderProductList list={sale.singleCartOrder.cartOrderProduct} />
            {sale?.returnSingleCartOrder.length > 0 && (
              <ReturnProductList list={sale.returnSingleCartOrder} />
            )}
            <OrderTransactionsList list={sale.transactions} />
          </Fragment>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
}
