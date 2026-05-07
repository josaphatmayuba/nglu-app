import { Menu, Skeleton } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCartByCustomerId } from "../../redux/rtk/features/eCommerce/cart/cartSlice";
import { Link } from "react-router-dom";
import { loadAllCategoryListPublic } from "../../redux/rtk/features/eCommerce/categoryList/categoryListSlice";

export default function FooterMenu({ onClose }) {
    const dispatch = useDispatch();
    const { list,loading } = useSelector((state) => state.categoryList);
    useEffect(() => {
      dispatch(loadAllCategoryListPublic());
    }, [dispatch]);

  function getItem(label, key, children, type) {
    return {
      key,
      children,
      label,
      type,
    };
  }
  
  let content;
  if (loading ) {
    content = (
      <div className="p-3 flex flex-col gap-2">
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  }
  else if (list?.length > 0 && !loading) { 
  const Items = list.map((category) => {
      if (
        category.productSubCategory &&
        category.productSubCategory.length > 0
      ) {
        const subItems = category.productSubCategory.map((sub) =>
          getItem(
            <Link
              onClick={onClose}
              className="mobileMenu"
              to={`/category/${sub.name}?key=${sub.id}`}
            >
              {sub.name}
            </Link>,
            sub.id
          )
        );

        return getItem(category.name, category.id, subItems);
      } else {
        return getItem(category.name, category.id);
      }
    });
    content =(<Menu
      style={{
        border: 0,
      }}
      mode="inline"
      items={Items }
    />)
  }
  else if (!loading && list?.length == 0) {
    content = "No Category Found";
  }
  return content;
}
