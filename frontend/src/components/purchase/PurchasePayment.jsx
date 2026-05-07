import { loadAllAccount } from "@/redux/rtk/features/account/accountSlice";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Select } from "antd";
import { useEffect } from "react";
import { CiCircleRemove } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";

export default function PurchasePayment({ totalCalculator, form, setNewDue }) {
  const dispatch = useDispatch();
  const { list: subAccount, loading: subAccountLoading } = useSelector(
    (state) => state.accounts
  );

  useEffect(() => {
    dispatch(loadAllAccount());
  }, [dispatch]);

  const handleAmountChange = (index) => {
    const paidAmounts = form.getFieldValue("paidAmount") || [];
    const currentAmount = paidAmounts.reduce(
      (total, current) => total + (current?.amount || 0),
      0
    );
    setNewDue(currentAmount);
    if (totalCalculator) {
      totalCalculator(index);
    }
  };

  return (
    <Form.List name="paidAmount">
      {(fields, { add, remove }) => (
        <div className="flex flex-col">
          <div className="bg-tableBg">
            {fields.map(({ key, name, ...restField }, index) => (
              <div key={key} className={`py-1`}>
                <div className="flex gap-3 items-center">
                  <Form.Item
                    {...restField}
                    name={[name, "amount"]}
                    className="mb-0"
                    rules={[
                      {
                        required: true,
                        message: "Amount is required",
                      },
                    ]}>
                    <InputNumber
                      className="discountType"
                      addonAfter={
                        <Form.Item
                          {...restField}
                          name={[name, "paymentType"]}
                          noStyle
                          rules={[
                            {
                              required: true,
                              message: "Payment type is required",
                            },
                          ]}>
                          <Select
                            loading={subAccountLoading}
                            size="small"
                            popupClassName="min-w-[200px]"
                            style={{
                              width: 100,
                            }}
                            placeholder="Select Payment type"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              option.children
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                            filterSort={(optionA, optionB) =>
                              optionA.children
                                .toLowerCase()
                                .localeCompare(optionB.children.toLowerCase())
                            }>
                            {subAccount?.map((account) => (
                              <Select.Option
                                key={account.id}
                                value={account.id}>
                                {account.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      }
                      placeholder="0"
                      style={{
                        width: "100%",
                      }}
                      size={"small"}
                      onChange={() => handleAmountChange(index)}
                    />
                  </Form.Item>
                  <button
                    shape="circle"
                    className="flex justify-center items-center hover:bg-black/40 rounded-md"
                    onClick={() => {
                      remove(name);
                      totalCalculator && totalCalculator(index);
                    }}>
                    <CiCircleRemove size={25} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-2">
            <Button
              type="dashed"
              size="small"
              onClick={() => add()}
              className="flex items-center justify-center"
              block
              icon={<PlusOutlined />}>
              Add Payment
            </Button>
          </div>
        </div>
      )}
    </Form.List>
  );
}
