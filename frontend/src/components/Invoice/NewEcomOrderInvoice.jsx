import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import invoiceGenerator from "@/utils/invoiceGenerator";
import moment from "moment";
import numberToWords from "@/utils/numberToWords";
import { decodeHtmlEntity } from "@/utils/functions";
import { FaFileDownload } from "react-icons/fa";


export default function NewEcomOrderInvoice({ data, orderStatus, title }) {
  const { currencySymbol, currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();
  const numberInText = numberToWords(
    Math.round((data.totalAmount || 0) - (data.discount || 0))
  );

  const currencyLocal = decodeHtmlEntity(currencySymbol);

  const bottomLeftContent = [
    {
      label: "In Words: ",
      value: `${numberInText.toUpperCase()} ${currencyName}` || "",
    },
    {
      label: "Terms And Conditions: ",
      value: data.singleCartOrder.termsAndConditions
        ? data.singleCartOrder.termsAndConditions
        : "",
    },
    { label: "Notes: ", value: data.note ? data.note : "" },
  ];

  const bottomRightContent = [
    {
      label: "Total:",
      value: `${currencyLocal} ${data.singleCartOrder.totalAmount}`,
    },
    {
      label: "Discount:",
      value: `${currencyLocal} ${data.singleCartOrder.totalDiscountAmount}`,
    },
    {
      label: "Return Product Value:",
      value: `${currencyLocal} ${data.totalReturnAmount}`,
    },
    {
      label: "Return Amount:",
      value: `${currencyLocal} ${data.instantPaidReturnAmount}`,
    },
   
    {
      label: "Total Tax:",
      value: `${currencyLocal} ${
        data.singleCartOrder.totalTaxAmount
          ? data.singleCartOrder.totalTaxAmount
          : 0
      }`,
    },
    {
      label: "Paid:",
      value: `${currencyLocal} ${data.singleCartOrder.paidAmount}`,
    },
    {
      label: "Due:",
      value: `${currencyLocal} ${data.singleCartOrder.dueAmount}`,
    },
  ];
  const tableHead = [
    "SI",
    "Product Name",
    "Quantity",
    "Price",
    "Discount",
    "Amount",
    "Tax"
  ];
  const tableBody = data.singleCartOrder.cartOrderProduct.map((item, index) => [
    index + 1,
    item.product.name,
    item.productQuantity,
    `${currencyLocal} ${item.productUnitSalePrice}`,
    `${currencyLocal} ${item.productDiscount}`,
    `${currencyLocal} ${
      item.productUnitSalePrice * item.productQuantity - item.productDiscount
    }`,
    `${currencyLocal} ${item.taxAmount}`,
  ]);

  const customerInfo = [
    {
      value: `Customer ID: ${data?.singleCartOrder?.customer?.id}`,
    },
    {
      value: `Customer Name: ${data?.singleCartOrder?.customer.username}`,
    },
    {
      value: `Contact No: ${data?.singleCartOrder?.customer.phone}`,
    },
    // {
    //   value: `Shipping Address: ${data?.singleCartOrder?.deliveryAddress}`,
    // },
  ];
  const TopRightInfo = [
    {
      value: `Order Id: ${data?.singleCartOrder?.id}`,
    },
    {
      value: `Order Date: ${moment(data?.singleCartOrder?.date).format(
        "YYYY-MM-DD"
      )}`,
    },
    // {
    //   value: `Payment Method: ${data?.singleCartOrder?.manualPayment[0]?.paymentMethod?.methodName}`,
    // },
    // {
    //   value: `TRX ID: ${data?.singleCartOrder?.manualPayment[0]?.customerTransactionId}`,
    // },
  ];
   const settings = {
     jsPDF: {
       // orientation: "landscape"
     },
     tableFontSize: 10,
     infoTopFontSize: 10,
     bottomRightFontSize: 10,
     bottomLeftFontSize: 8,
     footerFontSize: 10,
   };
  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);

  return (
    <div className="flex gap-2">
      {companyInfo && (
        <button
          onClick={() =>
            invoiceGenerator("print", {
              title,
              TopRightInfo,
              customerInfo,
              companyInfo,
              bottomLeftContent,
              bottomRightContent,
              tableBody,
              tableHead,
              settings,
              leftBottomSecondColunmX: 48,
            })
          }
          className={` flex items-center gap-2 bg-green-100 p-2 rounded cursor-pointer font-medium `}
        >
          <FaFileDownload
            className={`text-green-500`}
            size={20}
          />
          <span>Invoice</span>
        </button>
      )}
    </div>
  );
}
