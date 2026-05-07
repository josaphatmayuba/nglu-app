import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import {
  deletePaymentMethod,
  loadAllPaymentMethodPaginated,
} from "../../redux/rtk/features/paymentMethod/paymentMethodSlice";
import { stringShorter } from "../../utils/functions";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import ActiveSegment from "./ActiveSegment";
import AddPayMethod from "./AddPayMethod";
import UpdatePaymentMethod from "./UpdatePaymentMethod";

export default function GetAllPaymentMethod() {
  const dispatch = useDispatch();

  const { list, total, loading } = useSelector((state) => state.paymentMethod);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "50px",
    },

    {
      id: 2,
      title: "Logo",
      dataIndex: "logo",
      render: (logo) => (
        <div className='w-[2.5rem] h-[2.5rem] relative p-1'>
          <img
            className='absolute object-cover w-full h-full'
            alt='product'
            onError={handleOnError}
            src={
              `${import.meta.env.VITE_APP_API}/files/${logo}` ||
              "/images/default.jpg"
            }
          />
        </div>
      ),

      csvOff: true,
      key: "image",
      width: "100px",
    },
    {
      id: 3,
      title: "Sub Account",
      dataIndex: "subAccount",
      key: "subAccount",
      render: (subAccount) => subAccount.name,

      renderCsv: (subAccount) => subAccount.name,
    },
    {
      id: 4,
      title: "Payment Method",
      dataIndex: "methodName",
      key: "methodName",
    },
    {
      id: 5,
      title: "Owner Account",
      dataIndex: "ownerAccount",
      key: "ownerAccount",
    },
    {
      id: 6,
      title: "Instruction",
      dataIndex: "instruction",
      key: "instruction",
      render: (instruction) => (
        <span
          dangerouslySetInnerHTML={{
            __html: stringShorter(instruction, 20),
          }}
        ></span>
      ),

      renderCsv: (instruction) => instruction,
    },

    {
      id: 7,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },
    {
      id: 8,
      title: "Active",
      key: "isActive",
      render: ({ isActive, id }) => (
        <ActiveSegment isActive={isActive} id={id} />
      ),

      csvOff: true,
      width: "200px",
    },

    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-paymentMethod"}>
              <UpdatePaymentMethod data={item} />
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-paymentMethod"}
              deleteThunk={deletePaymentMethod}
              id={item.id}
              title='Hide'
              loadThunk={loadAllPaymentMethodPaginated}
              query={{ status: true, page: 1, count: 10 }}
            />
          ),
          key: "delete",
        },
      ],
    },
  ];

  const filters = [
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

  useEffect(() => {
    dispatch(loadAllPaymentMethodPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // headClass="border-none"
      title={"Payment Methods"}
      extra={
        <CreateDrawer
          permission={"create-paymentMethod"}
          title={"Create Payment Method"}
          width={35}
        >
          <AddPayMethod />
        </CreateDrawer>
      }
    >
      <UserPrivateComponent permission={"readAll-paymentMethod"}>
        <TableComponent
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Payment Method List"}
          isSearch
          filters={filters}
        />
      </UserPrivateComponent>
    </Card>
  );
}
