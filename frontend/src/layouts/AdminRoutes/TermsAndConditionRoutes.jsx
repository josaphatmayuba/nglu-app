import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import DetailsTermsAndConditions from "@/components/TermsAndConditions/DetailsTermsAndConditions";
import GetAllTermsAndConditions from "@/components/TermsAndConditions/GetAllTermsAndConditions";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function TermsAndConditionRoutes() {
  return (
    <Routes>
      <Route
        path="/terms-and-condition"
        element={
          <PermissionChecker
            permission={[
              "readAll-termsAndCondition",
              "create-termsAndCondition",
            ]}>
            <GetAllTermsAndConditions />
          </PermissionChecker>
        }
      />
      <Route
        path="/terms-and-condition/:id"
        element={
          <PermissionChecker permission={"readSingle-termsAndCondition"}>
            <DetailsTermsAndConditions />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
