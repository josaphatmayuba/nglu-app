import { Pagination } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { loadReviewRatingByCustomer } from "../../redux/rtk/features/eCommerce/reviewRating/reviewRatingSlice";
import ReviewCard from "../Card/ReviewCard";
import ReviewCardLoading from "../Card/ReviewCardLoading";
export default function ReviewAndRating() {
  const dispatch = useDispatch();
  const { id } = useParams("id");
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });
  const { list, total, loading } = useSelector((state) => state.reviewRating);
  useEffect(() => {
    dispatch(loadReviewRatingByCustomer({ id: id, arg: pageConfig }));
  }, [dispatch, id, pageConfig]);

  const fetchData = (page, count) => {
    setPageConfig((prev) => {
      return { ...prev, page, count };
    });
  };

  let content;
  if (loading) {
    content = <ReviewCardLoading />;
  } else if (list && list.length > 0) {
    content = list.map((review, index) => (
      <ReviewCard key={index} review={review} />
    ));
  }
  return (
    <div className="bg-white flex flex-col gap-2">
      {content}
      {total >= 11 && (
        <div className="py-5 flex justify-end">
          <Pagination
            total={total}
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} of ${total} items`
            }
            onChange={fetchData}
            defaultPageSize={10}
            defaultCurrent={1}
            showLessItems
            showSizeChanger={total > 10}
          />
        </div>
      )}
    </div>
  );
}
