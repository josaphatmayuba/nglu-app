import { Table } from "antd";
import React from "react";
import TableForLogin from "./TableForLogin";

const columns = [
  {
    title: "User Name",
    dataIndex: "username",
    key: "username",
  },
  {
    title: "Password",
    dataIndex: "password",
    key: "password",
  },
];
const data = [
  {
    key: "1",
    username: "demo",
    password: "5555",
  },
  {
    key: "2",
    username: "manager",
    password: "manager",
  },
];

const LoginTable = ({ setDefaultValue }) => {
  return (
    <TableForLogin
      columns={columns}
      data={data}
      pagination={false}
      className="text-center"
      setDefaultValue={setDefaultValue}
    />
  );
};

export default LoginTable;
