import Table from "@/UI/Table";
import moment from "moment";
import { Link } from "react-router-dom";

const SupplierReturnInvoiceList = ({ list }) => {
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
      key: "totalAmount",
      render: ({ totalAmount, tax }) => `${totalAmount + (tax ? tax : 0)}`,
    },
    {
      title: "Note",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "Purchase Invoice No",
      dataIndex: "purchaseInvoiceId",
      key: "purchaseInvoiceId",
      render: (purchaseInvoiceId) => (
        <Link to={`/admin/purchase/${purchaseInvoiceId}`}>
          {purchaseInvoiceId}
        </Link>
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

export default SupplierReturnInvoiceList;
