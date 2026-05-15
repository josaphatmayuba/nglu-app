import { EditOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  deleteUom,
  editUoM,
  loadAllUomPaginated,
} from "../../redux/rtk/features/uom/uomSlice";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddUoM from "./AddUoM";
import UpdateUoM from "./UpdateUoM";

export default function GetAllUoM() {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.uom);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
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
      dataIndex: "name",
      key: "name",
    },
    {
      id: 3,
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
      renderCsv: (createdAt) => moment(createdAt).format("YYYY-MM-DD"),
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-uom"}>
              <div
                onClick={() => {
                  dispatch(editUoM(item));
                  showModal();
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <EditOutlined className="text-[1rem]" />
                Edit
              </div>
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              values={{ id: item?.id, status: item?.status }}
              permission={"delete-uom"}
              title={item?.status === "true" ? "Hide" : "Show"}
              deleteThunk={deleteUom}
              loadThunk={loadAllUomPaginated}
              query={{ ...pageConfig, status: item?.status }}
            />
          ),
          key: "delete",
        },
      ],

      csvOff: true,
    },
  ];
  useEffect(() => {
    dispatch(loadAllUomPaginated(pageConfig));
  }, [dispatch, pageConfig]);

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
      popupClassName: "w-[200px]",
    },
  ];
  return (
    <>
      <PageHeader
        title="Unités de mesure"
        subtitle="Unités utilisées pour les produits (kg, L, pcs...)"
        actions={
          <CreateDrawer
            permission={"create-uom"}
            title={"Create UoM"}
            width={35}
          >
            <AddUoM />
          </CreateDrawer>
        }
      />
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-uom"}>
          <TableComponent
            actionPermission={["update-uom", "delete-uom", "readSingle-uom"]}
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"UoM List"}
            filters={filters}
          />
        </UserPrivateComponent>
      </Card>
      <Modal
        title="Update UoM"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <UpdateUoM handleCancel={handleCancel} />
      </Modal>
    </>
  );
}
