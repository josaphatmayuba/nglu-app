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
    "text-ink-700 text-xs sm:text-sm",
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
        className="bg-white overflow-x-auto overflow-y-auto p-0 rounded-lg"
      >
        <table style={tableStyle} className={tableClass}>
          {/* Header */}
          <thead
            className={cn(
              "bg-ink-50 text-ink-500 uppercase text-[10px] sm:text-xs tracking-wider border-b border-ink-200 sticky top-0 z-10",
              { [headClass]: headClass }
            )}
          >
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key ?? index}
                  className={cn(
                    "py-2.5 sm:py-3 px-2 sm:px-4 text-left font-medium align-middle whitespace-nowrap"
                  )}
                >
                  <span>{column.title || null}</span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body (data rows) */}
          {!loading && data?.length > 0 && (
            <tbody className={cn("bg-white divide-y divide-ink-100", { [className]: className })}>
              {data.map((item, index) => (
                <tr
                  key={`row-${index}`}
                  className="hover:bg-ink-50 transition-colors"
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
                        "py-2.5 sm:py-3 px-2 sm:px-4 align-middle text-ink-700 text-xs sm:text-sm whitespace-nowrap break-words",
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
            <tbody className="animate-pulse divide-y divide-ink-100">
              {Array.from({ length: loadingUiSize }).map((_, rIdx) => (
                <tr key={`sk-row-${rIdx}`}>
                  {columns.map((column, cIdx) => (
                    <td
                      key={`sk-cell-${rIdx}-${cIdx}`}
                      style={{
                        minWidth:
                          toNumber(column?.minWidth) ??
                          toNumber(column?.width) ??
                          undefined,
                      }}
                      className="py-2.5 sm:py-3 px-2 sm:px-4 align-middle"
                    >
                      <div className="h-3 sm:h-4 w-[70%] bg-ink-100 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {/* Empty State */}
        {!data?.length && !loading && (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mb-3">
              <BsDatabaseExclamation className="text-ink-400" size={22} />
            </div>
            <h4 className="text-sm md:text-base font-medium text-ink-700">
              No Records Found
            </h4>
            <p className="text-ink-500 text-xs md:text-sm mt-1">
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
