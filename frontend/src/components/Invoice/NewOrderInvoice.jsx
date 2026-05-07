import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import useCurrency from "@/utils/useCurrency";
import "jspdf-autotable";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import invoiceGenerator from "@/utils/invoiceGenerator";
import moment from "moment";
import numberToWords from "@/utils/numberToWords";
import { decodeHtmlEntity } from "@/utils/functions";

export default function NewOrderInvoice({ data, vatAmount, title }) {
	const { currencySymbol, currencyName } = useCurrency() || {};
	const companyInfo = useSelector((state) => state?.setting?.data) || null;
	const dispatch = useDispatch();
	const numberInText = numberToWords(
		Math.round((data.totalAmount || 0) - (data.discount || 0))
	);

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
			label: "Total:",
			value: `${currencyLocal} ${data.totalAmount - vatAmount}`,
		},
		{ label: "Sub Total:", value: `${currencyLocal} ${data.totalAmount}` },
		{
			label: "Discount: (-)",
			value: `${currencyLocal} ${data.discount ? data.discount : 0}`,
		},
		{
			label: "Grand total:",
			value: `${currencyLocal} ${
				data.totalAmount - (data.discount ? data.discount : 0)
			}`,
		},
		{
			label: "Paid:",
			value: `${currencyLocal} ${data.paidAmount}`,
		},
		{
			label: "Due:",
			value: `${currencyLocal} ${data.due}`,
		},
	];
	const tableHead = [
		"SI",
		"Product Description",
		"Quantity",
		"Unit Price",
		"Total Price",
	];
	const tableBody = data.cartOrderProduct.map((item) => [
		item.id,
		item.product.name,
		item.productQuantity,
		`${currencyLocal} ${item.productSalePrice}`,
		`${currencyLocal} ${item.productSalePrice * item.productQuantity}`,
	]);

	const customerInfo = [
    {
      value: `Client Id: ${data?.customerId ? data?.customerId : "-"}`,
    },
    {
      value: `Client Name: ${
        data?.customer?.username ? data?.customer?.username : ""
      }`,
    },
    {
      value: `Address: ${
        data?.customer?.address ? data?.customer?.address : "-"
      }`,
    },
    {
      value: `Contact No: ${
        data?.customer?.phone ? data?.customer?.phone : "-"
      }`,
    },
  ];
	const TopRightInfo = [
		{
			value: `Invoice No: ${data?.id ? data?.id : "-"}`,
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
	useEffect(() => {
		!companyInfo && dispatch(getSetting());
	}, [dispatch, companyInfo]);

	return (
		<div className='flex gap-2'>
			<button
				className='bg-primary flex justify-center items-center px-4 py-2 text-white rounded'
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
				Print Invoice
			</button>
		</div>
	);
}
