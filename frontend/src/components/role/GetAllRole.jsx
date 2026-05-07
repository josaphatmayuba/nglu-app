import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import {
  deleteRole,
  loadRolePaginated,
} from "../../redux/rtk/features/hr/role/roleSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddRole from "./AddRole";

const GetAllRole = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.role);
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
      render: (id) => <Link to={`/admin/role/${id}/`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link to={`/admin/role/${id}/`}>{name}</Link>,
      renderCsv: (name) => name,
    },

    {
      id: 3,
      title: "Created at",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: ({ id, status }) => [
        {
          label: <ViewBtn title={"view"} path={`/admin/role/${id}`} />,
          key: "view",
        },
        {
          label: (
            <CommonDelete
              values={{
                id: id,
                status: status,
              }}
              permission={"delete-role"}
              deleteThunk={deleteRole}
              title={status === "true" ? "Hide" : "Show"}
              loadThunk={loadRolePaginated}
              query={{ ...pageConfig, status: status }}
            />
          ),
          key: "delete",
        },
      ],
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
      popupClassName: "w-[200px]",
    },
  ];
  useEffect(() => {
    dispatch(loadRolePaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      title={"Roles"}
      extra={
        <CreateDrawer
          permission={"create-role"}
          title={"Create Role"}
          width={35}
        >
          <AddRole />
        </CreateDrawer>
      }
    >
      <UserPrivateComponent permission={"readAll-role"}>
        <TableComponent
          actionPermission={["update-role", "delete-role", "readSingle-role"]}
          columns={columns}
          list={list}
          total={total}
          setPageConfig={setPageConfig}
          loading={loading}
          title={"Role List"}
          filters={filters}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
  );
};

export default GetAllRole;
