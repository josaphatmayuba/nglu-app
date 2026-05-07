import Table from "@/UI/Table";
import moment from "moment";
import { Link } from "react-router-dom";

const CustomerReturnInvoiceList = ({ list }) => {
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
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
      key: "totalAmount",
    },
    {
      title: "Tax",
      dataIndex: "tax",
      key: "tax",
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "Sale Invoice No",
      dataIndex: "saleInvoiceId",
      key: "saleInvoiceId",
      render: (saleInvoiceId) => (
        <Link to={`/admin/sale/${saleInvoiceId}`}>{saleInvoiceId}</Link>
      ),
    },
  ];

  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <div className='m-2'>
      <Table
        scroll={{ x: true }}
        columns={columns}
        data={list ? addKeys(list) : []}
      />
    </div>
  );
};

export default CustomerReturnInvoiceList;
