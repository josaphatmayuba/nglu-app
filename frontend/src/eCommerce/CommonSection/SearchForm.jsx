import { useRef, useState } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { MdClear } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  clearSearchProductList,
  loadProductPublicForSearch,
} from "../../redux/rtk/features/eCommerce/productSearch/productSearchSlice";
import LiveSearchCard from "../Card/LiveSearchCard";
export default function SearchForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const debounceTimeoutRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { list } = useSelector((state) => state.productPublicSearch);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(clearSearchProductList());
    if (searchTerm !== "" && searchTerm) {
      navigate(`/search?key=${searchTerm}`);
    }
  };

  const onChange = (e) => {
    setSearchTerm(e.target.value);
    debounceTimeoutRef.current = setTimeout(async () => {
      if (e.target.value !== "") {
        dispatch(
          loadProductPublicForSearch({
            query: "search",
            key: e.target.value,
            count: 7,
          })
        );
      } else {
        dispatch(clearSearchProductList());
      }
    }, 500);
  };

  const handleClear = () => {
    if (searchTerm !== "") {
      setSearchTerm("");
      dispatch(clearSearchProductList());
    }
  };

  return (
    <div className='relative'>
      <form onSubmit={handleSearch} className='relative'>
        <input
          type='text'
          value={searchTerm}
          onChange={onChange}
          className={`w-full py-[10px] px-5 rounded-lg outline-0 ${
            list?.length > 0 && "rounded-b-none"
          }`}
          placeholder='Search Everything...'
        />
        {searchTerm && (
          <button
            type='button'
            onClick={handleClear}
            className='text-black/50 absolute  right-8 h-full pl-2 pr-4 z-10 '
          >
            <MdClear size={25} />
          </button>
        )}
        <button
          type='submit'
          className='text-gray-400 absolute  right-0 h-full pl-2 pr-4 z-10 '
        >
          <IoSearchOutline size={25} />
        </button>
      </form>
      {list?.length > 0 && (
        <div
          className={`absolute bg-white shadow-md w-full rounded-b-lg max-h-80 md:max-h-[600px] overflow-y-auto `}
        >
          {list.map((item) => (
            <LiveSearchCard
              key={item.id}
              product={item}
              handleClear={handleClear}
            />
          ))}
        </div>
      )}
    </div>
  );
}
