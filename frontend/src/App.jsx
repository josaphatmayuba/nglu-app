import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import "./App.css";
import "./assets/styles/main.css";

import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import Page404 from "./components/404/404Page";
import LoaderSpinner from "./components/loader/LoaderSpinner";
import Login from "./components/user/Login";
import { getSetting } from "./redux/rtk/features/setting/settingSlice";
import ServerError from "./components/404/ServerError";
import SignContractPage from "./components/propertyManagement/SignContractPage";
import TenantOnboardingPage from "./components/propertyManagement/TenantOnboardingPage";
const CustomerLayout = lazy(() => import("@/layouts/CustomerLayout"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));

const antdTheme = {
  token: {
    colorPrimary: "#4f46e5",
    colorLink: "#4f46e5",
    colorLinkHover: "#4338ca",
    colorBorder: "#e4e4e7",
    colorBorderSecondary: "#f4f4f5",
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontFamily:
      "'Inter', 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorTextHeading: "#18181b",
    colorText: "#3f3f46",
    colorTextSecondary: "#71717a",
    colorTextTertiary: "#a1a1aa",
    controlHeight: 38,
  },
  components: {
    Button: { borderRadius: 8, controlHeight: 38 },
    Input: { borderRadius: 8, controlHeight: 38 },
    Select: { borderRadius: 8, controlHeight: 38 },
    DatePicker: { borderRadius: 8, controlHeight: 38 },
    Table: { headerBg: "#fafafa", headerColor: "#71717a", rowHoverBg: "#fafafa" },
    Modal: { borderRadiusLG: 16 },
    Card: { borderRadiusLG: 12 },
  },
};

function App() {
  const { data, loading, error } = useSelector((state) => state?.setting) || {};
  const dispatch = useDispatch();

  useEffect(() => {
    if (!data && !loading && !error) {
      dispatch(getSetting());
    }
  }, [data, dispatch, error, loading]);

  // content render
  let content = null;
  if (loading) content = <LoaderSpinner />;
  else if (data && !loading) {
    content = (
      <Routes>
        <Route path="/sign/:token" element={<SignContractPage />} />
        <Route path="/onboarding/tenant" element={<TenantOnboardingPage />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={<LoaderSpinner />}>
              <CustomerLayout />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<LoaderSpinner />}>
              <AdminLayout />
            </Suspense>
          }
        />

        <Route path="/admin/auth/login" exact element={<Login />} />
        <Route path="/*" element={<Page404 />} />
      </Routes>
    );
  } else if (error) {
    content = <ServerError/>;
  }

  return (
    <ConfigProvider theme={antdTheme}>
      <BrowserRouter>
        <Toaster position='top-center' reverseOrder={false} />

        {content}
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
