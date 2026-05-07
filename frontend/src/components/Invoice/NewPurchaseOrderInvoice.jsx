import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import { decodeHtmlEntity } from "@/utils/functions";
import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import moment from "moment";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export default function NewPurchaseOrderInvoice({ data, title }) {
  const { currencySymbol } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const dispatch = useDispatch();

  const numberInText = numberToWords(
    Math.round(data.totalAmount - data.discount)
  );

  const currencyLocal = decodeHtmlEntity(currencySymbol);

  const bottomLeftContent = [];
  const bottomRightContent = [];

  const tableHead = ["SI", "Product Name", "Quantity"];

  const tableBody = data.productList.map((item, index) => [
    index + 1,
    item.product.name,
    item.reorderProductQuantity,
  ]);

  const customerInfo = [];
  const TopRightInfo = [
    {
      value: `Invoice No: ${data?.reorderInvoiceId}`,
    },
    {
      value: `Invoice Date: ${moment(data?.createdAt).format("YYYY-MM-DD")}`,
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
  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  }, [dispatch, companyInfo]);
  return (
    <div className="">
      <button
        className="bg-primary flex justify-center items-center px-4 py-[9px] text-white rounded"
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
            settings
          })
        }
      >
        Print Invoice
      </button>
    </div>
  );
}
