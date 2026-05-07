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
          <li key={item?.key} className='menu-item pl-8 py-2 my-1 font-Popins '>
            <div className='flex items-center gap-1 w-full'>
              {/* {item?.icon} */}
              <span className='w-full'>{item?.label}</span>
            </div>
          </li>
        );
      } else if (!item?.permit) {
        content = (
          <li key={item?.key} className='menu-item pl-8 py-2 my-1 font-Popins'>
            <div className='flex items-center gap-1 w-full'>
              {/* {item?.icon} */}
              <span className='w-full'>{item?.label}</span>
            </div>
          </li>
        );
      }

      return content;
    });
  };

  return (
    <ul className='bg-menuBg mx-3'>
      {newItems?.map((item) => {
        // rendering
        let itemContent = null;
        if (item?.hidden) return null;
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
                "py-2 my-1 font-Popins",
                {
                  "pb-0": openSubMenu === item?.key && !collapsed,
                },
                {
                  "menu-item px-4": !item?.children,
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
                    "px-4": item?.children,
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
                    <div className={cn("flex items-center gap-1 w-full")}>
                      {item?.icon}
                      <span className='w-full'>{item?.label}</span>
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
                <ul className='pt-2'>{renderSubMenuItems(item?.children)}</ul>
              )}
            </li>
          );
        } else if (!item?.permit) {
          itemContent = (
            <li
              key={item?.key}
              className={cn(
                "py-2 my-1 font-Popins ",
                {
                  "pb-0": openSubMenu === item?.key && !collapsed,
                },
                {
                  "menu-item px-4": !item?.children,
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
                    "px-4": item?.children,
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
                    <div className={cn("flex items-center gap-1 w-full")}>
                      {item?.icon}
                      <span className='w-full'>{item?.label}</span>
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
                <ul className='pt-2'>{renderSubMenuItems(item?.children)}</ul>
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