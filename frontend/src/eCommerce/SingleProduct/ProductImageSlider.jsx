import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import { Image } from "antd";
import { useState } from "react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import { FreeMode, Navigation, Thumbs } from "swiper/modules";

export default function ProductImageSlider({ data }) {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  return (
    <>
      <Swiper
        style={{
          "--swiper-navigation-color": "#fff",
          "--swiper-pagination-color": "#fff",
        }}
        spaceBetween={10}
        thumbs={{ swiper: thumbsSwiper }}
        modules={[FreeMode, Navigation, Thumbs]}
        className='mySwiper2'
      >
        {data.map((item) => (
          <SwiperSlide key={item.id}>
            <Image src={item.imageUrl} />
          </SwiperSlide>
        ))}
        {!import.meta.env.PROD && (
          <>
            <SwiperSlide>
              <Image src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682058933%2Fproduct%2FCMTHP-COR12-turkish-blue-920x920.webp&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <Image src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1681478890%2Fproduct%2FCMTHP-COR12-black-920x920.webp&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <Image src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682243541%2Fproduct%2F60c88fa9379ac-square.jpg&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <Image src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682243541%2Fproduct%2F6291b3a8d833d-square.jpg&w=750&q=75' />
            </SwiperSlide>
          </>
        )}
      </Swiper>
      <Swiper
        onSwiper={setThumbsSwiper}
        spaceBetween={10}
        slidesPerView={4}
        freeMode={true}
        navigation={true}
        watchSlidesProgress={true}
        modules={[FreeMode, Navigation, Thumbs]}
        className='mySwiper'
      >
        {data.map((item) => (
          <SwiperSlide key={item.id}>
            <Image className='' src={item.imageUrl} />
          </SwiperSlide>
        ))}
        {!import.meta.env.PROD && (
          <>
            <SwiperSlide>
              <img src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682058933%2Fproduct%2FCMTHP-COR12-turkish-blue-920x920.webp&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <img src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1681478890%2Fproduct%2FCMTHP-COR12-black-920x920.webp&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <img src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682243541%2Fproduct%2F60c88fa9379ac-square.jpg&w=750&q=75' />
            </SwiperSlide>
            <SwiperSlide>
              <img src='https://kachabazar-store-nine.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fahossain%2Fimage%2Fupload%2Fv1682243541%2Fproduct%2F6291b3a8d833d-square.jpg&w=750&q=75' />
            </SwiperSlide>
          </>
        )}
      </Swiper>
    </>
  );
}
