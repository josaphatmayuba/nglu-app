import { Card, Col, Row, Table } from "antd";
import { Link } from "react-router-dom";
import ViewBtn from "../../Buttons/ViewBtn";

export default function OrderProductList({ list }) {
  const columns = [
    {
      title: "ID",
      dataIndex: "productId",
      key: "productId",
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
      title: "Product  Unit Price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
    },
    {
      title: "Color",
      key: "colors",
      render: (data) => (
        <>
          {data?.colors?.name ? (
            <span
              style={{
                backgroundColor:
                  data?.colors?.name ==
                  "White" ? "#000000" :`rgba(${parseInt(
                    data?.colors?.colorCode.slice(1, 3),
                    16
                  )}, ${parseInt(
                    data?.colors?.colorCode.slice(3, 5),
                    16
                  )}, ${parseInt(
                    data?.colors?.colorCode.slice(5, 7),
                    16
                  )}, 0.2)`,
                color: data?.colors?.colorCode,
              }}
              className="px-2 pb-[2px] rounded-sm font-semibold"
            >
              {data?.colors?.name}
            </span>
          ) : (
            "-"
          )}
        </>
      ),
    },
    {
      title: "Attribute",
      key: "attribute",
      render: ({ cartOrderAttributeValue }) => (
        <div className="flex flex-col md:flex-row">
          {cartOrderAttributeValue.length > 0
            ? cartOrderAttributeValue.map((attribute) => (
                <span
                  className=" bg-gray-200 mx-[2px] p-1 m-1 rounded-sm text-gray-600"
                  key={attribute.id}
                >
                  {`${attribute.productAttributeValue.productAttribute.name}: `}
                  <span className="font-medium">{`${attribute.productAttributeValue.name}`}</span>
                </span>
              ))
            : "-"}
        </div>
      ),
    },
    {
      title: "Total Price ",
      key: "Total Price ",
      dataIndex: "",
      render: ({
        productQuantity,
        productSalePrice,
        remainQuantity,
        returnQuantity,
      }) => {
        if (returnQuantity) {
          return remainQuantity * productSalePrice;
        } else {
          return productSalePrice * productQuantity;
        }
      },
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
      <Col span={24} className="mt-2">
        <Card
          className="header-solid h-full"
          bordered={false}
          title={[
            // eslint-disable-next-line react/jsx-key
            <h4 className="font-semibold text-xl m-0 text-center">
              Products Information
            </h4>,
          ]}
          bodyStyle={{ paddingTop: "0" }}
        >
          <div className="col-info">
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
