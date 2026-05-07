import Button from "@/UI/Button";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function SaleReportPrint({
  data,
  info,
  saleInfo,
  pageConfig,
  title,
  type,
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
      label: "Total Unit Quantity",
      value: `${info?.totalUnitQuantity ? info.totalUnitQuantity : 0}`,
    },
    {
      label: "Total  Amount",
      value: `  ${info?.totalAmount ? info.totalAmount : 0}`,
    },
    {
      label: "Total Due",
      value: `  ${info?.dueAmount ? info.dueAmount : 0}`,
    },
    {
      label: "Total Paid",
      value: `  ${info?.paidAmount ? info.paidAmount : 0}`,
    },
    {
      label: "Total Return",
      value: `  ${info?.totalReturnAmount ? info.totalReturnAmount : 0
        }`,
    },
    {
      label: "Total Instant Paid Return",
      value: `  ${info?.instantPaidReturnAmount ? info.instantPaidReturnAmount : 0
        }`,
    },
    {
      label: "Total Profit",
      value: `  ${info?.profit ? info.profit : 0}`,
    },
  ];
  const tableHead = [
    "Date",
    "Invoice",
    "Staff",
    "Product ",
    "QTY",
    "Total",
    "Discount",
    "Vat",
    "Grand Total",
    "Paid",
    "Due",
    "Return",
  ];
  const tableBody = data.map((item) => [
    moment(item.date).format("YYYY-MM-DD"),
    item?.id,
    item?.user?.username,
    item.saleInvoiceProduct.map((product) => product?.product?.name ? product?.product?.name : "").join(",\n"),
    item?.saleInvoiceProduct
      .map((product) => product?.productQuantity)
      .join("\n"),
    `  ${item.totalAmount ? item.totalAmount : 0}`,
    `  ${item.totalDiscountAmount ? item.totalDiscountAmount : 0
    }`,
    `  ${item.totalTaxAmount ? item.totalTaxAmount : 0}`,
    `  ${item.totalAmount
      ? item.totalAmount + item.totalTaxAmount - item.totalDiscountAmount
      : 0
    }`,
    `  ${item.paidAmount ? item.paidAmount : 0}`,
    `  ${item.dueAmount ? item.dueAmount : 0}`,
    `  ${item.returnAmount ? item.returnAmount : 0}`,
  ]);

  const customerInfo = [
    {
      value: `Customer: ${saleInfo?.customer ? saleInfo?.customer : "All"}`,
    },
    {
      value: `Sale Person: ${saleInfo?.salePerson ? saleInfo?.salePerson : "All"
        }`,
    },
  ];
  const TopRightInfo = [
    {
      value: `From Date: ${moment(pageConfig?.startDate).format("YYYY-MM-DD")}`,
    },
    {
      value: `To Date: ${moment(pageConfig?.endDate).format("YYYY-MM-DD")}`,
    },
    {
      value: `Currency: ${currencyLocal ? currencyLocal : ""}`,
    }
  ];
  const settings = {
    jsPDF: {
      orientation: "landscape",
    },
    tableFontSize: 8,
    infoTopFontSize: 8,
    bottomRightFontSize: 10,
    bottomLeftFontSize: 8,
    footerFontSize: 10,
  };
  return (
    <div className="flex gap-2">
      <Button
        className="bg-primary flex  justify-center items-center px-4 py-2 text-white rounded"
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
