import Loader from "@/components/loader/loader";
import { Suspense, lazy } from "react";
import SettingRoutes from "./AdminRoutes/SettingRoutes";

const ProductRoutes = lazy(() => import("./AdminRoutes/ProductRoutes"));
const SupplierRoutes = lazy(() => import("./AdminRoutes/SupplierRoutes"));
const CategoryRoutes = lazy(() => import("./AdminRoutes/CategoryRoutes"));
const SubCategoryRoutes = lazy(() => import("./AdminRoutes/SubCategoryRoutes"));
const BrandRoutes = lazy(() => import("./AdminRoutes/BrandRoutes"));
const VatTaxRoutes = lazy(() => import("./AdminRoutes/VatTaxRoutes"));
const ColorRoutes = lazy(() => import("./AdminRoutes/ColorRoutes"));
const PurchaseRoutes = lazy(() => import("./AdminRoutes/PurchaseRoutes"));
const CustomerRoutes = lazy(() => import("./AdminRoutes/CustomerRoutes"));
const SaleRoutes = lazy(() => import("./AdminRoutes/SaleRoutes"));
const TransactionRoutes = lazy(() => import("./AdminRoutes/TransactionRoutes"));
const TransactionTypeRoutes = lazy(() => import("./AdminRoutes/TransactionTypeRoutes"));
const PropertyManagementRoutes = lazy(() => import("./AdminRoutes/PropertyManagementRoutes"));
const StaffRoutes = lazy(() => import("./AdminRoutes/StaffRoutes"));
const RoleRoutes = lazy(() => import("./AdminRoutes/RoleRoutes"));
const AccountRoutes = lazy(() => import("./AdminRoutes/AccountRoutes"));
const DesignationRoutes = lazy(() => import("./AdminRoutes/DesignationRoutes"));
const TermsAndConditionRoutes = lazy(() =>
  import("./AdminRoutes/TermsAndConditionRoutes")
);
const DepartmentRoutes = lazy(() => import("./AdminRoutes/DepartmentRoutes"));
const ShiftRoutes = lazy(() => import("./AdminRoutes/ShiftRoutes"));
const HrExtraRoutes = lazy(() => import("./AdminRoutes/HrExtraRoutes"));
const EmploymentRoutes = lazy(() => import("./AdminRoutes/EmploymentRoutes"));
const OrderRoutes = lazy(() => import("./AdminRoutes/OrderRoutes"));
const CourierMediumRoutes = lazy(() =>
  import("./AdminRoutes/CourierMediumRoutes")
);
const PaymentRoutes = lazy(() => import("./AdminRoutes/PaymentRoutes"));
const UomRoutes = lazy(() => import("./AdminRoutes/UomRoutes"));
const CommonRoutes = lazy(() => import("./AdminRoutes/CommonRoutes"));
const AccountingRoutes = lazy(() => import("./AdminRoutes/AccountingRoutes"));

export default function AdminRoutes() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <ProductRoutes />
        <SettingRoutes />
        <SupplierRoutes />
        <CategoryRoutes />
        <SubCategoryRoutes />
        <BrandRoutes />
        <VatTaxRoutes />
        <ColorRoutes />
        <PurchaseRoutes />
        <CustomerRoutes />
        <SaleRoutes />
        {/* <AdjustInventoryRoutes /> */}
        <TransactionRoutes />
        <TransactionTypeRoutes />
        <PropertyManagementRoutes />
        <StaffRoutes />
        <RoleRoutes />
        <AccountRoutes />
        <DesignationRoutes />
        <TermsAndConditionRoutes />
        <DepartmentRoutes />
        <ShiftRoutes />
        <HrExtraRoutes />
        <EmploymentRoutes />
        <OrderRoutes />
        <CourierMediumRoutes />
        <PaymentRoutes />
        <UomRoutes />
        <CommonRoutes />
        <AccountingRoutes />
      </Suspense>
    </>
  );
}
