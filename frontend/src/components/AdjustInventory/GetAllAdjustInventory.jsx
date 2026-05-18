import { DatePicker, Tooltip } from "antd";
import dayjs from "dayjs";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import { loadAllAdjustInventory } from "../../redux/rtk/features/adjustInventory/adjustInventorySlice";
import ViewBtn from "../Buttons/ViewBtn";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddAdjustInventory from "./AddAdjustInventory";

const GetAllAdjustInventory = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector(
    (state) => state.adjustInventory
  );
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
    startDate: moment().startOf("month").format("YYYY-MM-DD"),
    endDate: moment().endOf("month").format("YYYY-MM-DD"),
  });

  const { RangePicker } = DatePicker;

  const columns = [
    {
      id: 1,
      title: "ID",
      key: "id",
      render: ({ id }) => (
        <Link to={`/admin/adjust-inventory/${id}`}>{id}</Link>
      ),
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: <Tooltip title='Total Increment Quantity'>{"Total I.Q."}</Tooltip>,
      dataIndex: "totalIncrementQuantity",
      key: "totalIncrementQuantity",
      render: (totalIncrementQuantity) => totalIncrementQuantity?.toFixed(2),
      renderCsv: (totalIncrementQuantity) => totalIncrementQuantity?.toFixed(2),
    },
    {
      id: 3,
      title: <Tooltip title='Total Increment Price'>{"Total I.P."}</Tooltip>,
      dataIndex: "totalIncrementPrice",
      key: "totalIncrementPrice",
      render: (totalIncrementPrice) => totalIncrementPrice?.toFixed(2),
      renderCsv: (totalIncrementPrice) => totalIncrementPrice?.toFixed(2),
    },
    {
      id: 4,
      title: <Tooltip title='Total Decrement Quantity'>{"Total D.Q."}</Tooltip>,
      dataIndex: "totalDecrementQuantity",
      key: "totalDecrementQuantity",
      render: (totalDecrementQuantity) => totalDecrementQuantity?.toFixed(2),
      renderCsv: (totalDecrementQuantity) => totalDecrementQuantity?.toFixed(2),
    },
    {
      id: 5,
      title: <Tooltip title='Total Decrement Price'>{"Total D.P."}</Tooltip>,
      dataIndex: "totalDecrementPrice",
      key: "totalDecrementPrice",
      render: (totalDecrementPrice) => totalDecrementPrice?.toFixed(2),
      renderCsv: (totalDecrementPrice) => totalDecrementPrice?.toFixed(2),
    },
    {
      id: 6,
      title: <Tooltip title='Total Adjust Price'>{"Total A.P."}</Tooltip>,
      dataIndex: "totalAdjustPrice",
      key: "totalAdjustPrice",
      render: (totalAdjustPrice) => totalAdjustPrice?.toFixed(2),
      renderCsv: (totalAdjustPrice) => totalAdjustPrice?.toFixed(2),
    },
    {
      id: 7,
      title: "Note",
      dataIndex: `note`,
      key: "note",
    },
    {
      id: 8,
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => moment(date).format("ll"),
      renderCsv: (date) => moment(date).format("ll"),
    },

    {
      id: 9,
      title: "Action",
      dataIndex: "id",
      key: "id",
      render: (id) => (
        <div className='flex flex-row'>
          <ViewBtn path={`/admin/adjust-inventory/${id}`} />
        </div>
      ),
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllAdjustInventory(pageConfig));
  }, [dispatch, pageConfig]);

  const onCalendarChange = (dates) => {
    const startDate = dates[0].format("YYYY-MM-DD");
    const endDate = dates[1].format("YYYY-MM-DD");

    setPageConfig({
      ...pageConfig,
      startDate,
      endDate,
    });
  };

  return (
    <>
      <PageHeader
        title="Ajustement de stock"
        subtitle="Inventaires et corrections de quantités"
        actions={
          <>
            <RangePicker
              onCalendarChange={onCalendarChange}
              defaultValue={[
                dayjs(pageConfig.startDate, "YYYY-MM-DD"),
                dayjs(pageConfig.endDate, "YYYY-MM-DD"),
              ]}
              className="range-picker"
              style={{ maxWidth: "400px" }}
            />
            <CreateDrawer
              permission={"create-adjust"}
              title={"Create Adjust Inventory"}
              width={80}
            >
              <AddAdjustInventory />
            </CreateDrawer>
          </>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-adjust"}>
        <TableComponent
          list={list}
          total={total}
          columns={columns}
          loading={loading}
          setPageConfig={setPageConfig}
          query={{
            startDate: pageConfig.startDate,
            endDate: pageConfig.endDate,
          }}
          title={"Adjust Inventory List"}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
};

export default GetAllAdjustInventory;
