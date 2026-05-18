import { UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Typography,
  Upload,
} from "antd";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import ReactQuill from "react-quill";
import { useDispatch, useSelector } from "react-redux";
import { loadAllCurrency } from "../../redux/rtk/features/eCommerce/currency/currencySlice";
import {
  getSetting,
  updateSetting,
} from "../../redux/rtk/features/setting/settingSlice";
import fileConfig from "../../utils/fileConfig";
import Loader from "../loader/loader";
//Update Invoice API REQ

const LOGO_MAX_SIZE_MB = 10;
const LOGO_MAX_SIZE_BYTES = LOGO_MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const AddDetails = () => {
  const { Title } = Typography;
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState([]);
  const [footer, setFooter] = useState("");

  const data = useSelector((state) => state?.setting?.data) || null;
  const { list, loading } = useSelector((state) => state?.currency) || null;
  const loader = useSelector((state) => state?.setting?.loading) || false;

  const onFinish = async (values) => {
    console.log("Form Values:", values);

    try {
      const formData = new FormData();
      formData.append("companyName", values.companyName);
      values.dashboardType &&
        formData.append("dashboardType", values.dashboardType);
      formData.append("tagLine", values.tagLine);
      formData.append("address", values.address);
      formData.append("phone", values.phone);
      formData.append("email", values.email);
      formData.append("website", values.website);
      formData.append("footer", values.footer);
      formData.append("currencyId", values.currencyId);

      if (fileList.length) {
        const file = fileList[0]?.originFileObj;
        if (file) {
          if (fileConfig() === "laravel") {
            formData.append("images[]", file);
          } else {
            formData.append("images", file);
          }
        }
      } else {
        formData.append("clearLogo", "true");
      }

      formData.append("_method", "PUT");

      const resp = await dispatch(updateSetting(formData));

      if (resp.payload.message === "success") {
        toast.success("Company Updated Successfully");
        dispatch(getSetting());
      } else {
        toast.error(resp.payload?.error || "Failed to update company details");
      }
    } catch (error) {
      console.error("Error during update:", error); // Debugging log
      toast.error("An error occurred while updating details"); // Error feedback
    }
  };

  useEffect(() => {
    if (data == null) {
      dispatch(getSetting());
    }
    dispatch(loadAllCurrency());
  }, [dispatch, data]);

  // Add this new useEffect to handle existing image
  useEffect(() => {
    if (data && data.logo) {
      // Assuming 'logo' is the image URL field from backend
      setFileList([
        {
          uid: "-1", // Unique ID for existing file
          name: "logo.png", // Or derive from data
          status: "done",
          url: data.logo, // The backend image URL
        },
      ]);
    }
  }, [data]);

  const validateLogo = (file) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error("Logo must be PNG, JPG, WebP, or SVG.");
      return Upload.LIST_IGNORE;
    }

    if (file.size > LOGO_MAX_SIZE_BYTES) {
      toast.error(`Logo must be ${LOGO_MAX_SIZE_MB} MB or smaller.`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handelImageChange = ({ fileList }) => {
    setFileList(fileList.slice(-1));
  };

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
  const footerHandler = (val) => {
    setFooter(val);
  };
  return (
    <Fragment>
      <Row className="mr-top" justify="center">
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={16}
          xl={16}
          className="border rounded column-design">
          <Card bordered={false}>
            <Title level={4} className="m-2 text-center mb-4">
              Company Setting
            </Title>
            {data ? (
              <Form
                initialValues={{
                  ...data,
                }}
                form={form}
                name="basic"
                labelCol={{
                  span: 7,
                }}
                labelWrap
                wrapperCol={{
                  span: 16,
                }}
                onFinish={onFinish}
                autoComplete="off">
                <Form.Item
                  style={{ marginBottom: "10px" }}
                  fields={[{ name: "Company Name" }]}
                  label="Company Name"
                  name="companyName"
                  rules={[
                    {
                      required: true,
                      message: "Please input Company name!",
                    },
                  ]}>
                  <Input />
                </Form.Item>
                {/* <Form.Item
                  style={{ marginBottom: "10px" }}
                  fields={[{ name: "Company Name" }]}
                  label='Dashboard Type'
                  name='dashboardType'
                  rules={[
                    {
                      required: true,
                      message: "Please input dashboardType!",
                    },
                  ]}
                >
                  <Select>
                    <Select.Option key={"Both"} value={"both"}>
                      Both
                    </Select.Option>
                    <Select.Option key={"e-commerce"} value={"e-commerce"}>
                      E-Commerce
                    </Select.Option>
                    <Select.Option key={"inventory"} value={"inventory"}>
                      Inventory
                    </Select.Option>
                  </Select>
                </Form.Item> */}
                <Form.Item
                  style={{ marginBottom: "10px" }}
                  fields={[{ name: "Tagline" }]}
                  label="Tagline"
                  name="tagLine"
                  rules={[
                    {
                      required: true,
                      message: "Please input Tagline!",
                    },
                  ]}>
                  <Input />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Address"
                  name="address"
                  rules={[
                    {
                      required: true,
                      message: "Please input Address!",
                    },
                  ]}>
                  <Input />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Phone Number"
                  name="phone"
                  rules={[
                    {
                      required: true,
                      message: "Please input Phone Number!",
                    },
                  ]}>
                  <Input />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Email Address"
                  name="email"
                  rules={[
                    {
                      required: true,
                      message: "Please input Email Address!",
                    },
                  ]}>
                  <Input />
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Currency"
                  name="currencyId"
                  rules={[
                    {
                      required: true,
                      message: "Please input Currency!",
                    },
                  ]}>
                  <Select label="Currency" name="currencyId" loading={loading}>
                    {list?.map((item, index) => (
                      <Select.Option value={item.id} key={item.id}>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: item.currencySymbol,
                          }}></span>{" "}
                        &#160;
                        <span>{item.currencyName}</span>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  style={{ marginBottom: "10px" }}
                  label="Website"
                  name="website"
                  rules={[
                    {
                      required: true,
                      message: "Please input Website!",
                    },
                  ]}>
                  <Input />
                </Form.Item>

                <Form.Item label="Upload Logo" valuePropName="fileList">
                  <Upload
                    listType="picture-card"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    beforeUpload={validateLogo}
                    name="image"
                    fileList={fileList}
                    maxCount={1}
                    onChange={handelImageChange}>
                    <div>
                      <UploadOutlined />
                      <div
                        style={{
                          marginTop: 8,
                        }}>
                        Upload
                      </div>
                    </div>
                  </Upload>
                  <p className="font-semibold text-rose-500">
                    Required image size 180x70 px & transparent png format
                  </p>
                </Form.Item>
                <Form.Item
                  style={{ marginBottom: "40px" }}
                  label="Footer"
                  name="footer"
                  className="z-30"
                  rules={[
                    {
                      required: true,
                      message: "Please input Footer!",
                    },
                  ]}>
                  <ReactQuill
                    value={footer}
                    onChange={footerHandler}
                    modules={textEditorModule}
                    formats={textEditorFormats}
                  />
                </Form.Item>
                <Form.Item
                  style={{ marginBottom: "10px" }}
                  className="flex justify-center mt-[24px]">
                  <Button
                    type="primary"
                    disabled={loading}
                    htmlType="submit"
                    shape="round"
                    loading={loader}>
                    Update Details
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <Loader />
            )}
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default AddDetails;
