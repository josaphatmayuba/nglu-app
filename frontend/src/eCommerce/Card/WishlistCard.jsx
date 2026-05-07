import { Popover } from "antd";
import { useState } from "react";
import { FaCartPlus } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import {
  deleteWishlist,
  loadAllWishlistBYCustomer,
} from "../../redux/rtk/features/eCommerce/wishlist/wishlistSlice";
import { priceCalculator } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";
import WishlistAttributePopUp from "./WishlistAttributePopUp";

export default function WishlistCard({ product, pageConfig }) {
  const id = localStorage.getItem("id");
  const currency = useCurrency();
  const {
    name,
    productThumbnailImage,
    productSalePriceWithVat,
    productQuantity,
    discount,
  } = product;
  const dispatch = useDispatch();
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  const [open, setOpen] = useState(false);
  const hide = () => {
    setOpen(false);
  };
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
  };
  const handleDeleteWishlist = async () => {
    const resp = await dispatch(deleteWishlist({ id, productId: product.id }));
    if (resp.payload.message === "success") {
      dispatch(loadAllWishlistBYCustomer({ id, query: pageConfig }));
    }
  };
  return (
    <div className="grid grid-cols-12 gap-2 my-4 place-items-center">
      <div className="col-span-8 lg:col-span-5 w-full">
        <div className="flex items-center gap-3 justify-start">
          <img
            className="h-20 w-20 rounded"
            onError={handleOnError}
            src={
              `${import.meta.env.VITE_APP_API}/files/${
                product.productThumbnailImage
              }` || "/images/default.jpg"
            }
            alt="product"
          />
          <div>
            <Link
              to={`/products/${product.id}`}
              className="text-base lg:text-xl font-medium text-gray-700"
            >
              {name}
            </Link>
            <div className="flex items-center gap-5">
              <span className={`text-gray-500`}>
                Brand:{" "}
                <Link
                  to={`/brand/${product?.productBrand?.name}?key=${product.productBrand.id}`}
                  className="text-blue-600"
                >
                  {product?.productBrand?.name}
                </Link>
              </span>
            </div>
            <div>
              {productQuantity > 0 ? (
                <span className={`bg-green-500/10 text-green-700 rounded px-2`}>
                  Stock: {productQuantity}
                </span>
              ) : (
                <span className={`bg-red-500/10 text-red-700 rounded px-2`}>
                  Stock out
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* price  */}
      <div className="col-span-4 text-gray-500 lg:flex flex-wrap gap-10 hidden">
        <span>
          Price:{" "}
          <span className="text-gray-700 font-medium">
            <span
              dangerouslySetInnerHTML={{
                __html: currency?.currencySymbol,
              }}
            />{" "}
            {priceCalculator(productSalePriceWithVat, discount)}
          </span>
        </span>
      </div>
      {/* add to cart button   */}
      <div className="col-span-2">
        {productQuantity > 0 ? (
          <Popover
            content={
              <>
                <WishlistAttributePopUp
                  product={product}
                  handleDeleteWishlist={handleDeleteWishlist}
                />
              </>
            }
            title="Select Variant"
            trigger="click"
            open={open}
            onOpenChange={handleOpenChange}
          >
            <button className="py-2 px-2 lg:px-4 bg-ePrimary rounded duration-150 text-white hover:bg-ePrimary/80">
              <FaCartPlus />
            </button>
          </Popover>
        ) : (
          <button className="py-2 px-2 lg:px-4 bg-gray-700 rounded duration-150  text-white hover:bg-gray-700/80">
            <MdEmail />
          </button>
        )}
      </div>
      {/* delete button */}
      <div className="col-span-1">
        <RiDeleteBin6Line
          size={30}
          onClick={handleDeleteWishlist}
          className="text-red-500 hover:text-red-600 duration-150 cursor-pointer"
        />
      </div>
    </div>
  );
}
