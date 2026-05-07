import { Drawer, Modal } from "antd";
import React, { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { FiShoppingCart } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { IoBagCheckOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { cartToggler } from "../../redux/rtk/features/cart/cartSlice";
import { loadAllCartByCustomerId } from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import Cart from "../Cart/Cart";
import LoginRegistration from "./LoginRegistration";
const CartDrawer = ({ position, width }) => {
  const customerId = localStorage.getItem("id");
  const { isOpen } = useSelector((state) => state.cart);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const showDrawer = () => {
    dispatch(cartToggler(true));
  };
  const onClose = () => {
    dispatch(cartToggler(false));
  };

  const { list } = useSelector((state) => state.cartDynamic);

  useEffect(() => {
    if (customerId) {
      dispatch(loadAllCartByCustomerId(customerId));
    }
  }, [customerId, dispatch]);

  const totalQyt =
    list?.cartProducts?.reduce((total, current) => {
      return total + current.productQuantity;
    }, 0) || 0;

  const handleCheckoutBtn = () => {
    if (!customerId) {
      showModal();
      onClose();
      return;
    }
    navigate("/proceed-to-checkout");
    onClose();
  };

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="cursor-pointer" onClick={showDrawer}>
        <div className="relative">
          <FiShoppingCart size={25} />
          <div className="absolute text-[10px] -top-[6px] left-[18px] z-10">
            <div className="text-center border border-ePrimary  min-w-[18px] leading-[16px] bg-white text-ePrimary rounded-full">
              {totalQyt}
            </div>
          </div>
        </div>
      </div>
      <Drawer
        title={
          <div className="flex">
            <IoBagCheckOutline size={20} />
            <span className="pl-2"> Shopping Cart</span>
          </div>
        }
        placement={position}
        closable={false}
        onClose={onClose}
        open={isOpen}
        width={window.innerWidth <= 768 ? "100%" : width ? `${width}%` : "30%"}
        footer={
          <button
            disabled={list?.error || list?.cartProducts?.length === 0}
            onClick={handleCheckoutBtn}
            className="w-full flex justify-center bg-ePrimary disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg py-2 px-6 items-center"
          >
            <div className="flex items-center gap-2 text-white text-[18px] font-medium  ">
              <FaShoppingCart /> <span>Checkout</span>{" "}
            </div>
          </button>
        }
        extra={
          <div
            className="bg-slate-50 text-gray-500 cursor-pointer p-2 rounded-full hover:bg-red-50 hover:text-red-500 duration-150"
            onClick={onClose}
          >
            <IoMdClose size={20} />
          </div>
        }
      >
        <Cart list={list} />
      </Drawer>

      <Modal open={isModalOpen} onCancel={handleCancel} footer={null}>
        <LoginRegistration onCancel={handleCancel} />
      </Modal>
    </>
  );
};
export default CartDrawer;
