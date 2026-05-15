import { useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { cn } from "../utils/functions";

export default function Menu({
  items,
  className,
  permissions,
  collapsed,
  setCollapsed,
}) {
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const newItems = items?.filter(Boolean) || [];
  const handleSubMenuClick = (subMenuKey) => {
    setOpenSubMenu((prev) => (prev === subMenuKey ? null : subMenuKey));
    if (collapsed) {
      setCollapsed(false);
    }
  };

  const renderSubMenuItems = (subMenu) => {
    return subMenu?.map((item) => {
      let content = null;
      if (item?.hidden) return null;
      if (
        item?.permit &&
        hasPermission(
          permissions,
          item.permit?.permissions,
          item.permit?.operator
        )
      ) {
        content = (
          <li key={item?.key} className='menu-item my-1 py-2 pl-4 pr-2 font-Popins text-sm'>
            <div className='flex items-center gap-2 w-full'>
              <span className='w-4 shrink-0 text-ink-400'>{item?.icon}</span>
              <span className='w-full truncate'>{item?.label}</span>
            </div>
          </li>
        );
      } else if (!item?.permit) {
        content = (
          <li key={item?.key} className='menu-item my-1 py-2 pl-4 pr-2 font-Popins text-sm'>
            <div className='flex items-center gap-2 w-full'>
              <span className='w-4 shrink-0 text-ink-400'>{item?.icon}</span>
              <span className='w-full truncate'>{item?.label}</span>
            </div>
          </li>
        );
      }

      return content;
    });
  };

  return (
    <ul className='mx-3 space-y-1'>
      {newItems?.map((item) => {
        // rendering
        let itemContent = null;
        if (item?.hidden) return null;
        if (item?.type === "section") {
          if (collapsed) return null;
          return (
            <li
              key={item?.key || item?.label}
              className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 first:pt-1"
            >
              {item?.label}
            </li>
          );
        }
        if (
          item?.permit &&
          hasPermission(
            permissions,
            item.permit.permissions,
            item.permit.operator
          )
        ) {
          itemContent = (
            <li
              key={item?.key}
              className={cn(
                "py-2 font-Popins text-sm",
                {
                  "pb-0": openSubMenu === item?.key && !collapsed,
                },
                {
                  "menu-item px-3": !item?.children,
                },
                {
                  "menu-item-with-children": item?.children,
                }
              )}
            >
              <div
                onClick={() => item?.children && handleSubMenuClick(item?.key)}
                className={cn(
                  "cursor-pointer flex justify-between",
                  {
                    "px-3": item?.children,
                  },
                  {
                    "justify-start items-center ml-2 max-h-5 ": collapsed,
                  }
                )}
              >
                {collapsed ? (
                  <>
                    <span className='text-lg flex items-center'>
                      {item?.icon}
                    </span>
                    <span className='w-full opacity-0'>{item?.label}</span>
                  </>
                ) : (
                  <>
                    <div className={cn("flex items-center gap-3 w-full min-w-0")}>
                      <span className="w-4 shrink-0 text-ink-500">{item?.icon}</span>
                      <span className='w-full truncate'>{item?.label}</span>
                    </div>
                    {item?.children && (
                      <span className='ml-auto text-gray-400'>
                        {openSubMenu === item?.key ? (
                          <IoIosArrowUp />
                        ) : (
                          <IoIosArrowDown />
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
              {openSubMenu === item?.key && !collapsed && item?.children && (
                <ul className='ml-3 border-l border-ink-100 pt-1'>{renderSubMenuItems(item?.children)}</ul>
              )}
            </li>
          );
        } else if (!item?.permit) {
          itemContent = (
            <li
              key={item?.key}
              className={cn(
                "py-2 font-Popins text-sm",
                {
                  "pb-0": openSubMenu === item?.key && !collapsed,
                },
                {
                  "menu-item px-3": !item?.children,
                },
                {
                  "menu-item-with-children": item?.children,
                },
                {
                  "flex items-center": collapsed,
                }
              )}
            >
              <div
                onClick={() => item?.children && handleSubMenuClick(item?.key)}
                className={cn(
                  "cursor-pointer flex justify-between",
                  {
                    "px-3": item?.children,
                  },
                  {
                    "justify-start items-center ml-4 max-h-5": collapsed,
                  }
                )}
              >
                {collapsed ? (
                  <>
                    <span className='text-lg flex items-center'>
                      {item?.icon}
                    </span>
                    <span className='w-full opacity-0'>{item?.label}</span>
                  </>
                ) : (
                  <>
                    <div className={cn("flex items-center gap-3 w-full min-w-0")}>
                      <span className="w-4 shrink-0 text-ink-500">{item?.icon}</span>
                      <span className='w-full truncate'>{item?.label}</span>
                    </div>
                    {item?.children && (
                      <span className='ml-auto text-gray-400'>
                        {openSubMenu === item?.key ? (
                          <IoIosArrowUp />
                        ) : (
                          <IoIosArrowDown />
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
              {openSubMenu === item?.key && item?.children && !collapsed && (
                <ul className='ml-3 border-l border-ink-100 pt-1'>{renderSubMenuItems(item?.children)}</ul>
              )}
            </li>
          );
        }

        return itemContent;
      })}
    </ul>
  );
}

function hasPermission(permissions, myPermissions, operator) {
  if (!myPermissions || !Array.isArray(permissions)) {
    return false;
  }

  if (!Array.isArray(myPermissions)) {
    myPermissions = [myPermissions];
  }

  if (operator === "or") {
    return permissions.some((permission) => myPermissions.includes(permission));
  } else if (operator === "and") {
    return myPermissions.every((permission) =>
      permissions.includes(permission)
    );
  } else {
    return myPermissions.every((permission) =>
      permissions.includes(permission)
    );
  }
}
