import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import PropertyManagementNew from "@/components/propertyManagement/PropertyManagementNew";
import ContractTemplatesPage from "@/components/propertyManagement/ContractTemplatesPage";
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
            <PropertyManagementNew />
          </PermissionChecker>
        }
      />
      <Route
        path="/property-management/contract-templates"
        exact
        element={
          <PermissionChecker
            permission={[
              "readAll-contractTemplate",
              "create-contractTemplate",
              "readAll-propertyManagement",
            ]}
          >
            <ContractTemplatesPage />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
