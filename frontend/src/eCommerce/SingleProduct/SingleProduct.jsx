import { LoadingOutlined } from "@ant-design/icons";
import { Spin, Tooltip } from "antd";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCartPlus, FaHeart, FaRegHeart } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import ReactStars from "react-rating-star-with-type";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  addToCart,
  addToLocalCart,
  loadAllCartByCustomerId,
} from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import {
  addWishlist,
  deleteWishlist,
  loadAllWishlistBYCustomer,
} from "../../redux/rtk/features/eCommerce/wishlist/wishlistSlice";
import {
  loadSinglePublicProduct,
  productWishlistUpdate,
} from "../../redux/rtk/features/product/productSlice";
import { groupByAttribute, priceCalculator } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";
import ProductDetails from "./ProductDetails";
import ProductImageSlider from "./ProductImageSlider";
import QuantityHandle from "./QuantityHandle";
import RatingHeadCard from "./RatingHeadCard";
import ReviewAndRating from "./ReviewAndRating";
import Share from "./Share";
import SingleProductLoader from "./SingleProductLoader";
import SingleRelatedProduct from "./SingleRelatedProduct";

export default function SingleProduct() {
  const { id } = useParams("id");
  const dispatch = useDispatch();
  const currency = useCurrency();
  const [loader, setLoader] = useState(false);
  const [selectedColor, setColor] = useState();
  const [selectedAttributeValue, setAttributeValue] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const customerId = Number(localStorage.getItem("id"));
  const { product, loading } = useSelector((state) => state.products);

  const addCart = async (product) => {
    setLoader(true);
    const cartProduct = {
      productId: product.id,
      productQuantity: quantity,
      productAttributeValueId: selectedAttributeValue,
      colorId: selectedColor || null,
    };

    if (!customerId) {
      const data = {
        product,
        cartProduct,
      };
      dispatch(addToLocalCart(data));
      setLoader(false);
      return;
    }

    const data = {
      customerId,
      cartProduct: [cartProduct],
    };
    const resp = await dispatch(addToCart(data));
    if (resp.payload.message === "success") {
      setLoader(false);
      dispatch(loadAllCartByCustomerId(customerId));
    }
    setLoader(false);
  };

  const handleAddWishlist = async () => {
    try {
      if (!customerId) {
        return toast.error("Please login first");
      }
      const resp = await dispatch(addWishlist({ productId: product.id }));
      if (resp.payload.message === "success") {
        dispatch(loadAllWishlistBYCustomer({ id: customerId, query: {} }));
        dispatch(productWishlistUpdate());
      }
    } catch (error) {}
  };

  const handleDeleteWishlist = async () => {
    try {
      const resp = await dispatch(
        deleteWishlist({ id: customerId, productId: id })
      );
      if (resp.payload.message === "success") {
        dispatch(loadAllWishlistBYCustomer({ id: customerId, query: {} }));
        dispatch(productWishlistUpdate());
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (product?.productColor?.length > 0) {
      setColor(product?.productColor[0].colorId);
    }

    return () => {
      setColor(null);
      setQuantity(1);
    };
  }, [product]);

  let content = null;
  if (loading) {
    content = <SingleProductLoader />;
  } else if (product && !loading) {
    content = (
      <div>
        <div className='container mt-10'>
          <div className='flex flex-col md:flex-row gap-10'>
            <div className='w-full md:w-[30%]'>
              <ProductImageSlider data={product.galleryImage} />
            </div>
            <div className='w-full md:w-[40%] flex flex-col gap-4'>
              <div className='flex flex-col gap-1'>
                <h1 className='text-xl font-medium'>{product?.name}</h1>
                <div className='flex items-center gap-5'>
                  <ReactStars
                    isHalf
                    value={product?.totalReviewRating?.averageRating}
                    valueShow
                  />
                  <span
                    className={`bg-green-500/20 text-green-700 rounded-3xl px-2`}
                  >
                    {product?.productQuantity} Stock
                  </span>
                </div>
                <div className='flex items-center justify-between  gap-5'>
                  <div className='text-[14px] font-medium flex flex-col gap-1 mt-3'>
                    <span>
                      Brand:{" "}
                      <Link
                        to={`/brand/${product.productBrand?.name}?key=${product.productBrand?.id}`}
                        className='text-blue-600'
                      >
                        {product?.productBrand?.name}
                      </Link>
                    </span>
                    <span className='mr-3'>
                      Category:
                      <Link
                        to={`/category/${product.productSubCategory?.name}?key=${product.productSubCategory?.id}`}
                        className={`p-2 text-blue-600`}
                      >
                        {product.productSubCategory?.name}
                      </Link>
                    </span>
                  </div>
                  <div className='flex items-center gap-4'>
                    <span title={"Share this product"}>
                      <Tooltip placement='top' title={<Share />}>
                        <IoMdShare />
                      </Tooltip>
                    </span>
                    <span className='cursor-pointer' title='Add to wishlist'>
                      {product.isInWishlist == "false" ? (
                        <span onClick={handleAddWishlist}>
                          <FaRegHeart />
                        </span>
                      ) : (
                        <span onClick={handleDeleteWishlist}>
                          <FaHeart className='text-red-600' />
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className='border-t border-b py-2'>
                <span className='font-medium text-2xl text-ePrimary'>
                  {" "}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: currency?.currencySymbol,
                    }}
                  />{" "}
                  {priceCalculator(
                    product.productSalePriceWithVat,
                    product.discount
                  )}
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
              </div>
              <div>
                {product.productColor?.length > 0 && (
                  <div className='flex gap-2 items-start'>
                    <span className='mr-3'>Color:</span>
                    {product.productColor?.map((item, index) => (
                      <div
                        key={index}
                        className='flex flex-col gap-2 items-center'
                      >
                        {item.color?.name}

                        <span
                          onClick={() => setColor(item.colorId)}
                          style={{
                            backgroundColor: item.color?.colorCode,
                            color: "white",
                          }}
                          className={`w-6 h-6 ${
                            item.colorId === selectedColor
                              ? "border-4 border-black"
                              : "border"
                          }`}
                        ></span>
                      </div>
                    ))}
                  </div>
                )}
                {product?.productProductAttributeValue &&
                  groupByAttribute(product.productProductAttributeValue).map(
                    (item1, index) => {
                      const setAttributeVal = (id) => {
                        setAttributeValue((prev) => {
                          const hasValue = prev.find((single) =>
                            item1.find(
                              (item1Single) =>
                                single === item1Single.productAttributeValue.id
                            )
                          );

                          if (hasValue === id) {
                            return prev.filter((value) => value !== id);
                          } else if (hasValue && hasValue !== id) {
                            return prev
                              .filter((value) => value !== hasValue)
                              ?.concat(id);
                          } else {
                            return [...prev, id];
                          }
                        });
                      };
                      return (
                        <div
                          key={index}
                          className='flex gap-2 items-start mt-5'
                        >
                          <span className='mr-3'>
                            {
                              item1[0].productAttributeValue.productAttribute
                                .name
                            }
                            :
                          </span>
                          {item1.map((item, index) => (
                            <span
                              onClick={() =>
                                setAttributeVal(item.productAttributeValue.id)
                              }
                              key={index}
                              className={`flex justify-center items-center px-3 py-1 border bg-white cursor-pointer hover:bg-slate-50 ${
                                selectedAttributeValue.find(
                                  (id) => id === item.productAttributeValue.id
                                )
                                  ? "border-2 border-ePrimary"
                                  : "border"
                              }`}
                            >
                              {item.productAttributeValue.name}
                            </span>
                          ))}
                        </div>
                      );
                    }
                  )}

                <div className='flex  gap-4 items-center justify-between mt-10'>
                  <QuantityHandle
                    quantity={quantity}
                    setQuantity={setQuantity}
                    size={"small"}
                  />
                  <div className='flex justify-between gap-3'>
                    <span>
                      <button
                        onClick={() => addCart(product)}
                        disabled={loader}
                        className={`flex items-center gap-2 text-white bg-ePrimary rounded-lg p-2 px-4`}
                      >
                        {loader ? (
                          <Spin
                            indicator={
                              <LoadingOutlined
                                style={{
                                  fontSize: 20,
                                  color: "#ffffff",
                                }}
                                spin
                              />
                            }
                          />
                        ) : (
                          <FaCartPlus size={20} />
                        )}
                        <span>Add to Cart</span>
                      </button>
                    </span>
                  </div>
                </div>

                <div className='flex gap-2 items-center mt-10'></div>
              </div>
            </div>
            <div className='w-full md:w-[30%]'>
              {/* //shipping charge */}
              <div className='bg-white flex flex-col gap-3 p-4 rounded w-full h-full'>
                {product.shippingChargeComment
                  ?.split("\n")
                  .map((comment, index) => (
                    <li key={index}>{comment}</li>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  useEffect(() => {
    dispatch(loadSinglePublicProduct(id));
  }, [dispatch, id]);

  return (
    <>
      {content}
      <div className='container flex flex-col md:flex-row gap-6 mt-10'>
        <div className='w-full md:w-[70%]'>
          {product && (
            <RatingHeadCard reviewRating={product?.totalReviewRating} />
          )}
          <ReviewAndRating />
          {product && <ProductDetails description={product.description} />}
        </div>
        <div className='w-full md:w-[30%]'>
          {product && (
            <SingleRelatedProduct
              productSubCategory={product.productSubCategory}
            />
          )}
        </div>
      </div>
    </>
  );
}
