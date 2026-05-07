import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Upload } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  loadSingleCustomerEcom,
  updateCustomer,
} from "../../redux/rtk/features/eCommerce/customer/customerSlice";

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export default function UpdateProfile({ customer, handleCancel: Cancel }) {
  const id = localStorage.getItem("id");
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [profileFileList, setProfileFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const onFinish = async (values) => {
    try {
      setLoader(true);
      let formData = new FormData();
      formData.append("firstName", values.firstName);
      formData.append("lastName", values.lastName);
      formData.append("address", values.address);
      formData.append("phone", values.phone);
      formData.append("_method", "PUT");
      if (profileFileList.length > 0) {
        formData.append("images[]", profileFileList[0]?.originFileObj);
      }
      const resp = await dispatch(updateCustomer({ id: id, formData }));
      if (resp.payload.message === "success") {
        setProfileFileList([]);
        Cancel();
        dispatch(loadSingleCustomerEcom(id));
        setLoader(false);
      }
    } catch (err) {}
  };

  const handleProfileChange = ({ fileList: newFileList }) =>
    setProfileFileList(newFileList);
  const uploadButton = (
    <button type="button">
      <PlusOutlined />
      <span>Upload</span>
    </button>
  );

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf("/") + 1)
    );
  };
  const handleCancel = () => setPreviewOpen(false);
  const handleOnError = (e) => {
    e.target.src = "/images/default.jpg";
  };
  return (
    <div className="p-5">
      <div className="group mx-auto h-[110px] w-[110px]">
        <img
          onError={handleOnError}
          className={`${
            profileFileList.length === 1 ? "hidden" : "inline-block"
          }  group-hover:hidden h-[100px] w-[100px] rounded-full border-[3px] border-ePrimary`}
          src={customer.profileImage || "/images/default.jpg"}
          alt="icon"
        />
        <div
          className={`${
            profileFileList.length === 1 ? "inline-block" : "hidden"
          }   rounded-full  group-hover:inline-block `}
        >
          <Upload
            className=" rounded-full "
            listType="picture-circle"
            fileList={profileFileList}
            onPreview={handlePreview}
            onChange={handleProfileChange}
          >
            {profileFileList.length >= 1 ? null : uploadButton}
          </Upload>
          <Modal
            open={previewOpen}
            title={previewTitle}
            footer={null}
            onCancel={handleCancel}
          >
            <img
              alt="example"
              style={{
                width: "100%",
              }}
              src={previewImage}
            />
          </Modal>
        </div>
      </div>
      {/*===================================================
                       Update Form
      ======================================================*/}
      <div className="mt-12">
        <Form
          name="login"
          layout="vertical"
          style={{
            maxWidth: 500,
          }}
          initialValues={{
            remember: false,
            firstName: customer?.firstName,
            lastName: customer?.lastName,
            phone: customer?.phone,
            address: customer?.address,
          }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item label="First Name" name="firstName" className="-mt-4">
            <Input className="p-[9px]" />
          </Form.Item>
          <Form.Item label="Last Name" name="lastName" className="-mt-4">
            <Input className="p-[9px]" />
          </Form.Item>

          <Form.Item label="Phone" name="phone" className="-mt-4">
            <Input className="p-[9px]" />
          </Form.Item>

          <Form.Item label="Address" name="address" className="-mt-4">
            <Input className="p-[9px]" />
          </Form.Item>

          <Form.Item>
            <Button
              loading={loader}
              className="w-full text-white font-medium bg-ePrimary"
              htmlType="submit"
            >
              Update
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
