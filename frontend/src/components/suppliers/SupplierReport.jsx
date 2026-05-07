import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import { loadSupplierReport } from "@/redux/rtk/features/supplier/supplierSlice";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ReportTable from "../CommonUi/ReportTable";
import SupplierReportPrint from "../Invoice/Report/SupplierReportPrint";

export default function SupplierReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const { list, loading, info } = useSelector((state) => state.suppliers);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/supplier/${id}`}>{id}</Link>,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/supplier/${id}`}>{name}</Link>
      ),
    },
    {
      id: 3,
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      id: 4,
      title: "Address",
      dataIndex: "address",
      key: "address",
      responsive: ["md"],
    },
  ];
  const column = [
    {
      id: 1,
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      renderCSV: (createdAt) => moment(createdAt).format("DD-MM-YYYY"),
    },
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/supplier/${id}`}>{name}</Link>
      ),
    },
    {
      id: 3,
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      id: 4,
      title: "Address",
      dataIndex: "address",
      key: "address",
      responsive: ["md"],
    },
    {
      id: 4,
      title: "Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      responsive: ["md"],
    },
    {
      id: 4,
      title: "Paid",
      dataIndex: "totalPaidAmount",
      key: "totalPaidAmount",
      responsive: ["md"],
    },
    {
      id: 4,
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      responsive: ["md"],
    },
    {
      id: 4,
      title: "Return",
      dataIndex: "totalReturnAmount",
      key: "totalReturnAmount",
      responsive: ["md"],
    },
  ];
  useEffect(() => {
    dispatch(loadSupplierReport());
  }, [dispatch]);

  return (
    <Card
      className="mt-3 rounded-lg bg-white dark:bg-[#1C1B20] border border-gray-200 dark:border-gray-700 max-md:border-0 max-md:bg-transparent"
      bodyClass="p-6 max-md:p-4"
      headClass="bg-white dark:bg-[#2A2A2F] text-black dark:text-white border-b border-gray-200 dark:border-gray-700"
      title="Supplier Report"
    >
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
            <SupplierReportPrint
              data={list}
              info={info}
              title={"Supplier Report"}
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
            <SupplierReportPrint
              data={list}
              info={info}
              title={"Supplier Report"}
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
            title={"Supplier Report"}
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
