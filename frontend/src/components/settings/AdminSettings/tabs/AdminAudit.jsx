import { Card, Table, Space, Button, Row, Col, DatePicker, Select } from "antd";
import { Download } from "lucide-react";
import { useState } from "react";
import dayjs from "dayjs";

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 1,
      timestamp: "2026-05-19 14:30:22",
      user: "Admin User",
      action: "create",
      entity: "Invoice #INV-001",
      ipAddress: "192.168.1.100",
      result: "success",
    },
    {
      id: 2,
      timestamp: "2026-05-19 13:15:45",
      user: "Manager",
      action: "update",
      entity: "User Profile",
      ipAddress: "192.168.1.101",
      result: "success",
    },
    {
      id: 3,
      timestamp: "2026-05-19 12:00:11",
      user: "Admin User",
      action: "delete",
      entity: "Draft Report",
      ipAddress: "192.168.1.100",
      result: "success",
    },
    {
      id: 4,
      timestamp: "2026-05-19 11:45:30",
      user: "Unknown",
      action: "login_failed",
      entity: "Authentication",
      ipAddress: "203.0.113.50",
      result: "failed",
    },
  ]);

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      filters: [
        { text: "Create", value: "create" },
        { text: "Update", value: "update" },
        { text: "Delete", value: "delete" },
        { text: "Login Failed", value: "login_failed" },
      ],
      onFilter: (value, record) => record.action === value,
      render: (action) => {
        const colors = {
          create: "text-blue-600",
          update: "text-orange-600",
          delete: "text-red-600",
          login_failed: "text-red-700",
        };
        return <span className={colors[action] || ""}>{action.replace("_", " ").toUpperCase()}</span>;
      },
    },
    {
      title: "Entity",
      dataIndex: "entity",
      key: "entity",
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
    },
    {
      title: "Result",
      dataIndex: "result",
      key: "result",
      render: (result) => (
        <span className={result === "success" ? "text-green-600" : "text-red-600"}>
          {result.charAt(0).toUpperCase() + result.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Row gutter={[16, 16]} style={{ marginBottom: "20px" }}>
        <Col xs={24} sm={8}>
          <span>Filter by date:</span>
          <DatePicker style={{ width: "100%", marginTop: "8px" }} />
        </Col>
        <Col xs={24} sm={8}>
          <span>Filter by action:</span>
          <Select
            style={{ width: "100%", marginTop: "8px" }}
            placeholder="Select action"
            options={[
              { label: "All", value: "all" },
              { label: "Create", value: "create" },
              { label: "Update", value: "update" },
              { label: "Delete", value: "delete" },
            ]}
          />
        </Col>
        <Col xs={24} sm={8} style={{ display: "flex", alignItems: "flex-end" }}>
          <Button icon={<Download size={16} />} style={{ width: "100%" }}>
            Export Logs
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={auditLogs}
        rowKey="id"
        pagination={{ pageSize: 15 }}
        bordered={false}
        size="small"
      />
    </Card>
  );
}
