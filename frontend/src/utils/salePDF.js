import "jspdf-autotable";
import moment from "moment";
import { decodeHtmlEntity } from "./functions";
import invoiceGenerator from "./invoiceGenerator";
import numberToWords from "./numberToWords";

export default function salePDF(data, companyInfo, title, currencyName) {
  const numberInText = numberToWords(Math.round(data.totalAmount));

  const currencyLocal = currencyName;

  const bottomLeftContent = [
    { label: "In Words: ", value: numberInText || "" },
    {
      label: "Terms And Conditions: ",
      value: data.termsAndConditions ? data.termsAndConditions : "",
    },
    { label: "Notes: ", value: data.note ? data.note : "" },
  ];
  const bottomRightContent = [
    {
      label: "Sub Total:",
      value: `   ${data.singleSaleInvoice.totalAmount}`,
    },
    {
      label: "Discount: (-)",
      value: `   ${
        data.singleSaleInvoice.totalDiscountAmount
          ? data.singleSaleInvoice.totalDiscountAmount
          : 0
      }`,
    },
    {
      label: "Tax: ",
      value: `   ${
        data.singleSaleInvoice.totalTaxAmount
          ? data.singleSaleInvoice.totalTaxAmount
          : 0
      }`,
    },
    {
      label: "Grand total:",
      value: `   ${data.totalAmount - (data.discount ? data.discount : 0)}`,
    },
    {
      label: "Paid:",
      value: `   ${data.totalPaidAmount}`,
    },
    {
      label: "Due:",
      value: `   ${data.dueAmount}`,
    },
  ];

  const tableHead = [
    "SI",
    "Product Description",
    "Quantity",
    "Unit Price",
    "Total Price",
    "Tax",
  ];

  const tableBody = data.singleSaleInvoice.saleInvoiceProduct.map((item) => [
    item.id,
    item.product.name,
    item.productQuantity,
    `   ${item.productUnitSalePrice}`,
    `   ${item.productUnitSalePrice * item.productQuantity}`,
    `   ${item.taxAmount ? item.taxAmount : 0}`,
  ]);
  const customerInfo = [
    {
      value: `Client Id: ${data?.singleSaleInvoice?.customerId}`,
    },
    {
      value: `Client Name: ${data?.singleSaleInvoice?.customer?.username}`,
    },
    {
      value: `Address: ${
        data?.singleSaleInvoice?.customer?.address
          ? data?.singleSaleInvoice?.customer?.address
          : ""
      }`,
    },
    {
      value: `Contact No: ${data?.singleSaleInvoice?.customer?.phone}`,
    },
  ];
  const TopRightInfo = [
    {
      value: ` Invoice No: ${data?.singleSaleInvoice?.id}`,
    },
    {
      value: `Invoice Date: ${moment(data?.singleSaleInvoice?.date).format(
        "YYYY-MM-DD"
      )}`,
    },
    {
      value: `Currency: ${currencyLocal ? currencyLocal : ""}`,
    },
  ];
  const settings = {
    jsPDF: {
      // orientation: "landscape"
    },
    tableFontSize: 10,
    infoTopFontSize: 10,
    bottomRightFontSize: 10,
    bottomLeftFontSize: 7,
    footerFontSize: 10,
  };

  return invoiceGenerator(null, {
    title,
    TopRightInfo,
    customerInfo,
    companyInfo,
    bottomLeftContent,
    bottomRightContent,
    tableBody,
    tableHead,
    settings,
    leftBottomSecondColumnX: 28,
  });
}
