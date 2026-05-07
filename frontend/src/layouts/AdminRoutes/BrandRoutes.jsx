import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailProductBrand from "@/components/productBrand/detailProductBrand";
import ProductBrand from "@/components/productBrand/productBrand";
import UpdateProductBrand from "@/components/productBrand/updateProductBrand";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function BrandRoutes() {
  return (
    <Routes>
      <Route
        path="/product-brand"
        exact
        element={
          <PermissionChecker
            permission={["readAll-productBrand", "create-productBrand"]}>
            <ProductBrand />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-brand/:id"
        element={
          <PermissionChecker permission={"readSingle-productBrand"}>
            <DetailProductBrand />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-brand/:id/update"
        element={
          <PermissionChecker permission={"update-productBrand"}>
            <UpdateProductBrand />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
