import { Modal } from "antd";
import { useEffect, useState } from "react";
import { BiLogOut } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { FaRegHeart } from "react-icons/fa";
import { FiShoppingBag } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loadSingleCustomerEcom } from "../../redux/rtk/features/eCommerce/customer/customerSlice";
import { loadAllWishlistBYCustomer } from "../../redux/rtk/features/eCommerce/wishlist/wishlistSlice";
import CartDrawer from "./CartDrawer";
import LoginRegistration from "./LoginRegistration";
import SearchForm from "./SearchForm";

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { total } = useSelector((state) => state.wishlist);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLogged = localStorage.getItem("isLogged");
  const customer = localStorage.getItem("role") === "customer";
  const admin = localStorage.getItem("role") !== "customer";
  const customerId = localStorage.getItem("id");
  const [logoError, setLogoError] = useState(false);
  const { data, loading } = useSelector((state) => state?.setting);
  const { customer: customerData } = useSelector(
    (state) => state.customerECommerce
  );

  const showModal = () => {
    setIsModalOpen(true);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (customerId) {
      dispatch(loadAllWishlistBYCustomer({ id: customerId, query: {} }));
      dispatch(loadSingleCustomerEcom());
    }
  }, [customerId, dispatch]);

  const onError = () => {
    setLogoError(true);
  };

  let logoRender = null;
  if (loading) {
    logoRender = (
      <div className=' h-9 w-[150px] flex flex-col gap-1'>
        <h1 className='h-3 w-full bg-slate-900/10 rounded-sm animate-pulse'></h1>
        <h1 className='h-3 w-full bg-slate-900/10 rounded-sm animate-pulse'></h1>
        <h1 className='h-3 w-full bg-slate-900/10 rounded-sm animate-pulse'></h1>
      </div>
    );
  } else if (data?.logo && !logoError) {
    logoRender = (
      <img
        onError={onError}
        loading='lazy'
        className='rounded max-h-[45px]'
        src={data?.logo}
      />
    );
  } else {
    logoRender = (
      <div>
        <h2
          className='text-black text-center ml-4 flex items-center justify-center gap-2'
          style={{ fontSize: "25px" }}
        >
          OS
          <strong style={{ color: "red	", fontWeight: "bold" }}>
            Inventory
          </strong>
        </h2>
      </div>
    );
  }

  const logOut = () => {
    localStorage.clear();
    window.location.replace("/");
  };
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  return (
    <>
      {/*====================================================
                         Upper Header start
      =====================================================*/}
      {/* <div className="hidden md:flex container text-gray-700 py-2 text-sm font-medium border-b justify-between items-center">
        <div className="flex items-center">
          <FiPhoneCall />{" "}
          <p className="pl-2">
            We are available 24/7, Need help?{" "}
            <a className="text-ePrimary" href={`tel:${data?.phone}`}>
              {" "}
              {data?.phone}
            </a>
          </p>
        </div>
        <div className="flex items-center">
          <div>
            <Link>About Us</Link> <span className="mx-2">|</span>
          </div>
          <div>
            <Link>Contact Us</Link> <span className="mx-2">|</span>
          </div>
          <div>
            <Link>Privacy Policy</Link>
            <span className="mx-2">|</span>
          </div>
          <div>
            <Link className="">Terms & Conditions</Link>
          </div>
        </div>
      </div> */}

      {/*==================================================
                          Main Header start                
       ===================================================*/}

      <div className='sticky top-0 z-30'>
        <div className='bg-ePrimary'>
          <div className='container flex justify-between  items-center gap-4 py-3 md:py-4'>
            <div className='w-1/5 hidden md:block'>
              <Link
                to='/'
                className='text-white  mt-2 mb-1 flex items-start  gap-2 '
                style={{ fontSize: "25px" }}
              >
                {logoRender}
              </Link>
            </div>

            <div className='w-full md:w-3/5 '>
              <div className='md:mx-[60px]'>
                <SearchForm />
              </div>
            </div>

            <div className='w-1/5 hidden md:flex justify-end'>
              <div className='flex justify-between text-white items-center gap-5 lg:gap-10'>
                <Link to={"/user/wishlist"} className='relative'>
                  <FaRegHeart size={25} />
                  <div className='absolute text-[10px] -top-[6px] left-[18px] z-10'>
                    <div className='text-center border border-ePrimary  min-w-[18px] leading-[16px] bg-white text-ePrimary rounded-full'>
                      {total <= 0 ? 0 : total}
                    </div>
                  </div>
                </Link>
                <CartDrawer />
                {isLogged && customer ? (
                  <div className='cursor-pointer relative group'>
                    <img
                      onClick={() => navigate("/user")}
                      className='h-[30px] w-[30px] border-2 rounded-full'
                      onError={handleOnError}
                      src={customerData?.profileImage || "/images/default.jpg"}
                      alt='icon'
                    />
                    <div className='hidden  absolute  group-hover:block right-[0px] w-[180px] '>
                      <div className=' flex flex-col mt-8  bg-white shadow py-3 px-5 rounded-lg'>
                        <Link
                          to='/user'
                          className='flex gap-4 text-[14px] py-[6px] text-gray-700 hover:underline hover:text-ePrimary duration-150'
                        >
                          {" "}
                          <CgProfile size={20} />
                          My Profile
                        </Link>
                        <Link
                          to='user/my-order'
                          className='flex gap-4 text-[14px] py-[6px] text-gray-700 hover:underline hover:text-ePrimary duration-150'
                        >
                          <FiShoppingBag size={20} /> My Order
                        </Link>
                        <span
                          onClick={logOut}
                          className='flex gap-4 text-[14px] py-[6px] text-gray-700 hover:underline hover:text-ePrimary duration-150'
                        >
                          <BiLogOut size={20} /> Log Out
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span
                    className='cursor-pointer'
                    onClick={isLogged && admin ? "" : showModal}
                  >
                    <CgProfile size={30} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={isModalOpen} onCancel={handleCancel} footer={null}>
        <LoginRegistration onCancel={handleCancel} />
      </Modal>
    </>
  );
}
