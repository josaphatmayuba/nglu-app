import React, { useEffect, useState } from "react";

import { Pagination } from "antd";
import { FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { loadAllWishlistBYCustomer } from "../../redux/rtk/features/eCommerce/wishlist/wishlistSlice";
import WishlistCard from "../Card/WishlistCard";
import WishlistLoading from "../Card/WishlistLoading";

export default function Wishlist() {
  const dispatch = useDispatch();
  const customerId = localStorage.getItem("id");
  const { list, loading, total } = useSelector((state) => state.wishlist);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
  });

  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };
  useEffect(() => {
    dispatch(loadAllWishlistBYCustomer({ id: customerId, query: pageConfig }));
  }, [dispatch, customerId, pageConfig]);

  let content;

  if (loading) {
    content = (
      <>
        <WishlistLoading />
        <WishlistLoading />
        <WishlistLoading />
      </>
    );
  } else if (list && !loading && list.length > 0) {
    content = list.map((product, index) => (
      <WishlistCard key={index} product={product} pageConfig={pageConfig} />
    ));
  } else {
    content = (
      <div className='flex justify-center'>
        <div className='relative'>
          <span className='absolute text-slate-100 font-think text-[20px] left-7 top-1/3'>
            Wishlist Empty
          </span>
          <FaRegHeart size={200} className='text-slate-50' />
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg p-2 lg:p-5'>
      <h1 className='font-medium pb-4 border-b'>My Wishlist</h1>
      <div className='py-5'>{content}</div>
      {total >= 11 && (
        <Pagination
          total={total}
          showTotal={(total, range) =>
            `${range[0]}-${range[1]} of ${total} items`
          }
          onChange={fetchData}
          defaultPageSize={10}
          defaultCurrent={1}
          showSizeChanger={total > 10}
        />
      )}
    </div>
  );
}
