import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import { loadAllPurchaseReport } from "@/redux/rtk/features/purchase/purchaseSlice";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ReportTable from "../CommonUi/ReportTable";
import PurchaseReportPrint from "../Invoice/Report/PurchaseReportPrint";
import PurchaseReportFilter from "./PurchaseReportFilter";

export default function PurchaseReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const [supplier, setSupplier] = useState(null);

  const { list, loading, information } = useSelector(
    (state) => state.purchases
  );
  const [pageConfig, setPageConfig] = useState({
    query: "report",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const columns = [
    {
      id: 1,
      title: "ID",
      key: "id",
      render: ({ id }) => <Link to={`/admin/purchase/${id}`}>{id}</Link>,
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
      title: "Supplier Name ",
      dataIndex: `supplier`,
      key: "supplierId",
      render: (supplier) => (
        <Link to={`/admin/supplier/${supplier?.id}`}>{supplier?.name}</Link>
      ),
    },
    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
    },
    {
      id: 5,
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
    },

    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
    },
    {
      id: 6,
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
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
      title: "ID",
      dataIndex: "id",
      key: "id",
      renderCsv: (id) => id,
    },

    {
      id: 3,
      title: "Supplier Name ",
      dataIndex: `supplier`,
      key: "supplierId",
      renderCsv: (supplier) => supplier?.name,
    },
    {
      id: 3,
      title: "Product",
      dataIndex: `purchaseInvoiceProduct`,
      key: "purchaseInvoiceProduct",
      renderCsv: (purchaseInvoiceProduct) =>
        purchaseInvoiceProduct.map((p) => p.product.name),
    },
    {
      id: 4,
      title: "Total Amount",
      dataIndex: "totalAmount",
      key: "totalAmount",
    },
    {
      id: 5,
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
    },

    {
      id: 7,
      title: "Paid Amount",
      dataIndex: "paidAmount",
      key: "paidAmount",
    },
    {
      id: 6,
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
    },
  ];
  useEffect(() => {
    dispatch(loadAllPurchaseReport(pageConfig));
  }, [dispatch, pageConfig]);
  return (
    <Card
      className="mt-3 rounded-lg bg-white dark:bg-[#1C1B20] border border-gray-200 dark:border-gray-700 max-md:border-0 max-md:bg-transparent"
      bodyClass="p-6 max-md:p-4"
      headClass="bg-white dark:bg-[#2A2A2F] text-black dark:text-white border-b border-gray-200 dark:border-gray-700"
      title="Purchase Report"
    >
      <PurchaseReportFilter
        setSupplier={setSupplier}
        setPageConfig={setPageConfig}
        pageConfig={pageConfig}
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
            <PurchaseReportPrint
              data={list}
              title={"Purchase Report"}
              pageConfig={pageConfig}
              type={"print"}
              btnName="Print"
              info={information}
              supplier={supplier}
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
            <PurchaseReportPrint
              data={list}
              title={"Purchase Report"}
              pageConfig={pageConfig}
              info={information}
              type={"download"}
              btnName="Export PDF"
              setSupplier={setSupplier}
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
            title={"Purchase Report"}
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
