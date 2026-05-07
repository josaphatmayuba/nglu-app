import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Pagination from "@/UI/Pagination";
import { Table } from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import PrintPdf from "../CommonUi/PrintPdf";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";

const TableComponent = ({
  columns,
  list,
  total,
  loading,
  paginatedThunk,
  children,
  query,
  setProductList,
  productList,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isMobile, setIsMobile] = useState(false); // State to track screen size

  const dispatch = useDispatch();

  const onSelectChange = (newSelectedRowKeys, second) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setProductList(second);
  };
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const fetchData = (page, count) => {
    dispatch(paginatedThunk({ ...query, status: true, page, count }));
  };

  // column select
  const [columnsToShow, setColumnsToShow] = useState([]);

  useEffect(() => {
    setColumnsToShow(columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect screen size for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Set mobile view for screens <= 768px
    };

    handleResize(); // Check on initial render
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <div className="mt-2 px-4"> {/* Added padding here */}
        <div className="pb-3">
          <div className="w-full dark:text-yellow-50 flex flex-col md:flex-row gap-2 items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ColVisibilityDropdown
                options={columns}
                columns={columns}
                columnsToShowHandler={setColumnsToShow}
              />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              <PrintPdf list={list} columns={columns} title="Shortage Products" />
              <CSV list={list} columns={columns} title="Shortage Products" />
            </div>
          </div>
        </div>

        <Table
          loading={loading}
          rowSelection={rowSelection}
          columns={columnsToShow}
          dataSource={
            !!list?.length && list.map((item) => ({ ...item, key: item?.id }))
          }
          pagination={false}
          scroll={isMobile ? { x: 500 } : { x: false, y: window.innerHeight - 319 }} // Adjust scroll dynamically
        />
        <div className="flex justify-center mt-3">
          {total >= 11 && <Pagination onChange={fetchData} total={total} />}
        </div>
      </div>
      {children && children}
    </>
  );
};

export default TableComponent;
