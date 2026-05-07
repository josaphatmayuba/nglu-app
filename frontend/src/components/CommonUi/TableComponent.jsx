import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Menu from "@/UI/Menu";
import { FiFilter } from "react-icons/fi";
import { Popover } from "antd";
import { useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
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
          <div className="p-4 sm:p-6">
            {/* Search Bar */}
            {isSearch && (
              <div className="w-full mb-3">
                <CommonSearch setPageConfig={setPageConfig} />
              </div>
            )}

            {/* Filter and 3-Dot Menu */}
            <div className="flex justify-between items-center mb-3">
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
                <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <BsThreeDotsVertical className="text-lg text-gray-600" />
                </button>
              </Popover>
            </div>

            {/* Responsive Mobile Card Design */}
            <div className="space-y-4">
              {list?.length > 0 ? (
                list.map((item) => (
                  <ResponsiveMobileCard
                    key={item.id}
                    item={item}
                    columns={columnsToShow}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500">No Records Found</div>
              )}
            </div>
          </div>
        ) : (
          // Desktop View
          <>
            <div className="w-full px-3 flex flex-wrap gap-2 items-center flex-col-reverse sm:flex-row justify-between mb-3">
              <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full md:w-auto">
                {isSearch && (
                  <div className="w-full sm:w-[250px]">
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
          </>
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
