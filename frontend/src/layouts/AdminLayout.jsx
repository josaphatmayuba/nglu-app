import AdminRoutes from "@/layouts/AdminRoutes";
import { useLocation } from "react-router-dom";

import Header from "@/layouts/Header.jsx";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SideNav from "../components/SideNav/SideNav";
import { loadPermissionById } from "../redux/rtk/features/auth/authSlice";
import { cn } from "../utils/functions";
import { Link } from "react-router-dom";

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
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

  const openDrawer = () => setVisible(!visible);

  useEffect(() => {
    if (!permissions && !permissionLoad && !error) {
      dispatch(loadPermissionById(roleId));
    }
  }, [dispatch, error, permissionLoad, permissions, roleId]);

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
        width={294}
        bodyStyle={{ padding: 0 }}>
        <div className="min-h-screen overflow-auto no-scrollbar w-[294px] bg-white text-ink-700 select-none border-r border-ink-200">
          {data && !loading && (
            <div className="h-[60px] px-4 flex items-center justify-between border-b border-ink-100 shrink-0">
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
          "hidden md:flex flex-col left-0 top-0 z-10 duration-300 h-screen w-[294px] 2xl:w-[294px] bg-white border-r border-ink-200 text-ink-700 select-none",
          { "w-[86px] 2xl:w-[86px]": collapsed }
        )}>
        {data && !loading && (
          <div
            className={cn(
              "h-[60px] px-4 flex items-center justify-between border-b border-ink-100 shrink-0",
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
                className="absolute left-[68px] top-4 z-30 flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600 shadow-sm hover:border-brand-300 hover:text-brand-600"
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
          `flex flex-col w-full 2xl:w-[calc(100vw-294px)] md:w-[calc(100vw-294px)] duration-300`,
          {
            "md:w-[calc(100vw-86px)] 2xl:w-[calc(100vw-86px)]": collapsed,
          }
        )}>
        <Header onPress={openDrawer} data={data} loading={loading} />
        <div className="flex-1 p-4 min-h-0 overflow-auto bg-ink-50 dark:from-gray-900 dark:to-gray-800">
          <AdminRoutes />
        </div>
      </div>
    </main>
  );
}

export default AdminLayout;
