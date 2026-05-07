import { memo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { loadProductPublicForRelated } from "../../redux/rtk/features/eCommerce/product/productPublicRelatedSlice";
import ProductCard from "../Card/ProductCard";
import LoadingProductCard from "../CommonSection/LoadingProductCard";
const SingleRelatedProduct = memo(function SingleRelatedProduct({
  productSubCategory,
}) {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { list: products, loading } = useSelector(
    (state) => state.productPublicRelated
  );

  useEffect(() => {
    if (productSubCategory) {
      dispatch(
        loadProductPublicForRelated({
          page: 1,
          count: 10,
          productSubCategoryId: productSubCategory.productSubCategoryId,
        })
      );
    }
  }, [dispatch, productSubCategory]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className=''>
      <h1 className='text-xl font-medium p-2'>You may also like</h1>
      <div className='grid grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-4'>
        {loading && (
          <>
            <LoadingProductCard />
            <LoadingProductCard />
            <LoadingProductCard />
            <LoadingProductCard />
          </>
        )}
        {!loading &&
          products?.map((item) => <ProductCard key={item.id} product={item} />)}
      </div>
    </div>
  );
});

export default SingleRelatedProduct;
