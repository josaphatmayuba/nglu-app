import { Button, Form, Input, Modal, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import {
  addAward,
  deleteAward,
  loadAllAwardPaginated,
  updateAward,
} from "../../redux/rtk/features/award/awardSlice";

const AwardsPage = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { list, total, loading } = useSelector((state) => state.award);
  const [modal, setModal] = useState(null);

  const load = () => dispatch(loadAllAwardPaginated({ page: 1, count: 100, status: "true" }));

  useEffect(() => {
    load();
  }, [dispatch]);

  const openModal = (record = null) => {
    setModal(record || {});
    form.setFieldsValue(record || {});
  };

  const closeModal = () => {
    setModal(null);
    form.resetFields();
  };

  const submit = async (values) => {
    const response = modal?.id
      ? await dispatch(updateAward({ id: modal.id, values }))
      : await dispatch(addAward(values));
    if (response.payload?.message === "success") {
      closeModal();
      load();
    }
  };

  const hideAward = async (id) => {
    const response = await dispatch(deleteAward(id));
    if (response.payload?.message === "success") load();
  };

  return (
    <Card title="Awards" extra={<Button type="primary" onClick={() => openModal()}>Nouvel award</Button>}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list || []}
        pagination={{ total: total || 0 }}
        columns={[
          { title: "Nom", dataIndex: "name" },
          { title: "Description", dataIndex: "description" },
          { title: "Statut", dataIndex: "status", render: (status) => <Tag>{status}</Tag> },
          {
            title: "",
            render: (_, record) => (
              <div className="flex gap-2">
                <Button onClick={() => openModal(record)}>Edit</Button>
                <Button danger onClick={() => hideAward(record.id)}>Hide</Button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={Boolean(modal)} title={modal?.id ? "Modifier award" : "Nouvel award"} onCancel={closeModal} footer={null}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item label="Nom" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default AwardsPage;
