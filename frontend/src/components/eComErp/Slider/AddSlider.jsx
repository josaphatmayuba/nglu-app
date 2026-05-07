import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select, Upload } from "antd";
import Title from "antd/es/skeleton/Title";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addSliderImages, loadAllSliderImages } from "../../../redux/rtk/features/eCommerce/slider/sliderSlice";

export default function AddSlider() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [thumbFileList, setThumbFileList] = useState([]);

  const handelThumbImageChange = ({ fileList }) => {
    setThumbFileList(fileList);
  };
  const onFinish = async (values) => {
    try {
      let formData = new FormData();
      formData.append("images[]", thumbFileList[0].originFileObj);
      formData.append("index", parseInt(values.index));
      formData.append("linkUrl", values.linkUrl);
      const resp = await dispatch(addSliderImages( formData ));

      if (resp.payload.message === "success") {
        form.resetFields();
        dispatch(loadAllSliderImages())
        setThumbFileList([]);

        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (error) {
      setLoader(false);
    }
  };
  const onFinishFailed = () => {};
  return (
    <div>
      <div className=" h-full">
        <Title level={4} className="m-3 text-center">
          Add Slider Image
        </Title>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          className="sm:mx-10"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
        >
          <Form.Item
            style={{ marginBottom: "20px" }}
            label="Slider Index"
            name="index"
            rules={[
              {
                required: true,
                message: "Please enter index number!",
              },
            ]}
          >
            <Select name="index" placeholder="Select index">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, index) => (
                <Select.Option key={index} value={num}>
                  {num}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
            <p className="text-sm text-red-400">
              Get better view, the slider image must be 920 * 400 or relative
              ratio
            </p>
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
              Create Slider Image
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
