import React, { useEffect, useState } from "react";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useDispatch } from "react-redux";
import {
  deleteLocalCart,
  loadAllCartByCustomerId,
  updateCart,
  updateLocalCart,
} from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import { priceCalculator } from "../../utils/functions";
import useCurrency from "../../utils/useCurrency";
import QuantityHandle from "../SingleProduct/QuantityHandle";

export default function CartCard({ isQuantity, isStock, data, cartId }) {
  const { productQuantity, product, cartAttributeValue, colors } = data;
  const dispatch = useDispatch();
  const currency = useCurrency();
  const customerId = localStorage.getItem("id");
  const [quantity, setQuantity] = useState(productQuantity);
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  useEffect(() => {
    if (productQuantity) {
      setQuantity(productQuantity);
    }
  }, [productQuantity]);
  const onChange = async (value, type) => {
    if (!customerId) {
      dispatch(updateLocalCart({ id: data.id, type }));
      return;
    }

    const resp = await dispatch(
      updateCart({
        id: cartId,
        values: {
          cartProductId: data.id,
          type,
          productQuantity: 1,
        },
      })
    );

    if (resp.payload.message === "success") {
      dispatch(loadAllCartByCustomerId(customerId));
    }
  };

  const onDelete = async () => {
    if (!customerId) {
      dispatch(deleteLocalCart(data.id));
      return;
    }
    const resp = await dispatch(
      updateCart({
        id: cartId,
        values: {
          cartProductId: data.id,
          type: "decrement",
          productQuantity: 0,
        },
      })
    );

    if (resp.payload.message === "success") {
      dispatch(loadAllCartByCustomerId(customerId));
    }
  };
  return (
    <div className='my-2 flex  gap-2 px-5 py-2 hover:bg-gray-50'>
      <div className='flex gap-4 md:w-1/4 justify-center md:justify-start  w-1/2'>
        <div>
          <img
            className='w-full h-full md:w-10 md:h-10 lg:h-14 lg:w-14  rounded-lg object-cover'
            onError={handleOnError}
            src={
              `${import.meta.env.VITE_APP_API}/files/${
                product?.productThumbnailImage
              }` || "/images/default.jpg"
            }
            alt='product'
          />
        </div>
      </div>
      <div className='flex flex-col md:flex-row gap-2  md:items-center justify-between items-start md:w-3/4 w-1/2'>
        <div>
          <p className='font-medium text-gray-800 text-sm md:text-base'>
            {product?.name}
          </p>
          <p className='text-gray-500'>
            Item Price:{" "}
            <span>
              <span
                dangerouslySetInnerHTML={{
                  __html: currency?.currencySymbol,
                }}
              />{" "}
              {priceCalculator(
                product?.productSalePriceWithVat,
                product?.discount
              )}
            </span>
          </p>
          <div className='text-gray-500 text-[10px]'>
            {colors && <span>Color: {colors?.name} </span>}
            <span>
              {cartAttributeValue?.map((value, index) => (
                <span
                  className=' m-[2px] p-[2px] rounded-sm '
                  key={index}
                >{`${value.productAttributeValue?.productAttribute?.name} : ${value.productAttributeValue?.name}`}</span>
              ))}{" "}
            </span>
          </div>
        </div>
        <div className=''>
          {isQuantity && (
            <div>
              <QuantityHandle
                quantity={quantity}
                setQuantity={setQuantity}
                size={"small"}
                onChange={onChange}
              />
            </div>
          )}
          {isStock && (
            <div>
              <span className={`bg-green-500/10 text-green-700 rounded px-2`}>
                Stock: 100
              </span>
            </div>
          )}
        </div>
        <div className=''>
          <RiDeleteBin6Line
            onClick={onDelete}
            className='text-red-500 text-2xl text-[20px] md:text-[25px] hover:text-red-600 cursor-pointer'
          />
        </div>
      </div>
    </div>
  );
}
