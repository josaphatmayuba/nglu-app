import { Button, Card, Col, Row, Table, Space, Tooltip, Popconfirm, message } from "antd";
import { Trash2, Edit2, Plus } from "lucide-react";
import { useState } from "react";

export default function AdminModels() {
  const [models, setModels] = useState([
    // Placeholder data - replace with API call
    { id: 1, name: "Invoice Template", type: "Invoice", category: "Financial", status: "active" },
    { id: 2, name: "PO Template", type: "Purchase Order", category: "Procurement", status: "active" },
    { id: 3, name: "Report Template", type: "Report", category: "Reporting", status: "inactive" },
  ]);

  const columns = [
    {
      title: "Template Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      filters: [
        { text: "Invoice", value: "Invoice" },
        { text: "Purchase Order", value: "Purchase Order" },
        { text: "Report", value: "Report" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span className={status === "active" ? "text-green-600" : "text-gray-500"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit template">
            <Button type="text" size="small" icon={<Edit2 size={16} />} />
          </Tooltip>
          <Tooltip title="Delete template">
            <Popconfirm title="Delete this template?" onConfirm={() => message.success("Template deleted")}>
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
          <h3 className="m-0">Template Management</h3>
        </Col>
        <Col>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => message.info("Create template form coming soon")}>
            Create Template
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={models}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        bordered={false}
      />
    </Card>
  );
}
