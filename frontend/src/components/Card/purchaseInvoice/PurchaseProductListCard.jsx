// import Table from "@/UI/Table";
import Table from "@/UI/Table";
import { InputNumber } from "antd";
import { Link } from "react-router-dom";

const PurchaseProductListCard = ({ list, updateReturn, returnOnChange }) => {
  const columns = [
    {
      title: "ID",
      dataIndex: "productId",
      key: "productId",
    },
    {
      title: "Name",
      dataIndex: "product",
      key: "product.name",
      render: (product) => (
        <Link to={`/admin/product/${product.id}`}>{product.name}</Link>
      ),
      tdClass: "whitespace-normal",
    },
    {
      title: updateReturn ? "Returnable Quantity" : "Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      title: "Price",
      dataIndex: "productUnitPurchasePrice",
      key: "productUnitPurchasePrice",
    },
    {
      title: "Amount",
      key: "Total Price ",
      dataIndex: "",
      render: ({ productFinalAmount }) => productFinalAmount,
    },
    {
      title: "Tax amount",
      key: "Total Tax ",
      dataIndex: "taxAmount",
    },
  ];

  if (updateReturn) {
    columns.splice(4, 0, {
      title: "Return Quantity",
      dataIndex: "returnQuantity",
      key: "return_quantity",
      width: "150px",
      render: (value, { id, productQuantity }) => {
        return (
          <div>
            <InputNumber
              onChange={(value) => returnOnChange({ id, value })}
              style={{ width: "120px" }}
              placeholder='Return Qty'
              max={productQuantity}
              min={0}
              value={value}
            />
          </div>
        );
      },
    });
  }

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

export default PurchaseProductListCard;
