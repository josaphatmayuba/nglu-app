import React from "react";

function QuantityHandle({ size, quantity, setQuantity, onChange }) {
  function increaseQuantity() {
    setQuantity(quantity + 1);
    onChange && onChange(quantity + 1, "increment");
  }

  function decreaseQuantity() {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      onChange && onChange(quantity - 1, "decrement");
    }
  }
  function handleQuantityChange(event) {
    const newQuantity = parseInt(event.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  }
  return (
    <div
      className={`${
        size == "small" ? "w-28 h-9 rounded" : "w-48 h-12 rounded-lg"
      } flex items-center justify-between  bg-white border border-gray-300  shadow-sm`}
    >
      <button
        className={`${
          size == "small" ? " w-9" : "w-16 "
        } h-full text-2xl rounded-l-lg text-black hover:bg-gray-100 focus:outline-none`}
        onClick={decreaseQuantity}
      >
        -
      </button>
      <input
        type='number'
        className={`${
          size == "small" ? "w-10" : "w-16"
        } h-full text-lg text-black text-center border-r border-l border-gray-300`}
        value={quantity}
        onChange={handleQuantityChange}
      />
      <button
        className={`${
          size == "small" ? "w-9" : "w-16"
        } h-full text-2xl rounded-r-lg text-black hover:bg-gray-100 focus:outline-none`}
        onClick={increaseQuantity}
      >
        +
      </button>
    </div>
  );
}

export default QuantityHandle;
