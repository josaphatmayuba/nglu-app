import { Card, Col, InputNumber, Row, Table } from "antd";
import { Link } from "react-router-dom";
import ViewBtn from "../../Buttons/ViewBtn";
import moment from "moment";

export default function ReturnProductList({ list }) {
  const columns = [
    {
      title: "Order#",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
    },
    {
      title: "Product Name",
      dataIndex: "returnCartOrderProduct",
      key: "returnCartOrderProduct",
      render: (returnCartOrderProduct) =>
        <Link to={`/admin/product/${returnCartOrderProduct[0]?.product?.id}`}>{ returnCartOrderProduct[0]?.product?.name}</Link>
    },
    {
      title: "Return Type",
      dataIndex: "returnType",
      key: "returnType",
    },
    {
      title: "Status",
      dataIndex: "returnCartOrderStatus",
      key: "returnCartOrderStatus",
    },
    {
      title: "Qty",
      dataIndex: "returnCartOrderProduct",
      key: "returnCartOrderProduct",
      render: (returnCartOrderProduct) =>
        returnCartOrderProduct[0].productQuantity,
    },
    {
      title: "Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => totalAmount.toFixed(2),
    },
    {
      title: " Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YY"),
    },
  ];


  return (
    <Row>
      <Col span={24} className="mt-2">
        <Card
          className="header-solid h-full"
          bordered={false}
          title={[
            // eslint-disable-next-line react/jsx-key
            <h4 className="font-semibold text-xl m-0 text-center">
              Return Product Information
            </h4>,
          ]}
          bodyStyle={{ paddingTop: "0" }}
        >
          <div className="col-info">
            <Table
              className="my-5"
              columns={columns}
              loading={!list}
              dataSource={
                !!list?.length &&
                list.map((item) => ({ ...item, key: item?.id }))
              }
              pagination={false}
              scroll={{
                x: 400,
              }}
            />
           
          </div>
        </Card>
      </Col>
    </Row>
  );
}
