import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsEmploymentStatus from "@/components/employmentStatus/DetailsEmploymentStatus";
import GetEmploymentStatus from "@/components/employmentStatus/GetEmploymentStatus";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function EmploymentRoutes() {
  return (
    <Routes>
      {" "}
      <Route
        path="/employment-status"
        element={
          <PermissionChecker
            permission={[
              "readAll-employmentStatus",
              "create-employmentStatus",
            ]}>
            <GetEmploymentStatus />
          </PermissionChecker>
        }
      />
      <Route
        path="/employment-status/:id"
        element={
          <PermissionChecker permission={"readSingle-employmentStatus"}>
            <DetailsEmploymentStatus />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
