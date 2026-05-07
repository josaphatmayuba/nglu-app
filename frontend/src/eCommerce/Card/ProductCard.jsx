import { Card } from "antd";
import ReactStars from "react-rating-star-with-type";
import { Link } from "react-router-dom";
import { priceCalculator } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";

export default function ProductCard({ product, isRating }) {
  const currency = useCurrency();
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

  return (
    <>
      <Card
        cover={
          <Link to={`/products/${product.id}`}>
            <img
              className='w-[calc(100%-2px)] ml-[1px]  h-[180px] object-cover'
              alt='Product Image'
              onError={handleOnError}
              src={product.productThumbnailImageUrl || "/images/default.jpg"}
            />
          </Link>
        }
        className='drop-shadow-md hover:drop-shadow-xl h-full bg-white flex flex-col'
        bodyStyle={{
          padding: "8px 16px",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div>
          <Link to={`/products/${product.id}`}>
            <h1>{product?.name}</h1>
          </Link>
          <span className='font-semibold'>
            <span
              dangerouslySetInnerHTML={{
                __html: currency?.currencySymbol,
              }}
            />{" "}
            {priceCalculator(product?.productSalePriceWithVat, product?.discount)}
          </span>
          {product.discount && (
            <div className='flex items-center gap-2'>
              <span className='line-through opacity-50'>
                <span
                  dangerouslySetInnerHTML={{
                    __html: currency?.currencySymbol,
                  }}
                />{" "}
                {product.productSalePriceWithVat}
              </span>
              <span>
                -{product.discount.value}
                {product.discount.type === "percentage" && "%"}
              </span>
            </div>
          )}

          {product.reviewRating && isRating && (
            <div>
              <ReactStars
                count={5}
                value={product.totalRating}
                isHalf
                valueShow
              />
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
