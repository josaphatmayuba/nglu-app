/* eslint-disable react-refresh/only-export-components */
import Button from "@/UI/Button";
import Card from "@/UI/Card";
import List from "@/UI/List";
import Menu from "@/UI/Menu";
import Tabs, { Tab } from "@/UI/Tabs";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { Drawer, Popover, Tag } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaRegPaperPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { clearSale, loadSingleSale } from "@/redux/rtk/features/sale/saleSlice";
import ReturnSaleInvoiceList from "../Card/saleInvoice/ReturnSaleInvoiceList";
import SaleProductListCard from "../Card/saleInvoice/SaleProductListCard";
import TransactionSaleList from "../Card/saleInvoice/TransactionSaleList";
import NewSaleInvoice from "../Invoice/NewSaleInvoice";
import NewSalePackingInvoice from "../Invoice/NewSalePackingInvoice";
import PosPrint from "../Invoice/PosPrint";
import Loader from "../loader/loader";
import AddTransaction from "../transaction/AddTransaction";
import ChangeOrderStatus from "./ChangeOrderStatus";
import SendSaleInvoice from "./SendSaleInvoice";
import ModalUi from "@/UI/ModalUi";
import SaleInvoicePayment from "./SaleInvoicePayment";

//PopUp

export function dateDiffChecker(date) {
  // calculate due date over from current date
  const invoiceDueDate = moment(date);
  const currentDate = moment();
  if (currentDate > invoiceDueDate) {
    return "Overdue";
  }
}

const DetailSale = () => {
  const { id } = useParams();
  const [sendEmail, setSendEmail] = useState(false);
  const [visibleTransactionCreate, setVisibleTransactionCreate] =
    useState(false);
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  //dispatch
  const dispatch = useDispatch();
  const [edit, setEdit] = useState(false);
  const sale = useSelector((state) => state?.sales?.sale);
  const {
    status,
    totalPaidAmount,
    totalVatAmount,
    totalReturnAmount,
    instantPaidReturnAmount,
    dueAmount,
    singleSaleInvoice,
    returnSaleInvoice,
    transactions,
  } = sale ? sale : {};

  useEffect(() => {
    dispatch(loadSingleSale(id));
    return () => {
      dispatch(clearSale());
    };
  }, [id, dispatch]);
  const customerEmail = singleSaleInvoice?.customer?.email;
  const subject = `Your order has been placed. Order ID #${singleSaleInvoice?.id}`;
  const body = `
<div>Dear <strong>${singleSaleInvoice?.customer?.username}</strong>,</div>
<div>Greetings! We trust this message reaches you in great spirits. We are immensely grateful for the privilege of having you as our esteemed customer.</div>
<br>
<strong>Order Information:</strong><br>
<p>Order ID: ${singleSaleInvoice?.id}</p>
<p>Order Date: ${moment(singleSaleInvoice?.date).format("ll")}</p>
<br>
<strong>Invoice Details:</strong><br>
<p>Total Amount: $${singleSaleInvoice?.totalAmount
      ? Number(
        singleSaleInvoice.totalAmount +
        (singleSaleInvoice?.totalDiscountAmount || 0),
      ).toFixed(2)
      : 0
    } </p>
<p>Discount: $${singleSaleInvoice?.totalDiscountAmount
      ? Number(singleSaleInvoice.totalDiscountAmount).toFixed(2)
      : 0
    } </p>
<p>
Tax: $${singleSaleInvoice?.totalTaxAmount
      ? Number(singleSaleInvoice.totalTaxAmount).toFixed(2)
      : 0
    } </p>
<p>Paid Amount: $${totalPaidAmount ? Number(totalPaidAmount).toFixed(2) : 0}</p>
<p>Due Amount: $${dueAmount ? Number(dueAmount).toFixed(2) : 0}</p>
<br>
<p>Best Regards,</p>
<p>${companyInfo?.companyName}</p>
<p>${companyInfo?.phone}</p>
<p>${companyInfo?.email}</p>`;

  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);

  return (
    <>
      {singleSaleInvoice ? (
        <>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <Card className="w-full md:w-2/3" bodyClass={"p-0"}>
              <div className="flex justify-end mx-2 py-2 border-b items-center">
                <div className="flex gap-3">
                  <div className={"text-end "}>
                    {singleSaleInvoice && (
                      <NewSaleInvoice sale={sale} title={"Sale Invoice"} />
                    )}
                  </div>
                  <Button
                    className="flex-row-reverse"
                    color="gray"
                    icon={<FaRegPaperPlane size={15} />}
                    onClick={() => setSendEmail(true)}
                  >
                    Send
                  </Button>

                  <Popover
                    content={
                      <Menu
                        items={[
                          {
                            label: (
                              <>
                                <span
                                  onClick={() => {
                                    setEdit({ singleSaleInvoice, dueAmount });
                                  }}
                                >
                                  <button
                                    className="flex items-center gap-2 rounded disabled:cursor-not-allowed disabled:opacity-50 py-1"
                                    disabled={sale?.dueAmount <= 0}
                                  >
                                    {/* <MdPayments className="text-[1rem]" /> */}
                                    Make a payment
                                  </button>
                                </span>
                              </>
                            ),
                            key: "edit",
                          },
                          {
                            key: "status",
                            label: (
                              <ChangeOrderStatus
                                saleId={singleSaleInvoice.id}
                              />
                            ),
                          },
                          {
                            key: "2",
                            label: (
                              <Link to={`/admin/sale/return/${id}`}>
                                Return
                              </Link>
                            ),
                          },
                          {
                            key: "3",
                            label: singleSaleInvoice && (
                              <NewSalePackingInvoice
                                title={"packing slip"}
                                data={singleSaleInvoice}
                              />
                            ),
                          },
                          {
                            key: "4",
                            label: (
                              <PosPrint
                                data={singleSaleInvoice}
                                vatAmount={totalVatAmount}
                              />
                            ),
                          },
                        ]}
                      />
                    }
                    placement="bottomRight"
                    arrow={false}
                    trigger="click"
                  >
                    <Button
                      color={"gray"}
                      icon={<BsThreeDotsVertical size={15} />}
                      className="  px-3"
                    ></Button>
                  </Popover>
                </div>
              </div>
              {sendEmail ? (
                <div>
                  <SendSaleInvoice
                    body={body}
                    subject={subject}
                    setSendEmail={setSendEmail}
                    customerEmail={customerEmail}
                  />
                </div>
              ) : (
                <Tabs className="mt-4">
                  <Tab label="Products">
                    <SaleProductListCard
                      list={singleSaleInvoice.saleInvoiceProduct}
                    />
                  </Tab>
                  <Tab label="Return products">
                    <ReturnSaleInvoiceList list={returnSaleInvoice} />
                  </Tab>
                  <Tab label="Transactions">
                    <TransactionSaleList list={transactions} />
                  </Tab>
                </Tabs>
              )}
            </Card>
            <div className="w-full md:w-1/3 flex flex-col gap-2 md:gap-4">
              <Card
                title={
                  <div className="flex items-center">
                    <span className="font-normal">
                      Invoice No{" "}
                      <span className="font-semibold">
                        #{singleSaleInvoice.id}
                      </span>
                    </span>
                  </div>
                }
              >
                <>
                  <List
                    labelClassName="w-[40%] pl-4"
                    list={[
                      {
                        label: "Invoice Date",
                        value: moment(singleSaleInvoice.createdAt).format("ll"),
                      },

                      {
                        label: "Due Date",
                        value: singleSaleInvoice.dueDate ? (
                          <div className="flex gap-1 items-center">
                            {moment(singleSaleInvoice.dueDate).format("ll")}
                            {dateDiffChecker(singleSaleInvoice.dueDate) && (
                              <Tag className="text-xs" color="red">
                                Overdue
                              </Tag>
                            )}
                          </div>
                        ) : (
                          "N/A"
                        ),
                      },
                      {
                        label: "Delivery",
                        value: (
                          <Tag
                            color={
                              singleSaleInvoice.orderStatus === "RECEIVED"
                                ? "success"
                                : "orange"
                            }
                          >
                            {singleSaleInvoice.orderStatus}
                          </Tag>
                        ),
                      },
                      {
                        label: "Payment",
                        value: (
                          <Tag color={status === "PAID" ? "green" : "red"}>
                            {status}
                          </Tag>
                        ),
                      },
                    ]}
                  />
                </>
              </Card>
              <Card title="Payment Details">
                <List
                  labelClassName="w-[40%] pl-4"
                  list={[
                    {
                      label: "Profit",
                      value: singleSaleInvoice?.profit
                        ? Number(singleSaleInvoice.profit).toFixed(2)
                        : 0,
                      className: "border-b pb-2",
                      valueClass:
                        singleSaleInvoice?.profit < 0
                          ? "text-red-500 font-bold"
                          : "text-green-500 font-bold",
                    },
                    {
                      label: "Total Amount",
                      value: singleSaleInvoice?.totalAmount
                        ? Number(
                          singleSaleInvoice.totalAmount +
                          (singleSaleInvoice?.totalDiscountAmount || 0),
                        ).toFixed(2)
                        : 0,
                    },
                    {
                      label: "Discount",
                      value: (
                        <div className="before:content-['-'] relative before:absolute before:text-red-500 before:font-bold before:-left-3 before:top-0">
                          {singleSaleInvoice?.totalDiscountAmount
                            ? Number(
                              singleSaleInvoice.totalDiscountAmount,
                            ).toFixed(2)
                            : 0}
                        </div>
                      ),
                      hidden: singleSaleInvoice?.totalDiscountAmount === 0,
                    },
                    {
                      label: "Total Tax",
                      value: (
                        <div className="before:content-['+'] relative before:absolute before:text-green-500 before:font-bold before:-left-3 before:top-0">
                          {singleSaleInvoice?.totalTaxAmount
                            ? Number(singleSaleInvoice.totalTaxAmount).toFixed(
                              2,
                            )
                            : 0}
                        </div>
                      ),
                      hidden: singleSaleInvoice?.totalTaxAmount === 0,
                    },

                    {
                      label: "Return Product Value",
                      value: (
                        <div className="before:content-['-'] relative before:absolute before:text-red-500 before:font-bold before:-left-3 before:top-0">
                          {totalReturnAmount
                            ? Number(totalReturnAmount).toFixed(2)
                            : 0}
                        </div>
                      ),
                      hidden: Boolean(
                        totalReturnAmount === 0 &&
                        instantPaidReturnAmount === 0,
                      ),
                    },
                    {
                      label: "Return Amount",
                      value: (
                        <div className="before:content-['+'] relative before:absolute before:text-green-500 before:font-bold before:-left-3 before:top-0">
                          {instantPaidReturnAmount
                            ? Number(instantPaidReturnAmount).toFixed(2)
                            : 0}
                          {totalReturnAmount != instantPaidReturnAmount && (
                            <Button
                              onClick={() => setVisibleTransactionCreate(true)}
                              className="absolute right-4 -top-[23px] inline-block w-auto min-w-[100px] border-blue-400 border-[1.5px] rounded px-3"
                            >
                              Make Refund
                            </Button>
                          )}
                        </div>
                      ),
                      hidden: Boolean(
                        totalReturnAmount === 0 &&
                        instantPaidReturnAmount === 0,
                      ),
                    },
                    {
                      label: "Total Paid Amount",
                      value: (
                        <div className="before:content-['-'] relative before:absolute before:text-red-500 before:font-bold before:-left-3 before:top-0">
                          {totalPaidAmount
                            ? Number(totalPaidAmount).toFixed(2)
                            : 0}
                        </div>
                      ),
                      className: "border-b pb-1",
                    },
                    {
                      label: "Due Amount",
                      value: dueAmount ? Number(dueAmount).toFixed(2) : 0,
                    },
                  ]}
                />
              </Card>
              <Card title="Customer Details">
                <List
                  labelClassName="w-[40%] pl-4"
                  list={[
                    {
                      label: "Name",
                      value: (
                        <Link
                          to={`/admin/customer/${singleSaleInvoice.customer.id}`}
                        >
                          {singleSaleInvoice.customer.username}
                        </Link>
                      ),
                    },
                    {
                      label: "Phone",
                      value: singleSaleInvoice.customer.phone,
                    },
                    {
                      label: "Email",
                      value: singleSaleInvoice.customer.email || "N/A",
                    },
                    {
                      label: "Address",
                      value: singleSaleInvoice.customer.address,
                    },
                  ]}
                />
              </Card>
              <Card>
                <List
                  labelClassName="w-[40%] font-bold"
                  list={[
                    {
                      label: "Note",
                      value: singleSaleInvoice.note,
                      className: "flex-col gap-1 pl-4",
                    },
                    {
                      label: "Terms and Conditions",
                      value: singleSaleInvoice.termsAndConditions,
                      className: "flex-col gap-1 pl-4",
                    },
                  ]}
                />
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Loader />
      )}
      <Drawer
        title={`Make Refund`}
        width={"40%"}
        onClose={() => setVisibleTransactionCreate(false)}
        open={visibleTransactionCreate}
        bodyStyle={{
          paddingBottom: 80,
        }}
      >
        <AddTransaction
          dueAmount={Math.abs(dueAmount)}
          isSale={true}
          id={id}
          preFieldValue={{
            relatedId: singleSaleInvoice?.id,
            type: "sale_return",
          }}
        />
      </Drawer>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Make Purchase"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <SaleInvoicePayment
          singlePage={true}
          data={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </>
  );
};

export default DetailSale;