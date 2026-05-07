import { EditOutlined } from "@ant-design/icons";
import { Card, Modal } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  deleteProductAttribute,
  loadAllProductAttributePaginated,
  loadSingleProductAttribute,
} from "../../../redux/rtk/features/eCommerce/productAttribute/productAttribute";
import {
  deleteProductAttributeValue,
  editProductAttributeValue,
} from "../../../redux/rtk/features/eCommerce/productAttributeValue/productAttributeValueSlice";
import CommonDelete from "../../CommonUi/CommonDelete";
import CreateDrawer from "../../CommonUi/CreateDrawer";
import TableNoPagination from "../../CommonUi/TableNoPagination";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import AddProductAttributeValue from "../ProductAttributeValue/AddProductAttributeValue";
import UpdateProductAttributeValue from "../ProductAttributeValue/UpdateProductAttributeValue";
import UpdateAttribute from "./UpdateAttribute";

export default function DetailsProductAttribute() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { productAttribute, total, loading } = useSelector(
    (state) => state.productAttribute
  );
  useEffect(() => {
    dispatch(loadSingleProductAttribute(id));
  }, [dispatch, id]);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 2,
      title: "Attribute Value name",
      dataIndex: "name",
      key: "name",
      render: (name) => name,
    },
    {
      id: 3,
      title: "Create Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },
    {
      id: 4,
      title: "",
      key: "action",
      render: (item) => [
        {
          label: (
            <UserPrivateComponent permission={"update-productAttributeValue"}>
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  dispatch(editProductAttributeValue(item));
                  showModal();
                }}>
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
              permission={"delete-productAttributeValue"}
              deleteThunk={deleteProductAttributeValue}
              id={item.id}
              title={"Hide"}
              loadThunk={loadSingleProductAttribute}
              query={id}
            />
          ),
          key: "delete",
        },
      ],
    },
  ];
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const rightElement = (
    <>
      <h5 className="text-lg">
        Values under <strong>{productAttribute?.name} </strong>
      </h5>
    </>
  );
  return (
    <div>
      <div>
        <Card
          className="border-0 md:border md:p-6 bg-transparent md:bg-[#fafafa]"
          bodyStyle={{ padding: 0 }}
          key={productAttribute?.id}>
          <div className="md:flex-row flex-col flex justify-between md:mb-8 items-center gap-2">
            <h5 className="flex items-center">
              <span className="mr-left">{productAttribute?.name}</span>
            </h5>
            <div className="flex items-center gap-2">
              <CreateDrawer
                permission={"update-productAttribute"}
                title={"Update"}
                update
                color={"bg-gray-700"}
                width={30}>
                <UpdateAttribute productAttribute={productAttribute} />
              </CreateDrawer>
              <CreateDrawer
                permission={"create-productAttribute"}
                title={"Create attribute value"}
                width={35}>
                <AddProductAttributeValue id={id} />
              </CreateDrawer>
            </div>
          </div>
          <TableNoPagination
            list={productAttribute?.productAttributeValue.filter(
              (item) => item.status === "true"
            )}
            columns={columns}
            loading={loading}
            csvFileName={"product attribute"}
            rightElement={rightElement}
          />
        </Card>

        <Modal
          title="Update Product Attribute Value"
          open={isModalOpen}
          onCancel={handleCancel}
          footer={false}>
          <UpdateProductAttributeValue
            attributeId={id}
            handleCancel={handleCancel}
          />
        </Modal>
      </div>
    </div>
  );
}
