import PermissionChecker from "@/components/PrivacyComponent/PermissionChecker";
import GetAllStaff from "@/components/user/GetAllStaff";
import DetailStaff from "@/components/user/detailsStaff";
import UpdateStaff from "@/components/user/updateStaff";
import { Route, Routes } from "react-router-dom";

export default function StaffRoutes() {
  return (
    <Routes>
      <Route
        path="/hr/staffs"
        exact
        element={
          <PermissionChecker permission={["readAll-user", "create-user"]}>
            <GetAllStaff />
          </PermissionChecker>
        }
      />
      <Route
        path="/hr/staffs/:id"
        exact
        element={
          <PermissionChecker permission={"readSingle-user"}>
            <DetailStaff />
          </PermissionChecker>
        }
      />
      <Route
        path="/hr/staffs/:id/update"
        element={
          <PermissionChecker permission={"update-user"}>
            <UpdateStaff />
          </PermissionChecker>
        }
      />
    </Routes>
  );
}
