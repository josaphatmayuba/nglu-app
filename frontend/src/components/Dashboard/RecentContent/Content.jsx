import moment from "moment";
import { useEffect } from "react";
import { MdPayments } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { loadAlleCommerceSalePaginatedForDashboard } from "../../../redux/rtk/features/eCommerce/cartOrder/cartOrderSlice";
import { loadAllSale } from "../../../redux/rtk/features/sale/saleSlice";
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
              className='flex items-center gap-2 rounded disabled:cursor-not-allowed'
              disabled={!dueAmount}
            >
              <MdPayments className='text-[1rem]' /> Payment
            </button>
          </Link>
        ),
        key: "payment",
      },
    ],
  },
];

const pendingColumns = [
  {
    id: 1,
    title: "Invoice No",
    dataIndex: "id",
    key: "id",
    render: (name, { id }) => <Link to={`/admin/order/${id}`}>{id}</Link>,
  },
  {
    id: 2,
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date) => moment(date).format("ll"),
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
    id: 10,
    title: "Action",
    dataIndex: "id",
    key: "payment",
    render: (id) => (
      <div className='flex '>
        <ViewBtn path={`/admin/order/${id}`} />
      </div>
    ),
  },
];

export default function Content({ pageConfig }) {
  const dispatch = useDispatch();

  const {
    list: saleList,
    loading: saleLoading,
    total: totalSell,
  } = useSelector((state) => state.sales);
  const {
    PENDING,
    loading: pendingLoading,
    total: totalPending,
  } = useSelector((state) => state.ESale);

  const {
    RECEIVED,
    loading: receivedLoading,
    total: totalReceived,
  } = useSelector((state) => state.ESale);

  const {
    DELIVERED,
    loading: deliveryLoading,
    total: totalDelivery,
  } = useSelector((state) => state.ESale);

  // const information = useSelector((state) => state.vatTax.statement);
  useEffect(() => {
    dispatch(
      loadAllSale({
        ...pageConfig,
        count: 5,
        user: "",
      })
    );
    dispatch(
      loadAlleCommerceSalePaginatedForDashboard({
        page: 1,
        count: 5,
        orderStatus: "PENDING",
      })
    );
    dispatch(
      loadAlleCommerceSalePaginatedForDashboard({
        page: 1,
        count: 5,
        orderStatus: "RECEIVED",
      })
    );
    dispatch(
      loadAlleCommerceSalePaginatedForDashboard({
        page: 1,
        count: 5,
        orderStatus: "DELIVERED",
      })
    );
  }, [dispatch, pageConfig]);

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8 pb-3'>
      <div className='w-full md:col-span-1'>
        <DashboardTable
          list={PENDING}
          total={totalPending}
          loading={pendingLoading}
          title={"Pending Order"}
          columns={pendingColumns}
          slug={"order"}
        />
      </div>
      <div className='w-full md:col-span-1'>
        <DashboardTable
          list={RECEIVED}
          total={totalReceived}
          loading={receivedLoading}
          title={"Received Order"}
          columns={pendingColumns}
          slug={"order"}
        />
      </div>
      <div className='w-full md:col-span-1'>
        <DashboardTable
          list={DELIVERED}
          total={totalDelivery}
          loading={deliveryLoading}
          title={"Delivered Order"}
          columns={pendingColumns}
          slug={"order"}
        />
      </div>
      <div className='w-full md:col-span-1'>
        <DashboardTable
          list={saleList}
          total={totalSell?._count?.id}
          loading={saleLoading}
          title={"Recent sells"}
          columns={saleColumns}
          slug={"sale"}
        />
        {/* <Card
					headStyle={{ padding: "0px 16px" }}
					bodyStyle={{ padding: 0 }}
					style={{ height: 332 }}
					extra={
						<Link className='dark:text-white' to={`/admin/vat-tax`}>
							Details
						</Link>
					}
					title={"Vat/Tax info"}
					// loading={"loading"}
				>
					<div className='p-5 pl-10'>
						<h2 className='text-lg font-normal'>Total vat Balance</h2>
						<h1 className='text-4xl font-bold'>
							{information?.totalVat
								? Number(information?.totalVat).toFixed(3)
								: 0}
						</h1>
						<p className='text-sm font-light'>last updated recently</p>
					</div>
					<div className='flex items-center justify-evenly'>
						<div className='flex items-center p-4 dark:bg-slate-500 dark:text-yellow-50 bg-white ant-shadow rounded-lg'>
							<div className='inline-flex flex-shrink-0 items-center justify-center h-16 w-16 text-blue-600 bg-blue-100 rounded-lg mr-6'>
								<MdOutlineMoneyOffCsred size={40} />
							</div>
							<div>
								<span className='block text-2xl font-bold'>
									{" "}
									{information?.totalVatGiven ? information?.totalVatGiven : 0}
								</span>
								<span className='block text-gray-500 dark:text-yellow-50'>
									{" "}
									Total Vat Given{" "}
								</span>
							</div>
						</div>
						<div className='flex items-center p-4 dark:bg-slate-500 dark:text-yellow-50 bg-white ant-shadow rounded-lg dashboard-card-bg'>
							<div className='inline-flex flex-shrink-0 items-center justify-center h-16 w-16 text-violet-600 bg-violet-100 rounded-lg mr-6'>
								<MdOutlineAttachMoney size={40} />
							</div>
							<div>
								<span className='block text-2xl font-bold'>
									{" "}
									{information?.totalVatReceived
										? Number(information?.totalVatReceived).toFixed(3)
										: 0}
								</span>
								<span className='block text-gray-500 dark:text-yellow-50'>
									Total Vat Received
								</span>
							</div>
						</div>
					</div>
				</Card> */}
      </div>
    </div>
  );
}
