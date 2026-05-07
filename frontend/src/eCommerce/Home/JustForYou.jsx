import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadProductPublic } from "../../redux/rtk/features/product/productSlice";
import ProductCard from "../Card/ProductCard";
import { Link } from "react-router-dom";

export default function JustForYou() {
  const dispatch = useDispatch();
  const { list: products, loading } = useSelector((state) => state.products);
  useEffect(() => {
    dispatch(loadProductPublic({ page: 1, count: 18, status: true }));
  }, [dispatch]);
  return (
    <>
      <div className="container mt-10">
        <div className="p-3 px-5 flex justify-between items-center">
          <h2 className="text-xl font-bold">Featured Product</h2>{" "}
          <Link to="/search" className="hover:text-ePrimary underline">See More</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 items-center gap-5 px-2 pb-5">
          {products &&
            products.map((product, index) => (
              <ProductCard key={index} product={product} isRating />
            ))}
        </div>
      </div>
    </>
  );
}
