import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import AddPermission from "@/components/role/AddPermission";
import DetailRole from "@/components/role/DetailsRole";
import GetAllRole from "@/components/role/GetAllRole";
import RoleList from "@/components/role/GetAllRole";
import { Route, Routes } from "react-router-dom";

export default function RoleRoutes() {
  return (
    <Routes>
      <Route
        path="/role"
        exact
        element={
          <PermissionChecker permission={["readAll-role", "create-role"]}>
            <GetAllRole />
          </PermissionChecker>
        }
      />
      <Route
        path="/role/:id"
        element={
          <PermissionChecker permission={"readSingle-role"}>
            <DetailRole />
          </PermissionChecker>
        }
      />
      <Route
        path="/role/permit/:id/"
        element={
          <PermissionChecker permission={"update-permission"}>
            <AddPermission />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
