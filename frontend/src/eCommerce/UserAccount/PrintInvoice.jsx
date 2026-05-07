import invoiceGenerator from "@/utils/invoiceGenerator";
import numberToWords from "@/utils/numberToWords";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { loadSingleSaleForCustomer } from "@/redux/rtk/features/sale/saleSlice";

export default function PrintInvoice({ id }) {
  const dispatch = useDispatch();
  const { currencyName } = useCurrency() || {};
  const companyInfo = useSelector((state) => state?.setting?.data) || null;

  return (
    <div className="flex gap-2">
      <button className="border border-gray-300 px-3 py-1 rounded hover:bg-primary hover:text-white transition-all duration-200 ease-linear"
        onClick={async () => {
          const resp = await dispatch(loadSingleSaleForCustomer(id));
          if (resp.error) return;
          const sale = resp?.payload?.data;
          const { singleSaleInvoice: data } = sale || {};

          const numberInText = numberToWords(Math.round(data?.totalAmount));

          const bottomLeftContent = [
            {
              label: "IN WORDS: ",
              value: `${numberInText.toUpperCase()} ${currencyName}` || "",
            },

            { label: "Notes: ", value: data?.note ? data?.note : "" },
            {
              label: "Terms And Conditions: ",
              value: data?.termsAndConditions ? data?.termsAndConditions : "",
            },
          ];

          const bottomRightContent = [
            {
              label: "Total:",
              value: `${
                data?.totalAmount
                  ? Number(
                      data?.totalAmount + (data?.totalDiscountAmount || 0),
                    ).toFixed(2)
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
                data?.totalTaxAmount
                  ? Number(data.totalTaxAmount).toFixed(2)
                  : 0
              }`,
            },

            {
              label: "Return product value:",
              value: `${
                sale?.totalReturnAmount
                  ? Number(sale.totalReturnAmount).toFixed(2)
                  : 0
              }`,
            },
            {
              label: "Return Amount:",
              value: `${
                sale?.instantPaidReturnAmount
                  ? Number(sale?.instantPaidReturnAmount).toFixed(2)
                  : 0
              }`,
            },
            {
              label: "Paid:",
              value: `${
                sale?.totalPaidAmount
                  ? Number(sale.totalPaidAmount).toFixed(2)
                  : 0
              }`,
            },
            {
              label: "Due:",
              value: `${data?.dueAmount}`,
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
          const tableBody = data?.saleInvoiceProduct?.map((item, index) => [
            index + 1,
            item.product.name,
            item.productQuantity,
            `${item.productUnitSalePrice}`,
            `${item.productDiscount || 0}`,
            `${item.productFinalAmount}`,
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
          invoiceGenerator("print", {
            title: "Sale Invoice",
            TopRightInfo,
            companyInfo,
            customerInfo,
            bottomLeftContent,
            bottomRightContent,
            tableBody,
            tableHead,
            settings,
            leftBottomSecondColumnX: 45,
          });
        }}
      >
        Download Invoice
      </button>
    </div>
  );
}
