import Table from "@/UI/Table";
import { Card } from "antd";
import moment from "moment";

export default function ECommerceSaleInvoice({ list }) {
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
      render: (date) => moment(date).format("DD/MM/YYYY"),
    },

    {
      title: "Total amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
    },
    {
      title: "Paid amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
    },
    {
      title: "Due",
      dataIndex: "due",
      key: "due",
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
    },
    {
      title: "Order status",
      dataIndex: "orderStatus",
      key: "orderStatus",
      render: (orderStatus) => (
        <span
          className={` rounded px-2 py-[1px] text-ePrimary bg-ePrimary/10 ${
            orderStatus == "PENDING" && "text-orange-500 bg-orange-500/10"
          }
                  ${orderStatus == "RECEIVED" && "text-ePrimary bg-ePrimary/10"}
                  ${
                    orderStatus == "DELIVERED" &&
                    "text-green-500 bg-green-500/10"
                  }
                  ${orderStatus == "CANCELLED" && "text-red-500 bg-red-500/10"}
                    `}
        >
          {orderStatus}
        </span>
      ),
    },
    {
      title: "Delivery fee",
      dataIndex: "deliveryFee",
      key: "deliveryFee",
    },
  ];

  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <Card
      className='header-solid h-full my-2'
      bordered={false}
      title={
        <h6 className='font-semibold m-0 text-center'>
          e-Commerce sale invoice
        </h6>
      }
      bodyStyle={{ paddingTop: "0" }}
    >
      <div className='mt-4'>
        <Table
          scroll={{ x: true }}
          columns={columns}
          data={list ? addKeys(list) : []}
        />
      </div>
    </Card>
  );
}
