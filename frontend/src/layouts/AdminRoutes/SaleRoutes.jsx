import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import SaleReturnList from "@/components/SaleReturnList/SaleReturnList";
import SingleSaleInvoice from "@/components/SaleReturnList/SingleSaleInvoice";
import Pos from "@/components/pos/pos";
import AddSale from "@/components/sale/AddSale";
import SaleReport from "@/components/sale/SaleReport";
import AddReturnSale from "@/components/sale/addReturnSale";
import DetailSale from "@/components/sale/detailSale";
import GetAllSale from "@/components/sale/getAllSale";
import AddQuote from "@/components/quote/AddQuote";
import DetailQuote from "@/components/quote/DetailQuote";
import GetAllQuote from "@/components/quote/GetAllQuote";
import ReportsHub from "@/components/reports/ReportsHub";
// import InvoiceSetting from "@/components/settings/invoiceSetting";s
import { Route, Routes } from "react-router-dom";

export default function SaleRoutes() {
  return (
    <Routes>
      <Route
        path="/sale"
        exact
        element={
          <PermissionChecker
            permission={["readAll-saleInvoice", "create-saleInvoice"]}
          >
            <GetAllSale />
          </PermissionChecker>
        }
      />
      <Route
        path="/sale/add"
        element={
          <PermissionChecker permission={"readSingle-saleInvoice"}>
            <AddSale />
          </PermissionChecker>
        }
      />
      <Route
        path="/sale/:id"
        element={
          <PermissionChecker permission={"readSingle-saleInvoice"}>
            <DetailSale />
          </PermissionChecker>
        }
      />
      <Route
        path="/quote"
        exact
        element={
          <PermissionChecker permission={["readAll-quote", "create-quote"]}>
            <GetAllQuote />
          </PermissionChecker>
        }
      />
      <Route
        path="/quote/add"
        element={
          <PermissionChecker permission={"create-quote"}>
            <AddQuote />
          </PermissionChecker>
        }
      />
      <Route
        path="/quote/:id"
        element={
          <PermissionChecker permission={"readSingle-quote"}>
            <DetailQuote />
          </PermissionChecker>
        }
      />
      <Route
        path="/reports"
        element={<ReportsHub />}
      />
      <Route
        path="/sale-report"
        element={
          <PermissionChecker permission={"readAll-saleInvoice"}>
            <SaleReport />
          </PermissionChecker>
        }
      />

      <Route
        path="/sale/return/:id"
        element={
          <PermissionChecker permission={"create-returnSaleInvoice"}>
            <AddReturnSale />
          </PermissionChecker>
        }
      />
      <Route
        path="/sale-return-list"
        element={
          <PermissionChecker permission={"readAll-returnSaleInvoice"}>
            <SaleReturnList />
          </PermissionChecker>
        }
      />
      <Route
        path="/sale-return-list/:id"
        element={
          <PermissionChecker permission={"readSingle-returnSaleInvoice"}>
            <SingleSaleInvoice />
          </PermissionChecker>
        }
      />
      <Route
        path="/pos"
        exact
        element={
          <PermissionChecker permission={"readAll-saleInvoice"}>
            <Pos />
          </PermissionChecker>
        }
      />
      {/* <Route
        path="/company-setting"
        exact
        element={
          <PermissionChecker permission={"readAll-setting"}>
            <InvoiceSetting />
          </PermissionChecker>
        }
      /> */}
    </Routes>
  );
}
