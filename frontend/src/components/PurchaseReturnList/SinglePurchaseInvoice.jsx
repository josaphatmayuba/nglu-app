import Card from "@/UI/Card";
import Table from "@/UI/Table";
import { SolutionOutlined } from "@ant-design/icons";
import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import { loadSinglePurchaseReturnInvoice } from "../../redux/rtk/features/PurchaseReturnList/PurchaseReturnListSlice";
import NewPurchaseReturnInvoice from "../Invoice/NewPurchaseReturnInvoice";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";

export default function SinglePurchaseInvoice() {
  const dispatch = useDispatch();
  const { id } = useParams("id");
  const [columnsToShow, setColumnsToShow] = useState([]);
  const { returnPurchase } = useSelector((state) => state.purchaseReturn);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id) => <span className="font-semibold">{id}</span>,
    },
    {
      id: 2,
      title: "Product Name",
      key: "product",
      dataIndex: "product",
      render: (product) => (
        <Link
          to={`/admin/product/${product?.id}`}
          className="hover:underline font-medium"
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
      render: (createdAt) => (
        <span className="text-gray-600">{moment(createdAt).format("ll")}</span>
      ),
    },
    {
      id: 4,
      title: "Product Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
      render: (qty) => <span className="font-semibold">{qty}</span>,
    },
    {
      id: 5,
      title: "Purchase Price",
      dataIndex: "productUnitPurchasePrice",
      key: "productUnitPurchasePrice",
      render: (price) => (
        <span className="font-semibold">{parseFloat(price || 0).toFixed(2)}</span>
      ),
    },
    {
      id: 6,
      title: "Total Tax",
      dataIndex: "taxAmount",
      key: "taxAmount",
      render: (tax) => (
        <span className="font-semibold">{parseFloat(tax || 0).toFixed(2)}</span>
      ),
    },
  ];

  useEffect(() => {
    setColumnsToShow(columns);
    dispatch(loadSinglePurchaseReturnInvoice(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columnsToShowHandler = (val) => {
    setColumnsToShow(val);
  };

  const addKeys = (arr) => arr?.map((i) => ({ ...i, key: i.id }));

  return (
    <div className="max-w-full mx-auto px-2 py-4">
      <Card
        className="shadow rounded-lg border border-gray-100 bg-white"
        title={
          <div className="flex flex-col sm:flex-row items-center gap-2 text-base sm:text-lg font-bold">
            <span className="bg-gray-100 rounded-full p-2">
              <SolutionOutlined className="text-xl" />
            </span>
            <span>ID : {id}</span>
          </div>
        }
        extra={
          <div className="flex flex-col sm:flex-row gap-2">
            {returnPurchase && (
              <NewPurchaseReturnInvoice
                title={"Purchase return Invoice"}
                data={returnPurchase}
              />
            )}
          </div>
        }
      >
        <div className="text-lg sm:text-xl font-bold flex justify-center mb-6 tracking-wide mt-2">
          Purchase Return Product Information
        </div>

        {returnPurchase && (
          <div>
            <div className="flex flex-col md:flex-row justify-between mx-2 my-4 gap-4">
              <ColVisibilityDropdown
                options={columns}
                columns={columns}
                columnsToShowHandler={columnsToShowHandler}
              />

              <div className="flex flex-wrap gap-2">
                <div className="bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200">
                  <span className="mr-1">Supplier:</span>
                  <span>{returnPurchase?.purchaseInvoice?.supplier?.name}</span>
                </div>
                <div className="bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200">
                  <span className="mr-1">Purchase Invoice Id:</span>
                  <span>{returnPurchase?.purchaseInvoiceId}</span>
                </div>
                <div className="bg-gray-100 px-3 py-2 rounded text-xs sm:text-sm font-semibold border border-gray-200">
                  <span className="mr-1">Date:</span>
                  <span>
                    {moment(returnPurchase?.createdAt).format("DD/MM/YYYY")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-100 bg-white">
          <Table
            scroll={{ x: true }}
            loading={!returnPurchase}
            columns={columnsToShow}
            data={
              returnPurchase
                ? addKeys(returnPurchase?.returnPurchaseInvoiceProduct)
                : []
            }
            className="min-w-[600px]"
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4 bg-gray-50 p-4 border rounded">
          <div className="font-bold text-base sm:text-lg px-4 py-2 rounded">
            Total Return Amount:{" "}
            <span className="ml-1 text-red-500">
              {((parseFloat(returnPurchase?.totalAmount || 0)) + (parseFloat(returnPurchase?.tax || 0))).toFixed(2)}
            </span>
          </div>
          <div className="font-bold text-base sm:text-lg px-4 py-2 rounded">
            Instant Paid Return:{" "}
            <span className="ml-1 text-green-600">
              {parseFloat(returnPurchase?.instantReturnAmount || 0).toFixed(2)}
            </span>
          </div>
        </div>
        <h6 className="m-0 max-w-full sm:max-w-[600px] py-3 text-base sm:text-lg bg-gray-50 rounded px-4 font-medium border border-gray-100">
          <span className="font-bold">Return Note:</span>
          <span className="ml-2">{returnPurchase?.note}</span>
        </h6>
      </Card>
    </div>
  );
}