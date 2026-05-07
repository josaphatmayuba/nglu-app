import { Card, Col, Row, Table } from "antd";
import moment from "moment";
import React from "react";
import { Link } from "react-router-dom";
import ViewBtn from "../../Buttons/ViewBtn";

export default function ReturnProductList({ list }) {
  const columns = [
    {
      title: "ID",
      dataIndex: "productId",
      key: "productId",
    },
    {
      title: "Return Id",
      dataIndex: "returnCartOrderId",
      key: "returnCartOrderId",
    },
    {
      title: "Name",
      dataIndex: "product",
      render: (product) => (
        <Link to={`/admin/product/${product.id}`}>{product.name}</Link>
      ),
    },
    {
      title: "Product Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      title: "Product Price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
      render: (productSalePrice) => productSalePrice.toFixed(2),
    },

    {
      title: "Created At",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YY"),
    },
    {
      title: "Action",
      key: "action",
      render: ({ productId }) => (
        <ViewBtn path={`/admin/product/${productId}`} />
      ),
    },
  ];

  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <Row>
      <Col span={24} className='mt-2'>
        <Card
          className='header-solid h-full'
          bordered={false}
          title={
            <h4 className='font-semibold text-xl m-0 text-center'>
              Products Information
            </h4>
          }
          bodyStyle={{ paddingTop: "0" }}
        >
          <div className='col-info'>
            <Table
              scroll={{ x: true }}
              loading={!list}
              columns={columns}
              dataSource={list ? addKeys(list) : []}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
