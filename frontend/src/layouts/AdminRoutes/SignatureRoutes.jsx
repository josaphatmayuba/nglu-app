import SignatureRequestList from "@/components/signatures/SignatureRequestList";
import React from "react";
import { Route, Routes } from "react-router-dom";

export default function SignatureRoutes() {
  return (
    <Routes>
      <Route path="/signature-requests" element={<SignatureRequestList />} />
    </Routes>
  );
}
