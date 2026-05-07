import { SolutionOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Card from "../../UI/Card";
import {
  clearEmployeeStatus,
  deleteEmployeeStatus,
  loadSingleEmployeeStatus,
} from "../../redux/rtk/features/employeeStatus/employeeStatusSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import TableNoPagination from "../CommonUi/TableNoPagination";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import Loader from "../loader/loader";
import Table from "@/UI/Table";

export default function DetailsEmploymentStatus() {
  const { id } = useParams();

  //dispatch
  const dispatch = useDispatch();
  const { employeeStatus, loading } = useSelector(
    (state) => state.employmentStatus
  );
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },

    {
      id: 6,
      title: "User Name",
      dataIndex: "username",
      key: "username",
    },
    {
      id: 7,
      title: "Start Time",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => dayjs(createdAt).format("hh:mm A"),
    },
    {
      id: 8,
      title: "End Time",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (updatedAt) => dayjs(updatedAt).format("hh:mm A"),
    },

    {
      id: 5,
      title: "",
      key: "action",
      render: ({ id }) => [
        {
          label: <ViewBtn title={"View"} path={`/admin/hr/staffs/${id}`} />,
          key: "view",
        },
      ],
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadSingleEmployeeStatus(id));
    return () => {
      dispatch(clearEmployeeStatus());
    };
  }, [dispatch, id]);
  const addKeys = (arr) => arr.map((i) => ({ ...i, key: i.id }));

  return (
    <div>
      {employeeStatus ? (
        <Card
          title={
            <>
              <SolutionOutlined />
              <span className="mr-left">
                ID : {employeeStatus.id} | {employeeStatus.name}
              </span>
            </>
          }>
          <div>
            <Table
              scroll={{ x: true }}
              loading={!employeeStatus?.user}
              columns={columns}
              data={employeeStatus?.user ? addKeys(employeeStatus?.user) : []}
            />
          </div>
        </Card>
      ) : (
        <Loader />
      )}
    </div>
  );
}
