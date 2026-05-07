import { Popover } from "antd";
import { BsDatabaseExclamation, BsThreeDots } from "react-icons/bs";
import { cn } from "../utils/functions";
import Menu from "./Menu";
import usePermissions from "@/utils/usePermissions";

const Table = ({
  columns,
  data,
  loading = false,
  loadingUiSize = 5,
  scroll = {},
  className,
  headClass,
  actionPermission,
}) => {
  const autoFitThreshold = 2024;

  // Estimate only from provided widths/minWidths (no defaults)
  const estimatedWidth = (columns || []).reduce((sum, col) => {
    const w = toNumber(col?.minWidth) ?? toNumber(col?.width) ?? 0;
    return sum + w;
  }, 0);

  const forceMinWidth = scroll?.x != null ? toNumber(scroll.x) : null;
  const isOverflow = forceMinWidth ? true : estimatedWidth > autoFitThreshold;

  const tableClass = cn(
    "text-slate-700 text-xs sm:text-sm md:text-base",
    isOverflow ? "min-w-max" : "w-full table-auto"
  );

  const tableStyle = {
    minWidth: forceMinWidth ? `${forceMinWidth}px` : undefined,
  };

  const maxHeight = scroll?.y != null ? `${toNumber(scroll.y)}px` : "auto";

  const renderItem = (item, column) => {
    if (column?.key === "action" && column?.render) {
      return (
        <PermissionChecker permission={actionPermission}>
          <Popover
            content={<Menu items={column.render(item)} />}
            placement="bottomRight"
            arrow={false}
            trigger="click"
          >
            <BsThreeDots className="cursor-pointer text-slate-500 hover:text-slate-800 transition text-base sm:text-lg" />
          </Popover>
        </PermissionChecker>
      );
    } else if (
      column?.dataIndex &&
      Object.prototype.hasOwnProperty.call(item, column?.dataIndex)
    ) {
      if (column.render)
        return column.render(item[column?.dataIndex], item) || "-";
      else if (typeof item[column?.dataIndex] === "number") {
        return item[column?.dataIndex];
      } else {
        return item[column?.dataIndex] ? item[column?.dataIndex] : "-";
      }
    } else if (column.render && !column?.dataIndex) {
      return column.render(item) || "-";
    }
    return "-";
  };

  return (
    <div className="tableContainer tableScrollBar w-full overflow-x-auto">
      <div
        style={{ maxHeight }}
        className="shadow-sm bg-white overflow-x-auto overflow-y-auto p-0"
      >
        <table style={tableStyle} className={tableClass}>
          {/* Header */}
          <thead
            className={cn(
              "bg-white rounded-lg text-slate-600 uppercase text-[8px] sm:text-[10px] md:text-xs tracking-wider border-t border-b border-slate-200 sticky top-0 z-10",
              { [headClass]: headClass }
            )}
          >
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key ?? index}
                  className={cn(
                    "py-1 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4 text-left font-semibold align-middle whitespace-nowrap"
                  )}
                >
                  <span>{column.title || null}</span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body (data rows) */}
          {!loading && data?.length > 0 && (
            <tbody className={cn("bg-white transition-all duration-200", { [className]: className })}>
              {data.map((item, index) => (
                <tr
                  key={`row-${index}`}
                  className={cn(
                    "border-slate-200",
                    { "bg-slate-50/50": index % 2 === 1 }
                  )}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key ?? colIndex}
                      style={{
                        minWidth:
                          toNumber(column?.minWidth) ??
                          toNumber(column?.width) ??
                          undefined,
                      }}
                      className={cn(
                        "py-1 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4 align-middle text-slate-700 text-[10px] sm:text-[11px] md:text-sm whitespace-nowrap break-words",
                        {
                          "rounded-bl-lg":
                            index === data.length - 1 && colIndex === 0,
                        },
                        {
                          "rounded-br-lg":
                            index === data.length - 1 &&
                            colIndex === columns.length - 1,
                        },
                        { [column.tdClass]: column.tdClass }
                      )}
                    >
                      <div>{renderItem(item, column)}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {/* Column-wise Skeleton Rows (loading) */}
          {loading && (
            <tbody className="animate-pulse">
              {Array.from({ length: loadingUiSize }).map((_, rIdx) => (
                <tr
                  key={`sk-row-${rIdx}`}
                  className={cn(
                    "border-b border-slate-200",
                    { "bg-slate-50/50": rIdx % 2 === 1 }
                  )}
                >
                  {columns.map((column, cIdx) => (
                    <td
                      key={`sk-cell-${rIdx}-${cIdx}`}
                      style={{
                        minWidth:
                          toNumber(column?.minWidth) ??
                          toNumber(column?.width) ??
                          undefined,
                      }}
                      className="py-1 sm:py-2 md:py-3 px-1 sm:px-2 md:px-4 align-middle"
                    >
                      <div className="h-2 sm:h-3 md:h-4 w-[70%] bg-slate-200 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {/* Empty State */}
        {!data?.length && !loading && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 text-center px-2 sm:px-4">
            <BsDatabaseExclamation className="text-slate-300" size={40} sm:size={50} md:size={60} />
            <h4 className="mt-2 text-xs sm:text-sm md:text-lg font-medium text-slate-500">
              No Records Found
            </h4>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Table;

function PermissionChecker({ children, permission }) {
  const { permissions, hasPermission } = usePermissions();

  if (permissions && permission) {
    if (hasPermission(permission, "or")) {
      return children;
    } else {
      return null;
    }
  } else {
    return children;
  }
}

/** Utils */
function toNumber(v) {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
