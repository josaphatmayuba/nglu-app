import GetAllManualPayment from "@/components/ManualPayment/GetAllManualPayment";
import PaymentReport from "@/components/ManualPayment/PaymentReport";
import AddCustPaymentByInvoice from "@/components/Payment/CustomerPaymentByInvoice";
import AddSupPaymentByInvoice from "@/components/Payment/SupplierPaymentByInvoice";
import GetAllPaymentMethod from "@/components/PaymentMethod/GetAllPaymentMethod";
import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function PaymentRoutes() {
  return (
    <Routes>
      <Route
        path="/payment/supplier/:pid"
        exact
        element={
          <PermissionChecker permission={["create-paymentPurchaseInvoice"]}>
            <AddSupPaymentByInvoice />
          </PermissionChecker>
        }
      />
      <Route
        path="/payment-report"
        element={
          <PermissionChecker permission={"readAll-manualPayment"}>
            <PaymentReport />
          </PermissionChecker>
        }
      />
      <Route
        path="/payment/customer/:pid"
        exact
        element={
          <PermissionChecker permission={"create-paymentSaleInvoice"}>
            <AddCustPaymentByInvoice />
          </PermissionChecker>
        }
      />{" "}
      <Route
        path="/manual-payment"
        element={
          <PermissionChecker permission={"readAll-manualPayment"}>
            <GetAllManualPayment />
          </PermissionChecker>
        }
      />
      <Route
        path="/payment-method"
        element={
          <PermissionChecker permission={"readAll-paymentMethod"}>
            <GetAllPaymentMethod />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
