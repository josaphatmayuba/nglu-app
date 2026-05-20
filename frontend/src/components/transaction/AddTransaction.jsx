import { Button, DatePicker, Form, Input, Select, Typography, Checkbox } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllAccount } from "../../redux/rtk/features/account/accountSlice";
import {
  addTransaction,
  loadAllTransaction,
} from "../../redux/rtk/features/transaction/transactionSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddAccount from "../account/AddAccount";
import toast from "react-hot-toast";
import { loadSingleSale } from "@/redux/rtk/features/sale/saleSlice";
import { loadSinglePurchase } from "@/redux/rtk/features/purchase/purchaseSlice";
import { loadAllTransactionType } from "../../redux/rtk/features/transactionType/transactionTypeSlice";

//Date functionalities
let startdate = moment().startOf("month").format("YYYY-MM-DD");
let enddate = moment().endOf("month").format("YYYY-MM-DD");

const AddTransaction = ({ preFieldValue, id, isSale, dueAmount }) => {
  const dispatch = useDispatch();
  const { Title } = Typography;
  const { list: accounts, loading } = useSelector((state) => state.accounts);
  const { list: transactionTypes, loading: loadingTypes } = useSelector((state) => state.transactionTypes);
  const [form] = Form.useForm();

  let [date, setDate] = useState(moment());
  const [loader, setLoader] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);

  useEffect(() => {
    dispatch(loadAllAccount());
    dispatch(loadAllTransactionType());
  }, [dispatch]);

  const onFinish = async (values) => {
    if (dueAmount && values?.amount > dueAmount) {
      toast.error("Amount cannot be greater then total return value!", {
        duration: 3000,
      });
      setLoader(false);
      return;
    }
    try {
      const type = manualEntry ? null : selectedTransactionType ? selectedTransactionType.name : null;
      const data = { date, type, ...values };

      const resp = await dispatch(addTransaction(data));

      if (resp.meta?.requestStatus === "fulfilled") {
        setLoader(false);
        dispatch(loadAllTransaction({ startdate, enddate }));
        if (isSale && id) {
          dispatch(loadSingleSale(id));
        } else {
          dispatch(loadSinglePurchase(id));
        }
      }

      form.resetFields();
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    setLoader(false);
  };



  return (
    <>
      <div>
        <Title level={4} className="m-2 text-center">
          Transaction
        </Title>
        <Form
          form={form}
          name="basic"
          initialValues={{
            remember: true,
            ...preFieldValue,
          }}
          layout="vertical"
          className="sm:mx-10"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off">
          <Form.Item style={{ marginBottom: "10px" }} label="Date" required>
            <DatePicker
              defaultValue={dayjs()}
              onChange={(value) => setDate(value?._d)}
              label="date"
              name="date"
              className="date-picker date-picker-transaction-create"
              rules={[
                {
                  required: true,
                  message: "Please input date!",
                },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: "10px" }}>
            <Checkbox checked={manualEntry} onChange={(e) => setManualEntry(e.target.checked)}>
              Manual Entry
            </Checkbox>
          </Form.Item>
          {!manualEntry && (
            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Transaction Type"
              name="transactionTypeId"
            >
              <Select
                loading={loadingTypes}
                showSearch
                placeholder="Select Transaction Type"
                optionFilterProp="children"
                onChange={(value) => {
                  const type = transactionTypes.find(t => t.id === value);
                  setSelectedTransactionType(type);
                  if (type) {
                    form.setFieldsValue({
                      debitId: type.debitAccountId,
                      creditId: type.creditAccountId,
                    });
                  }
                }}
              >
                {transactionTypes &&
                  transactionTypes.map((type) => (
                    <Select.Option key={type.id} value={type.id}>
                      {type.name}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-end mb-[10px]">
              <Form.Item
                className="flex-grow  mb-0"
                name="debitId"
                label={
                  <>
                    Debit Account
                    <BigDrawer
                      title={"new debit account"}
                      // eslint-disable-next-line react/no-children-prop
                      children={<AddAccount drawer={true} />}
                    />
                  </>
                }
                rules={[
                  {
                    required: true,
                    message: "Please input debit account!",
                  },
                ]}>
                <Select
                  loading={loading}
                  showSearch
                  placeholder="Select Debit ID"
                  optionFilterProp="children">
                  {accounts &&
                    accounts.map((acc) => (
                      <Select.Option key={acc.id} value={acc.id}>
                        {acc.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </div>

            <div className="flex items-end mb-[10px]">
              <Form.Item
                name="creditId"
                label={
                  <>
                    Credit Account
                    <BigDrawer
                      title={"new credit account"}
                      // eslint-disable-next-line react/no-children-prop
                      children={<AddAccount drawer={true} />}
                    />
                  </>
                }
                className="flex-grow mb-0"
                rules={[
                  {
                    required: true,
                    message: "Please input debit account!",
                  },
                ]}>
                <Select
                  loading={loading}
                  showSearch
                  placeholder="Select Credit ID"
                  optionFilterProp="children">
                  {accounts &&
                    accounts.map((acc) => (
                      <Select.Option key={acc.id} value={acc.id}>
                        {acc.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Amount"
              name="amount"
              rules={[
                {
                  required: true,
                  message: "Please input amount!",
                },
              ]}>
              <Input type="number" />
            </Form.Item>

            <Form.Item
              style={{ marginBottom: "10px" }}
              label="Particulars"
              name="particulars"
              rules={[
                {
                  required: true,
                  message: "Please input particulars!",
                },
              ]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            style={{ marginBottom: "10px" }}
            label="Transaction Reference"
            name="relatedId"
          >
          </Form.Item>

          <Form.Item
            style={{ marginBottom: "10px" }}
            className="flex justify-center mt-[24px]">
            <Button
              type="primary"
              htmlType="submit"
              shape="round"
              loading={loader}
              onClick={() => setLoader(true)}>
              Pay Now
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default AddTransaction;
