import Table from "@/UI/Table";
import { InputNumber } from "antd";
import { Link } from "react-router-dom";

const SaleProductListCard = ({ list, updateReturn, returnOnChange }) => {
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
      tdClass: "whitespace-normal",
    },
    {
      title: updateReturn ? "Returnable Quantity" : "Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      title: "Price",
      dataIndex: "productUnitSalePrice",
      key: "productUnitSalePrice",
      width: "150px",
    },
    {
      title: "Discount",
      dataIndex: "productDiscount",
      key: "productDiscount",
    },
    {
      title: "Amount",
      key: "Total Price ",
      dataIndex: "",
      render: ({ productFinalAmount }) => {
        return productFinalAmount;
      },
    },
    {
      title: "Tax Amount",
      dataIndex: "taxAmount",
      key: "taxAmount",
    },
  ];

  if (updateReturn) {
    // columns.splice(3, 0, {
    //   title: "Remain Quantity",
    //   dataIndex: "remainQuantity",
    //   key: "remainQuantity",
    //   width: "120px",
    // });
    columns.splice(4, 0, {
      title: "Return Quantity",
      dataIndex: "returnQuantity",
      key: "returnQuantity",
      width: "150px",
      render: (value, { id, productQuantity }) => {
        return (
          <div>
            <InputNumber
              className='px-0'
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

export default SaleProductListCard;
