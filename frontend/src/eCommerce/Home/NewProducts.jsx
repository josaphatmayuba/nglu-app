import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadReportNewProduct } from "../../redux/rtk/features/product/productSlice";
import ProductCard from "../Card/ProductCard";
import LoadingProductCard from "../CommonSection/LoadingProductCard";

export default function NewProducts() {
  const dispatch = useDispatch();
  const { newProduct, loading } = useSelector((state) => state.products);
  useEffect(() => {
    dispatch(loadReportNewProduct("query=new-products&page=1&count=6"));
  }, [dispatch]);

  let content;

  if (loading) {
    content = (
      <>
        <LoadingProductCard />
        <LoadingProductCard />
        <LoadingProductCard />
        <LoadingProductCard />
        <LoadingProductCard />
        <LoadingProductCard />
      </>
    );
  } else if (!loading && newProduct) {
    content = newProduct.map((product, index) => (
      <ProductCard key={index} product={product} isRating />
    ));
  }
  return (
    <>
      <div className="container mt-10">
        <div className="p-3 px-5 flex justify-between items-center">
          <h2 className="text-xl font-bold">New Products</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-center gap-5 px-2 pb-5">
          {content}
        </div>
      </div>
    </>
  );
}
