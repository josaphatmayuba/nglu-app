import CSV from "@/UI/CSV";
import { Popover } from "antd";
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import Pagination from "../../UI/Pagination";
import Table from "../../UI/Table";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";
import CommonSearch from "./CommonSearch";
import Filter from "./Filter";
import PrintPdf from "./PrintPdf";
import ResponsiveMobileCard from "./ResponsiveMobileCard";

const TableComponent = ({
  columns,
  list,
  total,
  loading,
  children,
  filters,
  title,
  setPageConfig,
  isSearch,
  loadingUiSize = 10,
  actionPermission,
}) => {
  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };

  // column select
  const [columnsToShow, setColumnsToShow] = useState([]);
  const [isMobile, setIsMobile] = useState(false); // State to track if the screen is mobile

  useEffect(() => {
    setColumnsToShow(columns);

    // Detect screen size for responsiveness
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Mobile breakpoint (768px)
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [columns]);

  const columnsToShowHandler = (val) => {
    setColumnsToShow(val);
  };

  return (
    <>
      <div className="mt-2">
        {/* Mobile View */}
        {isMobile ? (
          <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
            <div className="p-3 border-b border-ink-100 space-y-3">
            {/* Search Bar */}
            {isSearch && (
              <div className="w-full">
                <CommonSearch setPageConfig={setPageConfig} />
              </div>
            )}

            {/* Filter and 3-Dot Menu */}
            <div className="flex justify-between items-center gap-2">
              {/* Filter Button */}
              <Filter setPageConfig={setPageConfig} filters={filters} />

              {/* 3-Dot Menu */}
              <Popover
                content={
                  <div className="flex flex-col gap-2">
                    <ColVisibilityDropdown
                      options={columns}
                      columns={columns}
                      columnsToShowHandler={columnsToShowHandler}
                    />
                    <PrintPdf list={list} columns={columns} title={title} />
                    <CSV notButton={true} list={list} columns={columns} title={title} />
                  </div>
                }
                placement="bottomRight"
                arrow={false}
                trigger="click"
              >
                <button className="p-2 bg-white border border-ink-200 hover:border-ink-300 rounded-lg text-ink-600 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </Popover>
            </div>
            </div>

            {/* Responsive Mobile Card Design */}
            <div className="space-y-3 p-3">
              {list?.length > 0 ? (
                list.map((item) => (
                  <ResponsiveMobileCard
                    key={item.id}
                    item={item}
                    columns={columnsToShow}
                  />
                ))
              ) : (
                <div className="text-center text-ink-500 py-10">Aucun enregistrement</div>
              )}
            </div>
          </div>
        ) : (
          // Desktop View
          <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
            <div className="w-full px-3 py-3 flex flex-wrap gap-2 items-center flex-col-reverse sm:flex-row justify-between border-b border-ink-100">
              <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full md:w-auto min-w-0">
                {isSearch && (
                  <div className="w-full sm:w-[260px]">
                    <CommonSearch setPageConfig={setPageConfig} />
                  </div>
                )}
                <div className="hideScrollBar overflow-x-auto w-full flex items-center gap-2">
                  <Filter setPageConfig={setPageConfig} filters={filters} />
                  <ColVisibilityDropdown
                    options={columns}
                    columns={columns}
                    columnsToShowHandler={columnsToShowHandler}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PrintPdf list={list} columns={columns} title={title} />
                <CSV notButton={true} list={list} columns={columns} title={title} />
              </div>
            </div>

            {/* Table */}
            <Table
              loading={loading}
              columns={columnsToShow}
              actionPermission={actionPermission}
              data={
                !!list?.length && list.map((item) => ({ ...item, key: item?.id }))
              }
              scroll={list?.length > 10 ? { y: 500 } : {}}
              loadingUiSize={loadingUiSize}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-3 pt-2 pb-3">
        {total >= 11 && <Pagination onChange={fetchData} total={total} />}
      </div>
      {children && children}
    </>
  );
};

export default TableComponent;
