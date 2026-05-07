import { Image } from "antd";
import ReactStars from "react-rating-star-with-type";
import { timeAgo } from "../../utils/functions";
export default function ReviewCard({ review }) {
  return (
    <div className='border-b p-2'>
      <div className='flex gap-3 items-center justify-between pb-2 '>
        <div className='flex gap-3 items-center'>
          <ReactStars isHalf value={review.rating} valueShow />
          <span>{review?.customer?.username}</span>
        </div>
        <span className='text-sm'>{timeAgo(review?.createdAt)}</span>
      </div>
      <p className=''>{review?.review}</p>
      <div className='p-2'>
        <Image.PreviewGroup>
          {review?.images?.map((image, index) => (
            <Image
              rootClassName='mr-2'
              key={index}
              className='rounded-lg'
              width={80}
              height={80}
              src={`${import.meta.env.VITE_APP_API}/files/${image.ImageName}`}
            />
          ))}
        </Image.PreviewGroup>
      </div>

      {review?.reviewReply?.length > 0 && (
        <div className='p-3 rounded bg-slate-100'>
          <div className='flex justify-between pb-2'>
            <p className='text-ePrimary font-medium'>Seller Response</p>
            <div className='text-sm text-gray-600'>
              {timeAgo(review.reviewReply[0].createdAt)}
            </div>
          </div>
          <p
            className=''
            dangerouslySetInnerHTML={{
              __html: review?.reviewReply[0]?.comment,
            }}
          />
        </div>
      )}
    </div>
  );
}
