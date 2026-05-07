import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import CustomerReport from "@/components/customer/CustomerReport";
import DetailCustomer from "@/components/customer/DetailCustomer";
import GetAllCustomer from "@/components/customer/GetAllCustomer";
import UpdateCustomer from "@/components/customer/UpdateCustomer";
import CustomerLogin from "@/components/user/CustomerLogin";
import CustomerLogout from "@/components/user/CustomerLogout";
import CustomerRegistration from "@/components/user/CustomerRegister";
import { Route, Routes } from "react-router-dom";

export default function CustomerRoutes() {
  return (
    <Routes>
      <Route
        path="/customer"
        exact
        element={
          <PermissionChecker
            permission={["readAll-customer", "create-customer"]}>
            <GetAllCustomer />
          </PermissionChecker>
        }
      />
      <Route
        path="/customer-report"
        exact
        element={
          <PermissionChecker permission={"readAll-customer"}>
            <CustomerReport />
          </PermissionChecker>
        }
      />
      <Route
        path="/customer/:id"
        element={
          <PermissionChecker permission={"readSingle-customer"}>
            <DetailCustomer />
          </PermissionChecker>
        }
      />
      <Route
        path="/customer/:id/update"
        element={
          <PermissionChecker permission={"update-customer"}>
            <UpdateCustomer />
          </PermissionChecker>
        }
      />
      <Route path="/customer/register" element={<CustomerRegistration />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer/logout" element={<CustomerLogout />} />
    </Routes>
  );
}
