import Table from "@/UI/Table";
import { Tag } from "antd";
import moment from "moment";
import { Link } from "react-router-dom";
import { dateDiffChecker } from "../sale/detailSale";

function CustomerInvoiceList({ list, linkTo }) {
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
      id: 5,
      title: "Due date",
      dataIndex: "dueDate",
      key: "discount",
      render: (dueDate) =>
        dueDate ? (
          <div className='flex gap-1 items-center'>
            {moment(dueDate).format("ll")}
            {dateDiffChecker(dueDate) && (
              <Tag className='text-xs' color='red'>
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

export default CustomerInvoiceList;
