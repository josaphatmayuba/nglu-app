import { Input } from "antd";
import { useState } from "react";
import { BiSearch } from "react-icons/bi";

export default function CommonSearch({ setPageConfig }) {
  const [inputValue, setInputValue] = useState("");

  const onSearchChange = (e) => {
    if (e.target.value === "") {
      setPageConfig((prev) => {
        return prev.key ? { page: 1, count: 10 } : prev;
      });
    }
    setInputValue(e.target.value);
  };

  const onSearch = () => {
    if (inputValue !== "") {
      setPageConfig((prev) => {
        return {
          ...prev,
          key: inputValue,
        };
      });
    }
  };

  return (
    <div className='common-search w-full sm:w-[250px]'>
      <Input.Search
        className='h-[32px] w-full'
        size='small'
        placeholder='Search'
        onChange={onSearchChange}
        onSearch={onSearch}
        enterButton={
          <button
            className='w-[35px] h-[32px] bg-[#4F46E5] text-white rounded-r'
            onChange={onSearch}
          >
            <BiSearch className='w-full' />
          </button>
        }
      />
    </div>
  );
}
