import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { priceCalculator } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";

export default function LiveSearchCard({ product, handleClear }) {
 
  const currency = useCurrency();
  const {
    name,
    productThumbnailImage,
    productSalePriceWithVat,
    productQuantity,
    discount,
  } = product;

  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

  return (
    <Link
      onClick={handleClear}
      to={`/products/${product.id}`}
      className='flex justify-between items-center gap-2 py-2 w-full px-5 hover:bg-slate-950/10'
    >
      <div className=''>
        <div className='flex items-center gap-3 justify-start'>
          <img
            className='h-20 w-20 rounded'
            onError={handleOnError}
            src={productThumbnailImage || "/images/default.jpg"}
            alt='product'
          />
          <div>
            <h1 className='text-base lg:text-xl font-medium text-gray-700'>
              {name}
            </h1>
            <div className='flex items-center gap-5'>
              <span className={`text-gray-500`}>
                Brand: {product?.productBrand?.name}
              </span>
            </div>
            <div className='text-gray-500'>
              <span>
                Price:{" "}
                <span className='text-gray-700 font-medium'>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />{" "}
                  {priceCalculator(productSalePriceWithVat, discount)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className=''>
        {productQuantity > 0 ? (
          <span
            className={`bg-green-500/10 text-green-700 rounded px-2 flex gap-2`}
          >
            Stock: <span>{productQuantity}</span>
          </span>
        ) : (
          <span className={`bg-red-500/10 text-red-700 rounded px-2`}>
            Stock out
          </span>
        )}
      </div>
    </Link>
  );
}
