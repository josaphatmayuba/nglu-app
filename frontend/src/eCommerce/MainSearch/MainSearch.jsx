import { Pagination, Select } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadProductPublicForRelated } from "../../redux/rtk/features/eCommerce/product/productPublicRelatedSlice";
import useQuery from "../../utils/useQuery";
import ProductCard from "../Card/ProductCard";
import Filters from "./Filters";
import MobileFilter from "./MobileFilter";

export default function MainSearch() {
  const dispatch = useDispatch();
  const query = useQuery();
  const { list: products, total } = useSelector((state) => state.products);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 16,
    color: [],
  });

  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };

  useEffect(() => {
    if (query.get("key")) {
      dispatch(
        loadProductPublicForRelated({ ...pageConfig, key: query.get("key") })
      );
    } else {
      dispatch(loadProductPublicForRelated(pageConfig));
    }
  }, [dispatch, pageConfig, query]);

  return (
    <div className='container flex'>
      <div className='hidden md:block w-1/4 border-r'>
        <div className=' border-b h-[81px]'>
          <h1 className='text-xl font-semibold py-3'>Filters</h1>
          <h3 className='text-lg font-medium'>Category</h3>
        </div>
        <Filters setPageConfig={setPageConfig} />
      </div>
      <div className='w-full md:w-3/4'>
        <div className='flex justify-between border-b h-[61px] md:[81px]'>
          <div className='p-3 '>
            <h1 className='text-base md:text-xl font-medium '>
              {query.get("key")
                ? "Search term: " + query.get("key")
                : "Products"}
            </h1>
            <h5 className='text-sm md:text-base'>
              {total > 0 ? `${total} items found` : "not found"}
            </h5>
          </div>
          <div className='hidden md:flex gap-3 items-end mb-2'>
            Sort by:
            <div className='relative filterTag float-left min-w-[120px] max-w-[150px] z-20'>
              <Select
                placeholder='Select'
                showSearch={false}
                popupClassName='bg-white'
                style={{ width: "100%" }}
                maxTagPlaceholder={(item) => (
                  <div className=''>{item.length} Selected</div>
                )}
                maxTagCount={0}
                onChange={(value) =>
                  setPageConfig((prev) => {
                    return { ...prev, price: value };
                  })
                }
              >
                <Select.Option key={"LowToHigh"} value={"LowToHigh"}>
                  Low To High
                </Select.Option>
                <Select.Option key={"HighToLow"} value={"HighToLow"}>
                  High To Low
                </Select.Option>
              </Select>
            </div>
          </div>
        </div>
        <MobileFilter setPageConfig={setPageConfig} />
        <div className='p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4  gap-4'>
          {products?.map((item) => (
            <ProductCard key={item.id} product={item} isRating />
          ))}
        </div>
        <div className='flex justify-center mt-3'>
          {total >= 11 && (
            <Pagination
              total={total}
              showLessItems
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} of ${total} items`
              }
              onChange={fetchData}
              defaultPageSize={16}
              defaultCurrent={1}
              showSizeChanger={total > 10}
            />
          )}
        </div>
      </div>
    </div>
  );
}
