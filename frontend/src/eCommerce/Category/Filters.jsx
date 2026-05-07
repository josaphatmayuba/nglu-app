import { Checkbox, Tag } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadAllColorPublic } from "../../redux/rtk/features/color/colorSlice";
import { loadAllProductBrandPublic } from "../../redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductSubCategoryPublic } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";
import PriceFilter from "./PriceFilter";

export default function Filters({ setPageConfig, name }) {
  const dispatch = useDispatch();
  const [color, setColor] = useState();
  const { list } = useSelector((state) => state.productBrands);
  const { list: colors } = useSelector((state) => state.colors);

  const handleBrand = (value) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        productBrandId: value,
      };
    });
  };

  const handleColorChange = (value) => {
    setColor((prev) => {
      if (prev?.id === value.id) {
        return null;
      }
      return value;
    });
    setPageConfig((prev) => {
      if (prev?.color && prev.color[0] === value.id) {
        return {
          ...prev,
          color: [],
        };
      }

      return {
        ...prev,
        color: [value.id],
      };
    });
  };

  useEffect(() => {
    dispatch(loadAllProductSubCategoryPublic());
    dispatch(loadAllProductBrandPublic());
    dispatch(loadAllColorPublic());
  }, [dispatch]);
  return (
    <>
      <div>{name}</div>
      <div className='py-5'>
        <h3 className='border-b font-medium text-lg'>Brand</h3>
        <Checkbox.Group
          className='flex-col py-3'
          options={
            list?.map((item) => {
              return { label: item.name, value: item.id };
            }) || []
          }
          onChange={handleBrand}
        />
      </div>
      <div className='py-5'>
        <h3 className='border-b font-medium text-lg'>Colors</h3>
        <div className='flex flex-wrap gap-3 py-3'>
          {colors?.map((item) => (
            <Tag.CheckableTag
              className={color?.id === item.id && ""}
              onClick={() => handleColorChange(item)}
              key={item.id}
              checked={color?.id === item.id}
              color={item.colorCode}
            >
              {item.name}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>
      <div className='py-5'>
        <h3 className='border-b font-medium text-lg'>Price</h3>
        <div className='py-3'>
          <PriceFilter setPageConfig={setPageConfig} />
        </div>
      </div>
    </>
  );
}
