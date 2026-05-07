import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Upload } from "antd";
import React, { useEffect, useState } from "react";
import {
  loadAllSliderImages,
  updateSliderImages,
} from "../../../redux/rtk/features/eCommerce/slider/sliderSlice";
import { useDispatch } from "react-redux";
import { removeFalsyProperties } from "../../../utils/functions";

export default function UpdateSlider({ item }) {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [thumbFileList, setThumbFileList] = useState([]);

  const handelThumbImageChange = ({ fileList }) => {
    setThumbFileList(fileList);
  };
  const onFinish = async (values) => {
    const data = removeFalsyProperties(values);
    try {
      let formData = new FormData();
      formData.append("images[]", thumbFileList[0].originFileObj);
      formData.append("linkUrl", data.linkUrl);
      formData.append("_method", "put");
      const resp = await dispatch(
        updateSliderImages({ id: item.id, values: formData })
      );

      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllSliderImages());
        handleCancel();
        setThumbFileList([]);

        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };
  const onFinishFailed = () => {};

  useEffect(() => {
    form.setFieldValue("index", item.index);
    form.setFieldValue("linkUrl", item.linkUrl);
    form.setFieldValue("image", item.image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => {
          showModal();
        }}
      >
        <EditOutlined className="bg-gray-600 p-1 text-white rounded-md" />
        Edit
      </div>
      <Modal
        title="Update Slider"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={false}
      >
        <div>
          <Form
            form={form}
            name="basic"
            layout="vertical"
            className="sm:mx-10"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
          >
            <Form.Item
              label="Slider Image"
              valuePropName="image"
              required={true}
              className="w-full"
            >
              <Upload
                listType="picture-card"
                beforeUpload={() => false}
                name="image"
                fileList={thumbFileList}
                maxCount={1}
                onChange={handelThumbImageChange}
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
              label="URL Link"
              name="linkUrl"
              style={{ marginBottom: "10px" }}
            >
              <Input placeholder="Input image URL" />
            </Form.Item>
            <Form.Item
              style={{ marginBottom: "10px" }}
              className="flex justify-center mt-6"
            >
              <Button
                type="primary"
                htmlType="submit"
                shape="round"
                loading={loader}
              >
                Update Slider Image
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </>
  );
}
