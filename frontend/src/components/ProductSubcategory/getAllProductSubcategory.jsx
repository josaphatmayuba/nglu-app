import ModalUi from "@/UI/ModalUi";
import { loadAllProductCategory } from "@/redux/rtk/features/productCategory/productCategorySlice";
import { EditOutlined } from "@ant-design/icons";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  deleteProductSubCategory,
  loadallproductSubCatagoryPaginated,
} from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddProductSubCategory from "./addProductSubcategory";
import UpdateProductSubCategory from "./updateProductSubcategory";

const GetAllProductSubCategory = () => {
  const dispatch = useDispatch();
  const [edit, setEdit] = useState(false);
  const { list, total, loading } = useSelector(
    (state) => state.productSubCategories
  );
  const { list: categoryList } = useSelector(
    (state) => state.productCategories
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
      render: (id) => <Link to={`/admin/product-subcategory/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link to={`/admin/product-subcategory/${id}`}>{name}</Link>
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
      render: (subCategory) => [
        {
          label: (
            <ViewBtn
              title={"view"}
              path={`/admin/product-subcategory/${subCategory?.id}`}
            />
          ),
          key: "view",
        },

        {
          label: (
            <div
              onClick={() => {
                setEdit(subCategory);
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
                id: subCategory?.id,
                status: subCategory?.status,
              }}
              title={subCategory?.status === "true" ? "Hide" : "Show"}
              permission={"delete-productSubCategory"}
              deleteThunk={deleteProductSubCategory}
              loadThunk={loadallproductSubCatagoryPaginated}
              query={{ ...pageConfig, status: subCategory?.status }}
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
      key: "productCategoryId",
      label: "Category",
      type: "select",
      options: categoryList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[123px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
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
  useEffect(() => {
    dispatch(loadallproductSubCatagoryPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  useEffect(() => {
    dispatch(loadAllProductCategory({ query: "all" }));
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Sous-catégories"
        subtitle="Sous-catégories de produits"
        actions={
          <CreateDrawer
            permission={"create-productSubCategory"}
            title={"Create Subcategory"}
            width={35}
          >
            <AddProductSubCategory />
          </CreateDrawer>
        }
      />
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-productSubCategory"}>
          <TableComponent
            actionPermission={[
              "update-productSubCategory",
              "delete-productSubCategory",
              "readSingle-productSubCategory",
            ]}
            columns={columns}
            setPageConfig={setPageConfig}
            list={list}
            total={total}
            loading={loading}
            title={"Product SubCategory"}
            filters={filters}
            isSearch
          />
        </UserPrivateComponent>
      </Card>
      <ModalUi
        outsideClick={true}
        open={edit}
        title={"Edit Product SubCategory"}
        className="bg-white"
        onClose={() => setEdit(false)}
      >
        <UpdateProductSubCategory
          modal={true}
          subcategory={edit}
          onClose={() => setEdit(false)}
        />
      </ModalUi>
    </>
  );
};

export default GetAllProductSubCategory;
