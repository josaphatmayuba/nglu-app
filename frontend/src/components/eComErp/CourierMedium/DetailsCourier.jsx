import moment from "moment";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Card from "../../../UI/Card";
import { loadCartOrderPaginatedByCourierMedium } from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import {
  deleteCourierMedium,
  loadSingleCourierMedium,
} from "../../../redux/rtk/features/eCommerce/courierMedium/courierMediumSlice";
import ViewBtn from "../../Buttons/ViewBtn";
import CommonDelete from "../../CommonUi/CommonDelete";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";

export default function DetailsCourier() {
  const dispatch = useDispatch();
  const { id } = useParams("id");
  const { courier, loading } = useSelector((state) => state.courierMedium);
  const {
    listByCourier,
    totalByCourier,
    loading: cartOrderLoading,
  } = useSelector((state) => state.ESale);

  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  const columns = [
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "id",
      key: "id",
      render: (name, { id }) => <Link to={`/admin/order/${id}`}>{id}</Link>,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },

    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => totalAmount?.toFixed(2),
    },

    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
      responsive: ["md"],
      render: (paidAmount) => paidAmount.toFixed(2),
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
      id: 10,
      title: "Action",
      dataIndex: "id",
      key: "payment",
      render: (id) => (
        <div className="flex ">
          <ViewBtn path={`/admin/order/${id}`} />
        </div>
      ),
    },
  ];

  useEffect(() => {
    dispatch(loadSingleCourierMedium(id));
    dispatch(loadCartOrderPaginatedByCourierMedium({ id, query: pageConfig }));
  }, [dispatch, id, pageConfig]);

  return (
    <Card
      title={courier?.courierMediumName}
      extra={
        <CommonDelete
          permission={"delete-courier"}
          deleteThunk={deleteCourierMedium}
          id={id}
          navigatePath={"/admin/courier-medium"}
          className={"p-2"}
        />
      }
    >
      <UserPrivateComponent permission={"readAll-courier"}>
        <TableComponent
          total={totalByCourier}
          columns={columns}
          list={listByCourier}
          loading={cartOrderLoading}
          setPageConfig={setPageConfig}
          title={"Order list"}
        />
      </UserPrivateComponent>
    </Card>
  );
}
