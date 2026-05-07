import { Pagination, Table } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { loadAllReturnOrderByPaginated } from "../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";
import useCurrency from "../../utils/useCurrency";

export default function MyReturns() {
  const dispatch = useDispatch();
  const currency = useCurrency();

  const { list, total, loading } = useSelector((state) => state.returnOrder);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
  });
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
        returnCartOrderProduct[0]?.product?.name,
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
      render: (totalAmount) => totalAmount.toFixed(2)
    },
    {
      title: " Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YY"),
    },
  ];

  useEffect(() => {
    dispatch(loadAllReturnOrderByPaginated(pageConfig));
  }, [dispatch, pageConfig]);
  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };
  return (
    <div className='bg-white my-4 p-5 table-container eCommerce'>
      <div className='flex items-start gap-5'>
        <h3>Returns</h3>{" "}
        {/* <div className="filterTag float-left min-w-[120px] max-w-[150px]">
            <Select
              placeholder="Order status"
              className=""
              showSearch={false}
              style={{ width: "100%" }}
              maxTagPlaceholder={(item) => (
                <div className="">{item.length} Selected</div>
              )}
              maxTagCount={0}
              onChange={(value) => handleChange(value, "orderStatus")}
            >
              <Select.Option value="PENDING" key="PENDING">
                Pending
              </Select.Option>
              <Select.Option value="RECEIVED" key="RECEIVED">
                Received
              </Select.Option>
              <Select.Option value="PACKED" key={"PACKED"}>
                Packed
              </Select.Option>
              <Select.Option value="SHIPPED" key={"SHIPPED"}>
                Shipped
              </Select.Option>
              <Select.Option value="DELIVERED" key={"DELIVERED"}>
                Delivered
              </Select.Option>
              <Select.Option value="CANCELLED" key={"CANCELLED"}>
                Cancelled
              </Select.Option>
            </Select>
          </div>{" "} */}
      </div>

      <Table
        className='my-5'
        columns={columns}
        loading={loading}
        dataSource={
          !!list?.length && list.map((item) => ({ ...item, key: item?.id }))
        }
        pagination={false}
        scroll={{
          x: 400,
        }}
      />
      <div className='mt-2 flex justify-end'>
        {total >= 11 && (
          <Pagination
            total={total}
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} of ${total} items`
            }
            onChange={fetchData}
            defaultPageSize={10}
            defaultCurrent={1}
            showLessItems
            showSizeChanger={total > 10}
          />
        )}
      </div>
    </div>
  );
}
