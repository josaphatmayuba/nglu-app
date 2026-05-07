import GetAllAdjustInventory from '@/components/AdjustInventory/GetAllAdjustInventory';
import GetDetailsAdjustInventory from '@/components/AdjustInventory/GetDetailsAdjustInventory';
import PermissionChecker from '@/components/PrivacyComponent/PermissionChecker';
import React from 'react'
import { Route, Routes } from 'react-router-dom'

export default function AdjustInventoryRoutes() {
  return (
    <Routes>
      <Route
        path="/adjust-inventory"
        exact
        element={
          <PermissionChecker permission={"readAll-adjust"}>
            <GetAllAdjustInventory />
          </PermissionChecker>
        }
      />
      <Route
        path="/adjust-inventory/:id"
        exact
        element={
          <PermissionChecker permission={"readSingle-adjust"}>
            <GetDetailsAdjustInventory />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
