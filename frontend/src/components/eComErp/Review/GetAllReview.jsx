import moment from "moment";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../../UI/Card";
import { loadAllReviewRatingPaginated } from "../../../redux/rtk/features/eCommerce/reviewRating/reviewRatingSlice";
import { stringShorter } from "../../../utils/functions";
import TableComponent from "../../CommonUi/TableComponent";
import UserPrivateComponent from "../../PrivacyComponent/UserPrivateComponent";
import ReplayReview from "./ReplayReview";

export default function GetAllReview() {
  const dispatch = useDispatch();
  const { list, loading, total } = useSelector((state) => state.reviewRating);
  const [pageConfig, setPageConfig] = useState({
    page: 1,
    count: 10,
    status: "true",
  });

  const columns = [
    {
      id: 1,
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: "50px",
    },
    {
      id: 2,
      title: "Product ",
      dataIndex: "product",
      key: "product",
      render: (product) => product.name,
      renderCsv: (product) => product.name,
    },

    {
      id: 3,
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
    },
    {
      id: 4,
      title: "Review Create Date ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
      renderCsv: (createdAt) => moment(createdAt).format("DD/MM/YYYY"),
    },
    {
      id: 5,
      title: "Customer ",
      dataIndex: "customer",
      key: "customer",
      render: (customer) => customer.username,
      renderCsv: (customer) => customer.username,
    },
    {
      id: 6,
      title: "Review",
      dataIndex: "review",
      key: "review",
      render: (review) => stringShorter(review, 25),
      renderCsv: (review) => stringShorter(review, 25),
    },
    {
      id: 6,
      title: "Review",
      dataIndex: "reviewReply",
      key: "reply",
      render: (review) => stringShorter(review[0]?.comment, 25),
      renderCsv: (review) => stringShorter(review[0]?.comment, 25),
    },
    {
      id: 4,
      title: "Action",
      key: "Action",
      render: (item) => (
        <div className='flex items-center gap-3'>
          <ReplayReview item={item} pageConfig={pageConfig} />
        </div>
      ),
      width: "150px",
      csvOff: true,
    },
  ];

  useEffect(() => {
    dispatch(loadAllReviewRatingPaginated(pageConfig));
  }, [dispatch, pageConfig]);
  return (
    <Card
      className='max-md:border-0 max-md:bg-white'
      bodyClass='max-md:p-0 '
      headClass='border-none'
      title={"Review"}
    >
      <UserPrivateComponent permission={"readAll-reviewRating"}>
        <TableComponent
          total={total}
          columns={columns}
          list={list}
          loading={loading}
          setPageConfig={setPageConfig}
          title={"Review"}
        />
      </UserPrivateComponent>
    </Card>
  );
}
