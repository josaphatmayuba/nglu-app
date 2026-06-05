import { Navigate, Outlet } from "react-router-dom";
import { hasValidAdminSession } from "../utils/authSession";

export default function PrivateRoute() {
    return hasValidAdminSession() ? <Outlet /> : <Navigate to="/admin/auth/login" replace />;
}
