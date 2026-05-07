import PrintBarCode from "@/components/PrintBarCode/PrintBarCode";
import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllPrintPage from "@/components/printPageSettings/GetAllPrintPage";
import AddProduct from "@/components/product/AddProduct";
import DetailsProduct from "@/components/product/DetailsProduct";
import GetAllProduct from "@/components/product/GetAllProduct";
import ProductReport from "@/components/product/ProductReport";
import ImportFromCSV from "@/components/product/UploadMany";
import UpdateProduct from "@/components/product/updateProd";
import ProductSortList from "@/components/productSortList/ProductSortList";
import { Route, Routes } from "react-router-dom";

export default function ProductRoutes() {
  return (
    <Routes>
      <Route
        path="/product"
        exact
        element={
          <PermissionChecker permission={["readAll-product", "create-product"]}>
            <GetAllProduct />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-report"
        exact
        element={
          <PermissionChecker permission={"readAll-product"}>
            <ProductReport />
          </PermissionChecker>
        }
      />

      <Route
        path="/add-product"
        exact
        element={
          <PermissionChecker permission={"create-product"}>
            <AddProduct />
          </PermissionChecker>
        }
      />

      <Route
        path="/product/:id"
        element={
          <PermissionChecker permission={"readSingle-product"}>
            <DetailsProduct />
          </PermissionChecker>
        }
      />

      <Route
        path="/import-product"
        exact
        element={
          <PermissionChecker permission={"create-product"}>
            <ImportFromCSV urlPath={"product"} title="Product" />
          </PermissionChecker>
        }
      />

      <Route
        path="/product/:id/update"
        element={
          <PermissionChecker permission={"update-product"}>
            <UpdateProduct />
          </PermissionChecker>
        }
      />
      <Route
        path="/product-sort-list"
        element={
          <PermissionChecker permission={"readAll-product"}>
            <ProductSortList />
          </PermissionChecker>
        }
      />
      <Route
        path="/print-barcode/:id"
        element={
          <PermissionChecker permission={"readSingle-product"}>
            <PrintBarCode />
          </PermissionChecker>
        }
      />
      <Route
        path="/print-page-setting"
        exact
        element={
          <PermissionChecker permission={"readAll-pageSize"}>
            <GetAllPrintPage />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
