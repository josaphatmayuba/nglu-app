import Menu from "@/UI/Menu";
import { Popover } from "antd";
import { BsThreeDots } from "react-icons/bs";

const ResponsiveMobileCard = ({ item, columns }) => {
    // Find the action column
    const actionColumn = columns.find((col) => col.key === "action");

    // Filter out only action columns for display (keep csvOff columns for mobile view)
    const displayColumns = columns.filter((col) => col.key !== "action");

    const renderValue = (item, column) => {
        if (
            column?.dataIndex &&
            Object.prototype.hasOwnProperty.call(item, column?.dataIndex)
        ) {
            if (column.render) {
                return column.render(item[column?.dataIndex], item) || "-";
            } else if (typeof item[column?.dataIndex] === "number") {
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
        <div className="bg-white border border-ink-200 rounded-xl p-4 sm:p-5 hover:border-ink-300 hover:shadow-sm transition w-full overflow-hidden">
            {/* Header with action menu */}
            <div className="flex flex-wrap justify-between items-start mb-3 pb-3 border-b border-ink-100 gap-3">
                <div className="flex-1 min-w-0">
                    {/* Primary field (usually first non-ID field) */}
                    {displayColumns[1] && (
                        <h3 className="font-semibold text-base text-ink-900 break-words">
                            {renderValue(item, displayColumns[1])}
                        </h3>
                    )}
                    {/* Secondary field (usually ID or second field) */}
                    {displayColumns[0] && (
                        <p className="text-xs text-ink-500 mt-1 break-words">
                            {displayColumns[0].title}: {renderValue(item, displayColumns[0])}
                        </p>
                    )}
                </div>

                {/* Action menu */}
                {actionColumn && (
                    <div className="flex-shrink-0">
                        <Popover
                            content={<Menu items={actionColumn.render(item)} />}
                            placement="bottomRight"
                            arrow={false}
                            trigger="click">
                            <button className="p-2 hover:bg-ink-100 rounded-md transition-colors">
                                <BsThreeDots className="text-lg text-ink-500" />
                            </button>
                        </Popover>
                    </div>
                )}
            </div>

            {/* Card content - remaining fields */}
            <div className="space-y-2">
                {displayColumns.slice(2).map((column) => (
                    <div
                        key={column.key}
                        className="flex flex-wrap justify-between items-start gap-3">
                        <span className="text-xs text-ink-500 font-medium min-w-[120px] flex-shrink-0 break-words">
                            {column.title}:
                        </span>
                        <span className="text-sm text-ink-700 text-right flex-1 min-w-0 break-words">
                            {renderValue(item, column)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResponsiveMobileCard;