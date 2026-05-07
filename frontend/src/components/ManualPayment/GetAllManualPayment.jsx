import { DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import { loadAllManualPaymentPaginated } from "../../redux/rtk/features/manualPayment/manualPaymentSlice";
import { loadALLPaymentMethod } from "../../redux/rtk/features/paymentMethod/paymentMethodSlice";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddManualPay from "./AddManualPay";
import ManualPaymentFilter from "./ManualPaymentFilter";
import UpdatePayment from "./UpdatePayment";

export default function GetAllManualPayment() {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { list, total, loading } = useSelector((state) => state.manualPayment);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const columns = [
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
      render: (cartOrderId) => (
        <Link to={`/admin/order/${cartOrderId}`}>{cartOrderId}</Link>
      ),
      renderCsv: (cartOrderId) => cartOrderId,
    },
    {
      id: 2,
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: (customer) => (
        <Link to={`/admin/hr/staffs/${customer.id}`}>{customer.username}</Link>
      ),
      renderCsv: (customer) => customer.username,
    },

    {
      id: 3,
      title: "Account No",
      dataIndex: "customerAccount",
      key: "customerAccount",
      render: (customerAccount) => (customerAccount ? customerAccount : "-"),
      renderCsv: (customerAccount) => customerAccount,
    },
    {
      id: 4,
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
    {
      id: 5,
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (paymentMethod) => paymentMethod.methodName,
      renderCsv: (paymentMethod) => paymentMethod.methodName,
    },
    {
      id: 6,
      title: "TRX ID",
      dataIndex: "customerTransactionId",
      key: "customerTransactionId",
      render: (customerTransactionId) =>
        customerTransactionId ? customerTransactionId : "-",
      renderCsv: (customerTransactionId) => customerTransactionId,
    },
    {
      id: 7,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },

    {
      id: 8,
      title: "Action",
      key: "Action",
      render: (item) => (
        <div className='flex items-center gap-3'>
          <UserPrivateComponent permission={"update-manualPayment"}>
            <UpdatePayment data={item} />
          </UserPrivateComponent>
        </div>
      ),
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllManualPaymentPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  useEffect(() => {
    dispatch(loadALLPaymentMethod());
  }, [dispatch]);

  const onDateChange = (date) => {
    const fromDate = date.format("YYYY-MM-DD");
    setPageConfig((prev) => {
      return {
        ...prev,
        fromDate,
      };
    });
  };

  return (
    <>
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
        // headClass="border-none"
        title={"E-Com Payments"}
        extra={
          <div className="flex gap-2 justify-end">
            <DatePicker
              onChange={onDateChange}
              allowClear
              className="sm:w-2/5 md:w-[30%]"
              defaultValue={dayjs(
                moment().endOf("month").format("YYYY-MM-DD"),
                "YYYY-MM-DD"
              )}
            />
            <CreateDrawer
              className="sm:w-3/5 md:w-[70%]"
              permission={"create-manualPayment"}
              title={"Create Manual Payment"}
              width={35}
            >
              <AddManualPay />
            </CreateDrawer>
          </div>
        }
      >
        <UserPrivateComponent permission={"readAll-manualPayment"}>
          <TableComponent
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Manual Payment List"}
            isSearch
            filter={<ManualPaymentFilter setPageConfig={setPageConfig} />}
          />
        </UserPrivateComponent>
      </Card>
      <Modal
        title="Update Manual Payment"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      ></Modal>
    </>
  );
}
