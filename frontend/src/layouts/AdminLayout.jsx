import AdminRoutes from "@/layouts/AdminRoutes";
import { useLocation } from "react-router-dom";

import Header from "@/layouts/Header.jsx";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SideNav from "../components/SideNav/SideNav";
import { loadPermissionById } from "../redux/rtk/features/auth/authSlice";
import { loadDashboardStartup } from "../redux/rtk/features/dashboard/dashboardSlice";
import { loadPropertyManagement } from "../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { cn } from "../utils/functions";
import { Link } from "react-router-dom";
import {
  startRealtimeClient,
  stopRealtimeClient,
  onRealtimeEvent,
  onRealtimeStatusChange,
} from "../realtime/realtimeClient";
import { createDataUpdateHandler } from "../realtime/dataUpdateHandlers";
import { createPermissionsUpdateHandler } from "../realtime/permissionsUpdateHandlers";
import { createAuthBroadcastChannel } from "../realtime/authBroadcastChannel";
import { createDataBroadcastChannel } from "../realtime/dataBroadcastChannel";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const PERMISSIONS_POLL_INTERVAL_MS = 60_000;
const DASHBOARD_POLL_INTERVAL_MS = 90_000;
const PROPERTY_MANAGEMENT_POLL_INTERVAL_MS = 45_000;

function dashboardDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading } = useSelector((state) => state?.setting) || {};
  const dispatch = useDispatch();
  const roleId = localStorage.getItem("roleId");
  const {
    list: permissions,
    loading: permissionLoad,
    error,
  } = useSelector((state) => state.auth) || {};
  const handleCollapsed = (val) => {
    setCollapsed(val);
  };

  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState("right");
  const [imageError, setImageError] = useState();
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  const openDrawer = () => setVisible(!visible);

  useEffect(() => {
    if (!permissions && !permissionLoad && !error) {
      dispatch(loadPermissionById(roleId));
    }
  }, [dispatch, error, permissionLoad, permissions, roleId]);

  useEffect(() => {
    startRealtimeClient();
    const dataHandler = createDataUpdateHandler(dispatch);
    const permsHandler = createPermissionsUpdateHandler(dispatch, navigate, toast);
    const unsubData = onRealtimeEvent("data.updated", dataHandler);
    const unsubPerms = onRealtimeEvent("permissions.updated", permsHandler);
    const unsubStatus = onRealtimeStatusChange(({ connected }) => {
      setRealtimeConnected(connected);
      if (connected) {
        const path = window.location.pathname || "";
        if (path.startsWith("/admin/property-management")) {
          dispatch(loadPropertyManagement());
        } else if (path.startsWith("/admin/dashboard")) {
          dispatch(loadDashboardStartup(dashboardDateRange()));
        }
      }
    });
    const authChannel = createAuthBroadcastChannel();
    const dataChannel = createDataBroadcastChannel();

    if (authChannel) {
      authChannel.onmessage = (message) => {
        const payload = message?.data;
        if (payload?.type === "permissions.updated" && payload.event) {
          permsHandler({ ...payload.event, __fromBroadcast: true });
        }
      };
    }

    if (dataChannel) {
      dataChannel.onmessage = (message) => {
        const payload = message?.data;
        if (payload?.type === "data.updated" && payload.event) {
          dataHandler({ ...payload.event, __fromBroadcast: true });
        }
      };
    }

    return () => {
      unsubData();
      unsubPerms();
      unsubStatus();
      authChannel?.close();
      dataChannel?.close();
      stopRealtimeClient();
    };
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!roleId || localStorage.getItem("isLogged") !== "true") return undefined;

    const refreshPermissions = () => {
      if (localStorage.getItem("isLogged") === "true") {
        dispatch(loadPermissionById(roleId));
      }
    };

    const timer = window.setInterval(refreshPermissions, PERMISSIONS_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, roleId]);

  useEffect(() => {
    if (realtimeConnected || localStorage.getItem("isLogged") !== "true") return undefined;

    const path = location.pathname || "";
    if (path.startsWith("/admin/dashboard")) {
      const timer = window.setInterval(() => {
        dispatch(loadDashboardStartup(dashboardDateRange()));
      }, DASHBOARD_POLL_INTERVAL_MS);
      return () => window.clearInterval(timer);
    }

    if (path.startsWith("/admin/property-management")) {
      const timer = window.setInterval(() => {
        dispatch(loadPropertyManagement());
      }, PROPERTY_MANAGEMENT_POLL_INTERVAL_MS);
      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [dispatch, location.pathname, realtimeConnected]);

  useEffect(() => {
    setImageError(false);
  }, [data]);
  useEffect(() => {
    const path = location.pathname || "";
    if (path.startsWith("/admin/pos")) {
      setCollapsed(true);
      setVisible(false);
    } else {
      setCollapsed(false);
    }
  }, [location.pathname]);

  return (
    <main className="relative h-screen w-screen overflow-hidden flex flex-row bg-ink-50">
      {/* Mobile drawer */}
      <Drawer
        title={false}
        placement={placement === "right" ? "left" : "right"}
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
        key={placement === "right" ? "left" : "right"}
        width={280}
        bodyStyle={{ padding: 0 }}>
        <div className="min-h-screen overflow-auto no-scrollbar w-[280px] bg-white text-ink-700 select-none border-r border-ink-200">
          {data && !loading && (
            <div className="h-16 px-5 flex items-center justify-between border-b border-ink-100 shrink-0">
              <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                  N
                </div>
                <span className="truncate text-base font-semibold tracking-tight text-ink-950">
                  NGOLU
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="p-1.5 hover:bg-ink-100 rounded-md text-ink-500"
                title="Fermer le menu"
              >
                <LeftOutlined className="text-[12px]" />
              </button>
            </div>
          )}

          {loading && (
            <div className="w-full h-[60px] flex items-center justify-center mb-3 px-4">
              <div className="bg-ink-100 h-4 rounded w-3/4 animate-pulse"></div>
            </div>
          )}

          <SideNav />
        </div>
      </Drawer>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col left-0 top-0 z-10 duration-300 h-screen w-[280px] 2xl:w-[280px] bg-white border-r border-ink-200 text-ink-700 select-none",
          { "w-[72px] 2xl:w-[72px]": collapsed }
        )}>
        {data && !loading && (
          <div
            className={cn(
              "h-16 px-5 flex items-center justify-between border-b border-ink-100 shrink-0",
              collapsed && "justify-center px-3"
            )}>
            <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                N
              </div>
              {!collapsed && (
                <span className="truncate text-base font-semibold tracking-tight text-ink-950">
                  NGOLU
                </span>
              )}
            </Link>
            {!collapsed && (
              <button
                type="button"
                onClick={() => handleCollapsed(true)}
                className="p-1.5 hover:bg-ink-100 rounded-md text-ink-500"
                title="Réduire le menu"
              >
                <LeftOutlined className="text-[12px]" />
              </button>
            )}
            {collapsed && (
              <button
                type="button"
                onClick={() => handleCollapsed(false)}
                className="absolute left-[58px] top-4 z-30 flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
                title="Ouvrir le menu"
              >
                <RightOutlined className="text-[12px]" />
              </button>
            )}
          </div>
        )}
        {loading && (
          <div
            className={cn(
              "h-16 mx-auto flex flex-col gap-1 my-3 px-4",
              !collapsed ? "visible w-[180px]" : "invisible w-[60px]"
            )}>
            <div className="bg-ink-100 h-4 rounded w-full animate-pulse"></div>
            <div className="bg-ink-100 h-4 rounded w-full animate-pulse"></div>
            <div className="bg-ink-100 h-4 rounded w-full animate-pulse"></div>
          </div>
        )}

        <SideNav collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      <div
        className={cn(
          `flex flex-col w-full 2xl:w-[calc(100vw-280px)] md:w-[calc(100vw-280px)] duration-300`,
          {
            "md:w-[calc(100vw-72px)] 2xl:w-[calc(100vw-72px)]": collapsed,
          }
        )}>
        <Header onPress={openDrawer} data={data} loading={loading} />
        <div className="flex-1 p-4 min-h-0 overflow-auto bg-ink-50 dark:from-gray-900 dark:to-gray-800">
          {!realtimeConnected && (
            <div className="mb-3 inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Synchronisation en reprise
            </div>
          )}
          <AdminRoutes />
        </div>
      </div>
    </main>
  );
}

export default AdminLayout;
