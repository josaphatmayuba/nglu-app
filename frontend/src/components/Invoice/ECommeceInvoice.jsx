import moment from "moment";
import React, { forwardRef, useEffect, useRef } from "react";
import { FaFileDownload } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { getSetting } from "../../redux/rtk/features/setting/settingSlice";
import numberToWords from "../../utils/numberToWords";

const PrintToPdf = forwardRef(({ data, invoiceData }, ref) => {
  return (
    <div ref={ref} className="invoice flex flex-col m-5 min-h-[29cm] ">
      {data.status && (
        <div
          className={`-z-10 absolute font-serif text-[100px] font-extrabold  h-screen w-full mx-auto flex items-center justify-center ${
            data.status == "UNPAID" && "text-red-100"
          }
          ${data.status == "PAID" && "text-green-100"}`}
        >
          <h1>{data.status}</h1>
        </div>
      )}
      <div className="flex-grow">
        <div className="text-center row-span-1 col-span-2">
          <h1 className="text-2xl font-semibold">{invoiceData?.companyName}</h1>
          <h3 className="text-base font-medium">{invoiceData?.tagLine}</h3>
          <p>{invoiceData?.address}</p>
          <p>{invoiceData?.phone}</p>
          <p>Email: {invoiceData?.email}</p>
          <p>Website: {invoiceData?.website}</p>
        </div>

        <div className="my-4 text-center">
          <hr className="border-t border-dotted border-[#3f3f3f]" />
          <h3 className="text-center font-medium">ORDER INVOICE</h3>
          <hr className="border-t border-dotted border-[#3f3f3f]" />
        </div>

        <div className="flex justify-between gap-3 my-4">
          {/* customer information section  */}
          <div>
            <table className="table-auto w-full">
              <tbody>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Customer ID
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data?.singleCartOrder?.customer?.id}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Customer Name
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data?.singleCartOrder?.customer.username}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Contact No
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data?.singleCartOrder?.customer.phone}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="">
            <table className="table-auto w-full">
              <tbody>
                <tr>
                  <td className="color-black p-2 text-left border-b border-dotted border-[#ddd] font-bold">
                    Order Id
                  </td>
                  <td className="color-black p-2 text-left border-b border-dotted border-[#ddd]">
                    {data?.singleCartOrder?.id}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-2 text-left border-b border-dotted border-[#ddd] font-bold">
                    Order Date
                  </td>
                  <td className="color-black p-2 text-left border-b border-dotted border-[#ddd]">
                    {moment(data?.singleCartOrder?.date).format("YYYY-MM-DD")}
                  </td>
                </tr>
                {data?.singleCartOrder?.manualPayment && (
                  <tr>
                    <td className="color-black p-2 text-left border-b border-dotted border-[#ddd] font-bold">
                      Payment Method
                    </td>
                    <td className="color-black p-2 text-left border-b border-dotted border-[#ddd]">
                      {
                        data?.singleCartOrder?.manualPayment[0]?.paymentMethod
                          ?.methodName
                      }
                    </td>
                  </tr>
                )}
                {data?.singleCartOrder?.manualPayment[0]
                  ?.customerTransactionId && (
                  <tr>
                    <td className="color-black p-2 text-left border-b border-dotted border-[#ddd] font-bold">
                      TRX ID
                    </td>
                    <td className="color-black p-2 text-left border-b border-dotted border-[#ddd]">
                      {
                        data?.singleCartOrder?.manualPayment[0]
                          ?.customerTransactionId
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mb-4">
          <table>
            <tbody>
              <tr>
                <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                  Shipping Address
                </td>
                <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                  {data?.singleCartOrder?.deliveryAddress}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="justify-stretch col-start-1 col-end-4 row-span-4">
          <table className="table-auto w-full -z-20">
            <thead>
              <tr>
                <th className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                  Sl
                </th>
                <th className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                  Product Name
                </th>
                <th className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                  Quantity
                </th>
                <th className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                  Unit Price
                </th>
                <th className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                  Total Price
                </th>
              </tr>
            </thead>
            <tbody>
              {data &&
                data.singleCartOrder.cartOrderProduct.map((d, index) => (
                  <tr className="even:bg-gray-300 odd:bg-white" key={d.id}>
                    <td className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                      {index + 1}
                    </td>
                    <td className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                      <p>{d.product.name}</p>
                    </td>
                    <td className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                      {d.productQuantity}
                    </td>
                    <td className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                      {d.product.productSalePriceWithVat}
                    </td>
                    <td className="text-left p-[5px] border border-solid border-[#c0c0c0]">
                      {d.productQuantity * d.product.productSalePriceWithVat}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between gap-4">
          <div className=" col-start-1 col-end-3 row-span-5">
            <p>
              <b>In Words: </b>
              {numberToWords(Math.round(data?.totalAmount - data?.dueAmount))}
            </p>
          </div>
          <div className="">
            <table className="table-auto w-full">
              <tbody>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    {" "}
                    Total
                  </td>
                  <td className="color-black p-2 text-left border-b border-dotted border-[#ddd]">
                    {(
                      data?.totalAmount -
                      data?.totalVatAmount -
                      data.deliveryFee
                    ).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Delivery Fee{" "}
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data?.deliveryFee}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Vat / Tax{" "}
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data?.totalVatAmount}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Sub total
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data.totalAmount}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Discount (-)
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data.totalDiscountAmount}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Grand total
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data.totalPaidAmount}
                  </td>
                </tr>
                <tr>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                    Paid
                  </td>
                  <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                    {data.totalPaidAmount}
                  </td>
                </tr>
                {data.status != "PAID" && (
                  <tr>
                    <td className="color-black p-1 text-left border-b border-dotted border-[#ddd] font-bold">
                      Due
                    </td>
                    <td className="color-black p-1 text-left border-b border-dotted border-[#ddd]">
                      {data.dueAmount}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintToPdf.displayName = "printToPdf";

const ECommerceInvoice = ({ data, orderStatus }) => {
  const dispatch = useDispatch();
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const invoiceData = useSelector((state) => state?.setting?.data) || null;

  useEffect(() => {
    !invoiceData && dispatch(getSetting());
  }, [dispatch, invoiceData]);

  return (
    <div>
      <div className="hidden">
        <PrintToPdf
          ref={componentRef}
          data={data}
          invoiceData={invoiceData}
          vatAmount={12}
        />
      </div>
      {invoiceData && (
        <button
          onClick={handlePrint}
          className={` flex items-center gap-2 bg-green-100 p-2 rounded cursor-pointer font-medium ${
            orderStatus == "PENDING" && "hidden"
          }`}
        >
          <FaFileDownload
            className={`${orderStatus == "PENDING" && "text-gray-500 "} ${
              orderStatus != "PENDING" && "text-green-500"
            }`}
            size={20}
          />
          <span>Invoice</span>
        </button>
      )}
    </div>
  );
};

export default ECommerceInvoice;
