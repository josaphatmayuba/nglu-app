import { Pagination, Table } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { loadAlleCommerceSalePaginated } from "../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import useCurrency from "../../utils/useCurrency";

export default function MyOrder() {
  const dispatch = useDispatch();
  const currency = useCurrency();

  const {
    list,
    total,
    loading: saleLoading,
  } = useSelector((state) => state.ESale);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
  });
  const columns = [
    {
      title: "Order#",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Place On",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("MMM Do YY"),
    },
    {
      id: 9,
      title: "Re Ordered",
      dataIndex: "isReOrdered",
      key: "Re Ordered",
      width: "120px",
    },
    {
      title: "Items",
      dataIndex: "cartOrderProduct",
      key: "cartOrderProduct",
      render: (cartOrderProduct) => {
        const productNames = cartOrderProduct.map(
          (product) => product.product.name
        );
        const productNamesString = productNames.join(", ");
        return productNamesString;
      },
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => (
        <span>
          <span
            dangerouslySetInnerHTML={{
              __html: currency?.currencySymbol,
            }}
          />
          {` ${totalAmount}`}
        </span>
      ),
    },
    {
      title: "Order Status",
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
      title: "Action",
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <Link
          className='px-2 py-1 rounded text-ePrimary bg-ePrimary/10 hover:bg-ePrimary/20 duration-150'
          to={`/order/${id}`}
        >
          View
        </Link>
      ),
    },
  ];

  useEffect(() => {
    dispatch(loadAlleCommerceSalePaginated(pageConfig));
  }, [dispatch, pageConfig]);
  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };

   const onRow = (record) => ({
     onClick: () => console.log(record),
   });
  return (
    <div className="bg-white my-4 p-5 table-container eCommerce">
      <div className="flex items-start gap-5">
        <h3>Orders</h3>{" "}
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
        
        className="my-5"
        columns={columns}
        loading={saleLoading}
        dataSource={
          !!list?.length && list.map((item) => ({ ...item, key: item?.id }))
        }
        pagination={false}
        scroll={{
          x: 400,
        }}
      />
      <div className="mt-2 flex justify-end">
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
