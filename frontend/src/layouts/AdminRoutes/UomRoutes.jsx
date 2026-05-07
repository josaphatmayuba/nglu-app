import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllUoM from "@/components/UoM/GetAllUoM";
import DetailsProductAttribute from "@/components/eComErp/ProductAttribute/DetailsProductAttribute";
import GetAllProductAttribute from "@/components/eComErp/ProductAttribute/GetAllProductAttribute";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function UomRoutes() {
  return (
    <Routes>
      <Route
        path="/uom"
        element={
          <PermissionChecker permission={["readAll-uom", "create-uom"]}>
            <GetAllUoM />
          </PermissionChecker>
        }
      />{" "}
      <Route
        path="/product-attribute"
        element={
          <PermissionChecker permission={"readAll-productAttribute"}>
            <GetAllProductAttribute />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-attribute/:id"
        element={
          <PermissionChecker permission={"readSingle-productAttribute"}>
            <DetailsProductAttribute />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
