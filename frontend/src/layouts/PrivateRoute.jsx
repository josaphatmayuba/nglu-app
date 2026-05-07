import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute() {

    let auth = localStorage.getItem("isLogged");
    return auth ? <Outlet /> : <Navigate to="/" />;
}
