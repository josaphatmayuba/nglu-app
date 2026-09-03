import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  clearCustomer,
  loadSingleCustomer,
} from "../../redux/rtk/features/customer/customerSlice";

import Card from "@/UI/Card";
import List from "@/UI/List";
import Tabs, { Tab } from "@/UI/Tabs";
import useCurrency from "@/utils/useCurrency";
import CustomerInvoiceList from "../Card/CustomerInvoiceList";
import Loader from "../loader/loader";
import CustomerReturnInvoiceList from "./ListCard/CustomerReturnInvoiceList";
import CustomerTransactionList from "./ListCard/CustomerTransactionList";

const DetailCustomer = () => {
  const { id } = useParams();
  const currency = useCurrency();

  //dispatch
  const dispatch = useDispatch();
  const customer = useSelector((state) => state.customers.customer);
  const saleInvoices = Array.isArray(customer?.saleInvoice)
    ? customer.saleInvoice
    : [];
  const returnSaleInvoices = Array.isArray(customer?.returnSaleInvoice)
    ? customer.returnSaleInvoice
    : [];
  const transactions = Array.isArray(customer?.allTransaction)
    ? customer.allTransaction
    : [];
  const totalSaleInvoice = customer?.totalSaleInvoice ?? saleInvoices.length;
  const totalReturnSaleInvoice =
    customer?.totalReturnSaleInvoice ?? returnSaleInvoices.length;

  useEffect(() => {
    dispatch(loadSingleCustomer(id));
    return () => {
      dispatch(clearCustomer());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <div className="">
        {customer ? (
          <Fragment key={customer.id}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
              <Card bodyClass={"p-0"}>
                <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-ink-900">
                      Détails client
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                      Factures, retours et historique des transactions
                    </p>
                  </div>
                </div>
                <Tabs>
                  <Tab
                    tabKey="invoices"
                    label={
                      <span className="inline-flex items-center gap-2">
                        Factures
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-100 px-1.5 text-xs text-ink-600">
                          {totalSaleInvoice}
                        </span>
                      </span>
                    }>
                    <CustomerInvoiceList
                      list={saleInvoices}
                      linkTo="/admin/sale"
                    />
                  </Tab>
                  <Tab
                    tabKey="return-invoices"
                    label={
                      <span className="inline-flex items-center gap-2">
                        Retours
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-100 px-1.5 text-xs text-ink-600">
                          {totalReturnSaleInvoice}
                        </span>
                      </span>
                    }>
                    <CustomerReturnInvoiceList
                      list={returnSaleInvoices}
                    />
                  </Tab>
                  <Tab tabKey="transactions" label="Transactions">
                    <CustomerTransactionList list={transactions} />
                  </Tab>
                </Tabs>
              </Card>
              <div className="flex flex-col gap-4">
                <Card title="Client">
                  <List
                    labelClassName="w-[30%] pl-4"
                    list={[
                      {
                        label: "Nom",
                        value: customer?.username,
                      },
                      {
                        label: "Email",
                        value: customer?.email || "N/A",
                      },
                      {
                        label: "Téléphone",
                        value: customer?.phone,
                      },
                      {
                        label: "Adresse",
                        value: customer?.address,
                      },
                    ]}
                  />
                </Card>
                <Card>
                  <List
                    labelClassName="w-[30%] pl-4"
                    list={[
                      {
                        label: "Total",
                        value: customer?.totalAmount
                          ? Number(customer.totalAmount).toFixed(2)
                          : 0,
                      },
                      {
                        label: "Retours",
                        value: (
                          <div className="before:content-['-'] relative before:absolute before:text-red-500 before:font-bold before:-left-3 before:top-0">
                            {customer?.totalReturnAmount}
                          </div>
                        ),
                      },
                      {
                        label: "Payé",
                        value: (
                          <div className="before:content-['-'] relative before:absolute before:text-red-500 before:font-bold before:-left-3 before:top-0">
                            {customer?.totalPaidAmount}
                          </div>
                        ),
                        className: "border-b pb-1",
                      },
                      {
                        label: "Dû",
                        value: customer?.dueAmount,
                      },
                    ]}
                  />
                </Card>
              </div>
            </div>
          </Fragment>
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
};

export default DetailCustomer;
