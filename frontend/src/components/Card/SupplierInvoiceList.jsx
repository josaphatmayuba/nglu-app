import Table from "@/UI/Table";
import moment from "moment";
import { MdPayments } from "react-icons/md";
import { Link } from "react-router-dom";
import ViewBtn from "../Buttons/ViewBtn";
import "./card.css";

function SupplierInvoiceTable({ list, linkTo }) {
  const columns = [
    {
      title: "Invoice ",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`${linkTo}/${id}`}>{id}</Link>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },
    {
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "total_amount",
    },
    {
      title: "Total Tax",
      dataIndex: "totalTax",
      key: "totalTax",
    },

    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paid_amount",
      responsive: ["md"],
    },
    {
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      responsive: ["md"],
    },
    {
      title: "",
      dataIndex: "",
      key: "action",
      render: ({ id, dueAmount }) => [
        {
          label: <ViewBtn title='View' path={`${linkTo}/${id}`} />,
          key: "view",
        },
        {
          label: (
            <Link
              to={dueAmount ? `/admin/payment/supplier/${id}` : "#"}
              state={{ dueAmount: dueAmount }}
            >
              <button
                className='flex items-center gap-2 rounded disabled:cursor-not-allowed'
                disabled={!dueAmount}
              >
                <MdPayments className='text-[1rem]' /> Payment
              </button>
            </Link>
          ),
          key: "payment",
        },
      ],
    },
  ];

  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <div className='m-2'>
      <Table
        scroll={{ x: true }}
        loading={!list}
        columns={columns}
        data={list ? addKeys(list) : []}
      />
    </div>
  );
}

export default SupplierInvoiceTable;
