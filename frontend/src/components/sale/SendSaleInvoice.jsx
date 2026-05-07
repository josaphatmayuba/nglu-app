import { sendEmail } from "@/redux/rtk/features/emailConfig/emailConfigSlice";
import { getSetting } from "@/redux/rtk/features/setting/settingSlice";
import salePDF from "@/utils/salePDF";
import useCurrency from "@/utils/useCurrency";
import { CaretRightOutlined } from "@ant-design/icons";
import { Button, Collapse, Form, Input } from "antd";
import Dragger from "antd/es/upload/Dragger";
import { useEffect, useState } from "react";
import { BiCloudUpload } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import ReactQuill from "react-quill";
import { useDispatch, useSelector } from "react-redux";
import TagInput from "../CommonUi/TagInput";
import { textEditorFormats, textEditorModule } from "../product/AddProduct";

export default function SendSaleInvoice({
  setSendEmail,
  modal,
  body,
  subject,
  customerEmail,
  onClose,
}) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const { sale, loading } = useSelector((state) => state.sales);
  const companyInfo = useSelector((state) => state?.setting?.data) || null;
  const [localBody, setLocalBody] = useState(body);
  const {  currencyName } = useCurrency() || {};

  const onFinish = async (values) => {
    setLoader(true);

    try {
      let formData = new FormData();
      values.receiverEmail &&
        formData.append("receiverEmail", values.receiverEmail);
      values.subject && formData.append("subject", values.subject);
      localBody && formData.append("body", localBody);

      fileList &&
        fileList.forEach((file) => {
          if (file.name === "Order Invoice.pdf") {
            formData.append("files[]", file.originFileObj, "Order Invoice.pdf");
          } else {
            formData.append("files[]", file.originFileObj);
          }
        });

      cc.length > 0 && formData.append("cc[]", cc);
      bcc.length > 0 && formData.append("bcc[]", bcc);

      const resp = await dispatch(sendEmail(formData));
      if (resp.payload.message === "success") {
        setSendEmail(false);
        setLoader(false);
        form.resetFields();
        setCc([]);
        setBcc([]);
        setFileList(null);
        onClose ? onClose() : "";
      }
    } catch (error) {
      console.log(error);
    }
    setLoader(false);
  };

  const onFinishFailed = () => {};

  useEffect(() => {
    !companyInfo && dispatch(getSetting());
  });

  const handleDragger = (info) => {
    setFileList(info.fileList);
  };

  useEffect(() => {
    if (sale && companyInfo) {
      setFileList((prev) => {
        if (prev.some((file) => file.name === "OrderInvoice.pdf")) return prev;

        return [
          ...prev,
          {
            name: "Order Invoice.pdf",
            originFileObj: salePDF(
              sale,
              companyInfo,
              "Sale Invoice",
               currencyName
            ),
          },
        ];
      });
    }
  }, [sale, companyInfo,  currencyName]);

  const handleBody = (val) => {
    setLocalBody(val);
  };
  return (
    <>
      {!loading && sale && (
        <div className={"py-4 px-4 border-t"}>
          <div className="flex justify-between">
            <p className=""></p>
            {!modal && (
              <button
                onClick={() => setSendEmail(false)}
                className="bg-red-100 p-1 rounded text-red-500">
                <IoClose size={20} />
              </button>
            )}
          </div>
          <Form
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            colon={false}
            layout="vertical"
            form={form}
            initialValues={{
              subject: subject,
              body: body,
              receiverEmail: customerEmail,
            }}>
            <Form.Item
              style={{ width: "100%" }}
              label="To"
              rules={[
                { required: true, message: "Please input receiver email!" },
              ]}
              name="receiverEmail">
              <Input placeholder="Receiver Email" />
            </Form.Item>

            <Collapse
              bordered={false}
              defaultActiveKey={["0"]}
              expandIcon={({ isActive }) => (
                <CaretRightOutlined rotate={isActive ? 90 : 0} />
              )}
              className="site-collapse-custom-collapse mb-4 ">
              <Collapse.Panel header="CC & BCC" key="1">
                <TagInput label={"CC"} tags={cc} setTags={setCc} />

                <TagInput label={"BCC"} tags={bcc} setTags={setBcc} />
              </Collapse.Panel>
            </Collapse>

            <Form.Item style={{ width: "100%" }} label="Subject" name="subject">
              <Input placeholder="Subject" />
            </Form.Item>

            <Form.Item label="Attachment">
              <Dragger
                name="files"
                fileList={fileList}
                onChange={handleDragger}
                multiple={true}
                beforeUpload={() => false}>
                <div className="ant-upload-drag-icon flex justify-center my-2">
                  <BiCloudUpload size={30} />
                </div>
                <p className="ant-upload-text">
                  Click or drag file to this area to upload
                </p>
              </Dragger>
            </Form.Item>

            <Form.Item style={{ marginBottom: "25px" }} label="Body">
              <ReactQuill
                value={localBody}
                onChange={handleBody}
                modules={textEditorModule}
                formats={textEditorFormats}
              />
            </Form.Item>
            <Form.Item>
              <Button
                loading={loader}
                size={"large"}
                htmlType="submit"
                type="primary">
                Send
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}
    </>
  );
}
