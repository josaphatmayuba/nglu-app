import Button from "@/UI/Button";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function NewSaleInvoice({ sale, title }) {
  const { singleSaleInvoice: data } = sale || {};
  const { currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();
  const numberInText = numberToWords(Math.round(data.totalAmount));

  const bottomLeftContent = [
    {
      label: "IN WORDS: ",
      value: `${numberInText.toUpperCase()} ${currencyName}` || "",
    },

    { label: "Notes: ", value: data.note ? data.note : "" },
    {
      label: "Terms And Conditions: ",
      value: data.termsAndConditions ? data.termsAndConditions : "",
    },
  ];

  const bottomRightContent = [
    {
      label: "Total:",
      value: `${
        data?.totalAmount
          ? Number(data.totalAmount + (data?.totalDiscountAmount || 0)).toFixed(
              2
            )
          : 0
      }`,
    },
    {
      label: "Discount",
      value: `${
        data?.totalDiscountAmount
          ? Number(data.totalDiscountAmount).toFixed(2)
          : 0
      }`,
    },
    {
      label: "Total Tax:",
      value: `${
        data?.totalTaxAmount ? Number(data.totalTaxAmount).toFixed(2) : 0
      }`,
    },

    {
      label: "Return product value:",
      value: `${
        sale.totalReturnAmount ? Number(sale.totalReturnAmount).toFixed(2) : 0
      }`,
    },
    {
      label: "Return Amount:",
      value: `${
        sale.instantPaidReturnAmount
          ? Number(sale.instantPaidReturnAmount).toFixed(2)
          : 0
      }`,
    },
    {
      label: "Paid:",
      value: `${
        sale.totalPaidAmount ? Number(sale.totalPaidAmount).toFixed(2) : 0
      }`,
    },
    {
      label: "Due:",
      value: `${data.dueAmount}`,
    },
  ];
  const tableHead = [
    "SL",
    "Name",
    "Quantity",
    "Price",
    "Discount",
    "Amount",
    "Tax",
  ];
  const tableBody = data.saleInvoiceProduct.map((item, index) => [
    index,
    item.product.name,
    item.productQuantity,
    `${item.productDiscount || 0}`,
    `${item.productFinalAmount}`,
    `${item.productUnitSalePrice}`,
    `${item.taxAmount}`,
  ]);

  const customerInfo = [
    {
      value: `Client Id: ${data?.customerId}`,
    },
    {
      value: `Client Name: ${data?.customer?.username}`,
    },
    {
      value: `Address: ${
        data?.customer?.address ? data?.customer?.address : ""
      }`,
    },
    {
      value: `Contact No: ${data?.customer?.phone}`,
    },
  ];
  const TopRightInfo = [
    {
      value: ` Invoice No: ${data?.id}`,
    },
    {
      value: `Invoice Date: ${moment(data?.date).format("YYYY-MM-DD")}`,
    },
    {
      value: `currency : ${currencyName}`,
    },
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
  return (
    <div className="flex gap-2">
      <Button
        color="primary"
        onClick={() =>
          invoiceGenerator("print", {
            title,
            TopRightInfo,
            companyInfo,
            customerInfo,
            bottomLeftContent,
            bottomRightContent,
            tableBody,
            tableHead,
            settings,
            leftBottomSecondColumnX: 45,
          })
        }>
        Print
      </Button>
    </div>
  );
}
