import { Link } from "react-router-dom";

import { loadSuppliers } from "@/redux/rtk/features/supplier/supplierSlice";
import FormattedAmount from "@/components/Shared/FormattedAmount";
import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { IoIosSend } from "react-icons/io";
import { MdPayments } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  loadAllPurchase,
  loadSinglePurchase,
} from "../../redux/rtk/features/purchase/purchaseSlice";
import CreateButton from "../Buttons/CreateButton";
import ViewBtn from "../Buttons/ViewBtn";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import DashboardCard from "./Cards";
import SendPurchaseInvoice from "./SendPurchaseInvoice";
import PurchaseInvoicePayment from "./PurchaseInvoicePayment";
import ModalUi from "@/UI/ModalUi";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";

const GetAllPurchase = () => {
  const { RangePicker } = DatePicker;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [singlePurchaseInvoice, setSinglePurchaseInvoice] = useState({});
  const dispatch = useDispatch();
  const { list, total, totalPage, loading, information } = useSelector(
    (state) => state.purchases
  );

  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const [edit, setEdit] = useState(false);
  const { list: supplierList } = useSelector((state) => state.suppliers);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });

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
        Total Amount: $${
          singlePurchaseInvoice?.totalAmount
            ? Number(singlePurchaseInvoice.totalAmount).toFixed(2)
            : 0
        }<br>
        Tax: $${
          singlePurchaseInvoice?.totalTax
            ? Number(singlePurchaseInvoice.totalTax).toFixed(2)
            : 0
        }<br>
       
    </div>
<br>
    <div class="company-info">
        Best Regards,<br>
        <strong>${companyInfo?.companyName}</strong><br>
        ${companyInfo?.phone}<br>
        ${companyInfo?.email}
    </div>`;

  const columns = [
    {
      id: 1,
      title: "Invoice",
      key: "id",
      render: ({ id }) => <Link to={`/admin/purchase/${id}`}>{id}</Link>,
      renderCsv: ({ id }) => id,
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
      title: "Supplier",
      dataIndex: `supplier`,
      key: "supplierId",
      render: (supplier) => (
        <Link to={`/admin/supplier/${supplier?.id}`}>{supplier?.name}</Link>
      ),
      renderCsv: (supplier) => supplier?.name,
    },
    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount, row) => (
        <FormattedAmount
          amount={totalAmount}
          currency={{
            currencyCode: row.currencyCode,
            currencyName: row.currencyName,
            currencySymbol: row.currencySymbol,
            ...row.currency
          }}
        />
      ),
    },

    {
      id: 7,
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (paidAmount, row) => (
        <FormattedAmount
          amount={paidAmount}
          currency={{
            currencyCode: row.currencyCode,
            currencyName: row.currencyName,
            currencySymbol: row.currencySymbol,
            ...row.currency
          }}
        />
      ),
    },
    {
      id: 6,
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      render: (dueAmount, row) => (
        <FormattedAmount
          amount={dueAmount}
          currency={{
            currencyCode: row.currencyCode,
            currencyName: row.currencyName,
            currencySymbol: row.currencySymbol,
            ...row.currency
          }}
        />
      ),
    },
    {
      id: 4,
      title: "Tax",
      dataIndex: "totalTax",
      key: "totalTax",
      render: (totalTax, row) => (
        <FormattedAmount
          amount={totalTax}
          currency={{
            currencyCode: row.currencyCode,
            currencyName: row.currencyName,
            currencySymbol: row.currencySymbol,
            ...row.currency
          }}
        />
      ),
    },
    //Update Supplier Name here

    {
      id: 8,
      title: "",
      dataIndex: "",
      key: "action",
      render: (payment) => [
        {
          label: (
            <ViewBtn title="View" path={`/admin/purchase/${payment?.id}`} />
          ),
          key: "view",
        },
        {
          label: (
            <>
              <span
                onClick={() => {
                  setEdit(payment);
                }}>
                <button
                  className="flex items-center gap-2 rounded disabled:cursor-not-allowed disabled:opacity-50 py-1"
                  disabled={payment?.dueAmount <= 0}>
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
                dispatch(loadSinglePurchase(payment?.id));
                setSinglePurchaseInvoice(payment);
              }}
              className="flex gap-2  items-center cursor-pointer">
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
      key: "supplierId",
      label: "Supplier",
      type: "select",
      options: supplierList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[123px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
  ];
  useEffect(() => {
    dispatch(loadAllPurchase(pageConfig));
    !companyInfo && dispatch(getSetting());
  }, [companyInfo, dispatch, pageConfig]);

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
  const handleOk = () => {
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
    setSinglePurchaseInvoice({});
  };
  useEffect(() => {
    dispatch(loadSuppliers({ query: "all" }));
  }, [dispatch]);

  return (
    <div>
      <PageHeader
        title="Achats"
        subtitle="Bons de commande et paiements fournisseurs"
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
            <CreateButton to="/admin/purchase/add" title="Nouvel achat" />
          </>
        }
      />

        <DashboardCard information={information} count={total} />

        <Card
          className="max-md:border-0 max-md:bg-white mt-5"
          bodyClass="max-md:p-0 "
        >
          <UserPrivateComponent permission={"readAll-purchaseInvoice"}>
            <TableComponent
              actionPermission={[
                "update-purchaseInvoice",
                "delete-purchaseInvoice",
              ]}
              list={list}
              total={totalPage}
              columns={columns}
              loading={loading}
              setPageConfig={setPageConfig}
              title="Purchase List"
              filters={filters}
              isSearch
            />
          </UserPrivateComponent>
        </Card>
      
      <ModalUi
        title="Send Purchase Invoice"
        outsideClick={true}
        open={isModalOpen}
        className="bg-white"
        onClose={handleCancel}
        footer={false}>
        <SendPurchaseInvoice
          subject={subject}
          body={body}
          supplierEmail={supplierEmail}
          setIsModalOpen={setIsModalOpen}
          modal={true}
          onClose={() => setIsModalOpen(false)}
        />
      </ModalUi>

      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Make Purchase"}
        className="bg-white"
        onClose={() => setEdit(false)}>
        <PurchaseInvoicePayment data={edit} onClose={() => setEdit(false)} />
      </ModalUi>
    </div>
  );
};

export default GetAllPurchase;
