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
      {/* Desktop sidebar collapse button (integrated, not floating) */}
      <div
        className={cn(
          "hidden md:flex absolute top-4 z-30 transition-[left] duration-300 bg-white border border-ink-200 hover:border-brand-300 text-ink-600 hover:text-brand-600 w-7 h-7 rounded-md justify-center items-center shadow-sm",
          collapsed
            ? "left-[70px]"
            : "left-[185px] 2xl:left-[225px]"
        )}>
        {collapsed ? (
          <RightOutlined
            onClick={() => handleCollapsed(!collapsed)}
            className="text-[12px] cursor-pointer"
          />
        ) : (
          <LeftOutlined
            onClick={() => handleCollapsed(!collapsed)}
            className="text-[12px] cursor-pointer"
          />
        )}
      </div>

      {/* Mobile drawer */}
      <Drawer
        title={false}
        placement={placement === "right" ? "left" : "right"}
        closable={false}
        onClose={() => setVisible(false)}
        open={visible}
        key={placement === "right" ? "left" : "right"}
        width={260}
        bodyStyle={{ padding: 0 }}>
        <div className="pt-3 min-h-screen overflow-auto no-scrollbar w-[260px] bg-white text-ink-700 select-none border-r border-ink-200">
          {data && !loading && (
            <div className="w-full h-[60px] flex items-center justify-center mb-3 px-4">
              <Link to="/admin/dashboard" className="block w-full h-full flex items-center justify-center">
                {data?.logo && !imageError ? (
                  <img
                    alt="logo"
                    src={data.logo}
                    style={{ maxWidth: "160px", maxHeight: "48px", objectFit: "contain" }}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <h2 className="text-ink-900 text-center flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
                    {data?.companyName?.includes(" ") ? (
                      <>
                        <strong className="text-brand-600 font-bold">
                          {data?.companyName?.split(" ")[0]}
                        </strong>
                        {data?.companyName?.slice(
                          data?.companyName?.indexOf(" ") + 1
                        )}
                      </>
                    ) : (
                      <strong className="text-brand-600 font-bold">
                        {data?.companyName || "NGOLU"}
                      </strong>
                    )}
                  </h2>
                )}
              </Link>
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
          "hidden md:block left-0 top-0 z-10 duration-300 h-screen w-[200px] 2xl:w-[240px] bg-white border-r border-ink-200 text-ink-700 select-none",
          { "w-[86px] 2xl:w-[86px]": collapsed }
        )}>
        {data && !loading && (
          <div
            className={cn(
              "h-[70px] mx-auto flex items-center justify-center my-3 px-4",
              !collapsed ? "visible w-[180px]" : "invisible w-[60px]"
            )}>
            <Link to="/admin/dashboard" className="block w-full h-full flex items-center justify-center">
              {data?.logo && !imageError ? (
                <img
                  className="object-contain"
                  alt="logo"
                  src={data.logo}
                  style={{ maxWidth: "160px", maxHeight: "60px" }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <h2 className="text-ink-900 text-center flex items-center justify-center gap-2 text-xl font-semibold tracking-tight">
                  {data?.companyName?.includes(" ") ? (
                    <>
                      <strong className="text-brand-600 font-bold">
                        {data?.companyName?.split(" ")[0]}
                      </strong>
                      {data?.companyName?.slice(
                        data?.companyName?.indexOf(" ") + 1
                      )}
                    </>
                  ) : (
                    <strong className="text-brand-600 font-bold">
                      {data?.companyName || "NGOLU"}
                    </strong>
                  )}
                </h2>
              )}
            </Link>
          </div>
        )}
        {loading && (
          <div
            className={cn(
              "h-[70px] mx-auto flex flex-col gap-1 my-3 px-4",
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
          `flex flex-col w-full 2xl:w-[calc(100vw-240px)] md:w-[calc(100vw-200px)] duration-300`,
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
