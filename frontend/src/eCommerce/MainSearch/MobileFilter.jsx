import { Select } from "antd";
import { useEffect } from "react";
import { TiArrowUnsorted } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import { loadAllProductBrandPublic } from "../../redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductSubCategoryPublic } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";

export default function MobileFilter({ setPageConfig }) {
  const dispatch = useDispatch();
  const { list } = useSelector((state) => state.productBrands);
  const { list: category } = useSelector((state) => state.productSubCategories);

  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
        page: 1,
      };
    });
  };

  useEffect(() => {
    dispatch(loadAllProductSubCategoryPublic());
    dispatch(loadAllProductBrandPublic());
  }, [dispatch]);

  return (
    <div className='md:hidden flex gap-2 items-center flex-wrap py-3 border-b'>
      <div className='filterTag float-left min-w-[120px] max-w-[150px]'>
        <Select
          placeholder='Category'
          popupClassName='bg-white'
          showSearch={false}
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className=''>{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "productSubCategoryId")}
        >
          {category?.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item?.name}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div className='filterTag float-left min-w-[120px] max-w-[150px]'>
        <Select
          placeholder='Brand'
          popupClassName='bg-white'
          showSearch={false}
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => (
            <div className=''>{item.length} Selected</div>
          )}
          maxTagCount={0}
          onChange={(value) => handleChange(value, "productBrandId")}
        >
          {list?.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item?.name}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div
        onClick={() =>
          setPageConfig((prev) => {
            if (prev.price === "LowToHigh") {
              return { ...prev, price: "HighToLow" };
            } else if (prev.price === "HighToLow") {
              return { ...prev, price: "LowToHigh" };
            } else {
              return { ...prev, price: "LowToHigh" };
            }
          })
        }
        className='flex items-center bg-[#d7d7d7] px-2 py-1 rounded'
      >
        Price
        <TiArrowUnsorted />
      </div>
    </div>
  );
}
