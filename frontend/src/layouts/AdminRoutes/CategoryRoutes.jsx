import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailProductCategory from "@/components/productCategory/detailProductCategory";
import ProductCategory from "@/components/productCategory/productCategory";
import UpdateProductCategory from "@/components/productCategory/updateProductCategory";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function CategoryRoutes() {
  return (
    <Routes>
      {" "}
      <Route
        path="/product-category"
        exact
        element={
          <PermissionChecker
            permission={["readAll-productCategory", "create-productCategory"]}>
            <ProductCategory />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-category/:id"
        element={
          <PermissionChecker permission={"readSingle-productCategory"}>
            <DetailProductCategory />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-category/:id/update"
        element={
          <PermissionChecker permission={"update-productCategory"}>
            <UpdateProductCategory />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
