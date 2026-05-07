import Card from "@/UI/Card";
import Table from "@/UI/Table";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { loadSinglePurchaseReorder } from "../../redux/rtk/features/purchaseOrder/purchaseOrderSlice";
import NewPurchaseOrderInvoice from "../Invoice/NewPurchaseOrderInvoice";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";
import { SolutionOutlined } from "@ant-design/icons";

export default function SinglePurchase() {
  const { id } = useParams("id");
  const dispatch = useDispatch();
  const { singlePurchase, loading } = useSelector(
    (state) => state.purchaseOrder
  );
  const [columnsToShow, setColumnsToShow] = useState([]);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "productId",
      key: "id",
    },
    {
      id: 2,
      title: "Name",
      dataIndex: "product",
      key: "name",
      render: (item) => (
        <Link
          to={`/admin/product/${item?.id}`}
          className='hover:underline font-medium'
        >
          {item.name}
        </Link>
      ),
    },
    {
      id: 4,
      title: "Sku",
      dataIndex: "product",
      key: "sku",
      render: (item) => item.sku,
    },
    {
      id: 5,
      title: "Quantity",
      dataIndex: "reorderProductQuantity",
      key: "productQuantity",
      render: (qty) => <span className='font-semibold'>{qty}</span>,
    },
    {
      id: 3,
      title: "Date",
      key: "createdAt",
      render: (createdAt) => (
        <span className='text-gray-600'>
          {moment(createdAt).format("ll")}
        </span>
      ),
    },
  ];

  useEffect(() => {
    setColumnsToShow(columns);
    dispatch(loadSinglePurchaseReorder(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  const columnsToShowHandler = (val) => {
    setColumnsToShow(val);
  };

  const addKeys = (arr) => arr?.map((i) => ({ ...i, key: i.id }));

  return (
    <div className='max-w-full mx-auto px-2 py-4'>
      <Card
        className='shadow rounded-lg border border-gray-100 bg-white'
        title={
          <div className='flex flex-col sm:flex-row items-center gap-2 text-base sm:text-lg font-bold'>
            <span className='bg-gray-100 rounded-full p-2'>
              <SolutionOutlined className='text-xl' />
            </span>
            <span>Purchase Order: {id}</span>
          </div>
        }
        extra={
          <div className='flex flex-col sm:flex-row gap-2'>
            {singlePurchase && (
              <NewPurchaseOrderInvoice
                data={singlePurchase}
                title={"Purchase Order Invoice"}
              />
            )}
          </div>
        }
      >
        <div className='text-lg sm:text-xl font-bold flex justify-center mb-6 tracking-wide mt-2'>
          Purchase Order Product Information
        </div>

        {singlePurchase && (
          <div>
            <div className='flex flex-col md:flex-row justify-between mx-2 my-4 gap-4'>
              <ColVisibilityDropdown
                options={columns}
                columns={columns}
                columnsToShowHandler={columnsToShowHandler}
              />

              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200'>
                  <span className='mr-1'>PO Date:</span>
                  <span>
                    {moment(singlePurchase?.createdAt).format("DD/MM/YYYY")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className='mb-6 overflow-x-auto rounded-lg border border-gray-100 bg-white'>
          <Table
            scroll={{ x: true }}
            loading={loading}
            columns={columnsToShow}
            data={singlePurchase ? addKeys(singlePurchase?.productList) : []}
            className='min-w-[600px]'
          />
        </div>
        {/* You can add more summary/info here if needed, similar to SinglePurchaseInvoice */}
      </Card>
    </div>
  );
}
