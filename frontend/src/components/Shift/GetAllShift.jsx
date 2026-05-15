import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  deleteShift,
  loadAllShiftPaginated,
} from "../../redux/rtk/features/shift/shiftSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddShift from "./AddShift";

const GetAllShift = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.shift);
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
      render: (id) => <Link to={`/admin/shift/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link to={`/admin/shift/${id}`}>{name}</Link>,
      renderCsv: (name) => name,
    },
    {
      id: 3,
      title: "Work Hour",
      dataIndex: "workHour",
      key: "workHour",
      render: (workHour) => `${workHour} Hours`,
      renderCsv: (workHour) => `${workHour} Hours`,
    },
    {
      id: 5,
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      render: (startTime) => dayjs(`2023-11-22T${startTime}`).format("h:mm A"),
      renderCsv: (startTime) =>
        dayjs(`2023-11-22T${startTime}`).format("h:mm A"),
    },
    {
      id: 4,
      title: "End Time",
      dataIndex: "endTime",
      key: "endTime",
      render: (endTime) => dayjs(`2023-11-22T${endTime}`).format("h:mm A"),
      renderCsv: (endTime) => dayjs(`2023-11-22T${endTime}`).format("h:mm A"),
    },

    {
      id: 4,
      title: "",
      key: "action",
      render: ({ id, status }) => [
        {
          label: <ViewBtn title={"View"} path={`/admin/shift/${id}`} />,
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
              permission={"delete-shift"}
              deleteThunk={deleteShift}
              loadThunk={loadAllShiftPaginated}
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
    dispatch(loadAllShiftPaginated(pageConfig));
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
        title="Plannings"
        subtitle="Horaires et rotations du personnel"
        actions={
          <CreateDrawer
            permission={"create-shift"}
            title={"Create Shift"}
            width={35}
          >
            <AddShift />
          </CreateDrawer>
        }
      />
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-shift"}>
          <TableComponent
            actionPermission={[
              "update-shift",
              "delete-shift",
              "readSingle-shift",
            ]}
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Shift List"}
            filters={filters}
          />
        </UserPrivateComponent>
      </Card>
    </>
  );
};

export default GetAllShift;
