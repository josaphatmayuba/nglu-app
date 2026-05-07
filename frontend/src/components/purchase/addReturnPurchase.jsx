import Button from "@/UI/Button";
import { Card, DatePicker, Form, Input } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { loadSinglePurchase } from "../../redux/rtk/features/purchase/purchaseSlice";
import PurchaseProductListCard from "../Card/purchaseInvoice/PurchaseProductListCard";
import Loader from "../loader/loader";
import Payments from "./Payments";
import { addReturnPurchase } from "./returnPurchase.api";

const AddReturnPurchase = () => {
  const { id } = useParams();
  let navigate = useNavigate();
  const [formData, setFormData] = useState({});

  const [loading, setLoading] = useState(false);
  const [totalReturnAmount, setTotalReturnAmount] = useState(0);
  // make a button click fucnciton to set loading to true

  //dispatch
  const dispatch = useDispatch();
  const purchase = useSelector((state) => state.purchases.purchase);

  const { singlePurchaseInvoice, returnPurchaseInvoice } = purchase
    ? purchase
    : {};
  const [list, setList] = useState([]);
  const [date, setDate] = useState(moment());

  const [form] = Form.useForm();
  const nameValue = Form.useWatch("name", form);

  useEffect(() => {
    dispatch(loadSinglePurchase(id));
  }, [id]);

  useEffect(() => {
    if (singlePurchaseInvoice) {
      const list = singlePurchaseInvoice.purchaseInvoiceProduct.map((item) => {
        // const returnItem = returnPurchaseInvoice?.map((rItem) =>
        // 	rItem.returnPurchaseInvoiceProduct.find(
        // 		(pItem) => pItem.productId === item.productId
        // 	)
        // )[0];

        const returnItem = returnPurchaseInvoice
          ?.map((rItem) =>
            rItem.returnPurchaseInvoiceProduct.find(
              (pItem) => pItem.productId === item.productId
            )
          )
          .reduce(
            (acc, item) => {
              if (item) {
                return {
                  productQuantity: acc.productQuantity + item.productQuantity,
                };
              } else {
                return acc;
              }
            },
            { productQuantity: 0 }
          );

        const itemCopy = { ...item };

        if (returnItem) {
          itemCopy.returnQuantity = 0;
          itemCopy.productQuantity =
            itemCopy.productQuantity - returnItem.productQuantity;
        } else {
          itemCopy.returnQuantity = 0;
          itemCopy.remainQuantity = item.productQuantity;
        }
        return itemCopy;
      });
      setList(list);
    }
  }, [singlePurchaseInvoice]);

  const submitHandler = async ({ note, paidAmount }) => {
    try {
      setLoading(true);
      const payload = {
        purchaseInvoiceId: id,
        note,
        date: moment(date._d).format(),
        instantReturnAmount: paidAmount || [],
        returnPurchaseInvoiceProduct: Object.entries(formData).map(
          ([id, { value }]) => {
            return {
              purchaseInvoiceProductId: parseInt(id),
              productQuantity: value,
            };
          }
        ),
      };
      const resp = await addReturnPurchase(payload);
      if (resp.message === "success") {
        navigate(-1);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const updateHandler = useCallback(
    ({ id, value }) => {
      const item = list.find((item) => item.id === id);
      if (item) {
        formData[id] = { value };
        item.returnQuantity = value;
        item.remainQuantity = item.productQuantity - value;
        setList([...list]);
        setFormData({ ...formData });
      }
    },

    [list]
  );

  const totalReturnQuantity = () => {
    const subTotal = list.reduce((acc, item) => {
      const price = parseFloat(item.productUnitPurchasePrice) || 0;
      const qty = parseInt(item.returnQuantity) || 0;
      return acc + parseFloat((price * qty).toFixed(2));
    }, 0);
    const totalTax = list.reduce((acc, item) => {
      const price = parseFloat(item.productUnitPurchasePrice) || 0;
      const qty = parseInt(item.returnQuantity) || 0;
      const vat = parseFloat(item.tax) || 0;

      const subPrice = parseFloat((price * qty).toFixed(2));
      const itemTax = parseFloat(((vat / 100) * subPrice).toFixed(2));
      return acc + itemTax;
    }, 0);
    return parseFloat((subTotal + totalTax).toFixed(2));
  };

  // set total return amount to state from totalReturnQuantity
  useEffect(() => {
    setTotalReturnAmount(totalReturnQuantity());
  }, [list]);

  return (
    <div>
      <div className="mr-top">
        {singlePurchaseInvoice ? (
          <Fragment key={singlePurchaseInvoice.id}>
            <Card bordered={false} className="criclebox h-full m-3">
              <div className="flex justify-between">
                <h5 className="text-xl">
                  <span className="mr-left">
                    Invoice : {singlePurchaseInvoice.id}
                  </span>
                </h5>
              </div>
              <div className="">
                <PurchaseProductListCard
                  formData={formData}
                  updateReturn={true}
                  returnOnChange={updateHandler}
                  list={list}
                />
                <div className="flex justify-between card-body my-4">
                  <div className="mb-auto"></div>
                  <div className="mr-right min-w-[400px]">
                    <Form
                      labelAlign="right"
                      labelCol={{
                        span: 4,
                      }}
                      initialValues={{
                        date: dayjs(new Date()),
                      }}
                      wrapperCol={{
                        span: 26,
                      }}
                      form={form}
                      onFinish={submitHandler}
                      autoComplete="off">
                      <div className="flex justify-between mb-2">
                        <span className="">Date: </span>
                        <div className="w-[65%]">
                          <Form.Item name="date" className="mb-0">
                            <DatePicker
                              onChange={(date) => setDate(date._d)}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </div>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="">Note: </span>
                        <div className="w-[65%]">
                          <Form.Item name="note" className="mb-0">
                            <Input.TextArea placeholder="Note" />
                          </Form.Item>
                        </div>
                      </div>

                      <div className="flex justify-between  mb-2 mt-3">
                        <span className="">Total Return Amount: </span>
                        <div className=" font-semibold gap-2">
                          {totalReturnAmount}
                        </div>
                      </div>

                      <div className="flex justify-between mb-2">
                        <span className="">Paid Amount: </span>
                        <div className="w-[65%] flex items-center justify-between gap-2">
                          <Payments />
                        </div>
                      </div>

                      <Form.Item style={{ marginTop: "20px" }} className="mb-2">
                        <Button
                          className="bg-red-500 hover:bg-red-600 text-white"
                          type="submit"
                          block
                          loading={loading}>
                          Make Return
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                </div>
              </div>
            </Card>
          </Fragment>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
};

export default AddReturnPurchase;
