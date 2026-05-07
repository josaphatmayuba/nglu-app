import { cn } from "@/utils/functions";
import { Select } from "antd";
import { useEffect, useState } from "react";
import { GoPlus } from "react-icons/go";
import { useDispatch, useSelector } from "react-redux";
import { loadAllProductBrandByPaginated } from "../../redux/rtk/features/productBrand/productBrandSlice";
import { loadAllProductSubCategory } from "../../redux/rtk/features/productSubCategory/productSubCategorySlice";

export default function ProductFilter({ setPageConfig }) {
  const [selectedFilters, setSelectedFilters] = useState([]);
  const dispatch = useDispatch();
  const { list: brandList, loading: brandLoading } = useSelector(
    (state) => state.productBrands
  );
  const { list: SubCategoryList, loading: SubLoading } = useSelector(
    (state) => state.productSubCategories
  );
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
    dispatch(loadAllProductSubCategory({ query: "all" }));
    dispatch(loadAllProductBrandByPaginated({ query: "all" }));
  }, [dispatch]);

  const filters = [
    {
      key: "productSubCategoryId",
      label: "Sub Category",
      type: "select",
      options: SubCategoryList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[123px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "productBrandId",
      label: "Brand",
      type: "select",
      options: brandList?.map((item) => ({
        label: item?.name,
        value: item?.id,
      })),
      className: "min-w-[100px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
      className: "min-w-[85px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
    {
      key: "unitType",
      label: "Unit Type",
      type: "select",
      options: [
        { label: "kg", value: "kg" },
        { label: "ltr", value: "ltr" },
        { label: "piece", value: "piece" },
      ],
      className: "min-w-[100px] max-w-[150px]",
      popupClassName: "w-[200px]",
    },
  ];

  const filteredFromSelected = filters?.filter((item) =>
    selectedFilters?.includes(item?.key)
  );
  const filteredFromUnSelected = filters?.filter(
    (item) => !selectedFilters?.includes(item?.key)
  );

  return (
    <div className="flex items-center gap-2">
      {filteredFromSelected.map((item) => {
        const { className, popupClassName } = item;
        return (
          <div
            key={item.key}
            className={cn("filterTag float-left min-w-[100px] max-w-[150px]", {
              [className]: className,
            })}
          >
            <Select
              placeholder={item.label}
              className=""
              mode={item.mode || "multiple"}
              popupClassName={cn("", {
                [popupClassName]: popupClassName,
              })}
              showSearch={false}
              style={{ width: "100%" }}
              maxTagPlaceholder={(item) => (
                <div className="">{item.length} Selected</div>
              )}
              maxTagCount={0}
              onChange={(value) => handleChange(value, item.key)}
            >
              {item.options?.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        );
      })}
      <div className="filterTag float-left min-w-[75px] max-w-[150px]">
        <Select
          placeholder="More"
          className=""
          popupClassName="w-[150px]"
          suffixIcon={<GoPlus size={16} />}
          showSearch={false}
          mode="multiple"
          style={{ width: "100%" }}
          maxTagPlaceholder={(item) => <div className="">More</div>}
          maxTagCount={0}
          onChange={(value) => setSelectedFilters(value)}
        >
          {filteredFromUnSelected.map((item) => (
            <Select.Option key={item.key} value={item.key}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>
    </div>
  );
}
