import ReactStars from "react-rating-star-with-type";
import { averageRatingPercentageCalculate } from "../../utils/functions";
import ProcessBarForRating from "./ProcessBarForRating";

export default function RatingHeadCard({ reviewRating }) {
  return (
    <div>
      <h1 className='text-xl font-medium p-2'>Rating & Reviews</h1>
      <div className='bg-white p-5 border-b'>
        <div className='flex flex-col lg:flex-row justify-between items-center gap-5'>
          <div className='w-full md:w-1/2'>
            <div className='flex justify-between items-center gap-3'>
              <span>5 Star</span>
              <div className='w-1/2 md:w-[60%]'>
                <ProcessBarForRating
                  percentage={averageRatingPercentageCalculate(
                    reviewRating,
                    "five"
                  )}
                />
              </div>
              <span>{`(${reviewRating?.Rating?.five || 0})`}</span>
            </div>

            <div className='flex justify-between items-center gap-3'>
              <span>4 Star</span>
              <div className='w-1/2 md:w-[60%]'>
                <ProcessBarForRating
                  percentage={averageRatingPercentageCalculate(
                    reviewRating,
                    "four"
                  )}
                />
              </div>
              <span>{`(${reviewRating?.Rating?.four || 0})`}</span>
            </div>

            <div className='flex justify-between items-center gap-3'>
              <span>3 Star</span>
              <div className='w-1/2 md:w-[60%]'>
                <ProcessBarForRating
                  percentage={averageRatingPercentageCalculate(
                    reviewRating,
                    "three"
                  )}
                />
              </div>
              <span>{`(${reviewRating?.Rating?.three || 0})`}</span>
            </div>

            <div className='flex justify-between items-center gap-3'>
              <span>2 Star</span>
              <div className='w-1/2 md:w-[60%]'>
                <ProcessBarForRating
                  percentage={averageRatingPercentageCalculate(
                    reviewRating,
                    "two"
                  )}
                />
              </div>
              <span>{`(${reviewRating?.Rating?.two || 0})`}</span>
            </div>

            <div className='flex justify-between items-center gap-3'>
              <span>1 Star</span>
              <div className='w-1/2 md:w-[60%]'>
                <ProcessBarForRating
                  percentage={averageRatingPercentageCalculate(
                    reviewRating,
                    "one"
                  )}
                />
              </div>
              <span>{`(${reviewRating?.Rating?.one || 0})`}</span>
            </div>
          </div>

          <div className='w-full md:w-1/2 py-3 flex flex-col items-center justify-center gap-4'>
            <span className='font-semibold text-3xl'>
              {Number(reviewRating?.averageRating).toFixed(2) || 0}
            </span>
            <ReactStars value={reviewRating?.averageRating} size={23} />
            Total Review {reviewRating?.totalReview}
          </div>
        </div>
      </div>
    </div>
  );
}
