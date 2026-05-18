import { Table } from "antd";
import { forwardRef, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";

const PrintToPdf = forwardRef(({ title, list, columns }, ref) => {
  return (
    <div ref={ref} className="p-3">
      <h1 className="text-center text-semibold mb-3  text-[18px]">{title}</h1>
      <Table
        columns={columns}
        dataSource={
          !!list?.length && list.map((item) => ({ ...item, key: item?.id }))
        }
        pagination={false}
      />
    </div>
  );
});

PrintToPdf.displayName = "printToPdf";

export default function PrintPdf({ title, list, columns }) {
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <>
      <div className="hidden">
        <PrintToPdf
          ref={componentRef}
          list={list}
          columns={columns.slice(0, -1)}
          title={title}
        />
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 transition hover:border-ink-300 hover:bg-ink-50"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Imprimer</span>
      </button>
    </>
  );
}
