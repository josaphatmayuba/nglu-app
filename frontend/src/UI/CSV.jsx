import { CSVLink } from "react-csv";
import { Download } from "lucide-react";

export default function CSV({
  columns,
  list,
  title,
  className,
  btnName,
  notButton,
}) {
  if (!Array.isArray(list) || !Array.isArray(columns)) return null;

  const newList = list.map((item) => {
    const data = {};
    columns.forEach((column) => {
      if (column.csvOff) return null;
      if (column.renderCsv && typeof column.renderCsv === "function") {
        if (!column.dataIndex)
          return (data[column.title] = column.renderCsv(item));
        return (data[column.title] = column.renderCsv(
          item[column.dataIndex],
          item
        ));
      }

      if (!column.dataIndex) return (data[column.title] = item);
      return (data[column.title] = item[column.dataIndex]);
    });

    return data;
  });

  return (
    <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 transition hover:border-ink-300 hover:bg-ink-50">
      <Download className="h-4 w-4" />
      <CSVLink
        data={newList ? newList : ""}
        className="text-ink-700"
        filename={title || "data"}
      >
        <span className="hidden sm:inline">{btnName ? btnName : "Exporter"}</span>
      </CSVLink>
    </div>
  );
}
