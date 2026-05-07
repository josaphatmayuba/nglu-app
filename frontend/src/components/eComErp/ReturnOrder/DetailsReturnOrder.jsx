import { SolutionOutlined } from "@ant-design/icons";
import { Badge, Card, Typography } from "antd";
import moment from "moment";
import React, { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { loadSingleReturnOrder } from "../../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";
import { nameRender } from "../../../utils/functions";
import CardComponent from "../../Card/card.components";
import Loader from "../../loader/loader";
import ReturnProductList from "./ReturnProductList";
import ReturnStatus from "./ReturnStatus";

export default function DetailsReturnOrder() {
  const { id } = useParams("id");
  const dispatch = useDispatch();
  const { returnOrder, loading } = useSelector((state) => state.returnOrder);
  useEffect(() => {
    dispatch(loadSingleReturnOrder(id));
  }, [dispatch, id]);
  return (
    <div>
      {returnOrder ? (
        <Fragment key={returnOrder.id}>
          <Card bordered={false} className="card-custom">
            <h5 className="flex justify-start items-center gap-2 text-xl">
              <SolutionOutlined />
              <span className="mr-left">ID : {returnOrder.id} </span>
            </h5>
            <div className="card-header flex justify-center ">
              {/* <div className={"text-end mr-2"}>
                <OrderInvoice
                  data={singleCartOrder}
                  vatAmount={totalVatAmount}
                />
              </div>
              <div className={"text-end mr-2"}>
                <OrderPackingSlip data={singleCartOrder} />
              </div> */}
              <div className="text-end mr-2">
                <ReturnStatus data={returnOrder} />
              </div>
            </div>
            <div className="card-body mt-5">
              <div className="flex flex-col md:flex-row items-start gap-10">
                <div className="w-full flex flex-col gap-5">
                  <Badge.Ribbon
                    text={returnOrder.returnCartOrderStatus}
                    color={
                      returnOrder.returnCartOrderStatus === "DELIVERED"
                        ? "success"
                        : "orange"
                    }
                  >
                    {" "}
                    <CardComponent title="Return Information">
                      <p>
                        <Typography.Text strong>Order Id :</Typography.Text>{" "}
                        <strong>
                          <Link to={`/admin/order/${returnOrder.cartOrderId}`}>
                            {returnOrder.cartOrderId}
                          </Link>
                        </strong>
                      </p>

                      <p>
                        <Typography.Text strong>Return Type :</Typography.Text>{" "}
                        <strong>{returnOrder.returnType}</strong>
                      </p>

                      <p>
                        <Typography.Text strong>
                          Return Status :
                        </Typography.Text>{" "}
                        <strong>{returnOrder.returnCartOrderStatus}</strong>
                      </p>
                      <p>
                        <Typography.Text strong>Return Date :</Typography.Text>{" "}
                        <strong>
                          {moment(returnOrder.createdAt).format(
                            "MMMM Do YYYY, h:mm:ss a"
                          )}
                        </strong>
                      </p>
                    </CardComponent>
                  </Badge.Ribbon>
                </div>
                <div className="w-full flex flex-col gap-5">
                  <CardComponent title="Return  Amount Information">
                    <p>
                      <Typography.Text strong>Total Amount :</Typography.Text>{" "}
                      <strong>{returnOrder.totalAmount.toFixed(2)}</strong>
                    </p>

                    <p>
                      <Typography.Text strong>Total Vat :</Typography.Text>{" "}
                      <strong>{returnOrder.totalVatAmount}</strong>
                    </p>

                    <p>
                      <Typography.Text strong>
                        Discount Amount :
                      </Typography.Text>{" "}
                      <strong>{returnOrder.totalDiscountAmount}</strong>
                    </p>
                    <p>
                      <Typography.Text strong> Coupon Amount:</Typography.Text>{" "}
                      <strong>{returnOrder.couponAmount}</strong>
                    </p>
                  </CardComponent>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-start gap-10">
                <div className="w-full flex flex-col mt-5">
                  <CardComponent title="Return  Note Information">
                    <p>
                      <p className="font-medium">{returnOrder.note}</p>
                    </p>
                  </CardComponent>
                </div>
                <div className="w-full flex flex-col mt-5">
                  <CardComponent title="Customer Information">
                    <p>
                      <Typography.Text strong>Customer Name :</Typography.Text>{" "}
                      <strong>
                        <Link
                          to={`/admin/hr/staffs/${returnOrder.cartOrder.customerId}`}
                        >
                          {nameRender(returnOrder.cartOrder.customer)}
                        </Link>
                      </strong>
                    </p>

                    <p>
                      <Typography.Text strong>Phone :</Typography.Text>{" "}
                      <strong>{returnOrder.cartOrder.customer.phone}</strong>
                    </p>

                    <p>
                      <Typography.Text strong>Address :</Typography.Text>{" "}
                      <strong>{returnOrder.cartOrder.customer.address}</strong>
                    </p>
                  </CardComponent>
                </div>
              </div>
            </div>
          </Card>

          <ReturnProductList list={returnOrder.returnCartOrderProduct} />
        </Fragment>
      ) : (
        <Loader />
      )}
    </div>
  );
}
