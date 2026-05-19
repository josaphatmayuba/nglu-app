import AccountingPage from "@/components/Accounting/AccountingPage";
import { Route, Routes } from "react-router-dom";

export default function AccountingRoutes() {
  return (
    <Routes>
      <Route path="/accounting" element={<AccountingPage />} />
    </Routes>
  );
}
