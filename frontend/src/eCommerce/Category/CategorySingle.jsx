import { Pagination, Select } from "antd";
import { useEffect, useState } from "react";
import { TiArrowUnsorted } from "react-icons/ti";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { loadProductPublicForRelated } from "../../redux/rtk/features/eCommerce/product/productPublicRelatedSlice";
import useQuery from "../../utils/useQuery";
import ProductCard from "../Card/ProductCard";
import Filters from "./Filters";
import LoadingProductCard from "../CommonSection/LoadingProductCard";
import { loadAllProductBrandPublic } from "../../redux/rtk/features/productBrand/productBrandSlice";

export default function CategorySingle() {
  const dispatch = useDispatch();
  const query = useQuery();
  const { name } = useParams();
  const { list: products, loading, total } = useSelector((state) => state.products);
    const { list } = useSelector((state) => state.productBrands);

  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 16,
    color: [],
    productSubCategoryId: query.get("key"),
  });
const handleChange = (value, name) => {
  setPageConfig((prev) => {
    return {
      ...prev,
      [name]: value,
      page: 1,
    };
  });
  };
  
  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };

  useEffect(() => {
    dispatch(loadProductPublicForRelated(pageConfig));
  }, [dispatch, pageConfig, query, name]);
  useEffect(() => {
        dispatch(loadAllProductBrandPublic());
  }, [dispatch]);
  return (
    <div className='container flex'>
      <div className='hidden md:block w-1/4 border-r'>
        <div className=' border-b h-[81px]'>
          <h1 className='text-xl font-semibold py-3'>Filters</h1>
          <h3 className='text-lg font-medium'>Category</h3>
        </div>
        <Filters setPageConfig={setPageConfig} name={name} />
      </div>
      <div className='w-full md:w-3/4'>
        <div className='flex justify-between border-b h-[61px] md:[81px]'>
          <div className='p-3 '>
            <h1 className='text-base md:text-xl font-medium '>{name}</h1>
            <div className='text-sm md:text-base'>
              {total > 0 ? (
                <span>{`${total} items found`}</span>
              ) : (
                <span>Item not found</span>
              )}
            </div>
          </div>
          <div className='hidden md:flex gap-3 items-end mb-2'>
            Sort by:
            <div className='relative filterTag float-left min-w-[120px] max-w-[150px] z-20'>
              <Select
                placeholder='Select'
                popupClassName='bg-white'
                showSearch={false}
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
        <div className='md:hidden flex gap-2 items-center flex-wrap py-3 border-b'>
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
          <div className='filterTag float-left min-w-[120px] max-w-[150px]'>
            <Select
              placeholder='Select'
              showSearch={false}
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
          <div className='flex items-center bg-[#d7d7d7] px-2 py-1 rounded'>
            Price
            <TiArrowUnsorted />
          </div>
        </div>
        <div className='p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4  gap-4'>
          {loading && (
            <>
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
              <LoadingProductCard />
            </>
          )}
          {products &&
            !loading &&
            products?.map((item) => (
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
