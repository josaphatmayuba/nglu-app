import CommonDelete from "@/components/CommonUi/CommonDelete";
import ModalUi from "@/UI/ModalUi";
import { EditOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  deleteProductAttribute,
  loadAllProductAttributePaginated,
} from "../../../redux/rtk/features/eCommerce/productAttribute/productAttribute";
import Card from "../../../UI/Card";
import ViewBtn from "../../Buttons/ViewBtn";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddProductAttribute from "./AddProductAttribute";
import UpdateAttribute from "./UpdateAttribute";

export default function GetAllProductAttribute() {
  const dispatch = useDispatch();
  const [edit, setEdit] = useState(false);
  const { list, total, loading } = useSelector(
    (state) => state.productAttribute
  );
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
      render: (id) => <Link to={`/admin/product-attribute/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/product-attribute/${id}`}>{name}</Link>
      ),
      renderCsv: (name) => name,
    },
    {
      id: 3,
      title: "Create Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
      renderCsv: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },

    {
      id: 13,
      title: "",
      key: "action",
      render: (attribute) => [
        {
          label: (
            <ViewBtn
              title={"view"}
              path={`/admin/product-attribute/${attribute.id}`}
            />
          ),
          key: "view",
        },

        {
          label: (
            <div
              onClick={() => {
                setEdit(attribute);
              }}
              className="flex gap-2  items-center cursor-pointer"
            >
              <EditOutlined className="text-[1rem]" />
              Edit
            </div>
          ),
          key: "edit",
        },
        {
          label: (
            <CommonDelete
              values={{
                id: attribute?.id,
                status: attribute?.status,
              }}
              title={attribute?.status === "true" ? "Hide" : "Show"}
              permission={"delete-productCategory"}
              deleteThunk={deleteProductAttribute}
              loadThunk={loadAllProductAttributePaginated}
              query={{ ...pageConfig, status: attribute?.status }}
              className="bg-white text-black"
            />
          ),
          key: "delete",
        },
      ],
      csvOff: true,
    },
  ];
  useEffect(() => {
    dispatch(loadAllProductAttributePaginated(pageConfig));
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
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
        // headClass="border-none"
        title={"Product Attribute "}
        extra={
          <CreateDrawer
            permission={"create-productAttribute"}
            title={"Create Attribute"}
            width={35}
          >
            <AddProductAttribute />
          </CreateDrawer>
        }
      >
        <UserPrivateComponent permission={"readAll-productAttribute"}>
          <TableComponent
            actionPermission={[
              "update-productAttribute",
              "delete-productAttribute",
              "readSingle-productAttribute",
            ]}
            total={total}
            columns={columns}
            list={list}
            loading={loading}
            setPageConfig={setPageConfig}
            title={"Product Attribute List"}
            filters={filters}
          />
        </UserPrivateComponent>
      </Card>
      <Modal
        title="Update Product Attribute"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <UpdateAttribute handleCancel={handleCancel} />
      </Modal>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Edit Product Attribute"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <UpdateAttribute
          modal={true}
          productAttribute={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </>
  );
}
