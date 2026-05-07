import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllPurchaseOrderList from "@/components/PurchaseOrderList/GetAllPurchaseOrderList";
import SinglePurchase from "@/components/PurchaseOrderList/SinglePurchase";
import PurchaseReturnList from "@/components/PurchaseReturnList/PurchaseReturnList";
import SinglePurchaseInvoice from "@/components/PurchaseReturnList/SinglePurchaseInvoice";
import PurchaseReport from "@/components/purchase/PurchaseReport";
import AddPurchase from "@/components/purchase/addPurchase";
import AddReturnPurchase from "@/components/purchase/addReturnPurchase";
import DetailsPurchase from "@/components/purchase/detailsPurch";
import GetAllPurchase from "@/components/purchase/getAllPurchase";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function PurchaseRoutes() {
  return (
    <Routes>
      <Route
        path="/purchase"
        exact
        element={
          <PermissionChecker
            permission={["readAll-purchaseInvoice", "create-purchaseInvoice"]}>
            <GetAllPurchase />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase/add"
        exact
        element={
          <PermissionChecker permission={"create-purchaseInvoice"}>
            <AddPurchase />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase/:id"
        element={
          <PermissionChecker permission={"readSingle-purchaseInvoice"}>
            <DetailsPurchase />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase-report"
        element={
          <PermissionChecker permission={"readAll-purchaseInvoice"}>
            <PurchaseReport />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase/return/:id"
        element={
          <PermissionChecker permission={"create-returnPurchaseInvoice"}>
            <AddReturnPurchase />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase-return-list"
        element={
          <PermissionChecker permission={"readAll-returnPurchaseInvoice"}>
            <PurchaseReturnList />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase-return-list/:id"
        element={
          <PermissionChecker permission={"readSingle-returnPurchaseInvoice"}>
            <SinglePurchaseInvoice />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase-reorder-invoice"
        element={
          <PermissionChecker permission={"readAll-purchaseReorderInvoice"}>
            <GetAllPurchaseOrderList />
          </PermissionChecker>
        }
      />
      <Route
        path="/purchase-reorder-invoice/:id"
        element={
          <PermissionChecker permission={"readSingle-purchaseReorderInvoice"}>
            <SinglePurchase />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
