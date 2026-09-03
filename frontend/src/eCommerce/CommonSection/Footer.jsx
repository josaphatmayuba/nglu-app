import { Modal } from "antd";
import { useEffect, useState } from "react";
import { BiHomeAlt2 } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { cartToggler } from "../../redux/rtk/features/cart/cartSlice";
import { loadSingleCustomerEcom } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import LoginRegistration from "./LoginRegistration";
import MenuDrawer from "./MenuDrawer";

export default function Footer() {
  const { data } = useSelector((state) => state.setting);
  return (
    <div className="bg-white">
      {data && (
        <div className="flex justify-center items-center py-3">
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      )}
      {/* <FooterMobile /> */}
    </div>
  );
}

const FooterMobile = () => {
  const isLogged = localStorage.getItem("isLogged");
  const customer = localStorage.getItem("role") === "customer";
  const admin = localStorage.getItem("role") !== "customer";
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { customer: customerData, loading: customerLoading } = useSelector(
    (state) => state.customerECommerce,
  );
  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const dispatch = useDispatch();

  const { list } = useSelector((state) => state.cartDynamic);
  const totalQyt =
    list?.cartProducts?.reduce((total, current) => {
      return total + current.productQuantity;
    }, 0) || 0;
  useEffect(() => {
    dispatch(loadSingleCustomerEcom());
  }, [dispatch]);
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  return (
    <div className=" lg:hidden mt-[100px] h-[60px] w-full bg-ePrimary border-t border-ePrimary shadow fixed bottom-0 flex justify-between items-center px-8 z-20">
      <div className="container flex justify-between items-center">
        <Link to={"/"}>
          <BiHomeAlt2 size={25} className="text-white" />
        </Link>
        <MenuDrawer />

        <div
          onClick={() => dispatch(cartToggler(true))}
          className="relative cursor-pointer">
          <FiShoppingCart size={25} className="text-white" />
          <div className="absolute text-[10px] -top-[6px] left-[18px] z-10">
            <div className="text-center border border-ePrimary  min-w-[16px] leading-[14px] bg-white text-ePrimary rounded-full">
              {totalQyt}
            </div>
          </div>
        </div>
        {isLogged && customer ? (
          <Link to="/user" className="cursor-pointer">
            <img
              onError={handleOnError}
              className="h-[30px] w-[30px] border-2 rounded-full"
              src={customerData?.profileImage || "/images/default.jpg"}
              alt="icon"
            />
          </Link>
        ) : (
          <span
            className="cursor-pointer"
            onClick={isLogged && admin ? "" : showModal}>
            <CgProfile className="text-white" size={25} />
          </span>
        )}
      </div>
      <Modal open={isModalOpen} onCancel={handleCancel} footer={null}>
        <LoginRegistration onCancel={handleCancel} />
      </Modal>
    </div>
  );
};
