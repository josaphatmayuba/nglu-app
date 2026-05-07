import { useSelector } from "react-redux";

const usePermissions = () => {
  const { list: permissions, loading } = useSelector((state) => state.auth);

  if (Array.isArray(permissions)) {
    const hasPermission = (myPermissions, operator) => {
      if (!myPermissions) return null;

      if (!Array.isArray(myPermissions)) {
        myPermissions = [myPermissions];
      }

      if (operator === "or") {
        return permissions.some((permission) =>
          myPermissions.includes(permission)
        );
      } else if (operator === "and") {
        return myPermissions.every((permission) =>
          permissions.includes(permission)
        );
      } else {
        return myPermissions.every((permission) =>
          permissions.includes(permission)
        );
      }
    };

    return { loading, permissions, hasPermission };
  }
  return {};
};

export default usePermissions;
