import ForgetPassword from "@/CustomerUI/ForgetPassword";
import Login from "@/CustomerUI/Login";
import User from "@/CustomerUI/User";
import PasswordChange from "@/eCommerce/CommonSection/PasswordChange";
import Order from "@/eCommerce/Order/Order";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import ButtonHome from "@/eCommerce/Home/ButtonHome";

export default function CustomerRoutes() {
  const isLoggedIn = localStorage.getItem("isLogged");
  return (
    <Routes>
      {isLoggedIn && <Route path="/" element={<Navigate to="/user" />} />}
      <Route index element={<ButtonHome />} key={"index"} />,
      <Route path="/login" element={<Login />} />
      <Route path="/forget-password" element={<ForgetPassword />} />
      <Route path="/forget-password/:token" element={<PasswordChange />} />
      <Route element={<PrivateRoute />}>
        <Route path="/user" element={<User />} />
        <Route path="/order/:id" element={<Order />} />
      </Route>
    </Routes>
  );
}
