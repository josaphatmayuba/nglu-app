import { deleteImage } from "@/redux/rtk/features/product/GalleryImageSlice";
import { loadSingleProduct } from "@/redux/rtk/features/product/productSlice";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Image, Modal } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import UpdateImage from "./UpdateImage";

export default function GalleryImageSlider({ data = [] }) {
  const dispatch = useDispatch();
  const { id: productId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onDelete = async (id) => {
    var result = window.confirm("Are you sure you want to delete?");
    if (result) {
      const res = await dispatch(
        deleteImage({
          id: productId,
          query: `query=delete-image&imageId=${id}`,
        })
      );

      if (res.payload?.message === "success") {
        dispatch(loadSingleProduct(productId));
      }
    }
  };

  return (
    <>
      <div className='flex flex-wrap -m-1 md:-m-2'>
        {data.map((image) => (
          <div
            key={image.id}
            className='relative w-1/2 md:w-1/3 p-1 md:p-2 group'
          >
            <Image
              className='fluid  max-w-[300px] aspect-square'
              src={image.imageUrl || "/images/default.jpg"}
            />
            <div className='absolute top-2 right-2 invisible group-hover:visible'>
              <div className='flex justify-between mx-2 py-2 border-b items-center'>
                <div className='flex gap-3'>
                  <div
                    onClick={() => setIsModalOpen(image)}
                    className=' bg-primary text-white rounded py-2 px-3 d-inline-block'
                  >
                    <EditOutlined />
                  </div>

                  <div
                    onClick={() => onDelete(image.id)}
                    className='flex items-center gap-2'
                  >
                    <DeleteOutlined
                      className={`bg-red-600 text-white inline-block rounded-md p-3`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal
        title='Update Image'
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <UpdateImage data={isModalOpen} handleCancel={handleCancel} />
      </Modal>
    </>
  );
}
