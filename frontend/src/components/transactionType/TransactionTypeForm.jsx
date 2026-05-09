import { Button, Form, Input, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllAccount } from "../../redux/rtk/features/account/accountSlice";
import {
  addTransactionType,
  loadAllTransactionType,
  updateTransactionType,
} from "../../redux/rtk/features/transactionType/transactionTypeSlice";

const TransactionTypeForm = ({ transactionType, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { Title } = Typography;
  const { list: accounts, loading: accountsLoading } = useSelector(
    (state) => state.accounts,
  );

  const isUpdate = Boolean(transactionType?.id);

  useEffect(() => {
    dispatch(loadAllAccount());
  }, [dispatch]);

  useEffect(() => {
    if (transactionType) {
      form.setFieldsValue({
        name: transactionType.name,
        debitAccountId: transactionType.debitAccountId,
        creditAccountId: transactionType.creditAccountId,
        description: transactionType.description,
      });
    }
  }, [form, transactionType]);

  const onFinish = async (values) => {
    setLoading(true);
    const response = isUpdate
      ? await dispatch(updateTransactionType({ id: transactionType.id, values }))
      : await dispatch(addTransactionType(values));

    setLoading(false);

    if (response.payload?.message === "success") {
      dispatch(loadAllTransactionType());
      form.resetFields();
      onClose && onClose();
    }
  };

  return (
    <div>
      <Title level={4} className="m-2 text-center">
        {isUpdate ? "Edit Transaction Type" : "Create Transaction Type"}
      </Title>
      <Form
        form={form}
        name="transaction-type"
        layout="vertical"
        className="sm:mx-10"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please input name!" }]}
        >
          <Input placeholder="Name" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Debit Account"
          name="debitAccountId"
          rules={[{ required: true, message: "Please select debit account!" }]}
        >
          <Select
            loading={accountsLoading}
            showSearch
            placeholder="Select Debit Account"
            optionFilterProp="children"
          >
            {accounts?.map((account) => (
              <Select.Option key={account.id} value={account.id}>
                {account.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Credit Account"
          name="creditAccountId"
          rules={[{ required: true, message: "Please select credit account!" }]}
        >
          <Select
            loading={accountsLoading}
            showSearch
            placeholder="Select Credit Account"
            optionFilterProp="children"
          >
            {accounts?.map((account) => (
              <Select.Option key={account.id} value={account.id}>
                {account.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          label="Description"
          name="description"
        >
          <Input.TextArea rows={3} placeholder="Description" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: "10px" }}
          className="flex justify-center mt-6"
        >
          <Button type="primary" htmlType="submit" shape="round" loading={loading}>
            {isUpdate ? "Update Transaction Type" : "Create Transaction Type"}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TransactionTypeForm;
