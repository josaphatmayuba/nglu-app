import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import PropertyManagement from "@/components/propertyManagement/PropertyManagement";
import { Route, Routes } from "react-router-dom";

export default function PropertyManagementRoutes() {
  return (
    <Routes>
      <Route
        path="/property-management"
        exact
        element={
          <PermissionChecker
            permission={["readAll-propertyManagement", "create-propertyManagement"]}
          >
            <PropertyManagement />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
