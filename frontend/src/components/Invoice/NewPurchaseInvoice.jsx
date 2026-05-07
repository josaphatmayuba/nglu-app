import Button from "@/UI/Button";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function NewPurchaseInvoice({ data, title }) {
  const { currencySymbol, currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();
  const numberInText = numberToWords(
    Math.round(data.totalAmount + (data.totalTax ? data.totalTax : 0))
  );
  const {
    status,
    totalPaidAmount,
    totalReturnAmount,
    instantPaidReturnAmount,
    dueAmount,
    singlePurchaseInvoice,
    returnPurchaseInvoice,
    transactions,
  } = data ? data : {};
  const currencyLocal = decodeHtmlEntity(currencySymbol);

  const bottomLeftContent = [
    {
      label: "IN WORDS: ",
      value: `${numberInText.toUpperCase()} ${currencyName}` || "",
    },
    {
      label: "Terms And Conditions: ",
      value: data.termsAndConditions ? data.termsAndConditions : "",
    },
    { label: "Notes: ", value: data.note ? data.note : "" },
  ];
  const bottomRightContent = [
    {
      label: "Total Amount:",
      value: `${singlePurchaseInvoice.totalAmount.toFixed(2)}`,
    },
    {
      label: "Total Tax:",
      value: `${singlePurchaseInvoice.totalTax.toFixed(2)}`,
    },
    data.totalReturnAmount && {
      label: "Return Product Value:",
      value: `${
        data.totalReturnAmount ? data.totalReturnAmount.toFixed(2) : 0
      }`,
    },
    data.instantPaidReturnAmount && {
      label: "Return Value:",
      value: `${
        data.instantPaidReturnAmount
          ? data.instantPaidReturnAmount.toFixed(2)
          : 0
      }`,
    },
    {
      label: "Total Paid Amount:",
      value: `${totalPaidAmount.toFixed(2)}`,
    },
    {
      label: "Due Amount:",
      value: `${dueAmount.toFixed(2)}`,
    },
  ];

  const tableHead = ["SI", "Name", "Quantity", "Price", "Amount", "Tax"];

  const tableBody = singlePurchaseInvoice?.purchaseInvoiceProduct?.map(
    (item) => [
      item.id,
      item.product.name,
      item.productQuantity,
      `${item.productUnitPurchasePrice}`,
      `${item.productFinalAmount}`,
      `${item.tax}`,
    ]
  );
  const customerInfo = [
    {
      value: `Supplier Id: ${singlePurchaseInvoice?.supplierId}`,
    },
    {
      value: `Supplier Name: ${singlePurchaseInvoice?.supplier?.name}`,
    },
    {
      value: `Address: ${singlePurchaseInvoice?.supplier?.address}`,
    },
    {
      value: `Contact No: ${singlePurchaseInvoice?.supplier?.phone}`,
    },
  ];
  const TopRightInfo = [
    {
      value: `Invoice No: ${singlePurchaseInvoice?.id}`,
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
  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);

  return (
    <div className="">
      <Button
        color="primary"
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
            leftBottomSecondColumnX: 32,
          })
        }>
        Print
      </Button>
    </div>
  );
}
