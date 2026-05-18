import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import { loadAllAccountPaginated } from "../../redux/rtk/features/account/accountSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddAccount from "./AddAccount";

const GetAllAccount = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.accounts) || {};
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/account/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },

    {
      id: 2,
      title: "Account",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link to={`/admin/account/${id}`}>{name}</Link>,
      renderCsv: (name) => name,
    },

    {
      id: 3,
      title: "Account Type ",
      dataIndex: "account",
      key: "account",
      render: (account) => account?.name,
      renderCsv: (account) => account?.name,
    },
    {
      id: 4,
      title: "Action",
      key: "Action",
      render: ({ id }) => <ViewBtn path={`/admin/account/${id}`} />,
      csvOff: true,
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
      popupClassName: "w-[100px]",
    },
  ];
  useEffect(() => {
    dispatch(loadAllAccountPaginated({ status: true, page: 1, count: 10 }));
  }, [dispatch]);
  useEffect(() => {
    dispatch(loadAllAccountPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <>
      <PageHeader
        title="Comptes"
        subtitle="Plan comptable et soldes"
        actions={
          <CreateDrawer
            permission={"create-account"}
            title={"Create Account"}
            width={35}>
            <AddAccount />
          </CreateDrawer>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-account"}>
        <TableComponent
          actionPermission={[
            "update-account",
            "delete-account",
            "readSingle-account",
          ]}
          list={list}
          columns={columns}
          total={total}
          loading={loading}
          setPageConfig={setPageConfig}
          filters={filters}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
};

export default GetAllAccount;
