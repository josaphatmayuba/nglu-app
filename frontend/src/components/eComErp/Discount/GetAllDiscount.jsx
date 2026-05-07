import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import {
  deleteDiscount,
  loadAllDiscountPaginated,
} from "../../../redux/rtk/features/eCommerce/discount/discountSlice";
import CommonDelete from "../../CommonUi/CommonDelete";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddDiscount from "./AddDiscount";
import UpdateDiscount from "./UpdateDiscount";

export default function GetAllDiscount() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.discount);
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
    },
    {
      id: 2,
      title: "Type",
      dataIndex: "type",
      key: "type",
    },

    {
      id: 3,
      title: "Value",
      dataIndex: "value",
      key: "value",
    },
    {
      id: 4,
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (startDate) => moment(startDate).format("ll"),
      renderCSV: (startDate) => moment(startDate).format("ll"),
    },
    {
      id: 5,
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (endDate) => moment(endDate).format("ll"),
      renderCSV: (startDate) => moment(startDate).format("ll"),
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-discount"}>
              <UpdateDiscount data={item} />
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-discount"}
              deleteThunk={deleteDiscount}
              values={{
                id: item?.id,
                status: item?.status,
              }}
              title={item?.status === "true" ? "Hide" : "Show"}
              loadThunk={loadAllDiscountPaginated}
              query={{ ...pageConfig, status: item?.status }}
            />
          ),
          key: "delete",
        },
      ],

      csvOff: true,
    },
  ];
  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Show", value: "true" },
        { label: "Hide", value: "false" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[100px]",
    },
  ];
  useEffect(() => {
    dispatch(loadAllDiscountPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
      // headClass="border-none"
      title={"Discount"}
      extra={
        <CreateDrawer
          permission={"create-discount"}
          title={"Create Discount"}
          width={35}>
          <AddDiscount />
        </CreateDrawer>
      }>
      {" "}
      <UserPrivateComponent permission={"readAll-discount"}>
        <TableComponent
          actionPermission={[
            "update-discount",
            "delete-discount",
            "readSingle-discount",
          ]}
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Discount"}
          filters={filters}
        />
      </UserPrivateComponent>
    </Card>
  );
}
