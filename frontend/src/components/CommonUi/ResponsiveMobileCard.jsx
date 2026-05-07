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
        <div className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow w-full overflow-hidden">
            {/* Header with action menu */}
            <div className="flex flex-wrap justify-between items-start mb-3 pb-3 border-b border-gray-100 gap-3">
                <div className="flex-1 min-w-0">
                    {/* Primary field (usually first non-ID field) */}
                    {displayColumns[1] && (
                        <h3 className="font-semibold text-base text-gray-900 break-words">
                            {renderValue(item, displayColumns[1])}
                        </h3>
                    )}
                    {/* Secondary field (usually ID or second field) */}
                    {displayColumns[0] && (
                        <p className="text-sm text-gray-500 mt-1 break-words">
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
                            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                                <BsThreeDots className="text-lg text-gray-600" />
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
                        <span className="text-sm text-gray-600 font-medium min-w-[120px] flex-shrink-0 break-words">
                            {column.title}:
                        </span>
                        <span className="text-sm text-gray-900 text-right flex-1 min-w-0 break-words">
                            {renderValue(item, column)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResponsiveMobileCard;