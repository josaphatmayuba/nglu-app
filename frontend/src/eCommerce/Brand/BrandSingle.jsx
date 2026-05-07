import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import useQuery from '../../utils/useQuery';
import { useParams } from 'react-router-dom';
import { loadProductPublicForRelated } from '../../redux/rtk/features/eCommerce/product/productPublicRelatedSlice';
import { Pagination, Select } from 'antd';
import ProductCard from '../Card/ProductCard';
import Filters from './Filters';
import LoadingProductCard from '../CommonSection/LoadingProductCard';
import { TiArrowUnsorted } from 'react-icons/ti';
import { loadAllProductSubCategoryPublic } from '../../redux/rtk/features/productSubCategory/productSubCategorySlice';

export default function BrandSingle() {
  const dispatch = useDispatch();
  const query = useQuery();
  const { name } = useParams();
  const { list: products, loading, total } = useSelector((state) => state.products);
    const { list: category } = useSelector(
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

  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 16,
    color: [],
    productBrandId: query.get("key"),
  });

  useEffect(() => {
    dispatch(loadProductPublicForRelated(pageConfig));
  }, [dispatch, pageConfig]);
  useEffect(() => {
    dispatch(loadAllProductSubCategoryPublic());
  }, [dispatch]);
  return (
    <div className='container flex'>
      <div className='hidden md:block w-1/4 border-r'>
        <div className=' border-b h-[81px]'>
          <h1 className='text-xl font-semibold py-3'>Filters</h1>
          <h3 className='text-lg font-medium'>Brand</h3>
        </div>
        <Filters setPageConfig={setPageConfig} name={name} />
      </div>
      <div className='w-full md:w-3/4'>
        <div className='flex justify-between border-b h-[61px] md:[81px]'>
          <div className='p-3 '>
            <h1 className='text-base md:text-xl font-medium '>{name}</h1>
            <h5 className='text-sm md:text-base'>
              {total > 0 ? `${total} items found` : "Item not found"}
            </h5>
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
