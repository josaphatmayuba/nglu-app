import Table from "@/UI/Table";
import ViewBtn from "@/components/Buttons/ViewBtn";
import moment from "moment";

const ReturnSaleInvoiceList = ({ list }) => {
  const columns = [
    {
      id: 2,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },

    {
      id: 4,
      title: "Total Amount",
      // dataIndex: "totalAmount",
      key: "totalAmount",
      render: ({ totalAmount, tax }) => `${totalAmount + (tax ? tax : 0)}`,
    },
    {
      id: 5,
      title: "Note",
      dataIndex: "note",
      key: "note",
    },
    {
      id: 3,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },
    {
      id: 1,
      title: "Action",
      key: "returnSaleInvoiceProduct",
      render: ({ id }) => <ViewBtn path={`/admin/sale-return-list/${id}`} />,
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

export default ReturnSaleInvoiceList;
