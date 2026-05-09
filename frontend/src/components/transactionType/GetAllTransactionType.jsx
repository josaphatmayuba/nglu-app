import ModalUi from "@/UI/ModalUi";
import { EditOutlined } from "@ant-design/icons";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import {
  deleteTransactionType,
  loadAllTransactionType,
} from "../../redux/rtk/features/transactionType/transactionTypeSlice";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import TransactionTypeForm from "./TransactionTypeForm";

const GetAllTransactionType = () => {
  const dispatch = useDispatch();
  const [edit, setEdit] = useState(false);
  const [, setPageConfig] = useState({
    page: 1,
    count: 10,
  });
  const { list, loading } = useSelector((state) => state.transactionTypes);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "60px",
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      id: 3,
      title: "Debit Account",
      dataIndex: "debitAccount",
      key: "debitAccount",
      render: (debitAccount) => debitAccount?.name || "-",
      renderCsv: (debitAccount) => debitAccount?.name || "-",
    },
    {
      id: 4,
      title: "Credit Account",
      dataIndex: "creditAccount",
      key: "creditAccount",
      render: (creditAccount) => creditAccount?.name || "-",
      renderCsv: (creditAccount) => creditAccount?.name || "-",
    },
    {
      id: 5,
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (description) => description || "-",
    },
    {
      id: 6,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 7,
      title: "",
      key: "action",
      render: (transactionType) => [
        {
          label: (
            <UserPrivateComponent permission={"update-transactionType"}>
              <div
                onClick={() => setEdit(transactionType)}
                className="flex gap-2 items-center cursor-pointer"
              >
                <EditOutlined className="text-[1rem]" />
                Edit
              </div>
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-transactionType"}
              deleteThunk={deleteTransactionType}
              id={transactionType.id}
              title="Delete"
              loadThunk={loadAllTransactionType}
            />
          ),
          key: "delete",
        },
      ],
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllTransactionType());
  }, [dispatch]);

  return (
    <>
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0"
        title="Transaction Types"
        extra={
          <CreateDrawer
            permission={"create-transactionType"}
            title={"Create Transaction Type"}
            width={35}
          >
            <TransactionTypeForm />
          </CreateDrawer>
        }
      >
        <UserPrivateComponent permission={"readAll-transactionType"}>
          <TableComponent
            actionPermission={[
              "update-transactionType",
              "delete-transactionType",
            ]}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Transaction Type List"}
            total={list?.length || 0}
          />
        </UserPrivateComponent>
      </Card>

      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Edit Transaction Type"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <TransactionTypeForm
          transactionType={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </>
  );
};

export default GetAllTransactionType;
