import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  deleteDepartment,
  loadAllDepartmentPaginated,
} from "../../redux/rtk/features/department/departmentSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddDepartment from "./AddDepartment";

const GetAllDepartment = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.department);
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
      render: (id) => <Link to={`/admin/department/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/department/${id}`}>{name}</Link>
      ),
      renderCsv: (name) => name,
    },
    {
      id: 3,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: ({ id, status, name }) => [
        {
          label: <ViewBtn title={"View"} path={`/admin/department/${id}`} />,
          key: "view",
        },
        {
          label: (
            <CommonDelete
              values={{
                id: id,
                status: status,
              }}
              title={status === "true" ? "Hide" : "Show"}
              permission={"delete-department"}
              deleteThunk={deleteDepartment}
              loadThunk={loadAllDepartmentPaginated}
              query={{ ...pageConfig, status: status }}
              className="bg-white text-black"
            />
          ),
          key: "delete",
        },
      ],
      csvOff: true,
    },
  ];
  useEffect(() => {
    dispatch(loadAllDepartmentPaginated(pageConfig));
  }, [dispatch, pageConfig]);

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
  return (
    <>
      <PageHeader
        title="Départements"
        subtitle="Structure organisationnelle"
        actions={
          <CreateDrawer
            permission={"create-department"}
            title={"Create Department"}
            width={35}
          >
            <AddDepartment />
          </CreateDrawer>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-department"}>
        <TableComponent
          actionPermission={[
            "update-department",
            "delete-department",
            "readSingle-department",
          ]}
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Department List"}
          filters={filters}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
};

export default GetAllDepartment;
