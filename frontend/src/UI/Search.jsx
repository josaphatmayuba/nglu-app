import { useEffect, useRef, useState } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { MdClear } from "react-icons/md";
import { AiOutlineLoading3Quarters } from "react-icons/ai"; // Add this import for loading icon
import { useDispatch, useSelector } from "react-redux";
import {
  clearProductList,
  loadProductSearch,
} from "../redux/rtk/features/product/productSearchSlice";
import { cn } from "../utils/functions";

export default function SearchForm({
  className,
  form,
  totalCalculator,
  setSelectedProduct,
}) {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false); // Add this state for loading
  const debounceTimeoutRef = useRef(null);
  const { list } = useSelector((state) => state.productSearch);

  const handleSelect = (product) => {
    const productArray = form.getFieldValue("saleInvoiceProduct") || [];
    const isExist = productArray.find((item) => item.productId === product.id);

    if (isExist) {
      const newArray = productArray.map((item) => {
        if (product.id === item.productId) {
          return {
            ...item,
            productQuantity: item.productQuantity ? item.productQuantity + 1 : 1,
          };
        }
        return item;
      });
      form.setFieldsValue({ saleInvoiceProduct: newArray });
    } else {
      setSelectedProduct && setSelectedProduct((prev) => [...prev, product]);
      form.setFieldsValue({
        saleInvoiceProduct: [
          ...productArray,
          {
            productId: product.id,
            productName: product.name,
            productQuantity: 1, // Set quantity to 1 here
            productSalePrice: product.productSalePrice,
            productVat: product.productVat ? product.productVat?.percentage : 0,
            productDiscount: product.discount?.value ? parseInt(product.discount?.value) : 0,
            discountType: product.discount?.type || "flat",
          },
        ],
      });
    }
    totalCalculator();
    setIsSearching(false); // Reset loading after selection
  };

  const onChange = async (e) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setSearchTerm(e.target.value);
    if (e.target.value !== "") {
      setIsSearching(true); // Set loading when starting search
    } else {
      setIsSearching(false);
      dispatch(clearProductList());
      return;
    }
    debounceTimeoutRef.current = setTimeout(async () => {
      const resp = await dispatch(
        loadProductSearch({ query: "search", key: e.target.value, count: 7 })
      );
      setIsSearching(false); // Reset loading after dispatch
      if (resp.payload?.data?.getAllProduct?.length === 1) {
        handleSelect(resp.payload?.data?.getAllProduct[0]);
        handleClear();
      }
    }, 500);
  };

  const handleClear = () => {
    setSearchTerm("");
    setIsSearching(false); // Reset loading on clear
    dispatch(clearProductList());
  };

  useEffect(() => {
    return () => handleClear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("relative w-full", { [className]: className })}>
      <div className="relative">
        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={onChange}
          className={`w-full pl-12 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 ${searchTerm && "rounded-b-none"
            }`}
          placeholder="Search or scan product (name / code / barcode)"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <MdClear size={20} />
          </button>
        )}
      </div>

      {searchTerm && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 border-t-0 rounded-b-lg shadow-lg max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="flex justify-center items-center py-4">
              <AiOutlineLoading3Quarters className="animate-spin text-gray-400" size={20} />
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : list?.length > 0 ? (
            list.map((item) => (
              <LiveSearchCard
                onSelect={handleSelect}
                key={item.id}
                product={item}
                handleClear={handleClear}
              />
            ))
          ) : (
            <div className="flex justify-center items-center py-4">
              <span className="text-sm text-gray-500">No products found matching your search.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveSearchCard({ product, onSelect, handleClear }) {
  const { name, productQuantity, productSalePrice } = product;

  return (
    <div
      onClick={() => {
        onSelect(product);
        handleClear();
      }}
      className="flex justify-between items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
    >
      <div>
        <div className="font-medium text-gray-900">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Price: {productSalePrice}
        </span>
        {productQuantity > 0 ? (
          <span className="text-sm bg-green-50 text-green-700 rounded px-2 py-1">
            Stock: {productQuantity}
          </span>
        ) : (
          <span className="text-sm bg-red-50 text-red-700 rounded px-2 py-1">
            Stock out
          </span>
        )}
      </div>
    </div>
  );
}