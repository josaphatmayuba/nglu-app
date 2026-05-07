// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
// Import Swiper styles
import { Skeleton } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import "swiper/css";
import "swiper/css/pagination";
import { Autoplay, Pagination } from "swiper/modules";
import { loadAllSliderImagesPublic } from "../../redux/rtk/features/eCommerce/slider/sliderSlice";
import CategoryListForHero from "./CategoryListForHero";
export default function Hero() {
  const dispatch = useDispatch();
  const { publicList, loading } = useSelector((state) => state.slider);

  useEffect(() => {
    dispatch(loadAllSliderImagesPublic());
  }, [dispatch]);

  let content = null;
  if (loading) {
    content = (
      <>
        <div className="hidden md:flex flex-col gap-3 bg-white p-2">
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </div>
        <div className="md:hidden h-[200px] overflow-hidden flex flex-col gap-3 bg-white p-2">
          <Skeleton active />
          <Skeleton active />
        </div>
      </>
    );
  } else if (publicList?.length > 0 && !loading) {
    content = publicList.map((item) => (
      <SwiperSlide key={item.id}>
        <div
          style={{ backgroundImage: `url(${item.image})` }}
          className='h-[200px] md:h-[400px]  bg-cover'
        ></div>
      </SwiperSlide>
    ));
  } else {
    content = (
      <SwiperSlide>
        <div className='h-[200px] md:h-[400px]  bg-cover bg-slate-400 text-white flex justify-center items-center'>
          Slider not found, please add
        </div>
      </SwiperSlide>
    );
  }

  return (
    <div className='container'>
      <div className=' relative flex gap-5 my-5 h-[200px] md:h-[400px]'>
        <div className='hidden lg:block w-1/4 shadow rounded-lg bg-white'>
          <CategoryListForHero />
        </div>
        <div className='w-full lg:w-9/12  rounded-lg'>
          <Swiper
            autoplay={true}
            pagination={true}
            modules={[Autoplay, Pagination]}
            className='mySwiper rounded-lg'
            loop={true}
          >
            {content}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
