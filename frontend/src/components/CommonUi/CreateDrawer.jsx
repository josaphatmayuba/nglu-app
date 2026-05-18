import { cn } from "@/utils/functions";
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
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer",
              color
            )}
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
              className="flex items-center gap-2 px-3 py-1.5 bg-ink-300 text-white rounded-lg text-sm font-medium cursor-not-allowed opacity-70"
            >
              {buttonContent}
            </button>
          </Tooltip>
        </div>
      )}
    </>
  );
}
