import Loader from "@/components/loader/loader";
import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import AppSettings from "@/components/settings/AppSettings/AppSettings";
import AdminSettings from "@/components/settings/AdminSettings/AdminSettings";
import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

const AddDetails = lazy(() => import("@/components/settings/addDetails"));
export default function SettingRoutes() {
  return (
    <Routes>
      <Route
        path="/app-settings"
        exact
        element={
          <Suspense fallback={<Loader />}>
            <PermissionChecker
              permission={["readAll-setting", "create-setting"]}>
              <AppSettings />
            </PermissionChecker>
          </Suspense>
        }
        key="settings"
      />
      ,
      <Route
        path="/company-setting"
        exact
        element={
          <Suspense fallback={<Loader />}>
            <PermissionChecker
              permission={["readAll-setting", "create-setting"]}>
              <AddDetails />
            </PermissionChecker>
          </Suspense>
        }
        key="company-setting"
      />
      <Route
        path="/admin-settings"
        exact
        element={
          <Suspense fallback={<Loader />}>
            <PermissionChecker
              permission={["readAll-setting", "create-setting"]}>
              <AdminSettings />
            </PermissionChecker>
          </Suspense>
        }
        key="admin-settings"
      />
    </Routes>
  );
}
