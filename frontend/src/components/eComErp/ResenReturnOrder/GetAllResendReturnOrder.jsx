import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../../UI/Card";
import { addReOrderSale } from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import { loadAllResendReturnOrder } from "../../../redux/rtk/features/eCommerce/returnOrder/returnOrderSlice";
import { stringShorter } from "../../../utils/functions";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";

export default function GetAllResendReturnOrder() {
  const dispatch = useDispatch();
  const { resend, loading } = useSelector((state) => state.returnOrder);
  const handleReorder = async (cartOrderId, returnCartOrderId) => {
    const resp = await dispatch(
      addReOrderSale({ cartOrderId, returnCartOrderId })
    );
    if (resp.payload.message == "success") {
      dispatch(loadAllResendReturnOrder());
    }
  };
  const columns = [
    {
      id: 2,
      title: "Order Id",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
      render: (cartOrderId) => (
        <Link to={`/admin/order/${cartOrderId}`}>{cartOrderId}</Link>
      ),
      renderCsv: (cartOrderId) => cartOrderId,
    },
    {
      id: 3,
      title: "Status",
      dataIndex: "returnCartOrderStatus",
      key: "returnCartOrderStatus",
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
      id: 5,
      title: "Return Type",
      dataIndex: "returnType",
      key: "returnType",
    },
    {
      id: 6,
      title: "Note",
      dataIndex: "note",
      key: "note",
      render: (note) => stringShorter(note, 20),
      renderCsv: (note) => stringShorter(note, 20),
    },
    {
      id: 7,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
      renderCsv: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },
    {
      id: 7,
      title: "Action",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
      render: (cartOrderId, { id }) => (
        <button
          onClick={() => handleReorder(cartOrderId, id)}
          className='py-1 px-2 rounded bg-ePrimary font-medium text-white hover:bg-ePrimary/80'
        >
          Reorder
        </button>
      ),
      csvOff: true,
    },
  ];
  useEffect(() => {
    dispatch(loadAllResendReturnOrder());
  }, [dispatch]);
  return (
    <div>
      <Card
        className='max-md:border-0 max-md:bg-white'
        bodyClass='max-md:p-0 '
        headClass='border-none'
        title={"Resend Return list"}
      >
        <UserPrivateComponent permission={"readAll-purchaseInvoice"}>
          <TableComponent
            list={resend}
            columns={columns}
            loading={loading}
            title='resend return List'
          />
        </UserPrivateComponent>
      </Card>
    </div>
  );
}
