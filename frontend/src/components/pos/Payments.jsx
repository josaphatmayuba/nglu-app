import { loadAllAccount } from "@/redux/rtk/features/account/accountSlice";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, InputNumber, Select } from "antd";
import { useEffect } from "react";
import { CiCircleRemove } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";

export default function Payments({ totalCalculator, onUserEdit }) {
  const dispatch = useDispatch();
  const { list: subAccount, loading: subAccountLoading } = useSelector(
    (state) => state.accounts
  );

  useEffect(() => {
    dispatch(loadAllAccount());
  }, [dispatch]);

  return (
    <div className="w-full">
      <Form.List name='paidAmount'>
        {(fields, { add, remove }) => (
          <div className='flex flex-col w-full'>
            <div className='bg-tableBg w-full'>
              {fields.map(({ key, name, ...restField }, index) => {
                return (
                  <div key={key} className={`py-1 w-full`}>
                    <div className='flex items-center w-full'>
                      <Form.Item
                        {...restField}
                        name={[name, "amount"]}
                        className='mb-0 flex-1'
                        rules={[
                          {
                            required: true,
                            message: "Amount is required",
                          },
                        ]}
                      >
                        <InputNumber
                          className='discountType w-full'
                          controls={false}
                          step={0.01}
                          precision={2}
                          formatter={(val) =>
                            val === undefined || val === null || val === ""
                              ? ""
                              : Number(val).toFixed(2)
                          }
                          parser={(val) => (val ? val.replace(/[^\d.-]/g, "") : "")}
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
                              ]}
                            >
                              <Select
                                loading={subAccountLoading}
                                size='small'
                                popupClassName='min-w-[200px]'
                                style={{
                                  width: 100,
                                }}
                                placeholder='Select Payment type'
                                optionFilterProp='children'
                                filterOption={(input, option) =>
                                  option.children.includes(input)
                                }
                                filterSort={(optionA, optionB) =>
                                  optionA.children
                                    .toLowerCase()
                                    .localeCompare(optionB.children.toLowerCase())
                                }
                              >
                                {subAccount?.map((account) => (
                                  <Select.Option
                                    key={account.id}
                                    value={account.id}
                                  >
                                    {account.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          }
                          placeholder='0'
                          style={{
                            width: "100%",
                          }}
                          size={"small"}
                          onChange={(val) => {
                            if (typeof onUserEdit === "function") onUserEdit();
                            if (typeof totalCalculator === "function")
                              totalCalculator();
                          }}
                        />
                      </Form.Item>
                      <button
                        shape='circle'
                        className='flex justify-center items-center hover:bg-black/40 rounded-md ml-2'
                        onClick={() => {
                          remove(name);
                          totalCalculator && totalCalculator(index);
                        }}
                      >
                        <CiCircleRemove size={25} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className='flex items-center justify-center mt-2 w-full'>
              <Button
                type='dashed'
                size='small'
                onClick={() => add()}
                className='flex items-center justify-center w-full'
                block
                icon={<PlusOutlined />}
              >
                Add Payment
              </Button>
            </div>
          </div>
        )}
      </Form.List>
    </div>
  );
}