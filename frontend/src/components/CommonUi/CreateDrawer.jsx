import usePermissions from "@/utils/usePermissions";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Drawer, Tooltip } from "antd";
import { useState } from "react";

export default function CreateDrawer({
  title,
  width,
  permission,
  children,
  update,
  color,
  icon = true,
}) {
  // Drawer state
  const [open, setOpen] = useState(false);
  const { permissions } = usePermissions();
  const hasPermission = permissions?.includes(permission);

  const onClose = () => {
    setOpen(false);
  };

  const buttonContent = (
    <div className="flex items-center gap-1 md:gap-2">
      {icon && (
        <span className="flex items-center justify-center gap-1 md:gap-2">
          {update ? <EditOutlined /> : <PlusOutlined />}
        </span>
      )}
      <span className="">{title}</span>
    </div>
  );

  return (
    <>
      {hasPermission ? (
        <>
          <button
            onClick={() => setOpen(true)}
            className={`xs:px-3 px-2 flex items-center gap-1 md:gap-2 md:text-base py-[6px] lg:px-5 border ${
              color ? color : "bg-primary"
            } hover:bg-primary/60 text-white rounded cursor-pointer`}
          >
            {buttonContent}
          </button>
          <Drawer
            width={
              window.innerWidth <= 768 ? "100%" : width ? `${width}%` : "45%"
            }
            title={`${title}`}
            placement="right"
            onClose={onClose}
            open={open}
          >
            <div className="px-5 pt-5">{children}</div>
          </Drawer>
        </>
      ) : (
        <div>
          <Tooltip title="Permission denied">
            <button
              disabled
              className="xs:px-3 px-2 flex items-center gap-1 md:gap-2 md:text-base py-[6px] lg:px-5 border bg-gray-400 text-white rounded cursor-not-allowed opacity-70"
            >
              {buttonContent}
            </button>
          </Tooltip>
        </div>
      )}
    </>
  );
}
