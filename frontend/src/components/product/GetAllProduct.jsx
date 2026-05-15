import { useState } from "react";
import { Link } from "react-router-dom";

import { loadAllProductBrandByPaginated } from "@/redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductSubCategory } from "@/redux/rtk/features/productSubCategory/productSubCategorySlice";
import { stringShorter } from "@/utils/functions";
import { EditOutlined } from "@ant-design/icons";
import { useEffect } from "react";
import { CiBarcode } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import {
  deleteProduct,
  loadProductbyPaginated,
  loadProductCard,
} from "../../redux/rtk/features/product/productSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CommonDelete from "../CommonUi/CommonDelete";
import CreateDrawer from "../CommonUi/CreateDrawer";
import TableComponent from "../CommonUi/TableComponent";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddProd from "./AddProduct";
import ProductCard from "./ProductCard";

const GetAllProduct = () => {
  const dispatch = useDispatch();

  const { list, loading, total, card } = useSelector((state) => state.products);
  const { list: brandList, loading: brandLoading } = useSelector(
    (state) => state.productBrands,
  );
  const { list: SubCategoryList, loading: SubLoading } = useSelector(
    (state) => state.productSubCategories,
  );
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

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
      width: "50px",
      render: (id) => <Link to={`/admin/product/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 2,
      title: "Image",
      dataIndex: "productThumbnailImageUrl",
      render: (productThumbnailImageUrl) => (
        <div className="w-[2.5rem] h-[1.375rem] relative">
          <img
            className="absolute object-cover w-full h-full"
            alt="product"
            onError={handleOnError}
            src={productThumbnailImageUrl || "/images/default.jpg"}
          />
        </div>
      ),
      key: "image",
      width: "70px",
      csvOff: true,
    },
    {
      id: 4,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => (
        <Link title={name} to={`/admin/product/${id}`}>
          {stringShorter(name, 45)}
        </Link>
      ),
      width: "150px",
      renderCsv: (name) => name,
      tdClass: "whitespace-normal",
    },
    {
      id: 10,
      title: "Brand",
      dataIndex: "productBrand",
      key: "productBrand",
      render: (productBrand) => productBrand?.name,
      renderCsv: (productBrand) => productBrand?.name,
    },
    {
      id: 9,
      title: "Sub Category",
      dataIndex: "productSubCategory",
      key: "productSubCategory",
      render: (productSubCategory) => productSubCategory?.name,
      renderCsv: (productSubCategory) => productSubCategory?.name,
    },
    {
      id: 3,
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },

    {
      id: 7,
      title: "Purchase price",
      dataIndex: "productPurchasePrice",
      key: "productPurchasePrice",
      responsive: ["md"],
    },
    {
      id: 3,
      title: "Vat",
      dataIndex: "productVat",
      key: "productVat",
      render: (productVat) => (
        <span>{productVat ? `${productVat?.percentage}%` : "0%"}</span>
      ),
      renderCsv: (productVat) =>
        `${productVat?.percentage ? productVat?.percentage : 0}%`,
    },
    {
      id: 8,
      title: "Sale price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
      responsive: ["md"],
    },
    {
      id: 6,
      title: "Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      id: 5,
      title: "UoM",
      key: "uomValue",
      render: ({ uom, uomValue }) =>
        `${uomValue || ""}${uom?.name ? `/${uom.name}` : ""}`,
      renderCsv: ({ uom, uomValue }) =>
        `${uomValue || ""}${uom?.name ? `/${uom.name}` : ""}`,
    },

    {
      id: 12,
      title: "Reorder QTY",
      dataIndex: "reorderQuantity",
      key: "reorderQuantity",
    },
    {
      id: 13,
      title: "",
      key: "action",
      render: (prod) => [
        {
          label: <ViewBtn title={"View"} path={`/admin/product/${prod?.id}`} />,
          key: "view",
        },
        {
          label: (
            <UserPrivateComponent permission={"update-product"}>
              <Link
                to={`/admin/product/${prod?.id}/update`}
                className="flex items-center gap-2 cursor-pointer">
                <EditOutlined className=" p-1 rounded-md" />
                Edit
              </Link>
            </UserPrivateComponent>
          ),
          key: "edit",
        },
        {
          label: (
            <Link
              to={`/admin/print-barcode/${prod?.id}`}
              className="flex items-center gap-2 rounded">
              <CiBarcode className="text-[1rem]" />
              Barcode
            </Link>
          ),
          key: "barcode",
        },
        {
          label: (
            <CommonDelete
              values={{
                id: prod?.id,
                status: prod?.status,
              }}
              title={prod?.status === "true" ? "Hide" : "Show"}
              permission={"delete-user"}
              deleteThunk={deleteProduct}
              loadThunk={loadProductbyPaginated}
              query={{ ...pageConfig, status: prod?.status }}
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
      key: "productSubCategoryId",
      label: "Sub Category",
      type: "select",
      options: SubCategoryList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[123px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "productBrandId",
      label: "Brand",
      type: "select",
      options: brandList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[100px] max-w-[150px]",
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
    dispatch(loadProductCard());
  }, [dispatch]);

  useEffect(() => {
    dispatch(loadProductbyPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  useEffect(() => {
    dispatch(loadAllProductSubCategory({ query: "all" }));
    dispatch(loadAllProductBrandByPaginated({ query: "all" }));
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle="Catalogue et gestion d'inventaire"
        actions={
          <CreateDrawer
            permission={"create-product"}
            title={"Create Product"}
            width={60}>
            <AddProd />
          </CreateDrawer>
        }
      />
      {card && <ProductCard card={card} />}
      <Card
        className="max-md:border-0 max-md:bg-white"
        bodyClass="max-md:p-0 "
      >
        <UserPrivateComponent permission={"readAll-product"}>
          <TableComponent
            actionPermission={["update-product", "delete-product"]}
            list={list}
            total={total}
            loading={loading}
            columns={columns}
            filters={filters}
            setPageConfig={setPageConfig}
            title="Product List"
            isSearch
          />
        </UserPrivateComponent>
      </Card>
    </>
  );
};

export default GetAllProduct;
