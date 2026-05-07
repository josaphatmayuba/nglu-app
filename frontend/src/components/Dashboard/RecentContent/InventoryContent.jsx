import { stringShorter } from "@/utils/functions";
import moment from "moment";
import { useEffect } from "react";
import { MdPayments } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { loadAllProductSortList } from "../../../redux/rtk/features/productSortList/ProductSortListSlice";
import { loadAllPurchase } from "../../../redux/rtk/features/purchase/purchaseSlice";
import { loadAllSale } from "../../../redux/rtk/features/sale/saleSlice";
import { loadAllTransaction } from "../../../redux/rtk/features/transaction/transactionSlice";
import ViewBtn from "../../Buttons/ViewBtn";
import DashboardTable from "./DashboardTable";

const saleColumns = [
  {
    id: 1,
    title: "Invoice No",
    dataIndex: "id",
    key: "id",
    render: (name, { id }) => <Link to={`/admin/sale/${id}`}>{id}</Link>,
  },

  {
    id: 3,
    title: "Customer",
    dataIndex: `customer`,
    key: "customerId",
    render: (customer) => customer?.username,
  },

  {
    id: 4,
    title: "Total",
    dataIndex: "totalAmount",
    key: "totalAmount",
    render: (totalAmount) => totalAmount.toFixed(2),
  },
  {
    id: 6,
    title: "Due",
    dataIndex: "dueAmount",
    key: "dueAmount",
    responsive: ["md"],
    render: (dueAmount) => dueAmount.toFixed(2),
  },
  {
    id: 7,
    title: "Paid",
    dataIndex: "paidAmount",
    key: "paidAmount",
    responsive: ["md"],
    render: (paidAmount) => paidAmount.toFixed(2),
  },
  {
    id: 2,
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date) => moment(date).format("ll"),
  },
  {
    id: 10,
    title: "",
    dataIndex: "",
    key: "action",
    render: ({ id, dueAmount }) => [
      {
        label: (
          <Link
            to={dueAmount ? `/admin/payment/customer/${id}` : "#"}
            state={{ dueAmount: dueAmount }}
          >
            <button
              className="flex items-center gap-2 rounded disabled:cursor-not-allowed"
              disabled={!dueAmount}
            >
              <MdPayments className="text-[1rem]" /> Payment
            </button>
          </Link>
        ),
        key: "payment",
      },
    ],
  },
];
const sortListColumns = [
  {
    id: 2,
    title: "ID",
    dataIndex: "id",
    key: "id",
  },
  {
    id: 3,
    title: "SKU",
    dataIndex: "sku",
    key: "sku",
  },
  {
    id: 4,
    title: "Name",
    dataIndex: "name",
    key: "name",
    render: (name, { id }) => <Link to={`/admin/product/${id}`}>{name}</Link>,
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
    id: 12,
    title: "Reorder QTY",
    dataIndex: "reorderQuantity",
    key: "reorderQuantity",
  },
  {
    id: 13,
    title: "",
    key: "action",
    render: ({ id }) => [
      {
        label: <ViewBtn title="View" path={`/admin/product/${id}`} />,
        key: "view",
      },
    ],
  },
];

const purchaseColumns = [
  {
    id: 1,
    title: "ID",
    key: "id",
    render: ({ id }) => <Link to={`/admin/purchase/${id}`}>{id}</Link>,
  },
  {
    id: 2,
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date) => moment(date).format("ll"),
  },
  {
    id: 3,
    title: "Supplier ",
    dataIndex: `supplier`,
    key: "supplierId",
    render: (supplier) => supplier?.name,
  },
  {
    id: 4,
    title: "Total",
    dataIndex: "totalAmount",
    key: "totalAmount",
  },
  {
    id: 5,
    title: "Discount",
    dataIndex: "discount",
    key: "discount",
  },
  {
    id: 6,
    title: "Due",
    dataIndex: "dueAmount",
    key: "dueAmount",
  },
  {
    id: 7,
    title: "Paid",
    dataIndex: "paidAmount",
    key: "paidAmount",
  },
  {
    id: 8,
    title: "",
    key: "action",
    render: ({ id, dueAmount }) => [
      {
        label: <ViewBtn title="View" path={`/admin/purchase/${id}`} />,
        key: "view",
      },
      {
        label: (
          <Link
            to={dueAmount ? `/admin/payment/supplier/${id}` : "#"}
            state={{ dueAmount: dueAmount }}
          >
            <button
              className="flex items-center gap-2 rounded disabled:cursor-not-allowed"
              disabled={!dueAmount}
            >
              <MdPayments className="text-[1rem]" /> Payment
            </button>
          </Link>
        ),
        key: "payment",
      },
    ],
  },
];

const transactionsColumns = [
  {
    id: 1,
    title: "ID",
    dataIndex: "id",
    key: "id",
    render: (id) => <Link to={`/admin/transaction/${id}`}>{id}</Link>,
  },
  {
    id: 2,
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date) => moment(date).format("ll"),
  },

  {
    id: 3,
    title: "Debit Account",
    dataIndex: "debit",
    key: "debit",
    render: (debit) => debit?.name,
  },

  {
    id: 4,
    title: "Credit Account",
    dataIndex: "credit",
    key: "credit",
    render: (credit) => credit?.name,
  },

  {
    id: 5,
    title: "Amount",
    dataIndex: "amount",
    key: "amount",
    responsive: ["md"],
  },
  {
    id: 6,
    title: "Particulars",
    dataIndex: "particulars",
    key: "particulars",
    render: (particulars) => stringShorter(particulars, 20),
  },
];
export default function InventoryContent({ pageConfig }) {
  const dispatch = useDispatch();

  const {
    list: saleList,
    loading: saleLoading,
    total: totalSell,
  } = useSelector((state) => state.sales);
  const {
    list: purchaseList,
    loading: purchaseLoading,
    total: totalPurchase,
  } = useSelector((state) => state.purchases);

  const {
    list: transactions,
    loading: transactionLoading,
    total: totalTransaction,
  } = useSelector((state) => state.transactions);

  const {
    list: sortList,
    loading: sortListLoading,
    total: totalShortList,
  } = useSelector((state) => state.productSortList);
  useEffect(() => {
    dispatch(
      loadAllSale({
        ...pageConfig,
        count: 5,
        user: "",
      })
    );
    dispatch(loadAllPurchase(pageConfig));
    dispatch(loadAllTransaction(pageConfig));
    dispatch(loadAllProductSortList({ count: 5 }));
  }, [dispatch, pageConfig]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 2xl:gap-x-8 gap-y-4 2xl:gap-y-8 pb-3">
      <div className="w-full md:col-span-1">
        <DashboardTable
          list={saleList}
          loading={saleLoading}
          title={"Recent sales"}
          total={totalSell?._count?.id}
          columns={saleColumns}
          slug={"sale"}
        />
      </div>
      <div className="w-full md:col-span-1">
        <DashboardTable
          list={purchaseList}
          total={totalPurchase}
          loading={purchaseLoading}
          title={"Recent purchase"}
          columns={purchaseColumns}
          slug={"purchase"}
        />
      </div>
      <div className="w-full md:col-span-1">
        <DashboardTable
          list={transactions}
          total={totalTransaction?._count?.id}
          loading={transactionLoading}
          title={"Recent transactions"}
          columns={transactionsColumns}
          slug={"transaction"}
        />
      </div>
      <div className="w-full md:col-span-1">
        <DashboardTable
          list={sortList}
          total={totalShortList}
          loading={sortListLoading}
          title={"Product stock alert"}
          columns={sortListColumns}
          slug={"product-sort-list"}
        />
      </div>
    </div>
  );
}
