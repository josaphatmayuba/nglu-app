import React from "react";
import usePermissions from "../../utils/usePermissions";

const UserPrivateComponent = ({ permission, children }) => {
  const { permissions } = usePermissions();

  if (permissions?.includes(permission)) {
    return <>{children}</>;
  } else {
    return "";
  }
};

export default UserPrivateComponent;
