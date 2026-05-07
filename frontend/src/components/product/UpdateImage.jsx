import Button from "@/UI/Button";
import { updateImage } from "@/redux/rtk/features/product/GalleryImageSlice";
import { loadSingleProduct } from "@/redux/rtk/features/product/productSlice";
import { UploadOutlined } from "@ant-design/icons";
import { Form, Upload } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

export default function UpdateImage({ data, handleCancel }) {
  const dispatch = useDispatch();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loader, setLoader] = useState(false);
  const handelImageChange = ({ fileList }) => {
    setFileList(fileList);
  };
  const onFinish = async (values) => {
    //convert values to formData to send to server
    setLoader(true);
    const formData = new FormData();

    formData.append("imageId", data.id);

    if (fileList.length) {
      formData.append("images[]", fileList[0].originFileObj);
    }
    formData.append("_method", "PUT");
    try {
      const resp = await dispatch(updateImage({ id, values: formData }));
      if (resp.payload.message === "success") {
        dispatch(loadSingleProduct(id));
        handleCancel();
      }
      setLoader(false);
    } catch (error) {}
  };
  return (
    <>
      <Form form={form} name='basic' onFinish={onFinish} autoComplete='off'>
        <Form.Item valuePropName='fileList'>
          <Upload
            listType='picture-card'
            beforeUpload={() => false}
            name='image'
            fileList={fileList}
            maxCount={1}
            onChange={handelImageChange}
          >
            <div>
              <UploadOutlined />
              <div
                style={{
                  marginTop: 8,
                }}
              >
                Upload
              </div>
            </div>
          </Upload>
          <p className='font-semibold text-rose-500'>
            Required image size 920x400 px & transparent png format
          </p>
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "10px" }}
          className='flex justify-center mt-[24px]'
        >
          <Button
            color='primary'
            disabled={loader}
            type='submit'
            loading={loader}
          >
            Update Image
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
