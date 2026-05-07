import Button from "@/UI/Button";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";

export default function OrderReturnReportPrint({
  data,
  title,
  info,
  type,
  customer,
  pageConfig,
  btnName,
}) {
  const { currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();

  //   const numberInText = numberToWords(
  //     Math.round(data?.totalAmount - data?.discount)
  //   );
  // const currencyLocal = decodeHtmlEntity(currencySymbol);
  const currencyLocal = currencyName;

  const bottomLeftContent = [];

  const bottomRightContent = [
    {
      label: `Total Quantity: `,
      value: `${info.totalUnitQuantity ? info.totalUnitQuantity : 0}`,
    },
    {
      label: `Total Coupon: `,
      value: `  ${info.totalReturnCouponAmount ? info.totalReturnCouponAmount : 0
        }`,
    },
    {
      label: `Total Vat: `,
      value: `  ${info.totalReturnVatAmount ? info.totalReturnVatAmount : 0
        }`,
    },
    {
      label: `Total Discount: `,
      value: `  ${info.totalReturnDiscountAmount ? info.totalReturnDiscountAmount : 0
        }`,
    },
    {
      label: `Total Paid: `,
      value: `  ${info.totalReturnPaidAmount ? info.totalReturnPaidAmount : 0
        }`,
    },
    {
      label: `Total: `,
      value: `  ${info.totalAmount ? info.totalAmount : 0}`,
    },
  ];
  const tableHead = [
    "SL",
    "Date",
    "Order Id",
    "Return Type",
    "Note",
    "Status",
    "Vat",
    "Total",
  ];
  const tableBody = data.map((item, index) => [
    index + 1,
    moment(item.date).format("DD-MM-YYYY"),
    item.cartOrderId,
    item.returnType,
    item.note,
    item.returnCartOrderStatus,
    `  ${item.totalVatAmount ? item.totalVatAmount : 0}`,
    `  ${item.totalAmount ? item.totalAmount : 0}`,
  ]);

  const customerInfo = [
    { value: `Customer:${customer ? `${customer}` : " All"}` },
    {
      value: `Return Type: ${pageConfig.returnType ? pageConfig.returnType : "All"
        }`,
    },
    {
      value: `Return Status: ${pageConfig.returnCartOrderStatus
          ? pageConfig.returnCartOrderStatus
          : "All"
        }`,
    },
  ];

  const TopRightInfo = [
    {
      value: `From: ${moment(pageConfig.startDate).format("DD-MM-YYYY")}`,
    },
    {
      value: `To: ${moment(pageConfig.endDate).format("DD-MM-YYYY")}`,
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
