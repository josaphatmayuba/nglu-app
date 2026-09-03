import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import MoneyInput from "../Shared/MoneyInput";
import FormattedAmount from "../Shared/FormattedAmount";
import {
  addSalaryHistory,
  deleteSalaryHistory,
  loadAllSalaryHistoryPaginated,
  updateSalaryHistory,
} from "../../redux/rtk/features/salaryHistory/salaryHistorySlice";
import { loadAllStaff } from "../../redux/rtk/features/user/userSlice";
import { loadAllCurrency } from "../../redux/rtk/features/eCommerce/currency/currencySlice";
import { buildCurrencyOptions, cleanCurrencySymbol } from "../propertyManagement/shared/format";

const SalariesPage = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { list, total, loading } = useSelector((state) => state.salaryHistory);
  const staff = useSelector((state) => state.users?.list) || [];
  const currenciesList = useSelector((state) => state.currency?.list) || [];
  const [modal, setModal] = useState(null);

  const load = () => dispatch(loadAllSalaryHistoryPaginated({ page: 1, count: 100 }));

  useEffect(() => {
    load();
    dispatch(loadAllStaff({ query: "all" }));
    dispatch(loadAllCurrency());
  }, [dispatch]);

  const openModal = (record = null) => {
    setModal(record || {});
    form.setFieldsValue(record ? {
      ...record,
      salaryStartDate: record.startDate ? dayjs(record.startDate) : null,
      salaryEndDate: record.endDate ? dayjs(record.endDate) : null,
      salaryComment: record.comment,
    } : {});
  };

  const closeModal = () => {
    setModal(null);
    form.resetFields();
  };

  const submit = async (values) => {
    const payload = {
      ...values,
      salaryStartDate: values.salaryStartDate ? values.salaryStartDate.format("YYYY-MM-DD") : null,
      salaryEndDate: values.salaryEndDate ? values.salaryEndDate.format("YYYY-MM-DD") : null,
    };
    const response = modal?.id
      ? await dispatch(updateSalaryHistory({ id: modal.id, values: payload }))
      : await dispatch(addSalaryHistory(payload));
    if (response.payload?.message === "success") {
      closeModal();
      load();
    }
  };

  const staffName = (id) => {
    const user = staff.find((item) => item.id === id);
    return user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username : id;
  };

  const currencyCodeFor = (id) => {
    const c = currenciesList.find((x) => x.id === id || x.currencyId === id);
    return c ? cleanCurrencySymbol(c) : "";
  };

  const fmtSalary = (amount, currency) => {
    return (
      <FormattedAmount
        amount={amount}
        currency={currency}
      />
    );
  };

  return (
    <Card title="Salaires" extra={<Button type="primary" onClick={() => openModal()}>Nouveau salaire</Button>}>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list || []}
        pagination={{ total: total || 0 }}
        columns={[
          { title: "Employé", render: (_, record) => staffName(record.userId) },
          { title: "Salaire", render: (_, r) => fmtSalary(r.salary, r.currency) },
          { title: "Début", dataIndex: "startDate" },
          { title: "Fin", dataIndex: "endDate" },
          { title: "Commentaire", dataIndex: "comment" },
          {
            title: "",
            render: (_, record) => (
              <div className="flex gap-2">
                <Button onClick={() => openModal(record)}>Edit</Button>
                <Button danger onClick={() => dispatch(deleteSalaryHistory(record.id)).then(load)}>Delete</Button>
              </div>
            ),
          },
        ]}
      />
      <Modal open={Boolean(modal)} title={modal?.id ? "Modifier salaire" : "Nouveau salaire"} onCancel={closeModal} footer={null}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item label="Employé" name="userId" rules={[{ required: true }]}>
            <Select options={staff.map((user) => ({ value: user.id, label: staffName(user.id) }))} />
          </Form.Item>
          <Form.Item label="Salaire" name="salary" rules={[{ required: true }]}>
            <MoneyInput form={form} currencyField="currencyId" currencies={currenciesList} />
          </Form.Item>
          <Form.Item name="currencyId" hidden><Input /></Form.Item>
          <Form.Item label="Début" name="salaryStartDate"><DatePicker className="w-full" /></Form.Item>
          <Form.Item label="Fin" name="salaryEndDate"><DatePicker className="w-full" /></Form.Item>
          <Form.Item label="Commentaire" name="salaryComment"><Input /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default SalariesPage;
