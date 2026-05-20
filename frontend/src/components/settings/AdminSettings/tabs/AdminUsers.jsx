import { Button, Card, Col, Row, Table, Space, Tooltip, Popconfirm, message } from "antd";
import { Trash2, Edit2, Plus } from "lucide-react";
import { useState } from "react";

export default function AdminUsers() {
  const [users, setUsers] = useState([
    // Placeholder data - replace with API call
    { id: 1, name: "Admin User", email: "admin@example.com", role: "Administrator", status: "active" },
    { id: 2, name: "Manager", email: "manager@example.com", role: "Manager", status: "active" },
  ]);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      filters: [
        { text: "Administrator", value: "Administrator" },
        { text: "Manager", value: "Manager" },
        { text: "User", value: "User" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span className={status === "active" ? "text-green-600" : "text-red-600"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit user">
            <Button type="text" size="small" icon={<Edit2 size={16} />} />
          </Tooltip>
          <Tooltip title="Delete user">
            <Popconfirm title="Delete this user?" onConfirm={() => message.success("User deleted")}>
              <Button type="text" danger size="small" icon={<Trash2 size={16} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Row justify="space-between" align="middle" style={{ marginBottom: "20px" }}>
        <Col>
          <h3 className="m-0">User Management</h3>
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => message.info("Add user form coming soon")}>
            Add User
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        bordered={false}
      />
    </Card>
  );
}
