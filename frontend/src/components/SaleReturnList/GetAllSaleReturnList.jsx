import { DatePicker } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import { loadAllSaleReturn } from "../../redux/rtk/features/SaleReturnList/SaleReturnListSlice";
import { stringShorter } from "../../utils/functions";
import ViewBtn from "../Buttons/ViewBtn";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

export default function GetAllSaleReturnList() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.saleReturn);
  const { RangePicker } = DatePicker;
  const [startDate, setStartDate] = useState(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    moment().endOf("month").format("YYYY-MM-DD")
  );
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/sale-return-list/${id}`}>{id}</Link>,
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
      title: "Sale Invoice Id",
      dataIndex: "saleInvoiceId",
      key: "saleInvoiceId",
    },
    {
      id: 4,
      title: "Notes",
      dataIndex: "note",
      key: "note",
      render: (note) => stringShorter(note, 20),
    },

    //Update Supplier Name here

    {
      id: 5,
      title: "Action",
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <div className='flex flex-row'>
          <ViewBtn path={`/admin/sale-return-list/${id}`} />
        </div>
      ),
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(
      loadAllSaleReturn({
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
    <Card
      className='max-md:border-0 max-md:bg-white'
      bodyClass='max-md:p-0 '
      headClass='border-none'
      title={"Sale Return "}
      extra={
        <RangePicker
          onCalendarChange={onCalendarChange}
          defaultValue={[
            dayjs(startDate, "YYYY-MM-DD"),
            dayjs(endDate, "YYYY-MM-DD"),
          ]}
          className='range-picker'
          style={{ maxWidth: "400px" }}
        />
      }
    >
      <UserPrivateComponent permission={"readAll-returnSaleInvoice"}>
        <TableComponent
          list={list}
          total={total}
          columns={columns}
          loading={loading}
          setPageConfig={setPageConfig}
          query={{ startdate: startDate, enddate: endDate }}
          title={"Sale Return List"}
        />
      </UserPrivateComponent>
    </Card>
  );
}
