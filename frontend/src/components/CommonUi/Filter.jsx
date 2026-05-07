import { cn } from "@/utils/functions";
import { Select } from "antd";
import { FilterIcon } from "lucide-react";
import { useState } from "react";
import { GoPlus } from "react-icons/go";
import { RxCross2 } from "react-icons/rx";

export default function Filter({ setPageConfig, filters }) {
  const [selectedFilters, setSelectedFilters] = useState([]);

  if (!Array.isArray(filters)) return null;
  const handleChange = (value, name) => {
    setPageConfig((prev) => {
      return {
        ...prev,
        [name]: value,
        page: 1,
      };
    });
  };

  const filteredFromSelected = filters?.filter((item) =>
    selectedFilters?.includes(item?.key)
  );
  const filteredFromUnSelected = filters?.filter(
    (item) => !selectedFilters?.includes(item?.key)
  );

  return (
    <div className='flex items-center gap-2'>
      {filteredFromSelected.map((item) => {
        const { className, popupClassName } = item;
        return (
          <div key={item.key} className='flex bg-[#F4F5F6] rounded-md pr-2'>
            <div
              className={cn(
                "filterTag float-left min-w-[100px] max-w-[150px]",
                {
                  [className]: className,
                }
              )}
            >
              <Select
                placeholder={item.label}
                className=''
                mode={item.mode || "multiple"}
                popupClassName={cn("", {
                  [popupClassName]: popupClassName,
                })}
                showSearch={false}
                style={{ width: "100%" }}
                maxTagPlaceholder={(item) => (
                  <div className=''>{item.length} Selected</div>
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
            <button
              onClick={() =>
                setSelectedFilters((prev) => {
                  return prev.filter((n) => n !== item.key);
                })
              }
            >
              <RxCross2 />
            </button>
          </div>
        );
      })}
      {filteredFromUnSelected.length > 0 && (
        <div className='filterTag float-left min-w-[90px] max-w-[150px]'>
          <Select
            placeholder={<div className='flex items-center gap-1'>
              <FilterIcon size={14} /><span>{"Filter"}</span>
            </div>}
            className=''
            popupClassName='w-[150px]'
            suffixIcon={<GoPlus size={16} />}
            showSearch={false}
            mode='multiple'
            style={{ width: "100%" }}
            maxTagPlaceholder={(item) => <div className='flex items-center gap-1'>
              <FilterIcon size={14} /><span>{"Filter"}</span>
            </div>}
            maxTagCount={0}
            onChange={(value) => setSelectedFilters(value)}
            value={selectedFilters}
          >
            {filteredFromUnSelected.map((item) => (
              <Select.Option key={item.key} value={item.key}>
                {item.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
