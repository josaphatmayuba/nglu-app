import { Link } from "react-router-dom";

import ModalUi from "@/UI/ModalUi";
import { EditOutlined } from "@ant-design/icons";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import {
  deleteProductBrand,
  loadAllProductBrandByPaginated,
} from "../../redux/rtk/features/productBrand/productBrandSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddProductBrand from "./addProductBrand";
import UpdateProductBrand from "./updateProductBrand";

const GetAllProductBrand = (props) => {
  const dispatch = useDispatch();
  const [edit, setEdit] = useState(false);
  const { list, total, loading } = useSelector((state) => state.productBrands);
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/product-brand/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/product-brand/${id}`}>{name}</Link>
      ),
      renderCsv: (name) => name,
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
      id: 13,
      title: "",
      key: "action",
      render: (brand) => [
        {
          label: (
            <ViewBtn
              title={"view"}
              path={`/admin/product-brand/${brand?.id}`}
            />
          ),
          key: "view",
        },

        {
          label: (
            <div
              onClick={() => {
                setEdit(brand);
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
                id: brand?.id,
                status: brand?.status,
              }}
              title={brand?.status === "true" ? "Hide" : "Show"}
              permission={"delete-productCategory"}
              deleteThunk={deleteProductBrand}
              loadThunk={loadAllProductBrandByPaginated}
              query={{ ...pageConfig, status: brand?.status }}
              className="bg-white text-black"
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
      popupClassName: "w-[200px]",
    },
  ];
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  useEffect(() => {
    dispatch(loadAllProductBrandByPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <>
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
        // headClass="border-none"
        title={"Product Brand"}
        extra={
          <CreateDrawer
            permission={"create-productBrand"}
            title={"Create Brand"}
            width={35}
          >
            <AddProductBrand />
          </CreateDrawer>
        }
      >
        <UserPrivateComponent permission={"readAll-productBrand"}>
          <TableComponent
            actionPermission={[
              "update-productBrand",
              "delete-productBrand",
              "readSingle-productBrand",
            ]}
            columns={columns}
            setPageConfig={setPageConfig}
            list={list}
            total={total}
            loading={loading}
            title={"Product Brand List"}
            filters={filters}
            isSearch
          />
        </UserPrivateComponent>
      </Card>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Edit Product Brand"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <UpdateProductBrand
          modal={true}
          brand={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </>
  );
};

export default GetAllProductBrand;
