import React, { useEffect, useState } from "react";
import { groupByAttribute } from "../../utils/functions";
import { useDispatch } from "react-redux";
import {
  addToCart,
  loadAllCartByCustomerId,
} from "../../redux/rtk/features/eCommerce/cart/cartSlice";

export default function WishlistAttributePopUp({
  product,
  handleDeleteWishlist,
}) {
  const [selectedColor, setColor] = useState();
  const [selectedAttributeValue, setAttributeValue] = useState([]);
  const customerId = Number(localStorage.getItem("id"));
  const dispatch = useDispatch();

  const addCart = async () => {
    const data = {
      customerId,
      cartProduct: [
        {
          productId: product.id,
          productQuantity: 1,
          productAttributeValueId: selectedAttributeValue,
          colorId: selectedColor || null,
        },
      ],
    };
    const resp = await dispatch(addToCart(data));
    if (resp.payload.message === "success") {
      dispatch(loadAllCartByCustomerId(customerId));
      handleDeleteWishlist();
    }
  };
  useEffect(() => {
    if (product?.productColor?.length > 0) {
      setColor(product?.productColor[0].colorId);
    }
  }, [product?.productColor]);
  return (
    <div className="px-3 py-1">
      <div>
        {product.productColor?.length == 0 &&
          product?.productProductAttributeValue?.length == 0 && (
            <p className="text-center font-semibold text-lg text-gray-500">Not Variant Found </p>
          )}
        {product.productColor?.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="mr-3">Color:</span>
            {product.productColor?.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 items-center">
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
            (item, index) => {
              return (
                <div key={index} className="flex gap-2 items-start mt-5">
                  <span className="mr-3">
                    {item[0].productAttributeValue.productAttribute.name}:
                  </span>
                  {item.map((item, index) => (
                    <span
                      onClick={() =>
                        setAttributeValue((prev) => {
                          const hasValue = prev.find(
                            (value) => value == item.productAttributeValue.id
                          );
                          if (hasValue) {
                            return prev.filter(
                              (value) => value !== item.productAttributeValue.id
                            );
                          }
                          return [...prev, item.productAttributeValue.id];
                        })
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
      </div>
      <div className="mt-5 flex justify-end text-white">
        <button className="bg-ePrimary px-3 py-1 rounded" onClick={addCart}>
          Add To Cart
        </button>
      </div>
    </div>
  );
}
