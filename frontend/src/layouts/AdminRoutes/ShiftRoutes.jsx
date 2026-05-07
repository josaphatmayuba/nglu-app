import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsShift from "@/components/Shift/DetailsShift";
import GetAllShift from "@/components/Shift/GetAllShift";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function ShiftRoutes() {
  return (
    <Routes>
      {" "}
      <Route
        path="/shift"
        element={
          <PermissionChecker permission={["readAll-shift", "create-shift"]}>
            <GetAllShift />
          </PermissionChecker>
        }
      />
      <Route
        path="/shift/:id"
        element={
          <PermissionChecker permission={"readSingle-shift"}>
            <DetailsShift />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
