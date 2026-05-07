import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearDashboard,
  loadDashboardData,
} from "../../../redux/rtk/features/dashboard/dashboardSlice";
import EcommerceDashboard from "../../Card/Dashboard/EcommerceDashboard";
import NewDashboardCard from "../../Card/Dashboard/NewDashboardCard";

const DemoLine = ({ pageConfig, data }) => {
  const dispatch = useDispatch();

  const cardInformation = useSelector((state) => state.dashboard.info);

  useEffect(() => {
    dispatch(loadDashboardData(pageConfig));

    return () => {
      dispatch(clearDashboard());
    };
  }, [dispatch, pageConfig]);

  return (
    <>
      {data?.dashboardType === "e-commerce" ? (
        <EcommerceDashboard information={cardInformation} />
      ) : (
        <NewDashboardCard information={cardInformation} />
      )}
    </>
  );
};

export default DemoLine;
