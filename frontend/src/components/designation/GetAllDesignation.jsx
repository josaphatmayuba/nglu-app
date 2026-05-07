import { EditOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import {
  deleteDesignation,
  loadAllDesignationPaginated,
} from "../../redux/rtk/features/designation/designationSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddDesignation from "./addDesignation";

const GetAllDesignation = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.designations);
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
      render: (id) => <Link to={`/admin/designation/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/designation/${id}`}>{name}</Link>
      ),
      renderCsv: (name) => name || "N/A",
    },
    {
      id: 3,
      title: "",
      key: "action",
      render: ({ id, status, name }) => [
        {
          label: <ViewBtn title={"View"} path={`/admin/designation/${id}`} />,
          key: "view",
        },
        {
          label: (
            <UserPrivateComponent permission={"update-designation"}>
              <Link
                to={`/admin/designation/${id}/update`}
                state={{ data: { name: name } }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <EditOutlined className=" rounded-md" />
                Edit
              </Link>
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              values={{
                id: id,
                status: status,
              }}
              title={status === "true" ? "Hide" : "Show"}
              permission={"delete-designation"}
              deleteThunk={deleteDesignation}
              loadThunk={loadAllDesignationPaginated}
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
    dispatch(loadAllDesignationPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // headClass="border-none"
      title={"Designations"}
      extra={<AddDesignation />}
    >
      <UserPrivateComponent permission={"readAll-designation"}>
        <TableComponent
          actionPermission={[
            "update-designation",
            "delete-designation",
            "readSingle-designation",
          ]}
          list={list}
          total={total}
          loading={loading}
          columns={columns}
          setPageConfig={setPageConfig}
          title={"Designation List"}
          filters={filters}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
  );
};

export default GetAllDesignation;
