import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SearchForm from "../../UI/Search";
import { loadProduct } from "../../redux/rtk/features/product/productSlice";
import { loadAllProductSubCategory } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";
import { stringShorter } from "../../utils/functions";

export default function ProductsForSale({ form: MainForm, totalCalculator, setSelectedProduct }) {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState("");

  const { list, loading } = useSelector((s) => s.products);
  const { list: subCategoryList } = useSelector((s) => s.productSubCategories) || {};

  useEffect(() => {
    dispatch(loadAllProductSubCategory({ page: 1, count: 100, status: true }));
  }, [dispatch]);

  useEffect(() => {
    if (searchQuery) {
      dispatch(loadProduct({ page: 1, count: 100, status: "true", query: searchQuery }));
    }
  }, [dispatch, searchQuery]);

  const handleSelectedProds = (item) => {
    const arr = MainForm.getFieldValue("saleInvoiceProduct") || [];
    const exists = arr.find((pro) => pro.productId === item.id);

    if (!exists) {
      setSelectedProduct((prev) => [...prev, item]);
      MainForm.setFieldsValue({
        saleInvoiceProduct: [
          ...arr,
          {
            productId: item.id,
            productSalePrice: item.productSalePrice,
            productQuantity: item.productQuantity ? 1 : 0,
            productName: item.name,
            productVat: item.productVat ? item.productVat?.percentage : 0,
            productDiscount: item.discount?.value ? parseInt(item.discount?.value) : 0,
            discountType: item.discount?.type || "flat",
          },
        ],
      });
      totalCalculator();
    } else {
      const updated = arr.map((pro) =>
        pro.productId === item.id ? { ...pro, productQuantity: pro.productQuantity + 1 } : pro
      );
      MainForm.setFieldsValue({ saleInvoiceProduct: updated });
      totalCalculator();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="rounded-xl">
          <div className="w-full">
            <SearchForm
              className="w-full"
              form={MainForm}
              totalCalculator={totalCalculator}
              setSelectedProduct={setSelectedProduct}
              onSearch={(value) => setSearchQuery(value)}
            />
          </div>
        </div>
      </div>
    </div >
  );
}