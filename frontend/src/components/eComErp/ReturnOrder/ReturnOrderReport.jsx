import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import ReportTable from "@/components/CommonUi/ReportTable";
import OrderReturnReportPrint from "@/components/Invoice/Report/OrderReturnReportPrint";
import { loadAllReportCart } from "@/redux/rtk/features/eCommerce/cart/cartSlice";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReturnReportFilter from "./ReturnReportFilter";

export default function ReturnOrderReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const { report, loading, info } = useSelector((state) => state.cartDynamic);
  const [customer, setCustomer] = useState();
  const [pageConfig, setPageConfig] = useState({
    query: "report",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });
  const columns = [
    {
      id: 1,
      title: "Order Id",
      dataIndex: "cartOrderId",
      key: "cartOrderId",
    },

    {
      id: 2,
      title: "Return Type",
      dataIndex: "returnType",
      key: "returnType",
    },
    {
      id: 3,
      title: "Note",
      dataIndex: "note",
      key: "note",
    },

    {
      id: 4,
      title: "Status",
      dataIndex: "returnCartOrderStatus",
      key: "returnCartOrderStatus",
      render: (returnCartOrderStatus) => (
        <span
          className={` rounded px-2 py-[1px] text-ePrimary bg-ePrimary/10 ${
            returnCartOrderStatus == "PENDING" &&
            "text-orange-500 bg-orange-500/10"
          }
                  ${
                    returnCartOrderStatus == "RECEIVED" &&
                    "text-ePrimary bg-ePrimary/10"
                  }
                  ${
                    returnCartOrderStatus == "DELIVERED" &&
                    "text-green-500 bg-green-500/10"
                  }
                  ${
                    returnCartOrderStatus == "CANCELLED" &&
                    "text-red-500 bg-red-500/10"
                  }
                    `}
        >
          {returnCartOrderStatus}
        </span>
      ),
    },
  ];

  useEffect(() => {
    dispatch(loadAllReportCart(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <div className="card card-custom mt-3 ">
      <div className="card-body">
        <Card
          className="max-md:border-0 max-md:bg-white"
          bodyClass="max-md:p-0 "
          // headClass="border-none"
          title={"Order Return Report"}
        >
          <ReturnReportFilter
            setPageConfig={setPageConfig}
            pageConfig={pageConfig}
            setCustomer={setCustomer}
          />
          <div className="flex p-5 items-start ">
            <div>
              <Button
                onClick={() => setShowTable(true)}
                className="px-4 py-2 text-base rounded bg-green-500 text-white"
              >
                Generate Report
              </Button>
            </div>
          </div>
          <div className="flex px-5 items-center gap-2 ">
            {!loading && report ? (
              <OrderReturnReportPrint
                data={report}
                info={info}
                customer={customer}
                title={"Order Return Report"}
                pageConfig={pageConfig}
                type={"print"}
                btnName="Print"
              />
            ) : (
              <div>
                <Button
                  loading={loading || !report}
                  className="bg-primary text-white py-[8px] px-4 rounded"
                >
                  Print
                </Button>
              </div>
            )}
            {!loading && report ? (
              <OrderReturnReportPrint
                data={report}
                customer={customer}
                title={"Order Return Report"}
                info={info}
                pageConfig={pageConfig}
                type={"download"}
                btnName="Export PDF"
              />
            ) : (
              <div>
                <Button
                  loading={loading || !report}
                  className="bg-primary text-white py-[8px] px-4 rounded"
                >
                  Export PDF
                </Button>
              </div>
            )}

            <div>
              <CSV
                className="px-4 py-2  rounded bg-primary text-white "
                list={report}
                columns={columns}
                title={"Return Order Report"}
                btnName={"Export CSV"}
              >
                Export CSV
              </CSV>
            </div>
          </div>
          {showTable && (
            <ReportTable list={report} columns={columns} loading={loading} />
          )}
        </Card>
      </div>
    </div>
  );
}
