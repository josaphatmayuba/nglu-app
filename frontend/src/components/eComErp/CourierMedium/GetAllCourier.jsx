import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../../UI/Card";
import PageHeader from "../../../UI/PageHeader";
import { loadAllCourierMediumPaginated } from "../../../redux/rtk/features/eCommerce/courierMedium/courierMediumSlice";
import ViewBtn from "../../Buttons/ViewBtn";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddCourier from "./AddCourier";
import UpdateCourier from "./UpdateCourier";

export default function GetAllCourier() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.courierMedium);
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
      render: (id) => <Link to={`/admin/courier-medium/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Courier Medium Name",
      dataIndex: "courierMediumName",
      key: "courierMediumName",
      render: (courierMediumName, { id }) => (
        <Link to={`/admin/courier-medium/${id}`}>{courierMediumName}</Link>
      ),
      renderCsv: (courierMediumName) => courierMediumName,
    },

    {
      id: 3,
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      id: 4,
      title: "Address",
      dataIndex: "address",
      key: "address",
    },
    {
      id: 5,
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      id: 6,
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      id: 7,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <ViewBtn title='View' path={`/admin/courier-medium/${item.id}`} />
          ),
          key: "view",
        },
        {
          label: (
            <UserPrivateComponent permission={"update-courier"}>
              <UpdateCourier data={item} />
            </UserPrivateComponent>
          ),
          key: "edit",
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
    dispatch(loadAllCourierMediumPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <>
      <PageHeader
        title="Modes de livraison"
        subtitle="Transporteurs et services de coursier"
        actions={
          <CreateDrawer
            permission={"create-courier"}
            title={"Create Delivery Medium"}
            width={35}
          >
            <AddCourier />
          </CreateDrawer>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-courier"}>
        <TableComponent
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Delivery Medium list"}
          filters={filters}
          isSearch
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
}
