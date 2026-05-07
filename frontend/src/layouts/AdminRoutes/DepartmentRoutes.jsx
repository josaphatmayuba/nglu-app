import DetailsDepartment from "@/components/Department/DetailsDepartment";
import GetAllDepartment from "@/components/Department/GetAllDepartment";
import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function DepartmentRoutes() {
  return (
    <Routes>
      <Route
        path="/department"
        element={
          <PermissionChecker
            permission={["readAll-department", "create-department"]}>
            <GetAllDepartment />
          </PermissionChecker>
        }
      />
      <Route
        path="/department/:id"
        element={
          <PermissionChecker permission={"readSingle-department"}>
            <DetailsDepartment />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
