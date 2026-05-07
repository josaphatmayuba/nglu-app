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
import {
  clearPurchase,
  loadSinglePurchase,
} from "../../redux/rtk/features/purchase/purchaseSlice";
import PurchaseProductListCard from "../Card/purchaseInvoice/PurchaseProductListCard";
import ReturnPurchaseInvoiceList from "../Card/purchaseInvoice/ReturnPurchaseInvoiceList";
import TransactionPurchaseList from "../Card/purchaseInvoice/TransactionPurchaseList";
import NewPurchaseInvoice from "../Invoice/NewPurchaseInvoice";
import Loader from "../loader/loader";
import AddTransaction from "../transaction/AddTransaction";
import SendPurchaseInvoice from "./SendPurchaseInvoice";
import ModalUi from "@/UI/ModalUi";
import PurchaseInvoicePayment from "./PurchaseInvoicePayment";

const DetailsPurchase = () => {
  const { id } = useParams();
  const [sendForm, setSendForm] = useState(false);
  const [visibleTransactionCreate, setVisibleTransactionCreate] =
    useState(false);
  const companyInfo = useSelector((state) => state?.setting?.data) || null;

  //dispatch
  const dispatch = useDispatch();
  const purchase = useSelector((state) => state.purchases.purchase);
  const {
    status,
    totalPaidAmount,
    totalReturnAmount,
    instantPaidReturnAmount,
    dueAmount,
    singlePurchaseInvoice,
    returnPurchaseInvoice,
    transactions,
  } = purchase ? purchase : {};

  useEffect(() => {
    dispatch(loadSinglePurchase(id));
    return () => {
      dispatch(clearPurchase());
    };
  }, [dispatch, id]);
  const [edit, setEdit] = useState(false);

  const supplierEmail = singlePurchaseInvoice?.supplier?.email;
  const subject = `Your order has been received. Order ID #${singlePurchaseInvoice?.id} `;
  const body = `<div>
        <p>Dear <strong>${singlePurchaseInvoice?.supplier?.name}</strong>,</p>
        <p>Greetings! We trust this message reaches you in great spirits. We are immensely grateful for the privilege of having you as our esteemed supplier.</p>
    </div>
<br>
    <div class="order-info">
        <strong>Order Information:</strong><br>
        Order ID: ${singlePurchaseInvoice?.id}<br>
        Order Date: ${moment(singlePurchaseInvoice?.date).format("ll")}
    </div>
<br>
    <div class="invoice-details">
        <strong>Invoice Details:</strong><br>
        Total Amount: $${singlePurchaseInvoice?.totalAmount
      ? Number(singlePurchaseInvoice.totalAmount).toFixed(2)
      : 0
    }<br>
        Tax: $${singlePurchaseInvoice?.totalTax
      ? Number(singlePurchaseInvoice.totalTax).toFixed(2)
      : 0
    }<br>
        Paid Amount: $${totalPaidAmount ? Number(totalPaidAmount).toFixed(2) : 0
    }<br>
        Due Amount: $${dueAmount ? Number(dueAmount).toFixed(2) : 0}
    </div>
<br>
    <div class="company-info">
        Best Regards,<br>
        <strong>${companyInfo?.companyName}</strong><br>
        ${companyInfo?.phone}<br>
        ${companyInfo?.email}
    </div>`;

  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);

  return (
    <div>
      <div>
        {singlePurchaseInvoice ? (
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <Card className="w-full md:w-2/3" bodyClass={"p-0"}>
              <div className="flex justify-end mx-2 py-2 border-b items-center">
                <div className=" flex gap-3">
                  <div>
                    {singlePurchaseInvoice && (
                      <NewPurchaseInvoice
                        title={"Purchase Invoice"}
                        data={purchase}
                      />
                    )}
                  </div>
                  <Button
                    className="flex-row-reverse"
                    color="gray"
                    icon={<FaRegPaperPlane size={15} />}
                    onClick={() => {
                      setSendForm(true);
                    }}>
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
                                    setEdit({ singlePurchaseInvoice, dueAmount });
                                  }}>
                                  <button
                                    className="flex items-center gap-2 rounded disabled:cursor-not-allowed disabled:opacity-50 py-1"
                                    disabled={purchase?.dueAmount <= 0}>
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
                              <Link to={`/admin/purchase/return/${id}`}>
                                Return Product{" "}
                              </Link>
                            ),
                          },
                        ]}
                      />
                    }
                    placement="bottomRight"
                    arrow={false}
                    trigger="click">
                    <Button
                      color={"gray"}
                      icon={<BsThreeDotsVertical size={15} />}
                      className="  px-3"></Button>
                  </Popover>
                </div>
              </div>
              {sendForm ? (
                <div>
                  <SendPurchaseInvoice
                    subject={subject}
                    body={body}
                    setSendForm={setSendForm}
                    supplierEmail={supplierEmail}
                  />
                </div>
              ) : (
                <Tabs className="mt-4">
                  <Tab label="Products">
                    <PurchaseProductListCard
                      list={singlePurchaseInvoice.purchaseInvoiceProduct}
                    />
                  </Tab>
                  <Tab label="Return products">
                    <ReturnPurchaseInvoiceList list={returnPurchaseInvoice} />
                  </Tab>
                  <Tab label="Transactions">
                    <TransactionPurchaseList list={transactions} />
                  </Tab>
                </Tabs>
              )}
            </Card>
            <div className="w-full md:w-1/3 flex flex-col gap-2">
              <Card
                title={
                  <div className="flex items-center">
                    <span className="font-normal">
                      Invoice No{" "}
                      <span className="font-semibold">
                        #{singlePurchaseInvoice.id}
                      </span>
                    </span>
                  </div>
                }>
                <>
                  <List
                    labelClassName="w-[40%] pl-4"
                    list={[
                      {
                        label: "Invoice Date",
                        value: moment(singlePurchaseInvoice.createdAt).format(
                          "ll"
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

              <Card title="Payment Details ">
                <List
                  labelClassName="w-[40%] pl-4"
                  list={[
                    {
                      label: "Total Amount",
                      value: singlePurchaseInvoice?.totalAmount
                        ? Number(singlePurchaseInvoice.totalAmount).toFixed(2)
                        : 0,
                    },

                    {
                      label: "Total Tax",
                      value: (
                        <div className="before:content-['+'] relative before:absolute before:text-green-500 before:font-bold before:-left-3 before:top-0">
                          {singlePurchaseInvoice?.totalTax
                            ? Number(singlePurchaseInvoice.totalTax).toFixed(2)
                            : 0}
                        </div>
                      ),
                      hidden: singlePurchaseInvoice?.totalTaxAmount === 0,
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
                        totalReturnAmount === 0 && instantPaidReturnAmount === 0
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
                              className="absolute right-4 -top-[23px] inline-block w-auto min-w-[100px] border-blue-400 border-[1.5px] rounded px-3">
                              Get Refund
                            </Button>
                          )}
                        </div>
                      ),
                      hidden: Boolean(
                        totalReturnAmount === 0 && instantPaidReturnAmount === 0
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
              <Card title="Supplier Details">
                <List
                  labelClassName="w-[40%] pl-4"
                  list={[
                    {
                      label: "Name",
                      value: (
                        <Link
                          to={`/admin/supplier/${singlePurchaseInvoice.supplier.id}`}>
                          {singlePurchaseInvoice.supplier.name}
                        </Link>
                      ),
                    },
                    {
                      label: "Phone",
                      value: singlePurchaseInvoice.supplier.phone,
                    },
                    {
                      label: "Address",
                      value: singlePurchaseInvoice.supplier.address,
                    },
                  ]}
                />
              </Card>
              <Card>
                <List
                  labelClassName="w-[40%] font-bold pl-4"
                  list={[
                    {
                      label: "Note",
                      value: singlePurchaseInvoice?.note ? (
                        <span className="ml-4">{singlePurchaseInvoice.note}</span>
                      ) : (
                        <span className="ml-4 text-gray-500">no note available</span>
                      ),
                      className: "flex-col gap-1",
                    },
                  ]}
                />
              </Card>
            </div>
          </div>
        ) : (
          <Loader />
        )}
      </div>
      <Drawer
        title={`Get Refund`}
        width={"40%"}
        onClose={() => setVisibleTransactionCreate(false)}
        open={visibleTransactionCreate}
        bodyStyle={{
          paddingBottom: 80,
        }}>
        <AddTransaction
          dueAmount={Math.abs(dueAmount)}
          id={id}
          preFieldValue={{
            relatedId: singlePurchaseInvoice?.id,
            type: "purchase_return",
          }}
        />
      </Drawer>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Make Purchase"}
        className="bg-white"
        onClose={() => setEdit(false)}>
        <PurchaseInvoicePayment
          singlePage={true}
          data={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </div>
  );
};

export default DetailsPurchase;
