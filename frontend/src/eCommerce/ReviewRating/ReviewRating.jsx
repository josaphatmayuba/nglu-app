import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Upload } from "antd";
import React, { useEffect, useState } from "react";
import ReactStars from "react-rating-star-with-type";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addReviewRating } from "../../redux/rtk/features/eCommerce/reviewRating/reviewRatingSlice";
import { loadSingleProduct } from "../../redux/rtk/features/product/productSlice";

export default function ReviewRating() {
  const { id } = useParams("id");
  const navigate = useNavigate();

  const customerId = localStorage.getItem("id");
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { product } = useSelector((state) => state.products);
  const { loading } = useSelector((state) => state.reviewRating);
  const [reviewFileList, setReviewFileList] = useState([]);
  const [star, setStar] = useState(5);

  const onChange = (nextValue) => {
    setStar(nextValue);
  };
  const onFinish = async (values) => {
    let formData = new FormData();
    reviewFileList.forEach((galleryImage) => {
      formData.append("images[]", galleryImage.originFileObj);
    });

    formData.append("productId", id);
    formData.append("customerId", customerId);
    formData.append("rating", star);
    formData.append("review", values.review);
    const resp = await dispatch(addReviewRating(formData));
    if (resp.payload.message === "success") {
      dispatch(loadSingleProduct(id));
      navigate(`/products/${product.id}`);
    }
  };
  const onFinishFailed = () => {};

  useEffect(() => {
    dispatch(loadSingleProduct(id));
  }, [dispatch, id]);
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };

  const handelGalleryImageChange = ({ fileList }) => {
    setReviewFileList(fileList);
  };

  return (
    <div>
      <div className="container bg-white rounded md:my-5 p-3 max-w-[700px]">
        <div className="flex flex-col md:flex-row gap-[20px] p-3 md:p-0">
          <div className="md:w-1/2 w-full ">
            <img
              className="md:w-[300px] md:h-[350px] object-cover rounded-lg"
              onError={handleOnError}
              src={product?.productThumbnailImageUrl || "/images/default.jpg"}
              alt="product"
            />
          </div>
          {product && (
            <div className=" md:w-1/2 w-full">
              <div className="md:my-5">
                <Link to={`/products/${product.id}`} className="text-[25px]">
                  {product?.name}
                </Link>
                <h3 className="text-gray-500">
                  Brand: {product?.productBrand?.name}
                </h3>
              </div>
              <div>
                <div className="flex pt-2">
                  <ReactStars
                    count={5}
                    value={product.totalReviewRating?.averageRating}
                    isHalf
                    valueShow
                  />{" "}
                  <span className="text-gray-600 pl-2">{`(${
                    product.totalReviewRating.totalReview || 0
                  })`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container bg-white rounded my-5 p-5 max-w-[700px]">
        <h1 className="uppercase py-5 text-xl">Write A Review</h1>
        <div>
          <Form
            form={form}
            name="basic"
            layout="vertical"
            style={{ marginLeft: "40px", marginRight: "40px" }}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
          >
            <Form.Item>
              <ReactStars
                onChange={onChange}
                value={star}
                size={40}
                isEdit={true}
              />
            </Form.Item>
            <Form.Item label="Description" name="review" required>
              <Input.TextArea
                showCount
                maxLength={100}
                style={{
                  height: 120,
                  resize: "none",
                }}
              />
            </Form.Item>
            <Form.Item label=" Image" valuePropName="gallery_image">
              <Upload
                listType="picture-card"
                beforeUpload={() => false}
                name="image"
                accept="image/png, image/jpg, image/jpeg"
                fileList={reviewFileList}
                maxCount={3}
                onChange={handelGalleryImageChange}
              >
                <div>
                  <PlusOutlined />
                  <div
                    style={{
                      marginTop: 8,
                    }}
                  >
                    Upload
                  </div>
                </div>
              </Upload>
            </Form.Item>
            <Form.Item
              style={{ marginBottom: "15px" }}
              className="flex justify-center px-10 mt-[24px]"
            >
              <Button
                type="primary"
                htmlType="submit"
                shape="round"
                
                loading={loading}
              >
                Submit Review
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
