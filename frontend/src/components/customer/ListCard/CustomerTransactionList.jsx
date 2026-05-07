import Table from "@/UI/Table";
import { stringShorter } from "@/utils/functions";
import moment from "moment";
import { Link } from "react-router-dom";

const CustomerTransactionList = ({ list }) => {
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/transaction/${id}`}>{id}</Link>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },

    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      render: (debit) => (
        <Link to={`/admin/account/${debit?.id}`}>{debit?.name}</Link>
      ),
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      render: (credit) => (
        <Link to={`/admin/account/${credit?.id}`}>{credit?.name}</Link>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },

    {
      title: "Type ",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Particulars",
      dataIndex: "particulars",
      key: "particulars",
      render: (particulars) => (
        <div title={particulars}>{stringShorter(particulars, 20)}</div>
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

export default CustomerTransactionList;
