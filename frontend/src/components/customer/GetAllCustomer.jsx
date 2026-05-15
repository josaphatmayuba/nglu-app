import { MoreHorizontal, Upload, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import PageHeader from "../../UI/PageHeader";
import {
  loadAllCustomer,
  loadAllCustomerPaginated,
} from "../../redux/rtk/features/customer/customerSlice";
import CreateDrawer from "../CommonUi/CreateDrawer";
import CommonSearch from "../CommonUi/CommonSearch";
import Pagination from "../../UI/Pagination";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import AddCustomer from "./AddCustomer";

const avatarGradients = [
  "from-brand-500 to-brand-700",
  "from-emerald-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-blue-500 to-blue-700",
];

const initialsFrom = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CL";

const compactMoney = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `CDF ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `CDF ${Math.round(amount / 1000)}K`;
  return `CDF ${amount}`;
};

const getCustomerTotal = (customer) =>
  Number(
    customer?.totalPurchase ??
      customer?.totalPurchases ??
      customer?.totalSaleAmount ??
      customer?.totalAmount ??
      0
  );

const getCustomerOrders = (customer) =>
  Number(
    customer?.totalOrders ??
      customer?.orderCount ??
      customer?.saleCount ??
      customer?.orders ??
      0
  );

const customerTier = (customer) => {
  const total = getCustomerTotal(customer);
  const orders = getCustomerOrders(customer);

  if (total >= 5000000 || orders >= 30) {
    return {
      label: "VIP",
      className: "bg-emerald-50 text-emerald-700",
      title: "VIP: 5M CDF+ ou 30 commandes+",
    };
  }
  if (total >= 1000000 || orders >= 10) {
    return {
      label: "Pro",
      className: "bg-amber-50 text-amber-700",
      title: "Pro: 1M CDF+ ou 10 commandes+",
    };
  }
  return {
    label: "Standard",
    className: "bg-ink-100 text-ink-600",
    title: "Standard: client sans seuil VIP ou Pro",
  };
};

const GetAllCustomer = () => {
  const dispatch = useDispatch();
  const { list, total, loading } = useSelector((state) => state.customers);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  useEffect(() => {
    dispatch(loadAllCustomer());
  }, [dispatch]);

  useEffect(() => {
    dispatch(loadAllCustomerPaginated(pageConfig));
  }, [dispatch, pageConfig]);

  const fetchData = (page, count) => {
    setPageConfig((prev) => ({ ...prev, page, count }));
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Base clients et historique"
        actions={
          <>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ink-200 hover:border-ink-300 rounded-lg text-sm text-ink-700 transition">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importer</span>
            </button>
            <CreateDrawer
              permission={"create-customer"}
              title={"Nouveau client"}
              width={35}>
              <AddCustomer />
            </CreateDrawer>
          </>
        }
      />

      <UserPrivateComponent permission={"readAll-customer"}>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72">
            <CommonSearch setPageConfig={setPageConfig} />
          </div>
          <div className="text-xs text-ink-500">
            {total || list?.length || 0} clients
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 rounded-xl border border-ink-200 bg-white p-5 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-ink-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-ink-100" />
                    <div className="h-3 w-1/2 rounded bg-ink-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : list?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {list.map((customer, index) => {
              const displayName =
                customer?.username ||
                customer?.name ||
                customer?.firstName ||
                `Client #${customer?.id}`;
              const tier = customerTier(customer);
              const totalPurchases = getCustomerTotal(customer);
              const orders = getCustomerOrders(customer);

              return (
                <Link
                  to={`/admin/customer/${customer?.id}`}
                  key={customer?.id || index}
                  className="group bg-white rounded-xl border border-ink-200 p-5 hover:border-brand-300 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                        avatarGradients[index % avatarGradients.length]
                      } flex items-center justify-center text-white font-semibold shrink-0`}
                    >
                      {initialsFrom(displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink-900 truncate group-hover:text-brand-700 transition">
                        {displayName}
                      </h4>
                      <p className="text-xs text-ink-500 truncate">
                        {customer?.email || customer?.phone || "Aucun contact"}
                      </p>
                      <span
                        title={tier.title}
                        className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${tier.className}`}
                      >
                        {tier.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => event.preventDefault()}
                      className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink-100">
                    <div>
                      <div className="text-xs text-ink-500">Total achats</div>
                      <div className="font-semibold text-ink-900">
                        {compactMoney(totalPurchases)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-500">Commandes</div>
                      <div className="font-semibold text-ink-900">{orders}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-ink-200 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <UserPlus className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="font-semibold text-ink-900 mb-2">Aucun client</h3>
            <p className="text-sm text-ink-500">
              Créez votre premier client pour commencer à suivre l'historique.
            </p>
          </div>
        )}

        {total >= 11 && (
          <div className="flex justify-center mt-4">
            <Pagination onChange={fetchData} total={total} />
          </div>
        )}
      </UserPrivateComponent>
    </>
  );
};

export default GetAllCustomer;
