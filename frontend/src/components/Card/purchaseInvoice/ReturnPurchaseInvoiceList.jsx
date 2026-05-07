import Table from "@/UI/Table";
import ViewBtn from "@/components/Buttons/ViewBtn";
import moment from "moment";

const ReturnPurchaseInvoiceList = ({ list }) => {
  const columns = [
    {
      id: 2,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 3,
      title: "Total Amount",
      key: "totalAmount",
      render: ({ totalAmount, tax }) => `${totalAmount + (tax ? tax : 0)}`,
    },
    {
      id: 4,
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
      key: "returnPurchaseInvoiceProduct",
      render: ({ id }) => (
        <ViewBtn path={`/admin/purchase-return-list/${id}`} />
      ),
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
};

export default ReturnPurchaseInvoiceList;
