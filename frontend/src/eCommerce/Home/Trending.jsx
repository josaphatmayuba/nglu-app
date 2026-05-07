import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadReportTopSellingProduct } from "../../redux/rtk/features/product/productSlice";
import ProductCard from "../Card/ProductCard";
import LoadingProductCard from "../CommonSection/LoadingProductCard";

export default function Trending() {
  const dispatch = useDispatch();
  const { topSellingProduct, toSellingLoading } = useSelector(
    (state) => state.products
  );
  useEffect(() => {
    dispatch(
      loadReportTopSellingProduct("query=top-selling-products&page=1&count=6")
    );
  }, [dispatch]);

  let content = null;
  if (toSellingLoading) {
    content = (
      <div className='container mt-10'>
        <div className='p-3 px-5 flex justify-between items-center'>
          <h2 className='text-xl font-bold'>Trending</h2>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-center gap-5 px-2 pb-5'>
          <LoadingProductCard />
          <LoadingProductCard />
          <LoadingProductCard />
          <LoadingProductCard />
          <LoadingProductCard />
          <LoadingProductCard />
        </div>
      </div>
    );
  } else if (!toSellingLoading && topSellingProduct?.length > 0) {
    content = (
      <div className='container mt-10'>
        <div className='p-3 px-5 flex justify-between items-center'>
          <h2 className='text-xl font-bold'>Trending</h2>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-center gap-5 px-2 pb-5'>
          {topSellingProduct.map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
        </div>
      </div>
    );
  }
  return content;
}
