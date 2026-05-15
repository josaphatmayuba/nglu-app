import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
import PageHeader from "../../UI/PageHeader";
import { loadAllProductSortList } from "../../redux/rtk/features/productSortList/ProductSortListSlice";
import ViewBtn from "../Buttons/ViewBtn";
import CreateDrawer from "../CommonUi/CreateDrawer";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddPurchaseOrder from "../PurchaseOrderList/AddPurchaseOrder";
import TableComponent from "./TableComponent";

const GetAllList = () => {
  const dispatch = useDispatch();
  const [productList, setProductList] = useState([]);
  const { list, loading, total } = useSelector(
    (state) => state.productSortList
  );
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const columns = [
    {
      id: 2,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <Link to={`/admin/product/${id}`}>{id}</Link>,
      renderCsv: (id) => id,
    },
    {
      id: 4,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link to={`/admin/product/${id}`}>{name}</Link>,
      renderCsv: (name) => name,
    },
    {
      id: 3,
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },

    {
      id: 6,
      title: "QTY",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      id: 7,
      title: "Purchase price",
      dataIndex: "productPurchasePrice",
      key: "productPurchasePrice",
      responsive: ["md"],
    },
    {
      id: 8,
      title: "Sale price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
      responsive: ["md"],
    },

    {
      id: 12,
      title: "Reorder QTY",
      dataIndex: "reorderQuantity",
      key: "reorderQuantity",
    },
    {
      id: 13,
      title: "Action",
      key: "action",
      render: ({ sku }, { id }) => (
        <div className='flex'>
          <ViewBtn path={`/admin/product/${id}`} />
        </div>
      ),
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllProductSortList(pageConfig));
  }, [dispatch, pageConfig]);

  return (
    <>
      <PageHeader
        title="Produits en rupture"
        subtitle="Articles à recommander auprès des fournisseurs"
        actions={
          productList.length ? (
            <CreateDrawer
              permission={"create-product"}
              title={"Create Purchase Order"}
            >
              <AddPurchaseOrder list={productList} />
            </CreateDrawer>
          ) : (
            <button
              disabled
              title='Sélectionnez au moins un produit'
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-ink-200 text-ink-500 text-sm font-medium rounded-lg cursor-not-allowed"
            >
              <PlusOutlined />
              <span>Créer bon de commande</span>
            </button>
          )
        }
      />
      <Card
        className='max-md:border-0 max-md:bg-white'
        bodyClass='max-md:p-0 '
      >
      <UserPrivateComponent permission={"readAll-reorderQuantity"}>
        <TableComponent
          list={list}
          total={total}
          loading={loading}
          columns={columns}
          csvFileName='Product Sort List'
          paginatedThunk={loadAllProductSortList}
          setProductList={setProductList}
          productList={productList}
        />
      </UserPrivateComponent>
    </Card>
    </>
  );
};

export default GetAllList;
