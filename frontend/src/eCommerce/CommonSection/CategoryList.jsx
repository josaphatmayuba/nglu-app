import { useEffect } from "react";
import { MdKeyboardArrowRight } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { loadAllCategoryListPublic } from "../../redux/rtk/features/eCommerce/categoryList/categoryListSlice";
import { Skeleton } from "antd";

export default function CategoryList({ setCategoryNav }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.categoryList);
  useEffect(() => {
    dispatch(loadAllCategoryListPublic());
  }, [dispatch]);
  return (
    <div className="absolute duration-300 z-30 w-[280px] top-10 shadow rounded-lg bg-white">
      <div className=" py-5 px-7 text-[16px] font-normal overflow-y-auto no-scrollbar h-[400px]">
        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
          </div>
        )}
        {list &&
          list?.map((category, index) => (
            <div key={index} className="group/item">
              <Link className="flex justify-between items-center  p-1 my-1 hover:bg-gray-50 rounded-lg  hover:text-ePrimary">
                <span>{category.name}</span>
                {category.productSubCategory.length > 0 && (
                  <MdKeyboardArrowRight className="text-gray-400" size={20} />
                )}
              </Link>

              {category?.productSubCategory.length > 0 && (
                <div className="absolute invisible bg-transparent top-0 left-[250px] z-10 group-hover/item:visible">
                  <div className="  w-[280px] shadow ml-[50px] rounded-lg h-[400px] py-5 px-7 bg-white ">
                    {category?.productSubCategory?.map((sub, index) => (
                      <div key={index}>
                        <Link
                          onClick={() => setCategoryNav(false)}
                          to={`/category/${sub.name}?key=${sub.id}`}
                          className="flex justify-between items-center  p-1 my-1 hover:bg-gray-50 rounded-lg  hover:text-ePrimary"
                        >
                          <span>{sub.name}</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
