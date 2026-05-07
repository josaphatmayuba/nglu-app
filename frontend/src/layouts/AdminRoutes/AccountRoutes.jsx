import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import BalanceSheet from "@/components/account/balanceSheet";
import DetailAccount from "@/components/account/detailAccount";
import GetAllAccount from "@/components/account/getAllAccount";
import IncomeStatement from "@/components/account/incomeStatement";
import TrialBalance from "@/components/account/trialBalance";
import { Route, Routes } from "react-router-dom";

export default function AccountRoutes() {
  return (
    <Routes>
      {" "}
      <Route
        path="/account"
        exact
        element={
          <PermissionChecker permission={["readAll-account", "create-account"]}>
            <GetAllAccount />
          </PermissionChecker>
        }
      />
      <Route
        path="/account/:id"
        element={
          <PermissionChecker permission={"readSingle-account"}>
            <DetailAccount />
          </PermissionChecker>
        }
      />
      <Route
        path="/account/trial-balance"
        exact
        element={
          <PermissionChecker permission={"readAll-productReports"}>
            <TrialBalance />
          </PermissionChecker>
        }
      />
      <Route
        path="/account/balance-sheet"
        exact
        element={
          <PermissionChecker permission={"readAll-productReports"}>
            <BalanceSheet />
          </PermissionChecker>
        }
      />
      <Route
        path="/account/income"
        exact
        element={
          <PermissionChecker permission={"readAll-productReports"}>
            <IncomeStatement />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
