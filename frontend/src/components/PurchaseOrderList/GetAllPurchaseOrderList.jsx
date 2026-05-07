import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import { loadAllPurchaseReorder } from "../../redux/rtk/features/purchaseOrder/purchaseOrderSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddPurchaseOrder from "./AddPurchaseOrder";

export default function GetAllPurchaseOrderList() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.purchaseOrder);
  useEffect(() => {
    dispatch(loadAllPurchaseReorder({ page: 1, count: 10 }));
  }, [dispatch]);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "reorderInvoiceId",
      key: "reorderInvoiceId",
      render: (reorderInvoiceId) => (
        <Link to={`/admin/purchase-reorder-invoice/${reorderInvoiceId}`}>
          {reorderInvoiceId}
        </Link>
      ),

      renderCsv: (reorderInvoiceId) => reorderInvoiceId,
    },
    {
      id: 2,
      title: "Create Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => moment(date).format("ll"),
      renderCsv: (date) => moment(date).format("DD/MM/YYYY"),
    },

    {
      id: 3,
      title: "Action",
      dataIndex: "reorderInvoiceId",
      key: "reorderInvoiceId",
      render: (reorderInvoiceId) => (
        <div className="flex flex-row">
          <ViewBtn
            path={`/admin/purchase-reorder-invoice/${reorderInvoiceId}`}
          />
        </div>
      ),
      csvOff: true,
    },
  ];

  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // headClass="border-none"
      title={"Purchase Order "}
      extra={
        <>
          <CreateDrawer
            permission={"create-purchaseReorderInvoice"}
            title={"Create Purchase order"}
            width={50}>
            <AddPurchaseOrder />
          </CreateDrawer>
        </>
      }>
      <UserPrivateComponent permission={"readAll-purchaseReorderInvoice"}>
        <TableComponent
          actionPermission={["readSingle-purchaseReorderInvoice"]}
          list={list}
          total={total}
          columns={columns}
          loading={loading}
          paginatedThunk={loadAllPurchaseReorder}
          csvFileName={"Purchase Order list"}
          title={"Purchase Order list"}
        />
      </UserPrivateComponent>
    </Card>
  );
}
