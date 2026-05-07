import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Card from "../../UI/Card";
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
    <Card
      className='max-md:border-0 max-md:bg-white'
      bodyClass='max-md:p-0 '
      // headClass='border-none'
      title={"Product Short List"}
      extra={
        productList.length ? (
          <>
            <CreateDrawer
              permission={"create-product"}
              title={"Create Purchase Order"}
            >
              <AddPurchaseOrder list={productList} />
            </CreateDrawer>
          </>
        ) : (
          <button
            disabled
            title='Select at least one product'
            className={`xs:px-3 px-2 md:text-base py-[6px] lg:px-5  border bg-gray-400
                    text-white rounded cursor-not-allowed`}
          >
            <span className='flex items-center justify-center gap-1 md:gap-2 '>
              <PlusOutlined />
              <span className=''>Create Purchase Order</span>
            </span>
          </button>
        )
      }
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
  );
};

export default GetAllList;
