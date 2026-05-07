import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function NewSalePackingInvoice({ data, title }) {
  const { currencySymbol } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();

  const numberInText = numberToWords(
    Math.round(data.totalAmount - data.discount)
  );

  const currencyLocal = decodeHtmlEntity(currencySymbol);

  const bottomLeftContent = [];

  const bottomRightContent = [];
  const tableHead = ["SI", "Product Description", "Quantity"];
  const tableBody = data.saleInvoiceProduct.map((item) => [
    item.id,
    item.product.name,
    item.productQuantity,
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
  ];
  const settings = {
    jsPDF: {
      // orientation: "landscape"
    },
    tableFontSize: 10,
    infoTopFontSize: 10,
    bottomRightFontSize: 12,
    bottomLeftFontSize: 8,
    footerFontSize: 10,
  };
  return (
    <div
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
        })
      }
    >
      Print Packing Slip
    </div>
  );
}
