import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import ReportTable from "@/components/CommonUi/ReportTable";
import { loadPaymentReport } from "@/redux/rtk/features/manualPayment/manualPaymentSlice";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import PaymentReportPrint from "../Invoice/Report/PaymentReportPrint";
import PaymentReportFilter from "./PaymentReportFilter";

export default function PaymentReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const { list, loading, info } = useSelector((state) => state.manualPayment);
  const [payInfo, setPayInfo] = useState({
    customer: null,
    method: null,
  });
  const [pageConfig, setPageConfig] = useState({
    query: "report",
  });

  const columns = [
    {
      id: 1,
      title: "Invoice No",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
      render: (cartOrderId) => (
        <Link to={`/admin/order/${cartOrderId}`}>{cartOrderId}</Link>
      ),
    },
    {
      id: 2,
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: (customer) => (
        <Link to={`/admin/hr/staffs/${customer.id}`}>{customer.username}</Link>
      ),
    },

    {
      id: 3,
      title: "Account No",
      dataIndex: "customerAccount",
      key: "customerAccount",
      render: (customerAccount) => (customerAccount ? customerAccount : "-"),
    },
    {
      id: 4,
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
    {
      id: 5,
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (paymentMethod) => paymentMethod.methodName,
    },
    {
      id: 6,
      title: "TRX ID",
      dataIndex: "customerTransactionId",
      key: "customerTransactionId",
      render: (customerTransactionId) =>
        customerTransactionId ? customerTransactionId : "-",
    },
    {
      id: 7,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
  ];

  useEffect(() => {
    dispatch(loadPaymentReport(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className='mt-3 rounded-lg bg-white dark:bg-[#1C1B20] border border-gray-200 dark:border-gray-700 max-md:border-0 max-md:bg-transparent'
      bodyClass='p-6 max-md:p-4'
      headClass='bg-white dark:bg-[#2A2A2F] text-black dark:text-white border-b border-gray-200 dark:border-gray-700'
      title='Payment Report'
    >
      <PaymentReportFilter
        setPageConfig={setPageConfig}
        pageConfig={pageConfig}
        setPayInfo={setPayInfo}
      />
      <div className='flex flex-col md:flex-row py-5 items-start justify-between gap-4'>
        <div>
          <Button
            onClick={() => setShowTable(true)}
            className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors'
          >
            Generate Report
          </Button>
        </div>
        <div className='flex flex-col sm:flex-row items-start gap-2 w-full md:w-auto'>
          {!loading && list ? (
            <PaymentReportPrint
              data={list}
              info={info}
              payInfo={payInfo}
              title={"Payment Report"}
              pageConfig={pageConfig}
              type={"print"}
              btnName='Print'
            />
          ) : (
            <Button
              loading={loading || !list}
              className='bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto'
            >
              Print
            </Button>
          )}
          {!loading && list ? (
            <PaymentReportPrint
              data={list}
              payInfo={payInfo}
              title={"Payment Report"}
              info={info}
              pageConfig={pageConfig}
              type={"download"}
              btnName='Export PDF'
            />
          ) : (
            <Button
              loading={loading || !list}
              className='bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto'
            >
              Export PDF
            </Button>
          )}
          <CSV
            className='bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto'
            list={list}
            columns={columns}
            title={"Payment Report"}
            btnName='Export CSV'
          />
        </div>
      </div>

      {showTable && (
        <div className='overflow-x-auto'>
          <ReportTable list={list} columns={columns} loading={loading} />
        </div>
      )}
    </Card>
  );
}
