import { DatePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../../UI/Card";
import { loadAlleCommerceSalePaginated } from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import ViewBtn from "../../Buttons/ViewBtn";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import DashboardCard from "./DashboardCard";

export default function GetAllOrder() {
  const dispatch = useDispatch();
  const {
    list,
    total,
    loading: saleLoading,
    info,
  } = useSelector((state) => state.ESale);
  const { RangePicker } = DatePicker;

  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const columns = [
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "id",
      key: "id",
      render: (name, { id }) => <Link to={`/admin/order/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
      renderCsv: (date) => moment(date).format("ll"),
    },

    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => totalAmount.toFixed(2),
      renderCsv: (totalAmount) => totalAmount.toFixed(2),
    },
    {
      id: 6,
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      responsive: ["md"],
      render: (dueAmount) => dueAmount.toFixed(2),
      renderCsv: (dueAmount) => dueAmount.toFixed(2),
    },
    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
      responsive: ["md"],
      render: (paidAmount) => paidAmount.toFixed(2),
      renderCsv: (paidAmount) => paidAmount.toFixed(2),
    },

    // {
    //   id: 8,
    //   title: "Profit",
    //   dataIndex: "profit",
    //   key: "profit",
    //   render: (profit) => Number(profit).toFixed(2),
    //   responsive: ["md"],
    // },
    {
      id: 9,
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: (customer) => customer?.username,
      renderCsv: (customer) => customer?.username,
    },
    {
      id: 9,
      title: "Re Ordered",
      dataIndex: "isReOrdered",
      key: "Re Ordered",
      width: "120px",
    },
    {
      id: 9,
      title: "Status",
      width: "150px",
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
      renderCsv: (orderStatus) => orderStatus,
    },
    {
      id: 10,
      title: "Action",
      width: "80px",
      dataIndex: "id",
      key: "payment",
      render: (id) => (
        <div className='flex '>
          <ViewBtn path={`/admin/order/${id}`} />
        </div>
      ),
      csvOff: true,
    },
  ];
  const filters = [
    {
      key: "orderStatus",
      label: "Order status",
      type: "select",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Received", value: "RECEIVED" },
        { label: "Packed", value: "PACKED" },
        { label: "Shipped", value: "SHIPPED" },
        { label: "Delivered", value: "DELIVERED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
      className: "min-w-[120px] max-w-[150px]",
      popupClassName: "w-[150px]",
    },
  ];
  const onCalendarChange = (dates) => {
    const startDate = dates[0].format("YYYY-MM-DD");
    const endDate = dates[1].format("YYYY-MM-DD");

    setPageConfig((prev) => {
      return {
        ...prev,
        startDate,
        endDate,
      };
    });
  };

  useEffect(() => {
    dispatch(loadAlleCommerceSalePaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <div className='card card-custom mt-2'>
      <div className='card-body'>
        <DashboardCard information={info?._sum} count={info?._count?.id} />
        <br />
        <Card
          className='max-md:border-0 max-md:bg-white'
          bodyClass='max-md:p-0 '
          headClass='border-none'
          title={"Order list"}
          extra={
            <RangePicker
              className='range-picker '
              onCalendarChange={onCalendarChange}
              defaultValue={[
                dayjs(pageConfig.startDate, "YYYY-MM-DD"),
                dayjs(pageConfig.endDate, "YYYY-MM-DD"),
              ]}
            />
          }
        >
          <UserPrivateComponent permission={"readAll-cartOrder"}>
            <TableComponent
              list={list}
              columns={columns}
              loading={saleLoading}
              total={total}
              setPageConfig={setPageConfig}
              title={"Order List"}
              filters={filters}
              isSearch={true}
            />
          </UserPrivateComponent>
        </Card>
      </div>
    </div>
  );
}
