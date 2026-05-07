import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import AddTransaction from "@/components/transaction/AddTransaction";
import DetailTransaction from "@/components/transaction/detailTransaction";
import Transaction from "@/components/transaction/transaction";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function TransactionRoutes() {
  return (
    <Routes>
      <Route
        path="/transaction"
        exact
        element={
          <PermissionChecker
            permission={["readAll-transaction", "create-transaction"]}>
            <Transaction />
          </PermissionChecker>
        }
      />
      <Route
        path="/transaction/create"
        exact
        element={
          <PermissionChecker permission={"create-transaction"}>
            <AddTransaction />
          </PermissionChecker>
        }
      />
      <Route
        path="/transaction/:id"
        element={
          <PermissionChecker permission={"readSingle-transaction"}>
            <DetailTransaction />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
