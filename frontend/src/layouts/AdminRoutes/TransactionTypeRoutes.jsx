import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllTransactionType from "@/components/transactionType/GetAllTransactionType";
import { Route, Routes } from "react-router-dom";

export default function TransactionTypeRoutes() {
  return (
    <Routes>
      <Route
        path="/transaction-type"
        exact
        element={
          <PermissionChecker
            permission={["readAll-transactionType", "create-transactionType"]}
          >
            <GetAllTransactionType />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
