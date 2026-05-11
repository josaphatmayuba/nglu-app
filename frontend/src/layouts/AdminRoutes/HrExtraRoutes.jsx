import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import AwardsPage from "@/components/hr/AwardsPage";
import SalariesPage from "@/components/hr/SalariesPage";
import { Route, Routes } from "react-router-dom";

export default function HrExtraRoutes() {
  return (
    <Routes>
      <Route
        path="/award"
        element={
          <PermissionChecker permission={["readAll-award", "create-award"]}>
            <AwardsPage />
          </PermissionChecker>
        }
      />
      <Route
        path="/salary-history"
        element={
          <PermissionChecker permission={["readAll-salaryHistory", "create-salaryHistory"]}>
            <SalariesPage />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
