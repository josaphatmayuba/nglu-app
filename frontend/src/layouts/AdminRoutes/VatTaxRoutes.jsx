import PermissionChecker from '@/components/PrivacyComponent/PermissionChecker';
import VatTax from '@/components/vatTax/VatTax';
import React from 'react'
import { Route, Routes } from 'react-router-dom';

export default function VatTaxRoutes() {
  return (
    <Routes>
      <Route
        path="/vat-tax"
        exact
        element={
          <PermissionChecker permission={"create-vat"}>
            <VatTax />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
