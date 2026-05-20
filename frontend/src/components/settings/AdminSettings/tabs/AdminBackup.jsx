import { Button, Card, Col, Row, Table, Space, Tooltip, Popconfirm, message, Progress, Empty } from "antd";
import { Trash2, Download, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import dayjs from "dayjs";

export default function AdminBackup() {
  const [backups, setBackups] = useState([
    {
      id: 1,
      filename: "backup_2026-05-19_14-30.sql.gz",
      type: "Full Database",
      size: "245.3 MB",
      createdAt: "2026-05-19 14:30:22",
      status: "completed",
    },
    {
      id: 2,
      filename: "backup_2026-05-18_14-30.sql.gz",
      type: "Full Database",
      size: "238.1 MB",
      createdAt: "2026-05-18 14:30:15",
      status: "completed",
    },
    {
      id: 3,
      filename: "backup_2026-05-17_14-30.sql.gz",
      type: "Full Database",
      size: "231.8 MB",
      createdAt: "2026-05-17 14:30:08",
      status: "completed",
    },
  ]);

  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleCreateBackup = () => {
    setIsBackingUp(true);
    message.loading({ content: "Creating backup...", duration: 0 });
    setTimeout(() => {
      setIsBackingUp(false);
      message.success("Backup created successfully");
      const newBackup = {
        id: backups.length + 1,
        filename: `backup_${dayjs().format("YYYY-MM-DD_HH-mm")}.sql.gz`,
        type: "Full Database",
        size: "248.5 MB",
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        status: "completed",
      };
      setBackups([newBackup, ...backups]);
    }, 3000);
  };

  const columns = [
    {
      title: "Filename",
      dataIndex: "filename",
      key: "filename",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      sorter: (a, b) => parseFloat(a.size) - parseFloat(b.size),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <span className={status === "completed" ? "text-green-600" : "text-orange-600"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Download backup">
            <Button type="text" size="small" icon={<Download size={16} />} />
          </Tooltip>
          <Tooltip title="Delete backup">
            <Popconfirm title="Delete this backup?" onConfirm={() => message.success("Backup deleted")}>
              <Button type="text" danger size="small" icon={<Trash2 size={16} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bordered={false} style={{ marginBottom: "20px" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div>
              <h3 className="m-0">Database Backups</h3>
              <p className="text-gray-500 text-sm">Last backup: {backups[0]?.createdAt}</p>
            </div>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              loading={isBackingUp}
              onClick={handleCreateBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? "Creating..." : "Create Backup"}
            </Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <h4 style={{ marginBottom: "16px" }}>Backup History</h4>
        {backups.length > 0 ? (
          <Table
            columns={columns}
            dataSource={backups}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            bordered={false}
          />
        ) : (
          <Empty description="No backups found" style={{ padding: "40px 0" }} />
        )}
      </Card>

      <Card bordered={false} style={{ marginTop: "20px", backgroundColor: "#f0f5ff" }}>
        <h4>Backup Policy</h4>
        <ul style={{ marginTop: "12px" }}>
          <li>Full database backups are created daily at 2:30 PM UTC</li>
          <li>Backups are retained for 30 days automatically</li>
          <li>You can manually download and store backups for long-term retention</li>
          <li>Restoration from backup requires administrator access</li>
        </ul>
      </Card>
    </div>
  );
}
