import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import { loadAllSaleReport } from "@/redux/rtk/features/sale/saleSlice";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ReportTable from "../CommonUi/ReportTable";
import SaleReportPrint from "../Invoice/Report/SaleReportPrint";
import SaleReportFilter from "./SaleReportFilter";

export default function SaleReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const { list, loading, info } = useSelector((state) => state.sales);
  const [saleInfo, setSaleInfo] = useState({
    salePerson: null,
    customer: null,
  });
  const [pageConfig, setPageConfig] = useState({
    query: "report",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const columns = [
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "id",
      key: "id",
      render: (name, { id }) => <Link to={`/admin/sale/${id}`}>{id}</Link>,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },
    {
      id: 3,
      title: "Customer Name ",
      dataIndex: `customer`,
      key: "customerId",
      render: (customer) => (
        <Link to={`/admin/customer/${customer?.id}`}>{customer?.username}</Link>
      ),
    },

    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (totalAmount) => Number(totalAmount).toFixed(2),
    },
    {
      id: 5,
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
      render: (discount) => Number(discount).toFixed(2),
    },

    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (paidAmount) => Number(paidAmount).toFixed(2),
      responsive: ["md"],
    },
    {
      id: 6,
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      render: (dueAmount) => Number(dueAmount).toFixed(2),
      responsive: ["md"],
    },

    //Update Supplier Name here

    {
      id: 8,
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      render: (profit) => Number(profit).toFixed(2),
      responsive: ["md"],
    },
    {
      id: 9,
      title: "Sale Person",
      dataIndex: "user",
      key: "user",
      render: (user) => (
        <Link to={`/admin/hr/staffs/${user?.id}`}>{user?.username}</Link>
      ),
      responsive: ["md"],
    },
  ];

  const column = [
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      renderCsv: (date) => moment(date).format("ll"),
    },
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "id",
      key: "id",
      renderCsv: (id) => id,
    },

    {
      id: 3,
      title: "Staff ",
      dataIndex: `user`,
      key: "staff",
      renderCsv: (user) => user?.username,
    },
    {
      id: 5,
      title: "Product",
      dataIndex: "saleInvoiceProduct",
      key: "saleInvoiceProduct",
      renderCsv: (saleInvoiceProduct) =>
        saleInvoiceProduct.length > 0
          ? saleInvoiceProduct.map((p) => p?.product?.name)
          : "-",
    },
    {
      id: 4,
      title: "QTY",
      dataIndex: "saleInvoiceProduct",
      key: "totalAmount",
      renderCsv: (saleInvoiceProduct) =>
        saleInvoiceProduct.length > 0
          ? saleInvoiceProduct.map((p) => p?.productQuantity)
          : 0,
    },
    {
      id: 4,
      title: "Total ",
      dataIndex: "totalAmount",
      key: "totalAmount",
      renderCsv: (totalAmount) => Number(totalAmount).toFixed(2),
    },
    {
      id: 5,
      title: "Discount",
      dataIndex: "totalDiscountAmount",
      key: "discount",
      renderCsv: (discount) => Number(discount).toFixed(2),
    },

    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
      renderCsv: (paidAmount) => Number(paidAmount).toFixed(2),
    },
    {
      id: 6,
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      renderCsv: (dueAmount) => Number(dueAmount).toFixed(2),
    },

    {
      id: 8,
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      renderCsv: (profit) => Number(profit).toFixed(2),
    },
  ];

  useEffect(() => {
    dispatch(loadAllSaleReport(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className="mt-3 rounded-lg bg-white dark:bg-[#1C1B20] border border-gray-200 dark:border-gray-700 max-md:border-0 max-md:bg-transparent"
      bodyClass="p-6 max-md:p-4"
      headClass="bg-white dark:bg-[#2A2A2F] text-black dark:text-white border-b border-gray-200 dark:border-gray-700"
      title="Sale Report"
    >
      <SaleReportFilter
        setPageConfig={setPageConfig}
        pageConfig={pageConfig}
        setSaleInfo={setSaleInfo}
      />
      <div className="flex flex-col md:flex-row py-5 items-start justify-between gap-4">
        <div>
          <Button
            onClick={() => setShowTable(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Generate Report
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-2 w-full md:w-auto">
          {!loading && list ? (
            <SaleReportPrint
              data={list}
              info={info}
              saleInfo={saleInfo}
              title={"Sale Report"}
              pageConfig={pageConfig}
              type={"print"}
              btnName="Print"
            />
          ) : (
            <Button
              loading={loading || !list}
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Print
            </Button>
          )}
          {!loading && list ? (
            <SaleReportPrint
              data={list}
              saleInfo={saleInfo}
              title={"Sale Report"}
              info={info}
              pageConfig={pageConfig}
              type={"download"}
              btnName="Export PDF"
            />
          ) : (
            <Button
              loading={loading || !list}
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Export PDF
            </Button>
          )}
          <CSV
            list={list}
            columns={column}
            title={"Sale Report"}
            className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            btnName="Export CSV"
          />
        </div>
      </div>

      {showTable && (
        <div className="overflow-x-auto">
          <ReportTable list={list} columns={columns} loading={loading} />
        </div>
      )}
    </Card>
  );
}
