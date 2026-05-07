import { CSVLink } from "react-csv";
import { AiOutlineDownload } from "react-icons/ai";

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
    <div className="flex bg-[#F4F5F6] rounded-md p-2 cursor-pointer items-center gap-2 border">
      <AiOutlineDownload size={16} />
      <CSVLink
        data={newList ? newList : ""}
        className="text-black"
        filename={title || "data"}
      >
        {btnName ? btnName : "Download CSV"}
      </CSVLink>
    </div>
  );
}
