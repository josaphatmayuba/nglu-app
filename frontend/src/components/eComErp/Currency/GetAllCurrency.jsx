import { EditOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import PageHeader from "../../../UI/PageHeader";
import {
  deleteCurrency,
  editCurrency,
  loadAllCurrencyPaginated,
} from "../../../redux/rtk/features/eCommerce/currency/currencySlice";
import CommonDelete from "../../CommonUi/CommonDelete";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import AddCurrency from "./AddCurrency";
import UpdateCurrency from "./UpdateCurrency";

export default function GetAllCurrency() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.currency);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "currencyName",
      key: "currencyName",
    },

    {
      id: 3,
      title: "Symbol",
      dataIndex: "currencySymbol",
      key: "currencySymbol",
      render: (symbol) => (
        <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(symbol) }}></span>
      ),

      csvOff: true,
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-currency"}>
              <div
                onClick={() => {
                  dispatch(editCurrency(item));
                  showModal();
                }}
                className="flex items-center gap-2 cursor-pointer">
                <EditOutlined className="bg-gray-600 p-1 text-white rounded-md" />
                Edit
              </div>
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              permission={"delete-currency"}
              deleteThunk={deleteCurrency}
              values={{
                id: item?.id,
                status: item?.status,
              }}
              title={item?.status === "true" ? "Hide" : "Show"}
              loadThunk={loadAllCurrencyPaginated}
              query={{ ...pageConfig, status: item?.status }}
            />
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
    dispatch(loadAllCurrencyPaginated(pageConfig));
  }, [dispatch, pageConfig]);
  return (
    <>
      <PageHeader
        title="Devises"
        subtitle="Monnaies acceptées et taux de change"
        actions={
          <CreateDrawer
            permission={"create-currency"}
            title={"Create Currency"}
            width={35}>
            <AddCurrency />
          </CreateDrawer>
        }
      />
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-currency"}>
          <TableComponent
            actionPermission={[
              "update-currency",
              "delete-currency",
              "readSingle-currency",
            ]}
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Currency list"}
            filters={filters}
            isSearch
          />
        </UserPrivateComponent>
      </Card>
      <Modal
        title="Update Currency"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}>
        <UpdateCurrency handleCancel={handleCancel} />
      </Modal>
    </>
  );
}
