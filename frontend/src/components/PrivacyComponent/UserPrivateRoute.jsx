import { Navigate, Outlet } from "react-router-dom";
import usePermissions from "../../utils/usePermissions";

const UserPrivateRoute = ({ path, permission, ...props }) => {
  const {permissions} = usePermissions();

  if (permissions?.includes(permission)) {
    return <Outlet />;
  } else {
    return <Navigate to='/admin/auth/login' />;
  }
};

export default UserPrivateRoute;
