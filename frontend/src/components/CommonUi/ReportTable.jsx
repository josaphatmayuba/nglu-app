import Table from "@/UI/Table";
import { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import ColVisibilityDropdown from "../Shared/ColVisibilityDropdown";

const ReportTable = ({
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
      <div className="mt-2">
       

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
export default ReportTable;
