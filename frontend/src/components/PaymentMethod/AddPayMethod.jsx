import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select, Space, Upload } from "antd";
import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill";
import { useDispatch, useSelector } from "react-redux";
import { loadAllAccount } from "../../redux/rtk/features/account/accountSlice";
import {
  AddPaymentMethod,
  loadAllPaymentMethodPaginated,
} from "../../redux/rtk/features/paymentMethod/paymentMethodSlice";
import BigDrawer from "../Drawer/BigDrawer";
import AddAccount from "../account/AddAccount";
export default function AddPayMethod() {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [logoFileList, setLogoFileList] = useState([]);
  const [subAccount, setSubAccount] = useState(null);
  const [Instruction, setInstruction] = useState("");
  const { list, loading } = useSelector((state) => state.accounts);

  const onFinish = async (values) => {
    try {
      let formData = new FormData();
      formData.append("methodName", values.methodName);
      formData.append("subAccountId", subAccount);
      formData.append("ownerAccount", values.ownerAccount);
      formData.append("instruction", Instruction);
      formData.append("images[]", logoFileList[0].originFileObj);

      const resp = await dispatch(AddPaymentMethod(formData));
      if (resp.payload.message === "success") {
        setLogoFileList([]);
        setSubAccount(null);
        dispatch(
          loadAllPaymentMethodPaginated({ status: "true", page: 1, count: 10 })
        );
      }
      setLoader(false);
    } catch (err) {
      setLoader(false);
    }
  };
  const onFinishFailed = () => {};
  const handleLogoChange = ({ fileList }) => {
    setLogoFileList(fileList);
  };
  const handleSubAccount = (val) => {
    setSubAccount(val);
  };
  const prodDescriptionHandler = (val) => {
    setInstruction(val);
  };
  useEffect(() => {
    dispatch(loadAllAccount());
  }, [dispatch]);

  const textEditorFormats = [
    "header",
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
    "color",
    "background",
  ];
  const textEditorModule = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      ["link", "image"],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
  };
  return (
    <div>
      <Form
        form={form}
        name="basic"
        layout="vertical"
        className="sm:mx-10"
        initialValues={{
          remember: true,
        }}
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item
          style={{ marginBottom: "15px" }}
          label="Method Name"
          name="methodName"
          rules={[
            {
              required: true,
              message: "Please input method name!",
            },
          ]}
        >
          <Input />
        </Form.Item>
        <div className="flex items-center flex-wrap">
          <Form.Item
            style={{ marginBottom: "15px" }}
            label="Owner Account"
            name="ownerAccount"
            className="w-full"
            rules={[
              {
                required: true,
                message: "Please input owner account!",
              },
            ]}
          >
            <Input />
          </Form.Item>{" "}
          <Form.Item
            style={{ marginBottom: "15px" }}
            label={
              <>
                Sub Account
                <BigDrawer title="new Account">
                  <AddAccount drawer={true} />
                </BigDrawer>
              </>
            }
            name="subAccountId"
            className="w-full"
            rules={[
              {
                required: subAccount === null,
                message: "Please input sub account!",
              },
            ]}
          >
            <Select
              name="subAccountId"
              loading={loading}
              showSearch
              placeholder="Select Sub Account"
              optionFilterProp="children"
              filterOption={(input, option) => option.children.includes(input)}
              filterSort={(optionA, optionB) =>
                optionA.children
                  .toLowerCase()
                  .localeCompare(optionB.children.toLowerCase())
              }
              onChange={handleSubAccount}
            >
              {list &&
                list.map((account) => (
                  <Select.Option key={account.id} value={account.id}>
                    {account.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item label="Upload Logo " valuePropName="Logo" required={true}>
          <Upload
            listType="picture-card"
            beforeUpload={() => false}
            name="image"
            fileList={logoFileList}
            maxCount={1}
            onChange={handleLogoChange}
            accept="image/png, image/jpg, image/jpeg"
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
          label="Instruction"
          name="instruction"
          rules={[
            {
              required: true,
              message: "Please input instruction !",
            },
          ]}
        >
          <ReactQuill
            value={Instruction}
            onChange={prodDescriptionHandler}
            modules={textEditorModule}
            formats={textEditorFormats}
          />
        </Form.Item>
        <Form.Item
          style={{ marginBottom: "15px" }}
          className="flex justify-center mt-[24px]"
        >
          <Button
            type="primary"
            htmlType="submit"
            shape="round"
            loading={loader}
            onClick={() => {
              setLoader(true);
            }}
          >
            Create payment Method
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
