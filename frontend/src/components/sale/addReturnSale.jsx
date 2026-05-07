import Button from "@/UI/Button";
import { Card, DatePicker, Form, Input, message } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { loadSingleSale } from "../../redux/rtk/features/sale/saleSlice";
import SaleProductListCard from "../Card/saleInvoice/SaleProductListCard";
import Loader from "../loader/loader";
import Payments from "./Payments";
import { addReturnSale } from "./returnSale.api";

const AddReturnSale = () => {
  const { id } = useParams();
  let navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [totalReturnAmount, setTotalReturnAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const sale = useSelector((state) => state.sales.sale);
  const { singleSaleInvoice, returnSaleInvoice } = sale ? sale : {};
  const [list, setList] = useState([]);
  const [date, setDate] = useState(moment());

  const [form] = Form.useForm();

  const paidAmountWatch = Form.useWatch("paidAmount", form);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    dispatch(loadSingleSale(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (paidAmountWatch) {
      const paid = paidAmountWatch.reduce((acc, item) => {
        return acc + (item?.amount ? parseFloat(item.amount) : 0);
      }, 0);
      setTotalPaid(paid);
    }
  }, [paidAmountWatch]);

  useEffect(() => {
    if (singleSaleInvoice) {
      const list = singleSaleInvoice.saleInvoiceProduct.map((item) => {
        const returnItem = returnSaleInvoice
          ?.map((rItem) =>
            rItem.returnSaleInvoiceProduct.find(
              (pItem) => pItem.productId === item.productId
            )
          )
          .reduce(
            (acc, curr) => {
              if (curr) {
                return {
                  productQuantity: acc.productQuantity + curr.productQuantity,
                };
              } else {
                return acc;
              }
            },
            { productQuantity: 0 }
          );

        const itemCopy = { ...item };
        itemCopy.originalQty = item.productQuantity;

        if (returnItem) {
          itemCopy.returnQuantity = 0;
          itemCopy.productQuantity =
            item.productQuantity - returnItem.productQuantity;
        } else {
          itemCopy.returnQuantity = 0;
          itemCopy.remainQuantity = item.productQuantity;
        }
        return itemCopy;
      });
      setList(list);
    }
  }, [singleSaleInvoice, returnSaleInvoice]);

  const submitHandler = async (values) => {
    if (totalPaid > totalReturnAmount) {
      return message.error("Instant return amount cannot be greater than total return amount!");
    }

    try {
      setLoading(true);

      const returnProducts = Object.entries(formData)
        .map(([productId, { value }]) => {
          return {
            saleInvoiceProductId: parseInt(productId),
            productQuantity: Number(value),
          };
        })
        .filter((item) => item.productQuantity > 0);

      if (returnProducts.length === 0) {
        message.warning("Please select at least one product with quantity 1 or more to make a return.");
        setLoading(false);
        return;
      }

      const payload = {
        saleInvoiceId: id,
        note: values.note,
        instantReturnAmount: values.paidAmount || [],
        date: moment(date._d).format(),
        returnSaleInvoiceProduct: returnProducts,
      };

      const resp = await addReturnSale(payload);

      if (resp?.message === "success") {
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
    [formData, list]
  );

  const totalReturnQuantity = () => {
    const totalReturnAmountCalculated = list.reduce((acc, item) => {
      const originalQty = item.originalQty ? parseInt(item.originalQty) : (parseInt(item.productQuantity) || 1);
      const returnQty = parseInt(item.returnQuantity) || 0;

      const finalAmount = parseFloat(item.productFinalAmount) || 0;
      const taxAmount = parseFloat(item.taxAmount) || 0;

      const returnableAmountPerUnit = finalAmount / originalQty;
      const returnableTaxPerUnit = taxAmount / originalQty;

      const itemReturnAmount = returnableAmountPerUnit * returnQty;
      const itemReturnTax = returnableTaxPerUnit * returnQty;

      return acc + itemReturnAmount + itemReturnTax;
    }, 0);

    return parseFloat(totalReturnAmountCalculated.toFixed(2));
  };

  useEffect(() => {
    setTotalReturnAmount(totalReturnQuantity());
  }, [list]);

  return (
    <div>
      <div className="mr-top">
        {singleSaleInvoice ? (
          <Fragment key={singleSaleInvoice.id}>
            <Card bordered={false} className="criclebox h-full m-3 bg-white">
              <div className=" flex justify-between ">
                <h5 className="text-xl">
                  <span className="mr-left">
                    Invoice : {singleSaleInvoice.id}
                  </span>
                </h5>
              </div>
              <div className="">
                <SaleProductListCard
                  formData={formData}
                  updateReturn={true}
                  returnOnChange={updateHandler}
                  list={list}
                />
                <div className="flex flex-col md:flex-row justify-between card-body my-4">
                  <div className="mb-auto"></div>
                  <div className="w-full md:max-w-[400px] md:min-w-[400px]">
                    <Form
                      labelAlign="right"
                      initialValues={{
                        date: dayjs(),
                        paidAmount: [{}],
                      }}
                      form={form}
                      onFinish={submitHandler}
                      autoComplete="off"
                    >
                      <div className="flex flex-col sm:flex-row justify-between mb-2">
                        <span className="mb-1 sm:mb-0">Date: </span>
                        <div className="w-full sm:w-[65%]">
                          <Form.Item name="date" className="mb-0">
                            <DatePicker
                              onChange={(date) => setDate(date._d)}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between mb-2">
                        <span className="mb-1 sm:mb-0">Note: </span>
                        <div className="w-full sm:w-[65%]">
                          <Form.Item name="note" className="mb-0">
                            <Input.TextArea placeholder="Note" />
                          </Form.Item>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between mb-1 mt-3">
                        <span className="mb-1 sm:mb-0">Total Return Amount: </span>
                        <div className="font-semibold gap-2">
                          <strong style={{ color: "red" }}>
                            {totalReturnAmount ? totalReturnAmount.toFixed(2) : "0.00"}
                          </strong>
                        </div>
                      </div>

                      {/* ✅ লাইভ আপডেট হবে এমন Remaining Amount */}
                      <div className="flex flex-col sm:flex-row justify-between mb-3">
                        <span className="mb-1 sm:mb-0">Remaining Amount: </span>
                        <div className="font-semibold gap-2">
                          <strong style={{ color: (totalReturnAmount - totalPaid) < 0 ? "red" : "orange" }}>
                            {(totalReturnAmount - totalPaid).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between mb-2">
                        <span className="mb-1 sm:mb-0">Paid Amount: </span>
                        <div className="w-full sm:w-[65%] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <Payments />
                        </div>
                      </div>

                      <Form.Item style={{ marginTop: "20px" }} className="mb-2">
                        <Button
                          type="submit"
                          className="bg-red-500 text-white hover:bg-red-600"
                          block
                          loading={loading}
                        >
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

export default AddReturnSale;