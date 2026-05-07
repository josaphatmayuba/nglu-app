import Button from "@/UI/Button";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function PaymentReportPrint({
  data,
  title,
  type,
  info,
  payInfo,
  btnName,
}) {
  const { currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();
  const numberInText = numberToWords(
    Math.round(data?.totalAmount - data?.discount)
  );
  // const currencyLocal = decodeHtmlEntity(currencySymbol);
  const currencyLocal = currencyName;

  const bottomLeftContent = [];

  const bottomRightContent = [
    {
      label: "Total",
      value: `   ${info.totalAmount ? info.totalAmount : 0}`,
    },
  ];
  const tableHead = [
    "SL",
    "Date",
    "Invoice No",
    "Customer",
    "Account No",
    "Method",
    "TRX Id",
    "Amount",
  ];
  const tableBody = data.map((item, index) => [
    index + 1,
    moment(item.createdAt).format("DD-MM-YYYY"),
    item.cartOrderId,
    item.customer.username,
    item.customerAccount,
    item.paymentMethod.methodName,
    item.customerTransactionId,
    `  ${item.amount ? item.amount : 0}`,
  ]);

  const customerInfo = [
    {
      value: `Customer: ${payInfo.customer ? payInfo.customer : "All"}`,
    },
    {
      value: `Payment Method: ${payInfo.method ? payInfo.method : "All"}`,
    },
  ];
  const TopRightInfo = [
    {
      value: `Report Date: ${moment().format("YYYY-MM-DD")}`,
    },
    {
      value: `Currency: ${currencyLocal ? currencyLocal : ""}`,
    }
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
    <div className="flex gap-2">
      <Button
        className="bg-primary flex justify-center items-center px-4 py-2 text-white rounded"
        onClick={() =>
          invoiceGenerator(type, {
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
        {btnName}
      </Button>
    </div>
  );
}
