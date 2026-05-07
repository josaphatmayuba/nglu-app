import { DatePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import { loadAllReturnOrderByPaginated } from "../../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";
import ViewBtn from "../../Buttons/ViewBtn";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import ReturnDashboard from "./ReturnDashboard";

export default function GetAllReturnOrder() {
  const dispatch = useDispatch();
  const { list, total, loading, info } = useSelector(
    (state) => state.returnOrder
  );
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
      title: "Order Id",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
    },

    {
      id: 2,
      title: "Return Type",
      dataIndex: "returnType",
      key: "returnType",
    },
    {
      id: 3,
      title: "Note",
      dataIndex: "note",
      key: "note",
    },

    {
      id: 4,
      title: "Status",
      dataIndex: "returnCartOrderStatus",
      key: "returnCartOrderStatus",
      render: (returnCartOrderStatus) => (
        <span
          className={` rounded px-2 py-[1px] text-ePrimary bg-ePrimary/10 ${
            returnCartOrderStatus == "PENDING" &&
            "text-orange-500 bg-orange-500/10"
          }
                  ${
                    returnCartOrderStatus == "RECEIVED" &&
                    "text-ePrimary bg-ePrimary/10"
                  }
                  ${
                    returnCartOrderStatus == "DELIVERED" &&
                    "text-green-500 bg-green-500/10"
                  }
                  ${
                    returnCartOrderStatus == "CANCELLED" &&
                    "text-red-500 bg-red-500/10"
                  }
                    `}
        >
          {returnCartOrderStatus}
        </span>
      ),
      renderCsv: (returnCartOrderStatus) => returnCartOrderStatus,
    },
    {
      id: 10,
      title: "Action",
      dataIndex: "id",
      key: "payment",
      render: (id) => (
        <div className='flex '>
          <ViewBtn path={`/admin/return-order/${id}`} />
        </div>
      ),

      csvOff: true,
    },
  ];
  const filters = [
    {
      key: "returnCartOrderStatus",
      label: "Order Status",
      type: "select",
      options: [
        { label: "Pending", value: "PENDING" },
        { label: "Received", value: "RECEIVED" },
        { label: "Refunded", value: "REFUNDED" },
        { label: "Resend", value: "RESEND" },
        { label: "Resended", value: "RESENT" },
      ],
      className: "min-w-[120px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },

    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Show", value: "true" },
        { label: "Hide", value: "false" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[200px]",
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
    dispatch(loadAllReturnOrderByPaginated(pageConfig));
  }, [dispatch, pageConfig]);
  return (
    <div className='card card-custom mt-2'>
      <div className='card-body'>
        {info?._count && info?._sum && (
          <ReturnDashboard count={info._count?.id} sum={info._sum} />
        )}
        <br />

        <Card
          className='max-md:border-0 max-md:bg-white'
          bodyClass='max-md:p-0 '
          headClass='border-none'
          title={"Return Order list"}
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
              loading={loading}
              total={total}
              setPageConfig={setPageConfig}
              title={"return Order List"}
              filters={filters}
              isSearch={true}
            />
          </UserPrivateComponent>
        </Card>
      </div>
    </div>
  );
}
