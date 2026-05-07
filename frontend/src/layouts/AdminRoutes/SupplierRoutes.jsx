import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsSupplier from "@/components/suppliers/DetailsSupplier";
import DetailsSup from "@/components/suppliers/DetailsSupplier";
import SupplierReport from "@/components/suppliers/SupplierReport";
import UpdateSupplier from "@/components/suppliers/UpdateSupplier";
import Suppliers from "@/components/suppliers/suppliers";
import { Route, Routes } from "react-router-dom";

export default function SupplierRoutes() {
  return (
    <Routes>
      <Route
        path="/supplier"
        exact
        element={
          <PermissionChecker
            permission={["readAll-supplier", "create-supplier"]}>
            <Suppliers />
          </PermissionChecker>
        }
      />
      <Route
        path="/supplier-report"
        exact
        element={
          <PermissionChecker permission={"readAll-supplier"}>
            <SupplierReport />
          </PermissionChecker>
        }
      />
      <Route
        path="/supplier/:id"
        element={
          <PermissionChecker permission={"readSingle-supplier"}>
            <DetailsSupplier />
          </PermissionChecker>
        }
      />
      <Route
        path="/supplier/:id/update"
        element={
          <PermissionChecker permission={"update-supplier"}>
            <UpdateSupplier />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
