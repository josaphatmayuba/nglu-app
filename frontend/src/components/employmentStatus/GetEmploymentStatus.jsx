import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  deleteEmployeeStatus,
  loadAllEmployeeStatusPaginated,
} from "../../redux/rtk/features/employeeStatus/employeeStatusSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddEmploymentStatus from "./AddEmploymentStatus";
import Card from "@/UI/Card";

export default function GetEmploymentStatus() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector(
    (state) => state.employmentStatus
  );
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
      render: (id) => <Link to={`/admin/employment-status/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/employment-status/${id}`}>{name}</Link>
      ),
      renderCsv: (name) => name,
    },
    {
      id: 3,
      title: "Color Code",
      dataIndex: "colourValue",
      key: "colourValue",
      render: (colourValue) => (
        <div className="flex">
          <div
            className="rounded border border-gray-200"
            style={{
              marginRight: "10px",
              width: "20px",
              height: "20px",
              backgroundColor: colourValue,
            }}
          ></div>
          {colourValue}
        </div>
      ),
      renderCsv: (colourValue) => colourValue,
    },
    {
      id: 4,
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      id: 5,
      title: "",
      key: "action",
      render: ({ id, status }) => [
        {
          label: (
            <ViewBtn title={"View"} path={`/admin/employment-status/${id}`} />
          ),
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
              permission={"delete-employmentStatus"}
              deleteThunk={deleteEmployeeStatus}
              loadThunk={loadAllEmployeeStatusPaginated}
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
    dispatch(loadAllEmployeeStatusPaginated(pageConfig));
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
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0"
      title={"Employment Status List"}
      extra={
        <CreateDrawer
          permission={"create-employmentStatus"}
          title={"Create Employment Status"}
          width={35}
        >
          <AddEmploymentStatus />
        </CreateDrawer>
      }
    >
      <UserPrivateComponent permission={"readAll-employmentStatus"}>
        <TableComponent
          actionPermission={[
            "update-employmentStatus",
            "delete-employmentStatus",
            "readSingle-employmentStatus",
          ]}
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Employment Status List"}
          filters={filters}
        />
      </UserPrivateComponent>
    </Card>
  );
}
