import { Card, Modal } from "antd";
import { useState } from "react";

import ViewBtnOnly from "../Buttons/ViewBtnOnly";
import Table from "@/UI/Table";

const CustomTable = ({ list }) => {
  const columns = [
    {
      title: "Name",
      dataIndex: "product",
      key: "product",
      render: (product) => product?.name,
    },
    {
      title: "Product Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      title: "Product Unit Price ",
      dataIndex: "productPurchasePrice",
      key: "productPurchasePrice",
    },
    {
      title: "Total Amount",
      dataIndex: "",
      render: ({ productQuantity, productPurchasePrice }) =>
        productQuantity * productPurchasePrice,
    },
  ];
  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <Card
      className="header-solid h-full"
      bordered={false}
      bodyStyle={{ paddingTop: "0" }}
    >
      <div className="mt-4">
        <Table
          loading={!list}
          columns={columns}
          data={list ? addKeys(list) : []}
        />
      </div>
    </Card>
  );
};

const ReturnPurchaseInvoiceProductList = ({ list }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button className="btn btn-primary btn-sm" onClick={showModal}>
        <ViewBtnOnly />
      </button>
      <Modal
        width={1000}
        title={`View Details of Product`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <CustomTable list={list} />
        <div className="text-start ms-3">
          <h6>
            Total Quantity:{"  "}{" "}
            <strong>
              {list?.reduce((acc, item) => acc + item.productQuantity, 0)}
            </strong>
          </h6>
          <h6>
            Total Amount:{"  "}{" "}
            <strong>
              {list?.reduce(
                (acc, item) =>
                  acc + item.productQuantity * item.productPurchasePrice,
                0
              )}
            </strong>
          </h6>
        </div>
      </Modal>
    </>
  );
};

export default ReturnPurchaseInvoiceProductList;
