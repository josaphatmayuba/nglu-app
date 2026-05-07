import Menu from "@/UI/Menu";
import { cn } from "@/utils/functions";
import { Popover } from "antd";
import { BsDatabaseExclamation, BsThreeDots } from "react-icons/bs";

const TableForLogin = ({
  columns,
  data = [],
  loading = false,
  loadingUiSize = 5,
  scroll = {},
  headClass,
  nestedRowKey,
  setDefaultValue,
}) => {
  const handleSetValue = (item) => {
    setDefaultValue([
      {
        username: item.username,
        password: item.password,
      },
    ]);
  };

  // Split data into two columns
  const mid = Math.ceil((data?.length || 0) / 2);
  const leftData = data.slice(0, mid);
  const rightData = data.slice(mid);

  return (
    <div className="tableContainer overflow-y-auto w-full">
      <div style={{ maxHeight: scroll.y ? `${scroll.y}px` : "auto" }}>
        {/* Side-by-side tables */}
        {!loading && data?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left table */}
            <table className="w-full border-separate border-spacing-y-3">
              <tbody>
                {leftData.map((item, index) => (
                  <tr key={`L-${index}`}>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleSetValue(item)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-all shadow-md active:scale-[0.99] text-sm hover:shadow-sm hover:scale-[1.01]"
                      >
                        Admin Login
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Right table */}
            <table className="w-full border-separate border-spacing-y-3">
              <tbody>
                {rightData.map((item, index) => (
                  <tr key={`R-${index}`}>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleSetValue(item)}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-all shadow-md active:scale-[0.99] text-sm hover:shadow-sm hover:scale-[1.01]"
                      >
                        Manager Login
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!data?.length && !loading && (
          <div className="flex flex-col justify-center items-center h-full py-10">
            <BsDatabaseExclamation className="text-slate-300" size={60} />
            <span className="py-2 text-base text-slate-500">No Demo Users</span>
          </div>
        )}

        {/* Loader */}
        {loading && <TableLoader length={loadingUiSize} />}
      </div>
    </div>
  );
};

export default TableForLogin;

const TableLoader = ({ length = 3 }) => {
  const loaderArray = Array(length).fill("1");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1].map((col) => (
        <div key={col} className="w-full">
          {loaderArray.map((_, index) => (
            <div
              key={`${col}-${index}`}
              className="w-full flex justify-between border-b py-3 gap-5"
            >
              <div className="rounded w-full h-[18px] bg-slate-200 animate-pulse" />
              <div className="rounded w-full h-[18px] bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
