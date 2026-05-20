import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import PropertyManagementNew from "@/components/propertyManagement/PropertyManagementNew";
import ContractTemplatesPage from "@/components/propertyManagement/ContractTemplatesPage";
import PropertiesPanel from "@/components/propertyManagement/modules/Properties/PropertiesPanel";
import TenantsPanel from "@/components/propertyManagement/modules/Tenants/TenantsPanel";
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
      <Route
        path="/property-management/settings"
        exact
        element={
          <PermissionChecker
            permission={["readAll-propertyManagement", "create-propertyManagement"]}
          >
            <PropertyManagementSettings />
          </PermissionChecker>
        }
      />
      {/* Phase A demo route (modular Properties panel in isolation) — */}
      {/* remove once Phase F has merged everything into the main page. */}
      <Route
        path="/property-management/_new/properties"
        exact
        element={
          <PermissionChecker
            permission={["readAll-propertyManagement", "create-propertyManagement"]}
          >
            <div className="property-management-page immo-page">
              <div className="immo-header">
                <div>
                  <h1>Propriétés (nouveau module)</h1>
                  <p>Route de démo Phase A — composant isolé, à valider visuellement.</p>
                </div>
              </div>
              <div className="immo-panel">
                <PropertiesPanel />
              </div>
            </div>
          </PermissionChecker>
        }
      />
      {/* Phase F preview route — full modular page assembled but NOT */}
      {/* the default. The legacy at /property-management is still served. */}
      {/* Activate this in place of the legacy by swapping the element above. */}
      <Route
        path="/property-management/_new"
        exact
        element={
          <PermissionChecker
            permission={["readAll-propertyManagement", "create-propertyManagement"]}
          >
            <PropertyManagementNew />
          </PermissionChecker>
        }
      />
      {/* Phase B demo route (modular Tenants panel in isolation). */}
      <Route
        path="/property-management/_new/tenants"
        exact
        element={
          <PermissionChecker
            permission={["readAll-propertyManagement", "create-propertyManagement"]}
          >
            <div className="property-management-page immo-page">
              <div className="immo-header">
                <div>
                  <h1>Locataires (nouveau module)</h1>
                  <p>Route de démo Phase B — composant isolé, à valider visuellement.</p>
                </div>
              </div>
              <div className="immo-panel">
                <TenantsPanel />
              </div>
            </div>
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
