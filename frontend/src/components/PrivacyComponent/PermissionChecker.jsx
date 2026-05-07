import usePermissions from "../../utils/usePermissions";

export default function PermissionChecker({ children, permission }) {
  const { permissions, hasPermission } = usePermissions();

  if (permissions) {
    if (hasPermission(permission, "or")) {
      return children;
    } else {
      return (
        <div className='w-full h-full flex justify-center items-center text-base text-gray-500 font-medium'>
          You are not validate user for this page content
        </div>
      );
    }
  }
}
