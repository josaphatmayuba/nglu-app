import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsCourier from "@/components/eComErp/CourierMedium/DetailsCourier";
import GetAllCourier from "@/components/eComErp/CourierMedium/GetAllCourier";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function CourierMediumRoutes() {
  return (
    <Routes>
      <Route
        path="/courier-medium"
        element={
          <PermissionChecker permission={["readAll-courier", "create-courier"]}>
            <GetAllCourier />
          </PermissionChecker>
        }
      />
      <Route
        path="/courier-medium/:id"
        element={
          <PermissionChecker permission={"readSingle-courier"}>
            <DetailsCourier />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
