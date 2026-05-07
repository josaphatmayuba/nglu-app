import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function NewAdjustInventoryInvoice({ data, title }) {
  const { currencySymbol, currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();
  const currencyLocal = decodeHtmlEntity(currencySymbol);
  const TopRightInfo = [
    {
      value: ` Invoice No: ${data?.id}`,
    },
    {
      value: `Invoice Date: ${moment(data?.date).format("YYYY-MM-DD")}`,
    },
  ];
  const numberInText = numberToWords(Math.round(data?.totalAdjustPrice));

  const bottomLeftContent = [
    {
      label: "IN WORDS: ",
      value: `${numberInText.toUpperCase()} ${currencyName}` || "",
    },
    {
      label: "Terms And Conditions: ",
      value: data?.termsAndConditions ? data.termsAndConditions : "",
    },
    { label: "Notes: ", value: data?.note ? data?.note : "" },
  ];

  const bottomRightContent = [
    {
      label: "Total Adjust Price",
      value: `${currencyLocal}${
        data?.totalAdjustPrice ? data.totalAdjustPrice : 0
      }`,
    },
  ];

  data?.totalIncrementQuantity &&
    bottomRightContent.push({
      label: "Total Increment Quantity",
      value: `${
        data?.totalIncrementQuantity ? data.totalIncrementQuantity : 0
      }`,
    });
  data?.totalIncrementPrice &&
    bottomRightContent.push({
      label: "Total Increment Price",
      value: `${currencyLocal}${
        data?.totalIncrementPrice ? data.totalIncrementPrice : 0
      }`,
    });

  data?.totalDecrementQuantity &&
    bottomRightContent.push({
      label: "Total Decrement Quantity",
      value: `${
        data?.totalDecrementQuantity ? data.totalDecrementQuantity : 0
      }`,
    });

  data?.totalDecrementPrice &&
    bottomRightContent.push({
      label: "Total Decrement Price ",
      value: `-${currencyLocal}${
        data?.totalDecrementPrice ? data.totalDecrementPrice : 0
      }`,
    });

  const tableHead = [
    "SI",
    "Product",
    "Price",
    "Increment QTY",
    "Decrement QTY",
    "Total ",
  ];

  const tableBody = data.adjustInvoiceProduct.map((item) => [
    item.id,
    item.product.name,
    `${currencyLocal}${item.product.productPurchasePrice}`,
    `${item.adjustType === "increment" ? item.adjustQuantity : "-"}`,
    `${item.adjustType === "decrement" ? item.adjustQuantity : "-"}`,
    `${item.adjustType === "increment" ? "+" : "-"}${currencyLocal}${
      item.adjustQuantity * item.product?.productPurchasePrice || 0
    }`,
  ]);

  const customerInfo = [
    {
      value: ` Adjusted By: ${data.user?.username}`,
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
  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);
  return (
    <div className=''>
      <button
        className='bg-primary flex justify-center items-center px-4 py-[9px] text-white rounded'
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
            leftBottomSecondColumnX: 32,
          })
        }
      >
        Print Slip
      </button>
    </div>
  );
}
