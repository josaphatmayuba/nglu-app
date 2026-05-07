import TableNoPagination from "@/components/CommonUi/TableNoPagination";
import { Card } from "antd";
import { Link } from "react-router-dom";

const UserListCard = ({ list }) => {
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "idNo",
      render: (id) => <Link to={`/admin/hr/staffs/${id}`}>{id}</Link>,
    },
    {
      title: "User Name",
      dataIndex: "username",
      key: "username",
    },

    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => role.name,
    },
    {
      title: "email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "salary",
      dataIndex: "salary",
      key: "salary",
    },
  ];
  const rightElement = (
    <h1 className='px-3 font-medium text-lg'>{list?.name} list</h1>
  );
  return (
    <Card
      className='header-solid h-full'
      bordered={false}
      bodyStyle={{ padding: "0" }}
    >
      <TableNoPagination
        loading={!list}
        list={list?.user}
        columns={columns}
        csvFileName={`${list?.name} Staff list`}
        rightElement={rightElement}
      />
    </Card>
  );
};

export default UserListCard;
