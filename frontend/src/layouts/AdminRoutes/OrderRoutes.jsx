import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsOrder from "@/components/eComErp/Order/DetailsOrder";
import GetAllOrder from "@/components/eComErp/Order/GetAllOrder";
import GetAllResendReturnOrder from "@/components/eComErp/ResenReturnOrder/GetAllResendReturnOrder";
import DetailsReturnOrder from "@/components/eComErp/ReturnOrder/DetailsReturnOrder";
import GetAllReturnOrder from "@/components/eComErp/ReturnOrder/GetAllReturnOrder";
import ReturnOrderReport from "@/components/eComErp/ReturnOrder/ReturnOrderReport";
import GetAllReview from "@/components/eComErp/Review/GetAllReview";
import { Route, Routes } from "react-router-dom";

export default function OrderRoutes() {
  return (
    <Routes>
      <Route
        path="/order"
        element={
          <PermissionChecker
            permission={["readAll-cartOrder", "create-cartOrder"]}>
            <GetAllOrder />
          </PermissionChecker>
        }
      />
      <Route
        path="/return-order-report"
        element={
          <PermissionChecker permission={"readAll-cartOrder"}>
            <ReturnOrderReport />
          </PermissionChecker>
        }
      />
      <Route
        path="/order/:id"
        element={
          <PermissionChecker permission={"readSingle-cartOrder"}>
            <DetailsOrder />
          </PermissionChecker>
        }
      />
      <Route
        path="/return-order"
        element={
          <PermissionChecker permission={"readAll-returnCartOrder"}>
            <GetAllReturnOrder />
          </PermissionChecker>
        }
      />
      <Route
        path="/return-order/:id"
        element={
          <PermissionChecker permission={"readSingle-returnCartOrder"}>
            <DetailsReturnOrder />
          </PermissionChecker>
        }
      />
      <Route
        path="/resend-return-order"
        element={
          <PermissionChecker permission={"readAll-cartOrder"}>
            <GetAllResendReturnOrder />
          </PermissionChecker>
        }
      />
      <Route
        path="/review"
        element={
          <PermissionChecker permission={"readAll-review"}>
            <GetAllReview />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
