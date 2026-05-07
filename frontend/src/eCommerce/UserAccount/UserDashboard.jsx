import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function UserDashboard() {
  return (
    <div className='container'>
      <div className='flex flex-col lg:flex-row justify-between items-start gap-5 md:gap-10 md:my-10'>
        {/*===================================================
                         user account sidebar
        ======================================================*/}
        <div className='rounded w-full lg:w-[25%] p-5'>
          <div className='hover:text-ePrimary hover:underline text-[14px] duration-150 hover:bg-slate-50 py-1 px-3 rounded-lg my-1'>
            <Link to='/user'>My Account</Link>
          </div>
          <div className='hover:text-ePrimary hover:underline text-[14px] duration-150 hover:bg-slate-50 py-1 px-3 rounded-lg my-1'>
            <Link to='/user/my-order'>My Order</Link>
          </div>
          <div className='hover:text-ePrimary hover:underline text-[14px] duration-150 hover:bg-slate-50 py-1 px-3 rounded-lg my-1'>
            <Link to='/user/my-returns'>My Returns</Link>
          </div>

          <div className='hover:text-ePrimary hover:underline text-[14px] duration-150 hover:bg-slate-50 py-1 px-3 rounded-lg my-1'>
            <Link to='/user/wishlist'>My Wishlist</Link>
          </div>
        </div>

        {/*===================================================
                     user account component container
        ======================================================*/}
        <div className='w-full lg:w-[75%]'>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
