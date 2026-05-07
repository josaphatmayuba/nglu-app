import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllDesignation from "@/components/designation/GetAllDesignation";
import DetailDesignation from "@/components/designation/detailDesignation";
import UpdateDesignation from "@/components/designation/updateDesignation";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function DesignationRoutes() {
  return (
    <Routes>
      <Route
        path="/designation"
        exact
        element={
          <PermissionChecker
            permission={["readAll-designation", "create-designation"]}>
            <GetAllDesignation />
          </PermissionChecker>
        }
      />
      <Route
        path="/designation/:id"
        element={
          <PermissionChecker permission={"readSingle-designation"}>
            <DetailDesignation />
          </PermissionChecker>
        }
      />
      <Route
        path="/designation/:id/update"
        element={
          <PermissionChecker permission={"update-designation"}>
            <UpdateDesignation />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
