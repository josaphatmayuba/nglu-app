import { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";
import Table from "@/UI/Table";

const TableNoPagination = ({
  columns,
  list,
  loading,
  csvFileName,
  rightElement,
  children,
}) => {
  // column select
  const [columnsToShow, setColumnsToShow] = useState([]);
  useEffect(() => {
    setColumnsToShow(columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const columnsToShowHandler = (val) => {
    setColumnsToShow(val);
  };

  return (
    <>
      <div className='mt-2'>
        <div className='pb-3'>
          <div className='w-full dark:text-yellow-50 flex flex-col md:flex-row gap-2 items-center justify-between'>
            <div className='flex gap-2'>{rightElement}</div>

            <div className='flex flex-col md:flex-row gap-2 items-center justify-between'>
              <div className='px-4 py-1 bg-black/80 text-white border rounded-md'>
                <CSVLink
                  data={list ? list : ""}
                  className='h-[34px] text-white font-bold py-1 px-3 rounded mr-2 '
                  style={{ marginTop: "5px" }}
                  filename={csvFileName}
                >
                  Download CSV
                </CSVLink>
              </div>
              <ColVisibilityDropdown
                options={columns}
                columns={columns}
                columnsToShowHandler={columnsToShowHandler}
              />
            </div>
          </div>
        </div>

        <Table
          loading={loading}
          columns={columnsToShow}
          data={
            !!list?.length && list.map((item) => ({ ...item, key: item.id }))
          }
          scroll={{ y: window.innerHeight - 350 }}
        />
      </div>
      {children && children}
    </>
  );
};
export default TableNoPagination;
