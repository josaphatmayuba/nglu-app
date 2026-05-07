import Table from "@/UI/Table";
import { stringShorter } from "@/utils/functions";
import moment from "moment";
import { Link } from "react-router-dom";

const TransactionSaleList = ({ list }) => {
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/transaction/${id}`}>{id}</Link>,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },
    {
      id: 3,
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      render: (debit) => debit.name,
    },
    {
      id: 4,
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      render: (credit) => credit.name,
    },

    {
      id: 5,
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },

    {
      id: 6,
      title: "Type ",
      dataIndex: "type",
      key: "type",
    },
    {
      id: 7,
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
    <div className='m-1 md:mt-4'>
      <Table
        scroll={{ x: true }}
        loading={!list}
        columns={columns}
        data={list ? addKeys(list) : []}
      />
    </div>
  );
};

export default TransactionSaleList;
