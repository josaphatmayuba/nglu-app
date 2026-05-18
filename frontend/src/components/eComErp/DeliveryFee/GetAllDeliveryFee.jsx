import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import PageHeader from "../../../UI/PageHeader";
import {
  deleteDeliveryFee,
  loadAllDeliveryFee,
} from "../../../redux/rtk/features/eCommerce/deliveryFee/deliveryFeeSlice";
import CommonDelete from "../../CommonUi/CommonDelete";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddDeliveryFee from "./AddDeliveryFee";
import UpdateDeliveryFee from "./UpdateDeliveryFee";

export default function GetAllDeliveryFee() {
  const dispatch = useDispatch();
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
      title: "Delivery Area",
      dataIndex: "deliveryArea",
      key: "deliveryArea",
    },

    {
      id: 3,
      title: "Delivery Fee",
      dataIndex: "deliveryFee",
      key: "deliveryFee",
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-currency"}>
              <UpdateDeliveryFee item={item} />
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-currency"}
              deleteThunk={deleteDeliveryFee}
              id={item.id}
              title='Hide'
              loadThunk={loadAllDeliveryFee}
            />
          ),
          key: "delete",
        },
      ],

      csvOff: true,
    },
  ];

  const { list, loading } = useSelector((state) => state.deliveryFee);
  useEffect(() => {
    dispatch(loadAllDeliveryFee());
  }, [dispatch]);
  return (
    <>
      <PageHeader
        title="Zones de livraison"
        subtitle="Tarifs de livraison par zone géographique"
        actions={
          <CreateDrawer
            permission={"create-currency"}
            title={"Create Delivery Area"}
            width={35}
          >
            <AddDeliveryFee />
          </CreateDrawer>
        }
      />
    <Card
      className="max-md:border-0 max-md:bg-white"
      bodyClass="max-md:p-0 "
    >
      <UserPrivateComponent permission={"readAll-currency"}>
        <TableComponent
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"delivery fee"}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
}
