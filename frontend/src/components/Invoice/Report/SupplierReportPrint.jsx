import Button from "@/UI/Button";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function SupplierReportPrint({
  data,
  info,
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

  const bottomLeftContent = [];

  const bottomRightContent = [
    {
      label: "Total",
      value: `  ${info?.grandTotalAmount ? info.grandTotalAmount : 0
        }`,
    },
    {
      label: "Due",
      value: `  ${info?.grandDueAmount ? info.grandDueAmount : 0
        }`,
    },
    {
      label: "Paid",
      value: `  ${info?.grandTotalPaidAmount ? info.grandTotalPaidAmount : 0
        }`,
    },
    {
      label: "Return",
      value: `  ${info?.grandTotalReturnAmount ? info.grandTotalReturnAmount : 0
        }`,
    },
    {
      label: "Instant Paid Return ",
      value: `  ${info?.grandInstantPaidReturnAmount
          ? info.grandInstantPaidReturnAmount
          : 0
        }`,
    },
  ];
  const tableHead = [
    "Date",
    "Id",
    "Name",
    "Phone",
    "Address",
    "Total Amount",
    "Total Paid",
    "Total Due",
  ];
  const tableBody = data.map((item) => [
    moment(item.createdAt).format("YYYY-MM-DD"),
    item.id,
    item.name,
    item.phone,
    item.address,

    `  ${item?.totalAmount ? item.totalAmount : 0}`,
    `  ${item?.totalPaidAmount ? item.totalPaidAmount : 0}`,
    `  ${item?.totalDueAmount ? item.totalDueAmount : 0}`,
  ]);

  const customerInfo = [];
  const TopRightInfo = [
    {
      value: `Report Date: ${moment().format("YYYY-MM-DD")}`,
      style: {
        bold: true,
        fontSize: 12,
      },
    },
    {
      value: `Currency: ${currencyName ? currencyName : ""}`,
    }
  ];
  const settings = {
    jsPDF: {
      // orientation: "landscape"
    },
    tableFontSize: 10,
    infoTopFontSize: 8,
    bottomRightFontSize: 12,
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
