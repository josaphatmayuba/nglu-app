import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import {
  deletePrintPage,
  loadAllPrintPagePaginated,
} from "../../redux/rtk/features/printPage/printPageSlice";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddPrintPage from "./AddPrintPage";
import UpdatePrintPage from "./updatePrintPage";

export default function GetAllPrintPage() {
  const dispatch = useDispatch();
  const { list, loading, total } = useSelector((state) => state.print);

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
    },
    {
      id: 2,
      title: "Page Size",
      dataIndex: "pageSizeName",
      key: "pageSizeName",
    },
    {
      id: 3,
      title: "Width",
      dataIndex: "width",
      key: "width",
    },
    {
      id: 4,
      title: "Height",
      dataIndex: "height",
      key: "height",
    },
    {
      id: 5,
      title: "Measurement Type",
      dataIndex: "unit",
      key: "unit",
    },
    {
      id: 7,
      title: "",
      dataIndex: "",
      key: "action",
      render: ({ pageSizeName, width, height, id, status }) => [
        {
          label: (
            <UserPrivateComponent permission="update-pageSize">
              <UpdatePrintPage data={{ pageSizeName, width, height }} id={id} />
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
              permission={"delete-pageSize"}
              title={status === "true" ? "Hide" : "Show"}
              deleteThunk={deletePrintPage}
              loadThunk={loadAllPrintPagePaginated}
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
      mode: "normal",
      options: [
        { label: "Show", value: "true" },
        { label: "Hide", value: "false" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
  ];
  useEffect(() => {
    dispatch(loadAllPrintPagePaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // // headClass="border-none"
      title={"Print Page"}
      extra={
        <CreateDrawer
          permission={"create-pageSize"}
          title={"Create Print Page"}
          width={35}
        >
          {<AddPrintPage />}
        </CreateDrawer>
      }
    >
      <UserPrivateComponent permission={"readAll-pageSize"}>
        <TableComponent
          actionPermission={[
            "update-pageSize",
            "delete-pageSize",
            "readSingle-pageSize",
          ]}
          list={list}
          columns={columns}
          loading={loading}
          total={total}
          setPageConfig={setPageConfig}
          paginatedThunk={loadAllPrintPagePaginated}
          csvFileName={"print-pages"}
          title={"Print Page List"}
          filters={filters}
        />
      </UserPrivateComponent>
    </Card>
  );
}
