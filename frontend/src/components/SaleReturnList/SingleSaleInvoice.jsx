import Card from "@/UI/Card";
import Table from "@/UI/Table";
import { SolutionOutlined } from "@ant-design/icons";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import { loadSingleSaleReturn } from "../../redux/rtk/features/SaleReturnList/SaleReturnListSlice";
import NewSaleReturnInvoice from "../Invoice/NewSaleReturnInvoice";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";

export default function SingleSaleInvoice() {
  const dispatch = useDispatch();
  const { id } = useParams("id");
  const [columnsToShow, setColumnsToShow] = useState([]);

  const { returnSale, loading } = useSelector((state) => state.saleReturn);
  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      id: 2,
      title: "Product Name",
      dataIndex: "product",
      key: "product",
      render: (product) => (
        <Link
          to={`/admin/product/${product?.id}`}
          className='hover:underline font-medium'
        >
          {product?.name}
        </Link>
      ),
    },
    {
      id: 3,
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (date) => moment(date).format("ll"),
    },
    {
      id: 4,
      title: "Product Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
      render: (qty) => <span className='font-semibold'>{qty}</span>,
    },
    {
      id: 5,
      title: "Sale Price",
      dataIndex: "productFinalAmount",
      key: "productUnitSalePrice",
    },
    {
      id: 6,
      title: "Total Tax",
      dataIndex: "taxAmount",
      key: "taxAmount",
    },
  ];

  useEffect(() => {
    setColumnsToShow(columns);
    dispatch(loadSingleSaleReturn(id));
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
            <span>Sale Return Invoice: {id}</span>
          </div>
        }
        extra={
          <div className='flex flex-col sm:flex-row gap-2'>
            {returnSale && (
              <NewSaleReturnInvoice
                title={"Sale Return Invoice"}
                data={returnSale}
              />
            )}
          </div>
        }
      >
        <div className='text-lg sm:text-xl font-bold flex justify-center mb-6 tracking-wide mt-2'>
          Sale Return Product Information
        </div>

        {returnSale && (
          <div>
            <div className='flex flex-col md:flex-row justify-between mx-2 my-4 gap-4'>
              <ColVisibilityDropdown
                options={columns}
                columns={columns}
                columnsToShowHandler={columnsToShowHandler}
              />

              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200'>
                  <span className='mr-1'>Sale Invoice Id:</span>
                  <span>{returnSale?.saleInvoiceId}</span>
                </div>
                <div className='bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200'>
                  <span className='mr-1'>Date:</span>
                  <span>{moment(returnSale?.createdAt).format("DD/MM/YYYY")}</span>
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
            data={
              returnSale ? addKeys(returnSale?.returnSaleInvoiceProduct) : []
            }
            className='min-w-[600px]'
          />
        </div>

        {returnSale && (
          <div className='flex flex-col gap-4 mt-4'>
            <div className='font-bold text-[16px]  px-3 py-2 rounded'>
              Total Return Amount: {returnSale?.totalAmount + (returnSale?.tax || 0)}
            </div>
            <div className='max-w-[500px] py-2 px-3'>
              <span className='font-bold'>Return Note:</span>
              <span className='font-medium'> {returnSale?.note}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
