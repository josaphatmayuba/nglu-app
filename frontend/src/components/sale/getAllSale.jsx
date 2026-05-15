import { Link } from "react-router-dom";

import ModalUi from "@/UI/ModalUi";
import { loadAllCustomer } from "@/redux/rtk/features/customer/customerSlice";
import {
  loadAllSale,
  loadSingleSale,
} from "@/redux/rtk/features/sale/saleSlice";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { loadAllStaff } from "@/redux/rtk/features/user/userSlice";
import { DatePicker, Tag } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import { MdPayments } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import CreateButton from "../Buttons/CreateButton";
import ViewBtn from "../Buttons/ViewBtn";
import DashboardCard from "../Card/DashboardCard";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import SaleInvoicePayment from "./SaleInvoicePayment";
import SendSaleInvoice from "./SendSaleInvoice";
import { dateDiffChecker } from "./detailSale";

const GetAllSale = () => {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    list,
    total,
    totalPage,
    loading: saleLoading,
  } = useSelector((state) => state.sales);
  const [singleSaleInvoice, setSingleSaleInvoice] = useState({});
  const { list: customerList } = useSelector((state) => state.customers);
  const { list: salePersonList } = useSelector((state) => state.users);
  const [edit, setEdit] = useState();
  const companyInfo = useSelector((state) => state?.setting?.data) || null;

  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
    user: "",
  });

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
        (singleSaleInvoice?.totalDiscountAmount || 0)
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
   <p>Paid Amount: $${singleSaleInvoice?.totalPaidAmount
      ? Number(singleSaleInvoice?.totalPaidAmount).toFixed(2)
      : 0
    }</p>
   <p>Due Amount: $${singleSaleInvoice?.dueAmount
      ? Number(singleSaleInvoice?.dueAmount).toFixed(2)
      : 0
    }</p>
   <br>
   <p>Best Regards,</p>
   <p>${companyInfo?.companyName}</p>
   <p>${companyInfo?.phone}</p>
   <p>${companyInfo?.email}</p>`;
  const columns = [
    {
      id: 1,
      title: "Invoice",
      dataIndex: "id",
      key: "id",
      render: (name, { id }) => <Link to={`/admin/sale/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
      renderCsv: (date) => moment(date).format("ll"),
    },
    {
      id: 3,
      title: "Customer",
      dataIndex: `customer`,
      key: "customerId",
      render: (customer) => (
        <Link to={`/admin/customer/${customer?.id}`}>{customer?.username}</Link>
      ),
      renderCsv: (customer) => customer?.username,
    },

    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => Number(totalAmount).toFixed(2),
      renderCsv: (totalAmount) => Number(totalAmount).toFixed(2),
    },

    {
      id: 7,
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (paidAmount) => Number(paidAmount).toFixed(2),
      responsive: ["md"],
      renderCsv: (paidAmount) => Number(paidAmount).toFixed(2),
    },
    {
      id: 6,
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      render: (dueAmount) => Number(dueAmount).toFixed(2),
      renderCsv: (dueAmount) => Number(dueAmount).toFixed(2),
      responsive: ["md"],
    },

    {
      id: 6,
      title: "Tax",
      dataIndex: "totalTaxAmount",
      key: "totalTaxAmount",
      render: (totalTaxAmount) => Number(totalTaxAmount).toFixed(2),
      renderCsv: (totalTaxAmount) => Number(totalTaxAmount).toFixed(2),
      responsive: ["md"],
    },

    {
      id: 5,
      title: "Due date",
      dataIndex: "dueDate",
      key: "discount",
      render: (dueDate) =>
        dueDate ? (
          <div className="flex gap-1 items-center">
            {moment(dueDate).format("ll")}
            {dateDiffChecker(dueDate) && (
              <Tag className="text-xs" color="red">
                Overdue
              </Tag>
            )}
          </div>
        ) : null,
      renderCsv: (discount) => Number(discount).toFixed(2),
    },
    //Update Supplier Name here

    {
      id: 8,
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      render: (profit) => Number(profit).toFixed(2),
      renderCsv: (profit) => Number(profit).toFixed(2),
      responsive: ["md"],
    },
    {
      id: 9,
      title: "Sale Person",
      dataIndex: "user",
      key: "user",
      render: (user) => (
        <Link to={`/admin/hr/staffs/${user?.id}`}>{user?.username}</Link>
      ),
      renderCsv: (user) => user?.username,
      responsive: ["md"],
    },
    {
      id: 10,
      title: "",
      dataIndex: "id",
      key: "action",
      render: (payment) => [
        {
          label: <ViewBtn title="View" path={`/admin/sale/${payment?.id}`} />,
          key: "view",
        },
        {
          label: (
            <>
              <span
                onClick={() => {
                  setEdit(payment);
                }}
              >
                <button
                  className="flex items-center gap-2 rounded disabled:cursor-not-allowed disabled:opacity-50 py-1"
                  disabled={payment?.dueAmount === 0}
                >
                  <MdPayments className="text-[1rem]" />
                  Make a payment
                </button>
              </span>
            </>
          ),
          key: "edit",
        },
        {
          label: (
            <div
              onClick={() => {
                showModal();
                dispatch(loadSingleSale(payment?.id));
                setSingleSaleInvoice(payment);
              }}
              className="flex gap-2  items-center cursor-pointer"
            >
              <IoIosSend className="text-[1rem]" />
              Email
            </div>
          ),
          key: "SendEmail",
        },
      ],

      csvOff: true,
    },
  ];

  const filters = [
    {
      key: "salePersonId",
      label: "Sale Person",
      type: "select",
      options: salePersonList?.map((item) => ({
        label: item?.username,
        value: item.id,
      })),
      className: "min-w-[120px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "customerId",
      label: "Customer",
      type: "select",
      options: customerList?.map((item) => ({
        label: item?.username,
        value: item?.id,
      })),
      className: "min-w-[100px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "orderStatus",
      label: "Status",
      type: "select",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Received", value: "received" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
  ];

  useEffect(() => {
    dispatch(loadAllCustomer({ query: "all" }));
    dispatch(loadAllStaff({ query: "all" }));
    !companyInfo && dispatch(getSetting());
  }, [companyInfo, dispatch]);

  const { RangePicker } = DatePicker;

  useEffect(() => {
    dispatch(loadAllSale(pageConfig));
  }, [dispatch, pageConfig]);

  const onCalendarChange = (dates) => {
    const startDate = dates[0].format("YYYY-MM-DD");
    const endDate = dates[1].format("YYYY-MM-DD");

    setPageConfig((prev) => {
      return {
        ...prev,
        startDate,
        endDate,
      };
    });
  };

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Ventes"
        subtitle="Factures et paiements clients"
        actions={
          <>
            <RangePicker
              className="range-picker"
              onCalendarChange={onCalendarChange}
              defaultValue={[
                dayjs(pageConfig.startDate, "YYYY-MM-DD"),
                dayjs(pageConfig.endDate, "YYYY-MM-DD"),
              ]}
            />
            <UserPrivateComponent permission={"create-saleInvoice"}>
              <CreateButton to="/admin/sale/add" title="Nouvelle vente" />
            </UserPrivateComponent>
          </>
        }
      />

      <DashboardCard
        information={total?._sum}
        count={total?._count?.id}
        isCustomer={true}
      />

      <Card
        className="max-md:border-0 max-md:bg-white mt-5"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-saleInvoice"}>
          <TableComponent
            actionPermission={[
              "update-saleInvoice",
              "delete-saleInvoice",
              "readSingle-saleInvoice",
            ]}
            list={list}
            columns={columns}
            loading={saleLoading}
            total={totalPage}
            setPageConfig={setPageConfig}
            title={"Sale List"}
            filters={filters}
            isSearch
          />
        </UserPrivateComponent>
      </Card>


      <ModalUi
        title="Send Sale Invoice"
        open={isModalOpen}
        className="bg-white"
        onClose={handleCancel}
        footer={false}
      >
        <SendSaleInvoice
          setIsModalOpen={setIsModalOpen}
          modal={true}
          onClose={() => setIsModalOpen(false)}
          body={body}
          subject={subject}
          customerEmail={customerEmail}
        />
      </ModalUi>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Make Sale"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <SaleInvoicePayment data={edit} onClose={() => setEdit(false)} />
      </ModalUi>
    </div>
  );
};

export default GetAllSale;
