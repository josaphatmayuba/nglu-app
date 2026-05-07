import { useNavigate } from "react-router-dom";
import useCurrency from "../../utils/useCurrency";

export default function OrderCard({ item, invoice }) {
  const {
    productQuantity,
    product,
    productId,
    colors,
    cartOrderAttributeValue,
  } = item;
  const navigate = useNavigate();
  const currency = useCurrency();
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  const handleReview = () => {
    navigate(`/review-rating/${productId}`);
  };

  const totalReturned =
    invoice?.returnSingleCartOrder
      ?.filter(
        (p) => item.id === p.returnCartOrderProduct[0]?.cartOrderProductId
      )
      .reduce(
        (total, current) =>
          total + current.returnCartOrderProduct[0].productQuantity,
        0
      ) || 0;

  return (
    <div className='relative bg-slate-100 rounded px-2 flex justify-between items-center my-2 md:px-5 py-2  md:max-w-[1000px] mx-auto'>
      <div className='flex gap-2  justify-start  md:w-4/6 '>
        <div>
          <img
            className='w-[70px] h-[70px] object-cover  rounded-lg'
            onError={handleOnError}
            src={
              `${import.meta.env.VITE_APP_API}/files/${
                product.productThumbnailImage
              }` || "/images/default.jpg"
            }
            alt='product'
          />
        </div>
        <div className='flex flex-col md:flex-row md:justify-between md:w-full md:items-center justify-evenly'>
          <div>
            <div className='font-medium text-gray-800 text-base md:text-lg'>
              {product.name}
            </div>
            {(colors || cartOrderAttributeValue) && (
              <div className='flex md:flex-col gap-2 md:gap-0'>
                {colors && (
                  <p className='font-medium text-xs md:text-sm text-gray-500'>
                    Color: {colors.name}
                  </p>
                )}
                {cartOrderAttributeValue &&
                  cartOrderAttributeValue.map((attribute, index) => (
                    <span
                      className='font-medium text-xs md:text-sm text-gray-500'
                      key={index}
                    >
                      {attribute.productAttributeValue.productAttribute.name}:{" "}
                      {attribute.productAttributeValue.name}
                    </span>
                  ))}
              </div>
            )}
          </div>
          <div className='md:flex md:w-1/2 gap-2'>
            <div className='flex flex-col gap-1'>
              <span
                className={`bg-green-500/10 text-center text-green-700 rounded px-2 text-sm md:text-base font-medium`}
              >
                Qty: {productQuantity}
              </span>
              {totalReturned ? (
                <span
                  className={`bg-green-500/10 text-red-700 rounded px-2 text-xs font-medium`}
                >
                  Return/refund: {totalReturned}
                </span>
              ) : null}
            </div>

            {/* <div className="md:w-1/2">
              
            </div> */}
          </div>
        </div>
      </div>

      <div className={`w-[80px] md:w-2/6 md:flex md:justify-end `}>
        {/* {invoice?.singleCartOrder.orderStatus == "RECEIVED" ? ( */}
        <div className='flex flex-col items-start'>
          <span className='text-sm md:text-base'>
            Price:{" "}
            <span className='md:font-medium text-sm md:text-base'>
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />{" "}
              {product.productSalePrice.toFixed(2)}
            </span>
          </span>
          {/* <button
              disabled={totalReturned === productQuantity}
              title={
                totalReturned === productQuantity &&
                "All Product returned or refunded"
              }
              className=" font-medium p-1 text-gray-500 px-2 text-xs md:text-base hover:text-ePrimary disabled:hover:text-gray-300 disabled:hover:cursor-not-allowed"
              onClick={() => {
                setSelectedProduct(item);
                showModal();
              }}
            >
              RETURN/REFUND
            </button> */}
          {/* <button
              onClick={handleReview}
              className={` font-medium text-ePrimary  rounded text-sm md:text-lg px-2 `}
            >
              WRITE A REVIEW
            </button> */}
        </div>
        {/* ) : (
          <span className="text-gray-500 px-2 py-1 text-sm md:text-base md:px-4 md:py-1 rounded-full bg-slate-200">
            Processing
          </span>
        )} */}
      </div>
    </div>
  );
}
