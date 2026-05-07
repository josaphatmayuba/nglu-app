import { Card } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllStaff } from "../../redux/rtk/features/user/userSlice";
import ViewBtn from "../Buttons/ViewBtn";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

const GetAllDeliveryBoy = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.users);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    roleId: 5,
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
      title: "Name",
      dataIndex: "username",
      key: "username",
    },
    {
      id: 4,
      title: "Created at",
      dataIndex: "createdAt",
      key: "addrcreatedAtess",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 5,
      title: "Action",
      dataIndex: "id",
      key: "action",
      render: (id) => <ViewBtn path={`/admin/hr/staffs/${id}/`} />,
    },
  ];

  useEffect(() => {
    dispatch(loadAllStaff(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className='border-0 md:border md:p-6 bg-transparent md:bg-[#fafafa]'
      bodyStyle={{ padding: 0 }}
    >
      <div className='md:flex items-center justify-between pb-3'>
        <h1 className='text-lg font-bold'>Delivery Boy</h1>
      </div>
      <UserPrivateComponent permission={"readAll-user"}>
        <TableComponent
          columns={columns}
          list={list}
          total={total}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Staff List"}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
  );
};

export default GetAllDeliveryBoy;
