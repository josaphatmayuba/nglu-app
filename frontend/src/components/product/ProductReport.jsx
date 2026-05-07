import Button from "@/UI/Button";
import CSV from "@/UI/CSV";
import Card from "@/UI/Card";
import { loadProductReport } from "@/redux/rtk/features/product/productSlice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ReportTable from "../CommonUi/ReportTable";
import ProductReportPrint from "../Invoice/Report/ProductReportPrint";

export default function ProductReport() {
  const dispatch = useDispatch();
  const [showTable, setShowTable] = useState(false);
  const {
    report: list,
    info,
    loading,
  } = useSelector((state) => state.products);

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "50px",
      render: (id) => <Link to={`/admin/product/${id}`}>{id}</Link>,
    },

    {
      id: 4,
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name, { id }) => <Link to={`/admin/product/${id}`}>{name}</Link>,
      width: "150px",
      tdClass: "whitespace-nowrap",
    },
    {
      id: 10,
      title: "Brand",
      dataIndex: "productBrand",
      key: "productBrand",
      render: (productBrand) => productBrand?.name,
    },
    {
      id: 9,
      title: "Sub Category",
      dataIndex: "productSubCategory",
      key: "productSubCategory",
      render: (productSubCategory) => productSubCategory?.name,
    },
    {
      id: 3,
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },

    {
      id: 7,
      title: "Purchase price",
      dataIndex: "productPurchasePrice",
      key: "productPurchasePrice",
      responsive: ["md"],
    },
    {
      id: 3,
      title: "Vat",
      dataIndex: "productVat",
      key: "productVat",
      render: (productVat) => (
        <span>{productVat ? `${productVat?.percentage}%` : "0%"}</span>
      ),
    },
    {
      id: 8,
      title: "Sale price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
      responsive: ["md"],
    },
    {
      id: 6,
      title: "Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },
    {
      id: 5,
      title: "UoM",
      key: "uomValue",
      render: ({ uom, uomValue }) =>
        `${uomValue || ""}${uom?.name ? `/${uom.name}` : ""}`,
    },

    {
      id: 12,
      title: "Reorder QTY",
      dataIndex: "reorderQuantity",
      key: "reorderQuantity",
    },
  ];

  // column for CSV
  const column = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      renderCsv: (id) => id,
    },
    {
      id: 1,
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      renderCsv: (sku) => sku,
    },
    {
      id: 10,
      title: "Brand",
      dataIndex: "productBrand",
      key: "productBrand",
      renderCsv: (productBrand) => productBrand?.name,
    },
    {
      id: 9,
      title: "Sub Category",
      dataIndex: "productSubCategory",
      key: "productSubCategory",
      renderCsv: (productSubCategory) => productSubCategory?.name,
    },
    {
      id: 12,
      title: "Color",
      dataIndex: "productColor",
      key: "color",
      renderCsv: (productColor) =>
        productColor.length > 0
          ? productColor.map((color) => color.color.name)
          : "-",
    },
    {
      id: 5,
      title: "UoM",
      key: "uomValue",
      renderCsv: ({ uom, uomValue }) =>
        `${uomValue || ""}${uom?.name ? `/${uom.name}` : ""}`,
    },
    {
      id: 6,
      title: "Quantity",
      dataIndex: "productQuantity",
      key: "productQuantity",
    },

    {
      id: 12,
      title: "Reorder QTY",
      dataIndex: "reorderQuantity",
      key: "reorderQuantity",
    },
    {
      id: 3,
      title: "Vat",
      dataIndex: "productVat",
      key: "productVat",
      renderCsv: (productVat) =>
        `${productVat?.percentage ? productVat?.percentage : 0}%`,
    },
    {
      id: 7,
      title: "Purchase price",
      dataIndex: "productPurchasePrice",
      key: "productPurchasePrice",
      responsive: ["md"],
    },
    {
      id: 8,
      title: "Sale price",
      dataIndex: "productSalePrice",
      key: "productSalePrice",
      responsive: ["md"],
    },
  ];
  useEffect(() => {
    dispatch(loadProductReport());
  }, [dispatch]);

  return (
    <Card
      className="mt-3 rounded-lg bg-white dark:bg-[#1C1B20] border border-gray-200 dark:border-gray-700 max-md:border-0 max-md:bg-transparent"
      bodyClass="p-6 max-md:p-4"
      headClass="bg-white dark:bg-[#2A2A2F] text-black dark:text-white border-b border-gray-200 dark:border-gray-700"
      title="Inventory Report"
    >
      <div className="flex flex-col md:flex-row py-5 items-start justify-between gap-4">
        <div>
          <Button
            onClick={() => setShowTable(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Generate Report
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-2 w-full md:w-auto">
          {!loading && list ? (
            <ProductReportPrint
              data={list}
              info={info}
              title={"INVENTORY REPORT"}
              type={"print"}
              btnName="Print"
            />
          ) : (
            <Button
              loading={loading || !list}
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Print
            </Button>
          )}
          {!loading && list ? (
            <ProductReportPrint
              data={list}
              info={info}
              title={"INVENTORY REPORT"}
              type={"download"}
              btnName="Export PDF"
            />
          ) : (
            <Button
              loading={loading || !list}
              className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Export PDF
            </Button>
          )}
          <CSV
            list={list}
            columns={column}
            title={"Inventory Report"}
            className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            btnName="Export CSV"
          />
        </div>
      </div>

      {showTable && (
        <div className="overflow-x-auto">
          <ReportTable list={list} columns={columns} loading={loading} />
        </div>
      )}
    </Card>
  );
}
