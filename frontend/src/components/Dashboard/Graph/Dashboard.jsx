// Dashboard.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import QuickLink from "../../../layouts/QuickLink";
import Content from "../RecentContent/Content";
import Footer from "../../../layouts/Footer";
import ChartDashboard from "./ChartDashboard";
import { loadDashboardData, clearDashboard } from "@/redux/rtk/features/dashboard/dashboardSlice";

// HTML Entity Decode korar jonno Helper Function
const decodeHTMLEntity = (htmlStr) => {
  if (typeof document === 'undefined' || !htmlStr) return htmlStr;
  const txt = document.createElement("textarea");
  txt.innerHTML = htmlStr;
  return txt.value;
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { data: appSetting } = useSelector((state) => state?.setting) || {};
  const { info: dash, loading: dashLoading, error } = useSelector((s) => s?.dashboard) || {};

  // API theke asha symbol ke decode kore nichi
  const rawSymbol = appSetting?.currency?.currencySymbol || '$';
  const currencySymbol = decodeHTMLEntity(rawSymbol);

  const today = dayjs();
  const last12mStart = today.subtract(1, "year").add(1, "day");

  const [pageConfig, setPageConfig] = useState({
    startDate: last12mStart.format("YYYY-MM-DD"),
    endDate: today.format("YYYY-MM-DD"),
  });

  const timerRef = useRef(null);

  const fetchDashboard = useCallback((s, e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatch(loadDashboardData({ startDate: s, endDate: e }));
    }, 250);
  }, [dispatch]);

  useEffect(() => {
    fetchDashboard(pageConfig.startDate, pageConfig.endDate);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      dispatch(clearDashboard());
    };
  }, [pageConfig.startDate, pageConfig.endDate, fetchDashboard, dispatch]);

  const handleDateChange = (startDate, endDate) => {
    setPageConfig((prev) => ({ ...prev, startDate, endDate }));
  };

  const isInventory = appSetting?.dashboardType === "inventory";

  return (
    <div className="bg-ink-50 dark:from-gray-900 dark:to-gray-800 min-h-[calc(100vh-64px)]">
      <div className="mb-5 block md:hidden">
        <QuickLink />
      </div>

      <div className="mb-5">
        {isInventory ? (
          <ChartDashboard
            startDate={pageConfig.startDate}
            endDate={pageConfig.endDate}
            onDateChange={handleDateChange}
            kpis={dash?.kpis}
            sales={dash?.sales}
            purchases={dash?.purchases}
            monthly={dash?.monthly}
            accounts={dash?.accounts}
            topCustomers={dash?.topCustomers}
            topProduct={dash?.topProduct}
            loading={dashLoading}
            error={error}
            currencySymbol={currencySymbol} // Decoded symbol pass hocche
          />
        ) : (
          <Content pageConfig={pageConfig} />
        )}
      </div>

      <Footer data={appSetting} />
    </div>
  );
};

export default Dashboard;
