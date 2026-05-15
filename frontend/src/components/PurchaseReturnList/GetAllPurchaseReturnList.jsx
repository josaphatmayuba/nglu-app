import { DatePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import { loadAllPurchaseReturn } from "../../redux/rtk/features/PurchaseReturnList/PurchaseReturnListSlice";
import ViewBtn from "../Buttons/ViewBtn";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

export default function GetAllPurchaseReturnList() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.purchaseReturn);
  const { RangePicker } = DatePicker;
  const [startDate, setStartDate] = useState(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    moment().endOf("month").format("YYYY-MM-DD")
  );
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <Link to={`/admin/purchase-return-list/${id}`}>{id}</Link>
      ),
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
      renderCsv: (date) => moment(date).format("ll"),
    },
    {
      id: 3,
      title: "Purchase Invoice Id",
      dataIndex: "purchaseInvoiceId",
      key: "purchaseInvoiceId",
    },
    {
      id: 4,
      title: "Notes",
      dataIndex: "note",
      key: "note",
    },

    //Update Supplier Name here

    {
      id: 5,
      title: "Action",
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <div className="flex flex-row">
          <ViewBtn path={`/admin/purchase-return-list/${id}`} />
        </div>
      ),
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(
      loadAllPurchaseReturn({
        status: true,
        page: 1,
        count: 10,
        startDate: startDate,
        endDate: endDate,
      })
    );
  }, [dispatch, endDate, startDate]);

  const onCalendarChange = (dates) => {
    const startDate = dates[0].format("YYYY-MM-DD");
    const endDate = dates[1].format("YYYY-MM-DD");
    setStartDate(startDate);
    setEndDate(endDate);
  };
  return (
    <>
      <PageHeader
        title="Retours d'achat"
        subtitle="Marchandises retournées aux fournisseurs"
        actions={
          <RangePicker
            onCalendarChange={onCalendarChange}
            defaultValue={[
              dayjs(startDate, "YYYY-MM-DD"),
              dayjs(endDate, "YYYY-MM-DD"),
            ]}
            className="range-picker"
            style={{ maxWidth: "400px" }}
          />
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-returnPurchaseInvoice"}>
        <TableComponent
          actionPermission={["readSingle-returnPurchaseInvoice"]}
          list={list}
          total={total}
          columns={columns}
          loading={loading}
          paginatedThunk={loadAllPurchaseReturn}
          csvFileName={"purchase Return list"}
          query={{ startdate: startDate, enddate: endDate }}
          title={"Purchase Return list"}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
}
